/* eslint-disable import/first */

import React from "react";
import renderer, { act } from "react-test-renderer";

let mockActiveChild: { id: string; selected_language_code?: string } | null = null;
const mockRecordQualifiedStreakActivity = jest.fn();

jest.mock("@/lib/utils", () => ({
  saveActivity: jest.fn(),
}));

jest.mock("@/lib/progressRepository", () => ({
  markStageCompleted: jest.fn(),
  syncProgressNow: jest.fn(),
  updateActivityProgress: jest.fn(),
}));

jest.mock("@/context/ChildContext", () => ({
  useChild: () => ({ activeChild: mockActiveChild }),
}));

jest.mock("@/lib/streakRepository", () => ({
  recordQualifiedStreakActivity: (...args: unknown[]) =>
    mockRecordQualifiedStreakActivity(...args),
}));

import {
  markStageCompleted,
  syncProgressNow,
  updateActivityProgress,
} from "@/lib/progressRepository";
import { saveActivity } from "@/lib/utils";
import { saveStoryQuizProgress, StoryProgress } from "../StoryProgress";

type TestableStoryProgressProps = Omit<React.ComponentProps<typeof StoryProgress>, "children"> & {
  children?: React.ReactNode;
};
const TestableStoryProgress = StoryProgress as React.ComponentType<TestableStoryProgressProps>;

describe("saveStoryQuizProgress", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveChild = null;
    mockRecordQualifiedStreakActivity.mockResolvedValue({
      recorded: true,
      firstLocalQualification: true,
    });
  });

  it("writes language-scoped story quiz activity and normalized progress", async () => {
    await saveStoryQuizProgress({
      activeChild: {
        id: "child-1",
        selected_language_code: "nyn",
      },
      storyId: "kintu",
      storyTitle: "The Tale of Kintu",
      score: 2,
      total: 4,
      durationSeconds: 30,
    });

    expect(saveActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        child_id: "child-1",
        activity_type: "stories",
        activity_name: 'Completed Quiz for "The Tale of Kintu"',
        score: "2/4",
        duration: 30,
        language_code: "nyn",
      }),
    );
    expect(updateActivityProgress).toHaveBeenCalledWith(
      "child-1",
      "nyn",
      "stories",
      expect.objectContaining({
        status: "completed",
        score: 50,
        last_stage_id: "kintu",
        progress_payload: expect.objectContaining({
          storyId: "kintu",
          storyTitle: "The Tale of Kintu",
          quizScore: 2,
          quizTotal: 4,
          quizPercentage: 50,
          durationSeconds: 30,
        }),
      }),
    );
    expect(markStageCompleted).toHaveBeenCalledWith(
      "child-1",
      "nyn",
      "stories",
      "kintu",
      expect.objectContaining({
        score: 50,
        progress_payload: expect.objectContaining({
          storyTitle: "The Tale of Kintu",
          quizScore: 2,
          quizTotal: 4,
          quizPercentage: 50,
        }),
      }),
    );
    expect(syncProgressNow).toHaveBeenCalledWith("child-1");
  });

  it("persists local completion before streak work and finishes when streak storage fails", async () => {
    mockActiveChild = { id: "child-1", selected_language_code: "nyn" };
    const timeline: string[] = [];
    const streakError = new Error("streak queue failed");
    const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    (updateActivityProgress as jest.Mock).mockImplementationOnce(async () => {
      timeline.push("local-activity-progress");
    });
    (markStageCompleted as jest.Mock).mockImplementationOnce(async () => {
      timeline.push("local-stage-progress");
    });
    mockRecordQualifiedStreakActivity.mockImplementationOnce(async () => {
      timeline.push("local-streak-attempt");
      throw streakError;
    });
    (saveActivity as jest.Mock).mockImplementationOnce(async () => {
      timeline.push("remote-activity-history");
    });
    (syncProgressNow as jest.Mock).mockImplementationOnce(async () => {
      timeline.push("remote-progress-sync");
    });
    let tree!: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(React.createElement(
        TestableStoryProgress,
        {
          storyId: "story-1",
          storyTitle: "A Story",
          totalPages: 2,
          currentPage: 1,
        },
        React.createElement(React.Fragment),
      ));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(timeline.slice(0, 3)).toEqual([
      "local-activity-progress",
      "local-stage-progress",
      "local-streak-attempt",
    ]);
    expect(timeline).toEqual(expect.arrayContaining([
      "remote-activity-history",
      "remote-progress-sync",
    ]));
    expect(mockRecordQualifiedStreakActivity).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledWith("Could not record the story streak day:", streakError);
    act(() => tree.unmount());
    warning.mockRestore();
  });
});
