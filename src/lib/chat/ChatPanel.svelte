<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import Icon from '#lib/ui/Icon.svelte';
	import { DeleteIcon, HistoryIcon, NewChatIcon, SettingsIcon } from '#lib/ui/icons.ts';
	import { tip } from '#lib/ui/tooltip.ts';
	import Composer from './Composer.svelte';
	import EmptyState from './EmptyState.svelte';
	import MessageView from './MessageView.svelte';
	import UploadCard from './UploadCard.svelte';
	import { chat } from './chat.svelte.ts';
	import { ACCEPT, uploads } from './uploads.svelte.ts';

	interface Props {
		stats: { facts: number; sources: number; concepts: number } | null;
		onopensettings: () => void;
		onshowupload: (ids: string[]) => void;
		ontour: () => void;
	}

	let { stats, onopensettings, onshowupload, ontour }: Props = $props();
	let fileInput: HTMLInputElement;

	let composer: Composer;
	let scroller: HTMLDivElement;
	let historyOpen = $state(false);
	let stick = true;

	export function ask(text: string, send = true) {
		composer?.fill(text, send);
	}

	export function focus() {
		composer?.focus();
	}

	const thread = $derived(chat.current);
	const messages = $derived(thread?.messages ?? []);
	const waiting = $derived(messages[messages.length - 1]?.status === 'waiting');

	// A new turn (sent or answered) always brings the view back to the stream.
	let seenTurns = 0;
	$effect(() => {
		const turns = messages.length;
		if (turns !== seenTurns) {
			seenTurns = turns;
			stick = true;
		}
	});

	// Follow the stream unless the user scrolled up to read.
	$effect(() => {
		// track content growth
		void JSON.stringify(messages.map((m) => [m.parts.length, m.steps.length, m.parts.at(-1)]));
		if (stick && scroller) requestAnimationFrame(() => scroller?.scrollTo({ top: scroller.scrollHeight }));
	});

	function onscroll() {
		const d = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
		stick = d < 60;
	}

	function relative(t: number) {
		const s = (Date.now() - t) / 1000;
		if (s < 60) return 'now';
		if (s < 3600) return `${Math.floor(s / 60)}m`;
		if (s < 86400) return `${Math.floor(s / 3600)}h`;
		return `${Math.floor(s / 86400)}d`;
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') historyOpen = false;
	}}
/>

<section class="glass relative flex h-full flex-col overflow-hidden rounded-2xl">
	<header class="relative z-20 flex h-12 shrink-0 items-center gap-1 border-b border-white/[0.05] px-3">
		<div class="min-w-0 flex-1 pl-1">
			{#key thread?.id}
				<div class="truncate text-[13px] font-medium text-fg" in:fade={{ duration: 200 }}>
					{thread?.title ?? 'New conversation'}
				</div>
			{/key}
		</div>
		<button
			type="button"
			class="rounded-lg p-1.5 text-fg-3 transition-colors hover:bg-white/[0.05] hover:text-fg {historyOpen ? 'bg-white/[0.06] text-fg' : ''}"
			onclick={() => (historyOpen = !historyOpen)}
			aria-label="Conversations"
			use:tip={'Conversations'}
		>
			<Icon icon={HistoryIcon} size={16} />
		</button>
		<button
			type="button"
			class="rounded-lg p-1.5 text-fg-3 transition-colors hover:bg-white/[0.05] hover:text-fg"
			onclick={() => {
				chat.newThread();
				historyOpen = false;
				composer?.focus();
			}}
			aria-label="New conversation"
			use:tip={'New conversation'}
		>
			<Icon icon={NewChatIcon} size={16} />
		</button>
		<button
			type="button"
			class="rounded-lg p-1.5 text-fg-3 transition-colors hover:bg-white/[0.05] hover:text-fg"
			onclick={onopensettings}
			aria-label="Settings"
			use:tip={'Settings'}
		>
			<Icon icon={SettingsIcon} size={16} />
		</button>

		{#if historyOpen}
			<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
			<div class="fixed inset-0 z-10" onclick={() => (historyOpen = false)}></div>
			<div
				class="glass-strong absolute top-11 right-2 left-2 z-20 max-h-[60vh] overflow-y-auto rounded-xl p-1.5"
				transition:fly={{ y: -6, duration: 180 }}
			>
				{#if chat.threads.length === 0}
					<div class="px-3 py-6 text-center text-[12px] text-fg-3">No conversations yet.</div>
				{:else}
					{#each chat.threads as t (t.id)}
						<div
							class="group flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-white/[0.05] {t.id === chat.currentId
								? 'bg-white/[0.06]'
								: ''}"
						>
							<button
								type="button"
								class="min-w-0 flex-1 truncate text-left text-[12.5px] text-fg-2 group-hover:text-fg"
								onclick={() => {
									chat.select(t.id);
									historyOpen = false;
								}}
							>
								{t.title}
							</button>
							<span class="shrink-0 font-mono text-[10.5px] text-fg-4">{relative(t.updatedAt)}</span>
							<button
								type="button"
								class="shrink-0 rounded p-0.5 text-fg-4 opacity-0 transition-opacity group-hover:opacity-100 hover:text-bad"
								onclick={() => chat.remove(t.id)}
								aria-label="Delete conversation"
							>
								<Icon icon={DeleteIcon} size={13} />
							</button>
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	</header>

	<div bind:this={scroller} {onscroll} class="relative min-h-0 flex-1 overflow-y-auto">
		{#if messages.length === 0}
			<EmptyState {stats} onpick={(t) => composer?.fill(t, true)} {ontour} />
		{:else}
			<div class="space-y-6 px-4 pt-5 pb-8">
				{#each messages as m, i (m.id)}
					<MessageView msg={m} last={i === messages.length - 1} onanswer={(a) => chat.resume(a)} />
				{/each}
			</div>
		{/if}
	</div>

	<div class="relative shrink-0 px-3 pb-3">
		<div class="pointer-events-none absolute -top-8 right-0 left-0 h-8 bg-gradient-to-t from-ink-900/60 to-transparent"></div>
		<UploadCard onshow={onshowupload} onask={(t) => composer?.fill(t, true)} />
		<input
			bind:this={fileInput}
			type="file"
			accept={ACCEPT}
			class="hidden"
			onchange={(e) => {
				const f = e.currentTarget.files?.[0];
				if (f) uploads.upload(f);
				e.currentTarget.value = '';
			}}
		/>
		<Composer
			onattach={() => fileInput?.click()}
			bind:this={composer}
			busy={chat.busy}
			{waiting}
			onsend={(t) => chat.send(t)}
			onstop={() => chat.stop()}
			{onopensettings}
		/>
	</div>
</section>
