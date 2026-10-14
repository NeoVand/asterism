<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import GraphCanvas from '#lib/graph/GraphCanvas.svelte';
	import SceneLabels from '#lib/graph/SceneLabels.svelte';
	import NodeCard from '#lib/graph/NodeCard.svelte';
	import SearchPalette from '#lib/graph/SearchPalette.svelte';
	import ChatPanel from '#lib/chat/ChatPanel.svelte';
	import SettingsModal from '#lib/chat/SettingsModal.svelte';
	import Tour from '#lib/app/Tour.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import {
		CloseIcon,
		FocusIcon,
		LogoIcon,
		MinusIcon,
		PlusIcon,
		ResetIcon,
		BundleIcon,
		SearchIcon
	} from '#lib/ui/icons.ts';
	import { tip } from '#lib/ui/tooltip.ts';
	import { decodeGraph, type ClientGraph, type GraphWire } from '#lib/graph/types.ts';
	import type { GraphRenderer } from '#lib/graph/GraphRenderer.ts';
	import { provideAsterism, type NodeDetail } from '#lib/app/context.ts';
	import { chat, citedIds, type Msg } from '#lib/chat/chat.svelte.ts';
	import { settings } from '#lib/chat/settings.svelte.ts';
	import { uploads } from '#lib/chat/uploads.svelte.ts';
	import { UploadIcon } from '#lib/ui/icons.ts';

	const PANEL = 468; // chat panel width + gutters

	let graph = $state.raw<ClientGraph | null>(null);
	let renderer = $state.raw<GraphRenderer | null>(null);
	/** The graph the renderer is actually showing (lights need it). */
	let shownGraph = $state.raw<ClientGraph | null>(null);
	let index = new Map<string, number>();
	let hovered = $state<number | null>(null);
	let selected = $state<string | null>(null);
	let paletteOpen = $state(false);
	let settingsOpen = $state(false);
	let cited = $state<{ index: number; n: number }[]>([]);
	let answerIds = $state<string[]>([]);
	let meta = $state<{ defaultPrompt: string; types: Record<string, number>; edges: number } | null>(
		null
	);
	let error = $state('');
	let settled = $state(false);
	let panel: ChatPanel;
	let adjacency: Map<number, number[]> | null = null;

	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- request cache, not state
	const detailCache = new Map<string, Promise<NodeDetail | null>>();
	const idx = (ids: string[]) =>
		ids.map((id) => index.get(id)).filter((i): i is number => i != null);

	function provideSelect(id: string) {
		ctx.select(id);
	}

	const ctx = provideAsterism({
		brief(id) {
			// Read the graph first so callers' derivations re-run once it loads.
			if (!graph) return null;
			const i = index.get(id);
			if (i == null) return null;
			return {
				id,
				type: graph.types[i],
				label: graph.labels[i],
				topic: graph.topics[i],
				chapter: graph.chapters[i]
			};
		},
		detail(id) {
			if (!detailCache.has(id))
				detailCache.set(
					id,
					fetch(`/api/node/${encodeURIComponent(id)}`).then((r) =>
						r.ok ? (r.json() as Promise<NodeDetail>) : null
					)
				);
			return detailCache.get(id)!;
		},
		spotlight(ids) {
			renderer?.spotlight(ids ? idx(ids) : null);
		},
		select(id) {
			const i = index.get(id);
			if (i == null) return;
			selected = id;
			renderer?.spotlight(null);
			renderer?.light([i], 'read');
			renderer?.flyTo([i], { distance: 300 });
		},
		ask(text) {
			panel?.ask(text, true);
		}
	});

	function applyCitations(msg: Msg, flyTo = false) {
		if (!renderer) return;
		const ids = citedIds(msg);
		const list = idx(ids);
		answerIds = ids;
		renderer.light(list, 'cited');
		renderer.setTrail(list.slice(0, 40));
		cited = list.slice(0, 14).map((index, k) => ({ index, n: k + 1 }));
		if (flyTo && list.length) renderer.flyTo(list.slice(0, 30));
	}

	let textTimer: ReturnType<typeof setTimeout> | null = null;
	let litThread: string | null | undefined = undefined;
	chat.hooks = {
		turnStart() {
			litThread = chat.currentId;
			renderer?.clearLights();
			renderer?.overview();
			cited = [];
			answerIds = [];
			selected = null;
		},
		graph(mode, ids) {
			renderer?.light(idx(ids), mode === 'read' ? 'read' : 'touched');
		},
		text(msg) {
			if (textTimer) return;
			textTimer = setTimeout(() => {
				textTimer = null;
				applyCitations(msg);
			}, 250);
		},
		turnEnd(msg) {
			if (msg.status !== 'waiting') applyCitations(msg, true);
		}
	};

	// Re-light a conversation's answer when it is opened from history.
	$effect(() => {
		const id = chat.currentId;
		if (!renderer || !shownGraph || chat.busy || id === litThread) return;
		litThread = id;
		const last = chat.current?.messages.findLast((m) => m.role === 'assistant');
		renderer.clearLights();
		cited = [];
		answerIds = [];
		if (last) {
			renderer.light(idx(last.read), 'read');
			applyCitations(last, true);
		}
	});

	$effect(() => {
		if (renderer) renderer.autoRotate = settings.value.autoRotate;
	});

	$effect(() => {
		renderer?.setFlat(settings.value.flat);
		renderer?.setBundled(settings.value.bundle);
	});

	$effect(() => {
		renderer?.setSelected(selected ? (index.get(selected) ?? null) : null);
	});

	let dragging = $state(false);
	let touring = $state(false);

	/** The best-connected concepts and entities of a topic: what a tour step lights up. */
	function topicHubs(t: number, count: number): number[] {
		if (!graph) return [];
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local tally
		const deg = new Map<number, number>();
		for (let e = 0; e < graph.edgeSrc.length; e++) {
			const a = graph.edgeSrc[e];
			const b = graph.edgeDst[e];
			deg.set(a, (deg.get(a) ?? 0) + 1);
			deg.set(b, (deg.get(b) ?? 0) + 1);
		}
		const list: number[] = [];
		for (let i = 0; i < graph.ids.length; i++)
			if (graph.topics[i] === t && (graph.types[i] === 'term' || graph.types[i] === 'entity'))
				list.push(i);
		return list.sort((a, b) => (deg.get(b) ?? 0) - (deg.get(a) ?? 0)).slice(0, count);
	}

	function tourStep(t: number) {
		if (!renderer) return;
		selected = null;
		renderer.clearLights();
		cited = [];
		answerIds = [];
		const hubs = topicHubs(t, 40);
		renderer.light(hubs, 'read');
		renderer.light(hubs.slice(0, 8), 'cited');
		cited = hubs.slice(0, 6).map((index, k) => ({ index, n: k + 1 }));
		renderer.flyTo(hubs.slice(0, 24), { duration: 1600 });
	}

	function endTour() {
		touring = false;
		renderer?.clearLights();
		cited = [];
		renderer?.resetView();
	}

	async function reloadGraph() {
		const w = (await (await fetch('/api/graph')).json()) as GraphWire;
		const g = decodeGraph(w);
		index = new Map(g.ids.map((id, i) => [id, i]));
		adjacency = null;
		detailCache.clear();
		graph = g;
	}

	function showUpload(ids: string[]) {
		const list = idx(ids);
		renderer?.light(list, 'cited', true);
		renderer?.flyTo(list);
	}

	uploads.onDone = async (r) => {
		await reloadGraph();
		// Let the new stars settle in before flying to them.
		setTimeout(() => showUpload(r.facts), 900);
		fetch('/api/meta')
			.then((res) => (res.ok ? res.json() : null))
			.then((m) => m && (meta = m));
	};

	onMount(() => {
		settings.load();
		chat.load();
		fetch('/api/meta')
			.then((r) => (r.ok ? r.json() : null))
			.then((m) => m && (meta = m));
		fetch('/api/graph')
			.then((r) => r.json())
			.then((w: GraphWire) => {
				const g = decodeGraph(w);
				index = new Map(g.ids.map((id, i) => [id, i]));
				graph = g;
			})
			.catch((e) => (error = String(e)));
	});

	function neighbors(id: string) {
		const i = index.get(id);
		if (i == null || !graph || !renderer) return;
		if (!adjacency) {
			// eslint-disable-next-line svelte/prefer-svelte-reactivity -- lazily built lookup, not state
			adjacency = new Map();
			for (let e = 0; e < graph.edgeSrc.length; e++) {
				const s = graph.edgeSrc[e];
				const t = graph.edgeDst[e];
				if (!adjacency.has(s)) adjacency.set(s, []);
				if (!adjacency.has(t)) adjacency.set(t, []);
				adjacency.get(s)!.push(t);
				adjacency.get(t)!.push(s);
			}
		}
		const nb = adjacency.get(i) ?? [];
		renderer.light(nb, 'touched');
		renderer.light([i], 'read');
		renderer.flyTo([i, ...nb.slice(0, 200)]);
	}

	function flyTopic(t: number) {
		if (!graph || !renderer) return;
		const list: number[] = [];
		for (let i = 0; i < graph.topics.length; i++)
			if (graph.topics[i] === t && (graph.types[i] === 'term' || graph.types[i] === 'entity'))
				list.push(i);
		renderer.flyTo(list);
	}

	const stats = $derived(
		meta?.types
			? {
					facts: meta.types.fact ?? 0,
					sources: meta.types.source ?? 0,
					concepts: meta.types.term ?? 0
				}
			: null
	);
	const answerChapters = $derived(
		new Set(
			answerIds.map((id) => graph?.chapters[index.get(id) ?? -1]).filter((c) => c != null && c > 0)
		).size
	);
