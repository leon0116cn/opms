export type OrganizationStatus = 0 | 1;

export interface Organization {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string;
  order: number;
  status: OrganizationStatus;
}
