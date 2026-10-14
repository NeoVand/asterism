<script lang="ts">
	/** ⌘K search over the graph; results light up as you type, Enter flies to one. */
	import { fade, scale } from 'svelte/transition';
	import Icon from '#lib/ui/Icon.svelte';
	import { PlusIcon, SearchIcon, SparklesIcon } from '#lib/ui/icons.ts';
	import { tip } from '#lib/ui/tooltip.ts';
	import { attachments } from '#lib/chat/attachments.svelte.ts';
	import { useAsterism } from '#lib/app/context.ts';
	import { TOPIC_COLORS, TYPE_LABEL, type ClientNodeType } from './palette.ts';

	interface Result {
		id: string;
		type: ClientNodeType;
		label: string;
		where: string;
		topic: number;
	}

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();
	const app = useAsterism();
	let q = $state('');
	let results = $state<Result[]>([]);
	let active = $state(0);
	let input: HTMLInputElement | undefined = $state();
	let timer: ReturnType<typeof setTimeout>;
	let seq = 0;
	/** Resolves with the results of the latest query (Enter waits for it). */
	let pending: Promise<Result[]> | null = null;

	$effect(() => {
		if (open) requestAnimationFrame(() => input?.focus());
		else {
			app.spotlight(null);
		}
	});

	$effect(() => {
		const query = q.trim();
		clearTimeout(timer);
		if (!query) {
			results = [];
			app.spotlight(null);
			return;
		}
		const mine = ++seq;
		let resolve!: (r: Result[]) => void;
		pending = new Promise((r) => (resolve = r));
		timer = setTimeout(async () => {
			const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
			const data = (await res.json()) as { results: Result[] };
			if (mine !== seq) return;
			results = data.results.slice(0, 12);
			active = 0;
			app.spotlight(results.map((r) => r.id));
			resolve(results);
		}, 140);
	});

	function pick(r: Result) {
		app.select(r.id);
		onclose();
	}

	/** Attach every match (not only the few shown) to the next message as one chip. */
	async function attachAll() {
		const query = q.trim();
		if (!query) return;
		const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=60`);
		const data = (await res.json()) as { results: Result[] };
		attachments.add({ kind: 'search', label: query, ids: data.results.map((r) => r.id) });
		onclose();
		app.compose();
	}

	function askAgent() {
		app.ask(q.trim());
		onclose();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-40 bg-ink-950/40"
		transition:fade={{ duration: 140 }}
		onclick={onclose}
	></div>
	<div
		class="glass-strong fixed top-[12vh] left-[calc((100vw-480px)/2)] z-50 w-[560px] -translate-x-1/2 overflow-hidden rounded-2xl"
		transition:scale={{ start: 0.98, duration: 160 }}
		role="dialog"
		aria-label="Search the graph"
	>
		<div class="flex items-center gap-2.5 border-b border-white/[0.06] px-4">
			<Icon icon={SearchIcon} size={16} class="text-fg-3" />
			<input
				{@attach (el) => el.focus()}
				bind:this={input}
				bind:value={q}
				class="h-12 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-4"
				placeholder="Search facts, concepts, standards, sources…"
				onkeydown={(e) => {
					if (e.key === 'ArrowDown') {
						e.preventDefault();
						active = Math.min(results.length - 1, active + 1);
						if (results[active]) app.spotlight([results[active].id]);
					} else if (e.key === 'ArrowUp') {
						e.preventDefault();
						active = Math.max(0, active - 1);
						if (results[active]) app.spotlight([results[active].id]);
					} else if (e.key === 'Enter') {
						e.preventDefault();
						if (e.metaKey) askAgent();
						else if (results[active]) pick(results[active]);
						else if (pending) pending.then((r) => (r[0] ? pick(r[0]) : askAgent()));
						else askAgent();
					} else if (e.key === 'Escape') onclose();
				}}
			/>
			{#if results.length}
				<button
					type="button"
					class="flex h-7 items-center gap-1 rounded-lg px-2 text-[11.5px] text-fg-3 transition-colors hover:bg-white/[0.06] hover:text-fg"
					onclick={attachAll}
					aria-label="Add all matches to the chat"
					use:tip={'Add all matches to your next message, as one chip'}
				>
					<Icon icon={PlusIcon} size={13} /> Add to chat
				</button>
			{/if}
			<kbd class="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-fg-4">esc</kbd>
		</div>
		{#if q.trim()}
			<div class="max-h-[52vh] overflow-y-auto p-1.5">
				{#each results as r, i (r.id)}
					<button
						type="button"
						class="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors {i ===
						active
							? 'bg-white/[0.07]'
							: 'hover:bg-white/[0.04]'}"
						onpointerenter={() => {
							active = i;
							app.spotlight([r.id]);
						}}
						onclick={() => pick(r)}
					>
						<span
							class="mt-[5px] size-2 shrink-0 rounded-full"
							style:background={TOPIC_COLORS[r.topic]}
							style:box-shadow="0 0 8px {TOPIC_COLORS[r.topic]}"
						></span>
						<span class="min-w-0 flex-1">
							<span class="line-clamp-2 text-[12.5px] leading-snug text-fg">{r.label}</span>
							<span class="mt-0.5 block truncate text-[10.5px] text-fg-4"
								>{TYPE_LABEL[r.type]}{r.where ? ` · ${r.where}` : ''}</span
							>
						</span>
					</button>
				{/each}
				<button
					type="button"
					class="mt-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-glow transition-colors hover:bg-glow/[0.07]"
					onclick={askAgent}
				>
					<Icon icon={SparklesIcon} size={14} />
					Ask the agent: “{q.trim()}”
					<kbd class="ml-auto rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-fg-4"
						>⌘↵</kbd
					>
				</button>
			</div>
		{/if}
	</div>
{/if}
