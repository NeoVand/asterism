<script lang="ts">
	/**
	 * Risk register: a 3×3 likelihood × impact heat matrix with a severity mix, then rows sorted
	 * by score. Matrix cells and rows are linked — hovering one lights the other (and the graph).
	 */
	import BlockFrame from './BlockFrame.svelte';
	import Cite from '#lib/ui/Cite.svelte';
	import { AlertIcon } from '#lib/ui/icons.ts';
	import { tip } from '#lib/ui/tooltip.ts';
	import { useAsterism } from '#lib/app/context.ts';
	import type { RisksBlock } from './types.ts';
	import { risksMd, severity } from './markdown.ts';
	import { spotter, uniq } from './util.ts';

	interface Props {
		block: RisksBlock;
	}

	let { block }: Props = $props();

	const app = useAsterism();
	const spot = spotter(app);

	type Sev = 'High' | 'Medium' | 'Low';

	const SEV: Record<Sev, { dot: string; text: string; rgb: string }> = {
		High: { dot: 'bg-bad', text: 'text-bad', rgb: '255 107 129' },
		Medium: { dot: 'bg-warn', text: 'text-warn', rgb: '255 176 84' },
		Low: { dot: 'bg-ok', text: 'text-ok', rgb: '75 227 164' }
	};

	const clamp3 = (v: number) => Math.max(1, Math.min(3, Math.round(v)));

	const risks = $derived(
		block.items
			.map((r, i) => {
				const l = clamp3(r.likelihood);
				const im = clamp3(r.impact);
				return {
					...r,
					l,
					im,
					i,
					key: `${i}:${r.risk}`,
					cell: `${l}-${im}`,
					score: l * im,
					sev: severity(l, im)
				};
			})
			.sort((a, b) => b.score - a.score || b.l - a.l || a.i - b.i)
	);

	/** Matrix cells, rows = likelihood 3→1 (top→bottom), cols = impact 1→3. */
	const cells = $derived(
		[3, 2, 1].flatMap((l) =>
			[1, 2, 3].map((im) => {
				const inCell = risks.filter((r) => r.l === l && r.im === im);
				return {
					key: `${l}-${im}`,
					l,
					im,
					sev: severity(l, im),
					count: inCell.length,
					cites: uniq(inCell.flatMap((r) => r.cites))
				};
			})
		)
	);

	const mix = $derived(
		(['High', 'Medium', 'Low'] as const).map((s) => ({
			sev: s,
			count: risks.filter((r) => r.sev === s).length
		}))
	);

	let hover = $state<string | null>(null);
	let pinned = $state<string | null>(null);
	const hot = $derived(hover ?? pinned);

	function enterCell(c: (typeof cells)[number]) {
		hover = c.key;
		spot(c.cites);
	}

	function enterRow(r: (typeof risks)[number]) {
		hover = r.cell;
		spot(r.cites);
	}

	function leave() {
		hover = null;
		spot(null);
	}
</script>

