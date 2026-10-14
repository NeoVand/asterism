<script lang="ts">
	/**
	 * HTML labels pinned to 3D positions: topic constellations, the stars the current answer
	 * cites (numbered like the chat chips), and the hovered star. Positions update imperatively
	 * every frame; Svelte only manages which labels exist.
	 */
	import { onMount } from 'svelte';
	import * as THREE from 'three/webgpu';
	import Icon from '#lib/ui/Icon.svelte';
	import {
		TopicAIcon,
		TopicBIcon,
		TopicCIcon,
		TopicDIcon,
		TopicEIcon,
		TopicFIcon,
		TopicGIcon,
		TopicHIcon,
		TopicIIcon
	} from '#lib/ui/icons.ts';
	import { TOPICS } from '#lib/kg/types.ts';
	import { TOPIC_COLORS, TYPE_LABEL } from './palette.ts';
	import type { GraphRenderer, Projected } from './GraphRenderer.ts';
	import type { ClientGraph } from './types.ts';

	interface Props {
		renderer: GraphRenderer | null;
		graph: ClientGraph | null;
		hovered: number | null;
		cited: { index: number; n: number }[];
		showTopics: boolean;
		dimTopics: boolean;
		ontopic: (topic: number) => void;
		onpick: (index: number) => void;
	}

	let { renderer, graph, hovered, cited, showTopics, dimTopics, ontopic, onpick }: Props = $props();

	const TOPIC_ICONS = [TopicAIcon, TopicBIcon, TopicCIcon, TopicDIcon, TopicEIcon, TopicFIcon, TopicGIcon, TopicHIcon, TopicIIcon];

	const topicCounts = $derived.by(() => {
		const c = new Array(9).fill(0);
		if (graph) for (let i = 0; i < graph.topics.length; i++) c[graph.topics[i]]++;
		return c;
	});

	let topicEls: HTMLElement[] = $state([]);
	let citedEls: HTMLButtonElement[] = $state([]);
	let hoverEl: HTMLElement | null = $state(null);
	let centroids: THREE.Vector3[] = [];
	/** Label offsets from the star: right, left, then above and below on either side. */
	const SLOTS = [
		[9, -9],
		[-9, -9],
		[9, -31],
		[9, 13],
		[-9, -31],
		[-9, 13]
	];
	const LABEL_H = 20;
	const widths = new WeakMap<HTMLElement, number>();
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- per-frame cache, not state
	const slots = new Map<number, number>();
	let lastCentroid = 0;

	onMount(() => {
		let raf = 0;
		const p: Projected = { x: 0, y: 0, z: 0, visible: false };
		const v = new THREE.Vector3();
		const loop = () => {
			raf = requestAnimationFrame(loop);
			if (!renderer || !graph) return;
			const now = performance.now();
			if (now - lastCentroid > 400 || centroids.length !== 9) {
				centroids = Array.from({ length: 9 }, (_, t) => renderer!.topicCentroid(t));
				lastCentroid = now;
			}
			const reveal = Math.max(0, Math.min(1, (renderer.layoutProgress - 0.55) / 0.35));
			for (let t = 0; t < topicEls.length; t++) {
				const el = topicEls[t];
				if (!el) continue;
				renderer.projectPoint(v.copy(centroids[t]), p);
				el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%) scale(${0.92 + 0.08 * reveal})`;
				el.style.visibility = p.visible && reveal > 0 ? 'visible' : 'hidden';
				el.style.setProperty('--reveal', String(reveal));
			}
			// Earlier citations win: each label takes the first free slot around its star (trying
			// last frame's slot first so labels don't hop), or hides when all slots collide.
			const placed: number[][] = [];
			// Stay on screen and clear of the chat panel on the right.
			const maxX = window.innerWidth - 490;
			const maxY = window.innerHeight - 8;
			const free = (x: number, y: number, w: number) =>
				x >= 8 &&
				x + w <= maxX &&
				y >= 8 &&
				y + LABEL_H <= maxY &&
				!placed.some(([a, b, c, d]) => x < c && x + w > a && y < d && y + LABEL_H > b);
			for (let k = 0; k < citedEls.length; k++) {
				const el = citedEls[k];
				const c = cited[k];
				if (!el || !c) continue;
				renderer.project(c.index, p);
				let w = widths.get(el);
				if (!w) widths.set(el, (w = el.offsetWidth + 6));
				const prev = slots.get(c.index) ?? 0;
				let at = -1;
				if (p.visible) {
					for (let i = 0; i < SLOTS.length && at < 0; i++) {
						const s = (prev + i) % SLOTS.length;
						const [sx, sy] = SLOTS[s];
						if (free(sx < 0 ? p.x + sx - w : p.x + sx, p.y + sy, w)) at = s;
					}
				}
				if (at < 0) {
					el.style.opacity = '0';
					continue;
				}
				slots.set(c.index, at);
				const [sx, sy] = SLOTS[at];
				const x = sx < 0 ? p.x + sx - w : p.x + sx;
				const y = p.y + sy;
				el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
				el.style.opacity = '1';
				placed.push([x, y, x + w, y + LABEL_H]);
			}
			if (hoverEl && hovered != null) {
				renderer.project(hovered, p);
				const w = hoverEl.offsetWidth;
				const right = p.x + 16 + w > window.innerWidth - 500;
				hoverEl.style.transform = `translate3d(${right ? p.x - 16 - w : p.x + 16}px, ${p.y - 14}px, 0)`;
			}
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	});

	function clip(s: string, n: number) {
		return s.length > n ? s.slice(0, n - 1) + '…' : s;
	}
</script>

<div class="pointer-events-none absolute inset-0 overflow-hidden">
	{#if showTopics && graph}
		{#each TOPICS as t, i (t.key)}
			<button
				type="button"
				bind:this={topicEls[i]}
				class="pointer-events-auto absolute top-0 left-0 flex items-center gap-2 rounded-full py-1 pr-3 pl-1 transition-opacity duration-500 will-change-transform hover:bg-ink-900/50"
				style:opacity="calc(var(--reveal, 0) * {dimTopics ? 0.35 : 0.92})"
				onclick={() => ontopic(i)}
			>
				<span
					class="flex size-7 items-center justify-center rounded-full border bg-ink-950/70 backdrop-blur-sm"
					style:border-color="{TOPIC_COLORS[i]}66"
					style:color={TOPIC_COLORS[i]}
					style:box-shadow="0 0 18px -2px {TOPIC_COLORS[i]}55"
				>
					<Icon icon={TOPIC_ICONS[i]} size={14} />
				</span>
				<span class="text-left leading-tight [text-shadow:0_0_4px_rgb(0_0_0),0_1px_10px_rgb(0_0_0/0.95)]">
					<span class="block text-[12.5px] font-medium text-fg">{t.name}</span>
					<span class="block font-mono text-[10px] text-fg-2">{topicCounts[i].toLocaleString()} nodes</span>
				</span>
			</button>
		{/each}
	{/if}

	{#each cited as c, k (c.index)}
		<button
			type="button"
			bind:this={citedEls[k]}
			class="pointer-events-auto absolute top-0 left-0 flex max-w-[220px] items-center gap-1.5 rounded-md bg-ink-950/75 py-0.5 pr-2 pl-0.5 text-[11px] text-fg-2 backdrop-blur-sm transition-[opacity,color] duration-300 will-change-transform hover:text-fg"
			onclick={() => onpick(c.index)}
		>
			<span
				class="flex h-[15px] min-w-[15px] items-center justify-center rounded-[4px] px-1 font-mono text-[9.5px] font-semibold text-ink-950"
				style:background={TOPIC_COLORS[graph?.topics[c.index] ?? 0]}>{c.n}</span
			>
			<span class="truncate">{clip(graph?.labels[c.index] ?? '', 40)}</span>
		</button>
	{/each}

	{#if hovered != null && graph}
		<div
			bind:this={hoverEl}
			class="absolute top-0 left-0 w-max max-w-[300px] rounded-lg border border-white/10 bg-ink-900/90 px-2.5 py-1.5 shadow-xl backdrop-blur-md will-change-transform"
		>
			<div class="mb-0.5 flex items-center gap-1.5 text-[10px] tracking-wide text-fg-3 uppercase">
				<span class="size-1.5 rounded-full" style:background={TOPIC_COLORS[graph.topics[hovered]]}></span>
				{TYPE_LABEL[graph.types[hovered]]}
				{#if graph.chapters[hovered] > 0}<span class="font-mono normal-case">· Ch {graph.chapters[hovered]}</span>{/if}
			</div>
			<div class="line-clamp-3 text-[12px] leading-snug text-fg">{graph.labels[hovered]}</div>
		</div>
	{/if}
</div>
