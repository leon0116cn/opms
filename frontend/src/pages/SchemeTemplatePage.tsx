import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  ComponentType,
  SchemeComponent,
  SchemeTemplate,
  SchemeTemplateStatus,
  TargetMethod,
} from '../types/scheme-template';
import {
  componentDefinitions,
  componentLabel,
  createTemplate,
  deleteTemplate,
  formatComponents,
  listTemplates,
  templateStatusOptions,
  updateTemplate,
} from '../services/scheme-template-service';
import { yearOptions } from '../services/annual-plan-service';

const emptyDraft = {
  name: '',
  year: String(new Date().getFullYear()),
  components: [] as SchemeComponent[],
  unitCount: 0,
  status: 1 as SchemeTemplateStatus,
};

type Draft = typeof emptyDraft;

export default function SchemeTemplatePage() {
  const [filters, setFilters] = useState({ name: '', year: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [configComponents, setConfigComponents] = useState<SchemeComponent[]>([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [error, setError] = useState('');
  const [configError, setConfigError] = useState('');

  const queryState = useMemo(() => ({ ...query, page, pageSize }), [query, page]);
  const { items, total } = useMemo(() => listTemplates(queryState), [queryState]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery({ ...filters });
  }

  function resetFilters() {
    const empty = { name: '', year: '', status: '' };
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

  function openEdit(template: SchemeTemplate) {
    setDraft({
      name: template.name,
      year: template.year,
      components: template.components,
      unitCount: template.unitCount,
      status: template.status,
    });
    setEditingId(template.id);
    setError('');
    setFormOpen(true);
  }

  function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) {
      setError('请输入名称');
      return;
    }
    if (draft.unitCount < 0 || !Number.isInteger(draft.unitCount)) {
      setError('使用单位数量必须为非负整数');
      return;
    }

    if (editingId) {
      updateTemplate(editingId, draft);
    } else {
      createTemplate(draft);
    }
    setFormOpen(false);
    setPage(1);
    setQuery({ ...filters });
  }

  function openConfig(template: SchemeTemplate) {
    setConfigId(template.id);
    setConfigComponents(template.components.map((component) => ({ ...component })));
    setConfigError('');
    setConfigOpen(true);
  }

  function toggleComponent(type: ComponentType) {
    setConfigComponents((current) => {
      if (current.some((component) => component.type === type)) {
        return current.filter((component) => component.type !== type);
      }
      const definition = componentDefinitions.find((item) => item.type === type);
      return [...current, {
        type,
        weight: definition?.requiresWeight ? 0 : undefined,
        targetMethods: definition?.requiresTargetMethod ? [] : undefined,
      }];
    });
  }

  function updateComponent(type: ComponentType, changes: Partial<SchemeComponent>) {
    setConfigComponents((current) => current.map((component) => (
      component.type === type ? { ...component, ...changes } : component
    )));
  }

  function submitConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const totalWeight = configComponents.reduce((sum, component) => sum + (component.weight ?? 0), 0);
    if (totalWeight !== 100) {
      setConfigError('带权重的方案组成合计必须为 100%');
      return;
    }
    for (const component of configComponents) {
      const definition = componentDefinitions.find((item) => item.type === component.type);
      if (definition?.requiresWeight && (component.weight === undefined || component.weight <= 0)) {
        setConfigError(`${componentLabel(component)}必须配置大于 0 的权重`);
        return;
      }
      if (definition?.requiresTargetMethod && !component.targetMethods?.length) {
        setConfigError('目标考核至少选择一个二级类目');
        return;
      }
    }

    const template = items.find((item) => item.id === configId);
    if (!template) return;
    updateTemplate(template.id, {
      name: template.name,
      year: template.year,
      components: configComponents,
      unitCount: template.unitCount,
      status: template.status,
    });
    setConfigOpen(false);
    setQuery({ ...filters });
  }

  function removeTemplate(id: string) {
    deleteTemplate(id);
    setQuery({ ...filters });
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>方案模板</h1>
          <p>维护考核方案模板与组成结构</p>
        </div>
        <button className="button primary" onClick={openCreate}>新增模板</button>
      </header>

      <form className="filter-bar" onSubmit={applyFilters}>
        <label>
          名称
          <input
            value={filters.name}
            onChange={(event) => setFilters({ ...filters, name: event.target.value })}
            placeholder="请输入名称关键字"
          />
        </label>
        <label>
          年度
          <select value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })}>
            <option value="">全部</option>
            {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label>
          状态
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">全部</option>
            {templateStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <div className="filter-actions">
          <button className="button primary" type="submit">查询</button>
          <button className="button" type="button" onClick={resetFilters}>重置</button>
        </div>
      </form>

      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>名称</th>
              <th>年度</th>
              <th>方案组成</th>
              <th>使用单位数量</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((template) => (
              <tr key={template.id}>
                <td>{template.name}</td>
                <td>{template.year}</td>
                <td className="composition">{formatComponents(template.components) || '-'}</td>
                <td>{template.unitCount}</td>
                <td>
                  <span className={`status ${template.status === 1 ? 'running' : 'disabled'}`}>
                    {template.status === 1 ? '启用' : '禁用'}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="link-button" onClick={() => openEdit(template)}>修改</button>
                    <button className="link-button danger" onClick={() => removeTemplate(template.id)}>删除</button>
                    <button className="link-button" onClick={() => openConfig(template)}>配置模板</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td className="empty" colSpan={6}>暂无数据</td></tr>}
          </tbody>
        </table>
        <div className="pagination">
          <span>共 {total} 条</span>
          <div>
            <button className="button small" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>上一页</button>
            <span className="page-number">{currentPage} / {totalPages}</span>
            <button className="button small" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>下一页</button>
          </div>
        </div>
      </div>

      {formOpen && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={submitDraft}>
            <h2>{editingId ? '修改方案模板' : '新增方案模板'}</h2>
            <label>
              名称
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="如：前台部门考核模板"
                autoFocus
              />
            </label>
            <label>
              年度
              <input value={draft.year} onChange={(event) => setDraft({ ...draft, year: event.target.value })} />
            </label>
            <label>
              使用单位数量
              <input
                type="number"
                min={0}
                step={1}
                value={draft.unitCount}
                onChange={(event) => setDraft({ ...draft, unitCount: Number(event.target.value) })}
              />
            </label>
            <label>
              状态
              <select
                value={draft.status}
                onChange={(event) => setDraft({
                  ...draft,
                  status: Number(event.target.value) as SchemeTemplateStatus,
                })}
              >
                {templateStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {error && <p className="error">{error}</p>}
            <div className="modal-actions">
              <button className="button" type="button" onClick={() => setFormOpen(false)}>取消</button>
              <button className="button primary" type="submit">保存</button>
            </div>
          </form>
        </div>
      )}

      {configOpen && (
        <div className="modal-backdrop">
          <form className="modal configuration" onSubmit={submitConfig}>
            <div className="configuration-header">
              <div>
                <h2>配置方案组成</h2>
                <p>选择一级类目并配置对应规则</p>
              </div>
              <span>
                权重合计 {configComponents.reduce((sum, component) => sum + (component.weight ?? 0), 0)}%
              </span>
            </div>
            {componentDefinitions.map((definition) => {
              const component = configComponents.find((item) => item.type === definition.type);
              return (
                <div className={component ? 'component-row selected' : 'component-row'} key={definition.type}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={Boolean(component)}
                      onChange={() => toggleComponent(definition.type)}
                    />
                    {definition.label}
                  </label>
                  {component && definition.requiresWeight && (
                    <label className="weight-control">
                      <span>权重</span>
                      <div className="weight-field">
                        <input
                          className="weight-input"
                          type="number"
                          min={1}
                          max={100}
                          value={component.weight}
                          onChange={(event) => updateComponent(component.type, { weight: Number(event.target.value) })}
                        />
                        <span>%</span>
                      </div>
                    </label>
                  )}
                  {component && definition.requiresTargetMethod && (
                    <div className="method-options">
                      {(['KPI', 'OKR'] as TargetMethod[]).map((method) => (
                        <label key={method}>
                          <input
                            type="checkbox"
                            checked={component.targetMethods?.includes(method) ?? false}
                            onChange={(event) => {
                              const current = component.targetMethods ?? [];
                              const next = event.target.checked
                                ? [...current, method]
                                : current.filter((item) => item !== method);
                              updateComponent(component.type, { targetMethods: next });
                            }}
                          />
                          {method}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {configError && <p className="error">{configError}</p>}
            <div className="modal-actions">
              <button className="button" type="button" onClick={() => setConfigOpen(false)}>取消</button>
              <button className="button primary" type="submit">保存配置</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
