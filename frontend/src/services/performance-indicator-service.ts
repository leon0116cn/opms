import type {
  IndicatorKind,
  IndicatorLevel,
  NewPerformanceIndicator,
  PerformanceIndicator,
} from '../types/performance-indicator';

const storageKey = 'opms-performance-indicators';
const seededPlansKey = 'opms-performance-indicators-seeded-plans';

export const indicatorLevelOptions: Array<{ value: IndicatorLevel; label: string }> = [
  { value: 0, label: '公司级' },
  { value: 1, label: '部门级' },
];

function getIndicators() {
  const stored = localStorage.getItem(storageKey);
  return stored ? JSON.parse(stored) as PerformanceIndicator[] : [];
}

function saveIndicators(indicators: PerformanceIndicator[]) {
  localStorage.setItem(storageKey, JSON.stringify(indicators));
}

function createSeedIndicators(planId: string): PerformanceIndicator[] {
  const seeds: NewPerformanceIndicator[] = [
    { planId, kind: 'kpi', level: 0, code: 'KPI_1', name: '总交易量（亿元）', target: '1000', weight: 25 },
    { planId, kind: 'kpi', level: 0, code: 'KPI_2', name: '汇款交易量（亿元）', target: '500', weight: 25 },
    {
      planId,
      kind: 'okr',
      level: 0,
      companyObjective: 'O1加快战略目标落地',
      code: 'OKR_1',
      objective: '深化发卡合作',
      krName: '新增重点机构数/里程碑型',
      krContent: '1.上半年完成合作协议签署。 2.下半年完成投产。',
      weight: 10,
    },
    {
      planId,
      kind: 'okr',
      level: 1,
      companyObjective: 'O2提升重点客群经营质效',
      code: 'OKR_2',
      objective: '提升重点客群贡献',
      krName: '重点客群AUM/里程碑型',
      krContent: '1.一季度完成客群圈选。 2.四季度完成经营提升目标。',
      weight: 10,
    },
    { planId, kind: 'evaluation', code: 'ITEM_1', indicator: '360评价', weight: 10 },
    { planId, kind: 'evaluation', code: 'ITEM_2', indicator: '上级评价', weight: 10 },
    {
      planId,
      kind: 'bonus',
      code: 'ITEM_1',
      itemName: '交易增速超预期',
      situation: '交易增速超10%',
      scoringStandard: '增速超10%计1分',
    },
    {
      planId,
      kind: 'bonus',
      code: 'ITEM_2',
      itemName: '重点指标超额完成',
      situation: '重点指标完成率超110%',
      scoringStandard: '每超5%计0.5分',
    },
    {
      planId,
      kind: 'penalty',
      code: 'ITEM_1',
      itemName: '违规事件',
      situation: '出现严重损害公司声誉的事件。',
      scoringStandard: '出现1次，当年组织绩效排名不得为前50%。',
    },
    {
      planId,
      kind: 'penalty',
      code: 'ITEM_2',
      itemName: '重大风险事件',
      situation: '发生重大操作风险事件。',
      scoringStandard: '出现1次扣2分。',
    },
    { planId, kind: 'race', code: 'ITEM_1', indicatorName: '交易规模赛马', weight: 5 },
    { planId, kind: 'race', code: 'ITEM_2', indicatorName: '客户增长赛马', weight: 5 },
  ];
  return seeds.map((seed) => ({ ...seed, id: crypto.randomUUID() }) as PerformanceIndicator);
}

function ensureSeedIndicators(planId: string) {
  const seededPlans = JSON.parse(localStorage.getItem(seededPlansKey) ?? '[]') as string[];
  if (seededPlans.includes(planId)) {
    return getIndicators();
  }

  const indicators = getIndicators();
  const planIndicators = indicators.filter((indicator) => indicator.planId === planId);
  const seeds = createSeedIndicators(planId);
  const kinds: IndicatorKind[] = ['kpi', 'okr', 'evaluation', 'bonus', 'penalty', 'race'];
  const missingSeeds = kinds.flatMap((kind) => {
    const existingCount = planIndicators.filter((indicator) => indicator.kind === kind).length;
    const missingCount = Math.max(0, 2 - existingCount);
    return seeds
      .filter((seed) => seed.kind === kind)
      .slice(0, missingCount);
  });

  if (missingSeeds.length > 0) {
    saveIndicators([...missingSeeds, ...indicators]);
  }
  localStorage.setItem(seededPlansKey, JSON.stringify([...seededPlans, planId]));
  return missingSeeds.length > 0 ? [...missingSeeds, ...indicators] : indicators;
}

function matchesFilter(indicator: PerformanceIndicator, filters: {
  level?: string;
  code?: string;
  name?: string;
}) {
  if (indicator.kind === 'kpi' || indicator.kind === 'okr') {
    if (filters.level && String(indicator.level) !== filters.level) return false;
  }
  if (filters.code && !indicator.code.includes(filters.code.trim())) return false;

  const searchText = filters.name?.trim();
  if (!searchText) return true;

  switch (indicator.kind) {
    case 'kpi':
      return indicator.name.includes(searchText);
    case 'okr':
      return indicator.objective.includes(searchText);
    case 'evaluation':
      return indicator.indicator.includes(searchText);
    case 'bonus':
    case 'penalty':
      return indicator.itemName.includes(searchText);
    case 'race':
      return indicator.indicatorName.includes(searchText);
  }
}

export function listIndicators(
  planId: string,
  kind: IndicatorKind,
  params: { page: number; pageSize: number; level?: string; code?: string; name?: string },
) {
  const indicators = ensureSeedIndicators(planId)
    .filter((indicator) => indicator.planId === planId && indicator.kind === kind)
    .filter((indicator) => matchesFilter(indicator, params));
  const start = (params.page - 1) * params.pageSize;
  return {
    items: indicators.slice(start, start + params.pageSize),
    total: indicators.length,
  };
}

export function getIndicatorWeightTotal(planId: string, kind: IndicatorKind) {
  return ensureSeedIndicators(planId)
    .filter((indicator) => indicator.planId === planId && indicator.kind === kind)
    .reduce((total, indicator) => total + (indicator.kind === 'kpi'
      || indicator.kind === 'okr'
      || indicator.kind === 'evaluation'
      || indicator.kind === 'race' ? indicator.weight : 0), 0);
}

export function createIndicator(data: NewPerformanceIndicator) {
  const indicator = { ...data, id: crypto.randomUUID() } as PerformanceIndicator;
  saveIndicators([indicator, ...getIndicators()]);
  return indicator;
}

export function updateIndicator(id: string, data: NewPerformanceIndicator) {
  saveIndicators(getIndicators().map((indicator) => (
    indicator.id === id ? { ...data, id } as PerformanceIndicator : indicator
  )));
}

export function deleteIndicator(id: string) {
  saveIndicators(getIndicators().filter((indicator) => indicator.id !== id));
}
