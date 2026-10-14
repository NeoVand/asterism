import { json } from '@sveltejs/kit';
import { getStore } from '#lib/server/kg/store.ts';
import { docToc } from '#lib/server/kg/docs.ts';
import type { RequestHandler } from './$types';

/** The documents' table of contents, heading slugs and chapter units. */
export const GET: RequestHandler = () => json(docToc(getStore()));
