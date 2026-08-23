import React from "react";
import { Alert, TextInput } from "react-native";
import renderer, { act, type ReactTestInstance } from "react-test-renderer";

const mockBack = jest.fn();
const mockFetchActiveChildProfile = jest.fn();
const mockInspectLanguageContentAvailability = jest.fn();
const mockRefreshChildLanguageCaches = jest.fn();
const mockUpdateOwnedActiveChildProfile = jest.fn();
const mockUpdateActiveChildProfile = jest.fn();
const mockRequireInternet = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ childId: "child-a" }),
}));

jest.mock("@/context/ChildContext", () => ({
  useChild: () => ({
    updateActiveChildProfile: mockUpdateActiveChildProfile,
  }),
}));

jest.mock("@/lib/accountManagement", () => ({
  fetchActiveChildProfile: (...args: unknown[]) =>
    mockFetchActiveChildProfile(...args),
}));

jest.mock("@/lib/childProfileRepository", () => {
  const actual = jest.requireActual("@/lib/childProfileRepository");
  return {
    ...actual,
    inspectLanguageContentAvailability: (...args: unknown[]) =>
      mockInspectLanguageContentAvailability(...args),
    refreshChildLanguageCaches: (...args: unknown[]) =>
      mockRefreshChildLanguageCaches(...args),
    updateOwnedActiveChildProfile: (...args: unknown[]) =>
      mockUpdateOwnedActiveChildProfile(...args),
  };
});

jest.mock("@/lib/network", () => ({
  requireInternet: (...args: unknown[]) => mockRequireInternet(...args),
  isLikelyNetworkError: jest.fn(() => false),
}));

jest.mock("@/components/settings/SettingsScaffold", () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const ReactInMock = require("react");
  const { View } = require("react-native");
  /* eslint-enable @typescript-eslint/no-require-imports */
  return {
    SettingsScaffold: ({ children }: { children?: React.ReactNode }) =>
      ReactInMock.createElement(View, null, children),
  };
});

jest.mock("@/components/common/AppButton", () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const ReactInMock = require("react");
  const { Text, TouchableOpacity } = require("react-native");
  /* eslint-enable @typescript-eslint/no-require-imports */
  return {
    AppButton: ({
      label,
      loadingLabel,
      loading,
      onPress,
      disabled,
    }: {
      label: string;
      loadingLabel?: string;
      loading?: boolean;
      onPress?: () => void;
      disabled?: boolean;
    }) =>
      ReactInMock.createElement(
        TouchableOpacity,
        {
          accessibilityLabel: label,
          accessibilityRole: "button",
          disabled,
          onPress,
        },
        ReactInMock.createElement(
          Text,
          null,
          loading && loadingLabel ? loadingLabel : label,
        ),
      ),
  };
});

jest.mock("@/components/StyledText", () => ({
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  Text: require("react-native").Text,
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const {
  default: EditChildProfileScreen,
  getLanguageChangeConfirmationMessage,
} = require("../edit-child-profile") as {
  default: React.ComponentType;
  getLanguageChangeConfirmationMessage: (options: {
    languageName: string;
    hasPublishedContent: boolean;
  }) => string;
};
const { ChildProfileError } = require("@/lib/childProfileRepository") as {
  ChildProfileError: new (message: string, kind: string) => Error;
};
/* eslint-enable @typescript-eslint/no-require-imports */

const originalChild = {
  id: "child-a",
  parent_id: "parent-a",
  name: "Amina",
  gender: "female",
  age: "7",
  reason: "Connect with culture",
  selected_language_code: "lg",
  created_at: "2026-01-01T00:00:00Z",
  deleted_at: null,
  archived_by_account_deletion_request_id: null,
};

const mountedTrees: renderer.ReactTestRenderer[] = [];
let alertSpy: jest.SpyInstance;

const textContent = (node: unknown): string => {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (!node || typeof node !== "object") return "";
  return textContent((node as { children?: unknown }).children);
};

const findByLabel = (root: ReactTestInstance, label: string) =>
  root.find((node) => node.props.accessibilityLabel === label);

const findRadioContaining = (
  root: ReactTestInstance,
  expectedText: string,
) =>
  root
    .findAll((node) => node.props.accessibilityRole === "radio")
    .find((node) => textContent(node).includes(expectedText));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  mockFetchActiveChildProfile.mockResolvedValue(originalChild);
  mockInspectLanguageContentAvailability.mockResolvedValue({
    languageCode: "nyn",
    hasPublishedContent: false,
  });
  mockRefreshChildLanguageCaches.mockResolvedValue(undefined);
  mockUpdateOwnedActiveChildProfile.mockResolvedValue(originalChild);
  mockUpdateActiveChildProfile.mockResolvedValue(undefined);
  mockRequireInternet.mockResolvedValue(true);
});

afterEach(() => {
  alertSpy.mockRestore();
  act(() => {
    mountedTrees.splice(0).forEach((tree) => tree.unmount());
  });
});

const renderScreen = async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<EditChildProfileScreen />);
    await Promise.resolve();
    await Promise.resolve();
  });
  mountedTrees.push(tree);
  return tree;
};

