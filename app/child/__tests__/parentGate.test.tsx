import React from "react";
import renderer, { act, type ReactTestInstance } from "react-test-renderer";
import { AppState } from "react-native";

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn();
const mockDeactivateChildMode = jest.fn(async () => undefined);
const mockHasParentPin = jest.fn();
const mockVerifyParentPin = jest.fn();
const mockReauthenticateParentAccount = jest.fn();
const mockGetSession = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
    back: mockBack,
    canGoBack: mockCanGoBack,
  }),
}));

jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));

jest.mock("react-native-safe-area-context", () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const ReactInMock = require("react");
  const { View: ViewInMock } = require("react-native");
  /* eslint-enable @typescript-eslint/no-require-imports */
  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactInMock.createElement(ViewInMock, props, children),
  };
});

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

jest.mock("@/components/StyledText", () => ({
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  Text: require("react-native").Text,
}));

jest.mock("@/context/ChildContext", () => ({
  useChild: () => ({
    activeChild: { id: "child-1" },
    deactivateChildMode: mockDeactivateChildMode,
  }),
}));

jest.mock("@/lib/parentAccess", () => ({
  PARENT_PIN_LENGTH: 6,
  hasParentPin: (...args: unknown[]) => mockHasParentPin(...args),
  verifyParentPin: (...args: unknown[]) => mockVerifyParentPin(...args),
  reauthenticateParentAccount: (...args: unknown[]) =>
    mockReauthenticateParentAccount(...args),
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const ParentGate = require("../parent-gate").default;
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

const renderGate = async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<ParentGate />);
    await Promise.resolve();
    await Promise.resolve();
  });
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
  mountedTrees.push(tree);
  return tree;
};

const enterPin = (tree: renderer.ReactTestRenderer, pin: string) => {
  pin.split("").forEach((digit) => {
    act(() => findByLabel(tree.root, `Enter ${digit}`).props.onPress());
  });
};

