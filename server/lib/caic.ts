import type { FieldReport } from "@shared/schema";

export function buildCAICUrl(date: string): string {
  const startDate = `${date}T00:00:01.000Z`;
  const endDate = `${date}T23:59:59.000Z`;
  return `https://api.avalanche.state.co.us/api/v2/observation_reports?r[observed_at_gteq]=${encodeURIComponent(startDate)}&r[observed_at_lteq]=${encodeURIComponent(endDate)}`;
}

export async function fetchCAICReports(date: string, fetchFn: typeof fetch = fetch): Promise<FieldReport[]> {
  const url = buildCAICUrl(date);
  
  console.log(`[CAIC] Fetching reports for ${date}`);
  console.log(`[CAIC] API URL: ${url}`);
  
  const startTime = Date.now();
  const response = await fetchFn(url);
  const elapsed = Date.now() - startTime;
  
  if (!response.ok) {
    console.error(`[CAIC] API error: ${response.status} ${response.statusText}`);
    throw new Error(`CAIC API error: ${response.status}`);
  }
  
  const data = await response.json();
  console.log(`[CAIC] Retrieved ${data.length} reports in ${elapsed}ms`);
  return data as FieldReport[];
}

export function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}
