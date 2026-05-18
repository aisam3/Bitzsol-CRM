export type Role = "admin" | "business_developer";
export type UserStatus = "active" | "inactive";
export type LeadEmailStatus = "Verified" | "Not_Verified";
export type LeadPhoneStatus = "Verified" | "Not_Verified";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  createdById: string;
  createdAt: string;
  createdBy?: { name: string; email: string };
  _count?: { leads: number };
}

export interface LeadEmail {
  id: string;
  email: string;
  status: LeadEmailStatus;
}

export interface LeadPhone {
  id: string;
  phone: string;
  status: LeadPhoneStatus;
}

export interface LeadCustomField {
  id: string;
  key: string;
  value: string;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  date: string;
  designation?: string;
  leadSource: string;
  sourceLink?: string;
  remarks?: string;
  status: string;
  pipelineId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  pipeline?: { id: string; name: string };
  createdBy?: { id: string; name: string; email: string };
  emails: LeadEmail[];
  phones: LeadPhone[];
  customFields: LeadCustomField[];
}

export interface DashboardStats {
  totalLeads: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
  leadsThisYear: number;
  leadsByStatus: { status: string; _count: number }[];
  // Admin only
  perUserStats?: {
    userId: string;
    userName: string;
    userEmail: string;
    totalLeads: number;
    leadsThisMonth: number;
    leadsByStatus: { status: string; _count: number }[];
  }[];
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}