</script>

<svelte:window
	onkeydown={(e) => {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			paletteOpen = !paletteOpen;
		} else if (e.key === 'Escape' && !paletteOpen && !settingsOpen) {
			selected = null;
		} else if (e.key === '/' && document.activeElement === document.body) {
			e.preventDefault();
			panel?.focus();
		}
	}}
/>

<svelte:document
	ondragover={(e) => {
		if (e.dataTransfer?.types.includes('Files')) {
			e.preventDefault();
			dragging = true;
		}
	}}
	ondragleave={(e) => {
		if (!e.relatedTarget) dragging = false;
	}}
	ondrop={(e) => {
		if (!e.dataTransfer?.files.length) return;
		e.preventDefault();
		dragging = false;
		uploads.upload(e.dataTransfer.files[0]);
	}}
/>

<main class="relative h-screen w-screen overflow-hidden bg-ink-950 select-none">
	{#if dragging}
		<div
			class="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/55 backdrop-blur-sm"
			transition:fade={{ duration: 150 }}
		>
			<div
				class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-glow/40 bg-ink-900/70 px-10 py-8"
			>
				<Icon icon={UploadIcon} size={28} class="text-glow" />
				<div class="text-[14px] font-medium text-fg">Drop to weave it into the graph</div>
				<div class="text-[12px] text-fg-3">
					Markdown or plain text · facts are extracted and linked to what the research already knows
				</div>
			</div>
		</div>
	{/if}
	<GraphCanvas
		{graph}
		ongraph={(g) => (shownGraph = g)}
		onready={(r) => {
			renderer = r;
			r.setInsetRight(PANEL);
			r.autoRotate = settings.value.autoRotate;
			// Before the graph arrives, so the first layout starts in the chosen view.
			r.setFlat(settings.value.flat);
			r.setBundled(settings.value.bundle);
		}}
		onhover={(i) => (hovered = i)}
		onselect={(i) => {
			if (i == null) {
				selected = null;
				return;
			}
			const id = graph?.ids[i];
			if (id) {
				selected = id;
				renderer?.light([i], 'read');
			}
		}}
		onsettled={() => (settled = true)}
		onunsettled={() => (settled = false)}
		onerror={(m) => (error = m)}
	/>

	<div class="pointer-events-none absolute inset-y-0 left-0" style:right="{PANEL}px">
		<SceneLabels
			{renderer}
			{graph}
			{hovered}
			{cited}
			onpick={(i) => graph && provideSelect(graph.ids[i])}
			showTopics={settings.value.labels}
			dimTopics={cited.length > 0 || chat.busy}
			ontopic={flyTopic}
		/>

		<div
			class="pointer-events-auto absolute top-4 left-4 flex items-center gap-2.5"
			in:fade={{ duration: 600 }}
		>
			<div
				class="relative flex size-9 items-center justify-center rounded-xl border border-white/10 bg-ink-900/70 text-glow backdrop-blur-md"
			>
				<div class="absolute inset-0 rounded-xl bg-glow/10 blur-md"></div>
				<Icon icon={LogoIcon} size={19} stroke={1.5} class="relative" />
			</div>
			<div class="leading-tight [text-shadow:0_1px_10px_rgb(0_0_0/0.8)]">
				<div class="text-[14px] font-semibold tracking-tight text-fg">Asterism</div>
				<div class="text-[11px] text-fg-3">Collision mitigation · virtual validation research</div>
			</div>
		</div>

		<button
			type="button"
			class="pointer-events-auto absolute top-4 left-1/2 flex h-9 w-[340px] -translate-x-1/2 items-center gap-2.5 rounded-xl border border-white/[0.08] bg-ink-900/60 px-3 text-[12.5px] text-fg-4 backdrop-blur-md transition-colors hover:border-white/[0.14] hover:text-fg-3"
			onclick={() => (paletteOpen = true)}
		>
			<Icon icon={SearchIcon} size={15} />
			Search the graph…
			<kbd class="ml-auto rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
		</button>

		{#if selected}
			<div class="absolute top-[68px] bottom-16 left-4 flex items-start">
				{#key selected}
					<svelte:boundary onerror={(e) => console.error('node card failed to render', e)}>
						<NodeCard id={selected} onclose={() => (selected = null)} onneighbors={neighbors} />
						{#snippet failed()}{/snippet}
					</svelte:boundary>
				{/key}
			</div>
		{/if}

		{#if touring}
			<Tour onstep={tourStep} onclose={endTour} />
		{/if}

		{#if answerIds.length && !chat.busy && !touring}
			<div
				class="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2"
				transition:fly={{ y: 10, duration: 300 }}
			>
				<div
					class="flex items-center gap-2.5 rounded-full border border-gold/20 bg-ink-900/70 py-1.5 pr-1.5 pl-3.5 text-[12px] whitespace-nowrap text-fg-2 backdrop-blur-md"
				>
					<span class="size-1.5 rounded-full bg-gold shadow-[0_0_10px_var(--color-gold)]"></span>
					Answer constellation · {answerIds.length} cited{answerChapters
						? ` · ${answerChapters} ${answerChapters === 1 ? 'chapter' : 'chapters'}`
						: ''}
					<button
						type="button"
						class="rounded-full p-1 text-fg-4 transition-colors hover:bg-white/[0.06] hover:text-fg"
						onclick={() => renderer?.flyTo(idx(answerIds).slice(0, 30))}
						use:tip={'Frame it'}
						aria-label="Frame the answer"
					>
						<Icon icon={FocusIcon} size={13} />
					</button>
					<button
						type="button"
						class="rounded-full p-1 text-fg-4 transition-colors hover:bg-white/[0.06] hover:text-fg"
						onclick={() => {
							renderer?.clearLights();
							cited = [];
							answerIds = [];
						}}
						use:tip={'Clear'}
						aria-label="Clear the highlight"
					>
						<Icon icon={CloseIcon} size={13} />
					</button>
				</div>
			</div>
		{/if}

		<div
			class="absolute bottom-4 left-4 flex items-center gap-3 font-mono text-[10.5px] text-fg-4 [text-shadow:0_1px_8px_rgb(0_0_0/0.9)]"
		>
			{#if graph}
				<span class="flex items-center gap-1.5">
					<span
						class="size-1.5 rounded-full {chat.busy
							? 'bg-glow'
							: settled
								? 'bg-ok/80'
								: 'bg-warn/80'}"
						style:animation={chat.busy || !settled ? 'breathe 1.6s ease-in-out infinite' : ''}
					></span>
					{chat.busy
						? 'agent working'
						: settled
							? renderer?.backend === 'webgpu'
								? 'WebGPU'
								: 'WebGL'
							: 'laying out'}
				</span>
				<span>{graph.ids.length.toLocaleString()} nodes</span>
				<span>{graph.edgeSrc.length.toLocaleString()} links</span>
			{:else if error}
				<span class="text-bad">{error}</span>
			{:else}
				<span>loading graph…</span>
			{/if}
		</div>

		<div
			class="pointer-events-auto absolute right-4 bottom-4 flex flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-ink-900/60 backdrop-blur-md"
		>
			<button
				type="button"
				class="flex size-8 items-center justify-center font-mono text-[10.5px] font-medium text-fg-3 transition-colors hover:bg-white/[0.06] hover:text-fg"
				onclick={() => settings.update({ flat: !settings.value.flat })}
				aria-label={settings.value.flat ? 'Switch to the 3D view' : 'Switch to the flat 2D map'}
				use:tip={settings.value.flat ? '3D constellation' : 'Flat 2D map'}
			>
				{settings.value.flat ? '3D' : '2D'}
			</button>
			<button
				type="button"
				class="flex size-8 items-center justify-center transition-colors hover:bg-white/[0.06] {settings
					.value.bundle
					? 'text-glow'
					: 'text-fg-3 hover:text-fg'}"
				onclick={() => settings.update({ bundle: !settings.value.bundle })}
				aria-label={settings.value.bundle ? 'Unbundle edges' : 'Bundle edges'}
				aria-pressed={settings.value.bundle}
				use:tip={settings.value.bundle ? 'Edges bundled' : 'Bundle edges'}
			>
				<Icon icon={BundleIcon} size={15} />
			</button>
			<div class="mx-2 h-px bg-white/[0.07]"></div>
			{#each [{ icon: PlusIcon, label: 'Zoom in', go: () => renderer?.zoom(0.7) }, { icon: MinusIcon, label: 'Zoom out', go: () => renderer?.zoom(1.4) }, { icon: ResetIcon, label: 'Reset view', go: () => renderer?.resetView() }] as c (c.label)}
				<button
					type="button"
					class="flex size-8 items-center justify-center text-fg-3 transition-colors hover:bg-white/[0.06] hover:text-fg"
					onclick={c.go}
					aria-label={c.label}
					use:tip={c.label}
				>
					<Icon icon={c.icon} size={15} />
				</button>
			{/each}
		</div>
	</div>

	<div class="absolute top-3 right-3 bottom-3" style:width="{PANEL - 24}px">
		<ChatPanel
			bind:this={panel}
			{stats}
			onopensettings={() => (settingsOpen = true)}
			onshowupload={showUpload}
			ontour={() => (touring = true)}
		/>
	</div>

	<SearchPalette open={paletteOpen} onclose={() => (paletteOpen = false)} />
	<SettingsModal
		open={settingsOpen}
		defaultPrompt={meta?.defaultPrompt ?? ''}
		onclose={() => (settingsOpen = false)}
	/>
</main>
