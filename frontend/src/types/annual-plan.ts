export type AnnualPlanStatus = 0 | 1 | 2;

export interface AnnualPlan {
  id: string;
  name: string;
  year: string;
  startDate: string;
  endDate: string;
  unitCount: number;
  status: AnnualPlanStatus;
}
