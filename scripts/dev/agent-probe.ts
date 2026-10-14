/**
 * Run the agent from the CLI and print a condensed event trace.
 *   npx tsx scripts/dev/agent-probe.ts "question" [--raw]
 */
import { readFileSync } from 'node:fs';
import { getAgent } from '../../src/lib/server/agent/agent.ts';

const env = Object.fromEntries(
	readFileSync(new URL('../../.env', import.meta.url), 'utf8')
		.split('\n')
		.filter((l) => l.includes('='))
		.map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const q = process.argv[2] ?? 'What does the booklet say about the EU Machinery Regulation and machine learning?';
const raw = process.argv.includes('--raw');
const agent = await getAgent({ apiKey: env.OPENAI_API_KEY, model: 'gpt-6.1-sol' });
const t0 = Date.now();
const stream = agent.streamEvents(
	{ messages: [{ role: 'user', content: q }] },
	{ version: 'v2', configurable: { thread_id: `probe-${Date.now()}` }, recursionLimit: 150 }
);
let text = '';
const seen = new Set<string>();
for await (const ev of stream) {
	const ns = (ev.metadata?.checkpoint_ns as string | undefined) ?? '';
	const who = ns.includes('tools:') || ns.split('|').length > 1 ? 'SUB' : 'MAIN';
	if (raw && !seen.has(ev.event)) {
		seen.add(ev.event);
		console.log('RAW', ev.event, ev.name, JSON.stringify(ev.metadata).slice(0, 300), JSON.stringify(ev.data).slice(0, 400));
	}
	if (ev.event === 'on_chat_model_stream') {
		const c = ev.data.chunk;
		const content = c?.content;
		let delta = '';
		if (typeof content === 'string') delta = content;
		else if (Array.isArray(content)) delta = content.map((b: { type: string; text?: string }) => (b.type === 'text' ? (b.text ?? '') : '')).join('');
		if (who === 'MAIN' && delta) {
			text += delta;
			process.stdout.write(delta);
		}
	} else if (ev.event === 'on_tool_start') {
		console.log(`\n[${who} ${((Date.now() - t0) / 1000).toFixed(1)}s] → ${ev.name} ${JSON.stringify(ev.data.input).slice(0, 220)}`);
	} else if (ev.event === 'on_tool_end') {
		const out = ev.data.output;
		const s = typeof out === 'string' ? out : (out?.content ?? JSON.stringify(out));
		console.log(`[${who}] ← ${ev.name} ${String(s).slice(0, raw ? 1200 : 160).replace(/\n/g, ' ⏎ ')}`);
	} else if (ev.event === 'on_custom_event') {
		if (raw) console.log(`[${who}] custom ${ev.name} ${JSON.stringify(ev.data).slice(0, 120)}`);
	}
}
console.log(`\n\n=== done in ${((Date.now() - t0) / 1000).toFixed(1)}s, ${text.length} chars`);
