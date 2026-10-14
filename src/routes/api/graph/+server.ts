import { json } from '@sveltejs/kit';
import { getStore } from '#lib/server/kg/store.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const store = getStore();
	return json(store.wire(), { headers: { 'cache-control': 'no-store' } });
};
