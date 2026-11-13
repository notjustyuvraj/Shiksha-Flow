export type Role = "admin" | "officer" | "headmaster" | "teacher";
export type Status = "present" | "absent" | "leave" | "unmarked";
export type Language = "en" | "hi" | "gu";

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: Role;
  school_id: number | null;
}

export interface School {
  id: number;
  name: string;
  district: string;
  code: string;
}

export interface Student {
  id: number;
  name: string;
  cls: string;
  school_id: number;
  is_active: number;
}

export interface Counts {
  total: number;
  present: number;
  absent: number;
  leave?: number;
  pending: number;
  marked?: number;
  completion_pct?: number;
}

export interface AttendanceData {
  date: string;
  school_id: number;
  cls?: string;
  entries: Record<number, Status>;
  counts: Counts;
  saved: boolean;
}

export interface RangeDay {
  date: string;
  present: number;
  absent: number;
  leave?: number;
  marked: number;
  pct?: number;
  total_students?: number;
}

export interface Meal {
  id: number;
  school_id: number;
  date: string;
  qty: number;
  menu: string;
  notes: string;
}

export interface MealSummary {
  period: string;
  total_records: number;
  total_meals: number;
  daily_avg: number;
  missing_days: number;
}

export interface ReportData {
  type: string;
  start: string;
  end: string;
  school_id: number;
  school_name?: string;
  total_students: number;
  total_meals?: number;
  reclaimed_minutes?: number;
  attendance: RangeDay[];
  meals: Array<{ date: string; qty: number; menu: string; notes: string }>;
}

export interface OfficerSchool {
  id: number;
  name: string;
  district: string;
  code: string;
  students: number;
  completion: number;
  missing: number;
  meal_days?: number;
}

export interface OfficerSummary {
  schools: OfficerSchool[];
  avg_completion: number;
  total_missing: number;
  needs_followup: number;
}

export interface TeachTimeStats {
  minutes_today: number;
  minutes_this_week: number;
  minutes_all_time: number;
  attendance_days: number;
  meal_days: number;
}

export interface PendingTask {
  id: string;
  title: string;
  desc: string;
  action_tab: string;
  completed: boolean;
}

export interface TeacherDashboardData {
  today: string;
  school_id: number;
  school_name: string;
  total_students: number;
  present_today: number;
  absent_today: number;
  leave_today: number;
  unmarked_today: number;
  attendance_marked: boolean;
  attendance_completion_pct: number;
  meal_marked: boolean;
  meal_today_qty: number;
  pending_tasks: PendingTask[];
  recent_activity: AuditEntry[];
  teach_time: TeachTimeStats;
  next_best_action: string;
}

export interface AdminStats {
  schools: number;
  users: number;
  students: number;
  attendance_records: number;
  meal_records: number;
}

export interface AuditEntry {
  id: number;
  username: string;
  action: string;
  detail: string;
  school_id: number | null;
  at: string;
}

export interface StudentHistoryEntry {
  date: string;
  status: string;
}
