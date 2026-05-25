// Job card reporting removed — automotive feature

export async function getJobCardMargins(_orgId: string, _opts: any) {
  return { data: [], nextCursor: null, hasMore: false };
}

export async function getJobCardMarginById(_jobCardId: string, _orgId: string) {
  return null;
}

export async function getTechnicianEfficiency(_orgId: string, _opts: any) {
  return [];
}

export async function getServiceHistoryByVehicle(_vehicleId: string, _orgId: string) {
  return [];
}

export async function getServiceHistoryByCustomer(_customerId: string, _orgId: string) {
  return [];
}

export async function getKPISummary(_orgId: string, _opts: any) {
  return { totalJobs: 0, totalRevenue: "0.00", avgMargin: "0.00" };
}
