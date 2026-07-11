import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

export type ProgressStatus = "not_started" | "in_progress" | "completed";

export interface ChildActivityProgress {
  id?: string;
  child_id: string;
  language_code: string;
  activity_type: string;
  status: ProgressStatus;
  score: number | null;
  stars: number | null;
  attempts: number;
  last_stage_id: string | null;
  highest_unlocked_stage: number | null;
  completed_stage_count: number;
  progress_payload: Record<string, unknown>;
  local_updated_at: string;
  server_updated_at?: string | null;
  created_at?: string;
  updated_at?: string;
  dirty?: boolean;
}

export interface ChildStageProgress {
  id?: string;
  child_id: string;
  language_code: string;
  activity_type: string;
  stage_id: string;
  level_id: string;
  status: ProgressStatus;
  score: number | null;
  stars: number | null;
  attempts: number;
  progress_payload: Record<string, unknown>;
  completed_at?: string | null;
  local_updated_at: string;
  server_updated_at?: string | null;
  created_at?: string;
  updated_at?: string;
  dirty?: boolean;
}

export type ActivityProgressInput = Partial<
  Pick<
    ChildActivityProgress,
    | "status"
    | "score"
    | "stars"
    | "attempts"
    | "last_stage_id"
    | "highest_unlocked_stage"
    | "completed_stage_count"
    | "progress_payload"
  >
>;

export type StageProgressInput = Partial<
  Pick<
    ChildStageProgress,
    "status" | "score" | "stars" | "attempts" | "progress_payload" | "completed_at"
  >
>;

interface ProgressQueueItem {
  kind: "activity" | "stage";
  child_id: string;
  language_code: string;
  activity_type: string;
  stage_id?: string;
  level_id?: string;
}

export interface ProgressSyncResult {
  pushed: number;
  skipped: number;
  failed: number;
}

export interface HydrateProgressOptions {
  activityType?: string;
  activityTypes?: string[];
  force?: boolean;
  cooldownMs?: number;
}

const PROGRESS_STORAGE_PREFIX = "@BabySteps:Progress:v1";
const PROGRESS_HYDRATION_PREFIX = "progress:lastHydratedAt";
const PROGRESS_SYNC_QUEUE_KEY = `${PROGRESS_STORAGE_PREFIX}:syncQueue`;
const ACTIVITY_PROGRESS_STORAGE_PREFIX = `${PROGRESS_STORAGE_PREFIX}:activity:`;
const STAGE_PROGRESS_STORAGE_PREFIX = `${PROGRESS_STORAGE_PREFIX}:stage:`;
const DEFAULT_SYNC_DEBOUNCE_MS = 15000;
export const PROGRESS_HYDRATION_COOLDOWN_MS = 20 * 60 * 1000;

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let queueOperationTail: Promise<void> = Promise.resolve();

const encodeKeyPart = (value: string): string => encodeURIComponent(value);

const nowIso = (): string => new Date().toISOString();

const asPayload = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
};

const safeParse = <T>(value: string | null): T | null => {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const activityStorageKey = (
  childId: string,
  languageCode: string,
  activityType: string,
): string =>
  `${PROGRESS_STORAGE_PREFIX}:activity:${encodeKeyPart(childId)}:${encodeKeyPart(languageCode)}:${encodeKeyPart(activityType)}`;

const stageStorageKey = (
  childId: string,
  languageCode: string,
  activityType: string,
  stageId: string,
  levelId = "",
): string =>
  `${PROGRESS_STORAGE_PREFIX}:stage:${encodeKeyPart(childId)}:${encodeKeyPart(languageCode)}:${encodeKeyPart(activityType)}:${encodeKeyPart(stageId)}:${encodeKeyPart(levelId)}`;

const hydrationStorageKey = (
  childId: string,
  languageCode: string,
  activityType: string,
): string =>
  `${PROGRESS_HYDRATION_PREFIX}:${encodeKeyPart(childId)}:${encodeKeyPart(languageCode)}:${encodeKeyPart(activityType)}`;

const activityIdentity = (record: {
  child_id: string;
  language_code: string;
  activity_type: string;
}): string => `${record.child_id}:${record.language_code}:${record.activity_type}`;

const stageIdentity = (record: {
  child_id: string;
  language_code: string;
  activity_type: string;
  stage_id: string;
  level_id?: string | null;
}): string =>
  `${record.child_id}:${record.language_code}:${record.activity_type}:${record.stage_id}:${record.level_id ?? ""}`;

const decodeStorageKeyParts = (
  key: string,
  prefix: string,
  expectedPartCount: number,
): string[] | null => {
  if (!key.startsWith(prefix)) return null;

  const encodedParts = key.slice(prefix.length).split(":");
  if (encodedParts.length !== expectedPartCount) return null;

  try {
    return encodedParts.map((part) => decodeURIComponent(part));
  } catch {
    return null;
  }
};

const hasValidSnapshotBase = (
  value: unknown,
): value is Record<string, unknown> & {
  child_id: string;
  language_code: string;
  activity_type: string;
  local_updated_at: string;
  dirty?: boolean;
} => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.child_id === "string" &&
    typeof record.language_code === "string" &&
    typeof record.activity_type === "string" &&
    typeof record.local_updated_at === "string" &&
    (record.status === "not_started" ||
      record.status === "in_progress" ||
      record.status === "completed") &&
    (record.score === null || typeof record.score === "number") &&
    (record.stars === null || typeof record.stars === "number") &&
    typeof record.attempts === "number" &&
    Boolean(record.progress_payload) &&
    typeof record.progress_payload === "object" &&
    !Array.isArray(record.progress_payload) &&
    (record.dirty === undefined || typeof record.dirty === "boolean")
  );
};

