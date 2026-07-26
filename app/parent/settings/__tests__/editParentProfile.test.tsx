import React from "react";
import { TextInput } from "react-native";
import renderer, { act, type ReactTestInstance } from "react-test-renderer";

const mockRefreshParentProfile = jest.fn();
const mockSetConfirmedParentProfile = jest.fn();
const mockSaveParentDisplayName = jest.fn();
const mockRequireInternet = jest.fn();
let mockProfileContext: {
  profile: {
    id: string;
    displayName: string | null;
    email: string;
  } | null;
  isLoading: boolean;
  error: string | null;
};

jest.mock("@/context/ParentProfileContext", () => ({
  useParentProfile: () => ({
    ...mockProfileContext,
    refreshParentProfile: mockRefreshParentProfile,
    setConfirmedParentProfile: mockSetConfirmedParentProfile,
  }),
}));

jest.mock("@/lib/parentProfileRepository", () => {
  const actual = jest.requireActual("@/lib/parentProfileRepository");
  return {
    ...actual,
    saveParentDisplayName: (...args: unknown[]) =>
      mockSaveParentDisplayName(...args),
  };
});

jest.mock("@/lib/network", () => ({
  requireInternet: (...args: unknown[]) => mockRequireInternet(...args),
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
const EditParentProfileScreen =
  require("../edit-parent-profile").default;
const { ParentProfileError } = require("@/lib/parentProfileRepository") as {
  ParentProfileError: new (message: string, kind: string) => Error;
};
/* eslint-enable @typescript-eslint/no-require-imports */

const mountedTrees: renderer.ReactTestRenderer[] = [];

const textContent = (node: unknown): string => {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (!node || typeof node !== "object") return "";
  return textContent((node as { children?: unknown }).children);
};

const findByLabel = (root: ReactTestInstance, label: string) =>
  root.find((node) => node.props.accessibilityLabel === label);

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockProfileContext = {
    profile: {
      id: "parent-a",
      displayName: "Amina Parent",
      email: "parent@example.com",
    },
    isLoading: false,
    error: null,
  };
  mockRequireInternet.mockResolvedValue(true);
  mockRefreshParentProfile.mockResolvedValue(mockProfileContext.profile);
});

afterEach(() => {
  act(() => {
    mountedTrees.splice(0).forEach((tree) => tree.unmount());
  });
});

const renderScreen = async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<EditParentProfileScreen />);
    await Promise.resolve();
  });
  mountedTrees.push(tree);
  return tree;
};

describe("Edit parent profile", () => {
  it("shows the authenticated email and directs changes to support", async () => {
    const tree = await renderScreen();
    const text = textContent(tree.toJSON());

    expect(text).toContain("parent@example.com");
    expect(text).toContain(
      "Contact Baby Steps support",
    );
    expect(tree.root.findAllByType(TextInput)).toHaveLength(1);
  });

  it("shows validation without submitting a blank display name", async () => {
    const tree = await renderScreen();
    act(() => {
      findByLabel(tree.root, "Parent display name").props.onChangeText("  ");
    });
    await act(async () => {
      findByLabel(tree.root, "Save parent profile").props.onPress();
      await Promise.resolve();
    });

    expect(textContent(tree.toJSON())).toContain("Enter a name.");
    expect(mockSaveParentDisplayName).not.toHaveBeenCalled();
  });

  it("prevents duplicate submission and publishes only the confirmed save", async () => {
    const pending = deferred<{
      id: string;
      displayName: string;
      email: string;
    }>();
    mockSaveParentDisplayName.mockReturnValueOnce(pending.promise);
    const tree = await renderScreen();
    act(() => {
      findByLabel(tree.root, "Parent display name").props.onChangeText(
        "  Amélia Parent  ",
      );
    });
    act(() => {
      const save = findByLabel(tree.root, "Save parent profile");
      save.props.onPress();
      save.props.onPress();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSaveParentDisplayName).toHaveBeenCalledTimes(1);
    expect(mockSaveParentDisplayName).toHaveBeenCalledWith("Amélia Parent");

    await act(async () => {
      pending.resolve({
        id: "parent-a",
        displayName: "Amélia Parent",
        email: "parent@example.com",
      });
      await pending.promise;
    });

    expect(mockSetConfirmedParentProfile).toHaveBeenCalledWith({
      id: "parent-a",
      displayName: "Amélia Parent",
      email: "parent@example.com",
    });
    expect(textContent(tree.toJSON())).toContain("Parent profile saved.");
  });

  it("restores the last confirmed value after an authorization failure", async () => {
    mockSaveParentDisplayName.mockRejectedValueOnce(
      new ParentProfileError("not allowed", "authorization"),
    );
    const tree = await renderScreen();
    act(() => {
      findByLabel(tree.root, "Parent display name").props.onChangeText(
        "Unconfirmed",
      );
    });
    await act(async () => {
      findByLabel(tree.root, "Save parent profile").props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(findByLabel(tree.root, "Parent display name").props.value).toBe(
      "Amina Parent",
    );
    expect(textContent(tree.toJSON())).toContain(
      "This parent profile cannot be changed from this account.",
    );
    expect(mockSetConfirmedParentProfile).not.toHaveBeenCalled();
  });
});
