export type Role = 'ADMIN' | 'LAWYER' | 'STAFF';
export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type ActivityStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active?: boolean;
  createdAt?: string;
}

export interface Client {
  id: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  actionType: string;
  entryDate: string;
  responsible: string;
  notes?: string;
  status: ClientStatus;
  createdAt: string;
  createdBy?: { name: string };
  _count?: { activities: number };
  activities?: Activity[];
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
  date: string;
  responsible: string;
  status: ActivityStatus;
  clientId: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { name: string };
  files: FileAttachment[];
}

export interface FileAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  activity?: { id: string; title: string; clientId: string } | null;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  changes?: Record<string, unknown>;
  createdAt: string;
  user: { name: string };
}
