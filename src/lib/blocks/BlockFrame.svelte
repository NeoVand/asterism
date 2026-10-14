<script lang="ts">
	/**
	 * Shared card chrome for generative UI blocks: eyebrow (icon + label), title, optional
	 * subtitle, a right-aligned meta slot and a hover-revealed "copy as markdown" button.
	 * Descendants can opt into a staggered entrance with `class="blk-rise" style:--i={n}`.
	 */
	import type { Snippet } from 'svelte';
	import type { IconSvgElement } from '@hugeicons/svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { CheckIcon, CopyIcon } from '#lib/ui/icons.ts';
	import { tip } from '#lib/ui/tooltip.ts';

	interface Props {
		icon: IconSvgElement;
		/** Eyebrow label, e.g. "Plan" (rendered uppercase). */
		label: string;
		title?: string;
		subtitle?: string;
		/** Markdown for the copy button (string, or a lazy/async producer). */
		markdown?: string | (() => string | Promise<string>);
		/** Quiet meta at the right of the eyebrow row (counts, progress). */
		aside?: Snippet;
		children: Snippet;
	}

	let { icon, label, title, subtitle, markdown, aside, children }: Props = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		if (!markdown) return;
		try {
			const text = typeof markdown === 'function' ? await markdown() : markdown;
			await navigator.clipboard.writeText(text);
			copied = true;
			clearTimeout(timer);
			timer = setTimeout(() => (copied = false), 1400);
		} catch {
			/* clipboard unavailable — stay quiet */
		}
	}
</script>

<section
	class="frame group/frame rounded-xl border border-white/[0.06] bg-white/[0.025] p-3.5"
	aria-label={title ?? label}
>
	<header class="mb-3">
		<div class="flex h-5 items-center gap-1.5 text-fg-3">
			<Icon {icon} size={13} />
			<span class="text-[10.5px] leading-none font-medium tracking-[0.09em] uppercase">{label}</span
			>
			<div class="ml-auto flex items-center gap-2">
				{@render aside?.()}
				{#if markdown}
					<button
						type="button"
						class={[
							'-my-0.5 -mr-1 grid size-6 place-items-center rounded-md text-fg-4 transition-[opacity,color,background-color] duration-150 ease-out hover:bg-white/[0.06] hover:text-fg-2 focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:outline-none',
							copied ? 'opacity-100' : 'opacity-0 group-hover/frame:opacity-100'
						]}
						aria-label={copied ? 'Copied' : 'Copy as Markdown'}
						use:tip={'Copy as Markdown'}
						onclick={copy}
					>
						<span class="grid *:col-start-1 *:row-start-1">
							<span
								class={[
									'grid transition-[opacity,scale] duration-200 ease-out-soft',
									copied ? 'scale-75 opacity-0' : 'scale-100 opacity-100'
								]}
							>
								<Icon icon={CopyIcon} size={13} />
							</span>
							<span
								class={[
									'grid text-ok transition-[opacity,scale] duration-200 ease-out-soft',
									copied ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
								]}
							>
								<Icon icon={CheckIcon} size={13} stroke={2} />
							</span>
						</span>
					</button>
				{/if}
			</div>
		</div>
		{#if title}
			<h3
				class="mt-1.5 text-[13.5px] leading-snug font-medium tracking-[-0.005em] text-pretty text-fg"
			>
				{title}
			</h3>
		{/if}
		{#if subtitle}
			<p class="mt-0.5 text-[12px] leading-snug text-fg-3">{subtitle}</p>
		{/if}
	</header>

	{@render children()}
</section>

<style>
	.frame {
		animation: blk-in 420ms var(--ease-out-soft) both;
	}

	.frame :global(.blk-rise) {
		animation: blk-rise 460ms var(--ease-out-soft) both;
		animation-delay: calc(80ms + min(var(--i, 0), 12) * 32ms);
	}

	@keyframes -global-blk-in {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@keyframes -global-blk-rise {
		from {
			opacity: 0;
			transform: translateY(3px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
</style>