<BlockFrame icon={AlertIcon} label="Risks" title={block.title} markdown={() => risksMd(block)}>
	{#snippet aside()}
		<span class="font-mono text-[10.5px] text-fg-4">
			{risks.length}
			{risks.length === 1 ? 'risk' : 'risks'}
		</span>
	{/snippet}

	<!-- summary: heat matrix + severity mix -->
	<div
		class="mb-2.5 flex items-center gap-4 rounded-lg border border-white/[0.04] bg-black/20 px-3 py-2.5"
	>
		<div class="flex shrink-0 items-start gap-1">
			<span
				class="pt-px font-mono text-[9px] leading-none text-fg-4"
				use:tip={'Likelihood (rows, high at top)'}>L↑</span
			>
			<div>
				<div class="grid grid-cols-3 gap-[3px]">
					{#each cells as c (c.key)}
						<button
							type="button"
							class={[
								'grid size-4 place-items-center rounded-[4px] font-mono text-[9.5px] leading-none font-medium transition-[box-shadow,background-color,opacity] duration-150 ease-out focus-visible:outline-none',
								c.count ? SEV[c.sev].text : 'text-transparent',
								c.count === 0 && 'cursor-default'
							]}
							style:background-color="rgb({SEV[c.sev].rgb} / {c.count ? 0.2 : 0.055})"
							style:box-shadow={hot === c.key
								? `inset 0 0 0 1px rgb(${SEV[c.sev].rgb} / 0.85), 0 0 10px rgb(${SEV[c.sev].rgb} / 0.45)`
								: c.count
									? `inset 0 0 0 1px rgb(${SEV[c.sev].rgb} / 0.32)`
									: 'none'}
							style:opacity={hot && hot !== c.key ? 0.55 : 1}
							aria-label="Likelihood {c.l}, impact {c.im}: {c.count} {c.count === 1
								? 'risk'
								: 'risks'}"
							aria-pressed={pinned === c.key}
							disabled={c.count === 0}
							use:tip={`Likelihood ${c.l} × impact ${c.im} · ${c.count} ${c.count === 1 ? 'risk' : 'risks'}`}
							onpointerenter={() => enterCell(c)}
							onpointerleave={leave}
							onclick={() => (pinned = pinned === c.key ? null : c.key)}
						>
							{c.count || ''}
						</button>
					{/each}
				</div>
				<div
					class="mt-1 text-right font-mono text-[9px] leading-none text-fg-4"
					use:tip={'Impact (columns, high at right)'}
				>
					I→
				</div>
			</div>
		</div>

		<div class="min-w-0 flex-1">
			<div class="flex items-baseline justify-between">
				<span class="text-[11px] text-fg-2">Severity mix</span>
				<span class="font-mono text-[10.5px] text-fg-4">L × I</span>
			</div>
			<div class="segbar mt-2 flex h-[5px] gap-[2px] overflow-hidden rounded-full">
				{#each mix as s (s.sev)}
					{#if s.count}
						<span class="h-full {SEV[s.sev].dot}" style:flex-grow={s.count} style:opacity="0.85"
						></span>
					{/if}
				{/each}
			</div>
			<div class="mt-2 flex gap-3.5">
				{#each mix as s (s.sev)}
					<span
						class={['flex items-center gap-1.5 text-[11px]', s.count ? 'text-fg-2' : 'text-fg-4']}
					>
						<span class="size-1.5 rounded-full {SEV[s.sev].dot}" style:opacity={s.count ? 1 : 0.35}
						></span>
						{s.sev}
						<span class="font-mono text-fg-3 tabular-nums">{s.count}</span>
					</span>
				{/each}
			</div>
		</div>
	</div>

	<ul class="flex flex-col">
		{#each risks as r, i (r.key)}
			<li
				class={[
					'blk-rise -mx-2 flex gap-2.5 rounded-md px-2 py-2 transition-[background-color,opacity] duration-150 ease-out hover:bg-white/[0.035]',
					hot && hot !== r.cell ? 'opacity-40' : 'opacity-100'
				]}
				style:--i={i}
				onpointerenter={() => enterRow(r)}
				onpointerleave={leave}
			>
				<!-- mini heat: lit dot at (likelihood, impact) -->
				<span
					class="mt-[3px] grid shrink-0 grid-cols-3 gap-[2px] self-start"
					use:tip={`${r.sev} · likelihood ${r.l}/3, impact ${r.im}/3`}
				>
					{#each cells as c (c.key)}
						<span
							class={[
								'size-1 rounded-[1px]',
								c.key === r.cell ? SEV[r.sev].dot : 'bg-white/[0.09]'
							]}
							style:box-shadow={c.key === r.cell
								? `0 0 6px rgb(${SEV[r.sev].rgb} / 0.7)`
								: undefined}
						></span>
					{/each}
					<span class="sr-only">{r.sev} severity</span>
				</span>

				<div class="min-w-0 flex-1">
					<p class="text-[12.5px] leading-[1.45] text-fg">
						{r.risk}
						<Cite ids={r.cites} />
					</p>
					<p class="mt-1 flex gap-1.5 text-[12px] leading-[1.5] text-fg-2">
						<span class="shrink-0 text-fg-4" aria-hidden="true">→</span>
						<span class="min-w-0">{r.mitigation}</span>
					</p>
				</div>
			</li>
		{/each}
	</ul>
</BlockFrame>

<style>
	.segbar {
		animation: seg-in 720ms var(--ease-out-soft) both;
		animation-delay: 160ms;
	}

	@keyframes seg-in {
		from {
			clip-path: inset(0 100% 0 0 round 999px);
		}
		to {
			clip-path: inset(0 0 0 0 round 999px);
		}
	}
</style>
