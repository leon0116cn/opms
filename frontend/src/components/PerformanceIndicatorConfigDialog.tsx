import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { PerformancePlan } from '../types/performance-plan';
import type { SchemeTemplate } from '../types/scheme-template';
import type {
  IndicatorKind,
  IndicatorLevel,
  NewPerformanceIndicator,
  PerformanceIndicator,
} from '../types/performance-indicator';
import {
  createIndicator,
  deleteIndicator,
  getIndicatorWeightTotal,
  indicatorLevelOptions,
  listIndicators,
  updateIndicator,
} from '../services/performance-indicator-service';

interface DialogProps {
  plan: PerformancePlan;
  template: SchemeTemplate;
  onClose: () => void;
}

interface IndicatorFilters {
  level: string;
  code: string;
  name: string;
}

const emptyFilters: IndicatorFilters = { level: '', code: '', name: '' };

function useIndicatorSection(planId: string, kind: IndicatorKind, refreshKey: number) {
  const [filters, setFilters] = useState<IndicatorFilters>(emptyFilters);
  const [query, setQuery] = useState<IndicatorFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const queryState = useMemo(() => ({ ...query, page, pageSize }), [query, page]);
  const result = useMemo(
    () => listIndicators(planId, kind, queryState),
    [planId, kind, queryState, refreshKey],
  );
  const weightTotal = useMemo(
    () => getIndicatorWeightTotal(planId, kind),
    [planId, kind, refreshKey],
  );
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
  const currentPage = Math.min(page, totalPages);

  return {
    filters,
    setFilters,
    query,
    setQuery,
    page: currentPage,
    setPage,
    totalPages,
    ...result,
    weightTotal,
  };
}

function defaultDraft(planId: string, kind: IndicatorKind): NewPerformanceIndicator {
  switch (kind) {
    case 'kpi':
      return { planId, kind, level: 0, code: '', name: '', target: '', weight: 0 };
    case 'okr':
      return {
        planId,
        kind,
        level: 0,
        companyObjective: '',
        code: '',
        objective: '',
        krName: '',
        krContent: '',
        weight: 0,
      };
    case 'evaluation':
      return { planId, kind, code: '', indicator: '', weight: 0 };
    case 'bonus':
    case 'penalty':
      return { planId, kind, code: '', itemName: '', situation: '', scoringStandard: '' };
    case 'race':
      return { planId, kind, code: '', indicatorName: '', weight: 0 };
  }
}

function formatWeight(weight: number) {
  return `${Number(weight.toFixed(1))}%`;
}

function validateDraft(draft: NewPerformanceIndicator) {
  if (!draft.code.trim()) return '请输入指标编号';
  switch (draft.kind) {
    case 'kpi':
      if (!draft.name.trim()) return '请输入指标名称';
      if (!draft.target.trim()) return '请输入目标值';
      break;
    case 'okr':
      if (!draft.companyObjective.trim()) return '请输入关联公司级目标(O)';
      if (!draft.objective.trim()) return '请输入目标(O)';
      if (!draft.krName.trim()) return '请输入关键成果（KR）-类型/名称';
      if (!draft.krContent.trim()) return '请输入关键成果（KR）-内容';
      break;
    case 'evaluation':
      if (!draft.indicator.trim()) return '请输入评价类指标';
      break;
    case 'bonus':
    case 'penalty':
      if (!draft.itemName.trim()) return '请输入事项名称';
      if (!draft.situation.trim()) return '请输入规定情形';
      if (!draft.scoringStandard.trim()) return '请输入计分标准';
      break;
    case 'race':
      if (!draft.indicatorName.trim()) return '请输入指标名称';
      break;
  }

  if ('weight' in draft && (!Number.isFinite(draft.weight) || draft.weight < 0)) {
    return '权重必须为非负数字';
  }
  return '';
}

