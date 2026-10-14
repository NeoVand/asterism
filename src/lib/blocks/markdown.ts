/** Plain-markdown renderings of blocks, for "copy as markdown". */
import type {
	ChecklistBlock,
	ComparisonBlock,
	FlowBlock,
	MetricsBlock,
	PlanBlock,
	RisksBlock,
	TimelineBlock
} from './types.ts';
import { citeMd, formatDate } from './util.ts';

const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const lines = (...xs: (string | false | undefined | null)[]) =>
	xs.filter((x) => x !== false && x != null).join('\n');

export function planMd(b: PlanBlock): string {
	const out = [`### ${b.title}`];
	if (b.subtitle) out.push(`_${b.subtitle}_`);
	for (const p of b.phases) {
		out.push(
			'',
			`#### ${p.name} (${p.window})`,
			`**Goal:** ${p.goal}`,
			...p.items.map((it) => `- ${it.text}${citeMd(it.cites)}`)
		);
		if (p.gate) out.push(`- **Gate · ${p.gate.name}** — ${p.gate.criteria}${citeMd(p.gate.cites)}`);
	}
	return out.join('\n');
}

export function timelineMd(b: TimelineBlock): string {
	return lines(
		`### ${b.title}`,
		'',
		...b.events.map(
			(e) =>
				`- **${formatDate(e.date)}** — ${e.label}${e.kind && e.kind !== 'event' ? ` _(${e.kind})_` : ''}${e.detail ? `: ${e.detail}` : ''}${citeMd(e.cites)}`
		)
	);
}

export function comparisonMd(b: ComparisonBlock): string {
	const head = `| | ${b.columns.map(esc).join(' | ')} |`;
	const sep = `|---|${b.columns.map(() => '---').join('|')}|`;
	const rows = b.rows.map(
		(r) =>
			`| **${esc(r.label)}** | ${b.columns.map((_, i) => (r.cells[i] ? esc(r.cells[i].text) + citeMd(r.cells[i].cites) : '—')).join(' | ')} |`
	);
	return lines(`### ${b.title}`, '', head, sep, ...rows, b.note && '', b.note && `_${b.note}_`);
}

export function metricsMd(b: MetricsBlock): string {
	return lines(
		b.title && `### ${b.title}`,
		b.title && '',
		...b.items.map(
			(m) => `- **${m.value}** ${m.label}${m.detail ? ` — ${m.detail}` : ''}${citeMd(m.cites)}`
		)
	);
}

export function severity(likelihood: number, impact: number): 'High' | 'Medium' | 'Low' {
	const s = likelihood * impact;
	return s >= 6 ? 'High' : s >= 3 ? 'Medium' : 'Low';
}

export function risksMd(b: RisksBlock): string {
	const sorted = [...b.items].sort((a, c) => c.likelihood * c.impact - a.likelihood * a.impact);
	return lines(
		`### ${b.title}`,
		'',
		...sorted.map(
			(r) =>
				`- **${severity(r.likelihood, r.impact)}** (L${r.likelihood}×I${r.impact}) ${r.risk}${citeMd(r.cites)}\n  → ${r.mitigation}`
		)
	);
}

export function checklistMd(b: ChecklistBlock, done: (i: number) => boolean): string {
	return lines(
		`### ${b.title}`,
		'',
		...b.items.map(
			(it, i) =>
				`- [${done(i) ? 'x' : ' '}] ${it.text}${it.detail ? ` — ${it.detail}` : ''}${citeMd(it.cites)}`
		)
	);
}

export function flowMd(b: FlowBlock): string {
	return lines(
		`### ${b.title}`,
		'',
		...b.steps.map(
			(s, i) => `${i + 1}. **${s.label}**${s.detail ? ` — ${s.detail}` : ''}${citeMd(s.cites)}`
		)
	);
}

/** Any block as markdown (used by evals and exports; sources render as their ids). */
export function blockToMarkdown(b: import('./schema.ts').Block): string {
	switch (b.type) {
		case 'plan':
			return planMd(b);
		case 'timeline':
			return timelineMd(b);
		case 'comparison':
			return comparisonMd(b);
		case 'metrics':
			return metricsMd(b);
		case 'risks':
			return risksMd(b);
		case 'checklist':
			return checklistMd(b, () => false);
		case 'flow':
			return flowMd(b);
		case 'sources':
			return `**${b.title}**\n\n${b.ids.map((id) => `- [${id}]`).join('\n')}${b.note ? `\n\n${b.note}` : ''}`;
		case 'diagram':
			return `**Diagram ${b.id}** (from the documents)${b.note ? `\n\n${b.note}` : ''}`;
	}
}
