/** Supabase `admin` table row */
export type AdminRow = {
  aid: number | string;
  fname: string;
  lname: string;
  email: string;
  mobile: string;
  password: string;
  profile: string | null;
  status: number; // 0 = Inactive, 1 = Active
};

/** Safe public payload — never includes password */
export type AdminDto = {
  aid: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  profile: string | null;
  status: boolean;
};

export type AdminLoginBody = {
  email?: string;
  password?: string;
};

export function mapAdmin(row: AdminRow): AdminDto {
  return {
    aid: Number(row.aid),
    firstName: row.fname?.trim() || "",
    lastName: row.lname?.trim() || "",
    email: row.email,
    mobile: row.mobile,
    profile: row.profile ?? null,
    status: Number(row.status) === 1,
  };
}

export const ADMIN_SAFE_COLS =
  "aid, fname, lname, email, mobile, profile, status" as const;
