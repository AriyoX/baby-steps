/* eslint-disable import/first */

import React from "react";
import { View } from "react-native";
import renderer, { act, type ReactTestRenderer } from "react-test-renderer";

const mockFetchActiveChildProfile = jest.fn();
const mockLoadUiLanguagePreference = jest.fn(async (_childId?: string) => false);
const mockChildStreakSection = jest.fn(({ childId }: { childId: string; mode?: string }) => (
  <View testID="canonical-child-streak-section" accessibilityLabel={childId} />
));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ childId: "child-b" }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));
jest.mock("@/components/brand/BrandMark", () => ({ BrandMark: () => null }));
jest.mock("@/lib/accountManagement", () => ({
  fetchActiveChildProfile: (...args: unknown[]) => mockFetchActiveChildProfile(...args),
}));
jest.mock("@/lib/childUiLanguagePreference", () => ({
  loadChildUiLanguagePreference: (childId: string) => mockLoadUiLanguagePreference(childId),
  saveChildUiLanguagePreference: jest.fn(async () => undefined),
}));
jest.mock("@/components/parent/ChildStreakSection", () => ({
  ChildStreakSection: (props: { childId: string; mode?: string }) => mockChildStreakSection(props),
}));

import ChildProfileDetailManagementScreen from "../app/parent/settings/child-profile-detail";

describe("canonical parent child streak settings route", () => {
  let tree: ReactTestRenderer | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchActiveChildProfile.mockResolvedValue({
      id: "child-b",
      parent_id: "parent-1",
      name: "Bayo",
      gender: "male",
      age: "6",
      selected_language_code: "lg",
    });
  });

  afterEach(() => {
    act(() => tree?.unmount());
    tree = null;
  });

  it("renders the shared streak section for the owned child selected by route", async () => {
    await act(async () => {
      tree = renderer.create(<ChildProfileDetailManagementScreen />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockFetchActiveChildProfile).toHaveBeenCalledWith("child-b");
    expect(mockChildStreakSection).toHaveBeenCalledWith({ childId: "child-b", mode: "settings" });
    expect(tree!.root.findByProps({ testID: "canonical-child-streak-section" }).props.accessibilityLabel)
      .toBe("child-b");
  });
});
