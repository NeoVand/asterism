<script lang="ts">
	/** Detail card for the selected star: what it says, where, its evidence and its links. */
	import { fly } from 'svelte/transition';
	import Icon from '#lib/ui/Icon.svelte';
	import {
		CloseIcon,
		ExternalIcon,
		QuoteIcon,
		SparklesIcon,
		ConnectIcon,
		FactIcon,
		SourceIcon,
		TermIcon,
		EntityIcon,
		SectionIcon,
		ChapterIcon
	} from '#lib/ui/icons.ts';
	import { tip } from '#lib/ui/tooltip.ts';
	import { useAsterism, provideCiteNumbering, type NodeDetail } from '#lib/app/context.ts';
	import { renderMarkdown } from '#lib/chat/markdown.ts';
	import { TOPIC_COLORS, TYPE_LABEL } from './palette.ts';
	import { TOPICS } from '#lib/kg/types.ts';

	interface Props {
		id: string;
		onclose: () => void;
		onneighbors: (id: string) => void;
	}

	let { id, onclose, onneighbors }: Props = $props();
	const app = useAsterism();
	let detail = $state<NodeDetail | null>(null);
	let loading = $state(true);

	$effect(() => {
		const current = id;
		loading = true;
		app.detail(current).then((d) => {
			if (current === id) {
				detail = d;
				loading = false;
			}
		});
	});

	const synOrder: string[] = [];
	provideCiteNumbering({
		number: (x) => {
			if (!synOrder.includes(x)) synOrder.push(x);
			return synOrder.indexOf(x) + 1;
		}
	});

	const TYPE_ICON = { fact: FactIcon, source: SourceIcon, term: TermIcon, entity: EntityIcon, section: SectionIcon, chapter: ChapterIcon, doc: ChapterIcon };
	const REL: Record<string, string> = {
		same: 'Restated in',
		supports: 'Supports',
		contradicts: 'In tension with',
		elaborates: 'Elaborated by',
		depends: 'Depends on'
	};

	const color = $derived(TOPIC_COLORS[detail?.topic ?? 0]);
	const factCount = $derived((detail?.counts.uses ?? 0) + (detail?.counts.about ?? 0) + (detail?.counts.states ?? 0));

	function askText(d: NodeDetail) {
		if (d.type === 'fact') return `Explain this finding and connect it to what other chapters say: “${d.text}”`;
		if (d.type === 'source') return `What does the research take from this source, and how strong is it? ${d.label}`;
		if (d.type === 'term') return `Explain ${d.label} in plain words and what the booklet concluded about it.`;
		return `What does the research say about ${d.label} across chapters?`;
	}

	function synopsisHtml(text: string) {
		return renderMarkdown(text, {
			streaming: false,
			number: (x) => {
				if (!synOrder.includes(x)) synOrder.push(x);
				return synOrder.indexOf(x) + 1;
			},
			brief: (x) => app.brief(x)
		});
	}

	function citeFrom(e: Event) {
		return (e.target as HTMLElement | null)?.closest?.('.cite-chip') as HTMLElement | null;
	}
</script>

<div
	class="glass-strong pointer-events-auto flex max-h-full w-[360px] flex-col overflow-hidden rounded-2xl"
	in:fly={{ x: -14, duration: 260 }}
	out:fly={{ x: -10, duration: 160 }}
