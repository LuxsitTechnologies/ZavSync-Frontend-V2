import { apiRequest, ensureCsrfCookie } from "@/services/api/client";

export interface AuthCompany {
  id: string;
  name: string;
  currency: string;
  timezone: string;
}

export interface AuthPayload {
  user: { id: number; name: string; email: string };
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
};
