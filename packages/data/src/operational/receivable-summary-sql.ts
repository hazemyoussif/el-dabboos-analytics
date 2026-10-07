import { receivablesControlBaseSql } from './receivable-control-sql.ts';
/** Counterpart quality is validated once for the complete published scope in the
 * retained source snapshot. Summary queries then need only signed partial effects. */
const eligible=receivablesControlBaseSql.slice(0,receivablesControlBaseSql.indexOf('), matched AS'))+')';
export const receivableSummaryBaseSql=eligible+`, debit_effect AS (
 SELECT debit_move_id id,sum(amount) effect FROM account_partial_reconcile WHERE company_id=$1::int AND max_date<=$2::date GROUP BY debit_move_id
), credit_effect AS (
 SELECT credit_move_id id,sum(amount) effect FROM account_partial_reconcile WHERE company_id=$1::int AND max_date<=$2::date GROUP BY credit_move_id
), reconstructed AS (
 SELECT eligible.*,round((balance-coalesce(debit_effect.effect,0)+coalesce(credit_effect.effect,0))/rounding)*rounding residual
 FROM eligible LEFT JOIN debit_effect USING(id) LEFT JOIN credit_effect USING(id)
)`;
/** Independent union-of-signed-links reconstruction for the Finance report. */
export const receivableReportBaseSql=eligible+`, matched AS (
 SELECT eligible.id,partial.amount effect FROM eligible JOIN account_partial_reconcile partial ON partial.debit_move_id=eligible.id WHERE partial.max_date<=$2::date
 UNION ALL SELECT eligible.id,-partial.amount FROM eligible JOIN account_partial_reconcile partial ON partial.credit_move_id=eligible.id WHERE partial.max_date<=$2::date
), settlement AS (SELECT id,sum(effect) effect FROM matched GROUP BY id), reconstructed AS (
 SELECT eligible.*,round((balance-coalesce(settlement.effect,0))/rounding)*rounding residual FROM eligible LEFT JOIN settlement USING(id)
)`;
const buckets=[['aged_at_date','days<=0'],['aged_1_30','days BETWEEN 1 AND 30'],['aged_31_60','days BETWEEN 31 AND 60'],['aged_61_90','days BETWEEN 61 AND 90'],['aged_91_120','days BETWEEN 91 AND 120'],['aged_over_120','days>120'],['net_aged_receivable','true'],['total_overdue_receivable','days>0'],['gross_open_receivable_components','residual>=0'],['credit_balances','residual<0']];
export const receivableSummarySql=receivableSummaryBaseSql+`, classified AS (SELECT reconstructed.*,$2::date-coalesce(date_maturity,date) days FROM reconstructed)
 SELECT ${buckets.map(([measure,predicate])=>`coalesce(sum(residual) FILTER(WHERE ${predicate}),0)::numeric(30,6)::text ${measure}`).join(',')} FROM classified`;
