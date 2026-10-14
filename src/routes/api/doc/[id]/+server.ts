import { error, json } from '@sveltejs/kit';
import { getStore } from '#lib/server/kg/store.ts';
import { docUnit } from '#lib/server/kg/docs.ts';
import type { RequestHandler } from './$types';

/** One reading unit (a chapter, a part, a guide): its sections, facts and citation numbers. */
export const GET: RequestHandler = ({ params }) => {
	const u = docUnit(getStore(), params.id);
	if (!u) error(404, 'Unknown unit');
	return json(u);
};
