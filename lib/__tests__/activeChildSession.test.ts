const secureValues = new Map<string, string>();
const mockGetItemAsync = jest.fn(async (key: string) => secureValues.get(key) ?? null);
const mockSetItemAsync = jest.fn(async (key: string, value: string) => {
  secureValues.set(key, value);
});
const mockDeleteItemAsync = jest.fn(async (key: string) => {
  secureValues.delete(key);
});

jest.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
  getItemAsync: (...args: unknown[]) => mockGetItemAsync(...(args as [string])),
  setItemAsync: (...args: unknown[]) =>
    mockSetItemAsync(...(args as [string, string])),
  deleteItemAsync: (...args: unknown[]) =>
    mockDeleteItemAsync(...(args as [string])),
}));

import {
  clearSecureActiveChildSession,
  loadSecureActiveChildSession,
  saveSecureActiveChildSession,
} from "@/lib/activeChildSession";

const child = {
  id: "child-a",
  name: "Amina",
  gender: "female",
  age: "5",
  selected_language_code: "lg",
};

beforeEach(() => {
  secureValues.clear();
  jest.clearAllMocks();
});

describe("secure active-child sessions", () => {
  it("restores only the child session scoped to the same parent account", async () => {
    await saveSecureActiveChildSession("parent-a", child);

    expect(await loadSecureActiveChildSession("parent-a")).toEqual(child);
    expect(await loadSecureActiveChildSession("parent-b")).toBeNull();
    expect(mockSetItemAsync).toHaveBeenCalledWith(
      "babysteps.active-child.v1.parent-a",
      JSON.stringify(child),
      expect.objectContaining({
        keychainAccessible: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
      }),
    );
  });

  it("clears the account-scoped child lock after parent unlock or sign-out", async () => {
    await saveSecureActiveChildSession("parent-a", child);
    await clearSecureActiveChildSession("parent-a");

    expect(await loadSecureActiveChildSession("parent-a")).toBeNull();
  });

  it("keeps corrupt secure state fail-closed until a parent unlock clears it", async () => {
    secureValues.set("babysteps.active-child.v1.parent-a", "{\"id\":42}");

    await expect(loadSecureActiveChildSession("parent-a")).rejects.toThrow(
      "saved child session could not be verified",
    );
    expect(mockDeleteItemAsync).not.toHaveBeenCalled();
    expect(secureValues.has("babysteps.active-child.v1.parent-a")).toBe(true);
  });
});
