<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import Icon from '#lib/ui/Icon.svelte';
	import { CloseIcon, EyeIcon, EyeOffIcon, KeyIcon, MemoryIcon } from '#lib/ui/icons.ts';
	import { MODELS, settings } from './settings.svelte.ts';
	import { chat } from './chat.svelte.ts';

	interface Props {
		open: boolean;
		defaultPrompt: string;
		onclose: () => void;
	}

	let { open, defaultPrompt, onclose }: Props = $props();
	let showKey = $state(false);
	let memory = $state<{ content: string; empty: boolean } | null>(null);

	/** The memory file's notes, without its heading and markdown bullets. */
	function memoryLines(content: string): string[] {
		return content
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith('#'))
			.map((l) => l.replace(/^[-*]\s+/, '').replace(/\*\*/g, ''));
	}

	async function loadMemory() {
		memory = await (await fetch('/api/memory')).json();
	}

	async function forget() {
		memory = await (await fetch('/api/memory', { method: 'DELETE' })).json();
	}
	let tab = $state<'agent' | 'view' | 'data'>('agent');
	const s = $derived(settings.value);
</script>

<svelte:window
	onkeydown={(e) => {
		if (open && e.key === 'Escape') onclose();
	}}
/>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 backdrop-blur-sm" transition:fade={{ duration: 160 }} onclick={onclose}>
		<div
			class="glass-strong flex h-[min(620px,86vh)] w-[min(720px,92vw)] overflow-hidden rounded-2xl"
			transition:scale={{ start: 0.97, duration: 200 }}
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-label="Settings"
		>
			<nav class="flex w-44 shrink-0 flex-col gap-0.5 border-r border-white/[0.05] p-2.5">
				<div class="px-2.5 pt-1.5 pb-3 text-[13px] font-semibold text-fg">Settings</div>
				{#each [['agent', 'Agent'], ['view', 'Graph view'], ['data', 'Memory & data']] as [k, label] (k)}
					<button
						type="button"
						class="rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors {tab === k ? 'bg-white/[0.07] text-fg' : 'text-fg-3 hover:bg-white/[0.03] hover:text-fg-2'}"
						onclick={() => (tab = k as typeof tab)}
					>
						{label}
					</button>
				{/each}
			</nav>
			<div class="relative min-w-0 flex-1 overflow-y-auto p-6">
				<button type="button" class="absolute top-4 right-4 rounded-lg p-1.5 text-fg-3 hover:bg-white/[0.05] hover:text-fg" onclick={onclose} aria-label="Close">
					<Icon icon={CloseIcon} size={16} />
				</button>

				{#if tab === 'agent'}
					<div class="space-y-6">
						<section class="space-y-2">
							<h3 class="text-[12.5px] font-medium text-fg">OpenAI API key</h3>
							<p class="text-[11.5px] leading-relaxed text-fg-3">
								Stored only in this browser and sent with each request to this app's server. Leave empty to use the server's key.
							</p>
							<div class="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-ink-900/70 px-2.5 focus-within:border-glow/40">
								<Icon icon={KeyIcon} size={14} class="text-fg-4" />
								<input
									type={showKey ? 'text' : 'password'}
									class="h-9 flex-1 bg-transparent font-mono text-[12px] text-fg outline-none placeholder:text-fg-4"
									placeholder="sk-…"
									autocomplete="off"
									spellcheck="false"
									value={s.apiKey}
									oninput={(e) => settings.update({ apiKey: e.currentTarget.value.trim() })}
								/>
								<button type="button" class="text-fg-4 hover:text-fg-2" onclick={() => (showKey = !showKey)} aria-label={showKey ? 'Hide key' : 'Show key'}>
									<Icon icon={showKey ? EyeOffIcon : EyeIcon} size={14} />
								</button>
							</div>
						</section>

						<section class="space-y-2">
							<h3 class="text-[12.5px] font-medium text-fg">Model</h3>
							<div class="grid grid-cols-2 gap-1.5">
								{#each MODELS as m (m.id)}
									<button
										type="button"
										class="rounded-lg border px-3 py-2 text-left transition-colors {s.model === m.id
											? 'border-glow/40 bg-glow/[0.08]'
											: 'border-white/[0.06] hover:border-white/[0.12]'}"
										onclick={() => settings.update({ model: m.id })}
									>
										<div class="text-[12.5px] text-fg">{m.name}</div>
										<div class="font-mono text-[10.5px] text-fg-4">{m.id} · {m.note}</div>
									</button>
								{/each}
							</div>
						</section>

						<section class="space-y-2">
							<div class="flex items-center">
								<h3 class="text-[12.5px] font-medium text-fg">System prompt</h3>
								{#if s.systemPrompt}
									<button type="button" class="ml-auto text-[11.5px] text-glow hover:underline" onclick={() => settings.update({ systemPrompt: '' })}>
										Reset to default
									</button>
								{/if}
							</div>
							<p class="text-[11.5px] leading-relaxed text-fg-3">
								Kept short on purpose: detailed playbooks live in the agent's skills and load when needed.
							</p>
							<textarea
								class="h-56 w-full resize-none rounded-lg border border-white/[0.08] bg-ink-900/70 p-3 font-mono text-[11.5px] leading-relaxed text-fg-2 outline-none focus:border-glow/40"
								value={s.systemPrompt || defaultPrompt}
								oninput={(e) => {
									const v = e.currentTarget.value;
									settings.update({ systemPrompt: v.trim() === defaultPrompt.trim() ? '' : v });
								}}
							></textarea>
						</section>
					</div>
				{:else if tab === 'view'}
					<div class="space-y-3">
						{#each [['autoRotate', 'Drift when idle', 'Slowly orbit the constellation after a few seconds without input.'], ['labels', 'Cluster labels', 'Show topic names over their clusters.']] as [k, label, hint] (k)}
							{@const on = s[k as 'autoRotate' | 'labels']}
							<button
								type="button"
								class="flex w-full items-center gap-4 rounded-xl border border-white/[0.06] px-4 py-3 text-left hover:border-white/[0.1]"
								onclick={() => settings.update({ [k]: !on })}
							>
								<div class="flex-1">
									<div class="text-[12.5px] text-fg">{label}</div>
									<div class="text-[11.5px] text-fg-3">{hint}</div>
								</div>
								<span class="relative h-5 w-9 rounded-full transition-colors {on ? 'bg-glow' : 'bg-white/10'}">
									<span class="absolute top-0.5 size-4 rounded-full bg-ink-950 transition-all duration-200 {on ? 'left-[18px]' : 'left-0.5'}"></span>
								</span>
							</button>
						{/each}
					</div>
				{:else}
					<div class="space-y-3">
						<div class="rounded-xl border border-white/[0.06] px-4 py-3">
							<div class="flex items-center">
								<div class="text-[12.5px] text-fg">Agent memory</div>
								{#if memory && !memory.empty}
									<button type="button" class="ml-auto text-[11.5px] text-bad hover:underline" onclick={forget}>Forget everything</button>
								{/if}
							</div>
							<div class="mt-0.5 text-[11.5px] text-fg-3">What Asterism remembers about you and your project across conversations.</div>
							{#await memory ?? loadMemory()}
								<div class="mt-3 h-16 animate-pulse rounded-lg bg-white/[0.03]"></div>
							{:then}
								{#if !memory || memory.empty}
									<div class="mt-3 flex items-start gap-2.5 rounded-lg bg-white/[0.02] px-3 py-2.5 text-[11.5px] leading-relaxed text-fg-3">
										<Icon icon={MemoryIcon} size={14} class="mt-px shrink-0 text-fg-4" />
										Nothing yet. Tell Asterism about your machines, sensors, markets or deadlines and it keeps short notes
										here, so it does not have to ask again.
									</div>
								{:else}
									<ul class="mt-3 max-h-56 space-y-1.5 overflow-y-auto rounded-lg bg-ink-900/60 px-3 py-2.5">
										{#each memoryLines(memory.content) as l, i (i)}
											<li class="flex gap-2 text-[12px] leading-relaxed text-fg-2">
												<span class="mt-[7px] size-1 shrink-0 rounded-full bg-glow/70"></span>{l}
											</li>
										{/each}
									</ul>
								{/if}
							{/await}
						</div>
						<div class="rounded-xl border border-white/[0.06] px-4 py-3">
							<div class="text-[12.5px] text-fg">Conversations</div>
							<div class="mt-0.5 text-[11.5px] text-fg-3">{chat.threads.length} saved in this browser.</div>
							<button
								type="button"
								class="mt-3 rounded-lg border border-bad/30 px-3 py-1.5 text-[12px] text-bad transition-colors hover:bg-bad/10"
								onclick={() => chat.clearAll()}
							>
								Delete all conversations
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
