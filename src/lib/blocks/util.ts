/** Shared helpers for the generative UI blocks: tones, dates, colors, spotlight. */
import type { AsterismContext } from '#lib/app/context.ts';
import type { Tone } from './types.ts';

/* ---------- tones ---------- */

export const TONE_TEXT: Record<Tone, string> = {
	good: 'text-ok',
	warn: 'text-warn',
	bad: 'text-bad',
	neutral: 'text-fg-2'
};

export const TONE_DOT: Record<Tone, string> = {
	good: 'bg-ok',
	warn: 'bg-warn',
	bad: 'bg-bad',
	neutral: 'bg-fg-3'
};

export const TONE_LABEL: Record<Tone, string> = {
	good: 'Favorable',
	warn: 'Caution',
	bad: 'Unfavorable',
	neutral: 'Neutral'
};

/* ---------- colors ---------- */

/** Phase / step color sequence. */
export const SEQ_COLORS = [
	'#6fe3ff',
	'#a78bfa',
	'#f472d0',
	'#ffc96b',
	'#4be3a4',
	'#ff9f43'
] as const;

export function seqColor(i: number): string {
	return SEQ_COLORS[i % SEQ_COLORS.length];
}

/** `#rrggbb` + alpha (0–1) → `#rrggbbaa`. */
export function alpha(hex: string, a: number): string {
	const v = Math.round(Math.max(0, Math.min(1, a)) * 255)
		.toString(16)
		.padStart(2, '0');
	return `${hex.slice(0, 7)}${v}`;
}

/** Linear blend between two `#rrggbb` colors. */
export function mix(a: string, b: string, t: number): string {
	const pa = parseInt(a.slice(1, 7), 16);
	const pb = parseInt(b.slice(1, 7), 16);
	const ch = (shift: number) => {
		const x = (pa >> shift) & 255;
		const y = (pb >> shift) & 255;
		return Math.round(x + (y - x) * t)
			.toString(16)
			.padStart(2, '0');
	};
	return `#${ch(16)}${ch(8)}${ch(0)}`;
}

/* ---------- dates ---------- */

export const MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec'
];

export interface YMD {
	y: number;
	/** 1–12 */
	m: number;
	d?: number;
}

/** The demo's "now". */
export const TODAY: Required<YMD> = { y: 2026, m: 10, d: 13 };

/** Parses `YYYY-MM-DD` or `YYYY-MM`; anything else → null. */
export function parseDate(s: string | undefined | null): YMD | null {
	if (!s) return null;
	const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(s.trim());
	if (!m) return null;
	const y = +m[1];
	const mo = +m[2];
	if (mo < 1 || mo > 12) return null;
	if (m[3] == null) return { y, m: mo };
	const d = +m[3];
	if (d < 1 || d > 31) return null;
	return { y, m: mo, d };
}

/** `2027-01-20` → "20 Jan 2027", `2027-01` → "Jan 2027", anything else as-is. */
export function formatDate(s: string): string {
	const p = parseDate(s);
	if (!p) return s;
	return p.d ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : `${MONTHS[p.m - 1]} ${p.y}`;
}

/** Absolute month index (y·12 + m−1). */
export function monthIndex(p: YMD): number {
	return p.y * 12 + p.m - 1;
}

/** Sortable day value; month-only dates count as the 1st. */
export function dayValue(p: YMD): number {
	return Date.UTC(p.y, p.m - 1, p.d ?? 1);
}

export const TODAY_VALUE = dayValue(TODAY);
export const TODAY_LABEL = `${TODAY.d} ${MONTHS[TODAY.m - 1]} ${TODAY.y}`;

/** Fractional month position of today (for axes). */
export const TODAY_MONTH = monthIndex(TODAY) + (TODAY.d - 1) / 31;

/** "Jan '27" style tick label. */
export function tickLabel(index: number, withYear: boolean): string {
	const y = Math.floor(index / 12);
	const m = index - y * 12;
	return withYear ? `${MONTHS[m]} ’${String(y).slice(-2)}` : MONTHS[m];
}

/* ---------- misc ---------- */

export function uniq(ids: Iterable<string>): string[] {
	return [...new Set(ids)];
}

/** Returns a spotlight function that tolerates a missing context and empty id lists. */
export function spotter(app: AsterismContext | undefined) {
	return (ids: string[] | null | undefined) => {
		app?.spotlight(ids && ids.length ? ids : null);
	};
}

/** Markdown suffix for citations. */
export function citeMd(ids: string[] | undefined): string {
	return ids && ids.length ? ` [${ids.join(', ')}]` : '';
}
