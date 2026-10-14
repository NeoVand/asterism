/** Debug: which agent do streamed tokens belong to? Prints parent chains for model streams. */
import { readFileSync } from 'node:fs';
import { getAgent } from '../../src/lib/server/agent/agent.ts';
process.env.ASTERISM_EVAL = '1';
const env = Object.fromEntries(readFileSync(new URL('../../.env', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const agent = await getAgent({ apiKey: env.OPENAI_API_KEY, model: 'gpt-6.1-sol' });
const tasks = new Set<string>();
const seen = new Map<string, number>();
for await (const ev of agent.streamEvents(
	{ messages: [{ role: 'user', content: process.argv[2] }] },
	{ version: 'v2', configurable: { thread_id: `sa-${Date.now()}` }, recursionLimit: 150 }
)) {
	if (ev.event === 'on_tool_start' && ev.name === 'task') {
		tasks.add(ev.run_id);
		console.log('TASK START', ev.run_id, 'meta', JSON.stringify(ev.metadata));
	}
	if (ev.event === 'on_tool_start' && ev.name !== 'task' && ev.metadata?.lc_agent_name === 'researcher' && !seen.has('tool' + ev.name)) {
		seen.set('tool' + ev.name, 1);
		console.log('SUB TOOL', ev.name, 'meta', JSON.stringify(ev.metadata));
	}
	if (ev.event === 'on_chat_model_stream') {
		const p = ev.parent_ids ?? [];
		const inTask = p.some((x: string) => tasks.has(x));
		const key = `${ev.run_id}|${inTask}|${p.length}`;
		if (!seen.has(key)) {
			seen.set(key, 1);
			console.log('MODEL STREAM run', ev.run_id.slice(0, 8), 'inTask', inTask, 'parents', p.length, p.map((x: string) => x.slice(0, 8)).join(','), 'meta', JSON.stringify(ev.metadata));
		}
	}
}
