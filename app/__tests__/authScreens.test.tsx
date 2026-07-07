import React from "react";
import { TextInput, TouchableOpacity } from "react-native";
import renderer, { act, type ReactTestInstance } from "react-test-renderer";

const mockRouterReplace = jest.fn();
const mockUseLocalSearchParams = jest.fn(() => ({}));
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockResetPasswordForEmail = jest.fn();
const mockResend = jest.fn();
const mockGetSession = jest.fn();
const mockUpdateUser = jest.fn();
const mockSignOut = jest.fn();
const mockGetInitialURL = jest.fn();
const mountedComponents: renderer.ReactTestRenderer[] = [];

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      resetPasswordForEmail: mockResetPasswordForEmail,
      resend: mockResend,
      getSession: mockGetSession,
      updateUser: mockUpdateUser,
      signOut: mockSignOut,
    },
  },
}));

jest.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      resetPasswordForEmail: mockResetPasswordForEmail,
      resend: mockResend,
      getSession: mockGetSession,
      updateUser: mockUpdateUser,
      signOut: mockSignOut,
    },
  },
}));

jest.mock("@/lib/accountManagement", () => ({
  fetchActiveChildProfiles: jest.fn(),
  getAccountDeletionState: jest.fn(),
  getPostLoginRouteForAccountState: jest.fn(() => "/parent"),
}));

jest.mock("expo-linking", () => ({
  getInitialURL: mockGetInitialURL,
}));

jest.mock("@/components/brand/BrandMark", () => ({
  BrandMark: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("@expo/vector-icons", () => ({
  FontAwesome: "FontAwesome",
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const ForgotPassword = require("../forgot-password").default;
const Login = require("../login").default;
const ResetPassword = require("../reset-password").default;
const SignUp = require("../signup").default;
const CheckEmail = require("../check-email").default;
/* eslint-enable @typescript-eslint/no-require-imports */

const findInput = (root: ReactTestInstance, placeholder: string): ReactTestInstance => {
  const input = root
    .findAllByType(TextInput)
    .find((node) => node.props.placeholder === placeholder);

  if (!input) throw new Error(`Could not find input: ${placeholder}`);
  return input;
};

const findButtonByText = (
  root: ReactTestInstance,
  text: string,
): ReactTestInstance => {
  const button = root.findAllByType(TouchableOpacity).find((candidate) =>
    candidate.findAll((node) => node.props.children === text).length > 0,
  );

  if (!button) throw new Error(`Could not find button: ${text}`);
  return button;
};

const flushPromises = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const renderAuthScreen = async (
  element: React.ReactElement,
  afterRender?: () => Promise<void>,
): Promise<renderer.ReactTestRenderer> => {
  let component: renderer.ReactTestRenderer | null = null;

  await act(async () => {
    component = renderer.create(element);
    if (afterRender) await afterRender();
  });

  if (!component) throw new Error("Screen did not render.");
  mountedComponents.push(component);
  return component;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({});
  mockSignInWithPassword.mockResolvedValue({
    data: { user: null, session: null },
    error: null,
  });
  mockGetInitialURL.mockResolvedValue(null);
  mockGetSession.mockResolvedValue({
    data: { session: { user: { id: "parent-1" } } },
    error: null,
  });
  mockResend.mockResolvedValue({ error: null });
  mockSignOut.mockResolvedValue({ error: null });
});

afterEach(() => {
  act(() => {
    mountedComponents.forEach((component) => {
      component.unmount();
    });
  });
  mountedComponents.length = 0;
});

describe("auth screens", () => {
  it("routes accepted signup attempts to the check-email screen", async () => {
    mockSignUp.mockResolvedValue({
      data: { session: null, user: { identities: [{ id: "identity-1" }] } },
      error: null,
    });

    const component = await renderAuthScreen(<SignUp />);

    act(() => {
      findInput(component.root, "parent@email.com").props.onChangeText(" parent@example.com ");
      findInput(component.root, "Create password").props.onChangeText("secret1");
      findInput(component.root, "Confirm password").props.onChangeText("secret1");
    });

    await act(async () => {
      findButtonByText(component.root, "Create Parent Account").props.onPress();
    });

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "parent@example.com",
        password: "secret1",
      }),
    );
    expect(mockRouterReplace).toHaveBeenCalledWith({
      pathname: "/check-email",
      params: { flow: "signup", email: "parent@example.com" },
    });
  });

  it("keeps session-returning signup attempts on the check-email screen", async () => {
    mockSignUp.mockResolvedValue({
      data: {
        session: { user: { id: "parent-1" } },
        user: { identities: [{ id: "identity-1" }] },
      },
      error: null,
    });

    const component = await renderAuthScreen(<SignUp />);

    act(() => {
      findInput(component.root, "parent@email.com").props.onChangeText(" parent@example.com ");
      findInput(component.root, "Create password").props.onChangeText("secret1");
      findInput(component.root, "Confirm password").props.onChangeText("secret1");
    });

    await act(async () => {
      findButtonByText(component.root, "Create Parent Account").props.onPress();
    });

    expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mockRouterReplace).toHaveBeenCalledWith({
      pathname: "/check-email",
      params: { flow: "signup", email: "parent@example.com" },
    });
  });

  it("routes unconfirmed-email login attempts to confirmation guidance", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Email not confirmed" },
    });

    const component = await renderAuthScreen(<Login />);

    act(() => {
      findInput(component.root, "parent@email.com").props.onChangeText(" parent@example.com ");
      findInput(component.root, "Your password").props.onChangeText("secret1");
    });

    await act(async () => {
      findButtonByText(component.root, "Sign In").props.onPress();
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "parent@example.com",
      password: "secret1",
    });
    expect(mockRouterReplace).toHaveBeenCalledWith({
      pathname: "/check-email",
      params: { flow: "unverified", email: "parent@example.com" },
    });
  });

  it("shows a resend action for unverified email guidance", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      flow: "unverified",
      email: "parent@example.com",
    });

    const component = await renderAuthScreen(<CheckEmail />);

    expect(findButtonByText(component.root, "Back to sign in")).toBeTruthy();
    expect(findButtonByText(component.root, "Resend email")).toBeTruthy();
  });

  it("routes forgot-password success to the safe check-email screen", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    const component = await renderAuthScreen(<ForgotPassword />);

    act(() => {
      findInput(component.root, "parent@email.com").props.onChangeText(" parent@example.com ");
    });

    await act(async () => {
      findButtonByText(component.root, "Send Reset Link").props.onPress();
    });

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      "parent@example.com",
      expect.objectContaining({ redirectTo: expect.any(String) }),
    );
    expect(mockRouterReplace).toHaveBeenCalledWith({
      pathname: "/check-email",
      params: { flow: "reset" },
    });
  });

  it("lets parents show and hide both reset-password fields", async () => {
    const component = await renderAuthScreen(<ResetPassword />, flushPromises);

    expect(findInput(component.root, "Enter new password").props.secureTextEntry).toBe(true);
    expect(findInput(component.root, "Confirm new password").props.secureTextEntry).toBe(true);

    act(() => {
      component.root.findByProps({ accessibilityLabel: "Show new password" }).props.onPress();
    });
    expect(findInput(component.root, "Enter new password").props.secureTextEntry).toBe(false);

    act(() => {
      component.root
        .findByProps({ accessibilityLabel: "Show password confirmation" })
        .props.onPress();
    });
    expect(findInput(component.root, "Confirm new password").props.secureTextEntry).toBe(false);
  });
});
