import { db } from "@jnj/database";
import { sql } from "drizzle-orm";

// Job card, technician, and vehicle service reporting removed (automotive features).
// Stub implementations return empty results for backward compatibility.

export interface JobCardMargin {
  jobCardId: string;
  jobNo: string;
  locationId: string;
  technicianId: string | null;
  status: string;
  invoicedAt: string | null;
  laborRevenue: string;
  totalLaborHours: string;
  laborLineCount: number;
  partsRevenue: string;
  netPartsIssued: number;
  partsLineCount: number;
  partsCogs: string;
  totalRevenue: string;
  grossProfit: string;
  grossMarginPct: string;
  partsMarkupPct: string;
}

export interface TechnicianEfficiency {
  technicianId: string;
  technicianName: string;
  jobsCompleted: number;
  totalActiveWorkHours: string;
  avgActiveHoursPerJob: string;
  totalPartsWaitHours: string;
  totalBayQueueHours: string;
  avgTurnaroundHours: string;
}

export async function getJobCardMargins(
  _orgId: string,
  _opts: { locationId?: string; from?: string; to?: string; cursor?: string; limit?: number },
) {
  return { data: [] as JobCardMargin[], nextCursor: null, hasMore: false };
}

export async function getJobCardMarginById(_jobCardId: string, _orgId: string) {
  return null;
}

export async function getTechnicianEfficiency(
  _orgId: string,
  _opts: { locationId?: string; from?: string; to?: string },
) {
  return [] as TechnicianEfficiency[];
}

export async function getServiceHistoryByVehicle(_vehicleId: string, _orgId: string) {
  return [];
}

export async function getServiceHistoryByCustomer(_customerId: string, _orgId: string) {
  return [];
}

export async function getKPISummary(
  _orgId: string,
  _opts: { locationId?: string; from?: string; to?: string },
) {
  return { totalJobs: 0, totalRevenue: "0.00", avgMargin: "0.00" };
}
