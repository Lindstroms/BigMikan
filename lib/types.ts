export type SignupStatus =
  | "mangler_svar"
  | "tilmeldt"
  | "maaske"
  | "bekraeftet"
  | "frameldt";

export interface CrewMember {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  active: boolean;
  sort_order: number;
}

export interface Activity {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  season: number;
  sort_order: number;
}

export interface Signup {
  id: string;
  crew_member_id: string;
  activity_id: string;
  status: SignupStatus;
  note: string | null;
  updated_at: string;
}
