<script lang="ts">
	/**
	 * The reading surface on the left: the booklet and the glossary as pages, wired to the graph.
	 * The header names where you are; the contents sheet slides over the page.
	 */
	import { fade, fly } from 'svelte/transition';
	import Icon from '#lib/ui/Icon.svelte';
	import { tip } from '#lib/ui/tooltip.ts';
	import { CloseIcon, NarrowIcon, SparklesIcon, TocIcon, WideIcon } from '#lib/ui/icons.ts';
	import { reader } from './reader.svelte.ts';
	import ReaderUnit from './ReaderUnit.svelte';
	import ReaderToc from './ReaderToc.svelte';

	interface Props {
		/** Fact ids the current answer cites (underlined in the text). */
		cited: string[];
		onspot: (ids: string[] | null) => void;
		onpick: (id: string) => void;
		onreading: (ids: string[]) => void;
	}

	let { cited, onspot, onpick, onreading }: Props = $props();

	let section = $state<{ id: string; title: string } | null>(null);
	let progress = $state(0);

	const unitTitle = $derived(
		reader.unit?.title
			.replace(/^Chapter (\d+):\s*/, 'Ch $1 · ')
			.replace(/^Part ([A-I]):\s*/, 'Part $1 · ') ?? ''
	);
</script>

<section
	class="glass-strong relative flex h-full flex-col overflow-hidden rounded-2xl"
	aria-label="Reader"
	in:fly={{ x: -24, duration: 380, opacity: 0 }}
	out:fly={{ x: -24, duration: 220, opacity: 0 }}
>
	<header
		class="relative z-20 flex h-12 shrink-0 items-center gap-1 border-b border-white/[0.05] px-2"
	>
		<button
			type="button"
			class="rounded-lg p-1.5 transition-colors hover:bg-white/[0.05] hover:text-fg {reader.tocOpen
				? 'bg-white/[0.06] text-fg'
				: 'text-fg-3'}"
			onclick={() => (reader.tocOpen = !reader.tocOpen)}
			aria-label="Contents"
			aria-expanded={reader.tocOpen}
			use:tip={'Contents'}
		>
			<Icon icon={TocIcon} size={16} />
		</button>
		<button
			type="button"
			class="min-w-0 flex-1 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-white/[0.03]"
			onclick={() => (reader.tocOpen = !reader.tocOpen)}
		>
			<div class="truncate text-[12.5px] leading-tight font-medium text-fg">
				{reader.tocOpen ? 'Contents' : unitTitle || 'Reader'}
			</div>
			{#if !reader.tocOpen && section && section.title !== reader.unit?.title}
				{#key section.id}
					<div class="truncate text-[11px] leading-tight text-fg-3" in:fade={{ duration: 180 }}>
						{section.title}
					</div>
				{/key}
			{/if}
		</button>
		<button
			type="button"
			class="rounded-lg p-1.5 transition-colors hover:bg-white/[0.05] {reader.readAlong
				? 'text-gold'
				: 'text-fg-3 hover:text-fg'}"
			onclick={() => {
				reader.readAlong = !reader.readAlong;
				reader.save();
			}}
			aria-label="Light up what you read"
			aria-pressed={reader.readAlong}
			use:tip={reader.readAlong
				? 'Reading along: the stars on this page are lit'
				: 'Light up the stars of what you read'}
		>
			<Icon icon={SparklesIcon} size={15} />
		</button>
		<button
			type="button"
			class="rounded-lg p-1.5 text-fg-3 transition-colors hover:bg-white/[0.05] hover:text-fg"
			onclick={() => {
				reader.wide = !reader.wide;
				reader.save();
			}}
			aria-label={reader.wide ? 'Narrower page' : 'Wider page'}
			use:tip={reader.wide ? 'Narrower page' : 'Wider page'}
		>
			<Icon icon={reader.wide ? NarrowIcon : WideIcon} size={15} />
		</button>
		<button
			type="button"
			class="rounded-lg p-1.5 text-fg-3 transition-colors hover:bg-white/[0.05] hover:text-fg"
			onclick={() => reader.close()}
			aria-label="Close the reader"
			use:tip={'Close'}
		>
			<Icon icon={CloseIcon} size={16} />
		</button>
		<div
			class="absolute bottom-[-1px] left-0 h-px bg-gradient-to-r from-glow/0 via-glow/70 to-glow/90 transition-[width] duration-150"
			style:width="{(reader.tocOpen ? 0 : progress) * 100}%"
		></div>
	</header>

	<div class="relative min-h-0 flex-1">
		{#if reader.unit}
			{#key reader.unit.id}
				<div class="absolute inset-0" in:fade={{ duration: 220 }}>
					<ReaderUnit
						unit={reader.unit}
						toc={reader.toc}
						target={reader.target}
						{cited}
						wide={reader.wide}
						{onspot}
						{onpick}
						{onreading}
						onposition={(s, p) => {
							section = s;
							progress = p;
							if (s && reader.section !== s.id) {
								reader.section = s.id;
								reader.save();
							}
						}}
						ongoto={(u, s) => reader.goto(u, s ? { section: s } : {})}
						onexpand={(svg, caption) => (reader.lightbox = { svg, caption })}
					/>
				</div>
			{/key}
		{:else if reader.error}
			<div class="p-8 text-[13px] text-fg-3">{reader.error}</div>
		{/if}

		{#if reader.loading}
			<div
				class="absolute inset-x-0 top-0 h-px overflow-hidden"
				in:fade={{ duration: 300, delay: 150 }}
			>
				<div class="h-full w-1/3 animate-[r-load_1.1s_ease-in-out_infinite] bg-glow/70"></div>
			</div>
		{/if}

		{#if reader.tocOpen && reader.toc}
			<div
				class="absolute inset-0 z-10 bg-ink-900/[0.97] backdrop-blur-xl"
				transition:fly={{ y: -8, duration: 200, opacity: 0 }}
			>
				<ReaderToc
					toc={reader.toc}
					current={reader.unit?.id ?? null}
					section={section?.id ?? null}
					ongoto={(u, s) => reader.goto(u, s ? { section: s } : {})}
				/>
			</div>
		{/if}
	</div>
</section>

<style>
	@keyframes -global-r-load {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(300%);
		}
	}
</style>
