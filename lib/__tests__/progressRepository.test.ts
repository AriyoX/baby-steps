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
  cancelScheduledProgressSync,
  clearProgressRepositoryStorage,
  getActivityProgress,
  getPendingProgressSyncCount,
  getStageProgress,
  hydrateActivityProgressOnLocalMiss,
  hydrateProgressFromRemote,
  markLevelCompleted,
  scheduleProgressSync,
  shouldHydrateProgress,
  syncProgressNow,
  updateActivityProgress,
} from "../progressRepository";

const defaultGetItemImplementation = (AsyncStorage.getItem as jest.Mock).getMockImplementation()!;
const defaultSetItemImplementation = (AsyncStorage.setItem as jest.Mock).getMockImplementation()!;

const childId = "child-1";
const languageCode = "lg";
const activityType = "learning";
const progressPrefix = "@BabySteps:Progress:v1";
const queueKey = `${progressPrefix}:syncQueue`;

const activityKey = (child: string, language: string, activity: string) =>
  `${progressPrefix}:activity:${encodeURIComponent(child)}:${encodeURIComponent(language)}:${encodeURIComponent(activity)}`;

const stageKey = (
  child: string,
  language: string,
  activity: string,
  stage: string,
  level = "",
) =>
  `${progressPrefix}:stage:${encodeURIComponent(child)}:${encodeURIComponent(language)}:${encodeURIComponent(activity)}:${encodeURIComponent(stage)}:${encodeURIComponent(level)}`;

const readQueue = async (): Promise<Array<Record<string, string>>> =>
  JSON.parse((await AsyncStorage.getItem(queueKey)) ?? "[]");

const deferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

type QueryResult = { data: unknown[] | null; error: unknown };

