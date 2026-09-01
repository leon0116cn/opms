import type {
  ComponentType,
  SchemeComponent,
  SchemeTemplate,
  SchemeTemplateStatus,
  TargetMethod,
} from '../types/scheme-template';

const storageKey = 'opms-scheme-templates';

export const templateStatusOptions: Array<{ value: SchemeTemplateStatus; label: string }> = [
  { value: 0, label: '禁用' },
  { value: 1, label: '启用' },
];

export const componentDefinitions: Array<{
  type: ComponentType;
  label: string;
  requiresWeight?: boolean;
  requiresTargetMethod?: boolean;
}> = [
  { type: 'target', label: '目标考核', requiresWeight: true, requiresTargetMethod: true },
  { type: 'evaluation', label: '评价类', requiresWeight: true },
  { type: 'bonus', label: '加分项' },
  { type: 'penalty', label: '减分项' },
  { type: 'race', label: '赛马', requiresWeight: true },
];

export function componentLabel(component: SchemeComponent) {
  const definition = componentDefinitions.find((item) => item.type === component.type);
  return definition?.label ?? '未知';
}

export function formatComponents(components: SchemeComponent[]) {
  return components
    .map((component) => {
      const label = componentLabel(component);
      return component.weight === undefined ? label : `${label}(${component.weight}%)`;
    })
    .join('|');
}

function getTemplates() {
  const stored = localStorage.getItem(storageKey);
  if (stored) {
  return (JSON.parse(stored) as SchemeTemplate[]).map((template) => ({
    ...template,
    components: template.components.map((component) => {
      if (component.targetMethods) return component;
      const legacyMethod = (component as SchemeComponent & { targetMethod?: TargetMethod }).targetMethod;
      return {
        ...component,
        targetMethods: legacyMethod ? [legacyMethod] : [],
      };
    }),
  }));
  }
  return seedTemplates();
}

function saveTemplates(templates: SchemeTemplate[]) {
  localStorage.setItem(storageKey, JSON.stringify(templates));
}

function seedTemplates(): SchemeTemplate[] {
  return [
    {
      id: crypto.randomUUID(),
      name: '前台部门考核模板',
      year: String(new Date().getFullYear()),
      components: [
        { type: 'target', weight: 80, targetMethods: ['KPI', 'OKR'] },
        { type: 'evaluation', weight: 10 },
        { type: 'bonus' },
        { type: 'penalty' },
        { type: 'race', weight: 10 },
      ],
      unitCount: 0,
      status: 1,
    },
  ];
}

export function listTemplates(params: {
  page: number;
  pageSize: number;
  name?: string;
  year?: string;
  status?: string;
}) {
  const templates = getTemplates().filter((template) => {
    const matchesName = params.name ? template.name.includes(params.name.trim()) : true;
    const matchesYear = params.year ? template.year === params.year : true;
    const matchesStatus = params.status ? String(template.status) === params.status : true;
    return matchesName && matchesYear && matchesStatus;
  });

  const start = (params.page - 1) * params.pageSize;
  return {
    items: templates.slice(start, start + params.pageSize),
    total: templates.length,
  };
}

export function createTemplate(data: Omit<SchemeTemplate, 'id'>) {
  const template = { ...data, id: crypto.randomUUID() };
  saveTemplates([template, ...getTemplates()]);
  return template;
}

export function updateTemplate(id: string, data: Omit<SchemeTemplate, 'id'>) {
  saveTemplates(getTemplates().map((template) => (
    template.id === id ? { ...data, id } : template
  )));
}

export function deleteTemplate(id: string) {
  saveTemplates(getTemplates().filter((template) => template.id !== id));
}