describe("Edit child profile", () => {
  it("explains empty exact-language availability and preserves old progress", () => {
    const message = getLanguageChangeConfirmationMessage({
      languageName: "Runyankole",
      hasPublishedContent: false,
    });

    expect(message).toContain(
      "does not yet have published closed-beta activities",
    );
    expect(message).toContain("will not substitute Luganda content");
    expect(message).toContain(
      "Existing progress and achievements in the previous language will stay saved",
    );
    expect(message).toContain("will not be copied or reset");
  });

  it("confirms an empty-language change before saving and refreshes context/caches", async () => {
    const saved = {
      ...originalChild,
      selected_language_code: "nyn",
    };
    mockUpdateOwnedActiveChildProfile.mockResolvedValueOnce(saved);
    const tree = await renderScreen();
    const runyankole = findRadioContaining(tree.root, "Runyankole");
    expect(runyankole).toBeTruthy();
    act(() => runyankole?.props.onPress());

    act(() => {
      findByLabel(tree.root, "Save child profile").props.onPress();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const confirmation = alertSpy.mock.calls.find(([title]) =>
      String(title).startsWith("Change learning language"),
    );
    expect(confirmation?.[1]).toContain(
      "does not yet have published closed-beta activities",
    );
    expect(mockUpdateOwnedActiveChildProfile).not.toHaveBeenCalled();

    await act(async () => {
      const buttons = confirmation?.[2] as
        | { text: string; onPress?: () => void }[]
        | undefined;
      buttons?.find((button) => button.text === "Change language")?.onPress?.();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockInspectLanguageContentAvailability).toHaveBeenCalledWith("nyn");
    expect(mockUpdateOwnedActiveChildProfile).toHaveBeenCalledWith(
      "child-a",
      expect.objectContaining({
        name: "Amina",
        age: "7",
        selectedLanguageCode: "nyn",
      }),
    );
    expect(mockRefreshChildLanguageCaches).toHaveBeenCalledWith(
      "child-a",
      "lg",
      "nyn",
    );
    expect(mockUpdateActiveChildProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "child-a",
        selected_language_code: "nyn",
      }),
    );
  });

  it("prevents duplicate profile updates", async () => {
    const pending = deferred<typeof originalChild>();
    mockUpdateOwnedActiveChildProfile.mockReturnValueOnce(pending.promise);
    const tree = await renderScreen();

    act(() => {
      const save = findByLabel(tree.root, "Save child profile");
      save.props.onPress();
      save.props.onPress();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockUpdateOwnedActiveChildProfile).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve(originalChild);
      await pending.promise;
    });
    expect(mockUpdateActiveChildProfile).toHaveBeenCalledTimes(1);
  });

  it("does not expose an unavailable child for editing", async () => {
    mockFetchActiveChildProfile.mockResolvedValueOnce(null);
    const tree = await renderScreen();

    expect(textContent(tree.toJSON())).toContain(
      "We could not open this child profile. Go back and try again.",
    );
    expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
    expect(mockUpdateOwnedActiveChildProfile).not.toHaveBeenCalled();
  });

  it("keeps confirmed UI/context state after a network save failure", async () => {
    mockUpdateOwnedActiveChildProfile.mockRejectedValueOnce(
      new ChildProfileError("network request failed", "network"),
    );
    const tree = await renderScreen();
    act(() => {
      findByLabel(tree.root, "Child name").props.onChangeText("Unconfirmed");
    });
    await act(async () => {
      findByLabel(tree.root, "Save child profile").props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(findByLabel(tree.root, "Child name").props.value).toBe("Amina");
    expect(textContent(tree.toJSON())).toContain(
      "Baby Steps could not be reached. Check your connection and try again.",
    );
    expect(mockUpdateActiveChildProfile).not.toHaveBeenCalled();
  });

  it("preserves a legacy age until the parent deliberately chooses a current option", async () => {
    mockFetchActiveChildProfile.mockResolvedValueOnce({
      ...originalChild,
      age: "4-5 years",
    });
    const tree = await renderScreen();
    expect(textContent(tree.toJSON())).toContain(
      "Current saved age: 4-5 years. It has not been changed.",
    );

    await act(async () => {
      findByLabel(tree.root, "Save child profile").props.onPress();
      await Promise.resolve();
    });

    expect(textContent(tree.toJSON())).toContain(
      "Choose an age from 3 through 12, or 12+.",
    );
    expect(mockUpdateOwnedActiveChildProfile).not.toHaveBeenCalled();
  });
});
