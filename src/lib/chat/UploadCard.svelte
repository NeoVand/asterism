<script lang="ts">
	/** Progress and result of weaving a document into the graph, docked above the composer. */
	import { fly } from 'svelte/transition';
	import Icon from '#lib/ui/Icon.svelte';
	import {
		AlertIcon,
		CheckIcon,
		CloseIcon,
		FocusIcon,
		SparklesIcon,
		UploadIcon
	} from '#lib/ui/icons.ts';
	import { uploads } from './uploads.svelte.ts';

	interface Props {
		onshow: (ids: string[]) => void;
		onask: (text: string) => void;
	}

	let { onshow, onask }: Props = $props();
	const u = $derived(uploads.current);
	const LABEL = {
		reading: 'Reading',
		chunking: 'Splitting into passages',
		extracting: 'Extracting facts',
		weaving: 'Weaving into the graph',
		done: 'Woven in',
		error: 'Could not weave in'
	};
	const pct = $derived(
		u
			? u.stage === 'done'
				? 100
				: u.stage === 'weaving'
					? 96
					: u.total
						? 8 + (u.done / u.total) * 86
						: u.stage === 'extracting'
							? 8
							: 3
			: 0
	);
</script>

{#if u}
	<div
		class="mb-2 overflow-hidden rounded-xl border border-white/[0.07] bg-ink-850/85 px-3 py-2.5"
		transition:fly={{ y: 8, duration: 220 }}
	>
		<div class="flex items-center gap-2">
			<span
				class="flex size-6 shrink-0 items-center justify-center rounded-md {u.stage === 'error'
					? 'bg-bad/12 text-bad'
					: u.stage === 'done'
						? 'bg-ok/12 text-ok'
						: 'bg-glow/12 text-glow'}"
			>
				<Icon
					icon={u.stage === 'error' ? AlertIcon : u.stage === 'done' ? CheckIcon : UploadIcon}
					size={13}
				/>
			</span>
			<div class="min-w-0 flex-1">
				<div class="truncate text-[12.5px] text-fg">{u.name}</div>
				<div class="truncate text-[11px] text-fg-3">
					{#if u.stage === 'error'}
						{u.error}
					{:else if u.stage === 'done' && u.result}
						{u.result.facts.length} facts linked to {u.result.concepts} concepts and {u.result
							.entities} entities
					{:else}
						{LABEL[u.stage]}{u.total ? ` · ${u.done}/${u.total}` : ''}{u.facts
							? ` · ${u.facts} facts`
							: ''}
					{/if}
				</div>
			</div>
			{#if u.stage === 'done' && u.result}
				<button
					type="button"
					class="rounded-lg p-1.5 text-fg-3 transition-colors hover:bg-white/[0.06] hover:text-fg"
					onclick={() => onshow(u.result!.facts)}
					aria-label="Show in the graph"
				>
					<Icon icon={FocusIcon} size={14} />
				</button>
				<button
					type="button"
					class="flex items-center gap-1.5 rounded-lg bg-glow/12 px-2 py-1 text-[11.5px] text-glow transition-colors hover:bg-glow/20"
					onclick={() => {
						onask(
							`Summarize the uploaded document “${u.result!.name}” and connect it to what the research says: what does it confirm, what does it contradict, and what is missing?`
						);
						uploads.dismiss();
					}}
				>
					<Icon icon={SparklesIcon} size={12} /> Ask about it
				</button>
			{/if}
			{#if u.stage === 'done' || u.stage === 'error'}
				<button
					type="button"
					class="rounded-lg p-1 text-fg-4 hover:text-fg"
					onclick={() => uploads.dismiss()}
					aria-label="Dismiss"
				>
					<Icon icon={CloseIcon} size={13} />
				</button>
			{/if}
		</div>
		{#if u.stage !== 'error'}
			<div class="mt-2 h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
				<div
					class="h-full rounded-full bg-gradient-to-r from-glow/70 to-glow transition-[width] duration-500 ease-out"
					style:width="{pct}%"
					style:box-shadow="0 0 10px var(--color-glow)"
				></div>
			</div>
		{/if}
	</div>
{/if}
