<script lang="ts">
	/** Stat tiles on a regular grid: big mono value (unit set small), label, detail, cites. */
	import BlockFrame from './BlockFrame.svelte';
	import Cite from '#lib/ui/Cite.svelte';
	import { TargetIcon } from '#lib/ui/icons.ts';
	import { useAsterism } from '#lib/app/context.ts';
	import type { MetricsBlock } from './types.ts';
	import { metricsMd } from './markdown.ts';
	import { spotter, TONE_TEXT } from './util.ts';

	interface Props {
		block: MetricsBlock;
	}

	let { block }: Props = $props();

	const app = useAsterism();
	const spot = spotter(app);

	const count = $derived(block.items.length);
	const cols = $derived(count === 1 ? 1 : count === 3 || count >= 5 ? 3 : 2);

	/** "3–15 km/h" → { num: "3–15", unit: "km/h" }; leaves words and dates alone. */
	function split(value: string): { num: string; unit: string } {
		const m = /^([^\s]*\d[^\s]*)\s+([^\d]{1,10})$/.exec(value.trim());
		return m ? { num: m[1], unit: m[2] } : { num: value, unit: '' };
	}

	const items = $derived(
		block.items.map((it, i) => {
			const { num, unit } = split(it.value);
			const long = num.length > (cols === 3 ? 5 : 8);
			return { ...it, key: `${i}:${it.label}`, num, unit, long };
		})
	);
</script>

<BlockFrame icon={TargetIcon} label="Metrics" title={block.title} markdown={() => metricsMd(block)}>
	<div
		class={[
			'grid gap-1.5',
			cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-2' : 'grid-cols-3'
		]}
	>
		{#each items as m, i (m.key)}
			<div
				role="group"
				aria-label={m.label}
				class="blk-rise flex min-w-0 flex-col rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 pt-2.5 pb-3 transition-colors duration-150 ease-out hover:bg-white/[0.04]"
				style:--i={i}
				onpointerenter={() => spot(m.cites)}
				onpointerleave={() => spot(null)}
			>
				<div class="flex items-start gap-1.5">
					<span
						class={[
							'min-w-0 font-mono leading-[1.15] font-medium tracking-[-0.02em] wrap-break-word tabular-nums',
							m.long ? 'text-[16px]' : 'text-[20px]',
							m.tone ? TONE_TEXT[m.tone] : 'text-fg'
						]}
					>
						{m.num}{#if m.unit}<span
								class="ml-1 text-[11.5px] font-normal tracking-normal text-fg-3">{m.unit}</span
							>{/if}
					</span>
					<span class="ml-auto shrink-0 pt-0.5"><Cite ids={m.cites} /></span>
				</div>
				<span class="mt-1.5 text-[11.5px] leading-[1.4] text-fg-2">{m.label}</span>
				{#if m.detail}
					<span class="mt-1 text-[11px] leading-[1.45] text-fg-3">{m.detail}</span>
				{/if}
			</div>
		{/each}
	</div>
</BlockFrame>