describe("ParentGate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: "parent-1", email: "parent@example.com" },
        },
      },
    });
    mockHasParentPin.mockResolvedValue(true);
    mockCanGoBack.mockReturnValue(true);
    mockVerifyParentPin.mockResolvedValue({
      status: "success",
      retryAfterMs: 0,
    });
    mockReauthenticateParentAccount.mockResolvedValue(true);
  });

  afterEach(() => {
    act(() => {
      mountedTrees.splice(0).forEach((tree) => tree.unmount());
    });
  });

  it("clears child mode and opens the parent dashboard after a correct PIN", async () => {
    const tree = await renderGate();
    enterPin(tree, "123456");

    await act(async () => {
      findByLabel(tree.root, "Verify parent PIN").props.onPress();
      await Promise.resolve();
    });

    expect(mockVerifyParentPin).toHaveBeenCalledWith("parent-1", "123456");
    expect(mockDeactivateChildMode).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/parent");
  });

  it("returns to child mode without dispatching an unhandled back action", async () => {
    mockCanGoBack.mockReturnValueOnce(false);
    const tree = await renderGate();

    act(() => {
      findByLabel(tree.root, "Return to child mode").props.onPress();
    });

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/child/learning",
      params: { active: "child-1" },
    });
  });

  it("does not reveal PIN details or leave child mode after a wrong PIN", async () => {
    mockVerifyParentPin.mockResolvedValueOnce({
      status: "incorrect",
      retryAfterMs: 0,
    });
    const tree = await renderGate();
    enterPin(tree, "000000");

    await act(async () => {
      findByLabel(tree.root, "Verify parent PIN").props.onPress();
      await Promise.resolve();
    });

    expect(mockDeactivateChildMode).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalledWith("/parent");
    expect(JSON.stringify(tree.toJSON())).toContain(
      "That PIN did not work. Please try again.",
    );
  });

  it("shows a cooldown and blocks another verification attempt", async () => {
    mockVerifyParentPin.mockResolvedValueOnce({
      status: "cooldown",
      retryAfterMs: 30_000,
    });
    const tree = await renderGate();
    enterPin(tree, "000000");

    await act(async () => {
      findByLabel(tree.root, "Verify parent PIN").props.onPress();
      await Promise.resolve();
    });

    expect(textContent(tree.toJSON())).toContain("Try again in 30 seconds.");
    expect(findByLabel(tree.root, "Verify parent PIN").props.disabled).toBe(true);
  });

  it("uses account reauthentication when no device PIN is configured", async () => {
    mockHasParentPin.mockResolvedValue(false);
    const tree = await renderGate();

    act(() => {
      findByLabel(tree.root, "Parent account password").props.onChangeText(
        "current-password",
      );
    });
    await act(async () => {
      findByLabel(tree.root, "Verify parent password").props.onPress();
      await Promise.resolve();
    });

    expect(mockReauthenticateParentAccount).toHaveBeenCalledWith(
      "parent-1",
      "current-password",
    );
    expect(mockDeactivateChildMode).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/parent");
  });

  it("offers email password recovery when both PIN and password are forgotten", async () => {
    const tree = await renderGate();

    act(() => {
      tree.root
        .findAll((node) =>
          textContent(node).includes("Forgot PIN? Use parent password"),
        )
        .find((node) => typeof node.props.onPress === "function")
        ?.props.onPress();
    });
    act(() => {
      findByLabel(tree.root, "Reset forgotten parent password").props.onPress();
    });

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/forgot-password",
      params: { email: "parent@example.com" },
    });
    expect(mockDeactivateChildMode).not.toHaveBeenCalled();
  });

  it("takes a password-verified forgotten-PIN flow straight to PIN replacement", async () => {
    const tree = await renderGate();

    act(() => {
      tree.root
        .findAll((node) =>
          textContent(node).includes("Forgot PIN? Use parent password"),
        )
        .find((node) => typeof node.props.onPress === "function")
        ?.props.onPress();
    });
    act(() => {
      findByLabel(tree.root, "Parent account password").props.onChangeText(
        "current-password",
      );
    });
    await act(async () => {
      findByLabel(tree.root, "Verify parent password").props.onPress();
      await Promise.resolve();
    });

    expect(mockDeactivateChildMode).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(
      "/parent/settings/parent-pin",
    );
  });

  it("falls back to the parent password when the PIN cannot be opened", async () => {
    mockHasParentPin.mockRejectedValueOnce(new Error("secure storage failed"));
    const tree = await renderGate();

    expect(textContent(tree.toJSON())).toContain(
      "Your PIN could not be opened. Use your account password instead.",
    );
    expect(mockDeactivateChildMode).not.toHaveBeenCalled();
  });

  it("cancels an in-flight PIN unlock and clears input when the app backgrounds", async () => {
    let appStateListener: ((state: string) => void) | undefined;
    const remove = jest.fn();
    const appStateSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation(((_event: string, listener: (state: string) => void) => {
        appStateListener = listener;
        return { remove };
      }) as typeof AppState.addEventListener);
    let finishVerification!: (value: {
      status: "success";
      retryAfterMs: number;
    }) => void;
    mockVerifyParentPin.mockReturnValueOnce(
      new Promise((resolve) => {
        finishVerification = resolve;
      }),
    );

    try {
      const tree = await renderGate();
      enterPin(tree, "123456");
      act(() => {
        findByLabel(tree.root, "Verify parent PIN").props.onPress();
      });
      await act(async () => {
        await Promise.resolve();
      });

      act(() => appStateListener?.("background"));
      await act(async () => {
        finishVerification({ status: "success", retryAfterMs: 0 });
        await Promise.resolve();
      });

      expect(
        findByLabel(tree.root, "0 PIN digits entered"),
      ).toBeTruthy();
      expect(mockDeactivateChildMode).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalledWith("/parent");
    } finally {
      appStateSpy.mockRestore();
    }
  });
});
