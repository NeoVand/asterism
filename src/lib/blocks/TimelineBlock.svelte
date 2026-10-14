<script lang="ts">
	/** Vertical timeline: mono dates, a quiet rail with kind-colored dots, and a gold "today" tick. */
	import BlockFrame from './BlockFrame.svelte';
	import Cite from '#lib/ui/Cite.svelte';
	import { CalendarIcon } from '#lib/ui/icons.ts';
	import { tip } from '#lib/ui/tooltip.ts';
	import { useAsterism } from '#lib/app/context.ts';
	import type { TimelineBlock } from './types.ts';
	import { timelineMd } from './markdown.ts';
	import {
		dayValue,
		formatDate,
		monthIndex,
		parseDate,
		spotter,
		TODAY,
		TODAY_LABEL,
		TODAY_VALUE
	} from './util.ts';

	interface Props {
		block: TimelineBlock;
	}

	let { block }: Props = $props();

	const app = useAsterism();
	const spot = spotter(app);

	type Kind = 'deadline' | 'milestone' | 'event' | 'risk';

	const KIND_LABEL: Record<Kind, string> = {
		deadline: 'Deadline',
		milestone: 'Milestone',
		event: 'Event',
		risk: 'Risk'
	};

	const events = $derived(
		block.events.map((e, i) => {
			const when = parseDate(e.date);
			return {
				...e,
				key: `${i}:${e.date}`,
				kind: (e.kind ?? 'event') as Kind,
				when,
				value: when ? dayValue(when) : null,
				shown: formatDate(e.date)
			};
		})
	);

	/** Where to slot the "today" row, or -1 when no dated event is within ±18 months. */
	const todayAt = $derived.by(() => {
		const now = monthIndex(TODAY);
		const near = events.some((e) => e.when && Math.abs(monthIndex(e.when) - now) <= 18);
		if (!near) return -1;
		const after = events.findIndex((e) => e.value != null && e.value > TODAY_VALUE);
		if (after >= 0) return after;
		const lastDated = events.findLastIndex((e) => e.value != null);
		return lastDated + 1;
	});
</script>

<BlockFrame
	icon={CalendarIcon}
	label="Timeline"
	title={block.title}
	markdown={() => timelineMd(block)}
>
	{#snippet aside()}
		<span class="font-mono text-[10.5px] text-fg-4">
			{events.length}
			{events.length === 1 ? 'event' : 'events'}
		</span>
	{/snippet}

	<ol class="relative">
		<!-- the rail -->
		<span
			class="rail pointer-events-none absolute top-[11px] bottom-1 left-[92.5px] w-px"
			aria-hidden="true"
		></span>

		{#each events as e, i (e.key)}
			{#if i === todayAt}
				{@render today(i)}
			{/if}
			<li
				class="blk-rise relative -mx-2 grid grid-cols-[76px_14px_minmax(0,1fr)] gap-x-2.5 rounded-md px-2 py-1.5 transition-colors duration-150 ease-out hover:bg-white/[0.035]"
				style:--i={i}
				onpointerenter={() => spot(e.cites)}
				onpointerleave={() => spot(null)}
			>
				<span
					class={[
						'pt-px text-right font-mono text-[11px] leading-[18px] tabular-nums',
						e.kind === 'deadline' ? 'text-bad/90' : 'text-fg-3'
					]}
				>
					{e.shown}
				</span>
				<span class="relative flex justify-center pt-[5px]" use:tip={KIND_LABEL[e.kind]}>
					<span class="dot {e.kind}"></span>
					<span class="sr-only">{KIND_LABEL[e.kind]}</span>
				</span>
				<span class="min-w-0">
					<span class="block text-[12.5px] leading-[18px] text-fg">
						{e.label}
						<Cite ids={e.cites} />
					</span>
					{#if e.detail}
						<span class="mt-0.5 block text-[12px] leading-[1.5] text-fg-2">{e.detail}</span>
					{/if}
				</span>
			</li>
		{/each}
		{#if todayAt === events.length}
			{@render today(events.length)}
		{/if}
	</ol>
</BlockFrame>

{#snippet today(i: number)}
	<li
		class="blk-rise relative -mx-2 grid grid-cols-[76px_14px_minmax(0,1fr)] items-center gap-x-2.5 px-2 py-1"
		style:--i={i}
		aria-label="Today, {TODAY_LABEL}"
	>
		<span class="text-right font-mono text-[10.5px] leading-4 text-gold tabular-nums"
			>{TODAY_LABEL}</span
		>
		<span class="flex justify-center">
			<span class="h-[1.5px] w-3 rounded-full bg-gold shadow-[0_0_8px_rgb(255_201_107/0.65)]"
			></span>
		</span>
		<span class="flex items-center gap-2">
			<span class="text-[10px] leading-4 font-medium tracking-[0.1em] text-gold/80 uppercase"
				>Today</span
			>
			<span class="h-px flex-1 bg-linear-to-r from-gold/25 to-transparent"></span>
		</span>
	</li>
{/snippet}

<style>
	.rail {
		background: linear-gradient(
			to bottom,
			rgb(160 175 210 / 0.14),
			rgb(160 175 210 / 0.1) calc(100% - 28px),
			transparent
		);
	}

	.dot {
		position: relative;
		z-index: 1;
		display: block;
		width: 7px;
		height: 7px;
		border-radius: 999px;
	}

	.dot.event {
		width: 6px;
		height: 6px;
		margin-top: 0.5px;
		background: var(--color-fg-3);
	}

	.dot.milestone {
		background: var(--color-glow);
		box-shadow:
			0 0 0 3px rgb(111 227 255 / 0.13),
			0 0 10px rgb(111 227 255 / 0.4);
	}

	.dot.deadline {
		width: 8px;
		height: 8px;
		margin-top: -0.5px;
		background: var(--color-bad);
		box-shadow:
			0 0 0 3px rgb(255 107 129 / 0.16),
			0 0 14px rgb(255 107 129 / 0.55);
	}

	.dot.risk {
		width: 7px;
		height: 7px;
		border-radius: 1.5px;
		rotate: 45deg;
		background: var(--color-warn);
		box-shadow:
			0 0 0 2.5px rgb(255 176 84 / 0.14),
			0 0 10px rgb(255 176 84 / 0.4);
	}
</style>
