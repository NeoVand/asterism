/**
 * WebGPU constellation renderer.
 *
 * - Force layout runs on the GPU (TSL compute): strided all-pairs repulsion, CSR springs,
 *   per-topic gravity wells, velocity damping and a cooling schedule.
 * - Nodes are instanced sprites shaded per type; edges are cubic Béziers evaluated in the
 *   vertex shader and bent through their topics' anchors (cheap hierarchical edge bundling).
 * - Highlights (agent activity) live in a small storage buffer the CPU rewrites on change;
 *   flashes, pulses and the flow along lit edges are animated on the GPU.
 */
import * as THREE from 'three/webgpu';
import {
	Fn,
	attribute,
	cameraPosition,
	If,
	Loop,
	abs,
	add,
	clamp,
	color,
	dot,
	exp,
	float,
	instanceIndex,
	instancedArray,
	int,
	length,
	max,
	min,
	mix,
	pass,
	positionGeometry,
	screenUV,
	select,
	sin,
	smoothstep,
	uniform,
	uniformArray,
	uv,
	varying,
	vec3,
	vec4
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TOPIC_COLORS, TYPE_INDEX } from './palette';
import { LIT, type ClientGraph, type LitKind } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type N = any;

const TYPE_SIZE = [16, 9, 3.2, 2.1, 2.3, 5.2, 3.8]; // doc, chapter, section, fact, source, term, entity
const EDGE_SEGMENTS = 10;

/** Spring weight per relation (strong for structure, weaker for loose topical links). */
const REL_SPRING: Record<string, number> = {
	contains: 1.2,
	states: 1.0,
	cites: 0.5,
	about: 0.7,
	uses: 0.45,
	related: 0.8,
	defined_in: 0.6,
	discussed_in: 0.25,
	is_a: 0.8,
	same: 1.0,
	supports: 0.7,
	contradicts: 0.7,
	elaborates: 0.7,
	depends: 0.6
};

/** How visible each relation is when idle (structure recedes, meaning shows). */
const REL_VISUAL: Record<string, number> = {
	contains: 0.4,
	states: 0.45,
	cites: 0.7,
	about: 1,
	uses: 0.75,
	related: 1.3,
	defined_in: 0.3,
	discussed_in: 0.35,
	is_a: 1,
	same: 1.6,
	supports: 1.6,
	contradicts: 1.8,
	elaborates: 1.3,
	depends: 1.3
};

export interface RendererEvents {
	hover?: (index: number | null) => void;
	click?: (index: number | null, event: PointerEvent) => void;
	settled?: () => void;
}

export interface Projected {
	x: number;
	y: number;
	z: number;
	visible: boolean;
}

export class GraphRenderer {
	readonly canvas: HTMLCanvasElement;
	renderer!: THREE.WebGPURenderer;
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(42, 1, 1, 12000);
	controls!: OrbitControls;
	pipeline!: THREE.RenderPipeline;
	graph: ClientGraph | null = null;
	events: RendererEvents = {};
	/** CPU mirror of node positions (xyzw), refreshed from the GPU while the layout moves. */
	positions: Float32Array = new Float32Array(0);
	backend: 'webgpu' | 'webgl' = 'webgpu';

