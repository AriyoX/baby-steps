/* eslint-disable import/first */

jest.mock("@/lib/utils", () => ({
  saveActivity: jest.fn(),
}));

jest.mock("@/lib/progressRepository", () => ({
  markStageCompleted: jest.fn(),
  syncProgressNow: jest.fn(),
  updateActivityProgress: jest.fn(),
}));

import {
  markStageCompleted,
  syncProgressNow,
  updateActivityProgress,
} from "@/lib/progressRepository";
import { saveActivity } from "@/lib/utils";
import { saveStoryQuizProgress } from "../StoryProgress";

describe("saveStoryQuizProgress", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
