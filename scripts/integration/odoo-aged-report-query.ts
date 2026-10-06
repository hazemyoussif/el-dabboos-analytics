import { receivablesControlBaseSql } from './receivables-control-query.ts';

/** Independent Odoo export reconstruction, separate from canonical/runtime metrics.
 * This definition preserves signed open components and report-specific maturity fallback.
 */
export const odooAgedReportBaseSql=receivablesControlBaseSql+`, report_components AS (
 SELECT reconstructed.*,coalesce(date_maturity,date) aging_date,
 CASE WHEN coalesce(date_maturity,date)>=$2::date THEN 'current'
 WHEN $2::date-coalesce(date_maturity,date)<=30 THEN '1_30'
 WHEN $2::date-coalesce(date_maturity,date)<=60 THEN '31_60'
 WHEN $2::date-coalesce(date_maturity,date)<=90 THEN '61_90'
 WHEN $2::date-coalesce(date_maturity,date)<=120 THEN '91_120' ELSE 'older' END bucket
 FROM reconstructed WHERE residual<>0
)`;

export const odooAgedCustomerSql=odooAgedReportBaseSql+`, grouped AS (
 SELECT partner_id,count(*)::text components,
 coalesce(sum(residual) FILTER(WHERE bucket='current'),0)::numeric(30,6)::text current,
 coalesce(sum(residual) FILTER(WHERE bucket='1_30'),0)::numeric(30,6)::text "1_30",
 coalesce(sum(residual) FILTER(WHERE bucket='31_60'),0)::numeric(30,6)::text "31_60",
 coalesce(sum(residual) FILTER(WHERE bucket='61_90'),0)::numeric(30,6)::text "61_90",
 coalesce(sum(residual) FILTER(WHERE bucket='91_120'),0)::numeric(30,6)::text "91_120",
 coalesce(sum(residual) FILTER(WHERE bucket='older'),0)::numeric(30,6)::text older,
 sum(residual)::numeric(30,6)::text total FROM report_components GROUP BY partner_id
) SELECT grouped.*,partner_id::text partner_reference,partner.name raw_label,partner.commercial_partner_id::text commercial_partner_id
 FROM grouped LEFT JOIN res_partner partner ON partner.id=grouped.partner_id ORDER BY partner_id LIMIT $3::int`;

export const odooAgedBridgeSql=odooAgedReportBaseSql+` SELECT bucket,
 CASE WHEN date_maturity IS NULL THEN 'missing_maturity_accounting_date_fallback' ELSE 'explicit_maturity' END maturity_policy,
 CASE WHEN residual>0 THEN 'positive_open' ELSE 'negative_open' END sign,
 count(*)::text components,sum(residual)::numeric(30,6)::text amount
 FROM report_components GROUP BY bucket,maturity_policy,sign ORDER BY bucket,maturity_policy,sign`;

export const odooAgedPopulationSql=odooAgedReportBaseSql+` SELECT count(*)::text nonzero_components,
 count(DISTINCT partner_id)::text customers,count(*) FILTER(WHERE partner_id IS NULL)::text missing_partners,
 count(*) FILTER(WHERE date_maturity IS NULL AND residual>0)::text missing_maturity_positive_components,
 coalesce(sum(residual) FILTER(WHERE date_maturity IS NULL AND residual>0),0)::numeric(30,6)::text missing_maturity_positive_amount,
 count(*) FILTER(WHERE date_maturity IS NULL AND residual<0)::text missing_maturity_negative_components,
 coalesce(sum(residual) FILTER(WHERE date_maturity IS NULL AND residual<0),0)::numeric(30,6)::text missing_maturity_negative_amount,
 count(*) FILTER(WHERE date_maturity=$2::date)::text due_on_cutoff_components,
 count(*) FILTER(WHERE later_links>0)::text later_settlement_components,
 sum(residual)::numeric(30,6)::text total FROM report_components`;