const parseActivitySnapshot = (
  key: string,
  value: string | null,
): ChildActivityProgress | null => {
  const keyParts = decodeStorageKeyParts(key, ACTIVITY_PROGRESS_STORAGE_PREFIX, 3);
  const parsed = safeParse<unknown>(value);
  if (!keyParts || !hasValidSnapshotBase(parsed)) return null;

  const [childId, languageCode, activityType] = keyParts;
  if (
    parsed.child_id !== childId ||
    parsed.language_code !== languageCode ||
    parsed.activity_type !== activityType ||
    (parsed.last_stage_id !== null && typeof parsed.last_stage_id !== "string") ||
    (parsed.highest_unlocked_stage !== null &&
      typeof parsed.highest_unlocked_stage !== "number") ||
    typeof parsed.completed_stage_count !== "number"
  ) {
    return null;
  }

  return parsed as unknown as ChildActivityProgress;
};

const parseStageSnapshot = (
  key: string,
  value: string | null,
): ChildStageProgress | null => {
  const keyParts = decodeStorageKeyParts(key, STAGE_PROGRESS_STORAGE_PREFIX, 5);
  const parsed = safeParse<unknown>(value);
  if (!keyParts || !hasValidSnapshotBase(parsed)) return null;

  const [childId, languageCode, activityType, stageId, levelId] = keyParts;
  if (
    parsed.child_id !== childId ||
    parsed.language_code !== languageCode ||
    parsed.activity_type !== activityType ||
    typeof parsed.stage_id !== "string" ||
    parsed.stage_id !== stageId ||
    (typeof parsed.level_id !== "string" && parsed.level_id !== undefined) ||
    (parsed.level_id ?? "") !== levelId
  ) {
    return null;
  }

  return parsed as unknown as ChildStageProgress;
};

const queueIdentity = (item: ProgressQueueItem): string =>
  item.kind === "activity"
    ? `activity:${activityIdentity(item)}`
    : `stage:${stageIdentity({
        ...item,
        stage_id: item.stage_id ?? "",
        level_id: item.level_id ?? "",
      })}`;

const runSerializedQueueOperation = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = queueOperationTail.then(operation);
  queueOperationTail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

const loadQueue = async (): Promise<ProgressQueueItem[]> => {
  const parsed = safeParse<ProgressQueueItem[]>(
    await AsyncStorage.getItem(PROGRESS_SYNC_QUEUE_KEY),
  );

  return Array.isArray(parsed) ? parsed : [];
};

const saveQueue = async (queue: ProgressQueueItem[]): Promise<void> => {
  const unique = new Map<string, ProgressQueueItem>();
  queue.forEach((item) => unique.set(queueIdentity(item), item));
  await AsyncStorage.setItem(
    PROGRESS_SYNC_QUEUE_KEY,
    JSON.stringify([...unique.values()]),
  );
};

const mutateQueue = async (
  mutation: (queue: ProgressQueueItem[]) => Promise<ProgressQueueItem[]> | ProgressQueueItem[],
): Promise<void> =>
  runSerializedQueueOperation(async () => {
    const queue = await loadQueue();
    await saveQueue(await mutation(queue));
  });

type QueueItemSnapshotState = "absent" | "malformed" | "clean" | "dirty";

const queueItemStorageKey = (item: ProgressQueueItem): string =>
  item.kind === "activity"
    ? activityStorageKey(item.child_id, item.language_code, item.activity_type)
    : stageStorageKey(
        item.child_id,
        item.language_code,
        item.activity_type,
        item.stage_id ?? "",
        item.level_id ?? "",
      );

