import { error } from '@sveltejs/kit';
import { ASTERISM_MODEL, OPENAI_API_KEY } from '$app/env/private';
import { ingest } from '#lib/server/kg/ingest.ts';
import type { RequestHandler } from './$types';

/** POST { name, text, apiKey? } → SSE stream of ingestion progress. */
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as { name?: string; text?: string; apiKey?: string; model?: string };
	if (!body.text || !body.name) error(400, 'name and text are required');
	const apiKey = body.apiKey?.trim() || OPENAI_API_KEY;
	if (!apiKey) error(401, 'No OpenAI API key. Add yours in Settings.');
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		async start(controller) {
			const send = (d: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(d)}\n\n`));
			try {
				for await (const ev of ingest(body.name!, body.text!, { apiKey, model: body.model || ASTERISM_MODEL })) send(ev);
			} catch (e) {
				send({ t: 'error', message: e instanceof Error ? e.message : String(e) });
			} finally {
				controller.close();
			}
		}
	});
	return new Response(stream, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } });
};
