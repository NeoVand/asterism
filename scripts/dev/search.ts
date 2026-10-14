/** Quick look at search_graph output for a query. npx tsx scripts/dev/search.ts "query" */
import { makeTools } from '../../src/lib/server/agent/tools.ts';
const t = makeTools();
console.log(await t.searchGraph.invoke({ query: process.argv[2], limit: Number(process.argv[3] ?? 10) }));
