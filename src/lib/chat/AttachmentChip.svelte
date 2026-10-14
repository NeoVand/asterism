<script lang="ts">
	/**
	 * A node, a node with its neighbours, or a search's matches attached to a message. Hover lights
	 * them in the graph; a node chip opens its card.
	 */
	import Icon from '#lib/ui/Icon.svelte';
	import { CloseIcon, SearchIcon, ConnectIcon } from '#lib/ui/icons.ts';
	import { useAsterism } from '#lib/app/context.ts';
	import { TOPIC_COLORS } from '#lib/graph/palette.ts';
	import { chipText } from './attachments.svelte.ts';
	import type { Attachment } from './protocol.ts';

	interface Props {
		chip: Attachment;
		/** Shown in the composer: a remove button. */
		onremove?: () => void;
	}

	let { chip, onremove }: Props = $props();
	const app = useAsterism();

	const brief = $derived(chip.kind === 'search' ? null : app?.brief(chip.ids[0]));
	const text = $derived(chipText(chip));
	const color = $derived(brief ? TOPIC_COLORS[brief.topic] : 'var(--color-glow)');
</script>

<span
	class="group/chip inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] pr-1 pl-2 text-[12px] text-fg-2 transition-colors hover:border-white/[0.16] hover:text-fg"
	role="group"
	aria-label="Attached: {text.label}{text.count ? `, ${text.count}` : ''}"
	onpointerenter={() => app?.spotlight(chip.ids)}
	onpointerleave={() => app?.spotlight(null)}
>
	{#if chip.kind === 'search'}
		<Icon icon={SearchIcon} size={12} class="shrink-0 text-fg-3" />
	{:else}
		<span
			class="size-1.5 shrink-0 rounded-full"
			style:background={color}
			style:box-shadow="0 0 6px {color}"
		></span>
	{/if}
	<button
		type="button"
		class="min-w-0 truncate text-left"
		onclick={() => chip.kind !== 'search' && app?.select(chip.ids[0])}
		tabindex={chip.kind === 'search' ? -1 : 0}
	>
		{text.label}
	</button>
	{#if text.count}
		<span class="flex shrink-0 items-center gap-1 font-mono text-[10.5px] text-fg-4">
			{#if chip.kind === 'neighbors'}<Icon icon={ConnectIcon} size={11} />{/if}{text.count}
		</span>
	{/if}
	{#if onremove}
		<button
			type="button"
			class="grid size-5 shrink-0 place-items-center rounded-md text-fg-4 transition-colors hover:bg-white/[0.08] hover:text-fg"
			onclick={onremove}
			aria-label="Remove {text.label}"
		>
			<Icon icon={CloseIcon} size={11} />
		</button>
	{:else}
		<span class="w-1"></span>
	{/if}
</span>
