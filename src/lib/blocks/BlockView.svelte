<script lang="ts">
	/** Renders one generative UI block by dispatching on `block.type`. */
	import type { Block } from './schema.ts';
	import PlanBlock from './PlanBlock.svelte';
	import TimelineBlock from './TimelineBlock.svelte';
	import ComparisonBlock from './ComparisonBlock.svelte';
	import MetricsBlock from './MetricsBlock.svelte';
	import RisksBlock from './RisksBlock.svelte';
	import ChecklistBlock from './ChecklistBlock.svelte';
	import FlowBlock from './FlowBlock.svelte';
	import SourcesBlock from './SourcesBlock.svelte';

	interface Props {
		block: Block;
	}

	let { block }: Props = $props();
</script>

<!-- A block the renderer cannot draw degrades to a quiet note instead of breaking the chat. -->
<svelte:boundary onerror={(e) => console.error('block failed to render', e)}>
	{#if block.type === 'plan'}
		<PlanBlock {block} />
	{:else if block.type === 'timeline'}
		<TimelineBlock {block} />
	{:else if block.type === 'comparison'}
		<ComparisonBlock {block} />
	{:else if block.type === 'metrics'}
		<MetricsBlock {block} />
	{:else if block.type === 'risks'}
		<RisksBlock {block} />
	{:else if block.type === 'checklist'}
		<ChecklistBlock {block} />
	{:else if block.type === 'flow'}
		<FlowBlock {block} />
	{:else if block.type === 'sources'}
		<SourcesBlock {block} />
	{/if}

	{#snippet failed()}
		<div class="rounded-xl bg-white/[0.02] px-3.5 py-2.5 text-[12px] text-fg-3">
			This {block.type} block could not be drawn.
		</div>
	{/snippet}
</svelte:boundary>