const getQueueItemSnapshotState = async (
  item: ProgressQueueItem,
): Promise<QueueItemSnapshotState> => {
  const key = queueItemStorageKey(item);
  const value = await AsyncStorage.getItem(key);
  if (value === null) return "absent";

  const snapshot = item.kind === "activity"
    ? parseActivitySnapshot(key, value)
    : parseStageSnapshot(key, value);
  if (!snapshot) return "malformed";

  return snapshot.dirty ? "dirty" : "clean";
};

const repairProgressQueue = async (): Promise<ProgressQueueItem[]> =>
  runSerializedQueueOperation(async () => {
    const queue = await loadQueue();
    const keys = await AsyncStorage.getAllKeys();
    const snapshotKeys = keys.filter(
      (key) =>
        decodeStorageKeyParts(key, ACTIVITY_PROGRESS_STORAGE_PREFIX, 3) !== null ||
        decodeStorageKeyParts(key, STAGE_PROGRESS_STORAGE_PREFIX, 5) !== null,
    );
    const storedSnapshots = await AsyncStorage.multiGet(snapshotKeys);
    const existingSnapshotKeys = new Set(snapshotKeys);
    const validSnapshots = new Map<
      string,
      { item: ProgressQueueItem; dirty: boolean }
    >();

    for (const [key, value] of storedSnapshots) {
      const activity = parseActivitySnapshot(key, value);
      if (activity) {
        const item: ProgressQueueItem = {
          kind: "activity",
          child_id: activity.child_id,
          language_code: activity.language_code,
          activity_type: activity.activity_type,
        };
        validSnapshots.set(queueIdentity(item), { item, dirty: Boolean(activity.dirty) });
        continue;
      }

      const stage = parseStageSnapshot(key, value);
      if (stage) {
        const item: ProgressQueueItem = {
          kind: "stage",
          child_id: stage.child_id,
          language_code: stage.language_code,
          activity_type: stage.activity_type,
          stage_id: stage.stage_id,
          level_id: stage.level_id ?? "",
        };
        validSnapshots.set(queueIdentity(item), { item, dirty: Boolean(stage.dirty) });
      }
    }

    const repaired = new Map<string, ProgressQueueItem>();
    for (const item of queue) {
      const identity = queueIdentity(item);
      const snapshot = validSnapshots.get(identity);
      const snapshotExists = existingSnapshotKeys.has(queueItemStorageKey(item));

      if (!snapshotExists || (snapshot && !snapshot.dirty)) continue;
      repaired.set(identity, item);
    }

    for (const [identity, snapshot] of validSnapshots) {
      if (snapshot.dirty) repaired.set(identity, snapshot.item);
    }

    const repairedQueue = [...repaired.values()];
    await saveQueue(repairedQueue);
    return repairedQueue;
  });

const enqueueDirty = async (item: ProgressQueueItem): Promise<void> => {
  await mutateQueue((queue) => [...queue, item]);
};

const removeQueueItems = async (itemsToRemove: ProgressQueueItem[]): Promise<void> => {
  if (itemsToRemove.length === 0) return;

  await mutateQueue(async (queue) => {
    const unique = new Map(queue.map((item) => [queueIdentity(item), item]));

    for (const item of itemsToRemove) {
      const state = await getQueueItemSnapshotState(item);
      const identity = queueIdentity(item);

      if (state === "clean") {
        unique.delete(identity);
      } else if (state === "dirty") {
        unique.set(identity, item);
      }
    }

    return [...unique.values()];
  });
};

