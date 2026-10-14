<script lang="ts">
	/** Vertical process flow: numbered nodes joined by a cyan→violet gradient spine. */
	import BlockFrame from './BlockFrame.svelte';
	import Cite from '#lib/ui/Cite.svelte';
	import { ConnectIcon } from '#lib/ui/icons.ts';
	import { useAsterism } from '#lib/app/context.ts';
	import type { FlowBlock } from './types.ts';
	import { flowMd } from './markdown.ts';
	import { alpha, mix, spotter } from './util.ts';

	interface Props {
		block: FlowBlock;
	}

	let { block }: Props = $props();

	const app = useAsterism();
	const spot = spotter(app);

	const FROM = '#6fe3ff';
	const TO = '#a78bfa';

	const steps = $derived(
		block.steps.map((s, i, all) => ({
			...s,
			key: `${i}:${s.label}`,
			color: mix(FROM, TO, all.length > 1 ? i / (all.length - 1) : 0)
		}))
	);

	let hot = $state<number | null>(null);
</script>

<BlockFrame icon={ConnectIcon} label="Flow" title={block.title} markdown={() => flowMd(block)}>
	{#snippet aside()}
		<span class="font-mono text-[10.5px] text-fg-4">{steps.length} steps</span>
	{/snippet}

	<ol class="flex flex-col">
		{#each steps as s, i (s.key)}
			{@const next = steps[i + 1]}
			<li
				class="blk-rise relative -mx-2 flex gap-3 rounded-md px-2 py-1.5 transition-colors duration-150 ease-out hover:bg-white/[0.035]"
				style:--i={i}
				onpointerenter={() => {
					hot = i;
					spot(s.cites);
				}}
				onpointerleave={() => {
					hot = null;
					spot(null);
				}}
			>
				{#if next}
					<span
						class="pointer-events-none absolute top-[28px] -bottom-[4px] left-[17.5px] w-px"
						style:background="linear-gradient({alpha(s.color, 0.5)}, {alpha(next.color, 0.5)})"
						aria-hidden="true"
					></span>
				{/if}
				<span
					class="relative z-10 grid size-5 shrink-0 place-items-center rounded-full font-mono text-[10px] font-medium transition-[box-shadow,background-color] duration-200 ease-out"
					style:color={s.color}
					style:background-color={alpha(s.color, hot === i ? 0.18 : 0.1)}
					style:box-shadow={hot === i
						? `inset 0 0 0 1px ${alpha(s.color, 0.65)}, 0 0 0 3px ${alpha(s.color, 0.1)}, 0 0 14px ${alpha(s.color, 0.35)}`
						: `inset 0 0 0 1px ${alpha(s.color, 0.4)}`}
				>
					{i + 1}
				</span>
				<div class="min-w-0 flex-1 pt-px">
					<p class="text-[12.5px] leading-[18px] font-medium text-fg">
						{s.label}
						<Cite ids={s.cites} />
					</p>
					{#if s.detail}
						<p class="mt-0.5 text-[12px] leading-[1.5] text-fg-2">{s.detail}</p>
					{/if}
				</div>
			</li>
		{/each}
	</ol>
</BlockFrame>
