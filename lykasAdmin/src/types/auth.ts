export type UserRole = "user" | "staff" | "admin" | "super_admin";
export type UserStatus = "active" | "suspended" | "locked";
export type IdentityVerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export interface AuthUser {
  _id: string;
  displayName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  identityVerificationStatus: IdentityVerificationStatus;
  profilePicture?: string;
  phone?: string;
  address?: string;
  isDeleted?: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  success: boolean;
  data: AuthTokens & { user: AuthUser };
}

export interface ApiErrorPayload {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
  requestId?: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: Pagination;
}
