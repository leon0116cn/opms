import type { PerformancePlan, PerformancePlanStatus } from '../types/performance-plan';
import { listPlans as listAnnualPlans } from './annual-plan-service';
import { formatComponents, listTemplates } from './scheme-template-service';
import type { SchemeTemplate } from '../types/scheme-template';

const storageKey = 'opms-performance-plans';

export const performancePlanStatusOptions: Array<{ value: PerformancePlanStatus; label: string }> = [
  { value: 0, label: '禁用' },
  { value: 1, label: '启用' },
];

function getPlans() {
  const defaultAnnualPlan = listAnnualPlans({ page: 1, pageSize: 1 }).items[0];
  const templates = listTemplates({ page: 1, pageSize: 1000 }).items;
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    return (JSON.parse(stored) as PerformancePlan[]).map((plan) => {
      const template = templates.find((item) => item.id === plan.templateId)
        ?? templates.find((item) => item.name === plan.templateName);
      return {
        ...plan,
        annualPlanId: plan.annualPlanId ?? defaultAnnualPlan?.id ?? '',
        annualPlanName: plan.annualPlanName ?? defaultAnnualPlan?.name ?? '',
        templateId: template?.id ?? plan.templateId,
      };
    });
  }
  return seedPlans();
}

function savePlans(plans: PerformancePlan[]) {
  localStorage.setItem(storageKey, JSON.stringify(plans));
}

function seedPlans(): PerformancePlan[] {
  const annualPlan = listAnnualPlans({ page: 1, pageSize: 1 }).items[0];
  const template = listTemplates({ page: 1, pageSize: 1000 }).items
    .find((item) => item.name === '前台部门考核模板');
  return [
    {
      id: crypto.randomUUID(),
      annualPlanId: annualPlan?.id ?? '',
      annualPlanName: annualPlan?.name ?? '',
      organizationName: '技术运营部',
      templateId: template?.id ?? '',
      templateName: template?.name ?? '',
      components: template ? formatComponents(template.components) : '',
      status: 1,
    },
  ];
}

export function listPlans(params: {
  page: number;
  pageSize: number;
  organizationNames?: string[];
  annualPlanId?: string;
  templateName?: string;
  status?: string;
}) {
  const plans = getPlans().filter((plan) => {
    const matchesOrganization = params.organizationNames?.length
      ? params.organizationNames.includes(plan.organizationName)
      : true;
    const matchesAnnualPlan = params.annualPlanId
      ? plan.annualPlanId === params.annualPlanId
      : true;
    const matchesTemplate = params.templateName ? plan.templateName === params.templateName : true;
    const matchesStatus = params.status ? String(plan.status) === params.status : true;
    return matchesOrganization && matchesAnnualPlan && matchesTemplate && matchesStatus;
  });
  const start = (params.page - 1) * params.pageSize;
  return {
    items: plans.slice(start, start + params.pageSize),
    total: plans.length,
  };
}

export function createPlans(
  template: SchemeTemplate,
  organizationNames: string[],
  annualPlanId: string,
  annualPlanName: string,
  status: PerformancePlanStatus = 1,
) {
  const plans: PerformancePlan[] = organizationNames.map((organizationName) => ({
    id: crypto.randomUUID(),
    annualPlanId,
    annualPlanName,
    organizationName,
    templateId: template.id,
    templateName: template.name,
    components: formatComponents(template.components),
    status,
  }));
  savePlans([...plans, ...getPlans()]);
  return plans;
}

export function updatePlan(id: string, data: Omit<PerformancePlan, 'id'>) {
  savePlans(getPlans().map((plan) => (plan.id === id ? { ...data, id } : plan)));
}

export function deletePlan(id: string) {
  savePlans(getPlans().filter((plan) => plan.id !== id));
}
