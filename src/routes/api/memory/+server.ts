import { json } from '@sveltejs/kit';
import { readFileSync, writeFileSync } from 'node:fs';
import { MEMORY_FILE, MEMORY_TEMPLATE } from '#lib/server/agent/agent.ts';
import type { RequestHandler } from './$types';

function read() {
	try {
		return readFileSync(MEMORY_FILE, 'utf8');
	} catch {
		return MEMORY_TEMPLATE;
	}
}

export const GET: RequestHandler = () =>
	json({ content: read(), empty: read().trim() === MEMORY_TEMPLATE.trim() });

export const DELETE: RequestHandler = () => {
	writeFileSync(MEMORY_FILE, MEMORY_TEMPLATE);
	return json({ content: MEMORY_TEMPLATE, empty: true });
};
