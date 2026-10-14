<script lang="ts">
	/** Phased plan: a mini gantt strip over a collapsible, color-coded phase list with gates. */
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import BlockFrame from './BlockFrame.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import Cite from '#lib/ui/Cite.svelte';
	import { ChevronRightIcon, FlagIcon, PlanIcon } from '#lib/ui/icons.ts';
	import { tip } from '#lib/ui/tooltip.ts';
	import { useAsterism } from '#lib/app/context.ts';
	import type { PlanBlock } from './types.ts';
	import { planMd } from './markdown.ts';
	import {
		alpha,
		monthIndex,
		parseDate,
		seqColor,
		spotter,
		tickLabel,
		TODAY_LABEL,
		TODAY_MONTH,
		uniq
	} from './util.ts';

	interface Props {
		block: PlanBlock;
	}

	let { block }: Props = $props();

	const app = useAsterism();
	const spot = spotter(app);

	const PREFIX = /^(?:phase|stage|step)\s*(\d+)\s*[·:—–-]\s*(.+)$/i;

	const phases = $derived(
		block.phases.map((p, i) => {
			const m = PREFIX.exec(p.name.trim());
			const s = parseDate(p.start);
			const e = parseDate(p.end);
			return {
				...p,
				key: `${i}:${p.name}`,
				num: m ? m[1] : String(i + 1),
				title: m ? m[2] : p.name,
				color: seqColor(i),
				s: s ? monthIndex(s) : null,
				e: e ? monthIndex(e) : null,
				cites: uniq([...p.items.flatMap((it) => it.cites), ...(p.gate?.cites ?? [])])
			};
		})
	);

	/** Month axis for the gantt strip (null when no phase is dated). */
	const axis = $derived.by(() => {
		const dated = phases.filter((p) => p.s != null && p.e != null);
		if (!dated.length) return null;
		const min = Math.min(...dated.map((p) => p.s!));
		const max = Math.max(...dated.map((p) => Math.max(p.s!, p.e!)));
		const span = max + 1 - min;
		const step = [1, 2, 3, 6, 12].find((s) => span / s <= 6) ?? 12;
		const pct = (m: number) => ((m - min) / span) * 100;

		const ticks: { m: number; x: number; label: string }[] = [];
		for (let m = min; m <= max; m++) {
			if ((m % 12) % step !== 0 && m !== min) continue;
			if (m !== min && pct(m) - (ticks.at(-1)?.x ?? -100) < 12) continue;
			ticks.push({ m, x: pct(m), label: tickLabel(m, m === min || m % 12 === 0) });
		}

		const today = TODAY_MONTH >= min && TODAY_MONTH <= max + 1 ? pct(TODAY_MONTH) : null;
		const bars = phases.map((p) =>
			p.s != null && p.e != null
				? { left: pct(p.s), width: ((Math.max(p.e, p.s) + 1 - p.s) / span) * 100 }
				: null
		);
		return { span, ticks, today, bars };
	});

	/** Explicit toggles; untouched phases fall back to "first two open". */
	let toggled = $state<Record<string, boolean>>({});
	const isOpen = (key: string, i: number) => toggled[key] ?? i < 2;
	const toggle = (key: string, i: number) => (toggled[key] = !isOpen(key, i));

	let hot = $state<number | null>(null);

	function enter(i: number) {
		hot = i;
		spot(phases[i].cites);
	}

	function leave() {
		hot = null;
		spot(null);
	}

	const spanLabel = $derived(axis ? `${axis.span} mo` : '');
</script>

<BlockFrame
	icon={PlanIcon}
	label="Plan"
	title={block.title}
	subtitle={block.subtitle}
	markdown={() => planMd(block)}
