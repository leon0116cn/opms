export type PerformancePlanStatus = 0 | 1;

export interface PerformancePlan {
  id: string;
  annualPlanId: string;
  annualPlanName: string;
  organizationName: string;
  templateId: string;
  templateName: string;
  components: string;
  status: PerformancePlanStatus;
}
