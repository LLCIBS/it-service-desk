/** Запись справочника сотрудников (заполняет администратор) */
export interface DirectoryEmployee {
  id: string;
  department: string;
  fullName: string;
  mobile: string;
}

export type UserRole = 'employee' | 'it_agent' | 'org_admin';

export interface DirectoryEmployeeAdmin extends DirectoryEmployee {
  email?: string;
  role?: UserRole;
  hasLogin: boolean;
}

export interface AuthEmployee {
  id: string;
  department: string;
  fullName: string;
  mobile: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  employee: AuthEmployee | null;
}

export interface AuthOrganization {
  id: string;
  slug: string;
  name: string;
}

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'new' | 'in-progress' | 'waiting-for-info' | 'waiting-for-resources' | 'resolved' | 'closed' | 'cancelled';

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface Ticket {
  id: string;
  department: string;
  requesterName: string;
  contactInfo: {
    phone: string;
    mobile: string;
    email: string;
    preferred: string;
  };
  location: string;
  problemType: string;
  title: string;
  description: string;
  createdAt: string;
  priority: Priority;
  remoteAccess: boolean;
  inventoryNumber?: string;
  os?: string;
  softwareName?: string;
  files: string[];
  status: TicketStatus;
  assignee?: string;
  deadline?: string;
  internalComments: Comment[];
  resolution?: string;
}
