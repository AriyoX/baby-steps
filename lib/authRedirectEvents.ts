import { isAuthRedirectUrl } from "@/lib/authRedirects";

type AuthRedirectListener = (url: string) => void;

let latestAuthRedirectUrl: string | null = null;
const listeners = new Set<AuthRedirectListener>();

export const rememberAuthRedirectUrl = (url: string | null | undefined): void => {
  if (!url || !isAuthRedirectUrl(url)) return;

  latestAuthRedirectUrl = url;
  listeners.forEach((listener) => listener(url));
};

export const getLatestAuthRedirectUrl = (): string | null => latestAuthRedirectUrl;

export const clearLatestAuthRedirectUrl = (url?: string | null): void => {
  if (!url || latestAuthRedirectUrl === url) {
    latestAuthRedirectUrl = null;
  }
};

export const subscribeAuthRedirectUrls = (
  listener: AuthRedirectListener,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
