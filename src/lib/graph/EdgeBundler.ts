/**
 * GPU kernel-density edge bundling (after Hurter, Ersoy & Telea, "Graph Bundling by Kernel
 * Density Estimation", 2012), in TSL compute.
 *
 * Every edge is a polyline of P points (endpoints fixed). One iteration:
 *   1. splat all interior points into a density grid (atomic adds),
 *   2. blur the grid with a separable Gaussian of width h,
 *   3. move each interior point a step up the density gradient,
 *   4. smooth each polyline (Laplacian) so edges stay curves, not zigzags.
 * h shrinks every iteration, so wide highways form first and then tighten. The grid is 2D
 * (512²) for the flat view and a 128³ volume in 3D. Cost per iteration is linear in the number of
 * points (≈1.2M for 110k edges), so it runs a little each frame and the bundles visibly gather.
 */
import * as THREE from 'three/webgpu';
import {
	Fn,
	If,
	Loop,
	atomicAdd,
	atomicLoad,
	atomicStore,
	clamp as clampT,
	exp,
	float,
	floor,
	instanceIndex,
	instancedArray,
	int,
	ivec3,
	length,
	mix,
	storage,
	uint,
	uniform,
	vec3,
	vec4
} from 'three/tsl';

/* eslint-disable @typescript-eslint/no-explicit-any */
type N = any;
/** clamp on integer nodes (the TSL typings only describe float/vector overloads). */
const clamp = clampT as N;

const GRID_2D = 512;
const GRID_3D = 128;
const MAX_CELLS = Math.max(GRID_2D * GRID_2D, GRID_3D * GRID_3D * GRID_3D);
const MAX_RADIUS = 28;

export interface BundlerOptions {
	/** Node positions (vec4 storage buffer). */
	posBuf: N;
	edgeSrc: Uint32Array | number[];
	edgeDst: Uint32Array | number[];
	/** Points per edge, including both endpoints. */
	points: number;
	/** The edge's current (unbundled) curve at parameter u in [0, 1]: the starting shape. */
	curve: (s: N, t: N, u: N) => N;
}

export class EdgeBundler {
	/** Bundled polylines, vec4 per point, `edge * points + k`; endpoints hold the node positions at bundling time. */
	readonly points: N;
	readonly perEdge: number;
	/** True while iterations remain. */
	running = false;
	/** 0 → 1 over the run, for callers that want to show progress. */
	progress = 0;

	private scratch: N;
	private dens: N;
	private fA: N;
	private fB: N;
	private kInit: N;
	private kClear: N;
	private kSplat: N;
	private kBlur: N[];
	private kAdvect: N;
	private kSmooth: N;
	private uMin = uniform(new THREE.Vector3());
	private uCell = uniform(1);
	private uGX = uniform(1, 'int');
	private uGY = uniform(1, 'int');
	private uGZ = uniform(1, 'int');
	private uCells = uniform(1, 'int');
	private uSigma = uniform(4);
	private uRadius = uniform(8, 'int');
	private uStep = uniform(1);
	private uLambda = uniform(0.5);
	private iteration = 0;
	private iterations = 26;
	private h0 = 12;
	private dims: 2 | 3 = 3;

