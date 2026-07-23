const mockSecureValues = new Map<string, string>();
const mockGetSession = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockEphemeralSignOut = jest.fn();

jest.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
  getItemAsync: jest.fn(async (key: string) => mockSecureValues.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureValues.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureValues.delete(key);
  }),
}));

jest.mock("@/lib/supabase", () => ({
  createEphemeralAuthClient: () => ({
    auth: {
      signInWithPassword: (...args: unknown[]) =>
        mockSignInWithPassword(...args),
      signOut: (...args: unknown[]) => mockEphemeralSignOut(...args),
    },
  }),
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

import {
  PARENT_PIN_COOLDOWN_MS,
  clearParentSecuritySession,
  hasParentPin,
  hasRecentParentReauthentication,
  isValidParentPin,
  reauthenticateParentAccount,
  resetParentPin,
  setParentPin,
  setParentPinWithReauthentication,
  verifyParentPin,
} from "../parentAccess";

describe("parent access security", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureValues.clear();
    clearParentSecuritySession();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: "parent-1", email: "parent@example.com" },
        },
      },
      error: null,
    });
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "parent-1" } },
      error: null,
    });
    mockEphemeralSignOut.mockResolvedValue({ error: null });
  });

  it("accepts only an exact six-digit PIN and stores it per parent account", async () => {
    expect(isValidParentPin("123456")).toBe(true);
    expect(isValidParentPin("12345")).toBe(false);
    expect(isValidParentPin("12345a")).toBe(false);

    await setParentPin("parent-1", "123456");

    expect(await hasParentPin("parent-1")).toBe(true);
    expect(await hasParentPin("parent-2")).toBe(false);
    expect(await verifyParentPin("parent-1", "123456", 1_000)).toEqual({
      status: "success",
      retryAfterMs: 0,
    });
    expect(await verifyParentPin("parent-2", "123456", 1_000)).toEqual({
      status: "not-configured",
      retryAfterMs: 0,
    });
  });

  it("uses a generic failure and enforces a persisted cooldown after five attempts", async () => {
    await setParentPin("parent-1", "123456");

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await expect(
        verifyParentPin("parent-1", "000000", 10_000 + attempt),
      ).resolves.toEqual({ status: "incorrect", retryAfterMs: 0 });
    }

    await expect(
      verifyParentPin("parent-1", "000000", 10_004),
    ).resolves.toEqual({
      status: "cooldown",
      retryAfterMs: PARENT_PIN_COOLDOWN_MS,
    });
    await expect(
      verifyParentPin("parent-1", "123456", 10_005),
    ).resolves.toEqual({
      status: "cooldown",
      retryAfterMs: PARENT_PIN_COOLDOWN_MS - 1,
    });
    await expect(
      verifyParentPin(
        "parent-1",
        "123456",
        10_004 + PARENT_PIN_COOLDOWN_MS,
      ),
    ).resolves.toEqual({ status: "success", retryAfterMs: 0 });
  });

  it("resets only the selected parent's PIN", async () => {
    await setParentPin("parent-1", "123456");
    await setParentPin("parent-2", "654321");

    await resetParentPin("parent-1");

    expect(await hasParentPin("parent-1")).toBe(false);
    expect(await verifyParentPin("parent-2", "654321")).toEqual({
      status: "success",
      retryAfterMs: 0,
    });
  });

  it("records recent reauthentication only for the matching signed-in parent", async () => {
    expect(
      await reauthenticateParentAccount("parent-1", "correct-password", 2_000),
    ).toBe(true);
    expect(hasRecentParentReauthentication("parent-1", 2_001)).toBe(true);
    expect(hasRecentParentReauthentication("parent-2", 2_001)).toBe(false);
    expect(hasRecentParentReauthentication("parent-1", 302_001)).toBe(false);
    expect(mockEphemeralSignOut).toHaveBeenCalledWith({ scope: "local" });

    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "different-parent" } },
      error: null,
    });
    expect(
      await reauthenticateParentAccount("parent-1", "wrong-password", 4_000),
    ).toBe(false);
  });

  it("requires account reauthentication before setting or replacing a PIN", async () => {
    expect(
      await setParentPinWithReauthentication({
        accountId: "parent-1",
        password: "correct-password",
        pin: "246810",
      }),
    ).toBe(true);
    expect(await verifyParentPin("parent-1", "246810")).toEqual({
      status: "success",
      retryAfterMs: 0,
    });

    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: new Error("invalid credentials"),
    });
    expect(
      await setParentPinWithReauthentication({
        accountId: "parent-1",
        password: "wrong-password",
        pin: "111111",
      }),
    ).toBe(false);
    expect(await verifyParentPin("parent-1", "246810")).toEqual({
      status: "success",
      retryAfterMs: 0,
    });
  });
});
