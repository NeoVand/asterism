<script lang="ts">
	/** In-chat form for the agent's ask_user questions. Answers resume the paused agent. */
	import type { Answers, QuestionForm } from '#lib/blocks/schema.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import { AskIcon, CheckIcon } from '#lib/ui/icons.ts';

	interface Props {
		form: QuestionForm;
		answers?: Answers | 'skipped';
		active: boolean;
		onsubmit: (answers: Answers | 'skipped') => void;
	}

	let { form, answers, active, onsubmit }: Props = $props();

	let values = $state<Answers>({});
	let other = $state<Record<string, string>>({});

	$effect.pre(() => {
		for (const q of form.questions) {
			if (values[q.id] !== undefined) continue;
			if (q.kind === 'multi') values[q.id] = [];
			else if (q.kind === 'scale') values[q.id] = Math.round(((q.min ?? 0) + (q.max ?? 10)) / 2);
			else values[q.id] = '';
		}
	});

	function toggle(id: string, opt: string) {
		const cur = (values[id] as string[]) ?? [];
		values[id] = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt];
	}

	const ready = $derived(
		form.questions.every((q) => {
			const v = values[q.id];
			if (q.kind === 'multi') return (v as string[])?.length > 0;
			if (q.kind === 'scale') return true;
			return typeof v === 'string' && v.trim().length > 0;
		})
	);

	function submit() {
		const out: Answers = {};
		for (const q of form.questions) {
			const v = values[q.id];
			if (q.kind === 'single' && v === '__other') out[q.id] = other[q.id] ?? '';
			else out[q.id] = v;
		}
		onsubmit(out);
	}

	function shown(v: string | string[] | number | undefined) {
		if (Array.isArray(v)) return v.join(', ');
		return v == null || v === '' ? '—' : String(v);
	}
</script>

<div class="my-2 overflow-hidden rounded-xl border border-glow/20 bg-glow/[0.035]">
	<div class="flex items-center gap-2 border-b border-white/[0.06] px-3.5 py-2.5">
		<Icon icon={AskIcon} size={14} class="text-glow" />
		<span class="text-[13px] font-medium text-fg">{form.title}</span>
	</div>
	{#if answers}
		<div class="space-y-1.5 px-3.5 py-3 text-[12px]">
			{#if answers === 'skipped'}
				<div class="text-fg-3">Skipped — the agent proceeded with stated assumptions.</div>
			{:else}
				{#each form.questions as q (q.id)}
					<div class="flex gap-2">
						<Icon icon={CheckIcon} size={13} class="mt-0.5 shrink-0 text-ok/80" />
						<div class="min-w-0">
							<div class="text-[11px] text-fg-3">{q.label}</div>
							<div class="text-fg">
								{shown(answers[q.id])}{q.unit && typeof answers[q.id] === 'number'
									? ` ${q.unit}`
									: ''}
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{:else}
		<div class="space-y-4 px-3.5 py-3.5">
			{#if form.intro}<p class="text-[12px] leading-relaxed text-fg-2">{form.intro}</p>{/if}
			{#each form.questions as q (q.id)}
				<fieldset class="space-y-2">
					<legend class="text-[12.5px] font-medium text-fg">{q.label}</legend>
					{#if q.hint}<p class="-mt-1 text-[11.5px] text-fg-3">{q.hint}</p>{/if}
					{#if q.kind === 'single' || q.kind === 'multi'}
						<div class="flex flex-wrap gap-1.5">
							{#each q.options ?? [] as opt (opt)}
								{@const on =
									q.kind === 'multi'
										? ((values[q.id] as string[]) ?? []).includes(opt)
										: values[q.id] === opt}
								<button
									type="button"
									disabled={!active}
									class="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] transition-all duration-150 {on
										? 'border-glow/80 bg-glow/20 text-white shadow-[0_0_16px_-4px_var(--color-glow)]'
										: 'border-white/[0.08] bg-white/[0.02] text-fg-2 hover:border-white/20 hover:text-fg'}"
									aria-pressed={on}
									onclick={() => (q.kind === 'multi' ? toggle(q.id, opt) : (values[q.id] = opt))}
								>
									{#if on}<Icon icon={CheckIcon} size={12} stroke={2.2} class="text-glow" />{/if}
									{opt}
								</button>
							{/each}
							{#if q.kind === 'single'}
								<button
									type="button"
									disabled={!active}
									class="rounded-lg border px-2.5 py-1 text-[12px] transition-all duration-150 {values[
										q.id
									] === '__other'
										? 'border-glow/50 bg-glow/15 text-fg'
										: 'border-dashed border-white/[0.12] text-fg-3 hover:text-fg-2'}"
									onclick={() => (values[q.id] = '__other')}
								>
									Other…
								</button>
							{/if}
						</div>
						{#if values[q.id] === '__other'}
							<input
								class="w-full rounded-lg border border-white/[0.08] bg-ink-900/70 px-2.5 py-1.5 text-[12.5px] text-fg outline-none placeholder:text-fg-4 focus:border-glow/40"
								placeholder="Your answer"
								bind:value={other[q.id]}
							/>
						{/if}
					{:else if q.kind === 'text'}
						<input
							class="w-full rounded-lg border border-white/[0.08] bg-ink-900/70 px-2.5 py-1.5 text-[12.5px] text-fg outline-none placeholder:text-fg-4 focus:border-glow/40"
							placeholder={q.hint ?? 'Type an answer'}
							disabled={!active}
							bind:value={values[q.id]}
						/>
					{:else}
						<div class="flex items-center gap-3">
							<input
								type="range"
								class="h-1 flex-1 cursor-pointer accent-[var(--color-glow)]"
								min={q.min ?? 0}
								max={q.max ?? 10}
								disabled={!active}
								bind:value={values[q.id]}
							/>
							<span class="w-20 text-right font-mono text-[12px] text-fg"
								>{values[q.id]}{q.unit ? ` ${q.unit}` : ''}</span
							>
						</div>
					{/if}
				</fieldset>
			{/each}
			{#if active}
				<div class="flex items-center justify-end gap-2 pt-1">
					<button
						type="button"
						class="rounded-lg px-3 py-1.5 text-[12px] text-fg-3 transition-colors hover:text-fg"
						onclick={() => onsubmit('skipped')}
					>
						Skip
					</button>
					<button
						type="button"
						disabled={!ready}
						class="rounded-lg bg-glow px-3.5 py-1.5 text-[12px] font-medium text-ink-950 transition-all duration-150 enabled:hover:brightness-110 disabled:opacity-35"
						onclick={submit}
					>
						Continue
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
