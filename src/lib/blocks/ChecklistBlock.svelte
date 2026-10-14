<script lang="ts">
	/** Interactive checklist (local state only) with a progress meter in the header. */
	import BlockFrame from './BlockFrame.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import Cite from '#lib/ui/Cite.svelte';
	import { CheckIcon, TodoIcon } from '#lib/ui/icons.ts';
	import { useAsterism } from '#lib/app/context.ts';
	import type { ChecklistBlock } from './types.ts';
	import { checklistMd } from './markdown.ts';
	import { spotter } from './util.ts';

	interface Props {
		block: ChecklistBlock;
	}

	let { block }: Props = $props();

	const app = useAsterism();
	const spot = spotter(app);
	const uid = $props.id();

	let done = $state<Record<number, boolean>>({});

	const total = $derived(block.items.length);
	const doneCount = $derived(block.items.reduce((n, _, i) => n + (done[i] ? 1 : 0), 0));
	const complete = $derived(total > 0 && doneCount === total);

	const items = $derived(block.items.map((it, i) => ({ ...it, key: `${i}:${it.text}`, i })));
</script>

<BlockFrame
	icon={TodoIcon}
	label="Checklist"
	title={block.title}
	markdown={() => checklistMd(block, (i) => !!done[i])}
>
	{#snippet aside()}
		<span class="flex items-center gap-2">
			<span
				class="relative h-[3px] w-10 overflow-hidden rounded-full bg-white/[0.07]"
				aria-hidden="true"
			>
				<span
					class={[
						'absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-300 ease-out-soft',
						complete ? 'bg-ok' : 'bg-glow/80'
					]}
					style:width="{total ? (doneCount / total) * 100 : 0}%"
				></span>
			</span>
			<span class={['font-mono text-[10.5px] tabular-nums', complete ? 'text-ok' : 'text-fg-3']}>
				{doneCount}/{total}<span class="sr-only"> done</span>
			</span>
		</span>
	{/snippet}

	<ul class="flex flex-col">
		{#each items as it (it.key)}
			{@const checked = !!done[it.i]}
			{@const id = `${uid}-${it.i}`}
			<li
				class="blk-rise group/row -mx-2 flex gap-2.5 rounded-md px-2 py-1.5 transition-colors duration-150 ease-out hover:bg-white/[0.035]"
				style:--i={it.i}
				onpointerenter={() => spot(it.cites)}
				onpointerleave={() => spot(null)}
			>
				<label class="relative mt-px grid size-4 shrink-0 cursor-pointer place-items-center">
					<input
						{id}
						type="checkbox"
						class="peer absolute inset-0 cursor-pointer opacity-0"
						{checked}
						onchange={(e) => (done[it.i] = e.currentTarget.checked)}
					/>
					<span
						class={[
							'pointer-events-none grid size-[15px] place-items-center rounded-[5px] transition-[background-color,box-shadow] duration-200 ease-out-soft peer-focus-visible:ring-2 peer-focus-visible:ring-glow/40',
							checked
								? 'bg-glow text-ink-950 shadow-[0_0_10px_rgb(111_227_255/0.35)]'
								: 'bg-white/[0.02] shadow-[inset_0_0_0_1px_rgb(160_175_210/0.28)] group-hover/row:shadow-[inset_0_0_0_1px_rgb(160_175_210/0.45)]'
						]}
					>
						<span
							class={[
								'grid transition-[opacity,scale] duration-200 ease-out-soft',
								checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
							]}
						>
							<Icon icon={CheckIcon} size={11} stroke={2.6} />
						</span>
					</span>
				</label>

				<div class="min-w-0 flex-1">
					<p
						class={[
							'text-[12.5px] leading-[1.45] transition-colors duration-200 ease-out',
							checked ? 'text-fg-3' : 'text-fg'
						]}
					>
						<label
							for={id}
							class={[
								'cursor-pointer decoration-fg-4 decoration-1 transition-[text-decoration-color] duration-200',
								checked ? 'line-through' : 'no-underline'
							]}
						>
							{it.text}
						</label>
						<Cite ids={it.cites} />
					</p>
					{#if it.detail}
						<p
							class={[
								'mt-0.5 text-[11.5px] leading-[1.5] transition-colors duration-200 ease-out',
								checked ? 'text-fg-4' : 'text-fg-3'
							]}
						>
							{it.detail}
						</p>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
</BlockFrame>
