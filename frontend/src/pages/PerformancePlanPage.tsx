import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { PerformancePlan, PerformancePlanStatus } from '../types/performance-plan';
import {
  createPlans,
  deletePlan,
  listPlans,
  performancePlanStatusOptions,
  updatePlan,
} from '../services/performance-plan-service';
import { getOrganizationOptions } from '../services/organization-service';
import { listPlans as listAnnualPlans } from '../services/annual-plan-service';
import { formatComponents, listTemplates } from '../services/scheme-template-service';
import OrganizationTreeSelect from '../components/OrganizationTreeSelect';
import PerformanceIndicatorConfigDialog from '../components/PerformanceIndicatorConfigDialog';

interface Draft {
  annualPlanId: string;
  templateId: string;
  organizationNames: string[];
  status: PerformancePlanStatus;
}

const emptyDraft: Draft = {
  annualPlanId: '',
  templateId: '',
  organizationNames: [],
  status: 1,
};

export default function PerformancePlanPage() {
  const [filters, setFilters] = useState({
    annualPlanId: '',
    organizationNames: [] as string[],
    templateName: '',
    status: '',
  });
  const [query, setQuery] = useState(filters);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [configPlan, setConfigPlan] = useState<PerformancePlan | null>(null);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const queryState = useMemo(() => ({ ...query, page, pageSize }), [query, page]);
  const { items, total } = useMemo(
    () => listPlans(queryState),
    [queryState, refreshKey],
  );
  const allTemplates = useMemo(
    () => listTemplates({ page: 1, pageSize: 1000 }).items,
    [refreshKey],
  );
  const templates = allTemplates.filter((template) => template.status === 1);
  const organizations = useMemo(() => getOrganizationOptions(), [refreshKey]);
  const annualPlans = useMemo(
    () => listAnnualPlans({ page: 1, pageSize: 1000 }).items,
    [refreshKey],
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const configTemplate = configPlan
    ? allTemplates.find((template) => template.id === configPlan.templateId)
      ?? allTemplates.find((template) => template.name === configPlan.templateName)
    : undefined;

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery({ ...filters });
  }

  function resetFilters() {
    const empty = {
      annualPlanId: '',
      organizationNames: [] as string[],
      templateName: '',
      status: '',
    };
    setFilters(empty);
    setQuery(empty);
    setPage(1);
  }

  function openCreate() {
    setDraft(emptyDraft);
    setEditingId(null);
    setError('');
    setFormOpen(true);
  }

  function openEdit(plan: PerformancePlan) {
    setDraft({
      annualPlanId: plan.annualPlanId,
      templateId: plan.templateId,
      organizationNames: [plan.organizationName],
      status: plan.status,
    });
    setEditingId(plan.id);
    setError('');
    setFormOpen(true);
  }

  function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const annualPlan = annualPlans.find((item) => item.id === draft.annualPlanId);
    const template = templates.find((item) => item.id === draft.templateId);
    if (!annualPlan) {
      setError('请选择年度考核计划');
      return;
    }
    if (!template) {
      setError('请选择考核模板');
      return;
    }
    if (draft.organizationNames.length === 0) {
      setError('请至少选择一个考核单位');
      return;
    }

    const commonData = {
      annualPlanId: annualPlan.id,
      annualPlanName: annualPlan.name,
      templateId: template.id,
      templateName: template.name,
      components: formatComponents(template.components),
      status: draft.status,
    };
    if (editingId) {
      updatePlan(editingId, {
        ...commonData,
        organizationName: draft.organizationNames[0],
      });
      if (draft.organizationNames.length > 1) {
        createPlans(
          template,
          draft.organizationNames.slice(1),
          annualPlan.id,
          annualPlan.name,
          draft.status,
        );
      }
    } else {
      createPlans(
        template,
        draft.organizationNames,
        annualPlan.id,
        annualPlan.name,
        draft.status,
      );
    }
    setFormOpen(false);
    setRefreshKey((key) => key + 1);
    setPage(1);
    setQuery({ ...filters });
  }

  function removePlan(id: string) {
    deletePlan(id);
    setRefreshKey((key) => key + 1);
    setQuery({ ...filters });
  }

  if (configPlan && configTemplate) {
    return (
      <PerformanceIndicatorConfigDialog
        plan={configPlan}
        template={configTemplate}
        onClose={() => setConfigPlan(null)}
      />
    );
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>组织绩效方案</h1>
          <p>为考核单位配置年度绩效方案模板</p>
        </div>
        <button className="button primary" onClick={openCreate}>新增方案</button>
      </header>

      <form className="filter-bar" onSubmit={applyFilters}>
        <label>
          年度考核计划
          <select
            value={filters.annualPlanId}
            onChange={(event) => setFilters({ ...filters, annualPlanId: event.target.value })}
          >
            <option value="">全部计划</option>
            {annualPlans.map((annualPlan) => (
              <option key={annualPlan.id} value={annualPlan.id}>{annualPlan.name}</option>
            ))}
          </select>
        </label>
        <label>
          考核单位（可多选）
          <OrganizationTreeSelect
            allowDisabled
            multiple
            clearLabel="全部组织"
            organizations={organizations}
            placeholder="请选择考核单位"
            value={filters.organizationNames}
            onChange={(value) => setFilters({ ...filters, organizationNames: value })}
          />
        </label>
        <label>
          方案模板
          <select
            value={filters.templateName}
            onChange={(event) => setFilters({ ...filters, templateName: event.target.value })}
          >
            <option value="">全部模板</option>
            {templates.map((template) => (
              <option key={template.id} value={template.name}>{template.name}</option>
            ))}
          </select>
        </label>
        <label>
          状态
          <select
            value={filters.status}
            onChange={(event) => setFilters({ ...filters, status: event.target.value })}
          >
            <option value="">全部</option>
            {performancePlanStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <div className="filter-actions">
          <button className="button primary" type="submit">查询</button>
          <button className="button" type="button" onClick={resetFilters}>重置</button>
        </div>
      </form>

      <div className="card table-card performance-table-card">
        <table className="performance-table">
          <colgroup>
            <col style={{ width: '13%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '25%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '180px' }} />
          </colgroup>
          <thead>
            <tr>
              <th>考核单位</th>
              <th>年度考核计划</th>
              <th>方案模板</th>
              <th>方案组成</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((plan) => (
              <tr key={plan.id}>
                <td title={plan.organizationName}>{plan.organizationName}</td>
                <td title={plan.annualPlanName}>{plan.annualPlanName}</td>
                <td title={plan.templateName}>{plan.templateName}</td>
                <td className="composition" title={plan.components}>{plan.components}</td>
                <td className="operation-cell">
                  <span className={`status ${plan.status === 1 ? 'running' : 'disabled'}`}>
                    {plan.status === 1 ? '启用' : '禁用'}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="link-button" onClick={() => openEdit(plan)}>修改</button>
                    <button className="link-button danger" onClick={() => removePlan(plan.id)}>删除</button>
                    <button
                      className="link-button"
                      onClick={() => setConfigPlan(plan)}
                      type="button"
                    >
                      配置指标
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td className="empty" colSpan={6}>暂无数据</td></tr>
            )}
          </tbody>
        </table>
        <div className="pagination">
          <span>共 {total} 条</span>
          <div>
            <button
              className="button small"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              上一页
            </button>
            <span className="page-number">{currentPage} / {totalPages}</span>
            <button
              className="button small"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      {formOpen && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={submitDraft}>
            <h2>{editingId ? '修改组织绩效方案' : '新增组织绩效方案'}</h2>
            <label>
              年度考核计划
              <select
                value={draft.annualPlanId}
                onChange={(event) => {
                  setDraft({
                    ...draft,
                    annualPlanId: event.target.value,
                  });
                }}
              >
                <option value="">请选择年度考核计划</option>
                {annualPlans.map((annualPlan) => (
                  <option key={annualPlan.id} value={annualPlan.id}>{annualPlan.name}</option>
                ))}
              </select>
            </label>
            <label>
              考核模板
              <select
                value={draft.templateId}
                onChange={(event) => setDraft({ ...draft, templateId: event.target.value })}
              >
                <option value="">请选择考核模板</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </label>
            <label>
              考核单位（可多选）
              <OrganizationTreeSelect
                multiple
                organizations={organizations}
                value={draft.organizationNames}
                onChange={(value) => setDraft({ ...draft, organizationNames: value })}
              />
            </label>
            {editingId && (
              <label>
                状态
                <select
                  value={draft.status}
                  onChange={(event) => setDraft({
                    ...draft,
                    status: Number(event.target.value) as PerformancePlanStatus,
                  })}
                >
                  {performancePlanStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            )}
            {error && <p className="error">{error}</p>}
            <div className="modal-actions">
              <button className="button" type="button" onClick={() => setFormOpen(false)}>取消</button>
              <button className="button primary" type="submit">保存</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
