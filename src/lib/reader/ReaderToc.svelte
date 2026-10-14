<script lang="ts">
	/** The documents' contents: one tab per document, parts as dividers, the open unit expanded. */
	import type { DocKey } from '#lib/kg/types.ts';
	import type { DocToc } from '#lib/kg/docs.ts';
	import { TOPIC_COLORS } from '#lib/graph/palette.ts';

	interface Props {
		toc: DocToc;
		current: string | null;
		section: string | null;
		ongoto: (unit: string, section?: string) => void;
	}

	let { toc, current, section, ongoto }: Props = $props();

	const currentDoc = $derived(
		toc.docs.find((d) => d.units.some((u) => u.id === current))?.key ?? toc.docs[0]?.key
	);
	let picked = $state<DocKey | null>(null);
	const doc = $derived(toc.docs.find((d) => d.key === (picked ?? currentDoc)) ?? toc.docs[0]);

	/** "Chapter 3: Rules and…" → ["3", "Rules and…"]; glossary parts → ["A", …]. */
	function split(title: string): [string | null, string] {
		const ch = /^Chapter (\d+):\s*(.*)$/.exec(title);
		if (ch) return [ch[1], ch[2]];
		const part = /^Part ([A-I]):\s*(.*)$/.exec(title);
		if (part) return [part[1], part[2]];
		return [null, title];
	}
</script>

<div class="flex h-full flex-col">
	<div class="flex shrink-0 gap-1 px-4 pt-3 pb-2">
		{#each toc.docs as d (d.key)}
			<button
				type="button"
				class="rounded-lg px-2.5 py-1 text-[12px] transition-colors {d.key === doc.key
					? 'bg-white/[0.07] text-fg'
					: 'text-fg-3 hover:bg-white/[0.04] hover:text-fg-2'}"
				onclick={() => (picked = d.key)}
			>
				{d.title}
			</button>
		{/each}
	</div>
	<nav class="min-h-0 flex-1 overflow-y-auto px-3 pb-6" aria-label="Contents">
		{#each doc.units as u (u.id)}
			{@const [num, title] = split(u.title)}
			{#if u.part}
				<button
					type="button"
					class="mt-4 mb-1 block w-full px-2 text-left text-[10.5px] font-medium tracking-[0.12em] text-fg-4 uppercase transition-colors hover:text-fg-2"
					onclick={() => ongoto(u.id)}
				>
					{u.title}
				</button>
			{:else}
				<button
					type="button"
					class="group flex w-full items-baseline gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors {u.id ===
					current
						? 'bg-white/[0.05]'
						: 'hover:bg-white/[0.03]'}"
					onclick={() => ongoto(u.id)}
				>
					<span
						class="w-4 shrink-0 text-right font-mono text-[11px] {u.id === current
							? 'text-glow'
							: 'text-fg-4'}"
						style:color={num && /[A-I]/.test(num)
							? TOPIC_COLORS['ABCDEFGHI'.indexOf(num)]
							: undefined}>{num ?? ''}</span
					>
					<span
						class="font-serif text-[15px] leading-snug {u.id === current
							? 'text-fg'
							: 'text-fg-2 group-hover:text-fg'}">{title}</span
					>
				</button>
				{#if u.id === current && u.sections.length}
					<div class="mt-0.5 mb-2 ml-[30px] border-l border-white/[0.06]">
						{#each u.sections as s (s.id)}
							<button
								type="button"
								class="block w-full truncate py-1 pr-2 pl-3 text-left text-[12px] transition-colors {s.id ===
								section
									? 'text-glow'
									: 'text-fg-3 hover:text-fg'}"
								onclick={() => ongoto(u.id, s.id)}
							>
								{s.title}
							</button>
						{/each}
					</div>
				{/if}
			{/if}
		{/each}
	</nav>
</div>
