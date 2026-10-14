/** Small OpenAI helper for the build scripts: structured outputs, retries, a concurrency pool. */
import OpenAI from 'openai';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;

function loadEnv(): Record<string, string> {
	try {
		return Object.fromEntries(
			readFileSync(`${ROOT}.env`, 'utf8')
				.split('\n')
				.filter((l) => l.includes('=') && !l.trim().startsWith('#'))
				.map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
		);
	} catch {
		return {};
	}
}

const env = loadEnv();
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? env.OPENAI_API_KEY });

export interface JsonCall {
	model?: string;
	system: string;
	user: string;
	schemaName: string;
	schema: Record<string, unknown>;
	effort?: 'none' | 'low' | 'medium' | 'high';
	maxOutputTokens?: number;
}

export const usage = { input: 0, cached: 0, output: 0, calls: 0 };

export async function jsonCall<T>(call: JsonCall): Promise<T> {
	let lastErr: unknown;
	for (let attempt = 0; attempt < 6; attempt++) {
		try {
			const r = await openai.responses.create({
				model: call.model ?? 'gpt-6.1-sol',
				instructions: call.system,
				input: call.user,
				reasoning: call.effort ? { effort: call.effort } : undefined,
				max_output_tokens: call.maxOutputTokens ?? 32000,
				text: {
					format: { type: 'json_schema', name: call.schemaName, strict: true, schema: call.schema }
				}
			} as never);
			const res = r as unknown as {
				output_text: string;
				status?: string;
				usage?: {
					input_tokens: number;
					output_tokens: number;
					input_tokens_details?: { cached_tokens?: number };
				};
			};
			usage.calls++;
			usage.input += res.usage?.input_tokens ?? 0;
			usage.cached += res.usage?.input_tokens_details?.cached_tokens ?? 0;
			usage.output += res.usage?.output_tokens ?? 0;
			if (res.status && res.status !== 'completed') throw new Error(`status ${res.status}`);
			return JSON.parse(res.output_text) as T;
		} catch (e) {
			lastErr = e;
			const msg = e instanceof Error ? e.message : String(e);
			const wait = Math.min(60000, 2000 * 2 ** attempt) + Math.random() * 1000;
			console.warn(`  retry ${attempt + 1} after ${Math.round(wait)}ms: ${msg.slice(0, 160)}`);
			await new Promise((r) => setTimeout(r, wait));
		}
	}
	throw lastErr;
}

export async function pool<T, R>(
	items: T[],
	concurrency: number,
	fn: (item: T, index: number) => Promise<R>,
	onProgress?: (done: number, total: number) => void
): Promise<R[]> {
	const out: R[] = new Array(items.length);
	let next = 0;
	let done = 0;
	const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
		while (next < items.length) {
			const i = next++;
			out[i] = await fn(items[i], i);
			done++;
			onProgress?.(done, items.length);
		}
	});
	await Promise.all(workers);
	return out;
}
