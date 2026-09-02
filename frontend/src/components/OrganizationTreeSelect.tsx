import { useMemo, useState } from 'react';
import type { Organization } from '../types/organization';

interface TreeNode extends Organization {
  children: TreeNode[];
}

interface OrganizationTreeSelectProps {
  organizations: Organization[];
  value: string[];
  multiple?: boolean;
  placeholder?: string;
  clearLabel?: string;
  allowDisabled?: boolean;
  onChange: (value: string[]) => void;
}

function buildTree(organizations: Organization[]) {
  const nodes = new Map<string, TreeNode>(
    [...organizations]
      .sort((left, right) => left.order - right.order)
      .map((organization) => [organization.id, { ...organization, children: [] }]),
  );
  const tree: TreeNode[] = [];

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      tree.push(node);
    }
  }

  function sortNodes(node: TreeNode) {
    node.children.sort((left, right) => left.order - right.order);
    node.children.forEach(sortNodes);
  }
  tree.forEach(sortNodes);
  return tree;
}

export default function OrganizationTreeSelect({
  organizations,
  value,
  multiple = false,
  placeholder = '请选择考核单位',
  clearLabel,
  allowDisabled = false,
  onChange,
}: OrganizationTreeSelectProps) {
  const [open, setOpen] = useState(false);
  const tree = useMemo(() => buildTree(organizations), [organizations]);

  function toggle(name: string) {
    if (!multiple) {
      onChange([name]);
      setOpen(false);
      return;
    }
    onChange(value.includes(name) ? value.filter((item) => item !== name) : [...value, name]);
  }

  function renderNodes(nodes: TreeNode[], depth = 0) {
    return nodes.map((node) => {
      const selected = value.includes(node.name);
      const disabled = node.status === 0 && !allowDisabled && !selected;
      return (
        <div key={node.id}>
          <button
            className={selected ? 'tree-option selected' : 'tree-option'}
            disabled={disabled}
            onClick={() => toggle(node.name)}
            style={{ paddingLeft: 10 + depth * 16 }}
            type="button"
          >
            {multiple && (
              <input
                checked={selected}
                disabled={disabled}
                onChange={() => toggle(node.name)}
                type="checkbox"
              />
            )}
            <span>{node.name}</span>
            {node.status === 0 && <span className="tree-disabled-tag">禁用</span>}
          </button>
          {node.children.length > 0 && renderNodes(node.children, depth + 1)}
        </div>
      );
    });
  }

  return (
    <div
      className="tree-select"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        className={open ? 'tree-select-trigger open' : 'tree-select-trigger'}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{value.length ? value.join('、') : placeholder}</span>
        <span className="tree-select-arrow">▾</span>
      </button>
      {open && (
        <div className="tree-select-panel">
          {clearLabel && (
            <button
              className="tree-option clear"
              onClick={() => {
                onChange([]);
                setOpen(false);
              }}
              type="button"
            >
              {clearLabel}
            </button>
          )}
          {renderNodes(tree)}
          {tree.length === 0 && <div className="tree-empty">暂无组织</div>}
        </div>
      )}
    </div>
  );
}
