<script lang="ts">
	/** Citation chips for one or more graph ids. Hover lights the nodes; click flies to them. */
	import { useAsterism, useCiteNumbering } from '#lib/app/context.ts';
	import { TOPIC_COLORS } from '#lib/graph/palette.ts';

	interface Props {
		ids: string[];
	}

	let { ids }: Props = $props();
	const app = useAsterism();
	const numbering = useCiteNumbering();

	const items = $derived(
		[...new Set(ids)]
			.map((id) => ({ id, brief: app?.brief(id) ?? null }))
			.filter((x) => x.brief)
			.map((x) => ({ ...x, n: numbering?.number(x.id) ?? 0 }))
	);
</script>

{#if items.length}
	<span class="inline-flex translate-y-[-1px] gap-0.5 align-middle">
		{#each items as it (it.id)}
			<button
				type="button"
				class="cite inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-[5px] px-1 font-mono text-[10px] leading-none font-medium text-ink-950 transition-[transform,filter] duration-150 hover:scale-110 hover:brightness-125"
				style:background={TOPIC_COLORS[it.brief!.topic]}
				data-id={it.id}
				onpointerenter={() => app.spotlight([it.id])}
				onpointerleave={() => app.spotlight(null)}
				onclick={() => app.select(it.id)}
				aria-label={`Source ${it.n}: ${it.brief!.label}`}
			>
				{it.n || '•'}
			</button>
		{/each}
	</span>
{/if}
