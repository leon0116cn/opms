import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Organization, OrganizationStatus } from '../types/organization';
import type { OrganizationNode } from '../services/organization-service';
import {
  createOrganization,
  deleteOrganization,
  getOrganizationOptions,
  getOrganizationTree,
  listOrganizations,
  organizationStatusOptions,
  toggleOrganizationStatus,
  updateOrganization,
} from '../services/organization-service';

const emptyDraft = {
  name: '',
  parentId: '' as string | null,
  order: 0,
  status: 1 as OrganizationStatus,
};

type Draft = typeof emptyDraft;

export default function OrganizationPage() {
  const [filters, setFilters] = useState({ name: '', parentName: '', status: '' });
  const [query, setQuery] = useState(filters);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const tree = useMemo(
    () => getOrganizationTree(),
    [refreshKey],
  );
  const queryState = useMemo(() => ({ ...query, page, pageSize }), [query, page]);
  const { items, total } = useMemo(
    () => listOrganizations(queryState),
    [queryState, refreshKey],
  );
  const parentOptions = useMemo(
    () => getOrganizationOptions(editingId ?? undefined),
    [editingId, refreshKey],
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSelectedNode(null);
    setQuery({ ...filters });
  }

  function resetFilters() {
    const empty = { name: '', parentName: '', status: '' };
    setFilters(empty);
    setQuery(empty);
    setSelectedNode(null);
    setPage(1);
  }

  function selectNode(node: OrganizationNode) {
    setSelectedNode(node.id);
    setPage(1);
    setFilters({ name: '', parentName: node.name, status: '' });
    setQuery({ name: '', parentName: node.name, status: '' });
  }

  function openCreate() {
    setDraft(emptyDraft);
    setEditingId(null);
    setError('');
    setFormOpen(true);
  }

  function openEdit(organization: Organization) {
    setDraft({
      name: organization.name,
      parentId: organization.parentId,
      order: organization.order,
      status: organization.status,
    });
    setEditingId(organization.id);
    setError('');
    setFormOpen(true);
  }

  function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) {
      setError('请输入名称');
      return;
    }
    if (!Number.isInteger(draft.order)) {
      setError('排序号必须为整数');
      return;
    }

    const data = {
      name: draft.name.trim(),
      parentId: draft.parentId || null,
      order: draft.order,
      status: draft.status,
    };
    if (editingId) {
      updateOrganization(editingId, data);
    } else {
      createOrganization(data);
    }
    setFormOpen(false);
    setRefreshKey((key) => key + 1);
    setPage(1);
  }

  function toggleStatus(id: string) {
    toggleOrganizationStatus(id);
    setRefreshKey((key) => key + 1);
    setQuery({ ...filters });
  }

  function removeOrganization(id: string) {
    deleteOrganization(id);
    setRefreshKey((key) => key + 1);
    setQuery({ ...filters });
  }

  function renderTree(nodes: OrganizationNode[], depth = 0) {
    return nodes.map((node) => (
      <div key={node.id}>
        <button
          className={selectedNode === node.id ? 'tree-node active' : 'tree-node'}
          style={{ paddingLeft: 10 + depth * 16 }}
          onClick={() => selectNode(node)}
          type="button"
        >
          <span className={node.status === 1 ? 'tree-dot enabled' : 'tree-dot disabled'} />
          {node.name}
        </button>
        {node.children.length > 0 && renderTree(node.children, depth + 1)}
      </div>
    ));
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>组织架构</h1>
          <p>维护组织层级、状态与基础信息</p>
        </div>
        <button className="button primary" onClick={openCreate}>新增组织</button>
      </header>

      <div className="organization-layout">
        <aside className="organization-tree card">
          <div className="tree-header">组织树</div>
          <button
            className={selectedNode ? 'tree-node' : 'tree-node active'}
            onClick={resetFilters}
            type="button"
          >
            全部组织
          </button>
          {renderTree(tree)}
        </aside>

        <div className="organization-main">
          <form className="filter-bar" onSubmit={applyFilters}>
            <label>
              名称
              <input
                value={filters.name}
                onChange={(event) => setFilters({ ...filters, name: event.target.value })}
                placeholder="请输入组织名称"
              />
            </label>
            <label>
              上级组织名称
              <input
                value={filters.parentName}
                onChange={(event) => setFilters({ ...filters, parentName: event.target.value })}
                placeholder="请输入上级组织名称"
              />
            </label>
            <label>
              状态
              <select
                value={filters.status}
                onChange={(event) => setFilters({ ...filters, status: event.target.value })}
              >
                <option value="">全部</option>
                {organizationStatusOptions.map((option) => (
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
                  <th>上级组织名称</th>
                  <th>排序号</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((organization) => (
                  <tr key={organization.id}>
                    <td>{organization.name}</td>
                    <td>{organization.parentName || '-'}</td>
                    <td>{organization.order}</td>
                    <td>
                      <span className={`status ${organization.status === 1 ? 'running' : 'disabled'}`}>
                        {organization.status === 1 ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="link-button" onClick={() => openEdit(organization)}>修改</button>
                        <button
                          className="link-button"
                          onClick={() => toggleStatus(organization.id)}
                        >
                          {organization.status === 1 ? '禁用' : '启用'}
                        </button>
                        <button
                          className="link-button danger"
                          onClick={() => removeOrganization(organization.id)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td className="empty" colSpan={5}>暂无数据</td></tr>
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
        </div>
      </div>

      {formOpen && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={submitDraft}>
            <h2>{editingId ? '修改组织' : '新增组织'}</h2>
            <label>
              名称
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="如：技术运营部"
                autoFocus
              />
            </label>
            <label>
              上级组织
              <select
                value={draft.parentId ?? ''}
                onChange={(event) => setDraft({ ...draft, parentId: event.target.value || null })}
              >
                <option value="">无（作为一级组织）</option>
                {parentOptions.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              排序号
              <input
                type="number"
                value={draft.order}
                onChange={(event) => setDraft({ ...draft, order: Number(event.target.value) })}
              />
            </label>
            <label>
              状态
              <select
                value={draft.status}
                onChange={(event) => setDraft({
                  ...draft,
                  status: Number(event.target.value) as OrganizationStatus,
                })}
              >
                {organizationStatusOptions.map((option) => (
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
    </section>
  );
}