>
	<div class="flex items-center gap-2 px-4 pt-3.5 pb-2">
		{#if detail}
			<span class="flex size-6 items-center justify-center rounded-md" style:background="{color}22" style:color>
				<Icon icon={TYPE_ICON[detail.type] ?? FactIcon} size={13} />
			</span>
			<span class="text-[11px] tracking-wide text-fg-3 uppercase">{TYPE_LABEL[detail.type]}</span>
			<span class="text-[11px] text-fg-4">·</span>
			<span class="truncate text-[11px]" style:color>{TOPICS[detail.topic]?.name}</span>
		{/if}
		<button type="button" class="ml-auto rounded-md p-1 text-fg-3 hover:bg-white/[0.06] hover:text-fg" onclick={onclose} aria-label="Close">
			<Icon icon={CloseIcon} size={14} />
		</button>
	</div>

	{#if loading && !detail}
		<div class="space-y-2 px-4 pb-4">
			<div class="h-4 w-3/4 animate-pulse rounded bg-white/[0.06]"></div>
			<div class="h-4 w-1/2 animate-pulse rounded bg-white/[0.04]"></div>
		</div>
	{:else if detail}
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			class="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 pb-4"
			onpointerover={(e) => {
				const c = citeFrom(e);
				if (c?.dataset.id) app.spotlight([c.dataset.id]);
			}}
			onpointerout={(e) => {
				if (citeFrom(e)) app.spotlight(null);
			}}
			onclick={(e) => {
				const c = citeFrom(e);
				if (c?.dataset.id) app.select(c.dataset.id);
			}}
		>
			<div>
				<h3 class="text-[14px] leading-snug font-medium text-fg">
					{detail.type === 'fact' ? detail.text : detail.label}
				</h3>
				{#if detail.type === 'term' || detail.type === 'source'}
					<p class="mt-1.5 text-[12.5px] leading-relaxed text-fg-2">{detail.text}</p>
				{/if}
				{#if detail.aliases?.length}
					<p class="mt-1.5 text-[11px] text-fg-3">Also: {detail.aliases.slice(0, 6).join(' · ')}</p>
				{/if}
			</div>

			<div class="flex flex-wrap items-center gap-1.5 text-[10.5px]">
				{#if detail.where}<span class="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-fg-3">{detail.where}</span>{/if}
				{#if detail.kind}<span class="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-fg-3">{detail.kind}</span>{/if}
				{#if detail.evidence}
					<span
						class="rounded-md px-1.5 py-0.5 {detail.evidence === 'Independent'
							? 'bg-ok/10 text-ok'
							: detail.evidence === 'Vendor'
								? 'bg-warn/10 text-warn'
								: 'bg-[#a78bfa]/12 text-[#c4b5fd]'}"
						use:tip={'Evidence label from the booklet'}>{detail.evidence}</span
					>
				{/if}
				{#if detail.onRoad}<span class="rounded-md bg-[#5b9dff]/12 px-1.5 py-0.5 text-[#93bbff]" use:tip={'Proven only for road vehicles'}>on-road evidence</span>{/if}
				{#if detail.year}<span class="font-mono text-fg-4">{detail.year}</span>{/if}
			</div>

			{#if detail.quote}
				<div class="flex gap-2 rounded-lg bg-white/[0.025] px-3 py-2 text-[12px] leading-relaxed text-fg-2">
					<Icon icon={QuoteIcon} size={13} class="mt-0.5 shrink-0 text-fg-4" />
					<span>{detail.quote}</span>
				</div>
			{/if}

			{#if detail.synopsis}
				<div class="space-y-1">
					<div class="text-[10.5px] tracking-wide text-fg-4 uppercase">Across the research</div>
					<div class="prose-asterism text-[12.5px]! leading-relaxed">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized markdown -->
						{@html synopsisHtml(detail.synopsis)}
					</div>
				</div>
			{/if}

			{#if (detail.type === 'term' || detail.type === 'entity') && factCount}
				<div class="text-[11.5px] text-fg-3">Linked to {factCount.toLocaleString()} facts.</div>
			{/if}

			{#if detail.sources.length}
				<div class="space-y-1">
					<div class="text-[10.5px] tracking-wide text-fg-4 uppercase">Sources</div>
					{#each detail.sources as s (s.id)}
						<div class="group flex items-start gap-2 rounded-lg px-1.5 py-1 hover:bg-white/[0.035]">
							<button type="button" class="min-w-0 flex-1 text-left text-[12px] leading-snug text-fg-2 group-hover:text-fg" onclick={() => app.select(s.id)}>
								{s.label}
								<span class="ml-1 text-[10.5px] {s.evidence === 'Independent' ? 'text-ok/80' : s.evidence === 'Vendor' ? 'text-warn/80' : 'text-[#c4b5fd]/80'}">{s.evidence ?? ''}{s.onRoad ? ' · on-road' : ''}</span>
							</button>
							{#if s.url}
								<a href={s.url} target="_blank" rel="noreferrer" class="mt-0.5 shrink-0 text-fg-4 hover:text-glow" aria-label="Open source">
									<Icon icon={ExternalIcon} size={13} />
								</a>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			{#if detail.url && detail.type === 'source'}
				<a href={detail.url} target="_blank" rel="noreferrer" class="inline-flex items-center gap-1.5 text-[12px] text-glow hover:underline">
					Open source <Icon icon={ExternalIcon} size={12} />
				</a>
			{/if}

			{#if detail.linked.length}
				<div class="space-y-1">
					<div class="text-[10.5px] tracking-wide text-fg-4 uppercase">Connected elsewhere</div>
					{#each detail.linked as l, i (`${i}:${l.id}`)}
						<button
							type="button"
							class="flex w-full items-start gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-white/[0.035]"
							onpointerenter={() => app.spotlight([l.id])}
							onpointerleave={() => app.spotlight(null)}
							onclick={() => app.select(l.id)}
						>
							<span class="mt-[5px] size-1.5 shrink-0 rounded-full" style:background={TOPIC_COLORS[l.topic]}></span>
							<span class="min-w-0 text-[12px] leading-snug text-fg-2">
								<span class="text-fg-4">{REL[l.rel] ?? l.rel}{l.chapter > 0 ? ` Ch ${l.chapter}` : ''} · </span>{l.label}
							</span>
						</button>
					{/each}
				</div>
			{/if}

			{#if detail.concepts.length || detail.entities.length}
				<div class="flex flex-wrap gap-1">
					{#each [...detail.concepts, ...detail.entities] as c (c.id)}
						<button
							type="button"
							class="max-w-full truncate rounded-md border border-white/[0.07] px-1.5 py-0.5 text-[11px] text-fg-2 transition-colors hover:border-white/20 hover:text-fg"
							onpointerenter={() => app.spotlight([c.id])}
							onpointerleave={() => app.spotlight(null)}
							onclick={() => app.select(c.id)}
						>
							<span class="mr-1 inline-block size-1.5 rounded-full align-middle" style:background={TOPIC_COLORS[c.topic]}></span>{c.label.replace(/\s*\(.*\)$/, '')}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex items-center gap-1.5 border-t border-white/[0.05] px-3 py-2.5">
			<button
				type="button"
				class="flex items-center gap-1.5 rounded-lg bg-glow/12 px-2.5 py-1.5 text-[12px] text-glow transition-colors hover:bg-glow/20"
				onclick={() => app.ask(askText(detail!))}
			>
				<Icon icon={SparklesIcon} size={13} /> Ask about this
			</button>
			<button
				type="button"
				class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-fg-3 transition-colors hover:bg-white/[0.05] hover:text-fg"
				onclick={() => onneighbors(detail!.id)}
			>
				<Icon icon={ConnectIcon} size={13} /> Light neighbors
				<span class="font-mono text-[10.5px] text-fg-4">{detail.degree}</span>
			</button>
		</div>
	{/if}
</div>