	private count = 0;
	private posBuf: N;
	private velBuf: N;
	private infoBuf: N;
	private stateBuf: N;
	private stateArray = new Float32Array(0);
	private computeForces: N;
	private computeIntegrate: N;
	private anchors: THREE.Vector3[] = [];
	private uAlpha = uniform(1);
	private uTime = uniform(0);
	private uDim = uniform(0);
	private uDimTarget = 0;
	private uHover = uniform(-1);
	private uBundle = uniform(0.42);
	private uEdgeAlpha = uniform(0.016);
	private uEdgeLit = uniform(0);
	/** Edges fade in as the layout unfolds. */
	private uEdgeFade = uniform(0);
	/** 0 → 1 as the layout settles (drives label reveal). */
	get layoutProgress() {
		return 1 - Math.min(1, (this.uAlpha.value as number) / 0.5);
	}
	private nodes: THREE.Sprite | null = null;
	private reticle: THREE.Sprite | null = null;
	private uSelected = uniform(-1, 'int');
	private edges: THREE.LineSegments | null = null;
	private trails: THREE.LineSegments | null = null;
	private stars: THREE.Sprite | null = null;
	private clock = new THREE.Timer();
	private running = false;
	private frame = 0;
	private reading = false;
	private settledFired = false;
	/** Frame-rate sampling for adaptive resolution (only once the layout has settled). */
	private perf = { frames: 0, time: 0 };
	private lastInteraction = 0;
	private fly: { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; t0: number; dur: number } | null = null;
	private hoverIndex: number | null = null;
	private resizeObs: ResizeObserver | null = null;
	private litAny = false;
	private disposed = false;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
	}

	async init() {
		this.renderer = new THREE.WebGPURenderer({ canvas: this.canvas, antialias: true, alpha: false });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		await this.renderer.init();
		this.backend = (this.renderer.backend as N).isWebGPUBackend ? 'webgpu' : 'webgl';
		this.renderer.toneMapping = THREE.NoToneMapping;

		this.camera.position.set(0, 0, 1500);
		this.controls = new OrbitControls(this.camera, this.canvas);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.06;
		this.controls.rotateSpeed = 0.55;
		this.controls.zoomSpeed = 0.9;
		this.controls.minDistance = 40;
		this.controls.maxDistance = 3200;
		this.controls.autoRotate = true;
		this.controls.autoRotateSpeed = 0.18;
		this.controls.addEventListener('start', () => {
			this.lastInteraction = performance.now();
			this.fly = null;
		});

		// Deep-space backdrop: vertical gradient with a faint vignette.
		const top = color(new THREE.Color('#0a1020'));
		const bottom = color(new THREE.Color('#02040a'));
		const vign = smoothstep(float(1.25), float(0.2), length(screenUV.sub(0.5)).mul(1.6));
		this.scene.backgroundNode = mix(bottom, top, screenUV.y.oneMinus()).mul(vign.mul(0.55).add(0.45));

		this.buildStars();

		const scenePass = pass(this.scene, this.camera);
		const sceneColor = scenePass.getTextureNode('output');
		const glow = bloom(sceneColor, 0.85, 0.5, 0.12);
		this.pipeline = new THREE.RenderPipeline(this.renderer);
		this.pipeline.outputNode = sceneColor.add(glow);

		this.resize();
		this.resizeObs = new ResizeObserver(() => this.resize());
		this.resizeObs.observe(this.canvas.parentElement ?? this.canvas);

		this.canvas.addEventListener('pointermove', this.onPointerMove);
		this.canvas.addEventListener('pointerdown', this.onPointerDown);
		this.canvas.addEventListener('pointerup', this.onPointerUp);
		this.canvas.addEventListener('pointerleave', () => this.setHover(null));
		this.canvas.addEventListener('wheel', () => (this.lastInteraction = performance.now()), { passive: true });

		this.running = true;
		this.renderer.setAnimationLoop(this.tick);
	}

	/* ------------------------------------------------------------------ */
	/* Graph upload                                                        */
	/* ------------------------------------------------------------------ */

	setGraph(g: ClientGraph) {
		// When the graph grows (an upload), keep every known star where it is.
		const previous = this.graph && this.positions.length ? { ids: this.graph.ids, pos: this.positions } : null;
		this.prevTopics = this.graph?.topics ?? new Uint8Array(0);
		this.centers.clear();
		this.graph = g;
		const n = (this.count = g.ids.length);

		// Topic anchors: a tilted ring with gentle vertical waves, so clusters read as constellations.
		// An ellipse facing the camera, gently rippled in depth so the 3D reads when it turns.
		this.anchors = Array.from({ length: 9 }, (_, k) => {
			const a = (k / 9) * Math.PI * 2 + Math.PI / 2;
			return new THREE.Vector3(Math.cos(a) * 520, Math.sin(a) * 330, Math.sin(a * 3) * 120);
		});

		// Degrees and CSR adjacency (undirected).
		const deg = new Uint32Array(n);
		for (let e = 0; e < g.edgeSrc.length; e++) {
			deg[g.edgeSrc[e]]++;
			deg[g.edgeDst[e]]++;
		}
		const offs = new Uint32Array(n + 1);
		for (let i = 0; i < n; i++) offs[i + 1] = offs[i] + deg[i];
		const adj = new Uint32Array(Math.max(1, offs[n]));
		const adjW = new Float32Array(Math.max(1, offs[n]));
		const fill = offs.slice(0, n);
		for (let e = 0; e < g.edgeSrc.length; e++) {
			const s = g.edgeSrc[e];
			const t = g.edgeDst[e];
			const w = REL_SPRING[g.relNames[g.edgeRel[e]]] ?? 0.5;
			adj[fill[s]] = t;
			adjW[fill[s]++] = w;
			adj[fill[t]] = s;
			adjW[fill[t]++] = w;
		}

		// Seeded initial positions: a tight puff around each topic anchor (the layout blooms out).
		const pos = new Float32Array(n * 4);
		const info = new Float32Array(n * 4);
		let seed = 1337;
		const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
		for (let i = 0; i < n; i++) {
			const a = this.anchors[g.topics[i]] ?? this.anchors[0];
			pos[i * 4] = a.x * 0.6 + rnd() * 55;
			pos[i * 4 + 1] = a.y * 0.6 + rnd() * 55;
			pos[i * 4 + 2] = a.z * 0.6 + rnd() * 55;
			pos[i * 4 + 3] = 1;
			const type = TYPE_INDEX[g.types[i]];
			info[i * 4] = g.topics[i];
			info[i * 4 + 1] = type;
			info[i * 4 + 2] = TYPE_SIZE[type] * (0.75 + 0.25 * g.weights[i]) * (1 + Math.min(1.2, Math.log2(1 + deg[i]) * 0.08));
			info[i * 4 + 3] = 1 + Math.sqrt(deg[i]) * 0.35;
		}
		let kept = 0;
		if (previous) {
			const at = new Map(previous.ids.map((id, i) => [id, i]));
			const placed = new Uint8Array(n);
			for (let i = 0; i < n; i++) {
				const j = at.get(g.ids[i]);
				if (j == null) continue;
				pos.set(previous.pos.subarray(j * 4, j * 4 + 4), i * 4);
				placed[i] = 1;
				kept++;
			}
			// New stars are born at the heart of their topic's cluster and settle in from there.
			for (let i = 0; i < n; i++) {
				if (placed[i]) continue;
				const c = this.clusterCenter(previous, g.topics[i]);
				pos[i * 4] = c.x + rnd() * 30;
				pos[i * 4 + 1] = c.y + rnd() * 30;
				pos[i * 4 + 2] = c.z + rnd() * 30;
			}
		}
		this.positions = pos.slice();
		this.stateArray = new Float32Array(n * 4);

		this.disposeGraphObjects();
		this.posBuf = instancedArray(pos, 'vec4');
		this.velBuf = instancedArray(n, 'vec4');
		this.infoBuf = instancedArray(info, 'vec4');
		this.stateBuf = instancedArray(this.stateArray, 'vec4');
		const offsBuf = instancedArray(offs, 'uint');
		const adjBuf = instancedArray(adj, 'uint');
		const adjWBuf = instancedArray(adjW, 'float');
		const anchorsU: N = uniformArray(this.anchors, 'vec3');

		const nCount = n;
		const stride = Math.max(1, Math.round(n / 3000)); // strided repulsion keeps a step ~O(3000·N)
		const uPhase = uniform(0, 'int');
		const uStride = uniform(stride, 'int');
		// Inverse-square repulsion behaves like charge in a ball: a cluster of Q nodes held by
		// linear gravity g settles at radius r ≈ (Q·s/g)^(1/3).
		const uRep = uniform(40);
		const uSpringLen = uniform(10);
		const uSpringK = uniform(1.1);
		const uGravity = uniform(0.03);
		const uDamping = uniform(0.86);
		const uMaxSpeed = uniform(9);
		(this as N)._uPhase = uPhase;
		(this as N)._stride = stride;

		this.computeForces = Fn(() => {
			const i = instanceIndex;
			const p = this.posBuf.element(i).xyz.toVar();
			const f = vec3(0).toVar();

			const j = int(uPhase).toVar();
			Loop(j.lessThan(int(nCount)) as N, () => {
				const d = p.sub(this.posBuf.element(j).xyz);
				const d2 = dot(d, d).add(25.0);
				f.addAssign(d.mul(uRep.div(d2.mul(d2.sqrt()))));
				j.addAssign(uStride);
			});
			f.mulAssign(float(uStride));

			const k = int(offsBuf.element(i)).toVar();
			const kEnd = int(offsBuf.element(i.add(1)));
			Loop(k.lessThan(kEnd) as N, () => {
				const q = this.posBuf.element(adjBuf.element(k)).xyz;
				const d = q.sub(p);
				const dist = length(d).add(0.001);
				// LinLog attraction: gentle on long edges, so clusters stay legible.
				const pull = dist.div(uSpringLen).add(1).log().sub(0.69).max(0);
				f.addAssign(d.div(dist).mul(pull).mul(uSpringK.mul(adjWBuf.element(k))));
				k.addAssign(1);
			});

			const nodeInfo = this.infoBuf.element(i);
			const anchor = anchorsU.element(int(nodeInfo.x));
			f.addAssign(anchor.sub(p).mul(uGravity.mul(nodeInfo.w)));

			const v = this.velBuf.element(i);
			const nv = v.xyz.add(f.div(nodeInfo.w).mul(this.uAlpha.mul(0.9).add(0.1))).mul(uDamping).toVar();
			const sp = length(nv).add(0.0001);
			v.assign(vec4(nv.mul(min(float(1), uMaxSpeed.div(sp))), 0));
		})().compute(n);

		this.computeIntegrate = Fn(() => {
			const p = this.posBuf.element(instanceIndex);
			p.assign(vec4(p.xyz.add(this.velBuf.element(instanceIndex).xyz), 1));
		})().compute(n);

		this.buildNodes(n);
		this.buildEdges(g, anchorsU);
		const warm = previous && kept > n * 0.5;
		this.uAlpha.value = warm ? 0.3 : 1;
		this.uEdgeFade.value = warm ? 1 : 0;
		this.frame = 0;
		this.settledFired = false;
	}

	private centers = new Map<number, THREE.Vector3>();

	/** Mean position of a topic in the previous layout (cached per graph swap). */
	private clusterCenter(prev: { ids: string[]; pos: Float32Array }, topic: number): THREE.Vector3 {
		const hit = this.centers.get(topic);
		if (hit) return hit;
		const old = this.prevTopics;
		const c = new THREE.Vector3();
		let k = 0;
		for (let j = 0; j < prev.ids.length; j++) {
			if (old[j] !== topic) continue;
			c.x += prev.pos[j * 4];
			c.y += prev.pos[j * 4 + 1];
			c.z += prev.pos[j * 4 + 2];
			k++;
		}
		const v = k ? c.divideScalar(k) : (this.anchors[topic]?.clone() ?? c);
		this.centers.set(topic, v);
		return v;
	}

	private prevTopics: Uint8Array<ArrayBufferLike> = new Uint8Array(0);

	private topicPalette(): N {
		return uniformArray(
			TOPIC_COLORS.map((h) => new THREE.Color(h)),
			'color'
		);
	}

	private buildNodes(n: number) {
		const palette = this.topicPalette();
		const mat = new THREE.SpriteNodeMaterial({
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending
		});
		const info = this.infoBuf.toAttribute();
		const state = this.stateBuf.toAttribute();
		const nodePos = this.posBuf.toAttribute().xyz;
		mat.positionNode = nodePos;

		const litKind = state.x;
		const age = this.uTime.sub(state.y);
		const flash = exp(age.mul(-2.6).min(0)).mul(select(litKind.greaterThan(0.5), float(1), float(0)));
		const isHover = select(this.uHover.equal(float(instanceIndex)), float(1), float(0));
		const litScale = select(
			litKind.greaterThan(3.5),
			float(3.0),
			select(
			litKind.greaterThan(2.5),
			float(2.1),
			select(litKind.greaterThan(1.5), float(1.55), select(litKind.greaterThan(0.5), float(1.25), float(1)))
		));
		// Cap on-screen size when the camera is close, so a close-up stays crisp instead of a wall of bokeh.
		const camDist = cameraPosition.sub(nodePos).length();
		const cap = camDist.mul(select(litKind.greaterThan(0.5), float(0.05), float(0.02)));
		mat.scaleNode = min(info.z.mul(litScale).mul(flash.mul(0.9).add(1)).mul(isHover.mul(0.8).add(1)), cap.max(0.6));

		mat.colorNode = Fn(() => {
			const type = info.y;
			const base = palette.element(int(info.x)).toVar();
			const p = uv().sub(0.5).mul(2);
			const d = length(p);
			const soft = smoothstep(float(1), float(0), d).pow(2.6);
			const core = smoothstep(float(0.38), float(0), d);
			// Shapes: sources are rings, entities are diamonds, concepts carry a hot core.
			const ring = smoothstep(float(0.16), float(0), abs(d.sub(0.58))).mul(0.9).add(soft.mul(0.35));
			// Entities: a bright core inside a faint halo ring.
			const diamond = core.mul(0.95).add(smoothstep(float(0.1), float(0), abs(d.sub(0.72))).mul(0.45)).add(soft.mul(0.25));
			const shapeA = select(
				type.equal(4),
				ring,
				select(type.equal(6), diamond, select(type.greaterThan(4.5), soft.add(core.mul(0.9)), soft.add(core.mul(0.35))))
			);
			const white = vec3(1, 0.97, 0.92);
			const gold = vec3(1, 0.78, 0.36);
			const tint = select(
				litKind.greaterThan(3.5),
				mix(base, white, 0.6),
				select(
				litKind.greaterThan(2.5),
				mix(base, gold, 0.55),
				select(litKind.greaterThan(0.5), mix(base, white, 0.35), base)
			));
			const pulse = select(
				litKind.greaterThan(2.5),
				sin(this.uTime.mul(2.4).add(float(instanceIndex).mul(0.37))).mul(0.25).add(1.15),
				float(1)
			);
			const lit = select(litKind.greaterThan(0.5), float(1), float(0));
			const dimmed = mix(float(1), float(0.16), this.uDim.mul(lit.oneMinus()));
			const typeGain = select(type.lessThan(2.5), float(0.85), select(type.equal(5), float(1.25), float(1)));
			const intensity = dimmed
				.mul(typeGain)
				.mul(pulse)
				.mul(add(1, lit.mul(1.1)))
				.add(flash.mul(2.2))
				.add(isHover.mul(1.4));
			return vec4(tint.mul(shapeA).mul(intensity).mul(0.62), shapeA);
		})();

		const sprite = new THREE.Sprite(mat);
		sprite.count = n;
		sprite.frustumCulled = false;
		sprite.renderOrder = 2;
		this.nodes = sprite;
		this.scene.add(sprite);

		// Selection reticle: a slowly breathing ring around the selected star.
		const rmat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
		const sel = this.posBuf.element((max as N)(this.uSelected, int(0))).xyz;
		rmat.positionNode = sel;
		const rDist = cameraPosition.sub(sel).length();
		rmat.scaleNode = rDist.mul(0.045).mul(sin(this.uTime.mul(2.2)).mul(0.06).add(1));
		rmat.colorNode = Fn(() => {
			const q = uv().sub(0.5).mul(2);
			const d = length(q);
			const ring = smoothstep(float(0.05), float(0), abs(d.sub(0.82)));
			const ticks = smoothstep(float(0.18), float(0), abs(q.x)).add(smoothstep(float(0.18), float(0), abs(q.y))).mul(smoothstep(float(0.9), float(0.98), d).mul(smoothstep(float(1.0), float(0.98), d)));
			const on = select(this.uSelected.greaterThanEqual(0), float(1), float(0));
			const v = ring.mul(0.9).add(ticks.mul(0.8)).mul(on);
			return vec4(vec3(0.75, 0.93, 1).mul(v), v);
		})();
		const r = new THREE.Sprite(rmat);
		r.frustumCulled = false;
		r.renderOrder = 4;
		this.reticle = r;
		this.scene.add(r);
	}

	/** Mark the selected star with a reticle (null hides it). */
	setSelected(i: number | null) {
		this.uSelected.value = i ?? -1;
	}

	private edgeMaterial(anchorsU: N, opts: { trail?: boolean } = {}) {
		const palette = this.topicPalette();
		const mat = new THREE.LineBasicNodeMaterial({
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending
		});
		const e = positionGeometry;
		const s = int(e.x);
		const t = int(e.y);
		const tt = e.z;
		const iS = this.infoBuf.element(s);
		const iT = this.infoBuf.element(t);
		const p0 = this.posBuf.element(s).xyz;
		const p3 = this.posBuf.element(t).xyz;
		const bundle = opts.trail ? float(0.12) : this.uBundle;
		const c1 = mix(p0, anchorsU.element(int(iS.x)), bundle);
		const c2 = mix(p3, anchorsU.element(int(iT.x)), bundle);
		const u = tt.oneMinus();
		mat.positionNode = p0
			.mul(u.mul(u).mul(u))
			.add(c1.mul(u.mul(u).mul(tt).mul(3)))
			.add(c2.mul(u.mul(tt).mul(tt).mul(3)))
			.add(p3.mul(tt.mul(tt).mul(tt)));

		const stS = this.stateBuf.element(s);
		const stT = this.stateBuf.element(t);
		const litS = stS.x.greaterThan(0.5);
		const litT = stT.x.greaterThan(0.5);
		const both = select(litS.and(litT), float(1), float(0));
		const cited = select(stS.x.greaterThan(2.5).and(stT.x.greaterThan(2.5)), float(1), float(0));
		const col = mix(palette.element(int(iS.x)), palette.element(int(iT.x)), tt);
		const vCol: N = varying(col);
		const vBoth: N = varying(both);
		const vCited: N = varying(cited);
		const vT: N = varying(tt);
		const vW: N = opts.trail ? float(1) : varying(attribute('aRel', 'float'));

		mat.colorNode = Fn(() => {
			if (opts.trail) {
				const flow = sin(vT.mul(14).sub(this.uTime.mul(3.2))).mul(0.5).add(0.5).pow(3);
				const gold = vec3(1, 0.8, 0.42);
				return vec4(gold.mul(flow.mul(1.6).add(0.55)), 1);
			}
			const flow = sin(vT.mul(9).sub(this.uTime.mul(2.6))).mul(0.5).add(0.5);
			const base = this.uEdgeAlpha.mul(vW).mul(mix(float(1), float(0.22), this.uDim)).mul(this.uEdgeFade);
			const litGain = vBoth.mul(flow.mul(0.6).add(0.45)).mul(mix(float(0.55), float(1.25), vCited));
			const c = mix(vCol, vec3(1, 0.85, 0.5), vCited.mul(0.5));
			return vec4(c.mul(base.add(litGain.mul(this.uEdgeLit.mul(0.6).add(0.4)))), 1);
		})();
		return mat;
	}

	private buildEdges(g: ClientGraph, anchorsU: N) {
		const m = g.edgeSrc.length;
		const verts = new Float32Array(m * EDGE_SEGMENTS * 2 * 3);
		const rel = new Float32Array(m * EDGE_SEGMENTS * 2);
		let o = 0;
		for (let e = 0; e < m; e++) {
			const s = g.edgeSrc[e];
			const t = g.edgeDst[e];
			rel.fill(REL_VISUAL[g.relNames[g.edgeRel[e]]] ?? 0.6, e * EDGE_SEGMENTS * 2, (e + 1) * EDGE_SEGMENTS * 2);
			for (let k = 0; k < EDGE_SEGMENTS; k++) {
				verts[o++] = s;
				verts[o++] = t;
				verts[o++] = k / EDGE_SEGMENTS;
				verts[o++] = s;
				verts[o++] = t;
				verts[o++] = (k + 1) / EDGE_SEGMENTS;
			}
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
		geo.setAttribute('aRel', new THREE.BufferAttribute(rel, 1));
		const lines = new THREE.LineSegments(geo, this.edgeMaterial(anchorsU));
		lines.frustumCulled = false;
		lines.renderOrder = 1;
		this.edges = lines;
		this.scene.add(lines);
		(this as N)._anchorsU = anchorsU;
	}

	/** Gold "asterism" polyline through the cited nodes, in citation order. */
	setTrail(indices: number[]) {
		if (this.trails) {
			this.scene.remove(this.trails);
			this.trails.geometry.dispose();
			(this.trails.material as THREE.Material).dispose();
			this.trails = null;
		}
		if (indices.length < 2 || !this.graph) return;
		const segs = 16;
		const verts = new Float32Array((indices.length - 1) * segs * 6);
		let o = 0;
		for (let k = 0; k < indices.length - 1; k++) {
			for (let q = 0; q < segs; q++) {
				verts.set([indices[k], indices[k + 1], q / segs, indices[k], indices[k + 1], (q + 1) / segs], o);
				o += 6;
			}
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
		const lines = new THREE.LineSegments(geo, this.edgeMaterial((this as N)._anchorsU, { trail: true }));
		lines.frustumCulled = false;
		lines.renderOrder = 3;
		this.trails = lines;
		this.scene.add(lines);
	}

	private buildStars() {
		const n = 2600;
		const arr = new Float32Array(n * 4);
		let seed = 7;
		const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
		for (let i = 0; i < n; i++) {
			const v = new THREE.Vector3(rnd(), rnd(), rnd()).normalize().multiplyScalar(2600 + Math.abs(rnd()) * 2400);
			arr.set([v.x, v.y, v.z, Math.abs(rnd())], i * 4);
		}
		const buf = instancedArray(arr, 'vec4');
		const mat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
		const a = buf.toAttribute();
		mat.positionNode = a.xyz;
		mat.scaleNode = a.w.mul(5).add(3);
		mat.colorNode = Fn(() => {
			const d = length(uv().sub(0.5).mul(2));
			const tw = sin(this.uTime.mul(a.w.mul(1.5).add(0.3)).add(a.w.mul(40))).mul(0.35).add(0.65);
			const v = smoothstep(float(1), float(0), d).pow(3).mul(tw).mul(0.5);
			return vec4(vec3(0.7, 0.8, 1).mul(v), v);
		})();
		const s = new THREE.Sprite(mat);
		s.count = n;
		s.frustumCulled = false;
		this.stars = s;
		this.scene.add(s);
	}

	/* ------------------------------------------------------------------ */
	/* Highlights                                                          */
	/* ------------------------------------------------------------------ */

	/** Light nodes. Higher kinds win over lower ones unless `force`. */
	light(indices: Iterable<number>, kind: LitKind, force = false) {
		if (!this.graph) return;
		const level = LIT[kind];
		const now = this.uTime.value as number;
		let changed = false;
		for (const i of indices) {
			if (i < 0 || i >= this.count) continue;
			const cur = this.stateArray[i * 4];
			if (force || level > cur) {
				this.stateArray[i * 4] = level;
				this.stateArray[i * 4 + 1] = now;
				changed = true;
			}
		}
		if (changed) this.flushState();
	}

	private spot: { i: number; level: number; t: number }[] = [];

	/** Temporarily flare nodes (hovering a citation or a block item); null restores them. */
	spotlight(indices: number[] | null) {
		for (const sp of this.spot) {
			this.stateArray[sp.i * 4] = sp.level;
			this.stateArray[sp.i * 4 + 1] = sp.t;
		}
		this.spot = [];
		if (indices?.length) {
			const now = this.uTime.value as number;
			for (const i of indices) {
				if (i < 0 || i >= this.count) continue;
				this.spot.push({ i, level: this.stateArray[i * 4], t: this.stateArray[i * 4 + 1] });
				this.stateArray[i * 4] = LIT.focus;
				this.stateArray[i * 4 + 1] = now;
			}
		}
		this.flushState();
	}

	autoRotate = true;

	/** Clear every highlight (fade back to the full constellation). */
	clearLights() {
		this.spot = [];
		this.stateArray.fill(0);
		this.flushState();
		this.setTrail([]);
	}

	/** Lower every lit node to at most `kind` (e.g. finished answers settle to "read"). */
	settleLights(maxKind: LitKind) {
		const lvl = LIT[maxKind];
		for (let i = 0; i < this.count; i++) if (this.stateArray[i * 4] > lvl) this.stateArray[i * 4] = lvl;
		this.flushState();
	}

	litLevel(i: number) {
		return this.stateArray[i * 4] ?? 0;
	}

	private flushState() {
		const attr = this.stateBuf?.value as THREE.StorageInstancedBufferAttribute | undefined;
		if (!attr) return;
		(attr.array as Float32Array).set(this.stateArray);
		attr.needsUpdate = true;
		let any = false;
		for (let i = 0; i < this.count; i++) {
			if (this.stateArray[i * 4] > 0.5) {
				any = true;
				break;
			}
		}
		this.litAny = any;
		this.uDimTarget = any ? 1 : 0;
	}

	/* ------------------------------------------------------------------ */
	/* Camera                                                              */
	/* ------------------------------------------------------------------ */

	position(i: number) {
		return new THREE.Vector3(this.positions[i * 4], this.positions[i * 4 + 1], this.positions[i * 4 + 2]);
	}

	/** Fly the camera to frame a set of nodes (or one). */
	flyTo(indices: number[], opts: { distance?: number; duration?: number } = {}) {
		if (!indices.length) return;
		const box = new THREE.Box3();
		for (const i of indices) box.expandByPoint(this.position(i));
		const center = box.getCenter(new THREE.Vector3());
		const size = box.getSize(new THREE.Vector3()).length();
		const dist = opts.distance ?? Math.max(300, size * 1.45);
		const dir = this.camera.position.clone().sub(this.controls.target).normalize();
		this.fly = {
			from: this.camera.position.clone(),
			to: center.clone().add(dir.multiplyScalar(dist)),
			tFrom: this.controls.target.clone(),
			tTo: center,
			t0: performance.now(),
			dur: opts.duration ?? 1100
		};
		this.lastInteraction = performance.now();
	}

	resetView() {
		this.fly = {
			from: this.camera.position.clone(),
			to: new THREE.Vector3(0, 0, 1500),
			tFrom: this.controls.target.clone(),
			tTo: new THREE.Vector3(),
			t0: performance.now(),
			dur: 1200
		};
	}

	/** Back out to the whole constellation (keeping the viewing angle) if zoomed in on a part. */
	overview() {
		const target = new THREE.Vector3();
		const dir = this.camera.position.clone().sub(target);
		if (dir.length() > 1200 && this.controls.target.length() < 150) return;
		this.fly = {
			from: this.camera.position.clone(),
			to: dir.setLength(1500),
			tFrom: this.controls.target.clone(),
			tTo: target,
			t0: performance.now(),
			dur: 1300
		};
	}

	zoom(factor: number) {
		const dir = this.camera.position.clone().sub(this.controls.target);
		const len = THREE.MathUtils.clamp(dir.length() * factor, this.controls.minDistance, this.controls.maxDistance);
		this.fly = {
			from: this.camera.position.clone(),
			to: this.controls.target.clone().add(dir.setLength(len)),
			tFrom: this.controls.target.clone(),
			tTo: this.controls.target.clone(),
			t0: performance.now(),
			dur: 420
		};
		this.lastInteraction = performance.now();
	}

	project(i: number, out: Projected = { x: 0, y: 0, z: 0, visible: false }): Projected {
		const v = new THREE.Vector3(this.positions[i * 4], this.positions[i * 4 + 1], this.positions[i * 4 + 2]);
		return this.projectPoint(v, out);
	}

	projectPoint(v: THREE.Vector3, out: Projected = { x: 0, y: 0, z: 0, visible: false }): Projected {
		v.project(this.camera);
		const w = this.canvas.clientWidth;
		const h = this.canvas.clientHeight;
		out.x = (v.x * 0.5 + 0.5) * w;
		out.y = (-v.y * 0.5 + 0.5) * h;
		out.z = v.z;
		out.visible = v.z > -1 && v.z < 1 && out.x > -40 && out.x < w + 40 && out.y > -40 && out.y < h + 40;
		return out;
	}

	topicCentroid(topic: number): THREE.Vector3 {
		const c = new THREE.Vector3();
		let k = 0;
		if (!this.graph) return c;
		for (let i = 0; i < this.count; i++) {
			if (this.graph.topics[i] !== topic) continue;
			c.x += this.positions[i * 4];
			c.y += this.positions[i * 4 + 1];
			c.z += this.positions[i * 4 + 2];
			k++;
		}
		return k ? c.divideScalar(k) : (this.anchors[topic]?.clone() ?? c);
	}

	/* ------------------------------------------------------------------ */
	/* Loop                                                                */
	/* ------------------------------------------------------------------ */

	private tick = () => {
		if (!this.running || this.disposed) return;
		this.clock.update();
		const dt = Math.min(0.05, this.clock.getDelta());
		this.uTime.value = (this.uTime.value as number) + dt;
		const dimNow = this.uDim.value as number;
		this.uDim.value = dimNow + (this.uDimTarget - dimNow) * Math.min(1, dt * 3);
		const fade = this.uEdgeFade.value as number;
		if (fade < 1) this.uEdgeFade.value = Math.min(1, fade + dt * 0.45);
		const edgeLit = this.uEdgeLit.value as number;
		this.uEdgeLit.value = edgeLit + ((this.litAny ? 1 : 0) - edgeLit) * Math.min(1, dt * 2);

		if (this.graph && this.computeForces) {
			const alpha = this.uAlpha.value as number;
			if (alpha > 0.004) {
				const stride = (this as N)._stride as number;
				// Hot phase: two simulation steps per frame so the constellation unfolds quickly.
				const steps = alpha > 0.2 ? 2 : 1;
				for (let k = 0; k < steps; k++) {
					(this as N)._uPhase.value = (this.frame * 2 + k) % stride;
					this.renderer.compute(this.computeForces);
					this.renderer.compute(this.computeIntegrate);
				}
				this.uAlpha.value = alpha * 0.985;
				if (this.frame % 12 === 0) this.readback();
			} else if (!this.settledFired) {
				this.settledFired = true;
				this.readback().then(() => this.events.settled?.());
			}
			this.frame++;
		}

		if (this.fly) {
			const k = Math.min(1, (performance.now() - this.fly.t0) / this.fly.dur);
			const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
			this.camera.position.lerpVectors(this.fly.from, this.fly.to, e);
			this.controls.target.lerpVectors(this.fly.tFrom, this.fly.tTo, e);
			if (k >= 1) this.fly = null;
		}
		this.controls.autoRotate = this.autoRotate && performance.now() - this.lastInteraction > 9000 && !this.fly;
		this.controls.update(dt);
		this.pipeline.render();
		this.adaptResolution(dt);
	};

	/**
	 * Large Retina canvases with bloom can fall below a smooth frame rate; step the pixel ratio
	 * down (not below 1.25, to stay crisp) until it holds. Bloom hides most of the difference.
	 */
	private adaptResolution(dt: number) {
		if (!this.settledFired || document.hidden) return;
		this.perf.frames++;
		this.perf.time += dt;
		if (this.perf.frames < 90) return;
		const fps = this.perf.frames / this.perf.time;
		this.perf = { frames: 0, time: 0 };
		const ratio = this.renderer.getPixelRatio();
		if (fps < 45 && ratio > 1.25) {
			this.renderer.setPixelRatio(Math.max(1.25, ratio - 0.25));
			this.resize();
		}
	}

	/** Reheat the layout (after the graph changes). */
	reheat(alpha = 0.5) {
		this.uAlpha.value = Math.max(this.uAlpha.value as number, alpha);
		this.settledFired = false;
	}

	private async readback() {
		if (this.reading || !this.posBuf) return;
		this.reading = true;
		try {
			const buf = await this.renderer.getArrayBufferAsync(this.posBuf.value);
			const arr = new Float32Array(buf);
			if (arr.length === this.positions.length) this.positions = arr;
		} catch {
			/* device busy — try again next time */
		} finally {
			this.reading = false;
		}
	}

	/* ------------------------------------------------------------------ */
	/* Picking                                                             */
	/* ------------------------------------------------------------------ */

	private downAt: { x: number; y: number; t: number } | null = null;
	private tmp = new THREE.Vector3();

	pick(clientX: number, clientY: number, radius = 14): number | null {
		if (!this.graph) return null;
		const rect = this.canvas.getBoundingClientRect();
		const mx = clientX - rect.left;
		const my = clientY - rect.top;
		const w = rect.width;
		const h = rect.height;
		const m = this.camera.projectionMatrix.clone().multiply(this.camera.matrixWorldInverse);
		const e = m.elements;
		let best: number | null = null;
		let bestScore = Infinity;
		for (let i = 0; i < this.count; i++) {
			const x = this.positions[i * 4];
			const y = this.positions[i * 4 + 1];
			const z = this.positions[i * 4 + 2];
			const cw = e[3] * x + e[7] * y + e[11] * z + e[15];
			if (cw <= 0) continue;
			const sx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / cw) * 0.5 + 0.5;
			const sy = -((e[1] * x + e[5] * y + e[9] * z + e[13]) / cw) * 0.5 + 0.5;
			const dx = sx * w - mx;
			const dy = sy * h - my;
			const d2 = dx * dx + dy * dy;
			const lit = this.stateArray[i * 4];
			const dimPenalty = this.litAny && lit < 0.5 ? 2.2 : 1;
			const r = radius * (this.graph.types[i] === 'fact' ? 1 : 1.4);
			if (d2 > r * r * (lit > 0.5 ? 2 : 1)) continue;
			const score = (d2 * dimPenalty) / (1 + lit) + cw * 0.001;
			if (score < bestScore) {
				bestScore = score;
				best = i;
			}
		}
		return best;
	}

	private setHover(i: number | null) {
		if (i === this.hoverIndex) return;
		this.hoverIndex = i;
		this.uHover.value = i ?? -1;
		this.canvas.style.cursor = i == null ? '' : 'pointer';
		this.events.hover?.(i);
	}

	private pendingMove: PointerEvent | null = null;
	private onPointerMove = (ev: PointerEvent) => {
		if (ev.buttons) return;
		if (!this.pendingMove) {
			requestAnimationFrame(() => {
				const e = this.pendingMove;
				this.pendingMove = null;
				if (e) this.setHover(this.pick(e.clientX, e.clientY));
			});
		}
		this.pendingMove = ev;
	};
	private onPointerDown = (ev: PointerEvent) => {
		this.downAt = { x: ev.clientX, y: ev.clientY, t: performance.now() };
		this.lastInteraction = performance.now();
	};
	private onPointerUp = (ev: PointerEvent) => {
		const d = this.downAt;
		this.downAt = null;
		if (!d) return;
		if (Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 5 || performance.now() - d.t > 600) return;
		this.events.click?.(this.pick(ev.clientX, ev.clientY), ev);
	};

	/* ------------------------------------------------------------------ */

	/** Pixels on the right covered by UI: the projection centre shifts to the visible area. */
	insetRight = 0;

	setInsetRight(px: number) {
		this.insetRight = px;
		this.resize();
	}

	resize() {
		const parent = this.canvas.parentElement;
		const w = parent?.clientWidth ?? window.innerWidth;
		const h = parent?.clientHeight ?? window.innerHeight;
		if (!w || !h) return;
		this.renderer.setSize(w, h, false);
		const inset = Math.min(this.insetRight, w * 0.6);
		this.camera.aspect = (w + inset) / h;
		if (inset > 0) this.camera.setViewOffset(w + inset, h, inset, 0, w, h);
		else this.camera.clearViewOffset();
		this.camera.updateProjectionMatrix();
	}

	private disposeGraphObjects() {
		for (const o of [this.nodes, this.edges, this.trails, this.reticle]) {
			if (!o) continue;
			this.scene.remove(o);
			o.geometry?.dispose();
			(o.material as THREE.Material).dispose();
		}
		this.nodes = this.edges = this.trails = this.reticle = null;
	}

	dispose() {
		this.disposed = true;
		this.running = false;
		this.renderer?.setAnimationLoop(null);
		this.resizeObs?.disconnect();
		this.disposeGraphObjects();
		this.stars?.geometry?.dispose();
		this.controls?.dispose();
		this.renderer?.dispose();
	}

	// Silence unused-import lint for helpers kept for shader tweaks.
	static _keep = [If, clamp, max];
}
