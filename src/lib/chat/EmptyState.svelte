<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import Icon from '#lib/ui/Icon.svelte';
	import {
		LogoIcon,
		PlanIcon,
		PlayIcon,
		TopicCIcon,
		TopicHIcon,
		TopicAIcon,
		IdeaIcon
	} from '#lib/ui/icons.ts';

	interface Props {
		stats: { facts: number; sources: number; concepts: number } | null;
		onpick: (text: string) => void;
		ontour: () => void;
	}

	let { stats, onpick, ontour }: Props = $props();

	const STARTERS = [
		{
			icon: PlanIcon,
			color: '#f472d0',
			title: 'Plan the validation',
			text: 'Help me build a phased plan to validate the new collision mitigation system before the prototype arrives in mid-2027.'
		},
		{
			icon: TopicCIcon,
			color: '#34d3ee',
			title: 'Sensors in bad weather',
			text: 'How well can radar, lidar and cameras be simulated in dust, snow and fog — and how would we prove the models are good enough?'
		},
		{
			icon: TopicHIcon,
			color: '#5b9dff',
			title: 'Rules and deadlines',
			text: 'Which rules and deadlines constrain an automatic braking system that uses machine learning, and what do they demand as evidence?'
		},
		{
			icon: TopicAIcon,
			color: '#f6b93b',
			title: 'Who has done this?',
			text: 'Who has already shipped automatic braking on off-road machines, how did they validate it, and how long did it take?'
		}
	];
</script>

<div class="flex h-full flex-col items-center justify-center px-6 pb-6" in:fade={{ duration: 300 }}>
	<div class="relative mb-5">
		<div class="absolute inset-0 rounded-full bg-glow/25 blur-2xl"></div>
		<div
			class="relative flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-ink-800/80 text-glow"
		>
			<Icon icon={LogoIcon} size={28} stroke={1.4} />
		</div>
	</div>
	<h2 class="text-[17px] font-semibold tracking-tight text-fg">Ask the research</h2>
	<p class="mt-1.5 max-w-[320px] text-center text-[12.5px] leading-relaxed text-fg-3">
		{#if stats}
			{stats.facts.toLocaleString()} facts, {stats.concepts} concepts and {stats.sources.toLocaleString()}
			sources on virtually validating automatic braking for heavy machines — connected, cited and ready
			to plan with.
		{:else}
			Loading the knowledge graph…
		{/if}
	</p>
	<div class="mt-6 grid w-full grid-cols-2 gap-2">
		{#each STARTERS as s, i (s.title)}
			<button
				type="button"
				class="group flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.04]"
				onclick={() => onpick(s.text)}
				in:fly={{ y: 8, duration: 360, delay: 80 + i * 60 }}
			>
				<span
					class="flex size-7 items-center justify-center rounded-lg"
					style:background="{s.color}1f"
					style:color={s.color}
				>
					<Icon icon={s.icon} size={15} />
				</span>
				<span class="text-[12.5px] font-medium text-fg">{s.title}</span>
				<span class="line-clamp-2 text-[11.5px] leading-snug text-fg-3 group-hover:text-fg-2"
					>{s.text}</span
				>
			</button>
		{/each}
	</div>
	<button
		type="button"
		class="group mt-4 flex items-center gap-2 rounded-full border border-white/[0.07] py-1.5 pr-3.5 pl-2 text-[12px] text-fg-2 transition-all hover:border-glow/30 hover:text-fg"
		onclick={ontour}
	>
		<span
			class="flex size-5 items-center justify-center rounded-full bg-glow/15 text-glow transition-transform group-hover:scale-110"
		>
			<Icon icon={PlayIcon} size={10} stroke={2} />
		</span>
		New here? Take the one-minute tour
	</button>
	<p class="mt-3 max-w-[330px] text-center text-[11px] leading-relaxed text-fg-4">
		<Icon icon={IdeaIcon} size={12} class="mr-1 inline -translate-y-px" />Click any star to read it,
		press
		<kbd class="rounded bg-white/[0.06] px-1 font-mono text-[10px]">⌘K</kbd> to search, or drop a document
		to weave it in.
	</p>
</div>
