<script lang="ts">
	import Icon from '#lib/ui/Icon.svelte';
	import { PlusIcon, SendIcon, StopIcon, SparklesIcon } from '#lib/ui/icons.ts';
	import { tip } from '#lib/ui/tooltip.ts';
	import { settings, MODELS } from './settings.svelte.ts';

	interface Props {
		busy: boolean;
		waiting: boolean;
		onsend: (text: string) => void;
		onstop: () => void;
		onopensettings: () => void;
		onattach: () => void;
	}

	let { busy, waiting, onsend, onstop, onopensettings, onattach }: Props = $props();
	let text = $state('');
	let area: HTMLTextAreaElement;

	export function fill(t: string, send = false) {
		text = t;
		requestAnimationFrame(() => {
			resize();
			area?.focus();
			if (send) submit();
		});
	}

	export function focus() {
		area?.focus();
	}

	function resize() {
		if (!area) return;
		area.style.height = 'auto';
		area.style.height = `${Math.min(area.scrollHeight, 168)}px`;
	}

	function submit() {
		if (!text.trim() || busy) return;
		onsend(text);
		text = '';
		requestAnimationFrame(resize);
	}

	const model = $derived(
		MODELS.find((m) => m.id === settings.value.model)?.name ?? settings.value.model
	);
</script>

<div
	class="rounded-2xl border border-white/[0.08] bg-ink-850/80 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.9)] transition-[border-color,box-shadow] duration-200 focus-within:border-glow/30 focus-within:shadow-[0_0_0_3px_rgba(111,227,255,0.06),0_10px_40px_-18px_rgba(0,0,0,0.9)]"
>
	<textarea
		bind:this={area}
		bind:value={text}
		rows="1"
		disabled={waiting}
		placeholder={waiting
			? 'Answer the questions above to continue…'
			: 'Ask, plan, or explore the research…'}
		class="block max-h-[168px] w-full resize-none bg-transparent px-4 pt-3 pb-1 text-[13.5px] leading-relaxed text-fg outline-none placeholder:text-fg-4 disabled:cursor-not-allowed"
		oninput={resize}
		onkeydown={(e) => {
			if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
				e.preventDefault();
				submit();
			}
		}}></textarea>
	<div class="flex items-center gap-1.5 px-2.5 pb-2.5">
		<button
			type="button"
			class="flex size-7 items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-white/[0.05] hover:text-fg"
			onclick={onattach}
			aria-label="Add a document"
			use:tip={'Weave a document into the graph (.md, .txt) — or drop it anywhere'}
		>
			<Icon icon={PlusIcon} size={16} />
		</button>
		<button
			type="button"
			class="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] transition-colors {settings
				.value.deep
				? 'bg-[#a78bfa]/15 text-[#c4b5fd]'
				: 'text-fg-3 hover:bg-white/[0.04] hover:text-fg-2'}"
			onclick={() => settings.update({ deep: !settings.value.deep })}
			use:tip={settings.value.deep
				? 'Deep research on: more reasoning, parallel researchers'
				: 'Turn on deep research for broad, multi-part questions'}
			aria-pressed={settings.value.deep}
		>
			<Icon icon={SparklesIcon} size={13} />
			Deep research
		</button>
		<button
			type="button"
			class="rounded-lg px-2 py-1 font-mono text-[11px] text-fg-4 transition-colors hover:bg-white/[0.04] hover:text-fg-2"
			onclick={onopensettings}
			use:tip={'Model and API key'}
		>
			{model}
		</button>
		<div class="ml-auto">
			{#if busy}
				<button
					type="button"
					class="flex size-8 items-center justify-center rounded-full bg-white/10 text-fg transition-colors hover:bg-white/15"
					onclick={onstop}
					aria-label="Stop"
				>
					<Icon icon={StopIcon} size={14} />
				</button>
			{:else}
				<button
					type="button"
					disabled={!text.trim() || waiting}
					class="flex size-8 items-center justify-center rounded-full bg-glow text-ink-950 shadow-[0_0_18px_-4px_var(--color-glow)] transition-all duration-200 enabled:hover:scale-105 enabled:hover:brightness-110 disabled:bg-white/[0.07] disabled:text-fg-4 disabled:shadow-none"
					onclick={submit}
					aria-label="Send"
				>
					<Icon icon={SendIcon} size={16} stroke={2} />
				</button>
			{/if}
		</div>
	</div>
</div>
