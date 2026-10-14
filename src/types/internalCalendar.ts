import type { Paginated } from "@/types/platform";

export interface InternalCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: "ACTIVE" | "CANCELLED";
  version: number;
  cancelled_at: string | null;
}

export type InternalCalendarPage = Paginated<InternalCalendarEvent>;
export interface InternalCalendarInput {
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
}
