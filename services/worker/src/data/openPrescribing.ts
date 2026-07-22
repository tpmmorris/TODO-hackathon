import type { PrescribingActivity } from '@gpnow/types';

const OPEN_PRESCRIBING_URL = 'https://openprescribing.net/api/1.0/spending_by_org/';

interface OpenPrescribingRow {
  bnf_code?: string;
  items?: number;
  actual_cost?: number;
  org_code?: string;
}

export async function getPrescribingSummary(odsCode: string, month?: string): Promise<PrescribingActivity> {
  const search = new URLSearchParams({ org_type: 'practice', org: odsCode });
  if (month) search.set('date', month);
  const response = await fetch(`${OPEN_PRESCRIBING_URL}?${search}`);
  if (!response.ok) throw new Error(`OpenPrescribing returned ${response.status}`);
  const rows = (await response.json()) as OpenPrescribingRow[];
  return {
    organisation: odsCode,
    month: month ?? 'latest',
    items: rows.map((row) => ({
      bnfCode: row.bnf_code ?? 'unknown',
      items: row.items ?? 0,
      cost: row.actual_cost ?? 0
    }))
  };
}
