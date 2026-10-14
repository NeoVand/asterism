/**
 * Stage 4: assemble the knowledge graph (see src/lib/server/kg/assemble.ts).
 *
 *   npx tsx scripts/kg/assemble.ts
 */
import { writeAssembled } from '../../src/lib/server/kg/assemble.ts';

writeAssembled(true);
