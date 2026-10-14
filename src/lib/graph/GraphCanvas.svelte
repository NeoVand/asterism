<script lang="ts">
	import { onMount } from 'svelte';
	import { GraphRenderer } from './GraphRenderer';
	import type { ClientGraph } from './types';

	interface Props {
		graph: ClientGraph | null;
		onready?: (r: GraphRenderer) => void;
		/** The renderer now shows this graph (lights can be applied). */
		ongraph?: (g: ClientGraph) => void;
		onhover?: (index: number | null) => void;
		onselect?: (index: number | null, event: PointerEvent) => void;
		onsettled?: () => void;
		onunsettled?: () => void;
		onerror?: (message: string) => void;
	}

	let { graph, onready, ongraph, onhover, onselect, onsettled, onunsettled, onerror }: Props =
		$props();

	let canvas: HTMLCanvasElement;
	let renderer: GraphRenderer | null = $state(null);

	onMount(() => {
		const r = new GraphRenderer(canvas);
		let cancelled = false;
		r.init()
			.then(() => {
				if (cancelled) return;
				r.events = {
					hover: (i) => onhover?.(i),
					click: (i, e) => onselect?.(i, e),
					settled: () => onsettled?.(),
					unsettled: () => onunsettled?.()
				};
				renderer = r;
				onready?.(r);
			})
			.catch((e) => onerror?.(e instanceof Error ? e.message : String(e)));
		return () => {
			cancelled = true;
			r.dispose();
		};
	});

	$effect(() => {
		if (!renderer || !graph) return;
		renderer.setGraph(graph);
		ongraph?.(graph);
	});
</script>

<div class="absolute inset-0">
	<canvas bind:this={canvas} class="block h-full w-full outline-none"></canvas>
</div>
