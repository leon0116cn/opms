export type IndicatorLevel = 0 | 1;

export type IndicatorKind =
  | 'kpi'
  | 'okr'
  | 'evaluation'
  | 'bonus'
  | 'penalty'
  | 'race';

interface IndicatorBase {
  id: string;
  planId: string;
}

export interface KpiIndicator extends IndicatorBase {
  kind: 'kpi';
  level: IndicatorLevel;
  code: string;
  name: string;
  target: string;
  weight: number;
}

export interface OkrIndicator extends IndicatorBase {
  kind: 'okr';
  level: IndicatorLevel;
  companyObjective: string;
  code: string;
  objective: string;
  krName: string;
  krContent: string;
  weight: number;
}

export interface EvaluationIndicator extends IndicatorBase {
  kind: 'evaluation';
  code: string;
  indicator: string;
  weight: number;
}

export interface BonusIndicator extends IndicatorBase {
  kind: 'bonus';
  code: string;
  itemName: string;
  situation: string;
  scoringStandard: string;
}

export interface PenaltyIndicator extends IndicatorBase {
  kind: 'penalty';
  code: string;
  itemName: string;
  situation: string;
  scoringStandard: string;
}

export interface RaceIndicator extends IndicatorBase {
  kind: 'race';
  code: string;
  indicatorName: string;
  weight: number;
}

export type PerformanceIndicator =
  | KpiIndicator
  | OkrIndicator
  | EvaluationIndicator
  | BonusIndicator
  | PenaltyIndicator
  | RaceIndicator;

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

export type NewPerformanceIndicator = DistributiveOmit<PerformanceIndicator, 'id'>;
