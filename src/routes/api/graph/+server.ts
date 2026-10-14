import { gzipSync } from 'node:zlib';
import { getStore } from '#lib/server/kg/store.ts';
import type { RequestHandler } from './$types';

let cache: { version: number; body: string; gz: Uint8Array } | null = null;

export const GET: RequestHandler = ({ request }) => {
	const wire = getStore().wire();
	if (!cache || cache.version !== wire.version) {
		const body = JSON.stringify(wire);
		cache = { version: wire.version, body, gz: gzipSync(body, { level: 6 }) };
	}
	const headers: Record<string, string> = { 'content-type': 'application/json', 'cache-control': 'no-cache', etag: `"g${cache.version}"` };
	if (request.headers.get('if-none-match') === headers.etag) return new Response(null, { status: 304, headers });
	if (/\bgzip\b/.test(request.headers.get('accept-encoding') ?? '')) {
		return new Response(cache.gz as BodyInit, { headers: { ...headers, 'content-encoding': 'gzip', vary: 'accept-encoding' } });
	}
	return new Response(cache.body, { headers });
};
