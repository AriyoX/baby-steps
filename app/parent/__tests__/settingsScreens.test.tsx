import React from "react";
import renderer, { act } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { PlaceholderSettingsScreen } from "@/components/settings/PlaceholderSettingsScreen";
import {
  fetchActiveChildProfiles,
  reactivateAccount,
} from "@/lib/accountManagement";
import { supabase } from "@/lib/supabase";
import {
  getAccountReactivationContent,
  signOutFromDeletionStatus,
} from "../../account-reactivation";
import SettingsScreen from "../settings";
import AccountManagementScreen from "../settings/account";
import AccountDeleteScreen from "../settings/account-delete";
import AboutBabyStepsScreen from "../settings/about";
import ChildProfilesManagementScreen from "../settings/child-profiles";
import HelpSupportScreen from "../settings/help-support";
import PrivacySafetyScreen from "../settings/privacy-safety";

const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
const mockSetActiveChild = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockRouterBack,
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: "StatusBar",
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("@/components/brand/BrandMark", () => ({
  BrandMark: () => null,
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

jest.mock("@/lib/accountManagement", () => ({
  ACCOUNT_DELETE_CONFIRMATION_WORD: "DELETE",
  fetchActiveChildProfiles: jest.fn(),
  getAccountDeletionState: jest.fn(),
  isAccountDeleteConfirmationValid: (confirmation: string) => confirmation.trim() === "DELETE",
  reactivateAccount: jest.fn(),
  requestAccountDeletion: jest.fn(),
}));

jest.mock("@/context/ChildContext", () => ({
  useChild: () => ({
    setActiveChild: mockSetActiveChild,
  }),
}));

const textContent = (node: unknown): string => {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (!node || typeof node !== "object") return "";

  const maybeNode = node as { children?: unknown };
  if (Array.isArray(maybeNode.children)) {
    return maybeNode.children.map(textContent).join("");
  }

  return textContent(maybeNode.children);
};

beforeEach(() => {
  jest.clearAllMocks();
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: { user: { id: "parent-1" } } },
  });
  (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
});

describe("settings management screens", () => {
  it("renders the Settings entries", async () => {
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(<SettingsScreen />);
    });

    const text = textContent(tree?.toJSON());

    expect(text).toContain("Account");
    expect(text).toContain("Child Profiles");
    expect(text).toContain("Audio");
    expect(text).toContain("Privacy & Safety");
    expect(text).toContain("About Baby Steps");
  });

  it("renders a placeholder settings screen", async () => {
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(
        <PlaceholderSettingsScreen
          title="Notifications"
          description="Reminder and learning update preferences will be managed here."
        />,
      );
    });

    const text = textContent(tree?.toJSON());

    expect(text).toContain("Notifications");
    expect(text).toContain("Reminder and learning update preferences");
  });

  it("renders the Account Management screen with user details", async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "parent-1", email: "parent@example.com" } },
      error: null,
    });

    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(<AccountManagementScreen />);
      await Promise.resolve();
    });

    const text = textContent(tree?.toJSON());
    expect(text).toContain("Signed-in Parent");
    expect(text).toContain("parent@example.com");
    expect(text).toContain("Delete account");
    expect(text).toContain("Schedule account deletion");
  });

  it("renders Delete Account copy as a scheduled 30-day request", async () => {
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(<AccountDeleteScreen />);
    });

    const text = textContent(tree?.toJSON());

    expect(text).toContain("schedule it for deletion");
    expect(text).toContain("learning progress will be hidden");
    expect(text).toContain("30 days");
    expect(text).toContain("log in again and reactivate your account");
    expect(text).toContain("secure server-side removal process");
    expect(text).toContain("Shared Baby Steps learning content");
    expect(text).toContain("Schedule Account Deletion");
    expect(text).not.toMatch(/permanently deleted|deleted forever|delete immediately|all your data is gone/i);
  });

  it("renders pending deletion reactivation copy with the deadline", async () => {
    const content = getAccountReactivationContent({
      phase: "pending",
      graceEndsAt: "2026-08-01T00:00:00.000Z",
      request: {
        id: "request-1",
        user_id: "parent-1",
        status: "requested",
        requested_at: "2026-07-02T00:00:00.000Z",
      },
    });

    expect(content.message).toContain("Your Baby Steps account is scheduled for deletion");
    expect(content.message).toMatch(/before .*2026/);
    expect(content.primaryButtonLabel).toBe("Reactivate Account");
    expect(content.secondaryButtonLabel).toBe("Keep Deletion Request and Sign Out");
    expect(content.showContactSupport).toBe(false);
  });

  it("shows expired deletion copy without offering reactivation", async () => {
    const content = getAccountReactivationContent({
      phase: "expired",
      graceEndsAt: "2026-07-01T00:00:00.000Z",
      request: {
        id: "request-1",
        user_id: "parent-1",
        status: "requested",
        requested_at: "2026-06-01T00:00:00.000Z",
      },
    });

    expect(content.message).toContain("The deletion period for this account has ended");
    expect(content.message).toContain("waiting for final removal");
    expect(content.secondaryButtonLabel).toBe("Sign Out");
    expect(content.showContactSupport).toBe(true);
    expect(content.primaryButtonLabel).toBeNull();
  });

  it("keeps the deletion request when the pending-deletion sign-out button is used", async () => {
    await signOutFromDeletionStatus({
      setActiveChild: mockSetActiveChild,
      signOut: () => supabase.auth.signOut(),
      replace: mockRouterReplace,
    });

    expect(mockSetActiveChild).toHaveBeenCalledWith(null);
    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(reactivateAccount).not.toHaveBeenCalled();
    expect(mockRouterReplace).toHaveBeenCalledWith("/login");
  });

  it("renders privacy, support, and about copy for deletion help", async () => {
    let privacyTree: ReactTestRenderer | undefined;
    let supportTree: ReactTestRenderer | undefined;
    let aboutTree: ReactTestRenderer | undefined;

    await act(async () => {
      privacyTree = renderer.create(<PrivacySafetyScreen />);
      supportTree = renderer.create(<HelpSupportScreen />);
      aboutTree = renderer.create(<AboutBabyStepsScreen />);
    });

    const privacyText = textContent(privacyTree?.toJSON());
    const supportText = textContent(supportTree?.toJSON());
    const aboutText = textContent(aboutTree?.toJSON());

    expect(privacyText).toContain("30-day period");
    expect(privacyText).toContain("Data Deletion Information");
    expect(privacyText).toContain("Delete Account");
    expect(supportText).toContain("If you cannot access your account but want to request deletion");
    expect(supportText).toContain("hello@babystepslearn.com");
    expect(aboutText).toContain("Privacy, account deletion, and support details");
  });

  it("renders the Child Profiles Management screen with active children", async () => {
    (fetchActiveChildProfiles as jest.Mock).mockResolvedValue([
      {
        id: "child-1",
        parent_id: "parent-1",
        name: "Amina",
        gender: "female",
        age: "5",
      },
    ]);

    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(<ChildProfilesManagementScreen />);
      await Promise.resolve();
    });

    const text = textContent(tree?.toJSON());
    expect(text).toContain("Child Profiles");
    expect(text).toContain("Amina");
    expect(text).toContain("Add");
  });
});
