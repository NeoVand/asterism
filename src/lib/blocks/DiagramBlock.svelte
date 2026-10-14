<script lang="ts">
	/** One of the documents' own diagrams, drawn in the chat; opens full size or in the reader. */
	import BlockFrame from './BlockFrame.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { ExpandIcon, ReaderIcon, PlanIcon } from '#lib/ui/icons.ts';
	import { renderDiagram } from '#lib/reader/mermaid.ts';
	import { reader } from '#lib/reader/reader.svelte.ts';
	import type { Diagram } from '#lib/kg/docs.ts';
	import type { DiagramBlock } from './types.ts';

	interface Props {
		block: DiagramBlock;
	}

	let { block }: Props = $props();

	async function load(id: string) {
		const r = await fetch(`/api/doc/diagram/${encodeURIComponent(id)}`);
		if (!r.ok) throw new Error(`diagram ${id}: ${r.status}`);
		const d = (await r.json()) as Diagram;
		return { d, svg: await renderDiagram(d.code) };
	}

	const loading = $derived(load(block.id));

	const markdown = (d: Diagram) => () =>
		`**${d.caption}** (${d.where})\n\n\`\`\`mermaid\n${d.code}\n\`\`\``;
</script>

{#await loading}
	<BlockFrame icon={PlanIcon} label="Diagram">
		<div class="h-40 animate-pulse rounded-lg bg-white/[0.02]"></div>
	</BlockFrame>
{:then { d, svg }}
	<BlockFrame
		icon={PlanIcon}
		label="Diagram"
		title={d.caption}
		subtitle={d.doc === 'glossary'
			? `From the glossary${d.where.replace(/^Glossary/, '')}`
			: `From the booklet · ${d.where}`}
		markdown={markdown(d)}
	>
		<button
			type="button"
			class="diagram group/d relative block w-full cursor-zoom-in overflow-hidden rounded-lg border border-white/[0.05] bg-ink-950/40 px-2 py-3"
			onclick={() => (reader.lightbox = { svg, caption: d.caption })}
			aria-label="View the diagram full size"
		>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- mermaid output, rendered with securityLevel strict -->
			{@html svg}
			<span
				class="absolute top-2 right-2 rounded-md p-1 text-fg-3 opacity-0 transition-opacity group-hover/d:opacity-100"
			>
				<Icon icon={ExpandIcon} size={13} />
			</span>
		</button>
		{#if block.note}
			<p class="mt-2.5 text-[12.5px] leading-snug text-fg-2">{block.note}</p>
		{/if}
		<button
			type="button"
			class="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-fg-3 transition-colors hover:text-glow"
			onclick={() => reader.goto(d.unit, { section: d.section })}
		>
			<Icon icon={ReaderIcon} size={12} /> Read it in context
		</button>
	</BlockFrame>
{:catch}
	<BlockFrame icon={PlanIcon} label="Diagram">
		<p class="text-[12px] text-fg-3">This diagram could not be drawn.</p>
	</BlockFrame>
{/await}

<style>
	.diagram :global(svg) {
		display: block;
		margin: 0 auto;
		max-width: 100%;
		max-height: 420px;
		height: auto;
	}
</style>
