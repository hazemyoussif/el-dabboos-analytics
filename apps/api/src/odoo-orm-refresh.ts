/** Compatibility name: refreshing the API adapter uses the existing incremental
 * sync. Changing the source transport never reloads whole report periods. */
export {executeOdooOrmSync as executeOdooOrmRefresh} from './odoo-orm-sync.ts';