>
	{#snippet aside()}
		<span class="font-mono text-[10.5px] text-fg-4">
			{phases.length}
			{phases.length === 1 ? 'phase' : 'phases'}{spanLabel ? ` · ${spanLabel}` : ''}
		</span>
	{/snippet}

	{#if axis}
		<div class="mb-3 rounded-lg border border-white/[0.04] bg-black/20 px-3 pt-2.5 pb-2">
			<div class="relative">
				<!-- month gridlines -->
				{#each axis.ticks as t (t.m)}
					<span class="absolute -top-1 -bottom-1 w-px bg-white/[0.045]" style:left="{t.x}%"></span>
				{/each}
				{#if axis.today != null}
					<span
						class="absolute -top-1.5 -bottom-1 z-10 w-px bg-gold/70 before:absolute before:inset-y-0 before:-left-1.5 before:w-3.5 before:content-['']"
						style:left="{axis.today}%"
						use:tip={`Today · ${TODAY_LABEL}`}
					>
						<span
							class="absolute -top-[3px] -left-[2px] size-[5px] rounded-full bg-gold shadow-[0_0_8px_rgb(255_201_107/0.7)]"
						></span>
					</span>
				{/if}

				<!-- one lane per phase -->
				<div class="relative flex flex-col gap-[5px]">
					{#each phases as p, i (p.key)}
						{@const bar = axis.bars[i]}
						<div class="relative h-[6px]">
							{#if bar}
								<button
									type="button"
									class="bar absolute inset-y-0 rounded-full transition-[opacity,box-shadow] duration-150 ease-out focus-visible:outline-none"
									style:left="{bar.left}%"
									style:width="max(6px, calc({bar.width}% - 2px))"
									style:background="linear-gradient(90deg, {p.color}, {alpha(p.color, 0.72)})"
									style:box-shadow={hot === i
										? `0 0 0 2px ${alpha(p.color, 0.18)}, 0 0 12px ${alpha(p.color, 0.45)}`
										: 'none'}
									style:opacity={hot == null || hot === i ? 1 : 0.28}
									style:--i={i}
									aria-label="{p.name}, {p.window}"
									use:tip={`${p.name} · ${p.window}`}
									onpointerenter={() => enter(i)}
									onpointerleave={leave}
									onclick={() => toggle(p.key, i)}
								></button>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- tick labels -->
			<div class="relative mt-2 h-3">
				{#each axis.ticks as t (t.m)}
					<span
						class="absolute top-0 font-mono text-[10px] leading-3 whitespace-nowrap text-fg-3"
						style:left="{t.x}%"
						style:transform={t.x < 4 ? 'none' : t.x > 90 ? 'translateX(-100%)' : 'translateX(-50%)'}
					>
						{t.label}
					</span>
				{/each}
			</div>
		</div>
	{/if}

	<ol class="flex flex-col">
		{#each phases as p, i (p.key)}
			{@const open = isOpen(p.key, i)}
			{@const next = phases[i + 1]}
			<li class="blk-rise relative" style:--i={i}>
				{#if next}
					<span
						class="pointer-events-none absolute top-[29px] -bottom-[5px] left-[9.5px] w-px"
						style:background="linear-gradient({alpha(p.color, 0.38)}, {alpha(next.color, 0.38)})"
						aria-hidden="true"
					></span>
				{/if}

				<button
					type="button"
					class={[
						'group/ph relative -mx-1.5 flex w-[calc(100%+12px)] items-start gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors duration-150 ease-out focus-visible:ring-1 focus-visible:ring-white/15 focus-visible:outline-none',
						hot === i ? 'bg-white/[0.035]' : 'hover:bg-white/[0.035]'
					]}
					aria-expanded={open}
					onpointerenter={() => enter(i)}
					onpointerleave={leave}
					onclick={() => toggle(p.key, i)}
				>
					<span
						class="relative z-10 mt-px grid size-5 shrink-0 place-items-center rounded-full font-mono text-[10px] font-medium transition-[box-shadow,background-color] duration-200 ease-out"
						style:color={p.color}
						style:background-color={alpha(p.color, open ? 0.16 : 0.09)}
						style:box-shadow={hot === i
							? `inset 0 0 0 1px ${alpha(p.color, 0.6)}, 0 0 0 3px ${alpha(p.color, 0.1)}, 0 0 14px ${alpha(p.color, 0.35)}`
							: `inset 0 0 0 1px ${alpha(p.color, 0.38)}`}
					>
						{p.num}
					</span>
					<span class="min-w-0 flex-1">
						<span class="flex items-baseline gap-2">
							<span class="min-w-0 text-[12.5px] leading-[1.45] font-medium text-fg">{p.title}</span
							>
							<span class="ml-auto shrink-0 font-mono text-[10.5px] text-fg-3">{p.window}</span>
						</span>
						<span class="mt-0.5 block text-[12px] leading-[1.5] text-fg-2">{p.goal}</span>
					</span>
					<span
						class={[
							'mt-[3px] shrink-0 text-fg-4 transition-[rotate,color] duration-200 ease-out-soft group-hover/ph:text-fg-3',
							open ? 'rotate-90' : 'rotate-0'
						]}
					>
						<Icon icon={ChevronRightIcon} size={13} />
					</span>
				</button>

				{#if open && (p.items.length || p.gate)}
					<div class="pl-[30px]" transition:slide={{ duration: 260, easing: cubicOut }}>
						<ul class="pt-0.5 pb-2">
							{#each p.items as it, j (j)}
								<li
									class="-mx-1.5 flex gap-2 rounded-md px-1.5 py-[3px] transition-colors duration-150 ease-out hover:bg-white/[0.035]"
									onpointerenter={() => spot(it.cites)}
									onpointerleave={() => spot(null)}
								>
									<span
										class="mt-[7.5px] size-1 shrink-0 rounded-full"
										style:background-color={alpha(p.color, 0.75)}
									></span>
									<span class="min-w-0 text-[12px] leading-[1.5] text-fg-2">
										{it.text}
										<Cite ids={it.cites} />
									</span>
								</li>
							{/each}
						</ul>

						{#if p.gate}
							<div
								role="group"
								aria-label="Gate: {p.gate.name}"
								class="mb-2.5 flex gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-1.5 transition-colors duration-150 ease-out hover:bg-white/[0.04]"
								onpointerenter={() => spot(p.gate?.cites)}
								onpointerleave={() => spot(null)}
							>
								<span class="mt-[2px] shrink-0" style:color={p.color}>
									<Icon icon={FlagIcon} size={12} stroke={1.8} />
								</span>
								<p class="min-w-0 text-[12px] leading-[1.5]">
									<span class="text-[10px] font-medium tracking-[0.09em] text-fg-3 uppercase"
										>Gate</span
									>
									<span class="text-fg-4">·</span>
									<span class="font-medium text-fg">{p.gate.name}</span>
									<span class="text-fg-4">—</span>
									<span class="text-fg-2">{p.gate.criteria}</span>
									<Cite ids={p.gate.cites} />
								</p>
							</div>
						{/if}
					</div>
				{/if}
			</li>
		{/each}
	</ol>
</BlockFrame>

<style>
	.bar {
		transform-origin: left center;
		animation: bar-grow 700ms var(--ease-out-soft) both;
		animation-delay: calc(120ms + var(--i, 0) * 70ms);
	}

	@keyframes bar-grow {
		from {
			transform: scaleX(0);
		}
		to {
			transform: scaleX(1);
		}
	}
</style>
