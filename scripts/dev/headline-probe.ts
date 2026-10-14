/** Which synthesis / key-finding facts match a question? npx tsx scripts/dev/headline-probe.ts "question" */
import { getStore } from '../../src/lib/server/kg/store.ts';
import { line } from '../../src/lib/server/agent/format.ts';
const store = getStore();
const q = process.argv[2];
for (const h of store.search(q, { types: ['fact'], roles: ['synthesis', 'key-findings'], limit: Number(process.argv[3] ?? 10) })) {
	console.log(h.score.toFixed(1), line(store, h.node, 200));
}
