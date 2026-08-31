import type { AnnualPlan, AnnualPlanStatus } from '../types/annual-plan';
import type { QueryParams } from '../types/common';

const storageKey = 'opms-annual-plans';

export const statusOptions: Array<{ value: AnnualPlanStatus; label: string }> = [
  { value: 0, label: '草稿' },
  { value: 1, label: '进行中' },
  { value: 2, label: '已完成' },
];

export const yearOptions = Array.from({ length: 11 }, (_, index) => {
  const year = new Date().getFullYear() - 5 + index;
  return String(year);
});

export function formatDate(date: Date) {
  const year = String(date.getFullYear()).slice(2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function formatDisplayDate(date: string) {
  return `${date.slice(0, 2)}-${date.slice(2, 4)}-${date.slice(4, 6)}`;
}

export function statusLabel(status: AnnualPlanStatus) {
  return statusOptions.find((option) => option.value === status)?.label ?? '未知';
}

function getPlans() {
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    return JSON.parse(stored) as AnnualPlan[];
  }
  return seedPlans();
}

function savePlans(plans: AnnualPlan[]) {
  localStorage.setItem(storageKey, JSON.stringify(plans));
}

function seedPlans(): AnnualPlan[] {
  const today = new Date();
  return [
    {
      id: crypto.randomUUID(),
      name: '2026年度考核计划',
      year: '2026',
      startDate: formatDate(today),
      endDate: formatDate(today),
      unitCount: 0,
      status: 0,
    },
  ];
}

function withId<T extends object>(data: T): T & { id: string } {
  return { ...data, id: crypto.randomUUID() };
}

export function listPlans(params: QueryParams & { name?: string; year?: string; status?: string }) {
  const plans = getPlans().filter((plan) => {
    const matchesName = params.name ? plan.name.includes(params.name.trim()) : true;
    const matchesYear = params.year ? plan.year === params.year : true;
    const matchesStatus = params.status ? String(plan.status) === params.status : true;
    return matchesName && matchesYear && matchesStatus;
  });

  const start = (params.page - 1) * params.pageSize;
  return {
    items: plans.slice(start, start + params.pageSize),
    total: plans.length,
  };
}

export function createPlan(data: Omit<AnnualPlan, 'id'>) {
  const plan = withId(data);
  savePlans([plan, ...getPlans()]);
  return plan;
}

export function updatePlan(id: string, data: Omit<AnnualPlan, 'id'>) {
  const plans = getPlans().map((plan) => (plan.id === id ? { ...plan, ...data } : plan));
  savePlans(plans);
}

export function deletePlan(id: string) {
  savePlans(getPlans().filter((plan) => plan.id !== id));
}
