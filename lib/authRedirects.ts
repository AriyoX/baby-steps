import type { Session } from "@supabase/supabase-js";
import {
  fetchActiveChildProfiles,
  getAccountDeletionState,
  getPostLoginRouteForAccountState,
} from "@/lib/accountManagement";
import { supabase } from "@/lib/supabase";

export const APP_DEEP_LINK_SCHEME = "babysteps";
export const AUTH_CALLBACK_PATH = "auth/callback";
export const RESET_PASSWORD_PATH = "reset-password";

export const AUTH_CALLBACK_REDIRECT_URL = `${APP_DEEP_LINK_SCHEME}://${AUTH_CALLBACK_PATH}`;
export const SIGNUP_EMAIL_REDIRECT_URL = AUTH_CALLBACK_REDIRECT_URL;
export const PASSWORD_RESET_REDIRECT_URL = AUTH_CALLBACK_REDIRECT_URL;
export const LEGACY_PASSWORD_RESET_REDIRECT_URL = `${APP_DEEP_LINK_SCHEME}://${RESET_PASSWORD_PATH}`;

const INVALID_AUTH_LINK_MESSAGE =
  "This link has expired or is no longer valid. Please request a new one.";

export type AuthRedirectFlow = "signup" | "recovery" | "magiclink" | "email_change";

export type PostAuthRoute =
  | "/parent"
  | "/parent/add-child/gender"
  | "/reset-password"
  | "/account-reactivation";

export interface AuthRedirectResult {
  flow: AuthRedirectFlow | null;
  session: Session;
}

export class AuthRedirectError extends Error {
  constructor() {
    super(INVALID_AUTH_LINK_MESSAGE);
    this.name = "AuthRedirectError";
  }
}

const trimSlashes = (value: string): string => value.replace(/^\/+|\/+$/g, "");

export const getDeepLinkPath = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const scheme = parsed.protocol.replace(/:$/, "");
    const path = trimSlashes(parsed.pathname);

    if (scheme === "http" || scheme === "https") {
      return path.startsWith("--/") ? path.slice(3) : path;
    }

    const hostname = trimSlashes(parsed.hostname);
    const appPath = [hostname, path].filter(Boolean).join("/");
    return appPath.startsWith("--/") ? appPath.slice(3) : appPath;
  } catch {
    return null;
  }
};

export const isAuthRedirectUrl = (url: string): boolean => {
  const path = getDeepLinkPath(url);
  return path === AUTH_CALLBACK_PATH || path === RESET_PASSWORD_PATH;
};

export const isPasswordResetRedirectUrl = (url: string): boolean =>
  getDeepLinkPath(url) === RESET_PASSWORD_PATH;

const appendSearchParams = (
  output: URLSearchParams,
  value: string | null | undefined,
): void => {
  const source = value?.replace(/^[?#]/, "");
  if (!source) return;

  new URLSearchParams(source).forEach((paramValue, key) => {
    output.set(key, paramValue);
  });
};

export const getAuthRedirectParams = (url: string): URLSearchParams => {
  const params = new URLSearchParams();

  try {
    const parsed = new URL(url);
    appendSearchParams(params, parsed.search);
    appendSearchParams(params, parsed.hash);
    return params;
  } catch {
    const [withoutHash, hash] = url.split("#", 2);
    const query = withoutHash?.split("?", 2)[1];
    appendSearchParams(params, query);
    appendSearchParams(params, hash);
    return params;
  }
};

export const hasAuthRedirectPayload = (url: string): boolean => {
  const params = getAuthRedirectParams(url);
  return Boolean(
    params.get("code") ||
      params.get("access_token") ||
      params.get("refresh_token") ||
      params.get("error") ||
      params.get("error_code") ||
      params.get("error_description"),
  );
};

export const getFriendlyAuthRedirectErrorMessage = (): string =>
  INVALID_AUTH_LINK_MESSAGE;

const normalizeAuthRedirectFlow = (
  value: string | null | undefined,
): AuthRedirectFlow | null => {
  const normalized = value?.toLowerCase();

  if (normalized === "recovery" || normalized === "password_recovery") {
    return "recovery";
  }

  if (normalized === "signup" || normalized === "email_confirmation") {
    return "signup";
  }

  if (normalized === "magiclink" || normalized === "magic_link") {
    return "magiclink";
  }

  if (normalized === "email_change") {
    return "email_change";
  }

  return null;
};

const getRedirectFlowFromParams = (params: URLSearchParams): AuthRedirectFlow | null =>
  normalizeAuthRedirectFlow(params.get("type") ?? params.get("flow"));

export const handleSupabaseAuthRedirectUrl = async (
  url: string,
): Promise<AuthRedirectResult> => {
  const params = getAuthRedirectParams(url);
  const flowFromParams = getRedirectFlowFromParams(params);

  if (
    params.get("error") ||
    params.get("error_code") ||
    params.get("error_description")
  ) {
    throw new AuthRedirectError();
  }

  const code = params.get("code");
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session) throw new AuthRedirectError();

    const redirectType = (data as typeof data & { redirectType?: string | null })
      .redirectType;

    return {
      flow: flowFromParams ?? normalizeAuthRedirectFlow(redirectType),
      session: data.session,
    };
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error || !data.session) throw new AuthRedirectError();

    return {
      flow: flowFromParams,
      session: data.session,
    };
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new AuthRedirectError();

  return {
    flow: flowFromParams,
    session: data.session,
  };
};

export const getPostAuthRedirectRoute = async ({
  flow,
  session,
}: AuthRedirectResult): Promise<PostAuthRoute> => {
  if (flow === "recovery") return "/reset-password";

  const accountState = await getAccountDeletionState(session.user.id);
  const accountRoute = getPostLoginRouteForAccountState(accountState);

  if (accountRoute !== "/parent") return accountRoute;

  const childProfiles = await fetchActiveChildProfiles(session.user.id);
  return childProfiles.length > 0 ? "/parent" : "/parent/add-child/gender";
};
