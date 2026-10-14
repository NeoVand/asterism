<script lang="ts">
	/** A guided flight through the nine constellations, in the glossary's learning order. */
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import Icon from '#lib/ui/Icon.svelte';
	import {
		ChevronRightIcon,
		CloseIcon,
		TopicAIcon,
		TopicBIcon,
		TopicCIcon,
		TopicDIcon,
		TopicEIcon,
		TopicFIcon,
		TopicGIcon,
		TopicHIcon,
		TopicIIcon
	} from '#lib/ui/icons.ts';
	import { TOPIC_COLORS } from '#lib/graph/palette.ts';
	import { TOPICS } from '#lib/kg/types.ts';

	interface Props {
		onstep: (topic: number) => void;
		onclose: () => void;
	}

	let { onstep, onclose }: Props = $props();

	const ICONS = [TopicAIcon, TopicBIcon, TopicCIcon, TopicDIcon, TopicEIcon, TopicFIcon, TopicGIcon, TopicHIcon, TopicIIcon];
	const STEPS = [
		{ learn: 'Picture the machines, the sites and the people.', insight: 'In 12 of 13 US haul-truck collision deaths the truck was moving forward; smaller trucks and loaders back over people.' },
		{ learn: 'Follow a safety argument from hazard to release.', insight: 'Adding a brake command makes this a new safety-control function: failing to intervene and intervening when unsafe are separate hazards.' },
		{ learn: 'Know what each sensor measures and why it fails.', insight: 'Lidar in rain and fog is the best-validated case; dust is the biggest off-road gap and has no validated model.' },
		{ learn: 'Every test method, from a computer run to a shadow fleet.', insight: 'No single method builds valid job sites for every sensor: the evidence points to a hybrid “environment factory” anchored to surveyed sites.' },
		{ learn: 'Stopping distance, latency and the decision to brake.', insight: 'Off-road brakes deliver 0.60–2.94 m/s² against 5.0 m/s² for car AEB, and latency can be half the stopping distance.' },
		{ learn: 'Judge whether a test campaign proves what it claims.', insight: 'Zero misses in 299 independent trials shows a miss rate of at most 1% at 95% confidence — and frames are not trials.' },
		{ learn: 'Ask an assessor’s questions about a simulation.', insight: 'Every credibility framework asks for a context of use, validation data, uncertainty and a declared envelope; none sets a universal test percentage.' },
		{ learn: 'Place every standard, rule and precedent.', insight: 'The EU Machinery Regulation applies from 20 January 2027; South Africa has required automatic braking since December 2022.' },
		{ learn: 'Read the tool market and write the plan.', insight: 'The four months cannot be compressed — but most of the work can be moved in front of them.' }
	];

	let step = $state(0);
	let paused = $state(false);
	let timer: ReturnType<typeof setTimeout> | null = null;

	function go(i: number) {
		if (i >= STEPS.length) return onclose();
		step = Math.max(0, i);
		onstep(step);
		schedule();
	}

	function schedule() {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => {
			if (!paused) go(step + 1);
			else schedule();
		}, 7000);
	}

	onMount(() => {
		go(0);
		return () => {
			if (timer) clearTimeout(timer);
		};
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') onclose();
		else if (e.key === 'ArrowRight') go(step + 1);
		else if (e.key === 'ArrowLeft') go(step - 1);
	}}
/>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="pointer-events-auto absolute bottom-6 left-1/2 w-[520px] -translate-x-1/2"
	in:fly={{ y: 16, duration: 320 }}
	out:fade={{ duration: 180 }}
	onpointerenter={() => (paused = true)}
	onpointerleave={() => (paused = false)}
>
	<div class="glass-strong overflow-hidden rounded-2xl">
		{#key step}
			<div class="flex gap-3.5 px-5 pt-4 pb-3" in:fade={{ duration: 260 }}>
				<span
					class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl"
					style:background="{TOPIC_COLORS[step]}1f"
					style:color={TOPIC_COLORS[step]}
					style:box-shadow="0 0 22px -6px {TOPIC_COLORS[step]}"
				>
					<Icon icon={ICONS[step]} size={18} />
				</span>
				<div class="min-w-0">
					<div class="flex items-baseline gap-2">
						<span class="font-mono text-[10.5px] text-fg-4">{step + 1}/{STEPS.length}</span>
						<span class="text-[14px] font-semibold text-fg">{TOPICS[step].name}</span>
					</div>
					<p class="mt-0.5 text-[12px] text-fg-3">{STEPS[step].learn}</p>
					<p class="mt-2 text-[13px] leading-relaxed text-fg">{STEPS[step].insight}</p>
				</div>
			</div>
		{/key}
		<div class="flex items-center gap-1.5 px-5 pb-3.5">
			{#each STEPS as _, i (i)}
				<button
					type="button"
					class="h-1 rounded-full transition-all duration-500 {i === step ? 'w-6' : 'w-1.5 bg-white/15 hover:bg-white/30'}"
					style:background={i === step ? TOPIC_COLORS[i] : undefined}
					onclick={() => go(i)}
					aria-label={`Go to ${TOPICS[i].name}`}
				></button>
			{/each}
			<button type="button" class="ml-auto rounded-lg px-2 py-1 text-[11.5px] text-fg-3 hover:text-fg" onclick={onclose}>
				<span class="flex items-center gap-1"><Icon icon={CloseIcon} size={12} /> End tour</span>
			</button>
			<button
				type="button"
				class="flex items-center gap-1 rounded-lg bg-white/[0.07] px-2.5 py-1 text-[11.5px] text-fg transition-colors hover:bg-white/[0.12]"
				onclick={() => go(step + 1)}
			>
				{step === STEPS.length - 1 ? 'Finish' : 'Next'}
				<Icon icon={ChevronRightIcon} size={12} />
			</button>
		</div>
	</div>
</div>
