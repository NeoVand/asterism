import { error } from '@sveltejs/kit';
import { ASTERISM_MODEL, OPENAI_API_KEY } from '$app/env/private';
import type { ChatRequest } from '#lib/chat/protocol.ts';
import { runTurn } from '#lib/server/agent/run.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as ChatRequest;
	if (!body.threadId || (!body.message?.trim() && !body.resume)) error(400, 'threadId and message (or resume) are required');
	const apiKey = body.settings?.apiKey?.trim() || OPENAI_API_KEY;
	if (!apiKey) error(401, 'No OpenAI API key. Add yours in Settings.');
	const model = body.settings?.model?.trim() || ASTERISM_MODEL;

	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		async start(controller) {
			const send = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
			const ping = setInterval(() => controller.enqueue(encoder.encode(': ping\n\n')), 15000);
			try {
				for await (const ev of runTurn(body, { apiKey, model, signal: request.signal })) send(ev);
			} catch (e) {
				send({ t: 'error', message: e instanceof Error ? e.message : String(e) });
			} finally {
				clearInterval(ping);
				try {
					controller.close();
				} catch {
					/* client went away */
				}
			}
		}
	});
	return new Response(stream, {
		headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' }
	});
};
