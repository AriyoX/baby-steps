import * as SecureStore from "expo-secure-store";
import { createEphemeralAuthClient, supabase } from "@/lib/supabase";

export const PARENT_PIN_LENGTH = 6;
export const PARENT_PIN_MAX_ATTEMPTS = 5;
export const PARENT_PIN_COOLDOWN_MS = 30_000;
export const RECENT_PARENT_REAUTH_MS = 5 * 60_000;

type StoredParentPin = {
  version: 1;
  pin: string;
  failedAttempts: number;
  cooldownUntil: number;
};

export type ParentPinVerification =
  | { status: "success"; retryAfterMs: 0 }
  | { status: "incorrect"; retryAfterMs: 0 }
  | { status: "cooldown"; retryAfterMs: number }
  | { status: "not-configured"; retryAfterMs: 0 };

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const recentReauthenticationByAccount = new Map<string, number>();

const getParentPinKey = (accountId: string): string => {
  if (!/^[A-Za-z0-9_-]+$/.test(accountId)) {
    throw new Error("A valid parent account is required.");
  }
  return `babysteps.parent-pin.v1.${accountId}`;
};

export const isValidParentPin = (pin: string): boolean =>
  new RegExp(`^\\d{${PARENT_PIN_LENGTH}}$`).test(pin);

const isStoredParentPin = (value: unknown): value is StoredParentPin => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredParentPin>;
  return (
    candidate.version === 1 &&
    typeof candidate.pin === "string" &&
    isValidParentPin(candidate.pin) &&
    Number.isInteger(candidate.failedAttempts) &&
    (candidate.failedAttempts ?? -1) >= 0 &&
    typeof candidate.cooldownUntil === "number" &&
    Number.isFinite(candidate.cooldownUntil)
  );
};

const loadStoredParentPin = async (
  accountId: string,
): Promise<StoredParentPin | null> => {
  const serialized = await SecureStore.getItemAsync(
    getParentPinKey(accountId),
    SECURE_STORE_OPTIONS,
  );
  if (!serialized) return null;

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (isStoredParentPin(parsed)) return parsed;
  } catch {
    // Invalid secure state is removed below and must be set up again by a parent.
  }

  await SecureStore.deleteItemAsync(getParentPinKey(accountId), SECURE_STORE_OPTIONS);
  return null;
};

const saveStoredParentPin = async (
  accountId: string,
  value: StoredParentPin,
): Promise<void> => {
  await SecureStore.setItemAsync(
    getParentPinKey(accountId),
    JSON.stringify(value),
    SECURE_STORE_OPTIONS,
  );
};

const constantTimePinEquals = (first: string, second: string): boolean => {
  const maximumLength = Math.max(first.length, second.length);
  let difference = first.length ^ second.length;

  for (let index = 0; index < maximumLength; index += 1) {
    difference |= (first.charCodeAt(index) || 0) ^ (second.charCodeAt(index) || 0);
  }

  return difference === 0;
};

export const hasParentPin = async (accountId: string): Promise<boolean> =>
  Boolean(await loadStoredParentPin(accountId));

export const setParentPin = async (
  accountId: string,
  pin: string,
): Promise<void> => {
  if (!isValidParentPin(pin)) {
    throw new Error(`Parent PIN must contain exactly ${PARENT_PIN_LENGTH} digits.`);
  }

  await saveStoredParentPin(accountId, {
    version: 1,
    pin,
    failedAttempts: 0,
    cooldownUntil: 0,
  });
};

export const resetParentPin = async (accountId: string): Promise<void> => {
  await SecureStore.deleteItemAsync(getParentPinKey(accountId), SECURE_STORE_OPTIONS);
};

export const revealParentPinWithReauthentication = async ({
  accountId,
  password,
}: {
  accountId: string;
  password: string;
}): Promise<string | null> => {
  if (!(await reauthenticateParentAccount(accountId, password))) return null;
  return (await loadStoredParentPin(accountId))?.pin ?? null;
};

export const verifyParentPin = async (
  accountId: string,
  input: string,
  now = Date.now(),
): Promise<ParentPinVerification> => {
  const stored = await loadStoredParentPin(accountId);
  if (!stored) return { status: "not-configured", retryAfterMs: 0 };

  if (stored.cooldownUntil > now) {
    return {
      status: "cooldown",
      retryAfterMs: stored.cooldownUntil - now,
    };
  }

  if (constantTimePinEquals(stored.pin, input)) {
    if (stored.failedAttempts !== 0 || stored.cooldownUntil !== 0) {
      await saveStoredParentPin(accountId, {
        ...stored,
        failedAttempts: 0,
        cooldownUntil: 0,
      });
    }
    return { status: "success", retryAfterMs: 0 };
  }

  const attemptsBeforeThisFailure =
    stored.cooldownUntil > 0 && stored.cooldownUntil <= now
      ? 0
      : stored.failedAttempts;
  const failedAttempts = attemptsBeforeThisFailure + 1;

  if (failedAttempts >= PARENT_PIN_MAX_ATTEMPTS) {
    await saveStoredParentPin(accountId, {
      ...stored,
      failedAttempts,
      cooldownUntil: now + PARENT_PIN_COOLDOWN_MS,
    });
    return { status: "cooldown", retryAfterMs: PARENT_PIN_COOLDOWN_MS };
  }

  await saveStoredParentPin(accountId, {
    ...stored,
    failedAttempts,
    cooldownUntil: 0,
  });
  return { status: "incorrect", retryAfterMs: 0 };
};

export const reauthenticateParentAccount = async (
  accountId: string,
  password: string,
  now = Date.now(),
): Promise<boolean> => {
  if (!password) return false;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const email = sessionData.session?.user.email;
  if (
    sessionError ||
    !email ||
    sessionData.session?.user.id !== accountId
  ) {
    return false;
  }

  const verificationClient = createEphemeralAuthClient();
  let authenticated = false;

  try {
    const { data, error } = await verificationClient.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data.user?.id === accountId) {
      const { data: currentSessionData, error: currentSessionError } =
        await supabase.auth.getSession();
      authenticated =
        !currentSessionError &&
        currentSessionData.session?.user.id === accountId;
    }
  } finally {
    // Revoke and discard only the verification client's token. Its auth state
    // is never persisted or shared with the application's primary client.
    await verificationClient.auth.signOut({ scope: "local" }).catch(() => {
      // The non-persisted client is discarded even if remote cleanup is
      // temporarily unavailable.
    });
  }

  if (authenticated) {
    recentReauthenticationByAccount.set(accountId, now);
  }

  return authenticated;
};

export const hasRecentParentReauthentication = (
  accountId: string,
  now = Date.now(),
): boolean => {
  const reauthenticatedAt = recentReauthenticationByAccount.get(accountId);
  return (
    typeof reauthenticatedAt === "number" &&
    now >= reauthenticatedAt &&
    now - reauthenticatedAt <= RECENT_PARENT_REAUTH_MS
  );
};

export const clearParentSecuritySession = (accountId?: string): void => {
  if (accountId) {
    recentReauthenticationByAccount.delete(accountId);
    return;
  }
  recentReauthenticationByAccount.clear();
};

export const setParentPinWithReauthentication = async ({
  accountId,
  password,
  pin,
}: {
  accountId: string;
  password: string;
  pin: string;
}): Promise<boolean> => {
  if (!isValidParentPin(pin)) return false;
  if (!(await reauthenticateParentAccount(accountId, password))) return false;
  await setParentPin(accountId, pin);
  return true;
};
