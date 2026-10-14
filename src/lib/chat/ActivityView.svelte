<script lang="ts">
	/** The agent's live work log: skills read, searches, hubs explored, researchers, blocks. */
	import { slide } from 'svelte/transition';
	import Icon from '#lib/ui/Icon.svelte';
	import {
		AskIcon,
		BlockIcon,
		ChevronDownIcon,
		ConnectIcon,
		GraphSearchIcon,
		ReadIcon,
		SkillIcon,
		SourcesIcon,
		SubagentIcon,
		ThinkIcon,
		TodoIcon,
		CheckIcon
	} from '#lib/ui/icons.ts';
	import { useAsterism } from '#lib/app/context.ts';
	import type { Msg, Step } from './chat.svelte.ts';

	interface Props {
		msg: Msg;
	}

	let { msg }: Props = $props();
	const app = useAsterism();

	const live = $derived(msg.status === 'streaming');
	let open = $state<boolean | null>(null);
	const expanded = $derived(open ?? live);

	function label(s: Step): { icon: typeof SkillIcon; text: string; detail?: string } {
		const a = s.args;
		const name = (id: unknown) => (typeof id === 'string' ? (app.brief(id)?.label ?? id) : '');
		switch (s.name) {
			case 'read_file': {
				const path = String(a.file_path ?? '');
				const skill = /\/skills\/([^/]+)\//.exec(path)?.[1];
				return { icon: SkillIcon, text: skill ? `Opened the ${skill.replace(/-/g, ' ')} playbook` : `Read ${path}` };
			}
			case 'search_graph':
				return { icon: GraphSearchIcon, text: `Searched “${a.query}”`, detail: s.summary?.replace(/^\d+ matches for “?"?[^"]*"?”?/, (m) => m.match(/^\d+ matches/)?.[0] ?? m) };
			case 'find_sources':
				return { icon: SourcesIcon, text: `Searched prior work “${a.query}”`, detail: s.summary?.match(/^\d+ sources/)?.[0] };
			case 'explore':
				return { icon: ConnectIcon, text: `Explored ${name(a.id)}` };
			case 'read_facts': {
				const ids = (a.ids as string[]) ?? [];
				return { icon: ReadIcon, text: `Read ${ids.length} ${ids.length === 1 ? 'fact' : 'facts'}` };
			}
			case 'connect':
				return { icon: ConnectIcon, text: `Traced ${name(a.from)} ↔ ${name(a.to)}` };
			case 'read_section':
				return { icon: ReadIcon, text: `Read the section of ${name(a.id)}` };
			case 'show_ui': {
				const t = (a.block as { type?: string; title?: string } | undefined) ?? {};
				return { icon: BlockIcon, text: `Built a ${t.type ?? 'block'}${t.title ? ` · ${t.title}` : ''}` };
			}
			case 'ask_user':
				return { icon: AskIcon, text: `Asked you ${((a.questions as unknown[]) ?? []).length} questions` };
			case 'write_todos':
				return { icon: TodoIcon, text: `Planned ${((a.todos as unknown[]) ?? []).length} steps` };
			default:
				return { icon: ReadIcon, text: s.name.replace(/_/g, ' ') };
		}
	}

	const mainSteps = $derived(msg.steps.filter((s) => s.agent === 'main' && s.name !== 'task'));
	const counts = $derived.by(() => {
		const c = { search: 0, facts: 0, hubs: 0 };
		for (const s of msg.steps) {
			if (s.name === 'search_graph' || s.name === 'find_sources') c.search++;
			if (s.name === 'read_facts') c.facts += ((s.args.ids as string[]) ?? []).length;
			if (s.name === 'explore') c.hubs++;
		}
		return c;
	});
	const seconds = $derived(((msg.endedAt ?? Date.now()) - msg.startedAt) / 1000);
	const summary = $derived(
		[
			counts.search ? `${counts.search} ${counts.search === 1 ? 'search' : 'searches'}` : '',
			counts.hubs ? `${counts.hubs} hubs` : '',
			counts.facts ? `${counts.facts} facts read` : '',
			msg.tasks.length ? `${msg.tasks.length} researcher${msg.tasks.length > 1 ? 's' : ''}` : ''
		]
			.filter(Boolean)
			.join(' · ')
	);
	const thought = $derived.by(() => {
		const r = msg.reasoning.trim();
		if (!r) return '';
		const parts = r.split(/\n+/).filter(Boolean);
		return parts[parts.length - 1].replace(/\*\*/g, '').slice(0, 140);
	});
	const visible = $derived(live ? mainSteps.slice(-7) : mainSteps);
</script>

{#if msg.steps.length || live}
	<div class="mb-2.5">
		<button
			type="button"
			class="group flex w-full items-center gap-2 py-1 text-left text-[11.5px] text-fg-3 transition-colors hover:text-fg-2"
			onclick={() => (open = !expanded)}
		>
			<span class="relative flex size-4 items-center justify-center">
				{#if live}
					<span class="absolute size-2 rounded-full bg-glow" style="animation: breathe 1.6s ease-in-out infinite"></span>
					<span class="absolute size-4 rounded-full bg-glow/20 blur-[3px]"></span>
				{:else}
					<Icon icon={CheckIcon} size={13} class="text-ok/80" />
				{/if}
			</span>
			<span class="truncate">
				{#if live}
					{msg.parts.length ? 'Writing' : 'Working'}{summary ? ` · ${summary}` : ''}
				{:else}
					{summary || 'Answered from memory'} · {seconds.toFixed(1)}s
				{/if}
			</span>
			<span class="ml-auto opacity-0 transition-opacity group-hover:opacity-100" class:rotate-180={expanded}>
				<Icon icon={ChevronDownIcon} size={13} />
			</span>
		</button>

		{#if expanded}
			<div transition:slide={{ duration: 220 }} class="mt-1 ml-[7px] border-l border-white/[0.07] pl-3.5">
				{#if live && thought && !msg.parts.length}
					<div class="flex items-start gap-2 py-[3px] text-[11.5px] text-fg-3 italic">
						<Icon icon={ThinkIcon} size={13} class="mt-px shrink-0 text-fg-4" />
						<span class="line-clamp-2">{thought}</span>
					</div>
				{/if}
				{#each visible as s (s.id)}
					{@const l = label(s)}
					<div class="flex items-start gap-2 py-[3px] text-[11.5px] leading-snug" in:slide={{ duration: 160 }}>
						<Icon
							icon={l.icon}
							size={13}
							class="mt-px shrink-0 {s.status === 'run' ? 'text-glow' : s.status === 'error' ? 'text-bad' : 'text-fg-4'}"
						/>
						<span class="min-w-0 flex-1 truncate {s.status === 'run' ? 'text-fg-2' : 'text-fg-3'}">{l.text}</span>
						{#if l.detail && s.status !== 'run'}
							<span class="shrink-0 font-mono text-[10.5px] text-fg-4">{l.detail}</span>
						{/if}
					</div>
				{/each}
				{#each msg.tasks as t, ti (t.id + ti)}
					{@const sub = msg.steps.filter((s) => s.agent === t.id)}
					<div class="py-[3px]" in:slide={{ duration: 160 }}>
						<div class="flex items-start gap-2 text-[11.5px] leading-snug">
							<Icon
								icon={SubagentIcon}
								size={13}
								class="mt-px shrink-0 {t.status === 'run' ? 'text-[#a78bfa]' : 'text-fg-4'}"
							/>
							<span class="min-w-0 flex-1 {t.status === 'run' ? 'text-fg-2' : 'text-fg-3'}">
								<span class="text-fg-2">Researcher</span> · <span class="line-clamp-2 inline">{t.description}</span>
							</span>
							<span class="shrink-0 font-mono text-[10.5px] text-fg-4">{sub.length} steps</span>
						</div>
					</div>
				{/each}
				{#if msg.todos.length}
					<div class="mt-1 space-y-[3px] py-1">
						{#each msg.todos as td, i (i)}
							<div class="flex items-center gap-2 text-[11.5px]">
								<span
									class="size-[7px] shrink-0 rounded-full border {td.status === 'completed'
										? 'border-ok/70 bg-ok/70'
										: td.status === 'in_progress'
											? 'border-glow bg-glow/30'
											: 'border-fg-4'}"
								></span>
								<span class={td.status === 'completed' ? 'text-fg-4 line-through' : 'text-fg-3'}>{td.content}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
