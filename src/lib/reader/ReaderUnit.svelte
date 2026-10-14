<script lang="ts">
	/**
	 * One unit of a document (a chapter, a part, a guide), rendered as a page. The text knows
	 * which facts it holds: hovering a passage lights its star, clicking selects it, the facts
	 * the current answer cites are underlined, and the passage on screen can light up in the graph
	 * as you read. Diagrams are drawn when they scroll near.
	 */
	import { onDestroy, tick } from 'svelte';
	import type { DocToc, DocUnit } from '#lib/kg/docs.ts';
	import type { ReaderTarget } from './reader.svelte.ts';
	import {
		flatOffset,
		flattenQuote,
		indexText,
		locateFacts,
		rangeOf,
		renderSection,
		type FactSpan,
		type TextIndex
	} from './markdown.ts';
	import { renderDiagram } from './mermaid.ts';
	import { hideTip, showTip } from '#lib/ui/tooltip.ts';

	interface Props {
		unit: DocUnit;
		toc: DocToc | null;
		target: ReaderTarget | null;
		/** Fact ids the current answer cites. */
		cited: string[];
		wide: boolean;
		/** Spotlight graph nodes (null clears). */
		onspot: (ids: string[] | null) => void;
		/** Select a graph node (open its card). */
		onpick: (id: string) => void;
		/** The facts on screen changed. */
		onreading: (ids: string[]) => void;
		/** The section at the top of the view and how far through the unit we are. */
		onposition: (section: { id: string; title: string } | null, progress: number) => void;
		/** Go to another unit (a cross-reference or a chapter link). */
		ongoto: (unit: string, section?: string) => void;
		/** Show a rendered diagram full size. */
		onexpand: (svg: string, caption: string) => void;
	}

	let {
		unit,
		toc,
		target,
		cited,
		wide,
		onspot,
		onpick,
		onreading,
		onposition,
		ongoto,
		onexpand
	}: Props = $props();

	let scroller = $state<HTMLDivElement>();
	let article = $state<HTMLElement>();

	const page = $derived.by(() => {
		const diagrams: string[] = [];
		const ctx = { sources: unit.sources, chapters: toc?.chapters ?? {}, diagrams };
		const sections = unit.sections.map((s) => ({ ...s, html: renderSection(s.md, ctx) }));
		return { sections, diagrams };
	});

	/* ---------------------------------------------------------------- */
	/* Fact positions                                                    */
	/* ---------------------------------------------------------------- */

	// Plain lookups rebuilt with the page, not reactive state.
	/* eslint-disable svelte/prefer-svelte-reactivity */
	let ix: TextIndex | null = null;
	let spans: FactSpan[] = [];
	const spanById = new Map<string, FactSpan>();
	/** Facts quoted from inside a diagram (diagram index → fact ids). */
	const figureFacts = new Map<number, string[]>();
	/* eslint-enable svelte/prefer-svelte-reactivity */
	let ready = $state(false);

	const highlights = typeof CSS !== 'undefined' && 'highlights' in CSS;

	function setHighlight(name: string, ranges: Range[]) {
		if (!highlights) return;
		if (ranges.length) CSS.highlights.set(name, new Highlight(...ranges));
		else CSS.highlights.delete(name);
	}

	function index() {
		if (!article) return;
		ix = indexText(article);
		const starts = new Map<string, number>(); // eslint-disable-line svelte/prefer-svelte-reactivity
		for (const el of article.querySelectorAll<HTMLElement>('section[data-sid]')) {
			const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
			let first: Node | null = walker.nextNode();
			let k = -1;
			while (first && (k = ix.nodes.indexOf(first as Text)) < 0) first = walker.nextNode();
			starts.set(el.dataset.sid!, k >= 0 ? ix.starts[k] : 0);
		}
		spans = locateFacts(ix, unit.facts, (s) => starts.get(s) ?? 0);
		spanById.clear();
		for (const s of spans) spanById.set(s.id, s);
		// Facts quoted from a diagram's boxes belong to the diagram.
		figureFacts.clear();
		const codes = page.diagrams.map((c) => flattenQuote(c.replace(/["`]/g, ' ')));
		for (const f of unit.facts) {
			if (spanById.has(f.id)) continue;
			const q = flattenQuote(f.q);
			const k = codes.findIndex((c) => q.length > 6 && c.includes(q));
			if (k >= 0) figureFacts.set(k, [...(figureFacts.get(k) ?? []), f.id]);
		}
		ready = true;
	}

	/** The innermost fact span containing a flat offset. */
	function spanAt(pos: number): FactSpan | null {
		let best: FactSpan | null = null;
		// Spans are sorted by start; scan back from the last one starting at or before pos.
		let lo = 0;
		let hi = spans.length - 1;
		let k = -1;
		while (lo <= hi) {
			const mid = (lo + hi) >> 1;
			if (spans[mid].start <= pos) {
				k = mid;
				lo = mid + 1;
			} else hi = mid - 1;
		}
		for (let i = k; i >= 0 && i > k - 40; i--) {
			const s = spans[i];
			if (pos < s.end && (!best || s.end - s.start < best.end - best.start)) best = s;
		}
		return best;
	}

	function flatAt(x: number, y: number): number {
		if (!ix) return -1;
		const doc = document as Document & {
			caretPositionFromPoint?: (
				x: number,
				y: number
			) => { offsetNode: Node; offset: number } | null;
		};
		const p = doc.caretPositionFromPoint?.(x, y);
		if (p) return flatOffset(ix, p.offsetNode, p.offset);
		const r = document.caretRangeFromPoint?.(x, y);
		return r ? flatOffset(ix, r.startContainer, r.startOffset) : -1;
	}

	/* ---------------------------------------------------------------- */
	/* Hover and click                                                   */
	/* ---------------------------------------------------------------- */

	let hovered: string | null = null;
	let hoverFrame = 0;
	let spotTimer: ReturnType<typeof setTimeout> | null = null;
	let onFact = $state(false);

	function setHovered(id: string | null, spot: string[] | null = id ? [id] : null) {
		if (id === hovered) return;
		hovered = id;
		onFact = !!id;
		const s = id ? spanById.get(id) : null;
		const r = s && ix ? rangeOf(ix, s.start, s.end) : null;
		setHighlight('r-hover', r ? [r] : []);
		if (spotTimer) clearTimeout(spotTimer);
		// A short rest before the graph reacts, so sweeping across the text doesn't flicker it.
		spotTimer = setTimeout(() => onspot(spot), spot ? 110 : 160);
	}

	function pointermove(e: PointerEvent) {
		if (hoverFrame || !ready) return;
		const { clientX: x, clientY: y } = e;
		const el = e.target as HTMLElement;
		hoverFrame = requestAnimationFrame(() => {
			hoverFrame = 0;
			const fig = el.closest<HTMLElement>('figure.r-diagram');
			if (fig) {
				const ids = figureFacts.get(Number(fig.dataset.m)) ?? [];
				setHovered(ids.length ? `fig:${fig.dataset.m}` : null, ids.length ? ids : null);
				return;
			}
			if (el.closest('[data-skip], a, button')) return setHovered(null);
			const s = spanAt(flatAt(x, y));
			setHovered(s?.id ?? null);
		});
	}

	function pointerleave() {
		setHovered(null);
	}

	function click(e: MouseEvent) {
		const el = e.target as HTMLElement;
		const cite = el.closest<HTMLElement>('.r-cite[data-src]');
		if (cite) return onpick(cite.dataset.src!);
		const ch = el.closest<HTMLElement>('.r-chref[data-unit]');
		if (ch) return ongoto(ch.dataset.unit!);
		const xref = el.closest<HTMLAnchorElement>('a.r-xref');
		if (xref) {
			e.preventDefault();
			const hit = toc?.slugs[xref.dataset.slug ?? ''];
			if (hit) ongoto(hit[0], hit[1]);
			return;
		}
		const fig = el.closest<HTMLElement>('figure.r-diagram');
		if (fig) {
			const svg = fig.querySelector('.r-diagram-svg svg');
			const heading = fig
				.closest('section')
				?.querySelector('.r-h')
				?.textContent?.trim()
				.replace(/^\d+\.\s+/, '');
			if (svg) onexpand(svg.outerHTML, heading ?? unit.title);
			return;
		}
		if (el.closest('a, button')) return;
		// Selecting text is reading, not picking.
		const sel = window.getSelection();
		if (sel && !sel.isCollapsed) return;
		if (hovered && !hovered.startsWith('fig:')) onpick(hovered);
	}

	function pointerover(e: PointerEvent) {
		const el = (e.target as HTMLElement).closest<HTMLElement>(
			'.r-cite[data-src], .r-chref[data-unit]'
		);
		if (!el) return;
		showTip(el, el.dataset.label ?? '', 250);
		if (el.dataset.src) onspot([el.dataset.src]);
	}

	function pointerout(e: PointerEvent) {
		const el = (e.target as HTMLElement).closest<HTMLElement>(
			'.r-cite[data-src], .r-chref[data-unit]'
		);
		if (!el) return;
		hideTip();
		if (el.dataset.src) onspot(null);
	}

	/* ---------------------------------------------------------------- */
	/* Scrolling: position, reading along, targets                       */
	/* ---------------------------------------------------------------- */

	let scrollFrame = 0;
	let readTimer: ReturnType<typeof setTimeout> | null = null;
	let lastReading = '';

	function onscroll() {
		if (scrollFrame) return;
		scrollFrame = requestAnimationFrame(() => {
			scrollFrame = 0;
			report();
		});
		if (readTimer) clearTimeout(readTimer);
		readTimer = setTimeout(reading, 180);
	}

	function report() {
		if (!scroller || !article) return;
		const top = scroller.getBoundingClientRect().top + 72;
		let current: HTMLElement | null = null;
		for (const el of article.querySelectorAll<HTMLElement>('section[data-sid]')) {
			if (el.getBoundingClientRect().top <= top) current = el;
			else break;
		}
		const max = scroller.scrollHeight - scroller.clientHeight;
		const s = current ? unit.sections.find((x) => x.id === current!.dataset.sid) : null;
		onposition(s ? { id: s.id, title: s.title } : null, max > 0 ? scroller.scrollTop / max : 1);
	}

	/** The facts whose text is on screen. */
	function reading() {
		if (!scroller || !article || !ready || !ix) return;
		const box = scroller.getBoundingClientRect();
		const a = article.getBoundingClientRect();
		const x = a.left + Math.min(60, a.width / 4);
		let from = -1;
		let to = -1;
		for (let y = box.top + 12; y < box.bottom && from < 0; y += 24) from = flatAt(x, y);
		for (let y = box.bottom - 12; y > box.top && to < 0; y -= 24) to = flatAt(x + 200, y);
		const ids: string[] = [];
		if (from >= 0 && to >= from) {
			for (const s of spans) if (s.end > from && s.start < to + 200) ids.push(s.id);
		}
		// Diagrams on screen bring their facts along.
		for (const fig of article.querySelectorAll<HTMLElement>('figure.r-diagram')) {
			const r = fig.getBoundingClientRect();
			if (r.bottom > box.top && r.top < box.bottom)
				ids.push(...(figureFacts.get(Number(fig.dataset.m)) ?? []));
		}
		const key = ids.join(',');
		if (key === lastReading) return;
		lastReading = key;
		onreading(ids);
	}

	function visible(el: Element) {
		if (!scroller) return false;
		const b = scroller.getBoundingClientRect();
		const r = el.getBoundingClientRect();
		return r.top >= b.top + 8 && r.bottom <= b.bottom - 8;
	}

	function scrollToY(y: number, smooth: boolean) {
		if (!scroller) return;
		const top = Math.max(0, y - scroller.getBoundingClientRect().top + scroller.scrollTop);
		scroller.scrollTo({ top, behavior: smooth ? 'smooth' : 'instant' });
	}

	let handled = -1;
	let firstScroll = true;

	async function goTo(t: ReaderTarget) {
		if (!scroller || !article || !ready || !ix) return;
		handled = t.nonce;
		const smooth = !firstScroll;
		firstScroll = false;
		const box = scroller.getBoundingClientRect();
		if (t.fact) {
			const s = spanById.get(t.fact);
			const r = s ? rangeOf(ix, s.start, s.end) : null;
			setHighlight('r-target', r ? [r] : []);
			if (r) {
				const rect = r.getBoundingClientRect();
				const inView = rect.top >= box.top + 8 && rect.bottom <= box.bottom - 8;
				if (!(t.gentle && inView)) scrollToY(rect.top - box.height * 0.3, smooth);
				return;
			}
			for (const [k, ids] of figureFacts) {
				if (!ids.includes(t.fact)) continue;
				const fig = article.querySelector<HTMLElement>(`figure[data-m="${k}"]`);
				if (fig) {
					fig.classList.add('r-lit');
					setTimeout(() => fig.classList.remove('r-lit'), 2600);
					if (!(t.gentle && visible(fig))) scrollToY(fig.getBoundingClientRect().top - 24, smooth);
					return;
				}
			}
		} else setHighlight('r-target', []);
		const sec = t.section
			? article.querySelector<HTMLElement>(`section[data-sid="${CSS.escape(t.section)}"]`)
			: null;
		if (t.source != null && sec) {
			const li = sec.querySelector<HTMLElement>(`ol > li:nth-of-type(${t.source})`);
			if (li) {
				li.classList.remove('r-flash');
				void li.offsetWidth;
				li.classList.add('r-flash');
				if (!(t.gentle && visible(li)))
					scrollToY(li.getBoundingClientRect().top - box.height * 0.3, smooth);
				return;
			}
		}
		if (sec) {
			if (!(t.gentle && sec.getBoundingClientRect().top >= box.top))
				scrollToY(sec.getBoundingClientRect().top - 12, smooth);
		} else if (smooth === false) scroller.scrollTo({ top: 0 });
	}

	/* ---------------------------------------------------------------- */
	/* Diagrams                                                          */
	/* ---------------------------------------------------------------- */

	let figObserver: IntersectionObserver | null = null;

	function drawDiagrams() {
		figObserver?.disconnect();
		if (!article || !scroller) return;
		figObserver = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (!e.isIntersecting) continue;
					const fig = e.target as HTMLElement;
					figObserver?.unobserve(fig);
					const code = page.diagrams[Number(fig.dataset.m)];
					const slot = fig.querySelector('.r-diagram-svg');
					if (!code || !slot) continue;
					renderDiagram(code)
						.then((svg) => {
							slot.innerHTML = svg;
							fig.classList.add('r-ready');
						})
						.catch(() => {
							slot.innerHTML =
								'<div class="r-diagram-error">This diagram could not be drawn.</div>';
							fig.classList.add('r-ready');
						});
				}
			},
			{ root: scroller, rootMargin: '900px 0px' }
		);
		for (const fig of article.querySelectorAll('figure.r-diagram')) figObserver.observe(fig);
	}

	/* ---------------------------------------------------------------- */
	/* Lifecycle                                                         */
	/* ---------------------------------------------------------------- */

	// A new page: index its text, draw its diagrams, go where asked.
	$effect(() => {
		void page;
		if (!article) return;
		ready = false;
		firstScroll = true;
		lastReading = '';
		hovered = null;
		setHighlight('r-hover', []);
		tick().then(() => {
			index();
			drawDiagrams();
			if (target && target.nonce !== handled) goTo(target);
			else scroller?.scrollTo({ top: 0 });
			report();
			reading();
		});
	});

	$effect(() => {
		const t = target;
		if (t && ready && t.nonce !== handled) goTo(t);
	});

	$effect(() => {
		const ids = cited;
		if (!ready || !ix) return;
		const ranges: Range[] = [];
		for (const id of ids) {
			const s = spanById.get(id);
			const r = s ? rangeOf(ix, s.start, s.end) : null;
			if (r) ranges.push(r);
		}
		setHighlight('r-cited', ranges);
	});

	onDestroy(() => {
		figObserver?.disconnect();
		if (spotTimer) clearTimeout(spotTimer);
		if (readTimer) clearTimeout(readTimer);
		cancelAnimationFrame(hoverFrame);
		cancelAnimationFrame(scrollFrame);
		for (const h of ['r-hover', 'r-target', 'r-cited']) setHighlight(h, []);
		hideTip();
	});
</script>

<div bind:this={scroller} class="h-full overflow-y-auto overscroll-contain" {onscroll}>
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
	<article
		bind:this={article}
		class="reader-prose px-9 pt-9 pb-10"
		class:r-wide={wide}
		class:r-on-fact={onFact}
		onpointermove={pointermove}
		onpointerleave={pointerleave}
		onpointerover={pointerover}
		onpointerout={pointerout}
		onclick={click}
	>
		<div class="r-kicker" data-skip>{unit.crumbs.join('  ·  ')}</div>
		{#each page.sections as s (s.id)}
			<section class="r-section" data-sid={s.id} data-level={s.level} data-role={s.role}>
				<svelte:element this={`h${Math.min(6, s.level)}`} class="r-h" data-skip>
					{s.title}
				</svelte:element>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- rendered from the bundled documents; raw HTML is escaped -->
				{@html s.html}
			</section>
		{/each}
	</article>

	<nav class="mx-auto flex gap-3 px-9 pb-16 font-sans {wide ? 'max-w-[46rem]' : 'max-w-[40rem]'}">
		{#if unit.prev}
			<button
				type="button"
				class="group flex min-w-0 flex-1 flex-col items-start rounded-xl border border-white/[0.06] px-4 py-3 text-left transition-colors hover:border-white/[0.14] hover:bg-white/[0.02]"
				onclick={() => ongoto(unit.prev!.id)}
			>
				<span class="text-[10.5px] tracking-[0.1em] text-fg-4 uppercase">Previous</span>
				<span class="mt-0.5 w-full truncate text-[13px] text-fg-2 group-hover:text-fg"
					>{unit.prev.title}</span
				>
			</button>
		{:else}
			<div class="flex-1"></div>
		{/if}
		{#if unit.next}
			<button
				type="button"
				class="group flex min-w-0 flex-1 flex-col items-end rounded-xl border border-white/[0.06] px-4 py-3 text-right transition-colors hover:border-white/[0.14] hover:bg-white/[0.02]"
				onclick={() => ongoto(unit.next!.id)}
			>
				<span class="text-[10.5px] tracking-[0.1em] text-fg-4 uppercase">Next</span>
				<span class="mt-0.5 w-full truncate text-[13px] text-fg-2 group-hover:text-fg"
					>{unit.next.title}</span
				>
			</button>
		{/if}
	</nav>
</div>
