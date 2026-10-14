/**
 * Talk to the real agent through multi-turn scenarios and end with a debrief question.
 *
 *   npx tsx evals/probe.ts [scenarioId ...]
 *
 * Writes a readable transcript per scenario to evals/out/probe/<id>.md
 */
process.env.ASTERISM_EVAL = '1';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { runTurn } from '../src/lib/server/agent/run.ts';
import { pool } from '../scripts/kg/llm.ts';
import type { ChatEvent } from '../src/lib/chat/protocol.ts';
import type { Answers, QuestionForm } from '../src/lib/blocks/schema.ts';

const ROOT = new URL('../', import.meta.url).pathname;
const env = Object.fromEntries(
	readFileSync(`${ROOT}.env`, 'utf8')
		.split('\n')
		.filter((l) => l.includes('='))
		.map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const DEBRIEF =
	'Debrief, honestly and briefly: in this conversation, what confused you or slowed you down? Which tool results were unclear, missing, too long or misleading, and what tool or information would have let you answer better? Do not use tools for this.';

const SCENARIOS: Record<string, string[]> = {
	newcomer: [
		'I just joined the project and I am not a safety engineer. What is this booklet about, in plain words?',
		'What is SOTIF and why should I care?',
		'And what is the difference between Level 8 and Level 9?'
	],
	skeptic: [
		'My boss says we can validate the new braking system in simulation in four months. Is that realistic?',
		'Steelman the opposite view: what would a supporter of heavy simulation say, and what evidence do they have?'
	],
	numbers: [
		'Give me the 8 most important numbers in this research, with what they mean.',
		'Which of those are vendor claims or on-road only?'
	],
	connect: [
		'How does the winter recording issue connect to the statistics on how many trials we need?',
		'Is there any tension between what the regulations require and what the vendors claim?'
	],
	priorwork: ['Find me the strongest independent studies on simulating radar, and tell me what they showed.'],
	planner: [
		'Help me build a phased plan to validate the new collision mitigation system before the prototype arrives in mid-2027.',
		'Make the first phase more concrete: who does what in the next eight weeks?'
	],
	offtopic: ['What is the capital of France?', 'Write me a poem about wheel loaders.']
};

/** Answers a form the way a hurried user would: first option, a short note, mid-scale. */
function answerForm(form: QuestionForm): Answers {
	const a: Answers = {};
	for (const q of form.questions) {
		if (q.kind === 'single') a[q.id] = q.options?.[0] ?? '';
		else if (q.kind === 'multi') a[q.id] = q.options?.slice(0, 2) ?? [];
		else if (q.kind === 'scale') a[q.id] = Math.round(((q.min ?? 1) + (q.max ?? 5)) / 2);
		else a[q.id] = 'Wheel loaders in quarries; radar and camera; EU and Australia.';
	}
	return a;
}

async function run(id: string) {
	const turns = [...SCENARIOS[id], DEBRIEF];
	const threadId = `probe-${id}-${Date.now()}`;
	const out: string[] = [`# Probe: ${id}`, ''];
	const queue = [...turns];
	let pending: Answers | null = null;
	while (queue.length || pending) {
		const msg = pending ? null : queue.shift()!;
		const req = pending ? { threadId, resume: pending } : { threadId, message: msg! };
		out.push(pending ? `## User (form)\n${JSON.stringify(pending)}\n` : `## User\n${msg}\n`);
		pending = null;
		let text = '';
		const steps: string[] = [];
		let ms = 0;
		for await (const ev of runTurn(req, { apiKey: env.OPENAI_API_KEY, model: 'gpt-6.1-sol' }) as AsyncGenerator<ChatEvent>) {
			if (ev.t === 'text') text += ev.delta;
			else if (ev.t === 'tool') steps.push(`${ev.agent === 'main' ? '' : '  ↳ '}${ev.name} ${JSON.stringify(ev.args).slice(0, 140)}`);
			else if (ev.t === 'ui') steps.push(`[ui block: ${ev.block.type}]`);
			else if (ev.t === 'interrupt') {
				steps.push(`[asked: ${ev.form.questions.map((q) => q.label).join(' | ')}]`);
				pending = answerForm(ev.form);
			}
			else if (ev.t === 'error') text += `\n[ERROR ${ev.message}]`;
			else if (ev.t === 'done') ms = ev.ms;
		}
		out.push(`<details><summary>${steps.length} tool calls · ${(ms / 1000).toFixed(0)}s</summary>\n\n${steps.map((s) => `- ${s}`).join('\n')}\n</details>\n`);
		out.push(`## Agent\n${text}\n`);
	}
	mkdirSync(`${ROOT}evals/out/probe`, { recursive: true });
	writeFileSync(`${ROOT}evals/out/probe/${id}.md`, out.join('\n'));
	console.log(`done ${id}`);
}

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SCENARIOS);
await pool(ids, 6, run);
