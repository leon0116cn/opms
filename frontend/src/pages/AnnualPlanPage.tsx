import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { AnnualPlan, AnnualPlanStatus } from '../types/annual-plan';
import {
  createPlan,
  deletePlan,
  formatDate,
  formatDisplayDate,
  listPlans,
  statusLabel,
  statusOptions,
  updatePlan,
  yearOptions,
} from '../services/annual-plan-service';

const emptyDraft = {
  name: '',
  year: String(new Date().getFullYear()),
  startDate: formatDate(new Date()),
  endDate: formatDate(new Date()),
  unitCount: 0,
  status: 0 as AnnualPlanStatus,
};

type Draft = typeof emptyDraft;
const statusClass = ['draft', 'running', 'completed'];

export default function AnnualPlanPage() {
  const [filters, setFilters] = useState({ name: '', year: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');

  const queryState = useMemo(
    () => ({ ...query, page, pageSize }),
    [query, page],
  );
  const { items, total } = useMemo(() => listPlans(queryState), [queryState]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery({ ...filters });
  }

  function resetFilters() {
    setFilters({ name: '', year: '', status: '' });
    setQuery({ name: '', year: '', status: '' });
    setPage(1);
  }

  function openCreate() {
    setDraft(emptyDraft);
    setEditingId(null);
    setError('');
    setFormOpen(true);
  }

  function openEdit(plan: AnnualPlan) {
    setDraft({
      name: plan.name,
      year: plan.year,
      startDate: plan.startDate,
      endDate: plan.endDate,
      unitCount: plan.unitCount,
      status: plan.status,
    });
    setEditingId(plan.id);
    setError('');
    setFormOpen(true);
  }

  function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) {
      setError('请输入名称');
      return;
    }
    if (!/^\d{6}$/.test(draft.startDate) || !/^\d{6}$/.test(draft.endDate)) {
      setError('时间格式必须为 YYMMDD');
      return;
    }
    if (draft.endDate < draft.startDate) {
      setError('结束时间不得早于开始时间');
      return;
    }
    if (draft.unitCount < 0 || !Number.isInteger(draft.unitCount)) {
      setError('考核单位数量必须为非负整数');
      return;
    }

    if (editingId) {
      updatePlan(editingId, draft);
    } else {
      createPlan(draft);
    }
    setFormOpen(false);
    setPage(1);
    setQuery({ ...filters });
  }

  function removePlan(id: string) {
    deletePlan(id);
    setQuery({ ...filters });
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>年度考核计划</h1>
          <p>维护年度考核计划的基本信息、周期与状态</p>
        </div>
        <button className="button primary" onClick={openCreate}>
          新增计划
        </button>
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
          <select
            value={filters.year}
            onChange={(event) => setFilters({ ...filters, year: event.target.value })}
          >
            <option value="">全部</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}</option>
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
            {statusOptions.map((option) => (
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
              <th>开始时间</th>
              <th>结束时间</th>
              <th>考核单位数量</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((plan) => (
              <tr key={plan.id}>
                <td>{plan.name}</td>
                <td>{plan.year}</td>
                <td>{formatDisplayDate(plan.startDate)}</td>
                <td>{formatDisplayDate(plan.endDate)}</td>
                <td>{plan.unitCount}</td>
                <td>
                  <span className={`status ${statusClass[plan.status]}`}>
                    {statusLabel(plan.status)}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="link-button" onClick={() => openEdit(plan)}>修改</button>
                    <button className="link-button danger" onClick={() => removePlan(plan.id)}>
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="empty" colSpan={7}>暂无数据</td>
              </tr>
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
            <h2>{editingId ? '修改考核计划' : '新增考核计划'}</h2>
            <label>
              名称
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="如：2026年度考核计划"
                autoFocus
              />
            </label>
            <label>
              年度
              <input
                value={draft.year}
                onChange={(event) => setDraft({ ...draft, year: event.target.value })}
              />
            </label>
            <div className="form-grid">
              <label>
                开始时间
                <input
                  value={draft.startDate}
                  onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
                  placeholder="YYMMDD"
                />
              </label>
              <label>
                结束时间
                <input
                  value={draft.endDate}
                  onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
                  placeholder="YYMMDD"
                />
              </label>
            </div>
            <label>
              考核单位数量
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
                  status: Number(event.target.value) as AnnualPlanStatus,
                })}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {error && <p className="error">{error}</p>}
            <div className="modal-actions">
              <button className="button" type="button" onClick={() => setFormOpen(false)}>
                取消
              </button>
              <button className="button primary" type="submit">保存</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
