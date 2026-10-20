export const odooLookupRoles=['customer','salesperson','business_line','state'] as const;
export type OdooLookupRole=typeof odooLookupRoles[number];
/** Metadata stores hashes of mapped business fields, never complete lookup rows. */
export interface OdooLookupDependency {object:OdooLookupRole;id:string;fingerprint:string}
export type OdooLookupChanges=Record<OdooLookupRole,readonly string[]>;
