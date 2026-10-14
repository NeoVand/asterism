import { error, json } from '@sveltejs/kit';
import { getStore } from '#lib/server/kg/store.ts';
import { diagram } from '#lib/server/kg/docs.ts';
import type { RequestHandler } from './$types';

/** One of the documents' mermaid diagrams. */
export const GET: RequestHandler = ({ params }) => {
	const d = diagram(getStore(), params.id);
	if (!d) error(404, 'Unknown diagram');
	return json(d);
};
