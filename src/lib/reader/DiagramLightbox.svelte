<script lang="ts">
	/** A diagram full size: fitted to the window, wheel to zoom, drag to pan (the page closes it on Esc). */
	import { fade, scale } from 'svelte/transition';
	import Icon from '#lib/ui/Icon.svelte';
	import { CloseIcon, ResetIcon } from '#lib/ui/icons.ts';

	interface Props {
		svg: string | null;
		caption?: string;
		onclose: () => void;
	}

	let { svg, caption = '', onclose }: Props = $props();

	let zoom = $state(1);
	let pan = $state({ x: 0, y: 0 });
	let drag: { x: number; y: number; px: number; py: number } | null = null;
	let stage = $state<HTMLDivElement>();

	$effect(() => {
		void svg;
		zoom = 1;
		pan = { x: 0, y: 0 };
	});

	function wheel(e: WheelEvent) {
		e.preventDefault();
		if (!stage) return;
		const r = stage.getBoundingClientRect();
		const cx = e.clientX - r.left - r.width / 2;
		const cy = e.clientY - r.top - r.height / 2;
		const next = Math.min(6, Math.max(0.5, zoom * Math.exp(-e.deltaY * 0.0022)));
		// Zoom about the pointer.
		pan = {
			x: cx - ((cx - pan.x) * next) / zoom,
			y: cy - ((cy - pan.y) * next) / zoom
		};
		zoom = next;
	}

	function down(e: PointerEvent) {
		drag = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function move(e: PointerEvent) {
		if (!drag) return;
		pan = { x: drag.px + e.clientX - drag.x, y: drag.py + e.clientY - drag.y };
	}
</script>

{#if svg}
	<div
		class="fixed inset-0 z-[90] flex flex-col bg-ink-950/85 backdrop-blur-md"
		transition:fade={{ duration: 160 }}
		role="dialog"
		aria-modal="true"
		aria-label="Diagram"
	>
		<div class="flex h-14 shrink-0 items-center gap-2 px-5">
			<div class="min-w-0 flex-1 truncate text-[13px] text-fg-2">{caption}</div>
			<span class="font-mono text-[11px] text-fg-4">{Math.round(zoom * 100)}%</span>
			<button
				type="button"
				class="rounded-lg p-2 text-fg-3 transition-colors hover:bg-white/[0.06] hover:text-fg"
				onclick={() => {
					zoom = 1;
					pan = { x: 0, y: 0 };
				}}
				aria-label="Fit to the window"
			>
				<Icon icon={ResetIcon} size={15} />
			</button>
			<button
				type="button"
				class="rounded-lg p-2 text-fg-3 transition-colors hover:bg-white/[0.06] hover:text-fg"
				onclick={onclose}
				aria-label="Close"
			>
				<Icon icon={CloseIcon} size={16} />
			</button>
		</div>
		<div
			bind:this={stage}
			class="relative min-h-0 flex-1 cursor-grab overflow-hidden active:cursor-grabbing"
			onwheel={wheel}
			onpointerdown={down}
			onpointermove={move}
			onpointerup={() => (drag = null)}
			ondblclick={() => {
				zoom = zoom > 1.5 ? 1 : 2;
				pan = { x: 0, y: 0 };
			}}
			role="presentation"
		>
			<div
				class="lightbox-svg absolute inset-0 flex items-center justify-center p-10"
				style:transform="translate({pan.x}px, {pan.y}px) scale({zoom})"
				in:scale={{ start: 0.96, duration: 220 }}
			>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- mermaid output, rendered with securityLevel strict -->
				{@html svg}
			</div>
		</div>
	</div>
{/if}

<style>
	/* Scale the drawing (it has a viewBox) to fill the stage. */
	.lightbox-svg :global(svg) {
		width: 100% !important;
		height: 100% !important;
		max-width: none !important;
	}
</style>
