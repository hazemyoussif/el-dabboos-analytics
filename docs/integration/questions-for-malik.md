# Questions for Malik

Answers are pending; no integration design is considered confirmed.

1. **Odoo-to-Odoo integration:** Which Odoo versions, modules, company boundaries, and integration mechanism are in scope? Is direct access permitted?
2. **Python processing:** Where would Python jobs run, and which transformations must happen before analytics?
3. **Analytics source:** Should the product read Odoo, a replica, PostgreSQL mart, API, or exported files? Who owns it?
4. **PostgreSQL schema/API:** Are documented schemas, endpoints, credentials, sample payloads, and change notifications available?
5. **Tenant identity:** How is a customer/tenant identified and authorized? Can one account see multiple companies?
6. **Synchronization:** Is ingestion push or pull? What are initial load, incremental update, deletion, retry, and reconciliation rules?
7. **Metric definitions:** What are approved formulas for revenue, net revenue, gross margin, outstanding/overdue, stock snapshots, win rate, MTBF/MTTR, and currency conversion? Which order/invoice states count?
8. **Data freshness:** What delay is acceptable for each domain? Are historical corrections expected?
9. **Security:** What are data residency, PII masking, audit, encryption, and local/cloud model policies?
10. **Localization:** What terms should Egyptian customers see, and what calendar, currency, fiscal year, and number formatting apply?
11. **Expected scale:** Tenants, users, fact volume, retention, query concurrency, and response-time targets?
