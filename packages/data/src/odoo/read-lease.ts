import type {Pool} from 'pg';
import type {OdooSourceConfig} from './config.ts';
import {OdooSnapshotLease} from './snapshot.ts';

/** Existing recipes retain one input transaction; its evidence names the original transport. */
export function openOdooReadLease(pool:Pool,config:OdooSourceConfig):Promise<OdooSnapshotLease>{
 return config.observedCopy
  ?OdooSnapshotLease.openObservedCopy(pool,config,config.snapshotMaxDurationMs,config.observedCopy)
  :OdooSnapshotLease.open(pool,config,config.snapshotMaxDurationMs,config.credentialPolicy);
}
