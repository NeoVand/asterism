<script lang="ts">
	import { onMount } from 'svelte';
	import GraphCanvas from '#lib/graph/GraphCanvas.svelte';
	import { decodeGraph, type ClientGraph, type GraphWire } from '#lib/graph/types.ts';
	import type { GraphRenderer } from '#lib/graph/GraphRenderer.ts';

	let graph: ClientGraph | null = $state(null);
	let renderer: GraphRenderer | null = $state(null);
	let hovered: number | null = $state(null);
	let error = $state('');

	onMount(async () => {
		const res = await fetch('/api/graph');
		graph = decodeGraph((await res.json()) as GraphWire);
	});
</script>

<main class="relative h-screen w-screen overflow-hidden">
	<GraphCanvas
		{graph}
		onready={(r) => {
			renderer = r;
			(window as unknown as Record<string, unknown>).__asterism = r;
		}}
		onhover={(i) => (hovered = i)}
		onerror={(m) => (error = m)}
	/>
	<div class="pointer-events-none absolute top-4 left-4 font-mono text-xs text-fg-3">
		{graph?.ids.length ?? 0} nodes · {graph?.edgeSrc.length ?? 0} edges · {renderer?.backend ?? ''}
		{#if hovered != null && graph}
			<div class="mt-2 max-w-md text-fg-2">{graph.types[hovered]} · {graph.labels[hovered]}</div>
		{/if}
		{#if error}<div class="text-bad">{error}</div>{/if}
	</div>
</main>
