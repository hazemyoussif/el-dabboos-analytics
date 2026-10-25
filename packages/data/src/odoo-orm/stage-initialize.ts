import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
import type {OwnedStageConfig} from './stage-config.ts';
import {ownedStageDatabase,stageWriterRole} from './stage-config.ts';

/** Explicit offline migration for the separately provisioned Analytics input database. */
export async function initializeOwnedOdooStage(config:OwnedStageConfig):Promise<void>{
 const pool=new Pool(config.writer);
 try{
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const role=(await client.query('SELECT current_database() database,current_user role,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user')).rows[0];
   if(role?.database!==ownedStageDatabase||role.role!==stageWriterRole||role.rolsuper||role.rolbypassrls||role.rolcreatedb||role.rolcreaterole)throw new Error('Dedicated owned staging initialization role required');
   await client.query('SELECT pg_advisory_xact_lock(7415,1)');
   const exists=(await client.query("SELECT to_regclass('api_catalog.version') present")).rows[0].present;
   if(exists){
    const versions=(await client.query('SELECT version FROM api_catalog.version')).rows;
    if(versions.length!==1||versions[0].version!==1)throw new Error('Unsupported owned staging schema');
   }else{
    await client.query(await readFile(new URL('../../migrations/odoo-api-stage/001_input_copies.sql',import.meta.url),'utf8'));
   }
   await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }finally{await pool.end();}
}
