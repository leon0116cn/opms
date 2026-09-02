import type { Organization, OrganizationStatus } from '../types/organization';

const storageKey = 'opms-organizations';

export const organizationStatusOptions: Array<{ value: OrganizationStatus; label: string }> = [
  { value: 0, label: '禁用' },
  { value: 1, label: '启用' },
];

export interface OrganizationNode extends Organization {
  children: OrganizationNode[];
}

function getOrganizations() {
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    return (JSON.parse(stored) as Organization[]).map((organization) => ({
      ...organization,
      order: organization.order ?? 0,
    }));
  }
  return seedOrganizations();
}

function saveOrganizations(organizations: Organization[]) {
  localStorage.setItem(storageKey, JSON.stringify(organizations));
}

function seedOrganizations(): Organization[] {
  const root = createOrganizationRecord('集团公司', null, '', 1);
  const firstLevel = [
    createOrganizationRecord('技术运营部', root.id, root.name, 1),
    createOrganizationRecord('战略与会员管理部', root.id, root.name, 2),
    createOrganizationRecord('人力资源部', root.id, root.name, 3),
  ];
  const platform = createOrganizationRecord('平台技术组', firstLevel[0].id, firstLevel[0].name, 1);
  const member = createOrganizationRecord('会员运营组', firstLevel[1].id, firstLevel[1].name, 2);
  return [root, ...firstLevel, platform, member];
}

function createOrganizationRecord(
  name: string,
  parentId: string | null,
  parentName: string,
  order: number,
): Organization {
  return {
    id: crypto.randomUUID(),
    name,
    parentId,
    parentName,
    order,
    status: 1,
  };
}

export function listOrganizations(params: {
  page: number;
  pageSize: number;
  name?: string;
  parentName?: string;
  status?: string;
}) {
  const organizations = getOrganizations().filter((organization) => {
    const matchesName = params.name ? organization.name.includes(params.name.trim()) : true;
    const matchesParent = params.parentName
      ? organization.parentName.includes(params.parentName.trim())
      : true;
    const matchesStatus = params.status ? String(organization.status) === params.status : true;
    return matchesName && matchesParent && matchesStatus;
  });

  const sorted = [...organizations].sort((left, right) => left.order - right.order);
  const start = (params.page - 1) * params.pageSize;
  return {
    items: sorted.slice(start, start + params.pageSize),
    total: organizations.length,
  };
}

export function getOrganizationTree() {
  const organizations = getOrganizations();
  const nodes = new Map<string, OrganizationNode>(
    organizations
      .sort((left, right) => left.order - right.order)
      .map((organization) => [organization.id, { ...organization, children: [] }]),
  );
  const tree: OrganizationNode[] = [];

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      tree.push(node);
    }
  }
  return tree.map((node) => sortTree(node));
}

function sortTree(node: OrganizationNode): OrganizationNode {
  node.children.sort((left, right) => left.order - right.order);
  node.children.forEach((child) => sortTree(child));
  return node;
}

export function getOrganizationOptions(excludeId?: string) {
  return getOrganizations().filter((organization) => organization.id !== excludeId);
}

export function createOrganization(data: Omit<Organization, 'id' | 'parentName'>) {
  const organizations = getOrganizations();
  const parent = organizations.find((organization) => organization.id === data.parentId);
  const organization = {
    ...data,
    id: crypto.randomUUID(),
    parentName: parent?.name ?? '',
  };
  saveOrganizations([...organizations, organization]);
  return organization;
}

export function updateOrganization(id: string, data: Omit<Organization, 'id' | 'parentName'>) {
  saveOrganizations(getOrganizations().map((organization) => {
    if (organization.id !== id) return organization;
    const parent = getOrganizations().find((item) => item.id === data.parentId);
    return { ...organization, ...data, parentName: parent?.name ?? '' };
  }));
}

export function toggleOrganizationStatus(id: string) {
  saveOrganizations(getOrganizations().map((organization) => (
    organization.id === id ? { ...organization, status: organization.status === 1 ? 0 : 1 } : organization
  )));
}

export function deleteOrganization(id: string) {
  saveOrganizations(getOrganizations().filter((organization) => organization.id !== id));
}
