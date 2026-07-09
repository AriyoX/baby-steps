jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import {
  clearProgressRepositoryStorage,
  getActivityProgress,
  getPendingProgressSyncCount,
  getStageProgress,
  hydrateProgressFromRemote,
  markLevelCompleted,
  shouldHydrateProgress,
  syncProgressNow,
  updateActivityProgress,
} from "../progressRepository";

const childId = "child-1";
const languageCode = "lg";
const activityType = "learning";

const createQuery = (result: { data: unknown[] | null; error: unknown }) => {
  const promise = Promise.resolve(result);
  const query: {
    select: jest.Mock;
    eq: jest.Mock;
    in: jest.Mock;
    then: Promise<typeof result>["then"];
    catch: Promise<typeof result>["catch"];
    finally: Promise<typeof result>["finally"];
  } = {
    select: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);

  return query;
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await clearProgressRepositoryStorage();
});

describe("progress repository local-first behavior", () => {
  it("saves progress locally and queues dirty records without calling Supabase", async () => {
    await updateActivityProgress(
      childId,
      languageCode,
      activityType,
      {
        status: "in_progress",
        score: 20,
        progress_payload: { completedLevels: [1] },
      },
      { scheduleSync: false },
    );

    const local = await getActivityProgress(childId, languageCode, activityType);

    expect(local?.score).toBe(20);
    expect(local?.dirty).toBe(true);
    expect(await getPendingProgressSyncCount(childId)).toBe(1);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("marks a stage-level completion with a concrete level id", async () => {
    await markLevelCompleted(
      childId,
      languageCode,
      "language",
      "first-words",
      "first-words-picture-match",
      {
        score: 100,
        attempts: 2,
        completed_at: "2026-07-09T00:00:00.000Z",
        progress_payload: {
          source: "learning_hub",
          lessonId: "first-words-picture-match",
        },
      },
    );

    const local = await getStageProgress(
      childId,
      languageCode,
      "language",
      "first-words",
      "first-words-picture-match",
    );

    expect(local).toEqual(
      expect.objectContaining({
        child_id: childId,
        language_code: languageCode,
        activity_type: "language",
        stage_id: "first-words",
        level_id: "first-words-picture-match",
        status: "completed",
        score: 100,
        attempts: 2,
        completed_at: "2026-07-09T00:00:00.000Z",
        dirty: true,
      }),
    );
    expect(local?.progress_payload).toEqual(
      expect.objectContaining({
        source: "learning_hub",
        lessonId: "first-words-picture-match",
      }),
    );
    expect(await getPendingProgressSyncCount(childId)).toBe(1);
    expect(supabase.from).not.toHaveBeenCalled();

    await syncProgressNow(childId);
  });

  it("does not lose dirty local progress when there is no Supabase session", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });

    await updateActivityProgress(
      childId,
      languageCode,
      activityType,
      { score: 10, progress_payload: { local: true } },
      { scheduleSync: false },
    );

    const result = await syncProgressNow(childId);
    const local = await getActivityProgress(childId, languageCode, activityType);

    expect(result).toEqual({ pushed: 0, skipped: 1, failed: 0 });
    expect(local?.dirty).toBe(true);
    expect(local?.progress_payload).toEqual({ local: true });
    expect(await getPendingProgressSyncCount(childId)).toBe(1);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("pushes dirty activity progress and clears the local dirty flag", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "parent-1" } } },
    });

    const upsert = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [
          {
            child_id: childId,
            language_code: languageCode,
            activity_type: activityType,
            id: "remote-progress-1",
            server_updated_at: "2026-06-29T00:00:00.000Z",
          },
        ],
        error: null,
      }),
    });

    (supabase.from as jest.Mock)
      .mockReturnValueOnce(createQuery({ data: [], error: null }))
      .mockReturnValueOnce({ upsert });

    await updateActivityProgress(
      childId,
      languageCode,
      activityType,
      { score: 42, progress_payload: { completedLevels: [1, 2] } },
      { scheduleSync: false },
    );

    const result = await syncProgressNow(childId);
    const local = await getActivityProgress(childId, languageCode, activityType);

    expect(result).toEqual({ pushed: 1, skipped: 0, failed: 0 });
    expect(upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          child_id: childId,
          language_code: languageCode,
          activity_type: activityType,
          score: 42,
          progress_payload: { completedLevels: [1, 2] },
        }),
      ],
      { onConflict: "child_id,language_code,activity_type" },
    );
    expect(upsert.mock.calls[0][0][0]).not.toHaveProperty("server_updated_at");
    expect(upsert.mock.calls[0][0][0]).not.toHaveProperty("id");
    expect(upsert.mock.calls[0][0][0]).not.toHaveProperty("created_at");
    expect(upsert.mock.calls[0][0][0]).not.toHaveProperty("updated_at");
    expect(local?.dirty).toBe(false);
    expect(local?.id).toBe("remote-progress-1");
    expect(await getPendingProgressSyncCount(childId)).toBe(0);
  });

  it("does not clear a newer dirty local update made while sync is in flight", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "parent-1" } } },
    });

    const select = jest.fn().mockImplementation(async () => {
      await updateActivityProgress(
        childId,
        languageCode,
        activityType,
        { score: 20, progress_payload: { version: 2 } },
        {
          scheduleSync: false,
          localUpdatedAt: "2026-06-29T00:00:01.000Z",
        },
      );

      return {
        data: [
          {
            child_id: childId,
            language_code: languageCode,
            activity_type: activityType,
            id: "remote-progress-1",
            server_updated_at: "2026-06-29T00:00:02.000Z",
          },
        ],
        error: null,
      };
    });
    const upsert = jest.fn().mockReturnValue({ select });

    (supabase.from as jest.Mock)
      .mockReturnValueOnce(createQuery({ data: [], error: null }))
      .mockReturnValueOnce({ upsert });

    await updateActivityProgress(
      childId,
      languageCode,
      activityType,
      { score: 10, progress_payload: { version: 1 } },
      {
        scheduleSync: false,
        localUpdatedAt: "2026-06-29T00:00:00.000Z",
      },
    );

    const result = await syncProgressNow(childId);
    const local = await getActivityProgress(childId, languageCode, activityType);

    expect(result).toEqual({ pushed: 1, skipped: 0, failed: 0 });
    expect(local?.score).toBe(20);
    expect(local?.progress_payload).toEqual({ version: 2 });
    expect(local?.dirty).toBe(true);
    expect(await getPendingProgressSyncCount(childId)).toBe(1);
  });

  it("does not hydrate over unsynced dirty local progress", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "parent-1" } } },
    });
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(
        createQuery({
          data: [
            {
              child_id: childId,
              language_code: languageCode,
              activity_type: activityType,
              status: "completed",
              score: 99,
              stars: null,
              attempts: 0,
              last_stage_id: "3",
              highest_unlocked_stage: 3,
              completed_stage_count: 3,
              progress_payload: { source: "remote" },
              local_updated_at: "2026-06-29T00:00:00.000Z",
              server_updated_at: "2026-06-29T00:00:00.000Z",
            },
          ],
          error: null,
        }),
      )
      .mockReturnValueOnce(createQuery({ data: [], error: null }));

    await updateActivityProgress(
      childId,
      languageCode,
      activityType,
      { score: 10, progress_payload: { source: "local" } },
      {
        scheduleSync: false,
        localUpdatedAt: "2026-06-28T00:00:00.000Z",
      },
    );

    await hydrateProgressFromRemote(childId, languageCode);
    const local = await getActivityProgress(childId, languageCode, activityType);

    expect(local?.dirty).toBe(true);
    expect(local?.score).toBe(10);
    expect(local?.progress_payload).toEqual({ source: "local" });
  });

  it("uses a scoped hydration cooldown for child, language, and activity", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "parent-1" } } },
    });
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(
        createQuery({
          data: [
            {
              child_id: childId,
              language_code: languageCode,
              activity_type: activityType,
              status: "in_progress",
              score: 12,
              stars: null,
              attempts: 0,
              last_stage_id: "2",
              highest_unlocked_stage: 2,
              completed_stage_count: 1,
              progress_payload: { source: "remote" },
              local_updated_at: "2026-06-29T00:00:00.000Z",
              server_updated_at: "2026-06-29T00:00:00.000Z",
            },
          ],
          error: null,
        }),
      )
      .mockReturnValueOnce(createQuery({ data: [], error: null }));

    const first = await hydrateProgressFromRemote(childId, languageCode, {
      activityType,
    });
    const shouldHydrateAgain = await shouldHydrateProgress(
      childId,
      languageCode,
      activityType,
    );
    const second = await hydrateProgressFromRemote(childId, languageCode, {
      activityType,
    });

    expect(first).toEqual({ activities: 1, stages: 0 });
    expect(shouldHydrateAgain).toBe(false);
    expect(second).toEqual({ activities: 0, stages: 0 });
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it("does not start the hydration cooldown when stage hydration fails", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "parent-1" } } },
    });
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(createQuery({ data: [], error: null }))
      .mockReturnValueOnce(createQuery({ data: null, error: new Error("stage fetch failed") }));

    const result = await hydrateProgressFromRemote(childId, languageCode, {
      activityType,
    });
    const shouldHydrateAgain = await shouldHydrateProgress(
      childId,
      languageCode,
      activityType,
    );

    expect(result).toEqual({ activities: 0, stages: 0 });
    expect(shouldHydrateAgain).toBe(true);
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });
});
