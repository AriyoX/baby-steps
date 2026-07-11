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

describe("progress queue reliability and repair", () => {
  const useSession = () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "parent-1" } } },
    });
  };

  const useSuccessfulActivitySync = (
    beforeUpsertResult?: (records: Array<Record<string, unknown>>) => Promise<void>,
  ) => {
    (supabase.from as jest.Mock).mockImplementation(() => {
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
    (supabase.from as jest.Mock).mockReturnValue(
      createQuery({ data: null, error: new Error("offline") }),
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
});
