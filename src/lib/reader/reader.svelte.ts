/**
 * The reader's state: whether it is open, which unit (chapter, part, guide) it shows and what to
 * bring into view. Units are fetched once and cached; the last place read survives a reload.
 */
import type { DocLocation, DocToc, DocUnit } from '#lib/kg/docs.ts';

const KEY = 'asterism.reader.v1';

export interface ReaderTarget {
	section?: string;
	fact?: string;
	source?: number;
	/** Only scroll if the target is out of view (the reader itself asked for it). */
	gentle?: boolean;
	/** Changes on every request, so asking for the same place twice still scrolls. */
	nonce: number;
}

interface Saved {
	open: boolean;
	wide: boolean;
	readAlong: boolean;
	unit: string | null;
	section: string | null;
}

class Reader {
	open = $state(false);
	wide = $state(false);
	/** Light the stars of the passage on screen. */
	readAlong = $state(true);
	tocOpen = $state(false);
	toc = $state.raw<DocToc | null>(null);
	unit = $state.raw<DocUnit | null>(null);
	loading = $state(false);
	error = $state<string | null>(null);
	target = $state<ReaderTarget | null>(null);
	/** A diagram shown full size (from the reader or the chat). */
	lightbox = $state<{ svg: string; caption: string } | null>(null);
	/** The section at the top of the view (kept for the next visit). */
	section: string | null = null;
	/** The unit read last time (reopened by the toggle). */
	private lastUnit: string | null = null;

	private units = new Map<string, Promise<DocUnit | null>>();
	private nonce = 0;
	private request = 0;

	load() {
		try {
			const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Saved | null;
			if (!s) return;
			this.wide = !!s.wide;
			this.readAlong = s.readAlong !== false;
			this.section = s.section;
			this.lastUnit = s.unit;
			if (s.open && s.unit) {
				this.open = true;
				this.goto(s.unit, s.section ? { section: s.section } : {});
			}
		} catch {
			/* first visit */
		}
	}

	save() {
		try {
			const s: Saved = {
				open: this.open,
				wide: this.wide,
				readAlong: this.readAlong,
				unit: this.unit?.id ?? null,
				section: this.section
			};
			localStorage.setItem(KEY, JSON.stringify(s));
		} catch {
			/* private mode */
		}
	}

	async loadToc() {
		if (this.toc) return this.toc;
		const r = await fetch('/api/doc');
		if (r.ok) this.toc = (await r.json()) as DocToc;
		return this.toc;
	}

	fetchUnit(id: string) {
		if (!this.units.has(id))
			this.units.set(
				id,
				fetch(`/api/doc/${encodeURIComponent(id)}`).then((r) =>
					r.ok ? (r.json() as Promise<DocUnit>) : null
				)
			);
		return this.units.get(id)!;
	}

	/** Open the reader at a unit (and a place in it). */
	async goto(unitId: string, at: Omit<ReaderTarget, 'nonce'> = {}) {
		this.open = true;
		this.tocOpen = false;
		const req = ++this.request;
		void this.loadToc();
		if (this.unit?.id !== unitId) {
			this.loading = true;
			const u = await this.fetchUnit(unitId);
			if (req !== this.request) return;
			this.loading = false;
			if (!u) {
				this.units.delete(unitId);
				this.error = 'This part of the documents could not be loaded.';
				return;
			}
			this.error = null;
			this.unit = u;
		}
		this.target = { ...at, nonce: ++this.nonce };
		this.save();
	}

	/** Open the reader where a graph node can be read. Resolves false if it has no place. */
	async show(nodeId: string, gentle = false): Promise<boolean> {
		const r = await fetch(`/api/doc/locate/${encodeURIComponent(nodeId)}`);
		if (!r.ok) return false;
		const at = (await r.json()) as DocLocation;
		await this.goto(at.unit, {
			section: at.section,
			fact: at.fact,
			source: at.source,
			gentle
		});
		return true;
	}

	/** The first unit of a document. */
	async openDoc(key: string) {
		const toc = await this.loadToc();
		const first = toc?.docs.find((d) => d.key === key)?.units[0];
		if (first) await this.goto(first.id);
	}

	async toggle() {
		if (this.open) return this.close();
		this.open = true;
		if (!this.unit) {
			if (this.lastUnit)
				return this.goto(this.lastUnit, this.section ? { section: this.section } : {});
			const toc = await this.loadToc();
			const first = toc?.docs[0]?.units[0];
			if (first) await this.goto(first.id);
		}
		this.save();
	}

	close() {
		this.open = false;
		this.tocOpen = false;
		this.save();
	}
}

export const reader = new Reader();
