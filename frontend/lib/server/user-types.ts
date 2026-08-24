/** Supabase `users` table row — mirrors schema exactly */
export type UserRow = {
  user_id: number | string;
  first_name: string;
  last_name: string;
  mobile: string;
  email: string | null;
  password: string | null;
  created_by: number | null;
  date_time: string;
  update_time: string;
  is_mobile: number;   // 0 | 1
  is_email: number;    // 0 | 1
  status: number;      // 0 = Inactive, 1 = Active
  otp: string | null;
  otp_expiry: string | null;
};

/** Safe public payload — never includes password or otp */
export type UserDto = {
  userId: number;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string | null;
  createdBy: number | null;
  dateTime: string;
  updateTime: string;
  isMobile: boolean;
  isEmail: boolean;
  status: boolean;
};

export type UserCreateBody = {
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  mobile?: string;
  email?: string | null;
  password?: string | null;
  createdBy?: number | null;
  created_by?: number | null;
};

export type UserUpdateBody = {
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  mobile?: string;
  email?: string | null;
  password?: string | null;
  isMobile?: boolean | number;
  is_mobile?: boolean | number;
  isEmail?: boolean | number;
  is_email?: boolean | number;
  status?: boolean | number;
};

export type OtpSendBody = {
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  mobile?: string;
};

export type OtpVerifyBody = {
  mobile?: string;
  otp?: string;
};

/** Supabase `user_session` table row */
export type UserSessionRow = {
  id: number | string;
  session_id: string;
  session_token: string;
  datetime: string;
  user_id: number | string;
};

export type UserSessionDto = {
  id: number;
  sessionId: string;
  sessionToken: string;
  datetime: string;
  userId: number;
};

