import {createContext} from 'react';
import type {DimensionDiscoveryPage,DimensionDiscoveryRequest,DimensionId} from '@el-dabboos/domain';
/** Governed labels are presentation evidence; selected values always remain stable IDs. */
export type DimensionLoader=(dimension:DimensionId,request:DimensionDiscoveryRequest)=>Promise<DimensionDiscoveryPage>;
export const DimensionDiscoveryContext=createContext<DimensionLoader|null>(null);
