import { createHash } from 'node:crypto';
import { semanticCatalog } from '@el-dabboos/domain';
/** A stored baseline cannot silently acquire changed executable metric semantics. */
export function operationalDefinitionVersion(){return createHash('sha256').update(JSON.stringify(semanticCatalog)).digest('hex');}
