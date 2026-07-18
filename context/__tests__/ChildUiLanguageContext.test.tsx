import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import renderer, { act } from "react-test-renderer";
import { ChildContext } from "@/context/ChildContext";
import {
  useChildUiLanguage,
} from "@/context/ChildUiLanguageContext";
import { ChildUiLanguageProvider } from "@/context/ChildUiLanguageProvider";
import { saveChildUiLanguagePreference } from "@/lib/childUiLanguagePreference";

jest.mock("@/lib/progressRepository", () => ({
  cancelScheduledProgressSync: jest.fn(),
  hydrateProgressFromRemote: jest.fn(),
  syncProgressNow: jest.fn(),
}));

jest.mock("@/lib/learningProgressRepository", () => ({
  hydrateLearningProgressFromSharedProgress: jest.fn(),
}));

type Child = {
  id: string;
  name: string;
  gender: string;
  age: string;
  selected_language_code?: string;
};

type ChildUiApi = ReturnType<typeof useChildUiLanguage>;

const setActiveChild = jest.fn();
const clearActiveChildForSignOut = jest.fn(async () => undefined);

const flushPreferenceEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe("ChildUiLanguageProvider", () => {
  let api: ChildUiApi | undefined;
  let tree: renderer.ReactTestRenderer | undefined;

  const Probe = () => {
    api = useChildUiLanguage();
    return null;
  };

  const renderChild = async (child: Child) => {
    await act(async () => {
      tree = renderer.create(
        <ChildContext.Provider
          value={{
            activeChild: child,
            setActiveChild,
            clearActiveChildForSignOut,
          }}
        >
          <ChildUiLanguageProvider>
            <Probe />
          </ChildUiLanguageProvider>
        </ChildContext.Provider>,
      );
    });
    await flushPreferenceEffects();
  };

  const updateChild = async (child: Child) => {
    await act(async () => {
      tree?.update(
        <ChildContext.Provider
          value={{
            activeChild: child,
            setActiveChild,
            clearActiveChildForSignOut,
          }}
        >
          <ChildUiLanguageProvider>
            <Probe />
          </ChildUiLanguageProvider>
        </ChildContext.Provider>,
      );
    });
    await flushPreferenceEffects();
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    api = undefined;
    tree = undefined;
  });

  afterEach(() => {
    act(() => {
      tree?.unmount();
    });
  });

  it("starts disabled for a child with no saved preference", async () => {
    await renderChild({
      id: "child-a",
      name: "A",
      gender: "girl",
      age: "6",
      selected_language_code: "lg",
    });

    expect(api?.enabled).toBe(false);
    expect(api?.t("navigation.games")).toBe("Games");
  });

  it("reloads the correct preference when the active child changes", async () => {
    await saveChildUiLanguagePreference("child-a", true);
    await saveChildUiLanguagePreference("child-b", false);

    await renderChild({
      id: "child-a",
      name: "A",
      gender: "girl",
      age: "6",
      selected_language_code: "lg",
    });
    expect(api?.enabled).toBe(true);
    expect(api?.t("navigation.games")).toBe("Emizannyo");

    await updateChild({
      id: "child-b",
      name: "B",
      gender: "boy",
      age: "7",
      selected_language_code: "lg",
    });
    expect(api?.enabled).toBe(false);
    expect(api?.t("navigation.games")).toBe("Games");

    await updateChild({
      id: "child-a",
      name: "A",
      gender: "girl",
      age: "6",
      selected_language_code: "lg",
    });
    expect(api?.enabled).toBe(true);
    expect(api?.t("navigation.games")).toBe("Emizannyo");
  });

  it("restores English immediately after disabling", async () => {
    await saveChildUiLanguagePreference("child-a", true);
    await renderChild({
      id: "child-a",
      name: "A",
      gender: "girl",
      age: "6",
      selected_language_code: "lg",
    });

    await act(async () => {
      await api?.setEnabled(false);
    });

    expect(api?.enabled).toBe(false);
    expect(api?.t("navigation.games")).toBe("Games");
    await expect(
      AsyncStorage.getItem("@BabySteps:ChildUiLanguage:v1:child-a"),
    ).resolves.toBe("false");
  });
});
