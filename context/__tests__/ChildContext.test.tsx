import React from "react";
import renderer, { act } from "react-test-renderer";

const mockHydrateLearningProgressFromSharedProgress = jest.fn();
const mockHydrateProgressFromRemote = jest.fn();
const mockSyncProgressNow = jest.fn();

jest.mock("@/lib/learningProgressRepository", () => ({
  hydrateLearningProgressFromSharedProgress: (...args: unknown[]) =>
    mockHydrateLearningProgressFromSharedProgress(...args),
}));

jest.mock("@/lib/progressRepository", () => ({
  hydrateProgressFromRemote: (...args: unknown[]) =>
    mockHydrateProgressFromRemote(...args),
  syncProgressNow: (...args: unknown[]) => mockSyncProgressNow(...args),
}));

const { ChildProvider, useChild }: typeof import("../ChildContext") =
  require("../ChildContext");

type ChildContextApi = ReturnType<typeof useChild>;

const flushChildEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe("ChildProvider progress hydration", () => {
  let api: ChildContextApi | undefined;
  let tree: renderer.ReactTestRenderer | undefined;

  const Probe = () => {
    api = useChild();
    return null;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrateLearningProgressFromSharedProgress.mockResolvedValue({
      completedLessonIds: [],
    });
    mockHydrateProgressFromRemote.mockResolvedValue({ activities: 0, stages: 0 });
    mockSyncProgressNow.mockResolvedValue({ pushed: 0, skipped: 0, failed: 0 });
    api = undefined;
    tree = undefined;
  });

  afterEach(() => {
    act(() => {
      tree?.unmount();
    });
  });

  it("syncs the previous child and hydrates shared and Learning progress for the active child", async () => {
    await act(async () => {
      tree = renderer.create(
        <ChildProvider>
          <Probe />
        </ChildProvider>,
      );
    });

    await act(async () => {
      api?.setActiveChild({
        id: "child-1",
        name: "A",
        gender: "girl",
        age: "4",
        selected_language_code: "luganda",
      });
    });
    await flushChildEffects();

    expect(mockSyncProgressNow).toHaveBeenCalledWith("child-1");
    expect(mockHydrateProgressFromRemote).toHaveBeenCalledWith("child-1", "lg", {
      activityTypes: ["language", "learning", "counting", "words", "stories", "coloring"],
    });
    expect(mockHydrateLearningProgressFromSharedProgress).toHaveBeenCalledWith(
      "child-1",
      "lg",
    );

    await act(async () => {
      api?.setActiveChild({
        id: "child-2",
        name: "B",
        gender: "boy",
        age: "5",
        selected_language_code: "nyn",
      });
    });
    await flushChildEffects();

    expect(mockSyncProgressNow).toHaveBeenCalledWith("child-1");
    expect(mockSyncProgressNow).toHaveBeenCalledWith("child-2");
    expect(mockHydrateProgressFromRemote).toHaveBeenCalledWith("child-2", "nyn", {
      activityTypes: ["language", "learning", "counting", "words", "stories", "coloring"],
    });
    expect(mockHydrateLearningProgressFromSharedProgress).toHaveBeenCalledWith(
      "child-2",
      "nyn",
    );
  });
});
