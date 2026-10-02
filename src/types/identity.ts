export interface AccountProfile { id: number; name: string; email: string; email_verified: boolean }
export interface EmployeeIdentity {
  id: string; employee_code: string; full_name: string; email: string | null; phone: string | null;
  department: string | null; designation: string | null; employment_type: string; status: string;
  joining_date: string | null; leaving_date: string | null; location: string | null;
}
export interface EmployeeSelf { linked: boolean; employee: EmployeeIdentity | null; self_editable: false }
export interface EmployeeLink { membership_id: number; employee_id: string | null; linked: boolean }
export interface EmployeeOption { id: string; employee_code: string; full_name: string; status: string; linked: boolean; available: boolean }
export interface EmployeeOptions { data: EmployeeOption[]; meta: { current_page: number; last_page: number; total: number } }
export interface PasswordChange { current_password: string; password: string; password_confirmation: string }