	constructor(opts: BundlerOptions) {
		const P = (this.perEdge = opts.points);
		const m = opts.edgeSrc.length;
		const total = m * P;
		const src = instancedArray(Uint32Array.from(opts.edgeSrc), 'uint');
		const dst = instancedArray(Uint32Array.from(opts.edgeDst), 'uint');
		this.points = instancedArray(total, 'vec4');
		this.scratch = instancedArray(total, 'vec4');
		const densAttr = new THREE.StorageBufferAttribute(new Uint32Array(MAX_CELLS), 1);
		this.dens = storage(densAttr, 'uint', MAX_CELLS).toAtomic();
		this.fA = instancedArray(MAX_CELLS, 'float');
		this.fB = instancedArray(MAX_CELLS, 'float');

		const A = this.points;
		const B = this.scratch;
		const last = uint(P - 1);
		const edgeOf = (i: N) => i.div(uint(P));
		const kOf = (i: N) => i.mod(uint(P));
		const interior = (k: N) => k.greaterThan(uint(0)).and(k.lessThan(last));

		// 0. Start from the edges' current curves, so switching bundling on is seamless.
		this.kInit = Fn(() => {
			const e = edgeOf(instanceIndex);
			const k = kOf(instanceIndex);
			const u = float(k).div(float(P - 1));
			const p = opts.curve(src.element(e), dst.element(e), u);
			A.element(instanceIndex).assign(vec4(p, 1));
		})().compute(total);

		const cellOf = (p: N) => {
			const c = floor(p.sub(this.uMin).div(this.uCell)) as N;
			const cx = clamp(int(c.x), int(0), this.uGX.sub(1));
			const cy = clamp(int(c.y), int(0), this.uGY.sub(1));
			const cz = clamp(int(c.z), int(0), this.uGZ.sub(1));
			return ivec3(cx, cy, cz);
		};
		const flat = (x: N, y: N, z: N) => x.add(y.mul(this.uGX)).add(z.mul(this.uGX).mul(this.uGY));

		this.kClear = Fn(() => {
			If(int(instanceIndex).lessThan(this.uCells), () => {
				atomicStore(this.dens.element(instanceIndex), uint(0));
			});
		})().compute(MAX_CELLS);

		this.kSplat = Fn(() => {
			If(interior(kOf(instanceIndex)), () => {
				const c = cellOf(A.element(instanceIndex).xyz);
				atomicAdd(this.dens.element(flat(c.x, c.y, c.z)), uint(1));
			});
		})().compute(total);

		// Separable Gaussian: x reads the atomic counts, y and z ping-pong the float grids.
		const blur = (axis: 0 | 1 | 2, read: (j: N) => N, out: N) =>
			Fn(() => {
				const i = int(instanceIndex);
				If(i.lessThan(this.uCells), () => {
					const x = i.mod(this.uGX);
					const y = i.div(this.uGX).mod(this.uGY);
					const z = i.div(this.uGX.mul(this.uGY));
					const coord = axis === 0 ? x : axis === 1 ? y : z;
					const size = axis === 0 ? this.uGX : axis === 1 ? this.uGY : this.uGZ;
					const stride = axis === 0 ? int(1) : axis === 1 ? this.uGX : this.uGX.mul(this.uGY);
					const sum = float(0).toVar();
					const wsum = float(0).toVar();
					const d = int(0).sub(this.uRadius).toVar();
					Loop(d.lessThanEqual(this.uRadius) as N, () => {
						const q = coord.add(d);
						If(q.greaterThanEqual(0).and(q.lessThan(size)), () => {
							const w = exp(float(d.mul(d)).div(this.uSigma.mul(this.uSigma).mul(-2)));
							sum.addAssign(read(i.add(d.mul(stride))).mul(w));
							wsum.addAssign(w);
						});
						d.addAssign(1);
					});
					out.element(i).assign(sum.div(wsum.max(1e-6)));
				});
			})().compute(MAX_CELLS);
		this.kBlur = [
			blur(0, (j) => float(atomicLoad(this.dens.element(j)) as N), this.fA),
			blur(1, (j) => this.fA.element(j), this.fB),
			blur(2, (j) => this.fB.element(j), this.fA)
		];

		// Climb the density: each interior point moves a step toward where edges crowd.
		this.kAdvect = Fn(() => {
			const p = A.element(instanceIndex).toVar();
			If(interior(kOf(instanceIndex)), () => {
				const c = cellOf(p.xyz);
				const D = (dx: number, dy: number, dz: number) =>
					this.fA.element(
						flat(
							clamp(c.x.add(dx), int(0), this.uGX.sub(1)),
							clamp(c.y.add(dy), int(0), this.uGY.sub(1)),
							clamp(c.z.add(dz), int(0), this.uGZ.sub(1))
						)
					);
				const g = vec3(
					D(1, 0, 0).sub(D(-1, 0, 0)),
					D(0, 1, 0).sub(D(0, -1, 0)),
					D(0, 0, 1).sub(D(0, 0, -1))
				);
				const len = length(g);
				If(len.greaterThan(1e-5), () => {
					p.assign(vec4(p.xyz.add(g.div(len).mul(this.uStep)), 1));
				});
			});
			B.element(instanceIndex).assign(p);
		})().compute(total);

		// Keep each edge a smooth curve.
		this.kSmooth = Fn(() => {
			const p = B.element(instanceIndex);
			If(interior(kOf(instanceIndex)), () => {
				const avg = B.element(instanceIndex.sub(1))
					.xyz.add(B.element(instanceIndex.add(1)).xyz)
					.mul(0.5);
				A.element(instanceIndex).assign(vec4((mix as N)(p.xyz, avg, this.uLambda), 1));
			}).Else(() => {
				A.element(instanceIndex).assign(p);
			});
		})().compute(total);
	}