const getLastHydratedAt = async (
  childId: string,
  languageCode: string,
  activityType: string,
): Promise<number | null> => {
  const value = await AsyncStorage.getItem(
    hydrationStorageKey(childId, languageCode, activityType),
  );
  if (!value) return null;

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const setLastHydratedAt = async (
  childId: string,
  languageCode: string,
  activityType: string,
  timestamp = nowIso(),
): Promise<void> => {
  await AsyncStorage.setItem(
    hydrationStorageKey(childId, languageCode, activityType),
    timestamp,
  );
};

export const shouldHydrateProgress = async (
  childId: string,
  languageCode: string,
  activityType: string,
  options: Pick<HydrateProgressOptions, "force" | "cooldownMs"> = {},
): Promise<boolean> => {
  if (options.force) return true;

  const cooldownMs = options.cooldownMs ?? PROGRESS_HYDRATION_COOLDOWN_MS;
  const lastHydratedAt = await getLastHydratedAt(
    childId,
    languageCode,
    activityType,
  );

  return !lastHydratedAt || Date.now() - lastHydratedAt >= cooldownMs;
};

const getRequestedActivityTypes = (
  options: HydrateProgressOptions,
): string[] | undefined => {
  const activityTypes = [
    ...(options.activityType ? [options.activityType] : []),
    ...(options.activityTypes ?? []),
  ].filter((value, index, values) => value && values.indexOf(value) === index);

  return activityTypes.length > 0 ? activityTypes : undefined;
};

const getHydrationActivityTypesToFetch = async (
  childId: string,
  languageCode: string | undefined,
  options: HydrateProgressOptions,
): Promise<string[] | undefined> => {
  const requestedActivityTypes = getRequestedActivityTypes(options);

  if (!languageCode || !requestedActivityTypes) {
    return requestedActivityTypes;
  }

  const checks = await Promise.all(
    requestedActivityTypes.map(async (activityType) => ({
      activityType,
      shouldHydrate: await shouldHydrateProgress(
        childId,
        languageCode,
        activityType,
        options,
      ),
    })),
  );

  return checks
    .filter((item) => item.shouldHydrate)
    .map((item) => item.activityType);
};

const markHydrationComplete = async (
  childId: string,
  languageCode: string | undefined,
  activityTypes: string[] | undefined,
): Promise<void> => {
  if (!languageCode || !activityTypes) return;

  await Promise.all(
    activityTypes.map((activityType) =>
      setLastHydratedAt(childId, languageCode, activityType),
    ),
  );
};

const isRemoteNewer = (
  remoteLocalUpdatedAt: string | null | undefined,
  localUpdatedAt: string | null | undefined,
): boolean => {
  const remoteTime = remoteLocalUpdatedAt ? Date.parse(remoteLocalUpdatedAt) : 0;
  const localTime = localUpdatedAt ? Date.parse(localUpdatedAt) : 0;
  return Number.isFinite(remoteTime) && Number.isFinite(localTime) && remoteTime > localTime;
};

const hasSupabaseSession = async (): Promise<boolean> => {
  const authClient = (supabase as unknown as { auth?: { getSession?: () => Promise<unknown> } }).auth;
  if (!authClient?.getSession) return false;

  try {
    const result = (await authClient.getSession()) as {
      data?: { session?: unknown | null };
    };
    return Boolean(result.data?.session);
  } catch {
    return false;
  }
};

const sanitizeActivityForRemote = (
  record: ChildActivityProgress,
): Omit<ChildActivityProgress, "dirty" | "id" | "created_at" | "updated_at" | "server_updated_at"> => {
  const {
    dirty: _dirty,
    id: _id,
    created_at: _createdAt,
    updated_at: _updatedAt,
    server_updated_at: _serverUpdatedAt,
    ...remote
  } = record;
  return remote;
};

const sanitizeStageForRemote = (
  record: ChildStageProgress,
): Omit<ChildStageProgress, "dirty" | "id" | "created_at" | "updated_at" | "server_updated_at"> => {
  const {
    dirty: _dirty,
    id: _id,
    created_at: _createdAt,
    updated_at: _updatedAt,
    server_updated_at: _serverUpdatedAt,
    ...remote
  } = record;
  return remote;
};

const writeLocalActivityProgress = async (
  record: ChildActivityProgress,
): Promise<ChildActivityProgress> => {
  const cleanRecord: ChildActivityProgress = {
    ...record,
    progress_payload: asPayload(record.progress_payload),
  };

  await AsyncStorage.setItem(
    activityStorageKey(record.child_id, record.language_code, record.activity_type),
    JSON.stringify(cleanRecord),
  );

  return cleanRecord;
};

const writeLocalStageProgress = async (
  record: ChildStageProgress,
): Promise<ChildStageProgress> => {
  const cleanRecord: ChildStageProgress = {
    ...record,
    level_id: record.level_id ?? "",
    progress_payload: asPayload(record.progress_payload),
  };

  await AsyncStorage.setItem(
    stageStorageKey(
      record.child_id,
      record.language_code,
      record.activity_type,
      record.stage_id,
      record.level_id,
    ),
    JSON.stringify(cleanRecord),
  );

  return cleanRecord;
};

export const scheduleProgressSync = (delayMs = DEFAULT_SYNC_DEBOUNCE_MS): void => {
  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  syncTimer = setTimeout(() => {
    syncTimer = null;
    void syncProgressNow();
  }, delayMs);
};

export const getActivityProgress = async (
  childId: string,
  languageCode: string,
  activityType: string,
): Promise<ChildActivityProgress | null> => {
  const parsed = safeParse<ChildActivityProgress>(
    await AsyncStorage.getItem(activityStorageKey(childId, languageCode, activityType)),
  );

  if (
    !parsed ||
    parsed.child_id !== childId ||
    parsed.language_code !== languageCode ||
    parsed.activity_type !== activityType
  ) {
    return null;
  }

  return {
    ...parsed,
    progress_payload: asPayload(parsed.progress_payload),
  };
};

export const getStageProgress = async (
  childId: string,
  languageCode: string,
  activityType: string,
  stageId: string | number,
  levelId: string | number = "",
): Promise<ChildStageProgress | null> => {
  const normalizedStageId = String(stageId);
  const normalizedLevelId = String(levelId);
  const parsed = safeParse<ChildStageProgress>(
    await AsyncStorage.getItem(
      stageStorageKey(
        childId,
        languageCode,
        activityType,
        normalizedStageId,
        normalizedLevelId,
      ),
    ),
  );

  if (
    !parsed ||
    parsed.child_id !== childId ||
    parsed.language_code !== languageCode ||
    parsed.activity_type !== activityType ||
    parsed.stage_id !== normalizedStageId ||
    (parsed.level_id ?? "") !== normalizedLevelId
  ) {
    return null;
  }

  return {
    ...parsed,
    level_id: parsed.level_id ?? "",
    progress_payload: asPayload(parsed.progress_payload),
  };
};

export const updateActivityProgress = async (
  childId: string,
  languageCode: string,
  activityType: string,
  input: ActivityProgressInput,
  options: { markDirty?: boolean; scheduleSync?: boolean; localUpdatedAt?: string } = {},
): Promise<ChildActivityProgress> => {
  const existing = await getActivityProgress(childId, languageCode, activityType);
  const shouldMarkDirty = options.markDirty ?? true;
  const record: ChildActivityProgress = {
    child_id: childId,
    language_code: languageCode,
    activity_type: activityType,
    status: input.status ?? existing?.status ?? "in_progress",
    score: input.score ?? existing?.score ?? null,
    stars: input.stars ?? existing?.stars ?? null,
    attempts: input.attempts ?? existing?.attempts ?? 0,
    last_stage_id: input.last_stage_id ?? existing?.last_stage_id ?? null,
    highest_unlocked_stage:
      input.highest_unlocked_stage ?? existing?.highest_unlocked_stage ?? null,
    completed_stage_count:
      input.completed_stage_count ?? existing?.completed_stage_count ?? 0,
    progress_payload:
      input.progress_payload ?? existing?.progress_payload ?? {},
    local_updated_at:
      options.localUpdatedAt ?? (shouldMarkDirty ? nowIso() : existing?.local_updated_at ?? nowIso()),
    server_updated_at: existing?.server_updated_at ?? null,
    created_at: existing?.created_at,
    updated_at: existing?.updated_at,
    dirty: shouldMarkDirty ? true : existing?.dirty ?? false,
  };

  const saved = await writeLocalActivityProgress(record);

  if (shouldMarkDirty) {
    await enqueueDirty({
      kind: "activity",
      child_id: childId,
      language_code: languageCode,
      activity_type: activityType,
    });

    if (options.scheduleSync !== false) {
      scheduleProgressSync();
    }
  }

  return saved;
};

export const ensureActivityProgressSnapshot = async (
  childId: string,
  languageCode: string,
  activityType: string,
  input: ActivityProgressInput,
): Promise<ChildActivityProgress> => {
  const existing = await getActivityProgress(childId, languageCode, activityType);
  if (existing) return existing;

  return updateActivityProgress(childId, languageCode, activityType, input, {
    markDirty: true,
    scheduleSync: false,
  });
};

const updateStageProgress = async (
  childId: string,
  languageCode: string,
  activityType: string,
  stageId: string | number,
  levelId: string | number,
  input: StageProgressInput,
  options: { markDirty?: boolean; scheduleSync?: boolean; localUpdatedAt?: string } = {},
): Promise<ChildStageProgress> => {
  const normalizedStageId = String(stageId);
  const normalizedLevelId = String(levelId);
  const existing = await getStageProgress(
    childId,
    languageCode,
    activityType,
    normalizedStageId,
    normalizedLevelId,
  );
  const shouldMarkDirty = options.markDirty ?? true;
  const record: ChildStageProgress = {
    child_id: childId,
    language_code: languageCode,
    activity_type: activityType,
    stage_id: normalizedStageId,
    level_id: normalizedLevelId,
    status: input.status ?? existing?.status ?? "in_progress",
    score: input.score ?? existing?.score ?? null,
    stars: input.stars ?? existing?.stars ?? null,
    attempts: input.attempts ?? existing?.attempts ?? 0,
    progress_payload: input.progress_payload ?? existing?.progress_payload ?? {},
    completed_at: input.completed_at ?? existing?.completed_at ?? null,
    local_updated_at:
      options.localUpdatedAt ?? (shouldMarkDirty ? nowIso() : existing?.local_updated_at ?? nowIso()),
    server_updated_at: existing?.server_updated_at ?? null,
    created_at: existing?.created_at,
    updated_at: existing?.updated_at,
    dirty: shouldMarkDirty ? true : existing?.dirty ?? false,
  };

  const saved = await writeLocalStageProgress(record);

  if (shouldMarkDirty) {
    await enqueueDirty({
      kind: "stage",
      child_id: childId,
      language_code: languageCode,
      activity_type: activityType,
      stage_id: normalizedStageId,
      level_id: normalizedLevelId,
    });

    if (options.scheduleSync !== false) {
      scheduleProgressSync();
    }
  }

  return saved;
};

export const markStageStarted = async (
  childId: string,
  languageCode: string,
  activityType: string,
  stageId: string | number,
  data: StageProgressInput = {},
): Promise<ChildStageProgress> =>
  updateStageProgress(childId, languageCode, activityType, stageId, "", {
    ...data,
    status: data.status ?? "in_progress",
  });

export const markStageCompleted = async (
  childId: string,
  languageCode: string,
  activityType: string,
  stageId: string | number,
  data: StageProgressInput = {},
): Promise<ChildStageProgress> =>
  updateStageProgress(childId, languageCode, activityType, stageId, "", {
    ...data,
    status: data.status ?? "completed",
    completed_at: data.completed_at ?? nowIso(),
  });

export const markLevelCompleted = async (
  childId: string,
  languageCode: string,
  activityType: string,
  stageId: string | number,
  levelId: string | number,
  data: StageProgressInput = {},
): Promise<ChildStageProgress> =>
  updateStageProgress(childId, languageCode, activityType, stageId, levelId, {
    ...data,
    status: data.status ?? "completed",
    completed_at: data.completed_at ?? nowIso(),
  });

export const getPendingProgressSyncCount = async (
  childId?: string,
): Promise<number> => {
  const queue = await loadQueue();
  return childId ? queue.filter((item) => item.child_id === childId).length : queue.length;
};

const fetchRemoteActivityRows = async (
  records: Array<Pick<ChildActivityProgress, "child_id" | "language_code" | "activity_type">>,
): Promise<ChildActivityProgress[]> => {
  const childIds = [...new Set(records.map((record) => record.child_id))];
  const languageCodes = [...new Set(records.map((record) => record.language_code))];
  const activityTypes = [...new Set(records.map((record) => record.activity_type))];

  if (childIds.length === 0) return [];

  let query = supabase.from("child_activity_progress").select("*");
  query = childIds.length === 1
    ? query.eq("child_id", childIds[0])
    : query.in("child_id", childIds);
  query = languageCodes.length === 1
    ? query.eq("language_code", languageCodes[0])
    : query.in("language_code", languageCodes);
  query = activityTypes.length === 1
    ? query.eq("activity_type", activityTypes[0])
    : query.in("activity_type", activityTypes);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ChildActivityProgress[];
};

const fetchRemoteStageRows = async (
  records: Array<Pick<ChildStageProgress, "child_id" | "language_code" | "activity_type">>,
): Promise<ChildStageProgress[]> => {
  const childIds = [...new Set(records.map((record) => record.child_id))];
  const languageCodes = [...new Set(records.map((record) => record.language_code))];
  const activityTypes = [...new Set(records.map((record) => record.activity_type))];

  if (childIds.length === 0) return [];

  let query = supabase.from("child_stage_progress").select("*");
  query = childIds.length === 1
    ? query.eq("child_id", childIds[0])
    : query.in("child_id", childIds);
  query = languageCodes.length === 1
    ? query.eq("language_code", languageCodes[0])
    : query.in("language_code", languageCodes);
  query = activityTypes.length === 1
    ? query.eq("activity_type", activityTypes[0])
    : query.in("activity_type", activityTypes);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ChildStageProgress[];
};

const markActivityRecordsSynced = async (
  records: ChildActivityProgress[],
  returnedRows: ChildActivityProgress[] | null,
): Promise<ChildActivityProgress[]> => {
  const returnedMap = new Map(
    (returnedRows ?? []).map((row) => [activityIdentity(row), row]),
  );

  const markedRecords = await Promise.all(
    records.map(async (record) => {
      const current = await getActivityProgress(
        record.child_id,
        record.language_code,
        record.activity_type,
      );
      if (!current || current.local_updated_at !== record.local_updated_at) {
        return null;
      }

      const returned = returnedMap.get(activityIdentity(record));
      if (current.dirty) {
        await writeLocalActivityProgress({
          ...current,
          id: returned?.id ?? current.id,
          server_updated_at:
            returned?.server_updated_at ?? returned?.updated_at ?? current.server_updated_at ?? nowIso(),
          updated_at: returned?.updated_at ?? current.updated_at,
          created_at: returned?.created_at ?? current.created_at,
          dirty: false,
        });
      }

      return record;
    }),
  );

  return markedRecords.filter(
    (record): record is ChildActivityProgress => Boolean(record),
  );
};

const markStageRecordsSynced = async (
  records: ChildStageProgress[],
  returnedRows: ChildStageProgress[] | null,
): Promise<ChildStageProgress[]> => {
  const returnedMap = new Map(
    (returnedRows ?? []).map((row) => [stageIdentity(row), row]),
  );

  const markedRecords = await Promise.all(
    records.map(async (record) => {
      const current = await getStageProgress(
        record.child_id,
        record.language_code,
        record.activity_type,
        record.stage_id,
        record.level_id ?? "",
      );
      if (!current || current.local_updated_at !== record.local_updated_at) {
        return null;
      }

      const returned = returnedMap.get(stageIdentity(record));
      if (current.dirty) {
        await writeLocalStageProgress({
          ...current,
          id: returned?.id ?? current.id,
          server_updated_at:
            returned?.server_updated_at ?? returned?.updated_at ?? current.server_updated_at ?? nowIso(),
          updated_at: returned?.updated_at ?? current.updated_at,
          created_at: returned?.created_at ?? current.created_at,
          dirty: false,
        });
      }

      return record;
    }),
  );

  return markedRecords.filter(
    (record): record is ChildStageProgress => Boolean(record),
  );
};

export const syncProgressNow = async (
  childId?: string,
): Promise<ProgressSyncResult> => {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }

  const queue = await repairProgressQueue();
  const pending = childId
    ? queue.filter((item) => item.child_id === childId)
    : queue;

  if (pending.length === 0) {
    return { pushed: 0, skipped: 0, failed: 0 };
  }

  if (!(await hasSupabaseSession())) {
    return { pushed: 0, skipped: pending.length, failed: 0 };
  }

  const activityItems = pending.filter((item) => item.kind === "activity");
  const stageItems = pending.filter((item) => item.kind === "stage");
  let pushed = 0;
  let skipped = 0;
  let failed = 0;
  const syncedQueueItems: ProgressQueueItem[] = [];

  try {
    const activityRecords = (
      await Promise.all(
        activityItems.map((item) =>
          getActivityProgress(item.child_id, item.language_code, item.activity_type),
        ),
      )
    ).filter((record): record is ChildActivityProgress => Boolean(record?.dirty));
    const remoteRows = await fetchRemoteActivityRows(activityRecords);
    const remoteMap = new Map(remoteRows.map((row) => [activityIdentity(row), row]));
    const activityRecordsToPush = activityRecords.filter((record) => {
      const remote = remoteMap.get(activityIdentity(record));
      const shouldPush =
        !remote || !isRemoteNewer(remote.local_updated_at, record.local_updated_at);
      if (!shouldPush) skipped += 1;
      return shouldPush;
    });

    if (activityRecordsToPush.length > 0) {
      const { data, error } = await supabase
        .from("child_activity_progress")
        .upsert(activityRecordsToPush.map(sanitizeActivityForRemote), {
          onConflict: "child_id,language_code,activity_type",
        })
        .select("*");

      if (error) throw error;

      const syncedActivityRecords = await markActivityRecordsSynced(
        activityRecordsToPush,
        (data ?? []) as ChildActivityProgress[],
      );
      pushed += activityRecordsToPush.length;
      syncedQueueItems.push(
        ...syncedActivityRecords.map((record) => ({
          kind: "activity" as const,
          child_id: record.child_id,
          language_code: record.language_code,
          activity_type: record.activity_type,
        })),
      );
    }
  } catch {
    failed += activityItems.length;
  }

  try {
    const stageRecords = (
      await Promise.all(
        stageItems.map((item) =>
          getStageProgress(
            item.child_id,
            item.language_code,
            item.activity_type,
            item.stage_id ?? "",
            item.level_id ?? "",
          ),
        ),
      )
    ).filter((record): record is ChildStageProgress => Boolean(record?.dirty));
    const remoteRows = await fetchRemoteStageRows(stageRecords);
    const remoteMap = new Map(remoteRows.map((row) => [stageIdentity(row), row]));
    const stageRecordsToPush = stageRecords.filter((record) => {
      const remote = remoteMap.get(stageIdentity(record));
      const shouldPush =
        !remote || !isRemoteNewer(remote.local_updated_at, record.local_updated_at);
      if (!shouldPush) skipped += 1;
      return shouldPush;
    });

    if (stageRecordsToPush.length > 0) {
      const { data, error } = await supabase
        .from("child_stage_progress")
        .upsert(stageRecordsToPush.map(sanitizeStageForRemote), {
          onConflict: "child_id,language_code,activity_type,stage_id,level_id",
        })
        .select("*");

      if (error) throw error;

      const syncedStageRecords = await markStageRecordsSynced(
        stageRecordsToPush,
        (data ?? []) as ChildStageProgress[],
      );
      pushed += stageRecordsToPush.length;
      syncedQueueItems.push(
        ...syncedStageRecords.map((record) => ({
          kind: "stage" as const,
          child_id: record.child_id,
          language_code: record.language_code,
          activity_type: record.activity_type,
          stage_id: record.stage_id,
          level_id: record.level_id,
        })),
      );
    }
  } catch {
    failed += stageItems.length;
  }

  await removeQueueItems(syncedQueueItems);

  return { pushed, skipped, failed };
};

