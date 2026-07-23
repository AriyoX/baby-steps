import * as SecureStore from "expo-secure-store";

export interface SecureActiveChildSession {
  id: string;
  name: string;
  gender: string;
  age: string;
  selected_language_code?: string;
  avatar?: string;
}

export class CorruptActiveChildSessionError extends Error {
  constructor() {
    super("The saved child session could not be verified.");
    this.name = "CorruptActiveChildSessionError";
  }
}

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const getActiveChildSessionKey = (accountId: string): string => {
  if (!/^[A-Za-z0-9_-]+$/.test(accountId)) {
    throw new Error("A valid parent account is required.");
  }
  return `babysteps.active-child.v1.${accountId}`;
};

const isSecureActiveChildSession = (
  value: unknown,
): value is SecureActiveChildSession => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SecureActiveChildSession>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.name === "string" &&
    typeof candidate.gender === "string" &&
    typeof candidate.age === "string" &&
    (candidate.selected_language_code === undefined ||
      typeof candidate.selected_language_code === "string") &&
    (candidate.avatar === undefined || typeof candidate.avatar === "string")
  );
};

export const saveSecureActiveChildSession = async (
  accountId: string,
  child: SecureActiveChildSession,
): Promise<void> => {
  if (!isSecureActiveChildSession(child)) {
    throw new Error("A valid child session is required.");
  }
  await SecureStore.setItemAsync(
    getActiveChildSessionKey(accountId),
    JSON.stringify(child),
    SECURE_STORE_OPTIONS,
  );
};

export const loadSecureActiveChildSession = async (
  accountId: string,
): Promise<SecureActiveChildSession | null> => {
  const key = getActiveChildSessionKey(accountId);
  const serialized = await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
  if (!serialized) return null;

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (isSecureActiveChildSession(parsed)) return parsed;
  } catch {
    // Fall through to the fail-closed error below.
  }

  // Keep the marker in place. Deleting it here would make a later restart
  // indistinguishable from an account that never entered child mode.
  throw new CorruptActiveChildSessionError();
};

export const clearSecureActiveChildSession = async (
  accountId: string,
): Promise<void> => {
  await SecureStore.deleteItemAsync(
    getActiveChildSessionKey(accountId),
    SECURE_STORE_OPTIONS,
  );
};
