<script lang="ts">
	/** Source list: evidence pill, readable title (2 lines), year, external link. Row click flies to the node. */
	import { untrack } from 'svelte';
	import BlockFrame from './BlockFrame.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { ExternalIcon, SourcesIcon } from '#lib/ui/icons.ts';
	import { tip } from '#lib/ui/tooltip.ts';
	import { useAsterism, type NodeBrief, type NodeDetail } from '#lib/app/context.ts';
	import type { SourcesBlock } from './types.ts';
	import { spotter, uniq } from './util.ts';

	interface Props {
		block: SourcesBlock;
	}

	let { block }: Props = $props();

	const app = useAsterism();
	const spot = spotter(app);

	const ids = $derived(uniq(block.ids));

	/** Plain (non-reactive) promise cache so each id is fetched once per block instance. */
	const cache: Record<string, Promise<NodeDetail | null>> = {};

	function load(id: string): Promise<NodeDetail | null> {
		return (cache[id] ??= app
			? untrack(() => app.detail(id)).catch(() => null)
			: Promise.resolve(null));
	}

	type Evidence = 'Independent' | 'Vendor' | 'Expert opinion';

	const EVIDENCE: Record<Evidence, { short: string; color: string; tip: string }> = {
		Independent: { short: 'Indep.', color: '#4be3a4', tip: 'Independent evidence' },
		Vendor: { short: 'Vendor', color: '#ffb054', tip: 'Vendor material' },
		'Expert opinion': { short: 'Expert', color: '#a78bfa', tip: 'Expert opinion' }
	};

	const EV_SUFFIX = /\s*\b(?:Independent|Vendor|Expert opinion)\b(?:\s*\([^)]*\))?\.?\s*$/;

	/** Turns the graph's "Author (2016) — Title…" label + full citation into a readable title/byline. */
	function describe(d: NodeDetail | null, brief: NodeBrief | null): { title: string; by: string } {
		const label = (d?.label ?? brief?.label ?? '').trim();
		const text = (d?.text ?? '')
			.replace(/https?:\/\/\S+/g, '')
			.replace(/\s+/g, ' ')
			.trim();
		const m = /^(.*?)\s*\((\d{4})\)\s*—\s*(.+)$/.exec(label);
		if (m) {
			let title = m[3].replace(/…\s*$/, '').trim();
			if (title.length >= 12) {
				const at = text.indexOf(title);
				if (at >= 0) {
					const rest = text.slice(at + title.length);
					const end = rest.search(/\.\s|\.$/);
					title += end >= 0 ? rest.slice(0, end) : '';
				} else if (/…\s*$/.test(m[3])) {
					title += '…';
				}
				return { title, by: m[1].trim() };
			}
		}
		const clean = text
			.replace(EV_SUFFIX, '')
			.replace(/\s*\b(?:19|20)\d{2}\.?\s*$/, '')
			.replace(/[.\s]+$/, '');
		return { title: clean || label, by: '' };
	}

	function view(id: string, d: NodeDetail | null, loaded: boolean) {
		const brief = app?.brief(id) ?? null;
		const ev = (d?.evidence ?? null) as Evidence | null;
		return {
			id,
			loaded,
			known: !!(d || brief),
			...describe(d, brief),
			year: d?.year ?? null,
			url: d?.url ?? null,
			onRoad: !!d?.onRoad,
			ev: ev && ev in EVIDENCE ? EVIDENCE[ev] : null
		};
	}

	async function markdown() {
		const list = await Promise.all(
			ids.map(async (id) => {
				const d = await load(id);
				const { title, by } = describe(d, app?.brief(id) ?? null);
				const meta = [d?.evidence, d?.onRoad ? 'on-road' : '', d?.year].filter(Boolean).join(', ');
				const name = d?.url ? `[${title}](${d.url})` : title;
				return `- ${name}${by ? ` — ${by}` : ''}${meta ? ` _(${meta})_` : ''}`;
			})
		);
		return [`### ${block.title}`, '', ...list, ...(block.note ? ['', `_${block.note}_`] : [])].join(
			'\n'
		);
	}
</script>