export default function PerformanceIndicatorConfigDialog({
  plan,
  template,
  onClose,
}: DialogProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [draft, setDraft] = useState<NewPerformanceIndicator | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<IndicatorKind>('kpi');

  const kpi = useIndicatorSection(plan.id, 'kpi', refreshKey);
  const okr = useIndicatorSection(plan.id, 'okr', refreshKey);
  const evaluation = useIndicatorSection(plan.id, 'evaluation', refreshKey);
  const bonus = useIndicatorSection(plan.id, 'bonus', refreshKey);
  const penalty = useIndicatorSection(plan.id, 'penalty', refreshKey);
  const race = useIndicatorSection(plan.id, 'race', refreshKey);

  const targetComponent = template.components.find((component) => component.type === 'target');
  const showKpi = targetComponent?.targetMethods?.includes('KPI') ?? false;
  const showOkr = targetComponent?.targetMethods?.includes('OKR') ?? false;
  const showEvaluation = template.components.some((component) => component.type === 'evaluation');
  const showBonus = template.components.some((component) => component.type === 'bonus');
  const showPenalty = template.components.some((component) => component.type === 'penalty');
  const showRace = template.components.some((component) => component.type === 'race');
  const tabs = [
    showKpi ? { kind: 'kpi' as IndicatorKind, label: 'KPI' } : null,
    showOkr ? { kind: 'okr' as IndicatorKind, label: 'OKR' } : null,
    showEvaluation ? { kind: 'evaluation' as IndicatorKind, label: '评价类' } : null,
    showBonus ? { kind: 'bonus' as IndicatorKind, label: '加分项' } : null,
    showPenalty ? { kind: 'penalty' as IndicatorKind, label: '减分项' } : null,
    showRace ? { kind: 'race' as IndicatorKind, label: '赛马' } : null,
  ].filter(Boolean) as Array<{ kind: IndicatorKind; label: string }>;
  const currentTab = tabs.find((tab) => tab.kind === activeTab)?.kind ?? tabs[0]?.kind;

  function openCreate(kind: IndicatorKind) {
    setDraft(defaultDraft(plan.id, kind));
    setEditingId(null);
    setError('');
  }

  function openEdit(indicator: PerformanceIndicator) {
    const { id, ...data } = indicator;
    setDraft(data);
    setEditingId(id);
    setError('');
  }

  function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const validationError = validateDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    const normalized = 'weight' in draft
      ? { ...draft, weight: Number(draft.weight.toFixed(1)) }
      : draft;
    if (editingId) {
      updateIndicator(editingId, normalized);
    } else {
      createIndicator(normalized);
    }
    setDraft(null);
    setEditingId(null);
    setRefreshKey((key) => key + 1);
  }

  function removeIndicator(id: string) {
    deleteIndicator(id);
    setRefreshKey((key) => key + 1);
  }

  function renderFilter(section: ReturnType<typeof useIndicatorSection>, kind: IndicatorKind, nameLabel: string) {
    const showLevel = kind === 'kpi' || kind === 'okr';
    return (
      <form
        className="indicator-filter"
        onSubmit={(event) => {
          event.preventDefault();
          section.setQuery({ ...section.filters });
          section.setPage(1);
        }}
      >
        {showLevel && (
          <select
            value={section.filters.level}
            onChange={(event) => section.setFilters({ ...section.filters, level: event.target.value })}
          >
            <option value="">全部层级</option>
            {indicatorLevelOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        )}
        <input
          placeholder="指标编号"
          value={section.filters.code}
          onChange={(event) => section.setFilters({ ...section.filters, code: event.target.value })}
        />
        <input
          placeholder={nameLabel}
          value={section.filters.name}
          onChange={(event) => section.setFilters({ ...section.filters, name: event.target.value })}
        />
        <button className="button small primary" type="submit">查询</button>
        <button
          className="button small"
          type="button"
          onClick={() => {
            section.setFilters(emptyFilters);
            section.setQuery(emptyFilters);
            section.setPage(1);
          }}
        >
          重置
        </button>
      </form>
    );
  }

  function renderPagination(section: ReturnType<typeof useIndicatorSection>) {
    return (
      <div className="pagination indicator-pagination">
        <span>共 {section.total} 条</span>
        <div>
          <button
            className="button small"
            disabled={section.page === 1}
            onClick={() => section.setPage(section.page - 1)}
            type="button"
          >
            上一页
          </button>
          <span className="page-number">{section.page} / {section.totalPages}</span>
          <button
            className="button small"
            disabled={section.page === section.totalPages}
            onClick={() => section.setPage(section.page + 1)}
            type="button"
          >
            下一页
          </button>
        </div>
      </div>
    );
  }

  function renderSectionHeader(
    title: string,
    weightTotal?: number,
    actionLabel?: string,
    onCreate?: () => void,
  ) {
    return (
      <div className="indicator-section-toolbar">
        <div className="indicator-section-header">
          <h3>{title}</h3>
          {weightTotal !== undefined && <span>权重合计：{formatWeight(weightTotal)}</span>}
        </div>
        {onCreate && (
          <button className="button primary" onClick={onCreate} type="button">
            {actionLabel}
          </button>
        )}
      </div>
   );
 }

  function renderActions(indicator: PerformanceIndicator) {
    return (
      <div className="row-actions">
        <button className="link-button" onClick={() => openEdit(indicator)} type="button">修改</button>
        <button
          className="link-button danger"
          onClick={() => removeIndicator(indicator.id)}
          type="button"
        >
          删除
        </button>
      </div>
    );
  }

  return (
    <section className="indicator-page">
      <div aria-label="面包屑" className="breadcrumb">
        <button className="breadcrumb-link" onClick={onClose} type="button">组织绩效方案</button>
        <span>/</span>
        <span aria-current="page">配置指标</span>
      </div>

      <section className="scheme-overview card">
        <div className="scheme-overview-header">
          <h3>方案概览</h3>
        </div>
        <div className="indicator-overview">
          <div><span>考核单位</span><strong>{plan.organizationName}</strong></div>
          <div><span>年度考核计划</span><strong>{plan.annualPlanName}</strong></div>
          <div><span>方案模板</span><strong>{plan.templateName}</strong></div>
          <div><span>方案组成</span><strong>{plan.components}</strong></div>
        </div>
      </section>

     <div className="indicator-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            aria-selected={currentTab === tab.kind}
            className={currentTab === tab.kind ? 'indicator-tab active' : 'indicator-tab'}
            key={tab.kind}
            onClick={() => setActiveTab(tab.kind)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {currentTab === 'kpi' && showKpi && (
          <section className="indicator-section">
            {renderSectionHeader('KPI', kpi.weightTotal, '新增KPI', () => openCreate('kpi'))}
            {renderFilter(kpi, 'kpi', '指标名称')}
            <div className="table-card">
              <table className="indicator-table">
                <thead>
                  <tr>
                    <th>考核层级</th><th>指标编号</th><th>指标名称</th><th>目标值</th><th>权重</th><th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {kpi.items.map((item) => {
                    const indicator = item as Extract<PerformanceIndicator, { kind: 'kpi' }>;
                    return (
                      <tr key={indicator.id}>
                        <td>{indicator.level === 0 ? '公司级' : '部门级'}</td>
                        <td>{indicator.code}</td>
                        <td>{indicator.name}</td>
                        <td>{indicator.target}</td>
                        <td>{formatWeight(indicator.weight)}</td>
                        <td>{renderActions(indicator)}</td>
                      </tr>
                    );
                  })}
                  {kpi.items.length === 0 && <tr><td className="empty" colSpan={6}>暂无数据</td></tr>}
                </tbody>
              </table>
              {renderPagination(kpi)}
            </div>
          </section>
        )}

        {currentTab === 'okr' && showOkr && (
          <section className="indicator-section">
            {renderSectionHeader('OKR', okr.weightTotal, '新增OKR', () => openCreate('okr'))}
            {renderFilter(okr, 'okr', '目标(O)')}
            <div className="table-card">
              <table className="indicator-table">
                <thead>
                  <tr>
                    <th>考核层级</th><th>关联公司级目标(O)</th><th>指标编号</th><th>目标(O)</th>
                    <th>KR-类型/名称</th><th>KR-内容</th><th>权重</th><th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {okr.items.map((item) => {
                    const indicator = item as Extract<PerformanceIndicator, { kind: 'okr' }>;
                    return (
                      <tr key={indicator.id}>
                        <td>{indicator.level === 0 ? '公司级' : '部门级'}</td>
                        <td>{indicator.companyObjective}</td>
                        <td>{indicator.code}</td>
                        <td>{indicator.objective}</td>
                        <td>{indicator.krName}</td>
                        <td>{indicator.krContent}</td>
                        <td>{formatWeight(indicator.weight)}</td>
                        <td>{renderActions(indicator)}</td>
                      </tr>
                    );
                  })}
                  {okr.items.length === 0 && <tr><td className="empty" colSpan={8}>暂无数据</td></tr>}
                </tbody>
              </table>
              {renderPagination(okr)}
            </div>
          </section>
        )}

        {currentTab === 'evaluation' && showEvaluation && (
          <section className="indicator-section">
            {renderSectionHeader(
              '评价类',
              evaluation.weightTotal,
              '新增评价类',
              () => openCreate('evaluation'),
            )}
            {renderFilter(evaluation, 'evaluation', '评价类指标')}
            <div className="table-card">
              <table className="indicator-table">
                <thead><tr><th>指标编号</th><th>评价类指标</th><th>权重</th><th>操作</th></tr></thead>
                <tbody>
                  {evaluation.items.map((item) => {
                    const indicator = item as Extract<PerformanceIndicator, { kind: 'evaluation' }>;
                    return (
                      <tr key={indicator.id}>
                        <td>{indicator.code}</td><td>{indicator.indicator}</td>
                        <td>{formatWeight(indicator.weight)}</td><td>{renderActions(indicator)}</td>
                      </tr>
                    );
                  })}
                  {evaluation.items.length === 0 && <tr><td className="empty" colSpan={4}>暂无数据</td></tr>}
                </tbody>
              </table>
              {renderPagination(evaluation)}
            </div>
          </section>
        )}

        {currentTab === 'bonus' && showBonus && (
          <section className="indicator-section">
            {renderSectionHeader('加分项', undefined, '新增加分项', () => openCreate('bonus'))}
            {renderFilter(bonus, 'bonus', '事项名称')}
            <div className="table-card">
              <table className="indicator-table">
                <thead><tr><th>指标编号</th><th>事项名称</th><th>规定情形</th><th>计分标准</th><th>操作</th></tr></thead>
                <tbody>
                  {bonus.items.map((item) => {
                    const indicator = item as Extract<PerformanceIndicator, { kind: 'bonus' }>;
                    return (
                      <tr key={indicator.id}>
                        <td>{indicator.code}</td><td>{indicator.itemName}</td>
                        <td>{indicator.situation}</td><td>{indicator.scoringStandard}</td>
                        <td>{renderActions(indicator)}</td>
                      </tr>
                    );
                  })}
                  {bonus.items.length === 0 && <tr><td className="empty" colSpan={5}>暂无数据</td></tr>}
                </tbody>
              </table>
              {renderPagination(bonus)}
            </div>
          </section>
        )}

        {currentTab === 'penalty' && showPenalty && (
          <section className="indicator-section">
            {renderSectionHeader('减分项', undefined, '新增减分项', () => openCreate('penalty'))}
            {renderFilter(penalty, 'penalty', '事项名称')}
            <div className="table-card">
              <table className="indicator-table">
                <thead><tr><th>指标编号</th><th>事项名称</th><th>规定情形</th><th>计分标准</th><th>操作</th></tr></thead>
                <tbody>
                  {penalty.items.map((item) => {
                    const indicator = item as Extract<PerformanceIndicator, { kind: 'penalty' }>;
                    return (
                      <tr key={indicator.id}>
                        <td>{indicator.code}</td><td>{indicator.itemName}</td>
                        <td>{indicator.situation}</td><td>{indicator.scoringStandard}</td>
                        <td>{renderActions(indicator)}</td>
                      </tr>
                    );
                  })}
                  {penalty.items.length === 0 && <tr><td className="empty" colSpan={5}>暂无数据</td></tr>}
                </tbody>
              </table>
              {renderPagination(penalty)}
            </div>
          </section>
        )}

        {currentTab === 'race' && showRace && (
          <section className="indicator-section">
            {renderSectionHeader('赛马', race.weightTotal, '新增赛马', () => openCreate('race'))}
            {renderFilter(race, 'race', '指标名称')}
            <div className="table-card">
              <table className="indicator-table">
                <thead><tr><th>指标编号</th><th>指标名称</th><th>权重</th><th>操作</th></tr></thead>
                <tbody>
                  {race.items.map((item) => {
                    const indicator = item as Extract<PerformanceIndicator, { kind: 'race' }>;
                    return (
                      <tr key={indicator.id}>
                        <td>{indicator.code}</td><td>{indicator.indicatorName}</td>
                        <td>{formatWeight(indicator.weight)}</td><td>{renderActions(indicator)}</td>
                      </tr>
                    );
                  })}
                  {race.items.length === 0 && <tr><td className="empty" colSpan={4}>暂无数据</td></tr>}
                </tbody>
              </table>
              {renderPagination(race)}
            </div>
          </section>
        )}
      {draft && (
        <div className="modal-backdrop indicator-form-backdrop">
          <form className="modal" onSubmit={submitDraft}>
            <h2>{editingId ? '修改指标' : '新增指标'}</h2>
            <label>
              指标编号
              <input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} />
            </label>
            {(draft.kind === 'kpi' || draft.kind === 'okr') && (
              <label>
                考核层级
                <select
                  value={draft.level}
                  onChange={(event) => setDraft({ ...draft, level: Number(event.target.value) as IndicatorLevel })}
                >
                  {indicatorLevelOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            )}
            {draft.kind === 'kpi' && (
              <>
                <label>
                  指标名称
                  <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                </label>
                <label>
                  目标值
                  <input value={draft.target} onChange={(event) => setDraft({ ...draft, target: event.target.value })} />
                </label>
                <label>
                  权重（%）
                  <input
                    type="number" min={0} step={0.1}
                    value={draft.weight}
                    onChange={(event) => setDraft({ ...draft, weight: Number(event.target.value) })}
                  />
                </label>
              </>
            )}
            {draft.kind === 'okr' && (
              <>
                <label>
                  关联公司级目标(O)
                  <input
                    value={draft.companyObjective}
                    onChange={(event) => setDraft({ ...draft, companyObjective: event.target.value })}
                  />
                </label>
                <label>
                  目标(O)
                  <input value={draft.objective} onChange={(event) => setDraft({ ...draft, objective: event.target.value })} />
                </label>
                <label>
                  关键成果（KR）-类型/名称
                  <input value={draft.krName} onChange={(event) => setDraft({ ...draft, krName: event.target.value })} />
                </label>
                <label>
                  关键成果（KR）-内容
                  <textarea value={draft.krContent} onChange={(event) => setDraft({ ...draft, krContent: event.target.value })} />
                </label>
                <label>
                  权重（%）
                  <input
                    type="number" min={0} step={0.1}
                    value={draft.weight}
                    onChange={(event) => setDraft({ ...draft, weight: Number(event.target.value) })}
                  />
                </label>
              </>
            )}
            {draft.kind === 'evaluation' && (
              <>
                <label>
                  评价类指标
                  <input value={draft.indicator} onChange={(event) => setDraft({ ...draft, indicator: event.target.value })} />
                </label>
                <label>
                  权重（%）
                  <input
                    type="number" min={0} step={0.1}
                    value={draft.weight}
                    onChange={(event) => setDraft({ ...draft, weight: Number(event.target.value) })}
                  />
                </label>
              </>
            )}
            {(draft.kind === 'bonus' || draft.kind === 'penalty') && (
              <>
                <label>
                  事项名称
                  <input value={draft.itemName} onChange={(event) => setDraft({ ...draft, itemName: event.target.value })} />
                </label>
                <label>
                  规定情形
                  <textarea value={draft.situation} onChange={(event) => setDraft({ ...draft, situation: event.target.value })} />
                </label>
                <label>
                  计分标准
                  <textarea
                    value={draft.scoringStandard}
                    onChange={(event) => setDraft({ ...draft, scoringStandard: event.target.value })}
                  />
                </label>
              </>
            )}
            {draft.kind === 'race' && (
              <>
                <label>
                  指标名称
                  <input
                    value={draft.indicatorName}
                    onChange={(event) => setDraft({ ...draft, indicatorName: event.target.value })}
                  />
                </label>
                <label>
                  权重（%）
                  <input
                    type="number" min={0} step={0.1}
                    value={draft.weight}
                    onChange={(event) => setDraft({ ...draft, weight: Number(event.target.value) })}
                  />
                </label>
              </>
            )}
            {error && <p className="error">{error}</p>}
            <div className="modal-actions">
              <button className="button" type="button" onClick={() => setDraft(null)}>取消</button>
              <button className="button primary" type="submit">保存</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
