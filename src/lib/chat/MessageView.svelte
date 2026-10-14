<script lang="ts">
	import { fade } from 'svelte/transition';
	import BlockView from '#lib/blocks/BlockView.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { AlertIcon, CheckIcon, CopyIcon } from '#lib/ui/icons.ts';
	import { tip } from '#lib/ui/tooltip.ts';
	import { provideCiteNumbering, useAsterism } from '#lib/app/context.ts';
	import type { Answers } from '#lib/blocks/schema.ts';
	import ActivityView from './ActivityView.svelte';
	import QuestionFormView from './QuestionFormView.svelte';
	import { citedIds, messageText, type Msg } from './chat.svelte.ts';
	import { renderMarkdown } from './markdown.ts';

	interface Props {
		msg: Msg;
		last: boolean;
		onanswer: (answers: Answers | 'skipped') => void;
	}

	let { msg, last, onanswer }: Props = $props();
	const app = useAsterism();

	// Citation numbers follow first appearance across the whole message (text and blocks).
	const order = $derived(citedIds(msg));
	provideCiteNumbering({
		number: (id: string) => {
			const i = order.indexOf(id);
			return i >= 0 ? i + 1 : 0;
		}
	});

	const streaming = $derived(msg.status === 'streaming');
	// Reading order: interim notes, the answer, then its blocks, then any question form.
	const RANK = { note: 0, text: 1, ui: 2, form: 3 } as const;
	const ordered = $derived(
		msg.parts.map((part, i) => ({ part, i })).sort((a, b) => RANK[a.part.k] - RANK[b.part.k] || a.i - b.i)
	);
	const lastTextIndex = $derived(msg.parts.findLastIndex((p) => p.k === 'text'));

	function html(text: string, isLast: boolean) {
		return renderMarkdown(text, {
			streaming: streaming && isLast,
			number: (id) => {
				const i = order.indexOf(id);
				return i >= 0 ? i + 1 : 0;
			},
			brief: (id) => app.brief(id)
		});
	}

	function citeFrom(e: Event): HTMLElement | null {
		const t = e.target as HTMLElement | null;
		return t?.closest?.('.cite-chip') ?? null;
	}

	const chapters = $derived.by(() => {
		const s = new Set<number>();
		for (const id of order) {
			const b = app.brief(id);
			if (b && b.chapter >= 0) s.add(b.chapter);
		}
		return s.size;
	});

	let copied = $state(false);
	async function copy() {
		await navigator.clipboard.writeText(messageText(msg));
		copied = true;
		setTimeout(() => (copied = false), 1400);
	}
</script>

{#if msg.role === 'user'}
	<div class="flex justify-end" in:fade={{ duration: 180 }}>
		<div
			class="max-w-[86%] rounded-2xl rounded-br-md border border-white/[0.06] bg-white/[0.055] px-3.5 py-2 text-[13.5px] leading-relaxed whitespace-pre-wrap text-fg"
		>
			{messageText(msg)}
		</div>
	</div>
{:else}
	<div class="group/msg" in:fade={{ duration: 200 }}>
		<ActivityView {msg} />

		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			class="space-y-3"
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
			{#each ordered as { part, i } (i)}
				{#if part.k === 'text'}
					<div class="prose-asterism" class:caret={streaming && i === lastTextIndex}>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized markdown (raw HTML escaped) -->
						{@html html(part.text, i === lastTextIndex)}
					</div>
				{:else if part.k === 'note'}
					<p class="border-l border-white/[0.07] pl-3.5 text-[11.5px] leading-relaxed text-fg-3 italic">{part.text.trim().slice(0, 400)}</p>
				{:else if part.k === 'ui'}
					<div in:fade={{ duration: 260 }}>
						<BlockView block={part.block} />
					</div>
				{:else}
					<QuestionFormView form={part.form} answers={part.answers} active={last && msg.status === 'waiting'} onsubmit={onanswer} />
				{/if}
			{/each}
		</div>

		{#if msg.status === 'error'}
			<div class="mt-2 flex items-start gap-2 rounded-lg border border-bad/25 bg-bad/[0.06] px-3 py-2 text-[12px] text-bad">
				<Icon icon={AlertIcon} size={14} class="mt-px shrink-0" />
				<span>{msg.error}</span>
			</div>
		{:else if msg.status === 'stopped'}
			<div class="mt-2 text-[11.5px] text-fg-4">Stopped.</div>
		{/if}

		{#if !streaming && order.length}
			<div class="mt-3 flex items-center gap-2 text-[11px] text-fg-4">
				<button
					type="button"
					class="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors hover:bg-white/[0.04] hover:text-fg-2"
					onpointerenter={() => app.spotlight(order)}
					onpointerleave={() => app.spotlight(null)}
					onclick={() => app.select(order[0])}
					use:tip={'Hover to light up the answer’s constellation'}
				>
					<span class="size-1.5 rounded-full bg-gold shadow-[0_0_8px_var(--color-gold)]"></span>
					{order.length} cited · {chapters} {chapters === 1 ? 'chapter' : 'chapters'}
				</button>
				<button
					type="button"
					class="ml-auto rounded-md p-1 opacity-0 transition-all group-hover/msg:opacity-100 hover:bg-white/[0.05] hover:text-fg-2"
					onclick={copy}
					aria-label="Copy answer"
					use:tip={copied ? 'Copied' : 'Copy'}
				>
					<Icon icon={copied ? CheckIcon : CopyIcon} size={13} />
				</button>
			</div>
		{/if}
	</div>
{/if}
