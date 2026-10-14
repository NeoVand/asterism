import { error, json } from '@sveltejs/kit';
import { getStore } from '#lib/server/kg/store.ts';
import { locate } from '#lib/server/kg/docs.ts';
import type { RequestHandler } from './$types';

/** Where a graph node can be read in the documents. */
export const GET: RequestHandler = ({ params }) => {
	const at = locate(getStore(), params.id);
	if (!at) error(404, 'Not in the documents');
	return json(at);
};
