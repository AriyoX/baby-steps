import React from "react";
import { Text } from "react-native";
import renderer, { act } from "react-test-renderer";
import { useLearningHubContent } from "../useLearningHubContent";
import {
  clearLearningHubContentRegistry,
  registerLearningHubLanguageContent,
} from "@/content/learningHubRepository";
import { getLearningHubSeedFixture } from "@/content/testFixtures/learningHubTestFixture";
import type { LearningLanguageContent } from "@/content/learningHubTypes";

const mockLoadLearningHubLanguageContent = jest.fn();

jest.mock("@/content/learningHubLoader", () => ({
  loadLearningHubLanguageContent: (...args: unknown[]) =>
    mockLoadLearningHubLanguageContent(...args),
}));

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const Harness = () => {
  const state = useLearningHubContent("lg");
  return (
    <Text>{`${state.status}:${state.contentVersion ?? "none"}:${
      state.languageContent?.pathTitle ?? "none"
    }`}</Text>
  );
};

describe("useLearningHubContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearLearningHubContentRegistry();
  });

  it("waits for a network-first repository result instead of rendering registered stale content", async () => {
    const pending = deferred<{
      status: "ready";
      languageCode: "lg";
      content: LearningLanguageContent;
      contentVersion: string;
      source: "database";
      retainedPrevious: boolean;
    }>();
    mockLoadLearningHubLanguageContent.mockReturnValue(pending.promise);
    const content = getLearningHubSeedFixture().languages
      .lg as unknown as LearningLanguageContent;
    registerLearningHubLanguageContent(
      "lg",
      { ...content, pathTitle: "Stale registered curriculum" },
      "learning_hub/curriculum#1",
    );
    let tree: renderer.ReactTestRenderer | undefined;

    act(() => {
      tree = renderer.create(<Harness />);
    });

    expect(JSON.stringify(tree?.toJSON())).toContain("loading:none:none");
    expect(mockLoadLearningHubLanguageContent).toHaveBeenCalledWith("lg", {
      forceRefresh: true,
    });

    await act(async () => {
      pending.resolve({
        status: "ready",
        languageCode: "lg",
        content,
        contentVersion: "learning_hub/curriculum#2",
        source: "database",
        retainedPrevious: false,
      });
      await pending.promise;
    });

    expect(JSON.stringify(tree?.toJSON())).toContain(
      "ready:learning_hub/curriculum#2",
    );
    act(() => tree?.unmount());
  });
});