export const hydrateProgressFromRemote = async (
  childId: string,
  languageCode?: string,
  options: HydrateProgressOptions = {},
): Promise<{ activities: number; stages: number }> => {
  if (!childId || !(await hasSupabaseSession())) {
    return { activities: 0, stages: 0 };
  }

  const activityTypesToFetch = await getHydrationActivityTypesToFetch(
    childId,
    languageCode,
    options,
  );
  if (activityTypesToFetch && activityTypesToFetch.length === 0) {
    return { activities: 0, stages: 0 };
  }

  let hydratedActivities = 0;
  let hydratedStages = 0;
  let hydratedActivityQuerySucceeded = false;
  let hydratedStageQuerySucceeded = false;

  try {
    let activityQuery = supabase
      .from("child_activity_progress")
      .select("*")
      .eq("child_id", childId);
    if (languageCode) {
      activityQuery = activityQuery.eq("language_code", languageCode);
    }
    if (activityTypesToFetch) {
      activityQuery =
        activityTypesToFetch.length === 1
          ? activityQuery.eq("activity_type", activityTypesToFetch[0])
          : activityQuery.in("activity_type", activityTypesToFetch);
    }
    const { data, error } = await activityQuery;

    if (error) throw error;

    for (const remote of (data ?? []) as ChildActivityProgress[]) {
      const local = await getActivityProgress(
        remote.child_id,
        remote.language_code,
        remote.activity_type,
      );

      if (!local || (!local.dirty && isRemoteNewer(remote.local_updated_at, local.local_updated_at))) {
        await writeLocalActivityProgress({
          ...remote,
          progress_payload: asPayload(remote.progress_payload),
          dirty: false,
        });
        hydratedActivities += 1;
      }
    }
    hydratedActivityQuerySucceeded = true;
  } catch {
    hydratedActivities = 0;
  }

  try {
    let stageQuery = supabase
      .from("child_stage_progress")
      .select("*")
      .eq("child_id", childId);
    if (languageCode) {
      stageQuery = stageQuery.eq("language_code", languageCode);
    }
    if (activityTypesToFetch) {
      stageQuery =
        activityTypesToFetch.length === 1
          ? stageQuery.eq("activity_type", activityTypesToFetch[0])
          : stageQuery.in("activity_type", activityTypesToFetch);
    }
    const { data, error } = await stageQuery;

    if (error) throw error;

    for (const remote of (data ?? []) as ChildStageProgress[]) {
      const local = await getStageProgress(
        remote.child_id,
        remote.language_code,
        remote.activity_type,
        remote.stage_id,
        remote.level_id,
      );

      if (!local || (!local.dirty && isRemoteNewer(remote.local_updated_at, local.local_updated_at))) {
        await writeLocalStageProgress({
          ...remote,
          level_id: remote.level_id ?? "",
          progress_payload: asPayload(remote.progress_payload),
          dirty: false,
        });
        hydratedStages += 1;
      }
    }
    hydratedStageQuerySucceeded = true;
  } catch {
    hydratedStages = 0;
  }

  if (hydratedActivityQuerySucceeded && hydratedStageQuerySucceeded) {
    await markHydrationComplete(childId, languageCode, activityTypesToFetch);
  }

  return { activities: hydratedActivities, stages: hydratedStages };
};

export const clearProgressRepositoryStorage = async (): Promise<void> => {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }

  await runSerializedQueueOperation(async () => {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(
      keys.filter(
        (key) =>
          key.startsWith(PROGRESS_STORAGE_PREFIX) ||
          key.startsWith(PROGRESS_HYDRATION_PREFIX),
      ),
    );
  });
};

export const clearProgressRepositoryStorageForChild = async (
  childId: string,
): Promise<void> => {
  if (!childId) return;

  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }

  await runSerializedQueueOperation(async () => {
    const encodedChildId = encodeKeyPart(childId);
    const keys = await AsyncStorage.getAllKeys();
    const childProgressKeyPrefixes = [
      `${PROGRESS_STORAGE_PREFIX}:activity:${encodedChildId}:`,
      `${PROGRESS_STORAGE_PREFIX}:stage:${encodedChildId}:`,
      `${PROGRESS_HYDRATION_PREFIX}:${encodedChildId}:`,
    ];

    await AsyncStorage.multiRemove(
      keys.filter((key) =>
        childProgressKeyPrefixes.some((prefix) => key.startsWith(prefix)),
      ),
    );

    const queue = await loadQueue();
    await saveQueue(queue.filter((item) => item.child_id !== childId));
  });
};
