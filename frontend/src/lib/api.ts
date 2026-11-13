import axios from "axios";
import type {
  AdminStats, AttendanceData, AuditEntry, Meal, MealSummary, OfficerSummary,
  RangeDay, ReportData, School, Status, Student, StudentHistoryEntry,
  TeacherDashboardData, User,
} from "./types";

export const TOKEN_KEY = "sf_token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? "",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) onUnauthorized?.();
    const detail = error.response?.data?.detail;
    return Promise.reject(new Error(detail || error.message || "Request failed"));
  }
);

// ---- Auth ----
export async function login(username: string, password: string) {
  const { data } = await api.post<{ access_token: string; user: User }>(
    "/api/auth/login", { username, password });
  return data;
}
export async function fetchMe() {
  const { data } = await api.get<User>("/api/auth/me");
  return data;
}

// ---- Teacher Summary ----
export async function fetchTeacherSummary(schoolId?: number) {
  const { data } = await api.get<TeacherDashboardData>("/api/teacher/summary", {
    params: schoolId ? { school_id: schoolId } : {},
  });
  return data;
}

// ---- Schools ----
export async function getSchools() {
  const { data } = await api.get<School[]>("/api/schools");
  return data;
}
export async function createSchool(body: { name: string; district: string; code: string }) {
  const { data } = await api.post<School>("/api/schools", body);
  return data;
}
export async function updateSchool(id: number, body: { name?: string; district?: string; code?: string }) {
  const { data } = await api.put<School>(`/api/schools/${id}`, body);
  return data;
}
export async function deleteSchool(id: number) {
  await api.delete(`/api/schools/${id}`);
}

// ---- Students ----
export async function getStudents(schoolId?: number, includeInactive = false) {
  const { data } = await api.get<Student[]>("/api/students", {
    params: {
      ...(schoolId ? { school_id: schoolId } : {}),
      include_inactive: includeInactive,
    },
  });
  return data;
}
export async function addStudent(body: { name: string; cls?: string; school_id?: number }) {
  const { data } = await api.post<Student>("/api/students", body);
  return data;
}
export async function updateStudent(id: number, body: { name?: string; cls?: string; is_active?: number }) {
  const { data } = await api.put<Student>(`/api/students/${id}`, body);
  return data;
}
export async function deleteStudent(id: number, permanent = false) {
  const { data } = await api.delete<{ status: string; id: number; is_active?: number }>(
    `/api/students/${id}`, { params: { permanent } }
  );
  return data;
}
export async function importStudents(students: Array<{ name: string; cls: string }>, schoolId?: number) {
  const { data } = await api.post<{ imported: number; skipped: number; total_submitted: number }>(
    "/api/students/import",
    { students, ...(schoolId ? { school_id: schoolId } : {}) }
  );
  return data;
}
export async function getStudentAttendanceHistory(id: number) {
  const { data } = await api.get<StudentHistoryEntry[]>(`/api/students/${id}/attendance`);
  return data;
}

// ---- Attendance ----
export async function getAttendance(date: string, schoolId?: number, cls?: string) {
  const { data } = await api.get<AttendanceData>("/api/attendance", {
    params: {
      date,
      ...(schoolId ? { school_id: schoolId } : {}),
      ...(cls && cls !== "All classes" ? { cls } : {}),
    },
  });
  return data;
}
export async function saveAttendance(body: {
  date: string;
  school_id?: number;
  entries: Array<{ student_id: number; status: Status }>;
}) {
  const { data } = await api.post<{ date: string; counts: AttendanceData["counts"] }>(
    "/api/attendance", body);
  return data;
}
export async function getAttendanceRange(start: string, end: string, schoolId?: number) {
  const { data } = await api.get<{ days: RangeDay[] }>("/api/attendance/range", {
    params: { start, end, ...(schoolId ? { school_id: schoolId } : {}) },
  });
  return data.days;
}

// ---- Meals ----
export async function getMeals(schoolId?: number) {
  const { data } = await api.get<Meal[]>("/api/meals", {
    params: schoolId ? { school_id: schoolId } : {},
  });
  return data;
}
export async function saveMeal(body: {
  date: string; qty: number; menu: string; notes?: string; school_id?: number;
}) {
  const { data } = await api.post<Meal>("/api/meals", body);
  return data;
}
export async function deleteMeal(id: number) {
  await api.delete(`/api/meals/${id}`);
}
export async function getMealSummary(period = "week", schoolId?: number) {
  const { data } = await api.get<MealSummary>("/api/meals/summary", {
    params: { period, ...(schoolId ? { school_id: schoolId } : {}) },
  });
  return data;
}

// ---- Reports / Officer ----
export async function getReport(
  type: string, start: string, end: string, schoolId?: number
) {
  const { data } = await api.get<ReportData>("/api/reports", {
    params: { type, start, end, ...(schoolId ? { school_id: schoolId } : {}) },
  });
  return data;
}
export async function getOfficerSummary() {
  const { data } = await api.get<OfficerSummary>("/api/officer/summary");
  return data;
}

// ---- Admin & Backup ----
export async function getAdminStats() {
  const { data } = await api.get<AdminStats>("/api/admin/stats");
  return data;
}
export async function getUsers() {
  const { data } = await api.get<User[]>("/api/admin/users");
  return data;
}
export async function createUser(body: {
  username: string; password: string; full_name: string; role: string; school_id?: number;
}) {
  const { data } = await api.post<User>("/api/admin/users", body);
  return data;
}
export async function deleteUser(id: number) {
  await api.delete(`/api/admin/users/${id}`);
}
export async function getAudit(limit = 200) {
  const { data } = await api.get<AuditEntry[]>("/api/admin/audit", { params: { limit } });
  return data;
}
export async function exportBackup() {
  const { data } = await api.get<any>("/api/admin/backup");
  return data;
}
export async function restoreBackup(payload: any) {
  const { data } = await api.post<{ status: string; restored_schools: number; restored_students: number }>(
    "/api/admin/restore", payload
  );
  return data;
}
export async function resetDemoData() {
  const { data } = await api.post<{ status: string }>("/api/admin/reset");
  return data;
}

// CSV formula injection protection: escape cells starting with =, +, -, @, \t, \r
export function sanitizeCSVCell(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  let str = String(val);
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return '"' + str.replace(/"/g, '""') + '"';
}

export function downloadSafeCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const headerLine = headers.map(sanitizeCSVCell).join(",");
  const dataLines = rows.map((r) => r.map(sanitizeCSVCell).join(","));
  const csvContent = [headerLine, ...dataLines].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default api;
