import { error, json } from '@sveltejs/kit';
import { getStore } from '#lib/server/kg/store.ts';
import { nodeDetail } from '#lib/server/kg/detail.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
	const d = nodeDetail(getStore(), params.id);
	if (!d) error(404, 'Unknown node');
	return json(d);
};
