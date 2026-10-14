import { json } from '@sveltejs/kit';
import { OPENAI_API_KEY } from '$app/env/private';
import { DEFAULT_SYSTEM_PROMPT } from '#lib/server/agent/prompt.ts';
import { getStore } from '#lib/server/kg/store.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const s = getStore().stats();
	return json({
		defaultPrompt: DEFAULT_SYSTEM_PROMPT,
		serverKey: Boolean(OPENAI_API_KEY),
		types: s.types,
		edges: s.edges
	});
};
