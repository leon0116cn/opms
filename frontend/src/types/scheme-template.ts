export type SchemeTemplateStatus = 0 | 1;

export type ComponentType = 'target' | 'evaluation' | 'bonus' | 'penalty' | 'race';

export type TargetMethod = 'KPI' | 'OKR';

export interface SchemeComponent {
  type: ComponentType;
  weight?: number;
  targetMethods?: TargetMethod[];
}

export interface SchemeTemplate {
  id: string;
  name: string;
  year: string;
  components: SchemeComponent[];
  unitCount: number;
  status: SchemeTemplateStatus;
}
