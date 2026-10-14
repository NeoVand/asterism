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