<BlockFrame icon={SourcesIcon} label="Sources" title={block.title} {markdown}>
	{#snippet aside()}
		<span class="font-mono text-[10.5px] text-fg-4">{ids.length}</span>
	{/snippet}

	<ul class="flex flex-col">
		{#each ids as id, i (id)}
			<li
				class="blk-rise group/src -mx-2 flex items-start rounded-md transition-colors duration-150 ease-out hover:bg-white/[0.035]"
				style:--i={i}
				onpointerenter={() => spot([id])}
				onpointerleave={() => spot(null)}
			>
				{#await load(id)}
					{@render row(view(id, null, false))}
				{:then d}
					{@render row(view(id, d, true))}
				{/await}
			</li>
		{/each}
	</ul>

	{#if block.note}
		<p class="mt-2.5 border-t border-white/[0.05] pt-2.5 text-[11.5px] leading-[1.5] text-fg-3">
			{block.note}
		</p>
	{/if}
</BlockFrame>

{#snippet row(r: ReturnType<typeof view>)}
	<button
		type="button"
		class="flex min-w-0 flex-1 items-start gap-2.5 rounded-md py-1.5 pl-2 text-left focus-visible:ring-1 focus-visible:ring-white/15 focus-visible:outline-none"
		onclick={() => app?.select(r.id)}
	>
		<span class="w-[46px] shrink-0 pt-px">
			{#if !r.loaded}
				<span class="block h-[17px] w-[42px] animate-pulse rounded-[5px] bg-white/[0.05]"></span>
			{:else if r.ev}
				<span
					class="inline-flex h-[17px] items-center rounded-[5px] px-1.5 text-[10px] leading-none font-medium"
					style:color={r.ev.color}
					style:background-color="{r.ev.color}1c"
					style:box-shadow="inset 0 0 0 1px {r.ev.color}2e"
					use:tip={r.ev.tip + (r.onRoad ? ' · on-road vehicles only' : '')}
				>
					{r.ev.short}
				</span>
			{:else}
				<span
					class="inline-flex h-[17px] items-center rounded-[5px] px-1.5 text-[10px] leading-none font-medium text-fg-4 shadow-[inset_0_0_0_1px_rgb(160_175_210/0.12)]"
					use:tip={'No evidence label'}
				>
					n/a
				</span>
			{/if}
		</span>

		<span class="min-w-0 flex-1 text-[12px] leading-[1.45]">
			{#if r.known && r.title}
				<span class="line-clamp-2">
					<span class="text-fg">{r.title}</span>{#if r.by}<span class="text-fg-3">
							· {r.by}</span
						>{/if}
				</span>
			{:else if !r.loaded}
				<span class="flex flex-col gap-1.5 pt-1">
					<span class="h-2 w-[85%] animate-pulse rounded-full bg-white/[0.05]"></span>
					<span class="h-2 w-[55%] animate-pulse rounded-full bg-white/[0.04]"></span>
				</span>
			{:else}
				<span class="text-fg-4">Unknown source <span class="font-mono">{r.id}</span></span>
			{/if}
		</span>

		<span class="flex shrink-0 items-center gap-1.5 pt-px">
			{#if r.onRoad}
				<span
					class="font-mono text-[9.5px] leading-[17px] tracking-[0.06em] text-fg-3 uppercase"
					use:tip={'Evidence from on-road vehicles only'}
				>
					road
				</span>
			{/if}
			<span
				class="min-w-[30px] text-right font-mono text-[11px] leading-[17px] text-fg-3 tabular-nums"
			>
				{r.year ?? ''}
			</span>
		</span>
	</button>

	{#if r.url}
		<!-- external URL, not an app route -->
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a
			href={r.url}
			target="_blank"
			rel="noopener noreferrer"
			class="mt-[3px] mr-1 grid size-6 shrink-0 place-items-center rounded-md text-fg-4 transition-colors duration-150 ease-out group-hover/src:text-fg-3 hover:bg-white/[0.06] hover:text-fg focus-visible:ring-1 focus-visible:ring-white/15 focus-visible:outline-none"
			aria-label="Open source in a new tab"
			use:tip={'Open source'}
		>
			<Icon icon={ExternalIcon} size={12} />
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	{:else}
		<span class="mr-1 w-6 shrink-0" aria-hidden="true"></span>
	{/if}
{/snippet}
