export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  email_verified: boolean;
}

export interface RegisterResult {
  user: AuthUser;
  message: string;
  development_verification_token: string | null;
}

interface ApiMessage {
  message: string;
}

export class AuthApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AuthApiError";
  }
}

const API_ROOT = `${(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "")}/api/v1`;

async function request<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AuthApiError("FinTech could not reach the authentication service. Start the backend and try again.", 0);
  }

  const data: unknown = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data === "object" && data !== null && "detail" in data ? data.detail : undefined;
    const message = typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? detail.map((issue: { msg?: string; loc?: (string | number)[] }) => `${issue.loc?.at(-1) ?? "Field"}: ${issue.msg ?? "invalid value"}`).join(" ")
        : "The request could not be completed. Please try again.";
    throw new AuthApiError(message, response.status);
  }
  return data as T;
}

export const authApi = {
  register: (payload: { full_name: string; email: string; password: string }) =>
    request<RegisterResult>("/auth/register", payload),
  login: (payload: { identifier: string; password: string; remember_me: boolean }) =>
    request<AuthUser>("/auth/login", payload),
  verifyEmail: (token: string) => request<ApiMessage>("/auth/verify-email", { token }),
  me: () => request<AuthUser>("/auth/me", undefined, "GET"),
  session: () => request<AuthUser | null>("/auth/session", undefined, "GET"),
  logout: () => request<ApiMessage>("/auth/logout"),
  forgotPassword: (email: string) => request<ApiMessage>("/auth/forgot-password", { email }),
  resetPassword: (token: string, new_password: string) =>
    request<ApiMessage>("/auth/reset-password", { token, new_password }),
};