	/**
	 * Start bundling from the current curves. `bounds` is the layout's bounding box; `dims` picks
	 * a flat 2D grid or a 3D volume.
	 */
	start(renderer: THREE.WebGPURenderer, bounds: THREE.Box3, dims: 2 | 3) {
		this.dims = dims;
		const size = bounds.getSize(new THREE.Vector3());
		const pad = Math.max(size.x, size.y, size.z) * 0.04 + 1;
		const min = bounds.min.clone().subScalar(pad);
		const extent = size.addScalar(pad * 2);
		const n = dims === 2 ? GRID_2D : GRID_3D;
		const cell = Math.max(extent.x, extent.y, dims === 3 ? extent.z : 0) / n;
		const gx = Math.min(n, Math.max(1, Math.ceil(extent.x / cell)));
		const gy = Math.min(n, Math.max(1, Math.ceil(extent.y / cell)));
		const gz = dims === 2 ? 1 : Math.min(n, Math.max(1, Math.ceil(extent.z / cell)));
		if (dims === 2) min.z = -cell / 2;
		this.uMin.value.copy(min);
		this.uCell.value = cell;
		this.uGX.value = gx;
		this.uGY.value = gy;
		this.uGZ.value = gz;
		this.uCells.value = gx * gy * gz;
		// Kernel width in cells: wide enough to gather distant parallel edges at first.
		this.h0 = dims === 2 ? 14 : 5;
		this.iteration = 0;
		this.progress = 0;
		this.running = true;
		renderer.compute(this.kInit);
	}

	/** One iteration (call once per frame while `running`). */
	step(renderer: THREE.WebGPURenderer) {
		if (!this.running) return;
		const t = this.iteration / this.iterations;
		// Stop before the bundles collapse to single pixels: they stay legible and colourful.
		const h = Math.max(this.dims === 2 ? 2.6 : 1.4, this.h0 * Math.pow(0.9, this.iteration));
		this.uSigma.value = h;
		this.uRadius.value = Math.min(MAX_RADIUS, Math.ceil(h * 2.5));
		this.uStep.value = h * this.uCell.value * 0.4;
		this.uLambda.value = 0.5;
		renderer.compute(this.kClear);
		renderer.compute(this.kSplat);
		renderer.compute(this.kBlur[0]);
		renderer.compute(this.kBlur[1]);
		renderer.compute(this.kBlur[2]);
		renderer.compute(this.kAdvect);
		renderer.compute(this.kSmooth);
		this.iteration++;
		this.progress = Math.min(1, (t * this.iterations + 1) / this.iterations);
		if (this.iteration >= this.iterations) this.running = false;
	}

	dispose() {
		this.running = false;
		for (const b of [this.points, this.scratch, this.fA, this.fB]) b?.value?.dispose?.();
	}
}
