import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getChildUiLanguageStorageKey,
  loadChildUiLanguagePreference,
  saveChildUiLanguagePreference,
} from "@/lib/childUiLanguagePreference";

describe("child UI language preference storage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it("defaults to disabled when no valid preference exists", async () => {
    await AsyncStorage.setItem(
      getChildUiLanguageStorageKey("invalid-child"),
      "enabled",
    );

    await expect(loadChildUiLanguagePreference("missing-child")).resolves.toBe(
      false,
    );
    await expect(loadChildUiLanguagePreference("invalid-child")).resolves.toBe(
      false,
    );
  });

  it("saves and restores a preference without rewriting the same value", async () => {
    await expect(
      saveChildUiLanguagePreference("child-a", true),
    ).resolves.toBe(true);
    await expect(loadChildUiLanguagePreference("child-a")).resolves.toBe(true);

    const setItem = jest.spyOn(AsyncStorage, "setItem");
    setItem.mockClear();
    await expect(
      saveChildUiLanguagePreference("child-a", true),
    ).resolves.toBe(false);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("keeps Child A and Child B values separate", async () => {
    await saveChildUiLanguagePreference("child-a", true);
    await saveChildUiLanguagePreference("child-b", false);

    await expect(loadChildUiLanguagePreference("child-a")).resolves.toBe(true);
    await expect(loadChildUiLanguagePreference("child-b")).resolves.toBe(false);
    expect(await AsyncStorage.getItem(getChildUiLanguageStorageKey("child-a"))).toBe(
      "true",
    );
    expect(await AsyncStorage.getItem(getChildUiLanguageStorageKey("child-b"))).toBe(
      "false",
    );
  });
});
