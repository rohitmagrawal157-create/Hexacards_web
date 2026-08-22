export type UserCard = {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  initials: string;
  accent: "jade" | "amber" | "sky" | "rose" | "violet";
  status: "available" | "busy" | "away";
};
