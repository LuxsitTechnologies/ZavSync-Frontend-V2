import { apiRequest, ensureCsrfCookie } from "@/services/api/client";

export interface AuthCompany {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  roles: string[];
  permissions: string[];
  modules: string[];
}

export interface AuthPayload {
  user: { id: number; name: string; email: string; is_platform_admin: boolean };
  companies: AuthCompany[];
}

export const authRepository = {
  async login(email: string, password: string, remember = true): Promise<AuthPayload> {
    await ensureCsrfCookie();
    return apiRequest<AuthPayload>("/auth/login", { method: "POST", body: { email, password, remember } });
  },

  me(): Promise<AuthPayload> {
    return apiRequest<AuthPayload>("/auth/me", {});
  },

  logout(): Promise<{ message: string }> {
    return apiRequest<{ message: string }>("/auth/logout", { method: "POST" });
  },

  forgotPassword(email:string):Promise<{message:string}>{
    return apiRequest<{message:string}>("/auth/forgot-password",{method:"POST",body:{email}});
  },

  resetPassword(input:{email:string;token:string;password:string;password_confirmation:string}):Promise<{message:string}>{
    return apiRequest<{message:string}>("/auth/reset-password",{method:"POST",body:input});
  },

  switchCompany(company_id:string):Promise<{company:AuthCompany}>{
    return apiRequest<{company:AuthCompany}>("/auth/switch-company",{method:"POST",body:{company_id}});
  },
};
