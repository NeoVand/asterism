<script lang="ts">
	/** Compact comparison table with tone dots; scrolls horizontally (with fading edges) past 4 columns. */
	import BlockFrame from './BlockFrame.svelte';
	import Cite from '#lib/ui/Cite.svelte';
	import { BlockIcon } from '#lib/ui/icons.ts';
	import { tip } from '#lib/ui/tooltip.ts';
	import { useAsterism } from '#lib/app/context.ts';
	import type { Attachment } from 'svelte/attachments';
	import type { ComparisonBlock } from './types.ts';
	import { comparisonMd } from './markdown.ts';
	import { spotter, TONE_DOT, TONE_LABEL, uniq } from './util.ts';

	interface Props {
		block: ComparisonBlock;
	}

	let { block }: Props = $props();

	const app = useAsterism();
	const spot = spotter(app);

	const n = $derived(block.columns.length);
	const scrolls = $derived(n > 4);
	/** Label column share: wider when there are few columns. */
	const labelWidth = $derived(scrolls ? '108px' : n <= 2 ? '30%' : '25%');
	const minWidth = $derived(scrolls ? `${108 + n * 116}px` : undefined);

	const rows = $derived(
		block.rows.map((r, i) => ({
			key: `${i}:${r.label}`,
			label: r.label,
			cells: block.columns.map((_, c) => r.cells[c] ?? null),
			cites: uniq(r.cells.flatMap((c) => c.cites))
		}))
	);

	let atStart = $state(true);
	let atEnd = $state(true);

	function measure(el: HTMLElement) {
		atStart = el.scrollLeft <= 1;
		atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
	}

	const track: Attachment<HTMLElement> = (el) => {
		measure(el);
		const ro = new ResizeObserver(() => measure(el));
		ro.observe(el);
		return () => ro.disconnect();
	};

	const mask = $derived(
		`linear-gradient(to right, ${atStart ? '#000' : 'transparent'}, #000 24px, #000 calc(100% - 28px), ${atEnd ? '#000' : 'transparent'})`
	);
</script>

<BlockFrame
	icon={BlockIcon}
	label="Comparison"
	title={block.title}
	markdown={() => comparisonMd(block)}
>
	<div
		class={['-mx-1', scrolls && 'overflow-x-auto overscroll-x-contain pb-1']}
		style:mask-image={scrolls ? mask : undefined}
		style:-webkit-mask-image={scrolls ? mask : undefined}
		onscroll={(e) => measure(e.currentTarget)}
		{@attach scrolls ? track : undefined}
	>
		<table class="w-full table-fixed border-collapse text-left" style:min-width={minWidth}>
			<!-- fixed layout: the remaining columns share what is left equally -->
			<colgroup>
				<col style:width={labelWidth} />
			</colgroup>
			<thead>
				<tr class="border-b border-white/[0.06]">
					<th scope="col" class="px-1 pb-2"><span class="sr-only">Item</span></th>
					{#each block.columns as col, c (c)}
						<th
							scope="col"
							class="px-2 pb-2 align-bottom text-[10.5px] leading-tight font-medium tracking-[0.01em] text-fg-3"
						>
							{col}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows as r, i (r.key)}
					<tr
						class="blk-rise border-b border-white/[0.04] transition-colors duration-150 ease-out last:border-b-0 hover:bg-white/[0.035]"
						style:--i={i}
						onpointerenter={() => spot(r.cites)}
						onpointerleave={() => spot(null)}
					>
						<th
							scope="row"
							class="px-1 py-2 align-top text-[12px] leading-[1.45] font-medium text-fg"
						>
							{r.label}
						</th>
						{#each r.cells as cell, c (c)}
							<td class="px-2 py-2 align-top text-[12px] leading-[1.45] text-fg-2">
								{#if cell}
									<span class="flex gap-1.5">
										{#if cell.tone}
											<span
												class="mt-[6px] size-1.5 shrink-0 rounded-full {TONE_DOT[cell.tone]}"
												use:tip={TONE_LABEL[cell.tone]}
											></span>
										{/if}
										<span class="min-w-0 wrap-break-word">
											{cell.text}
											<Cite ids={cell.cites} />
										</span>
									</span>
								{:else}
									<span class="text-fg-4">—</span>
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if block.note}
		<p class="mt-2.5 border-t border-white/[0.05] pt-2.5 text-[11.5px] leading-[1.5] text-fg-3">
			{block.note}
		</p>
	{/if}
</BlockFrame>