const createQuery = (result: QueryResult | Promise<QueryResult>) => {
  const promise = Promise.resolve(result);
  const query: {
    select: jest.Mock;
    eq: jest.Mock;
    in: jest.Mock;
    abortSignal: jest.Mock;
    then: Promise<QueryResult>["then"];
    catch: Promise<QueryResult>["catch"];
    finally: Promise<QueryResult>["finally"];
  } = {
    select: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
    abortSignal: jest.fn(),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.abortSignal.mockReturnValue(query);

  return query;
};

const createOwnedChildrenQuery = (...childIds: string[]) =>
  createQuery({
    data: childIds.map((id) => ({ id })),
    error: null,
  });

beforeEach(async () => {
  (AsyncStorage.getItem as jest.Mock).mockImplementation(defaultGetItemImplementation);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(defaultSetItemImplementation);
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await clearProgressRepositoryStorage();
});

afterEach(() => {
  jest.restoreAllMocks();
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
      .mockReturnValueOnce(createOwnedChildrenQuery(childId))
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
      .mockReturnValueOnce(createOwnedChildrenQuery(childId))
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

  it("does not overwrite a same-identity mutation saved after hydration's optimistic read", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "parent-1" } } },
    });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === "child_activity_progress"
        ? createQuery({
            data: [
              {
                child_id: childId,
                language_code: "nyn",
                activity_type: "learning",
                status: "completed",
                score: 99,
                stars: 3,
                attempts: 1,
                last_stage_id: "3",
                highest_unlocked_stage: 3,
                completed_stage_count: 3,
                progress_payload: { source: "remote" },
                local_updated_at: "2026-07-12T00:00:00.000Z",
              },
              {
                child_id: childId,
                language_code: "nyn",
                activity_type: "stories",
                status: "in_progress",
                score: 22,
                stars: null,
                attempts: 1,
                last_stage_id: "2",
                highest_unlocked_stage: 2,
                completed_stage_count: 1,
                progress_payload: { source: "unrelated-remote" },
                local_updated_at: "2026-07-12T00:00:00.000Z",
              },
            ],
            error: null,
          })
        : createQuery({ data: [], error: null }),
    );

    const targetKey = activityKey(childId, "nyn", "learning");
    const optimisticReadStarted = deferred();
    const resumeOptimisticRead = deferred();
    let shouldPauseTargetRead = true;
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === targetKey && shouldPauseTargetRead) {
        shouldPauseTargetRead = false;
        const observed = await defaultGetItemImplementation(key);
        optimisticReadStarted.resolve();
        await resumeOptimisticRead.promise;
        return observed;
      }

      return defaultGetItemImplementation(key);
    });

    const hydration = hydrateProgressFromRemote(childId, "nyn", {
      activityTypes: ["learning", "stories"],
      force: true,
    });
    await optimisticReadStarted.promise;

    await updateActivityProgress(
      childId,
      "nyn",
      "learning",
      { score: 7, progress_payload: { source: "local-mutation" } },
      {
        scheduleSync: false,
        localUpdatedAt: "2026-07-13T00:00:00.000Z",
      },
    );
    resumeOptimisticRead.resolve();

    await expect(hydration).resolves.toEqual({ activities: 1, stages: 0 });
    expect(await getActivityProgress(childId, "nyn", "learning")).toEqual(
      expect.objectContaining({
        score: 7,
        dirty: true,
        progress_payload: { source: "local-mutation" },
      }),
    );
    expect(await getActivityProgress(childId, "nyn", "stories")).toEqual(
      expect.objectContaining({
        score: 22,
        dirty: false,
        progress_payload: { source: "unrelated-remote" },
      }),
    );
  });

  it("does not overwrite a same-stage mutation saved after hydration's optimistic read", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "parent-1" } } },
    });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === "child_stage_progress"
        ? createQuery({
            data: [
              {
                child_id: childId,
                language_code: "nyn",
                activity_type: "language",
                stage_id: "animals",
                level_id: "match",
                status: "completed",
                score: 100,
                stars: 3,
                attempts: 1,
                progress_payload: { source: "remote" },
                completed_at: "2026-07-12T00:00:00.000Z",
                local_updated_at: "2026-07-12T00:00:00.000Z",
              },
            ],
            error: null,
          })
        : createQuery({ data: [], error: null }),
    );

    const targetKey = stageKey(childId, "nyn", "language", "animals", "match");
    const optimisticReadStarted = deferred();
    const resumeOptimisticRead = deferred();
    let shouldPauseTargetRead = true;
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === targetKey && shouldPauseTargetRead) {
        shouldPauseTargetRead = false;
        const observed = await defaultGetItemImplementation(key);
        optimisticReadStarted.resolve();
        await resumeOptimisticRead.promise;
        return observed;
      }

      return defaultGetItemImplementation(key);
    });

    const hydration = hydrateProgressFromRemote(childId, "nyn", {
      activityType: "language",
      force: true,
    });
    await optimisticReadStarted.promise;

    await markLevelCompleted(
      childId,
      "nyn",
      "language",
      "animals",
      "match",
      {
        score: 8,
        completed_at: "2026-07-13T00:00:00.000Z",
        progress_payload: { source: "local-mutation" },
      },
    );
    resumeOptimisticRead.resolve();

    await expect(hydration).resolves.toEqual({ activities: 0, stages: 0 });
    expect(
      await getStageProgress(
        childId,
        "nyn",
        "language",
        "animals",
        "match",
      ),
    ).toEqual(
      expect.objectContaining({
        score: 8,
        dirty: true,
        progress_payload: { source: "local-mutation" },
      }),
    );
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

  it("bounded local-miss hydration restores the exact child, language, and activity snapshot", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "parent-1" } } },
    });
    const activityQuery = createQuery({
      data: [
        {
          child_id: childId,
          language_code: "nyn",
          activity_type: "counting",
          status: "in_progress",
          score: 34,
          stars: null,
          attempts: 1,
          last_stage_id: "2",
          highest_unlocked_stage: 2,
          completed_stage_count: 1,
          progress_payload: { completedStages: [1], totalScore: 34 },
          local_updated_at: "2026-07-11T00:00:00.000Z",
        },
      ],
      error: null,
    });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === "child_activity_progress"
        ? activityQuery
        : createQuery({ data: [], error: null }),
    );

    const restored = await hydrateActivityProgressOnLocalMiss(
      childId,
      "nyn",
      "counting",
      { timeoutMs: 1000 },
    );

    expect(restored).toEqual(
      expect.objectContaining({
        child_id: childId,
        language_code: "nyn",
        activity_type: "counting",
        score: 34,
        dirty: false,
      }),
    );
    expect(activityQuery.eq).toHaveBeenCalledWith("child_id", childId);
    expect(activityQuery.eq).toHaveBeenCalledWith("language_code", "nyn");
    expect(activityQuery.eq).toHaveBeenCalledWith("activity_type", "counting");
  });

  it("bounded local-miss hydration returns null without a session or after remote failure", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: { session: null },
    });

    await expect(
      hydrateActivityProgressOnLocalMiss(childId, "nyn", "words", {
        timeoutMs: 1000,
      }),
    ).resolves.toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "parent-1" } } },
    });
    (supabase.from as jest.Mock).mockReturnValue(
      createQuery({ data: null, error: new Error("offline") }),
    );

    await expect(
      hydrateActivityProgressOnLocalMiss(childId, "nyn", "words", {
        timeoutMs: 1000,
      }),
    ).resolves.toBeNull();
  });

  it("does not start a local write when hydration is aborted after its remote read", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "parent-1" } } },
    });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === "child_activity_progress"
        ? createQuery({
            data: [
              {
                child_id: childId,
                language_code: "nyn",
                activity_type: "words",
                status: "completed",
                score: 55,
                stars: 3,
                attempts: 1,
                last_stage_id: "5",
                highest_unlocked_stage: 5,
                completed_stage_count: 5,
                progress_payload: { source: "remote" },
                local_updated_at: "2026-07-12T00:00:00.000Z",
              },
            ],
            error: null,
          })
        : createQuery({ data: [], error: null }),
    );

    const targetKey = activityKey(childId, "nyn", "words");
    const optimisticReadStarted = deferred();
    const resumeOptimisticRead = deferred();
    let shouldPauseTargetRead = true;
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === targetKey && shouldPauseTargetRead) {
        shouldPauseTargetRead = false;
        const observed = await defaultGetItemImplementation(key);
        optimisticReadStarted.resolve();
        await resumeOptimisticRead.promise;
        return observed;
      }

      return defaultGetItemImplementation(key);
    });

    const controller = new AbortController();
    const hydration = hydrateProgressFromRemote(childId, "nyn", {
      activityType: "words",
      force: true,
      signal: controller.signal,
    });
    await optimisticReadStarted.promise;

    controller.abort();
    resumeOptimisticRead.resolve();

    await expect(hydration).resolves.toEqual({ activities: 0, stages: 0 });
    expect(await getActivityProgress(childId, "nyn", "words")).toBeNull();
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
      targetKey,
      expect.any(String),
    );
  });

  it("does not start a late local write after local-miss hydration times out post-query", async () => {
    jest.useFakeTimers();
    try {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: "parent-1" } } },
      });
      (supabase.from as jest.Mock).mockImplementation((table: string) =>
        table === "child_activity_progress"
          ? createQuery({
              data: [
                {
                  child_id: childId,
                  language_code: "nyn",
                  activity_type: "words",
                  status: "completed",
                  score: 55,
                  stars: 3,
                  attempts: 1,
                  last_stage_id: "5",
                  highest_unlocked_stage: 5,
                  completed_stage_count: 5,
                  progress_payload: { source: "late-remote" },
                  local_updated_at: "2026-07-12T00:00:00.000Z",
                },
              ],
              error: null,
            })
          : createQuery({ data: [], error: null }),
      );

      const targetKey = activityKey(childId, "nyn", "words");
      const optimisticReadStarted = deferred();
      const resumeOptimisticRead = deferred();
      let targetReadCount = 0;
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === targetKey && ++targetReadCount === 2) {
          const observed = await defaultGetItemImplementation(key);
          optimisticReadStarted.resolve();
          await resumeOptimisticRead.promise;
          return observed;
        }

        return defaultGetItemImplementation(key);
      });

      const hydration = hydrateActivityProgressOnLocalMiss(
        childId,
        "nyn",
        "words",
        { timeoutMs: 50 },
      );
      await optimisticReadStarted.promise;

      jest.advanceTimersByTime(50);
      await expect(hydration).resolves.toBeNull();
      resumeOptimisticRead.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(await getActivityProgress(childId, "nyn", "words")).toBeNull();
      expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
        targetKey,
        expect.any(String),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it("aborts a stalled local-miss hydration without allowing a late remote write", async () => {
    jest.useFakeTimers();
    try {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: "parent-1" } } },
      });
      const activityResult = deferred<QueryResult>();
      const activityQueryStarted = deferred();
      const activityQueries: ReturnType<typeof createQuery>[] = [];
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === "child_activity_progress") {
          const activityQuery = createQuery(activityResult.promise);
          activityQueries.push(activityQuery);
          activityQueryStarted.resolve();
          return activityQuery;
        }

        return createQuery({ data: [], error: null });
      });

      const hydration = hydrateActivityProgressOnLocalMiss(
        childId,
        "nyn",
        "learning",
        { timeoutMs: 50 },
      );
      await activityQueryStarted.promise;

      jest.advanceTimersByTime(50);
      await expect(hydration).resolves.toBeNull();

      const signal = activityQueries[0]?.abortSignal.mock.calls[0]?.[0] as
        | AbortSignal
        | undefined;
      expect(signal?.aborted).toBe(true);

      await updateActivityProgress(
        childId,
        "nyn",
        "learning",
        { score: 0, progress_payload: { source: "post-timeout-default" } },
        { scheduleSync: false },
      );
      activityResult.resolve({
        data: [
          {
            child_id: childId,
            language_code: "nyn",
            activity_type: "learning",
            status: "completed",
            score: 99,
            stars: 3,
            attempts: 1,
            last_stage_id: "3",
            highest_unlocked_stage: 3,
            completed_stage_count: 3,
            progress_payload: { source: "late-remote" },
            local_updated_at: "2026-07-11T00:00:00.000Z",
          },
        ],
        error: null,
      });
      await Promise.resolve();
      await Promise.resolve();

      expect(await getActivityProgress(childId, "nyn", "learning")).toEqual(
        expect.objectContaining({
          score: 0,
          dirty: true,
          progress_payload: { source: "post-timeout-default" },
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it("cancels scheduled sync without discarding dirty progress", async () => {
    jest.useFakeTimers();
    try {
      await updateActivityProgress(childId, "nyn", "words", {
        score: 12,
      });

      cancelScheduledProgressSync();
      jest.advanceTimersByTime(20000);
      await Promise.resolve();

      expect(supabase.auth.getSession).not.toHaveBeenCalled();
      expect(await getActivityProgress(childId, "nyn", "words")).toEqual(
        expect.objectContaining({ score: 12, dirty: true }),
      );
      expect(await getPendingProgressSyncCount(childId)).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("releases the snapshot serializer after a local activity write rejects", async () => {
    const targetKey = activityKey(childId, "nyn", "words");
    let rejectTargetWrite = true;
    (AsyncStorage.setItem as jest.Mock).mockImplementation(
      (key: string, value: string) => {
        if (key === targetKey && rejectTargetWrite) {
          rejectTargetWrite = false;
          return Promise.reject(new Error("snapshot write failed"));
        }

        return defaultSetItemImplementation(key, value);
      },
    );

    await expect(
      updateActivityProgress(
        childId,
        "nyn",
        "words",
        { score: 1 },
        { scheduleSync: false },
      ),
    ).rejects.toThrow("snapshot write failed");

    await expect(
      updateActivityProgress(
        childId,
        "nyn",
        "words",
        { score: 2 },
        { scheduleSync: false },
      ),
    ).resolves.toEqual(expect.objectContaining({ score: 2, dirty: true }));
    expect(await getPendingProgressSyncCount(childId)).toBe(1);
  });

  it("handles a rejected scheduled sync without discarding dirty progress", async () => {
    jest.useFakeTimers();
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      await updateActivityProgress(
        childId,
        "nyn",
        "words",
        { score: 12 },
        { scheduleSync: false },
      );
      (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(
        new Error("storage unavailable"),
      );

      scheduleProgressSync(1);
      await jest.advanceTimersByTimeAsync(1);

      expect(warn).toHaveBeenCalledWith(
        "Could not synchronize progress in the background:",
        expect.objectContaining({ message: "storage unavailable" }),
      );
      expect(await getActivityProgress(childId, "nyn", "words")).toEqual(
        expect.objectContaining({ score: 12, dirty: true }),
      );
      expect(await getPendingProgressSyncCount(childId)).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("progress queue reliability and repair", () => {
  const useSession = () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "parent-1" } } },
    });
  };

  const useSuccessfulActivitySync = (
    beforeUpsertResult?: (records: Array<Record<string, unknown>>) => Promise<void>,
  ) => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "children") {
        return createOwnedChildrenQuery(
          childId,
          "child-a",
          "child-b",
          "child-c",
          "target-child",
          "other-child",
        );
      }

      const query = createQuery({ data: [], error: null }) as ReturnType<typeof createQuery> & {
        upsert: jest.Mock;
      };
      query.upsert = jest.fn((records: Array<Record<string, unknown>>) => ({
        select: jest.fn(async () => {
          await beforeUpsertResult?.(records);
          return { data: records, error: null };
        }),
      }));
      return query;
    });
  };

  const useAccountAwareActivitySync = (
    getOwnedChildIds: () => string[],
    onUpsert?: (records: Array<Record<string, unknown>>) => void,
  ) => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "children") {
        return createOwnedChildrenQuery(...getOwnedChildIds());
      }

      const query = createQuery({ data: [], error: null }) as ReturnType<typeof createQuery> & {
        upsert: jest.Mock;
      };
      query.upsert = jest.fn((records: Array<Record<string, unknown>>) => {
        onUpsert?.(records);
        return {
          select: jest.fn().mockResolvedValue({ data: records, error: null }),
        };
      });
      return query;
    });
  };

  it("serializes concurrent enqueues for different identities", async () => {
    await Promise.all([
      updateActivityProgress("child-a", "lg", "learning", { score: 1 }, { scheduleSync: false }),
      updateActivityProgress("child-b", "nyn", "stories", { score: 2 }, { scheduleSync: false }),
    ]);

    expect(await readQueue()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ child_id: "child-a", language_code: "lg", activity_type: "learning" }),
        expect.objectContaining({ child_id: "child-b", language_code: "nyn", activity_type: "stories" }),
      ]),
    );
    expect(await getPendingProgressSyncCount()).toBe(2);
  });

  it("deduplicates concurrent enqueues for the same identity", async () => {
    await Promise.all([
      updateActivityProgress(childId, languageCode, activityType, { score: 1 }, { scheduleSync: false }),
      updateActivityProgress(childId, languageCode, activityType, { score: 2 }, { scheduleSync: false }),
    ]);

    expect(await getPendingProgressSyncCount()).toBe(1);
    expect(await readQueue()).toHaveLength(1);
  });

  it("preserves an enqueue that begins while queue removal is underway", async () => {
    useSession();
    useSuccessfulActivitySync();
    await updateActivityProgress(childId, languageCode, activityType, { score: 1 }, { scheduleSync: false });

    const removalStarted = deferred();
    const allowRemovalRead = deferred();
    let queueReadCount = 0;
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      const value = await defaultGetItemImplementation(key);
      if (key === queueKey && ++queueReadCount === 2) {
        removalStarted.resolve();
        await allowRemovalRead.promise;
      }
      return value;
    });

    const sync = syncProgressNow(childId);
    await removalStarted.promise;
    const enqueue = updateActivityProgress(
      "child-2",
      "nyn",
      "stories",
      { score: 9 },
      { scheduleSync: false },
    );
    allowRemovalRead.resolve();
    await Promise.all([sync, enqueue]);

    expect(await readQueue()).toEqual([
      expect.objectContaining({ child_id: "child-2", language_code: "nyn", activity_type: "stories" }),
    ]);
  });

  it("keeps a newer mutation dirty and queued when sync is in flight", async () => {
    useSession();
    const upsertStarted = deferred();
    const finishUpsert = deferred();
    useSuccessfulActivitySync(async () => {
      upsertStarted.resolve();
      await finishUpsert.promise;
    });
    await updateActivityProgress(
      childId,
      languageCode,
      activityType,
      { score: 1 },
      { scheduleSync: false, localUpdatedAt: "2026-07-01T00:00:00.000Z" },
    );

    const sync = syncProgressNow(childId);
    await upsertStarted.promise;
    await updateActivityProgress(
      childId,
      languageCode,
      activityType,
      { score: 2 },
      { scheduleSync: false, localUpdatedAt: "2026-07-01T00:00:01.000Z" },
    );
    finishUpsert.resolve();
    await sync;

    expect(await getActivityProgress(childId, languageCode, activityType)).toEqual(
      expect.objectContaining({ score: 2, dirty: true }),
    );
    expect(await readQueue()).toEqual([
      expect.objectContaining({ child_id: childId, language_code: languageCode }),
    ]);
  });

  it("does not lose newly queued work across overlapping sync calls", async () => {
    useSession();
    const bothUpsertsStarted = deferred();
    const finishUpserts = deferred();
    let upsertCount = 0;
    useSuccessfulActivitySync(async () => {
      upsertCount += 1;
      if (upsertCount === 2) bothUpsertsStarted.resolve();
      await finishUpserts.promise;
    });
    await updateActivityProgress("child-a", "lg", activityType, { score: 1 }, { scheduleSync: false });
    await updateActivityProgress("child-b", "nyn", activityType, { score: 2 }, { scheduleSync: false });

    const firstSync = syncProgressNow("child-a");
    const secondSync = syncProgressNow("child-b");
    await bothUpsertsStarted.promise;
    await updateActivityProgress("child-c", "nyn", "stories", { score: 3 }, { scheduleSync: false });
    finishUpserts.resolve();
    await Promise.all([firstSync, secondSync]);

    expect(await readQueue()).toEqual([
      expect.objectContaining({ child_id: "child-c", language_code: "nyn", activity_type: "stories" }),
    ]);
  });

  it("rediscovers a dirty activity snapshot missing from the queue", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    await updateActivityProgress(childId, languageCode, activityType, { score: 4 }, { scheduleSync: false });
    await AsyncStorage.setItem(queueKey, "[]");

    expect(await syncProgressNow(childId)).toEqual({ pushed: 0, skipped: 1, failed: 0 });
    expect(await readQueue()).toEqual([
      expect.objectContaining({ kind: "activity", child_id: childId, language_code: languageCode }),
    ]);
  });

  it("rediscovers a dirty stage snapshot missing from the queue", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    await markLevelCompleted(childId, "nyn", "language", "greetings", "match-1");
    await AsyncStorage.setItem(queueKey, "[]");

    expect(await syncProgressNow(childId)).toEqual({ pushed: 0, skipped: 1, failed: 0 });
    expect(await readQueue()).toEqual([
      expect.objectContaining({
        kind: "stage",
        child_id: childId,
        language_code: "nyn",
        stage_id: "greetings",
        level_id: "match-1",
      }),
    ]);
  });

  it("repairs multiple missing dirty activity and stage snapshots", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    await updateActivityProgress("child-a", "lg", "learning", { score: 1 }, { scheduleSync: false });
    await updateActivityProgress("child-b", "nyn", "stories", { score: 2 }, { scheduleSync: false });
    await markLevelCompleted("child-a", "nyn", "language", "numbers", "level-1");
    await AsyncStorage.setItem(queueKey, "[]");

    expect(await syncProgressNow()).toEqual({ pushed: 0, skipped: 3, failed: 0 });
    expect(await getPendingProgressSyncCount()).toBe(3);
  });

  it("removes queue entries whose snapshots are absent or clean", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    await updateActivityProgress(childId, languageCode, activityType, { score: 5 }, { scheduleSync: false });
    const clean = await getActivityProgress(childId, languageCode, activityType);
    await AsyncStorage.setItem(activityKey(childId, languageCode, activityType), JSON.stringify({ ...clean, dirty: false }));
    await AsyncStorage.setItem(
      queueKey,
      JSON.stringify([
        { kind: "activity", child_id: childId, language_code: languageCode, activity_type: activityType },
        { kind: "activity", child_id: "missing", language_code: "nyn", activity_type: "stories" },
      ]),
    );

    expect(await syncProgressNow()).toEqual({ pushed: 0, skipped: 0, failed: 0 });
    expect(await readQueue()).toEqual([]);
  });

  it("ignores malformed snapshots and unrelated AsyncStorage keys without deleting valid work", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    await updateActivityProgress("valid-child", "nyn", "learning", { score: 7 }, { scheduleSync: false });
    await AsyncStorage.setItem(queueKey, "[]");
    const malformedKey = activityKey("malformed-child", "lg", "stories");
    await AsyncStorage.setItem(malformedKey, "{not-json");
    await AsyncStorage.setItem(
      queueKey,
      JSON.stringify([
        { kind: "activity", child_id: "malformed-child", language_code: "lg", activity_type: "stories" },
      ]),
    );
    await AsyncStorage.setItem("@Unrelated:Progress:v1:activity:anything", "keep-me");

    expect(await syncProgressNow()).toEqual({ pushed: 0, skipped: 2, failed: 0 });
    expect(await readQueue()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ child_id: "malformed-child", language_code: "lg" }),
        expect.objectContaining({ child_id: "valid-child", language_code: "nyn" }),
      ]),
    );
    expect(await AsyncStorage.getItem(malformedKey)).toBe("{not-json");
    expect(await AsyncStorage.getItem("@Unrelated:Progress:v1:activity:anything")).toBe("keep-me");
  });

  it("continues processing transactions after a queue write rejects", async () => {
    let rejectQueueWrite = true;
    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      if (key === queueKey && rejectQueueWrite) {
        rejectQueueWrite = false;
        return Promise.reject(new Error("queue write failed"));
      }
      return defaultSetItemImplementation(key, value);
    });

    await expect(
      updateActivityProgress("child-a", "lg", "learning", { score: 1 }, { scheduleSync: false }),
    ).rejects.toThrow("queue write failed");
    await updateActivityProgress("child-b", "nyn", "stories", { score: 2 }, { scheduleSync: false });

    expect(await readQueue()).toEqual([
      expect.objectContaining({ child_id: "child-b", language_code: "nyn" }),
    ]);
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    expect(await syncProgressNow()).toEqual({ pushed: 0, skipped: 2, failed: 0 });
    expect(await getPendingProgressSyncCount()).toBe(2);
  });

  it("keeps child and language identities distinct without interpreting nyn as lg", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    await Promise.all([
      updateActivityProgress("child-a", "lg", activityType, { score: 1 }, { scheduleSync: false }),
      updateActivityProgress("child-a", "nyn", activityType, { score: 2 }, { scheduleSync: false }),
      updateActivityProgress("child-b", "lg", activityType, { score: 3 }, { scheduleSync: false }),
      updateActivityProgress("child-b", "nyn", activityType, { score: 4 }, { scheduleSync: false }),
    ]);
    await AsyncStorage.setItem(queueKey, "[]");

    await syncProgressNow();

    expect(await getPendingProgressSyncCount()).toBe(4);
    expect(await getActivityProgress("child-a", "lg", activityType)).toEqual(
      expect.objectContaining({ language_code: "lg", score: 1, dirty: true }),
    );
    expect(await getActivityProgress("child-a", "nyn", activityType)).toEqual(
      expect.objectContaining({ language_code: "nyn", score: 2, dirty: true }),
    );
    expect(await readQueue()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ child_id: "child-a", language_code: "lg" }),
        expect.objectContaining({ child_id: "child-a", language_code: "nyn" }),
        expect.objectContaining({ child_id: "child-b", language_code: "lg" }),
        expect.objectContaining({ child_id: "child-b", language_code: "nyn" }),
      ]),
    );
  });

  it("repairs a raw Runyankole stage snapshot without creating a Luganda record", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    const nynStage = {
      child_id: childId,
      language_code: "nyn",
      activity_type: "language",
      stage_id: "animals",
      level_id: "match",
      status: "completed",
      score: 100,
      stars: 3,
      attempts: 1,
      progress_payload: { language: "nyn" },
      local_updated_at: "2026-07-01T00:00:00.000Z",
      dirty: true,
    };
    await AsyncStorage.setItem(stageKey(childId, "nyn", "language", "animals", "match"), JSON.stringify(nynStage));

    await syncProgressNow(childId);

    expect(await getStageProgress(childId, "nyn", "language", "animals", "match")).toEqual(nynStage);
    expect(await getStageProgress(childId, "lg", "language", "animals", "match")).toBeNull();
    expect(await readQueue()).toEqual([
      expect.objectContaining({ language_code: "nyn", stage_id: "animals", level_id: "match" }),
    ]);
  });

  it("retains repaired dirty entries after a network failure", async () => {
    useSession();
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === "children"
        ? createOwnedChildrenQuery(childId)
        : createQuery({ data: null, error: new Error("offline") }),
    );
    await updateActivityProgress(childId, "nyn", activityType, { score: 8 }, { scheduleSync: false });
    await AsyncStorage.setItem(queueKey, "[]");

    expect(await syncProgressNow(childId)).toEqual({ pushed: 0, skipped: 0, failed: 1 });
    expect(await getActivityProgress(childId, "nyn", activityType)).toEqual(
      expect.objectContaining({ dirty: true, score: 8 }),
    );
    expect(await getPendingProgressSyncCount(childId)).toBe(1);
  });

  it("clears only safely synchronized work after successful sync", async () => {
    useSession();
    useSuccessfulActivitySync();
    await updateActivityProgress("target-child", "lg", activityType, { score: 1 }, { scheduleSync: false });
    await updateActivityProgress("other-child", "nyn", activityType, { score: 2 }, { scheduleSync: false });

    expect(await syncProgressNow("target-child")).toEqual({ pushed: 1, skipped: 0, failed: 0 });

    expect(await getActivityProgress("target-child", "lg", activityType)).toEqual(
      expect.objectContaining({ dirty: false }),
    );
    expect(await getActivityProgress("other-child", "nyn", activityType)).toEqual(
      expect.objectContaining({ dirty: true }),
    );
    expect(await readQueue()).toEqual([
      expect.objectContaining({ child_id: "other-child", language_code: "nyn" }),
    ]);
  });

  it("does not upsert an old-account row after a timed-out flush is aborted and the session changes", async () => {
    jest.useFakeTimers();
    try {
      let parentId = "parent-a";
      (supabase.auth.getSession as jest.Mock).mockImplementation(async () => ({
        data: { session: { user: { id: parentId } } },
      }));

      const ownedChildrenQuery = createOwnedChildrenQuery("child-a");
      const remoteReadStarted = deferred();
      const finishRemoteRead = deferred<QueryResult>();
      const remoteActivityQuery = createQuery(finishRemoteRead.promise);
      const activityUpsert = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      });
      let activityTableReadCount = 0;

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === "children") return ownedChildrenQuery;
        if (table === "child_activity_progress") {
          activityTableReadCount += 1;
          if (activityTableReadCount === 1) {
            remoteReadStarted.resolve();
            return remoteActivityQuery;
          }
          return { upsert: activityUpsert };
        }
        return createQuery({ data: [], error: null });
      });

      await updateActivityProgress(
        "child-a",
        "lg",
        "learning",
        { score: 17 },
        { scheduleSync: false },
      );

      const flushController = new AbortController();
      const flushTimeout = setTimeout(() => flushController.abort(), 750);
      const synchronization = syncProgressNow("child-a", {
        signal: flushController.signal,
      });

      await remoteReadStarted.promise;
      expect(ownedChildrenQuery.abortSignal).toHaveBeenCalledWith(
        flushController.signal,
      );
      expect(remoteActivityQuery.abortSignal).toHaveBeenCalledWith(
        flushController.signal,
      );
      expect(flushController.signal.aborted).toBe(false);

      parentId = "parent-b";
      jest.advanceTimersByTime(750);
      expect(flushController.signal.aborted).toBe(true);
      finishRemoteRead.resolve({ data: [], error: null });

      await expect(synchronization).resolves.toEqual({
        pushed: 0,
        skipped: 0,
        failed: 1,
      });
      clearTimeout(flushTimeout);

      expect(activityUpsert).not.toHaveBeenCalled();
      expect(await getActivityProgress("child-a", "lg", "learning")).toEqual(
        expect.objectContaining({ score: 17, dirty: true }),
      );
      expect(await readQueue()).toEqual([
        expect.objectContaining({
          child_id: "child-a",
          language_code: "lg",
          activity_type: "learning",
        }),
      ]);
    } finally {
      jest.useRealTimers();
    }
  });

  it("does not attempt to upload another account's child rows", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "parent-b" } } },
    });
    const uploaded: Array<Record<string, unknown>> = [];
    useAccountAwareActivitySync(
      () => ["child-b"],
      (records) => uploaded.push(...records),
    );
    await updateActivityProgress(
      "child-a",
      "lg",
      "learning",
      { score: 10 },
      { scheduleSync: false },
    );
    await updateActivityProgress(
      "child-b",
      "nyn",
      "learning",
      { score: 20 },
      { scheduleSync: false },
    );

    const result = await syncProgressNow();

    expect(result).toEqual({ pushed: 1, skipped: 1, failed: 0 });
    expect(uploaded).toEqual([
      expect.objectContaining({ child_id: "child-b", score: 20 }),
    ]);
    expect(uploaded).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ child_id: "child-a" })]),
    );
    expect(await getActivityProgress("child-a", "lg", "learning")).toEqual(
      expect.objectContaining({ dirty: true }),
    );
  });

  it("lets valid current-account rows sync from a mixed-account queue", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "parent-b" } } },
    });
    useAccountAwareActivitySync(() => ["child-b"], (records) => {
      if (records.some((record) => record.child_id === "child-a")) {
        throw new Error("another account poisoned the batch");
      }
    });
    await updateActivityProgress(
      "child-a",
      "lg",
      "words",
      { score: 1 },
      { scheduleSync: false },
    );
    await updateActivityProgress(
      "child-b",
      "nyn",
      "words",
      { score: 2 },
      { scheduleSync: false },
    );

    await expect(syncProgressNow()).resolves.toEqual({
      pushed: 1,
      skipped: 1,
      failed: 0,
    });
    expect(await getActivityProgress("child-b", "nyn", "words")).toEqual(
      expect.objectContaining({ dirty: false }),
    );
    expect(await getPendingProgressSyncCount()).toBe(1);
  });

  it("retains old-account dirty rows so they can sync when that account returns", async () => {
    let ownedChildIds = ["child-b"];
    (supabase.auth.getSession as jest.Mock).mockImplementation(async () => ({
      data: {
        session: {
          user: { id: ownedChildIds[0] === "child-a" ? "parent-a" : "parent-b" },
        },
      },
    }));
    const uploadedChildIds: string[] = [];
    useAccountAwareActivitySync(
      () => ownedChildIds,
      (records) =>
        uploadedChildIds.push(...records.map((record) => String(record.child_id))),
    );
    await updateActivityProgress(
      "child-a",
      "lg",
      "stories",
      { score: 5 },
      { scheduleSync: false },
    );
    await updateActivityProgress(
      "child-b",
      "nyn",
      "stories",
      { score: 6 },
      { scheduleSync: false },
    );

    await syncProgressNow();
    expect(await getPendingProgressSyncCount()).toBe(1);

    ownedChildIds = ["child-a"];
    await expect(syncProgressNow()).resolves.toEqual({
      pushed: 1,
      skipped: 0,
      failed: 0,
    });

    expect(uploadedChildIds).toEqual(["child-b", "child-a"]);
    expect(await getPendingProgressSyncCount()).toBe(0);
  });
});
