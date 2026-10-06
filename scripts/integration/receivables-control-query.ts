/** Independent Finance control. Never imported by mart extraction or runtime metrics. */
export const receivablesControlBaseSql=`WITH eligible AS (
 SELECT line.id,line.move_id,line.partner_id,line.date,line.date_maturity,line.balance,line.amount_residual,
 line.amount_currency,line.currency_id,move.move_type,move.date move_date,company.currency_id company_currency_id,
 currency.name company_currency,currency.rounding
 FROM account_move_line line JOIN account_move move ON move.id=line.move_id
 JOIN account_account account ON account.id=line.account_id JOIN res_company company ON company.id=line.company_id
 JOIN res_currency currency ON currency.id=company.currency_id
 WHERE line.company_id=$1::int AND move.company_id=$1::int AND move.state='posted'
 AND account.account_type='asset_receivable' AND line.date<=$2::date
), matched AS (
 SELECT eligible.id,partial.id partial_id,partial.amount original_amount,partial.amount effect,partial.max_date,
 debit.date debit_date,credit.date credit_date,partial.company_id partial_company,
 debit.company_id debit_company,credit.company_id credit_company,debit_move.state debit_state,credit_move.state credit_state,
 credit_move.move_type counterpart_type,EXISTS(SELECT 1 FROM account_payment payment WHERE payment.move_id=credit_move.id AND payment.company_id=$1::int AND payment.payment_type='inbound' AND payment.partner_type='customer') payment_linked
 FROM eligible JOIN account_partial_reconcile partial ON partial.debit_move_id=eligible.id
 JOIN account_move_line debit ON debit.id=partial.debit_move_id JOIN account_move_line credit ON credit.id=partial.credit_move_id
 JOIN account_move debit_move ON debit_move.id=debit.move_id JOIN account_move credit_move ON credit_move.id=credit.move_id
 UNION ALL
 SELECT eligible.id,partial.id,partial.amount,-partial.amount,partial.max_date,
 debit.date,credit.date,partial.company_id,debit.company_id,credit.company_id,debit_move.state,credit_move.state,
 debit_move.move_type,false
 FROM eligible JOIN account_partial_reconcile partial ON partial.credit_move_id=eligible.id
 JOIN account_move_line debit ON debit.id=partial.debit_move_id JOIN account_move_line credit ON credit.id=partial.credit_move_id
 JOIN account_move debit_move ON debit_move.id=debit.move_id JOIN account_move credit_move ON credit_move.id=credit.move_id
), settlement AS (
 SELECT id,sum(effect) total_effect,sum(effect) FILTER(WHERE max_date<=$2::date) cutoff_effect,
 count(*) FILTER(WHERE max_date<=$2::date) cutoff_links,count(*) FILTER(WHERE max_date>$2::date) later_links,
 sum(effect) FILTER(WHERE max_date<=$2::date AND effect>0 AND payment_linked) payment_effect,
 sum(effect) FILTER(WHERE max_date<=$2::date AND effect>0 AND counterpart_type='out_refund') credit_note_effect,
 count(*) FILTER(WHERE partial_company<>$1::int OR debit_company<>$1::int OR credit_company<>$1::int
 OR debit_state<>'posted' OR credit_state<>'posted' OR max_date IS DISTINCT FROM greatest(debit_date,credit_date)
 OR max_date IS NULL OR original_amount<=0) invalid_links FROM matched GROUP BY id
), reconstructed AS (
 SELECT eligible.*,coalesce(settlement.cutoff_links,0) cutoff_links,coalesce(settlement.later_links,0) later_links,
 coalesce(settlement.invalid_links,0) invalid_links,
 round(coalesce(settlement.payment_effect,0)/rounding)*rounding payment_applied,
 round(coalesce(settlement.credit_note_effect,0)/rounding)*rounding credit_note_applied,
 round((balance-coalesce(settlement.cutoff_effect,0))/rounding)*rounding residual,
 round((balance-coalesce(settlement.total_effect,0))/rounding)*rounding reconstructed_current,
 round(amount_residual/rounding)*rounding stored_current
 FROM eligible LEFT JOIN settlement USING(id)
)`;

export function controlComponentSql(population: 'open'|'settled'): string {
 const condition=population==='open' ? 'residual<>0' : 'residual=0 AND balance>0';
 return receivablesControlBaseSql+` SELECT reconstructed.id::text component_id,move_id::text move_id,partner_id::text customer_id,
 date::text accounting_date,date_maturity::text due_date,move_type,company_currency,reconstructed.rounding::text rounding,
 balance::text original_balance,residual::numeric(30,6)::text residual,
 (round(balance/reconstructed.rounding)*reconstructed.rounding-residual)::numeric(30,6)::text reconciled_at_cutoff,amount_currency::text transaction_amount,
 transaction_currency.name transaction_currency,cutoff_links::text cutoff_links,later_links::text later_links,
 payment_applied::numeric(30,6)::text payment_applied,credit_note_applied::numeric(30,6)::text credit_note_applied,
 invalid_links::text invalid_links,(reconstructed_current<>stored_current OR date<>move_date) ambiguous,
 CASE WHEN residual<0 THEN 'unapplied_credit_or_advance' WHEN date_maturity IS NULL THEN 'missing_due_date'
 WHEN date_maturity>=$2::date THEN 'current' WHEN $2::date-date_maturity<=30 THEN '1_30'
 WHEN $2::date-date_maturity<=90 THEN '31_90' ELSE 'over_90' END bucket
 FROM reconstructed JOIN res_currency transaction_currency ON transaction_currency.id=reconstructed.currency_id
 WHERE ${condition} ORDER BY reconstructed.id LIMIT $3::int`;
}

export const controlQualitySql=receivablesControlBaseSql+` SELECT count(*)::text eligible_components,
 count(*) FILTER(WHERE reconstructed_current<>stored_current)::text current_residual_mismatches,
 count(*) FILTER(WHERE invalid_links>0 OR date<>move_date)::text ambiguous_components,
 count(*) FILTER(WHERE round((balance-residual)/reconstructed.rounding)*reconstructed.rounding<>0 AND residual>0 AND balance>residual)::text partially_settled_components,
 count(*) FILTER(WHERE residual>0 AND later_links>0)::text open_components_with_later_settlement,
 count(*) FILTER(WHERE residual>0)::text positive_components,count(*) FILTER(WHERE residual<0)::text credit_components,
 count(*) FILTER(WHERE residual>0 AND customer_currency.name IS NULL)::text missing_transaction_currency,
 count(*) FILTER(WHERE reconstructed.rounding<=0 OR company_currency<>'IQD')::text invalid_company_currency
 FROM reconstructed LEFT JOIN res_currency customer_currency ON customer_currency.id=reconstructed.currency_id`;
