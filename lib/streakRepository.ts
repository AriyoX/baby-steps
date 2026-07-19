import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  deriveStreakSummary,
  getDeviceTimezone,
  isCompletionInsideEpoch,
  isValidLocalDateKey,
  mergeStreakDays,
  normalizeStreakDayForEpoch,
  toLocalDateKey,
  type ChildStreakDay,
  type ChildStreakEpoch,
  type ChildStreakPreferences,
  type ChildStreakSnapshot,
  type StreakEpochEndReason,
  type StreakPendingTransition,
  type StreakSourceType,
} from "./streakDate";
import { supabase } from "./supabase";

export type RecordQualifiedStreakActivityInput = {
  childId: string;
  sourceType: StreakSourceType;
  sourceId?: string;
  completionId: string;
  completedAt: string;
};

export type RecordQualifiedStreakActivityResult = {
  recorded: boolean;
  firstLocalQualification: boolean;
  reason?: "disabled" | "duplicate" | "invalid" | "no-account" | "no-epoch";
  snapshot?: ChildStreakSnapshot;
};

export type StreakSyncResult = {
  pushed: number;
  rejected: number;
  failed: number;
  skipped: number;
};

export type StreakCelebrationEvent = {
  accountId: string;
  childId: string;
  localDate: string;
  currentStreak: number;
};

export type LearningReminderCandidate = {
  childId: string;
  name: string;
  completedToday: boolean;
};

export type HydrateChildStreakOptions = {
  throwOnRemoteError?: boolean;
};

type ChildStreakHydrationOutcome = {
  snapshot: ChildStreakSnapshot | null;
  remoteError: Error | null;
};

type DayQueueItem = {
  kind: "day";
  mutationId: string;
  accountId: string;
  childId: string;
  epochId: string;
  localDate: string;
  day: ChildStreakDay;
  version: string;
};

export type StreakQueueItem = StreakPendingTransition | DayQueueItem;
type StreakTransitionQueueItem = StreakPendingTransition;

type CompletionReceipt = {
  completionId: string;
  completedAt: string;
  localDate: string;
};

type CompletionReceiptCache = {
  receipts: CompletionReceipt[];
  celebratedDates: string[];
};

type StreakRpcResult = {
  status?: "applied" | "no_op" | "stale" | "rejected" | string;
  reason?: string | null;
  day?: Record<string, unknown> | null;
  preferences?: Record<string, unknown> | null;
  current_epoch?: Record<string, unknown> | null;
  affected_epoch?: Record<string, unknown> | null;
};

export type StreakPersistenceStep =
  | "queue:before"
  | "queue:after"
  | "snapshot:before-canonical"
  | "snapshot:after-canonical"
  | "snapshot:after-projections"
  | "receipt:before"
  | "receipt:after";

const STORAGE_PREFIX = "@BabySteps";
const STREAK_VERSION = "v2";
const RECEIPT_LIMIT = 200;
const CELEBRATED_DATE_LIMIT = 60;
const DEFAULT_SYNC_DELAY_MS = 3_000;

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncGeneration = 0;
let persistenceFailureInjector: ((step: StreakPersistenceStep) => void | Promise<void>) | null = null;
const queueTails = new Map<string, Promise<void>>();
const snapshotTails = new Map<string, Promise<void>>();
const streakSyncTails = new Map<string, Promise<void>>();
const hydrationPromises = new Map<string, Promise<ChildStreakHydrationOutcome>>();
const memorySnapshots = new Map<string, ChildStreakSnapshot>();
const recentMutationSyncOutcomes = new Map<string, "pushed" | "rejected">();
const snapshotListeners = new Map<string, Set<(snapshot: ChildStreakSnapshot) => void>>();
const celebrationListeners = new Set<(event: StreakCelebrationEvent) => void>();

export const setStreakPersistenceFailureInjectorForTests = (
  injector: ((step: StreakPersistenceStep) => void | Promise<void>) | null,
): void => {
  persistenceFailureInjector = injector;
};

const checkpoint = async (step: StreakPersistenceStep): Promise<void> => {
  await persistenceFailureInjector?.(step);
};

const encode = (value: string): string => encodeURIComponent(value);
const scope = (accountId: string, childId: string): string =>
  `${encode(accountId)}:${encode(childId)}`;

export const getStreakStorageKeys = (accountId: string, childId: string) => ({
  preferences: `${STORAGE_PREFIX}:ChildStreakPreferences:${STREAK_VERSION}:${scope(accountId, childId)}`,
  epochs: `${STORAGE_PREFIX}:StreakEpochs:${STREAK_VERSION}:${scope(accountId, childId)}`,
  days: `${STORAGE_PREFIX}:StreakDays:${STREAK_VERSION}:${scope(accountId, childId)}`,
  snapshot: `${STORAGE_PREFIX}:StreakSnapshot:${STREAK_VERSION}:${scope(accountId, childId)}`,
  receipts: `${STORAGE_PREFIX}:StreakCompletionReceipts:v1:${scope(accountId, childId)}`,
});

export const getStreakQueueStorageKey = (accountId: string): string =>
  `${STORAGE_PREFIX}:StreakQueue:${STREAK_VERSION}:${encode(accountId)}`;

const snapshotIdentity = (accountId: string, childId: string): string =>
  `${accountId}:${childId}`;

const mutationSyncIdentity = (accountId: string, mutationId: string): string =>
  `${encode(accountId)}:${encode(mutationId)}`;

const rememberMutationSyncOutcome = (
  accountId: string,
  mutationId: string,
  outcome: "pushed" | "rejected",
): void => {
  const identity = mutationSyncIdentity(accountId, mutationId);
  recentMutationSyncOutcomes.delete(identity);
  recentMutationSyncOutcomes.set(identity, outcome);
  while (recentMutationSyncOutcomes.size > 256) {
    const oldest = recentMutationSyncOutcomes.keys().next().value;
    if (typeof oldest !== "string") break;
    recentMutationSyncOutcomes.delete(oldest);
  }
};

const nowIso = (): string => new Date().toISOString();

const createUuid = (): string => {
  const cryptoValue = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoValue?.randomUUID) return cryptoValue.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
};

const maxIso = (left: string | null, right: string): string => {
  if (!left) return right;
  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
};

const safeParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    if (__DEV__) console.warn("Ignoring a corrupt local streak record:", error);
    return null;
  }
};

const isIso = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(new Date(value).getTime());

const isPreferences = (value: unknown): value is ChildStreakPreferences => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.childId === "string" &&
    typeof record.streakEnabled === "boolean" &&
    typeof record.includeInReminders === "boolean" &&
    (record.currentEpochId === null || typeof record.currentEpochId === "string") &&
    (record.resetAt === null || isIso(record.resetAt)) &&
    isIso(record.updatedAt)
  );
};

const isEpoch = (value: unknown): value is ChildStreakEpoch => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.childId === "string" &&
    isIso(record.startedAt) &&
    (record.endedAt === null || isIso(record.endedAt)) &&
    (record.endReason === null ||
      record.endReason === "reset" ||
      record.endReason === "disabled" ||
      record.endReason === "replaced") &&
    isIso(record.updatedAt)
  );
};

const isDay = (value: unknown): value is ChildStreakDay => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.childId === "string" &&
    typeof record.streakEpochId === "string" &&
    isValidLocalDateKey(String(record.localDate ?? "")) &&
    typeof record.firstTimezone === "string" &&
    typeof record.lastTimezone === "string" &&
    isIso(record.firstCompletedAt) &&
    isIso(record.lastCompletedAt) &&
    (record.sourceType === "learning_hub" ||
      record.sourceType === "game" ||
      record.sourceType === "story" ||
      record.sourceType === "coloring") &&
    (record.sourceRef === null || typeof record.sourceRef === "string") &&
    isIso(record.updatedAt)
  );
};

const isTransition = (value: unknown): value is StreakPendingTransition => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Partial<StreakPendingTransition>;
  return (
    (record.kind === "create_default" ||
      record.kind === "set_enabled" ||
      record.kind === "reset" ||
      record.kind === "set_reminders") &&
    typeof record.mutationId === "string" &&
    typeof record.accountId === "string" &&
    typeof record.childId === "string" &&
    isIso(record.occurredAt) &&
    typeof record.version === "string"
  );
};

const isQueueItem = (value: unknown, accountId: string): value is StreakQueueItem => {
  if (isTransition(value)) return value.accountId === accountId;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Partial<DayQueueItem>;
  return (
    item.kind === "day" &&
    item.accountId === accountId &&
    typeof item.childId === "string" &&
    typeof item.epochId === "string" &&
    typeof item.localDate === "string" &&
    typeof item.mutationId === "string" &&
    typeof item.version === "string" &&
    isDay(item.day)
  );
};

const runSerializedQueue = <T>(accountId: string, operation: () => Promise<T>): Promise<T> => {
  const previous = queueTails.get(accountId) ?? Promise.resolve();
  const result = previous.then(operation);
  const tail = result.then(
    () => {
      if (queueTails.get(accountId) === tail) queueTails.delete(accountId);
    },
    () => {
      if (queueTails.get(accountId) === tail) queueTails.delete(accountId);
    },
  );
  queueTails.set(accountId, tail);
  return result;
};

const runSerializedSnapshot = <T>(
  accountId: string,
  childId: string,
  operation: () => Promise<T>,
): Promise<T> => {
  const key = snapshotIdentity(accountId, childId);
  const previous = snapshotTails.get(key) ?? Promise.resolve();
  const result = previous.then(operation);
  const tail = result.then(
    () => {
      if (snapshotTails.get(key) === tail) snapshotTails.delete(key);
    },
    () => {
      if (snapshotTails.get(key) === tail) snapshotTails.delete(key);
    },
  );
  snapshotTails.set(key, tail);
  return result;
};

const queueIdentity = (item: StreakQueueItem): string => {
  if (item.kind === "day") return `day:${item.childId}:${item.epochId}:${item.localDate}`;
  if (item.kind === "set_reminders") return `preference:${item.childId}:include_in_reminders`;
  if (item.kind === "create_default") return `default:${item.childId}`;
  return `mutation:${item.mutationId}`;
};

const loadQueueUnlocked = async (accountId: string): Promise<StreakQueueItem[]> => {
  const parsed = safeParse<unknown>(
    await AsyncStorage.getItem(getStreakQueueStorageKey(accountId)),
  );
  return Array.isArray(parsed)
    ? parsed.filter((item): item is StreakQueueItem => isQueueItem(item, accountId))
    : [];
};

const loadQueue = (accountId: string): Promise<StreakQueueItem[]> =>
  runSerializedQueue(accountId, () => loadQueueUnlocked(accountId));

const saveQueueUnlocked = async (
  accountId: string,
  queue: StreakQueueItem[],
): Promise<void> => {
  const unique = new Map<string, StreakQueueItem>();
  for (const item of queue) {
    if (item.accountId === accountId) unique.set(queueIdentity(item), item);
  }
  await AsyncStorage.setItem(
    getStreakQueueStorageKey(accountId),
    JSON.stringify([...unique.values()]),
  );
};

const enqueue = (item: StreakQueueItem): Promise<void> =>
  runSerializedQueue(item.accountId, async () => {
    await checkpoint("queue:before");
    const queue = await loadQueueUnlocked(item.accountId);
    const identity = queueIdentity(item);
    await saveQueueUnlocked(item.accountId, [
      ...queue.filter((candidate) => queueIdentity(candidate) !== identity),
      item,
    ]);
    await checkpoint("queue:after");
  });

const removeConfirmedQueueItem = (item: StreakQueueItem): Promise<boolean> =>
  runSerializedQueue(item.accountId, async () => {
    const queue = await loadQueueUnlocked(item.accountId);
    const identity = queueIdentity(item);
    const next = queue.filter(
      (candidate) =>
        queueIdentity(candidate) !== identity || candidate.version !== item.version,
    );
    if (next.length === queue.length) return false;
    await saveQueueUnlocked(item.accountId, next);
    return true;
  });

const getSessionAccountId = async (): Promise<string | null> => {
  const auth = supabase.auth as (typeof supabase.auth & {
    getSession?: typeof supabase.auth.getSession;
    getUser?: typeof supabase.auth.getUser;
  }) | undefined;
  if (auth && typeof auth.getSession === "function") {
    const { data } = await auth.getSession();
    return data.session?.user.id ?? null;
  }
  if (auth && typeof auth.getUser === "function") {
    const { data } = await auth.getUser();
    return data.user?.id ?? null;
  }
  return null;
};

const createDefaultSnapshot = (
  accountId: string,
  childId: string,
  occurredAt = nowIso(),
): { snapshot: ChildStreakSnapshot; queueItem: StreakPendingTransition } => {
  const epochId = createUuid();
  const queueItem: StreakPendingTransition = {
    kind: "create_default",
    mutationId: createUuid(),
    accountId,
    childId,
    epochId,
    occurredAt,
    version: occurredAt,
  };
  const epoch: ChildStreakEpoch = {
    id: epochId,
    childId,
    startedAt: occurredAt,
    endedAt: null,
    endReason: null,
    updatedAt: occurredAt,
    dirty: true,
  };
  const preferences: ChildStreakPreferences = {
    childId,
    streakEnabled: true,
    includeInReminders: true,
    currentEpochId: epochId,
    resetAt: occurredAt,
    updatedAt: occurredAt,
  };
  return {
    snapshot: {
      persistenceProtocolVersion: 1,
      accountId,
      childId,
      preferences,
      epochs: [epoch],
      days: [],
      pendingTransitions: [queueItem],
      summary: deriveStreakSummary([], [epoch], preferences),
      hydratedAt: null,
    },
    queueItem,
  };
};

const emitSnapshot = (snapshot: ChildStreakSnapshot): void => {
  const identity = snapshotIdentity(snapshot.accountId, snapshot.childId);
  memorySnapshots.set(identity, snapshot);
  snapshotListeners.get(identity)?.forEach((listener) => listener(snapshot));
};

const normalizeSnapshotDays = (snapshot: ChildStreakSnapshot): ChildStreakDay[] => {
  const epochs = new Map(snapshot.epochs.map((epoch) => [epoch.id, epoch]));
  return snapshot.days.flatMap((day) => {
    const epoch = epochs.get(day.streakEpochId);
    if (!epoch) return [];
    const eligibility = epoch.id === snapshot.preferences.currentEpochId
      ? snapshot.preferences.resetAt
      : null;
    const normalized = normalizeStreakDayForEpoch(day, epoch, eligibility);
    return normalized ? [normalized] : [];
  });
};

const writeSnapshot = async (snapshot: ChildStreakSnapshot): Promise<void> => {
  const keys = getStreakStorageKeys(snapshot.accountId, snapshot.childId);
  const normalizedDays = normalizeSnapshotDays(snapshot);
  const refreshed: ChildStreakSnapshot = {
    ...snapshot,
    persistenceProtocolVersion: 1,
    days: normalizedDays,
    pendingTransitions: snapshot.pendingTransitions.filter(isTransition),
    summary: deriveStreakSummary(normalizedDays, snapshot.epochs, snapshot.preferences),
  };

  await checkpoint("snapshot:before-canonical");
  await AsyncStorage.setItem(keys.snapshot, JSON.stringify(refreshed));
  emitSnapshot(refreshed);
  await checkpoint("snapshot:after-canonical");
  await AsyncStorage.multiSet([
    [keys.preferences, JSON.stringify(refreshed.preferences)],
    [keys.epochs, JSON.stringify(refreshed.epochs)],
    [keys.days, JSON.stringify(refreshed.days)],
  ]);
  await checkpoint("snapshot:after-projections");
};

const snapshotFromUnknown = (
  value: unknown,
  accountId: string,
  childId: string,
): ChildStreakSnapshot | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<ChildStreakSnapshot>;
  if (
    record.accountId !== accountId ||
    record.childId !== childId ||
    !isPreferences(record.preferences)
  ) return null;
  const epochs = Array.isArray(record.epochs)
    ? record.epochs.filter((epoch): epoch is ChildStreakEpoch => isEpoch(epoch))
    : [];
  const days = Array.isArray(record.days)
    ? record.days.filter((day): day is ChildStreakDay => isDay(day))
    : [];
  const pendingTransitions = Array.isArray(record.pendingTransitions)
    ? record.pendingTransitions.filter(isTransition)
    : [];
  return {
    persistenceProtocolVersion: record.persistenceProtocolVersion === 1 ? 1 : undefined,
    accountId,
    childId,
    preferences: record.preferences,
    epochs,
    days,
    pendingTransitions,
    summary: deriveStreakSummary(days, epochs, record.preferences),
    hydratedAt: typeof record.hydratedAt === "string" ? record.hydratedAt : null,
  };
};

const loadLocalSnapshot = async (
  accountId: string,
  childId: string,
): Promise<ChildStreakSnapshot | null> => {
  const identity = snapshotIdentity(accountId, childId);
  const memory = memorySnapshots.get(identity);
  if (memory) {
    const days = normalizeSnapshotDays(memory);
    return {
      ...memory,
      days,
      summary: deriveStreakSummary(days, memory.epochs, memory.preferences),
    };
  }

  const keys = getStreakStorageKeys(accountId, childId);
  const canonical = snapshotFromUnknown(
    safeParse<unknown>(await AsyncStorage.getItem(keys.snapshot)),
    accountId,
    childId,
  );
  if (canonical) {
    emitSnapshot(canonical);
    return canonical;
  }

  const values = await AsyncStorage.multiGet([keys.preferences, keys.epochs, keys.days]);
  const map = new Map(values);
  const preferences = safeParse<unknown>(map.get(keys.preferences) ?? null);
  if (!isPreferences(preferences) || preferences.childId !== childId) return null;
  const parsedEpochs = safeParse<unknown>(map.get(keys.epochs) ?? null);
  const parsedDays = safeParse<unknown>(map.get(keys.days) ?? null);
  const epochs = Array.isArray(parsedEpochs)
    ? parsedEpochs.filter((epoch): epoch is ChildStreakEpoch =>
        isEpoch(epoch) && epoch.childId === childId)
    : [];
  const days = Array.isArray(parsedDays)
    ? parsedDays.filter((day): day is ChildStreakDay => isDay(day) && day.childId === childId)
    : [];
  const snapshot: ChildStreakSnapshot = {
    accountId,
    childId,
    preferences,
    epochs,
    days,
    pendingTransitions: [],
    summary: deriveStreakSummary(days, epochs, preferences),
    hydratedAt: null,
  };
  emitSnapshot(snapshot);
  return snapshot;
};

const ensureLocalSnapshot = async (
  accountId: string,
  childId: string,
): Promise<ChildStreakSnapshot> => {
  const existing = await loadLocalSnapshot(accountId, childId);
  if (existing) return existing;
  const created = createDefaultSnapshot(accountId, childId);
  await enqueue(created.queueItem);
  await writeSnapshot(created.snapshot);
  scheduleStreakSync();
  return memorySnapshots.get(snapshotIdentity(accountId, childId)) ?? created.snapshot;
};

export const getChildStreak = async (
  childId: string,
): Promise<ChildStreakSnapshot | null> => {
  const accountId = await getSessionAccountId();
  if (!accountId || !childId) return null;
  return ensureLocalSnapshot(accountId, childId);
};

export const getCachedChildStreak = async (
  childId: string,
): Promise<ChildStreakSnapshot | null> => {
  const accountId = await getSessionAccountId();
  if (!accountId || !childId) return null;
  return loadLocalSnapshot(accountId, childId);
};

export const getChildStreakPreferences = async (
  childId: string,
): Promise<ChildStreakPreferences | null> =>
  (await getChildStreak(childId))?.preferences ?? null;

export const subscribeToChildStreak = (
  accountId: string,
  childId: string,
  listener: (snapshot: ChildStreakSnapshot) => void,
): (() => void) => {
  const identity = snapshotIdentity(accountId, childId);
  const listeners = snapshotListeners.get(identity) ?? new Set();
  listeners.add(listener);
  snapshotListeners.set(identity, listeners);
  const existing = memorySnapshots.get(identity);
  if (existing) listener(existing);
  return () => {
    const current = snapshotListeners.get(identity);
    current?.delete(listener);
    if (current?.size === 0) snapshotListeners.delete(identity);
  };
};

export const subscribeToStreakCelebrations = (
  listener: (event: StreakCelebrationEvent) => void,
): (() => void) => {
  celebrationListeners.add(listener);
  return () => celebrationListeners.delete(listener);
};

export const cancelScheduledStreakSync = (): void => {
  syncGeneration += 1;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = null;
};

export const scheduleStreakSync = (delayMs = DEFAULT_SYNC_DELAY_MS): void => {
  if (process.env.NODE_ENV === "test") return;
  if (syncTimer) clearTimeout(syncTimer);
  const generation = syncGeneration;
  syncTimer = setTimeout(() => {
    syncTimer = null;
    if (generation !== syncGeneration) return;
    void syncDirtyStreakState().catch((error) => {
      console.warn("Could not synchronize learning streaks in the background:", error);
    });
  }, delayMs);
  (syncTimer as unknown as { unref?: () => void }).unref?.();
};

const closeEpoch = (
  epochs: ChildStreakEpoch[],
  epochId: string,
  endedAt: string,
  endReason: StreakEpochEndReason,
): ChildStreakEpoch[] =>
  epochs.map((epoch) =>
    epoch.id === epochId
      ? { ...epoch, endedAt, endReason, updatedAt: endedAt, dirty: true }
      : epoch,
  );

const persistTransition = async (
  current: ChildStreakSnapshot,
  item: StreakPendingTransition,
  next: ChildStreakSnapshot,
): Promise<ChildStreakSnapshot> => {
  await enqueue(item);
  await writeSnapshot({
    ...next,
    pendingTransitions: [...current.pendingTransitions, item],
  });
  scheduleStreakSync();
  return memorySnapshots.get(snapshotIdentity(current.accountId, current.childId)) ?? next;
};

export const setChildStreakEnabled = async (
  childId: string,
  enabled: boolean,
  occurredAt = nowIso(),
): Promise<ChildStreakSnapshot | null> => {
  const accountId = await getSessionAccountId();
  if (!accountId || !childId || !isIso(occurredAt)) return null;
  return runSerializedSnapshot(accountId, childId, async () => {
    const current = await ensureLocalSnapshot(accountId, childId);
    if (current.preferences.streakEnabled === enabled) return current;
    if (current.preferences.resetAt && occurredAt <= current.preferences.resetAt) return current;

    const expectedEpochId = current.preferences.currentEpochId;
    const mutationId = createUuid();
    const newEpochId = enabled ? createUuid() : null;
    const item: StreakPendingTransition = {
      kind: "set_enabled",
      mutationId,
      accountId,
      childId,
      enabled,
      expectedEpochId,
      newEpochId,
      occurredAt,
      version: mutationId,
    };
    let epochs = [...current.epochs];
    if (enabled && newEpochId) {
      epochs.push({
        id: newEpochId,
        childId,
        startedAt: occurredAt,
        endedAt: null,
        endReason: null,
        updatedAt: occurredAt,
        dirty: true,
      });
    } else if (expectedEpochId) {
      epochs = closeEpoch(epochs, expectedEpochId, occurredAt, "disabled");
    }
    const preferences: ChildStreakPreferences = {
      ...current.preferences,
      streakEnabled: enabled,
      currentEpochId: newEpochId,
      resetAt: maxIso(current.preferences.resetAt, occurredAt),
      updatedAt: occurredAt,
    };
    return persistTransition(current, item, { ...current, preferences, epochs });
  });
};

export const enableChildStreak = (childId: string, occurredAt?: string) =>
  setChildStreakEnabled(childId, true, occurredAt);

export const disableChildStreak = (childId: string, occurredAt?: string) =>
  setChildStreakEnabled(childId, false, occurredAt);

export const setChildReminderParticipation = async (
  childId: string,
  includeInReminders: boolean,
  occurredAt = nowIso(),
): Promise<ChildStreakSnapshot | null> => {
  const accountId = await getSessionAccountId();
  if (!accountId || !childId || !isIso(occurredAt)) return null;
  return runSerializedSnapshot(accountId, childId, async () => {
    const current = await ensureLocalSnapshot(accountId, childId);
    if (current.preferences.includeInReminders === includeInReminders) return current;
    const mutationId = createUuid();
    const item: StreakPendingTransition = {
      kind: "set_reminders",
      mutationId,
      accountId,
      childId,
      includeInReminders,
      occurredAt,
      version: mutationId,
    };
    const next: ChildStreakSnapshot = {
      ...current,
      preferences: { ...current.preferences, includeInReminders, updatedAt: occurredAt },
    };
    return persistTransition(current, item, next);
  });
};

export const updateChildStreakPreferences = async (
  childId: string,
  updates: Partial<Pick<ChildStreakPreferences, "streakEnabled" | "includeInReminders">>,
): Promise<ChildStreakSnapshot | null> => {
  let snapshot = await getChildStreak(childId);
  if (
    typeof updates.streakEnabled === "boolean" &&
    snapshot?.preferences.streakEnabled !== updates.streakEnabled
  ) snapshot = await setChildStreakEnabled(childId, updates.streakEnabled);
  if (
    typeof updates.includeInReminders === "boolean" &&
    snapshot?.preferences.includeInReminders !== updates.includeInReminders
  ) snapshot = await setChildReminderParticipation(childId, updates.includeInReminders);
  return snapshot;
};

export const resetChildCurrentStreak = async (
  childId: string,
  occurredAt = nowIso(),
): Promise<ChildStreakSnapshot | null> => {
  const accountId = await getSessionAccountId();
  if (!accountId || !childId || !isIso(occurredAt)) return null;
  return runSerializedSnapshot(accountId, childId, async () => {
    const current = await ensureLocalSnapshot(accountId, childId);
    const expectedEpochId = current.preferences.currentEpochId;
    if (!current.preferences.streakEnabled || !expectedEpochId) return current;
    if (current.preferences.resetAt && occurredAt <= current.preferences.resetAt) return current;

    const newEpochId = createUuid();
    const mutationId = createUuid();
    const item: StreakPendingTransition = {
      kind: "reset",
      mutationId,
      accountId,
      childId,
      expectedEpochId,
      newEpochId,
      occurredAt,
      version: mutationId,
    };
    const epochs = [
      ...closeEpoch(current.epochs, expectedEpochId, occurredAt, "reset"),
      {
        id: newEpochId,
        childId,
        startedAt: occurredAt,
        endedAt: null,
        endReason: null,
        updatedAt: occurredAt,
        dirty: true,
      } satisfies ChildStreakEpoch,
    ];
    const preferences: ChildStreakPreferences = {
      ...current.preferences,
      currentEpochId: newEpochId,
      resetAt: maxIso(current.preferences.resetAt, occurredAt),
      updatedAt: occurredAt,
    };
    return persistTransition(current, item, { ...current, preferences, epochs });
  });
};

const loadReceiptCache = async (
  accountId: string,
  childId: string,
): Promise<CompletionReceiptCache> => {
  const parsed = safeParse<unknown>(
    await AsyncStorage.getItem(getStreakStorageKeys(accountId, childId).receipts),
  );
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { receipts: [], celebratedDates: [] };
  }
  const candidate = parsed as Partial<CompletionReceiptCache>;
  return {
    receipts: Array.isArray(candidate.receipts)
      ? candidate.receipts.filter((receipt): receipt is CompletionReceipt =>
          Boolean(receipt) &&
          typeof receipt.completionId === "string" &&
          isIso(receipt.completedAt) &&
          typeof receipt.localDate === "string").slice(-RECEIPT_LIMIT)
      : [],
    celebratedDates: Array.isArray(candidate.celebratedDates)
      ? candidate.celebratedDates.filter((date): date is string =>
          typeof date === "string" && isValidLocalDateKey(date)).slice(-CELEBRATED_DATE_LIMIT)
      : [],
  };
};

export const recordQualifiedStreakActivity = async ({
  childId,
  sourceType,
  sourceId,
  completionId,
  completedAt,
}: RecordQualifiedStreakActivityInput): Promise<RecordQualifiedStreakActivityResult> => {
  const accountId = await getSessionAccountId();
  if (!accountId) return { recorded: false, firstLocalQualification: false, reason: "no-account" };
  if (!childId || !completionId.trim() || !isIso(completedAt)) {
    return { recorded: false, firstLocalQualification: false, reason: "invalid" };
  }

  let celebration: StreakCelebrationEvent | null = null;
  const result = await runSerializedSnapshot(accountId, childId, async () => {
    const current = await ensureLocalSnapshot(accountId, childId);
    if (!current.preferences.streakEnabled) {
      return { recorded: false, firstLocalQualification: false, reason: "disabled" as const };
    }
    const epochId = current.preferences.currentEpochId;
    const epoch = current.epochs.find((candidate) => candidate.id === epochId);
    if (!epochId || !epoch) {
      return { recorded: false, firstLocalQualification: false, reason: "no-epoch" as const };
    }
    if (
      !isCompletionInsideEpoch(completedAt, epoch) ||
      (current.preferences.resetAt && completedAt < current.preferences.resetAt)
    ) {
      return { recorded: false, firstLocalQualification: false, reason: "invalid" as const };
    }

    const receipts = await loadReceiptCache(accountId, childId);
    if (receipts.receipts.some((receipt) => receipt.completionId === completionId)) {
      return {
        recorded: false,
        firstLocalQualification: false,
        reason: "duplicate" as const,
        snapshot: current,
      };
    }

    const timezone = getDeviceTimezone();
    const localDate = toLocalDateKey(completedAt, timezone);
    if (!localDate) return { recorded: false, firstLocalQualification: false, reason: "invalid" as const };
    const existingIndex = current.days.findIndex(
      (day) => day.streakEpochId === epochId && day.localDate === localDate,
    );
    const existing = existingIndex >= 0 ? current.days[existingIndex] : null;
    const timestamp = new Date(completedAt).toISOString();
    const updatedAt = nowIso();
    const incoming: ChildStreakDay = {
      childId,
      streakEpochId: epochId,
      localDate,
      firstCompletedAt: timestamp,
      firstTimezone: timezone,
      lastCompletedAt: timestamp,
      lastTimezone: timezone,
      sourceType,
      sourceRef: sourceId?.trim().slice(0, 128) || null,
      updatedAt,
      dirty: true,
    };
    const day = existing
      ? { ...mergeStreakDays(existing, incoming), updatedAt, dirty: true }
      : incoming;
    const days = [...current.days];
    if (existingIndex >= 0) days[existingIndex] = day;
    else days.push(day);

    const shouldCelebrate = !receipts.celebratedDates.includes(localDate);
    const nextReceipts: CompletionReceiptCache = {
      receipts: [...receipts.receipts, { completionId, completedAt: timestamp, localDate }]
        .slice(-RECEIPT_LIMIT),
      celebratedDates: shouldCelebrate
        ? [...receipts.celebratedDates, localDate].slice(-CELEBRATED_DATE_LIMIT)
        : receipts.celebratedDates,
    };
    const queueItem: DayQueueItem = {
      kind: "day",
      mutationId: dayMutationId(day),
      accountId,
      childId,
      epochId,
      localDate,
      day,
      version: updatedAt,
    };

    await enqueue(queueItem);
    await writeSnapshot({ ...current, days });
    await checkpoint("receipt:before");
    await AsyncStorage.setItem(
      getStreakStorageKeys(accountId, childId).receipts,
      JSON.stringify(nextReceipts),
    );
    await checkpoint("receipt:after");
    scheduleStreakSync();

    const saved = memorySnapshots.get(snapshotIdentity(accountId, childId)) ?? { ...current, days };
    if (shouldCelebrate && !existing) {
      celebration = { accountId, childId, localDate, currentStreak: saved.summary.currentStreak };
    }
    return { recorded: true, firstLocalQualification: !existing, snapshot: saved };
  });

  if (celebration) celebrationListeners.forEach((listener) => listener(celebration!));
  return result;
};

const preferencesFromRow = (row: Record<string, unknown>): ChildStreakPreferences | null => {
  if (typeof row.child_id !== "string" || typeof row.streak_enabled !== "boolean") return null;
  return {
    childId: row.child_id,
    streakEnabled: row.streak_enabled,
    includeInReminders: row.include_in_reminders === true,
    currentEpochId: typeof row.current_epoch_id === "string" ? row.current_epoch_id : null,
    resetAt: typeof row.reset_at === "string" ? row.reset_at : null,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : nowIso(),
  };
};

const epochFromRow = (row: Record<string, unknown>): ChildStreakEpoch | null => {
  if (typeof row.id !== "string" || typeof row.child_id !== "string" || !isIso(row.started_at)) return null;
  return {
    id: row.id,
    childId: row.child_id,
    startedAt: row.started_at,
    endedAt: typeof row.ended_at === "string" ? row.ended_at : null,
    endReason:
      row.end_reason === "reset" || row.end_reason === "disabled" || row.end_reason === "replaced"
        ? row.end_reason
        : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : nowIso(),
    dirty: false,
  };
};

const dayFromRow = (row: Record<string, unknown>): ChildStreakDay | null => {
  if (
    typeof row.child_id !== "string" ||
    typeof row.streak_epoch_id !== "string" ||
    typeof row.local_date !== "string" ||
    typeof row.first_timezone !== "string" ||
    typeof row.last_timezone !== "string" ||
    !isIso(row.first_completed_at) ||
    !isIso(row.last_completed_at)
  ) return null;
  const sourceType = row.source_type;
  if (sourceType !== "learning_hub" && sourceType !== "game" && sourceType !== "story" && sourceType !== "coloring") return null;
  return {
    id: typeof row.id === "string" ? row.id : undefined,
    childId: row.child_id,
    streakEpochId: row.streak_epoch_id,
    localDate: row.local_date,
    firstCompletedAt: row.first_completed_at,
    firstTimezone: row.first_timezone,
    lastCompletedAt: row.last_completed_at,
    lastTimezone: row.last_timezone,
    sourceType,
    sourceRef: typeof row.source_ref === "string" ? row.source_ref : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : nowIso(),
    dirty: false,
  };
};

const dayIdentity = (day: Pick<ChildStreakDay, "streakEpochId" | "localDate">): string =>
  `${day.streakEpochId}:${day.localDate}`;

const dayMutationId = (
  day: Pick<ChildStreakDay, "childId" | "streakEpochId" | "localDate" | "updatedAt">,
): string => `day:${day.childId}:${day.streakEpochId}:${day.localDate}:${day.updatedAt}`;

const hydrateChildStreakImpl = async (
  accountId: string,
  childId: string,
): Promise<ChildStreakHydrationOutcome> => {
  await repairStreakQueue(accountId);
  const local = await loadLocalSnapshot(accountId, childId);
  try {
    const [preferenceResponse, epochResponse, dayResponse] = await Promise.all([
      supabase.from("child_streak_preferences").select("*").eq("child_id", childId).maybeSingle(),
      supabase.from("child_streak_epochs").select("*").eq("child_id", childId).order("started_at"),
      supabase.from("child_streak_days").select("*").eq("child_id", childId).order("local_date"),
    ]);
    if (preferenceResponse.error) throw preferenceResponse.error;
    if (epochResponse.error) throw epochResponse.error;
    if (dayResponse.error) throw dayResponse.error;
    if ((await getSessionAccountId()) !== accountId) {
      return { snapshot: null, remoteError: null };
    }

    const remotePreferences = preferenceResponse.data
      ? preferencesFromRow(preferenceResponse.data as Record<string, unknown>)
      : null;
    if (!remotePreferences) {
      throw new Error("Learning streak preferences were not returned for this child.");
    }
    const remoteEpochs = ((epochResponse.data ?? []) as Record<string, unknown>[])
      .map(epochFromRow).filter((epoch): epoch is ChildStreakEpoch => Boolean(epoch));
    const remoteDays = ((dayResponse.data ?? []) as Record<string, unknown>[])
      .map(dayFromRow).filter((day): day is ChildStreakDay => Boolean(day));
    const queue = await loadQueue(accountId);
    const childQueue = queue.filter((item) => item.childId === childId);
    const hasTransition = Boolean(local) && childQueue.some((item) =>
      item.kind === "set_enabled" || item.kind === "reset");
    const hasReminderMutation = Boolean(local) && childQueue.some(
      (item) => item.kind === "set_reminders",
    );
    const pendingEpochIds = new Set<string>();
    for (const item of childQueue) {
      if (item.kind === "create_default") pendingEpochIds.add(item.epochId);
      if (item.kind === "set_enabled") {
        if (item.expectedEpochId) pendingEpochIds.add(item.expectedEpochId);
        if (item.newEpochId) pendingEpochIds.add(item.newEpochId);
      }
      if (item.kind === "reset") {
        pendingEpochIds.add(item.expectedEpochId);
        pendingEpochIds.add(item.newEpochId);
      }
    }

    const preferences = {
      ...remotePreferences,
      streakEnabled: hasTransition ? local!.preferences.streakEnabled : remotePreferences.streakEnabled,
      currentEpochId: hasTransition ? local!.preferences.currentEpochId : remotePreferences.currentEpochId,
      resetAt: hasTransition
        ? maxIso(remotePreferences.resetAt, local!.preferences.resetAt ?? remotePreferences.updatedAt)
        : remotePreferences.resetAt,
      includeInReminders: hasReminderMutation
        ? local!.preferences.includeInReminders
        : remotePreferences.includeInReminders,
      updatedAt: hasTransition || hasReminderMutation
        ? maxIso(remotePreferences.updatedAt, local!.preferences.updatedAt)
        : remotePreferences.updatedAt,
    };
    const epochsById = new Map(remoteEpochs.map((epoch) => [epoch.id, epoch]));
    for (const epoch of local?.epochs ?? []) {
      if (pendingEpochIds.has(epoch.id)) epochsById.set(epoch.id, epoch);
    }
    const daysById = new Map(remoteDays.map((day) => [dayIdentity(day), day]));
    for (const localDay of local?.days ?? []) {
      if (!localDay.dirty) continue;
      const identity = dayIdentity(localDay);
      const remoteDay = daysById.get(identity);
      daysById.set(identity, remoteDay
        ? { ...mergeStreakDays(remoteDay, localDay), dirty: true, updatedAt: localDay.updatedAt }
        : localDay);
    }
    const pendingVersions = new Set(childQueue.map((item) => `${item.mutationId}:${item.version}`));
    const pendingTransitions = (local?.pendingTransitions ?? []).filter((item) =>
      pendingVersions.has(`${item.mutationId}:${item.version}`));
    const snapshot: ChildStreakSnapshot = {
      accountId,
      childId,
      preferences,
      epochs: [...epochsById.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
      days: [...daysById.values()].sort((a, b) => a.localDate.localeCompare(b.localDate)),
      pendingTransitions,
      summary: deriveStreakSummary(
        [...daysById.values()],
        [...epochsById.values()],
        preferences,
      ),
      hydratedAt: nowIso(),
    };
    await writeSnapshot(snapshot);
    return {
      snapshot: memorySnapshots.get(snapshotIdentity(accountId, childId)) ?? snapshot,
      remoteError: null,
    };
  } catch (error) {
    console.warn("Could not refresh the child's learning streak; using local data:", error);
    return {
      snapshot: local,
      remoteError: error instanceof Error
        ? error
        : new Error("Learning streak data could not be refreshed."),
    };
  }
};

export const hydrateChildStreak = async (
  childId: string,
  options: HydrateChildStreakOptions = {},
): Promise<ChildStreakSnapshot | null> => {
  const accountId = await getSessionAccountId();
  if (!accountId || !childId) return null;
  const key = snapshotIdentity(accountId, childId);
  const existing = hydrationPromises.get(key);
  const promise = existing ?? hydrateChildStreakImpl(accountId, childId).finally(() => {
    if (hydrationPromises.get(key) === promise) hydrationPromises.delete(key);
  });
  if (!existing) hydrationPromises.set(key, promise);
  const outcome = await promise;
  if (options.throwOnRemoteError && outcome.remoteError) throw outcome.remoteError;
  return outcome.snapshot;
};

const rpcData = (value: unknown): StreakRpcResult =>
  Array.isArray(value) ? (value[0] ?? {}) as StreakRpcResult : (value ?? {}) as StreakRpcResult;

const remapEpoch = (
  snapshot: ChildStreakSnapshot,
  fromEpochId: string,
  toEpochId: string,
): ChildStreakSnapshot => {
  if (!toEpochId || fromEpochId === toEpochId) return snapshot;
  const daysById = new Map<string, ChildStreakDay>();
  for (const candidate of snapshot.days) {
    const next = candidate.streakEpochId === fromEpochId
      ? { ...candidate, streakEpochId: toEpochId, dirty: true }
      : candidate;
    const identity = dayIdentity(next);
    const existing = daysById.get(identity);
    daysById.set(identity, existing ? mergeStreakDays(existing, next) : next);
  }
  const epochs = snapshot.epochs.map((epoch) =>
    epoch.id === fromEpochId ? { ...epoch, id: toEpochId } : epoch);
  return {
    ...snapshot,
    preferences: snapshot.preferences.currentEpochId === fromEpochId
      ? { ...snapshot.preferences, currentEpochId: toEpochId }
      : snapshot.preferences,
    epochs,
    days: [...daysById.values()],
    pendingTransitions: snapshot.pendingTransitions.map((item) => {
      if (item.kind === "set_enabled" && item.expectedEpochId === fromEpochId) {
        return { ...item, expectedEpochId: toEpochId };
      }
      if (item.kind === "reset" && item.expectedEpochId === fromEpochId) {
        return { ...item, expectedEpochId: toEpochId };
      }
      return item;
    }),
  };
};

const remapQueuedEpoch = async (
  accountId: string,
  childId: string,
  fromEpochId: string,
  toEpochId: string,
): Promise<void> => {
  if (!toEpochId || fromEpochId === toEpochId) return;
  await runSerializedQueue(accountId, async () => {
    const queue = await loadQueueUnlocked(accountId);
    await saveQueueUnlocked(accountId, queue.map((candidate): StreakQueueItem => {
      if (candidate.childId !== childId) return candidate;
      if (candidate.kind === "set_enabled" && candidate.expectedEpochId === fromEpochId) {
        return { ...candidate, expectedEpochId: toEpochId };
      }
      if (candidate.kind === "reset" && candidate.expectedEpochId === fromEpochId) {
        return { ...candidate, expectedEpochId: toEpochId };
      }
      if (candidate.kind === "day" && candidate.epochId === fromEpochId) {
        return {
          ...candidate,
          epochId: toEpochId,
          day: { ...candidate.day, streakEpochId: toEpochId },
        };
      }
      return candidate;
    }));
  });
};

const reconcileTransitionResponse = async (
  item: StreakTransitionQueueItem,
  response: StreakRpcResult,
): Promise<void> => {
  await runSerializedSnapshot(item.accountId, item.childId, async () => {
    const current = await loadLocalSnapshot(item.accountId, item.childId);
    if (!current) return;
    const queue = await loadQueue(item.accountId);
    const remaining = queue.filter((candidate) =>
      candidate.childId === item.childId &&
      candidate.kind !== "day" &&
      !(candidate.mutationId === item.mutationId && candidate.version === item.version));
    let next = current;
    const remotePreferences = response.preferences ? preferencesFromRow(response.preferences) : null;
    const remoteCurrent = response.current_epoch ? epochFromRow(response.current_epoch) : null;
    const remoteAffected = response.affected_epoch ? epochFromRow(response.affected_epoch) : null;

    if (item.kind === "create_default" && remotePreferences?.currentEpochId) {
      await remapQueuedEpoch(
        item.accountId,
        item.childId,
        item.epochId,
        remotePreferences.currentEpochId,
      );
      next = remapEpoch(next, item.epochId, remotePreferences.currentEpochId);
    }
    const epochs = new Map(next.epochs.map((epoch) => [epoch.id, epoch]));
    if (remoteCurrent) epochs.set(remoteCurrent.id, remoteCurrent);
    if (remoteAffected) epochs.set(remoteAffected.id, remoteAffected);

    const hasLaterStateTransition = remaining.some((candidate) =>
      candidate.kind === "create_default" || candidate.kind === "set_enabled" || candidate.kind === "reset");
    const hasLaterReminder = remaining.some((candidate) => candidate.kind === "set_reminders");
    if (remotePreferences) {
      next = {
        ...next,
        preferences: {
          ...remotePreferences,
          streakEnabled: hasLaterStateTransition
            ? next.preferences.streakEnabled
            : remotePreferences.streakEnabled,
          currentEpochId: hasLaterStateTransition
            ? next.preferences.currentEpochId
            : remotePreferences.currentEpochId,
          resetAt: hasLaterStateTransition
            ? maxIso(remotePreferences.resetAt, next.preferences.resetAt ?? remotePreferences.updatedAt)
            : remotePreferences.resetAt,
          includeInReminders: hasLaterReminder
            ? next.preferences.includeInReminders
            : remotePreferences.includeInReminders,
          updatedAt: hasLaterStateTransition || hasLaterReminder
            ? maxIso(remotePreferences.updatedAt, next.preferences.updatedAt)
            : remotePreferences.updatedAt,
        },
      };
    }

    if (!hasLaterStateTransition && (item.kind === "set_enabled" || item.kind === "reset")) {
      const provisionalId = item.newEpochId;
      if (provisionalId && provisionalId !== remotePreferences?.currentEpochId && !remoteCurrent) {
        epochs.delete(provisionalId);
      }
    }
    next = {
      ...next,
      epochs: [...epochs.values()],
      pendingTransitions: next.pendingTransitions.filter((pending) =>
        pending.mutationId !== item.mutationId || pending.version !== item.version),
    };
    await writeSnapshot(next);
  });
};

const reconcileDayResponse = async (
  item: DayQueueItem,
  response: StreakRpcResult,
): Promise<void> => {
  await runSerializedSnapshot(item.accountId, item.childId, async () => {
    const current = await loadLocalSnapshot(item.accountId, item.childId);
    if (!current) return;
    const index = current.days.findIndex((candidate) => dayIdentity(candidate) === dayIdentity(item.day));
    if (index < 0) return;
    const stored = current.days[index];
    if (stored.updatedAt !== item.version) return;
    const days = [...current.days];
    const remote = response.day ? dayFromRow(response.day) : null;
    if (remote) {
      days[index] = remote;
    } else {
      const epoch = current.epochs.find((candidate) => candidate.id === stored.streakEpochId);
      const normalized = epoch
        ? normalizeStreakDayForEpoch(
            stored,
            epoch,
            epoch.id === current.preferences.currentEpochId ? current.preferences.resetAt : null,
          )
        : null;
      if (normalized) days[index] = { ...normalized, dirty: false };
      else days.splice(index, 1);
    }
    await writeSnapshot({ ...current, days });
  });
};

const confirmTransitionSnapshotCleanup = async (
  item: StreakTransitionQueueItem,
): Promise<void> => {
  await runSerializedSnapshot(item.accountId, item.childId, async () => {
    const current = await loadLocalSnapshot(item.accountId, item.childId);
    if (!current) return;
    const pendingTransitions = current.pendingTransitions.filter((pending) =>
      pending.mutationId !== item.mutationId || pending.version !== item.version);
    if (pendingTransitions.length === current.pendingTransitions.length) return;
    await writeSnapshot({ ...current, pendingTransitions });
  });
};

const syncQueueItem = async (
  item: StreakQueueItem,
): Promise<{ terminalRejected: boolean; response: StreakRpcResult }> => {
  let data: unknown;
  let error: unknown;
  if (item.kind === "create_default") {
    ({ data, error } = await supabase.rpc("create_child_streak_state", {
      p_child_id: item.childId,
      p_epoch_id: item.epochId,
      p_started_at: item.occurredAt,
    }));
  } else if (item.kind === "set_enabled") {
    ({ data, error } = await supabase.rpc("set_child_streak_enabled", {
      p_child_id: item.childId,
      p_enabled: item.enabled,
      p_expected_epoch_id: item.expectedEpochId,
      p_new_epoch_id: item.newEpochId,
      p_occurred_at: item.occurredAt,
    }));
  } else if (item.kind === "reset") {
    ({ data, error } = await supabase.rpc("reset_child_streak", {
      p_child_id: item.childId,
      p_expected_epoch_id: item.expectedEpochId,
      p_new_epoch_id: item.newEpochId,
      p_occurred_at: item.occurredAt,
    }));
  } else if (item.kind === "set_reminders") {
    ({ data, error } = await supabase.rpc("set_child_streak_reminder_participation", {
      p_child_id: item.childId,
      p_include_in_reminders: item.includeInReminders,
    }));
  } else {
    ({ data, error } = await supabase.rpc("upsert_child_streak_day", {
      p_child_id: item.childId,
      p_epoch_id: item.epochId,
      p_local_date: item.localDate,
      p_first_timezone: item.day.firstTimezone,
      p_first_completed_at: item.day.firstCompletedAt,
      p_last_timezone: item.day.lastTimezone,
      p_last_completed_at: item.day.lastCompletedAt,
      p_source_type: item.day.sourceType,
      p_source_ref: item.day.sourceRef,
    }));
  }
  if (error) throw error;
  const response = rpcData(data);
  const terminalRejected = response.status === "rejected" || response.status === "stale";
  if (item.kind === "day") await reconcileDayResponse(item, response);
  else await reconcileTransitionResponse(item, response);
  return { terminalRejected, response };
};

const transitionPriority = (item: StreakTransitionQueueItem): number =>
  item.kind === "create_default" ? 0 : 1;

const syncDirtyStreakStateImpl = async (
  accountId?: string,
  childId?: string,
  mutationId?: string,
): Promise<StreakSyncResult> => {
  cancelScheduledStreakSync();
  const currentAccountId = await getSessionAccountId();
  const resolvedAccountId = accountId ?? currentAccountId;
  if (!resolvedAccountId || currentAccountId !== resolvedAccountId) {
    return { pushed: 0, rejected: 0, failed: 0, skipped: mutationId ? 1 : 0 };
  }
  await repairStreakQueue(resolvedAccountId);

  let pushed = 0;
  let rejected = 0;
  let failed = 0;
  let skipped = 0;
  const blockedChildren = new Set<string>();
  const touchedChildren = new Set<string>();
  const attemptedTransitions = new Set<string>();
  let targetMutationSeen = false;
  const countsTowardResult = (item: StreakQueueItem): boolean => {
    const matches = !mutationId || item.mutationId === mutationId;
    if (mutationId && matches) targetMutationSeen = true;
    return matches;
  };
  while (true) {
    const item = (await loadQueue(resolvedAccountId))
      .filter((candidate): candidate is StreakTransitionQueueItem =>
        candidate.kind !== "day" &&
        (!childId || candidate.childId === childId) &&
        !attemptedTransitions.has(`${candidate.mutationId}:${candidate.version}`))
      .sort((left, right) =>
        left.occurredAt.localeCompare(right.occurredAt) ||
        transitionPriority(left) - transitionPriority(right))[0];
    if (!item) break;
    attemptedTransitions.add(`${item.mutationId}:${item.version}`);
    if ((await getSessionAccountId()) !== resolvedAccountId) {
      if (countsTowardResult(item)) skipped += 1;
      continue;
    }
    if (blockedChildren.has(item.childId)) {
      if (countsTowardResult(item)) skipped += 1;
      continue;
    }
    try {
      const result = await syncQueueItem(item);
      const outcome = result.terminalRejected ? "rejected" : "pushed";
      rememberMutationSyncOutcome(resolvedAccountId, item.mutationId, outcome);
      if (countsTowardResult(item)) {
        if (outcome === "rejected") rejected += 1;
        else pushed += 1;
      }
      await removeConfirmedQueueItem(item);
      await confirmTransitionSnapshotCleanup(item);
      touchedChildren.add(item.childId);
    } catch (error) {
      if (countsTowardResult(item)) failed += 1;
      if (__DEV__) console.warn("Could not synchronize a streak transition:", error);
      if (item.kind !== "set_reminders") blockedChildren.add(item.childId);
    }
  }

  const days = (await loadQueue(resolvedAccountId))
    .filter((item): item is DayQueueItem =>
      item.kind === "day" && (!childId || item.childId === childId));
  for (const item of days) {
    if (blockedChildren.has(item.childId) || (await getSessionAccountId()) !== resolvedAccountId) {
      if (countsTowardResult(item)) skipped += 1;
      continue;
    }
    try {
      const result = await syncQueueItem(item);
      const outcome = result.terminalRejected || result.response.status === "stale"
        ? "rejected"
        : "pushed";
      rememberMutationSyncOutcome(resolvedAccountId, item.mutationId, outcome);
      if (countsTowardResult(item)) {
        if (outcome === "rejected") rejected += 1;
        else pushed += 1;
      }
      await removeConfirmedQueueItem(item);
      touchedChildren.add(item.childId);
    } catch (error) {
      if (countsTowardResult(item)) failed += 1;
      if (__DEV__) console.warn("Could not synchronize a streak day:", error);
    }
  }

  for (const childId of touchedChildren) {
    if ((await getSessionAccountId()) !== resolvedAccountId) break;
    await hydrateChildStreak(childId);
  }
  if (failed > 0 || (await loadQueue(resolvedAccountId)).length > 0) scheduleStreakSync(15_000);
  if (mutationId && !targetMutationSeen) {
    const previousOutcome = recentMutationSyncOutcomes.get(
      mutationSyncIdentity(resolvedAccountId, mutationId),
    );
    if (previousOutcome === "pushed") pushed += 1;
    else if (previousOutcome === "rejected") rejected += 1;
    else skipped += 1;
  }
  return { pushed, rejected, failed, skipped };
};

export const syncDirtyStreakState = async (
  accountId?: string,
  childId?: string,
  mutationId?: string,
): Promise<StreakSyncResult> => {
  const resolvedAccountId = accountId ?? (await getSessionAccountId());
  if (!resolvedAccountId) {
    return { pushed: 0, rejected: 0, failed: 0, skipped: mutationId ? 1 : 0 };
  }
  const previous = streakSyncTails.get(resolvedAccountId) ?? Promise.resolve();
  const run = previous
    .catch(() => undefined)
    .then(() => syncDirtyStreakStateImpl(resolvedAccountId, childId, mutationId));
  const tail = run.then(() => undefined, () => undefined);
  streakSyncTails.set(resolvedAccountId, tail);
  try {
    return await run;
  } finally {
    if (streakSyncTails.get(resolvedAccountId) === tail) {
      streakSyncTails.delete(resolvedAccountId);
    }
  }
};

export const getPendingStreakSyncCount = async (accountId?: string): Promise<number> => {
  const resolved = accountId ?? (await getSessionAccountId());
  return resolved ? (await loadQueue(resolved)).length : 0;
};

export const clearStreakMemory = (accountId?: string, childId?: string): void => {
  for (const [key, snapshot] of memorySnapshots) {
    if (
      (!accountId || snapshot.accountId === accountId) &&
      (!childId || snapshot.childId === childId)
    ) memorySnapshots.delete(key);
  }
};

export const clearChildStreakLocalData = async (
  childId: string,
  accountId?: string,
): Promise<void> => {
  const resolved = accountId ?? (await getSessionAccountId());
  if (!resolved || !childId) return;
  const keys = getStreakStorageKeys(resolved, childId);
  await AsyncStorage.multiRemove(Object.values(keys));
  await runSerializedQueue(resolved, async () => {
    const queue = await loadQueueUnlocked(resolved);
    await saveQueueUnlocked(resolved, queue.filter((item) => item.childId !== childId));
  });
  clearStreakMemory(resolved, childId);
};

const loadCachedAccountSnapshots = async (accountId: string): Promise<ChildStreakSnapshot[]> => {
  const prefix = `${STORAGE_PREFIX}:StreakSnapshot:${STREAK_VERSION}:${encode(accountId)}:`;
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix));
  const snapshots: ChildStreakSnapshot[] = [];
  for (const key of keys) {
    const childId = decodeURIComponent(key.slice(prefix.length));
    const snapshot = snapshotFromUnknown(
      safeParse<unknown>(await AsyncStorage.getItem(key)),
      accountId,
      childId,
    );
    if (snapshot) snapshots.push(snapshot);
  }
  return snapshots;
};

export const getLearningReminderCandidates = async (
  accountId: string,
): Promise<LearningReminderCandidate[]> => {
  if (!accountId || (await getSessionAccountId()) !== accountId) return [];
  const cached = await loadCachedAccountSnapshots(accountId);
  const candidates = new Map<string, LearningReminderCandidate>();
  for (const snapshot of cached) {
    if (
      snapshot.preferences.streakEnabled &&
      snapshot.preferences.includeInReminders &&
      snapshot.preferences.currentEpochId
    ) {
      candidates.set(snapshot.childId, {
        childId: snapshot.childId,
        name: "",
        completedToday: snapshot.summary.todayComplete,
      });
    }
  }

  try {
    const timezone = getDeviceTimezone();
    const today = toLocalDateKey(new Date(), timezone)!;
    const { data: children, error: childrenError } = await supabase
      .from("children")
      .select("id, name")
      .eq("parent_id", accountId)
      .is("deleted_at", null)
      .order("created_at");
    if (childrenError) throw childrenError;
    const childRows = (children ?? []) as { id: string; name: string }[];
    if (childRows.length === 0) return [];
    const childIds = childRows.map((child) => child.id);
    const [{ data: preferences, error: preferenceError }, { data: todayRows, error: dayError }] =
      await Promise.all([
        supabase.from("child_streak_preferences").select("*").in("child_id", childIds),
        supabase.from("child_streak_days")
          .select("child_id, streak_epoch_id, local_date")
          .in("child_id", childIds)
          .eq("local_date", today),
      ]);
    if (preferenceError) throw preferenceError;
    if (dayError) throw dayError;
    const preferencesByChild = new Map(
      ((preferences ?? []) as Record<string, unknown>[])
        .map(preferencesFromRow)
        .filter((item): item is ChildStreakPreferences => Boolean(item))
        .map((item) => [item.childId, item]),
    );
    const remoteCompleted = new Set(
      ((todayRows ?? []) as { child_id: string; streak_epoch_id: string }[]).map(
        (row) => `${row.child_id}:${row.streak_epoch_id}`,
      ),
    );
    const activeIds = new Set(childIds);
    for (const cachedId of candidates.keys()) {
      if (!activeIds.has(cachedId)) candidates.delete(cachedId);
    }
    for (const child of childRows) {
      const local = cached.find((snapshot) => snapshot.childId === child.id);
      const preference = local?.preferences ?? preferencesByChild.get(child.id);
      if (!preference?.streakEnabled || !preference.includeInReminders || !preference.currentEpochId) {
        candidates.delete(child.id);
        continue;
      }
      candidates.set(child.id, {
        childId: child.id,
        name: child.name,
        completedToday:
          local?.summary.todayComplete === true ||
          remoteCompleted.has(`${child.id}:${preference.currentEpochId}`),
      });
    }
  } catch (error) {
    if (__DEV__) console.warn("Could not revalidate reminder candidates; using streak cache:", error);
  }
  return [...candidates.values()];
};

const inferLegacyTransitions = (snapshot: ChildStreakSnapshot): StreakPendingTransition[] => {
  if (snapshot.persistenceProtocolVersion === 1) return [];
  if (snapshot.pendingTransitions.length > 0) return [];
  const boundary = snapshot.preferences.resetAt;
  if (!boundary) return [];
  const closed = snapshot.epochs.find((epoch) =>
    epoch.dirty && epoch.endedAt === boundary &&
    (epoch.endReason === "reset" || epoch.endReason === "disabled"));
  const active = snapshot.epochs.find((epoch) =>
    epoch.dirty && epoch.endedAt === null && epoch.startedAt === boundary);
  const mutationId = createUuid();
  if (closed?.endReason === "reset" && active && snapshot.preferences.currentEpochId === active.id) {
    return [{
      kind: "reset",
      mutationId,
      accountId: snapshot.accountId,
      childId: snapshot.childId,
      expectedEpochId: closed.id,
      newEpochId: active.id,
      occurredAt: boundary,
      version: mutationId,
    }];
  }
  if (closed?.endReason === "disabled" && !snapshot.preferences.streakEnabled) {
    return [{
      kind: "set_enabled",
      mutationId,
      accountId: snapshot.accountId,
      childId: snapshot.childId,
      enabled: false,
      expectedEpochId: closed.id,
      newEpochId: null,
      occurredAt: boundary,
      version: mutationId,
    }];
  }
  if (active && snapshot.preferences.streakEnabled) {
    return [{
      kind: "set_enabled",
      mutationId,
      accountId: snapshot.accountId,
      childId: snapshot.childId,
      enabled: true,
      expectedEpochId: null,
      newEpochId: active.id,
      occurredAt: boundary,
      version: mutationId,
    }];
  }
  return [];
};

const withPendingTransition = (
  snapshot: ChildStreakSnapshot,
  transition: StreakPendingTransition,
): ChildStreakSnapshot => {
  if (snapshot.pendingTransitions.some((pending) =>
    pending.mutationId === transition.mutationId && pending.version === transition.version)) {
    return snapshot;
  }
  return { ...snapshot, pendingTransitions: [...snapshot.pendingTransitions, transition] };
};

const snapshotFromCreateTransition = (
  transition: Extract<StreakPendingTransition, { kind: "create_default" }>,
): ChildStreakSnapshot => {
  const epoch: ChildStreakEpoch = {
    id: transition.epochId,
    childId: transition.childId,
    startedAt: transition.occurredAt,
    endedAt: null,
    endReason: null,
    updatedAt: transition.occurredAt,
    dirty: true,
  };
  const preferences: ChildStreakPreferences = {
    childId: transition.childId,
    streakEnabled: true,
    includeInReminders: true,
    currentEpochId: transition.epochId,
    resetAt: transition.occurredAt,
    updatedAt: transition.occurredAt,
  };
  return {
    persistenceProtocolVersion: 1,
    accountId: transition.accountId,
    childId: transition.childId,
    preferences,
    epochs: [epoch],
    days: [],
    pendingTransitions: [transition],
    summary: deriveStreakSummary([], [epoch], preferences),
    hydratedAt: null,
  };
};

const applyQueuedTransitionLocally = (
  snapshot: ChildStreakSnapshot,
  transition: StreakPendingTransition,
): ChildStreakSnapshot => {
  if (transition.kind === "create_default") {
    return snapshot.preferences.currentEpochId === transition.epochId
      ? withPendingTransition(snapshot, transition)
      : snapshot;
  }

  if (transition.kind === "set_reminders") {
    return withPendingTransition({
      ...snapshot,
      preferences: {
        ...snapshot.preferences,
        includeInReminders: transition.includeInReminders,
        updatedAt: maxIso(snapshot.preferences.updatedAt, transition.occurredAt),
      },
    }, transition);
  }

  const resetAt = snapshot.preferences.resetAt;
  if (resetAt && transition.occurredAt < resetAt) return snapshot;
  if (resetAt && transition.occurredAt === resetAt) {
    const exact = transition.kind === "reset"
      ? snapshot.preferences.streakEnabled &&
        snapshot.preferences.currentEpochId === transition.newEpochId &&
        snapshot.epochs.some((epoch) =>
          epoch.id === transition.expectedEpochId &&
          epoch.endedAt === transition.occurredAt &&
          epoch.endReason === "reset")
      : transition.enabled
        ? snapshot.preferences.streakEnabled &&
          snapshot.preferences.currentEpochId === transition.newEpochId
        : !snapshot.preferences.streakEnabled &&
          snapshot.preferences.currentEpochId === null &&
          snapshot.epochs.some((epoch) =>
            epoch.id === transition.expectedEpochId &&
            epoch.endedAt === transition.occurredAt &&
            epoch.endReason === "disabled");
    return exact ? withPendingTransition(snapshot, transition) : snapshot;
  }

  if (transition.kind === "reset") {
    if (
      !snapshot.preferences.streakEnabled ||
      snapshot.preferences.currentEpochId !== transition.expectedEpochId
    ) return snapshot;
    const active = snapshot.epochs.find((epoch) =>
      epoch.id === transition.expectedEpochId && epoch.endedAt === null);
    if (!active || transition.occurredAt < active.startedAt) return snapshot;
    const epochs = [
      ...closeEpoch(snapshot.epochs, active.id, transition.occurredAt, "reset"),
      ...(snapshot.epochs.some((epoch) => epoch.id === transition.newEpochId)
        ? []
        : [{
            id: transition.newEpochId,
            childId: transition.childId,
            startedAt: transition.occurredAt,
            endedAt: null,
            endReason: null,
            updatedAt: transition.occurredAt,
            dirty: true,
          } satisfies ChildStreakEpoch]),
    ];
    return withPendingTransition({
      ...snapshot,
      preferences: {
        ...snapshot.preferences,
        currentEpochId: transition.newEpochId,
        resetAt: transition.occurredAt,
        updatedAt: transition.occurredAt,
      },
      epochs,
    }, transition);
  }

  if (transition.enabled) {
    if (
      snapshot.preferences.streakEnabled ||
      snapshot.preferences.currentEpochId !== null ||
      transition.expectedEpochId !== null ||
      !transition.newEpochId
    ) return snapshot;
    const epochs = snapshot.epochs.some((epoch) => epoch.id === transition.newEpochId)
      ? snapshot.epochs
      : [...snapshot.epochs, {
          id: transition.newEpochId,
          childId: transition.childId,
          startedAt: transition.occurredAt,
          endedAt: null,
          endReason: null,
          updatedAt: transition.occurredAt,
          dirty: true,
        } satisfies ChildStreakEpoch];
    return withPendingTransition({
      ...snapshot,
      preferences: {
        ...snapshot.preferences,
        streakEnabled: true,
        currentEpochId: transition.newEpochId,
        resetAt: transition.occurredAt,
        updatedAt: transition.occurredAt,
      },
      epochs,
    }, transition);
  }

  if (
    !snapshot.preferences.streakEnabled ||
    !transition.expectedEpochId ||
    snapshot.preferences.currentEpochId !== transition.expectedEpochId
  ) return snapshot;
  const active = snapshot.epochs.find((epoch) =>
    epoch.id === transition.expectedEpochId && epoch.endedAt === null);
  if (!active || transition.occurredAt < active.startedAt) return snapshot;
  return withPendingTransition({
    ...snapshot,
    preferences: {
      ...snapshot.preferences,
      streakEnabled: false,
      currentEpochId: null,
      resetAt: transition.occurredAt,
      updatedAt: transition.occurredAt,
    },
    epochs: closeEpoch(snapshot.epochs, active.id, transition.occurredAt, "disabled"),
  }, transition);
};

export const repairStreakQueue = async (accountId?: string): Promise<number> => {
  const resolved = accountId ?? (await getSessionAccountId());
  if (!resolved || (await getSessionAccountId()) !== resolved) return 0;
  let repaired = 0;

  const queued = await loadQueue(resolved);
  const queuedTransitions = queued
    .filter((item): item is StreakPendingTransition => item.kind !== "day")
    .sort((left, right) =>
      left.occurredAt.localeCompare(right.occurredAt) || transitionPriority(left) - transitionPriority(right));
  const queuedDays = queued.filter((item): item is DayQueueItem => item.kind === "day");
  const childIds = [...new Set(queued.map((item) => item.childId))];
  for (const childId of childIds) {
    await runSerializedSnapshot(resolved, childId, async () => {
      const childTransitions = queuedTransitions.filter((item) => item.childId === childId);
      let snapshot = await loadLocalSnapshot(resolved, childId);
      if (!snapshot) {
        const creation = childTransitions.find(
          (item): item is Extract<StreakPendingTransition, { kind: "create_default" }> =>
            item.kind === "create_default",
        );
        if (!creation) return;
        snapshot = snapshotFromCreateTransition(creation);
      }
      const original = snapshot;
      for (const transition of childTransitions) {
        snapshot = applyQueuedTransitionLocally(snapshot, transition);
      }
      for (const item of queuedDays.filter((candidate) => candidate.childId === childId)) {
        const epoch = snapshot.epochs.find((candidate) => candidate.id === item.epochId);
        const normalized = epoch
          ? normalizeStreakDayForEpoch(
              item.day,
              epoch,
              epoch.id === snapshot.preferences.currentEpochId
                ? snapshot.preferences.resetAt
                : null,
            )
          : null;
        if (!normalized) continue;
        const index = snapshot.days.findIndex((candidate) =>
          dayIdentity(candidate) === dayIdentity(normalized));
        if (index >= 0 && snapshot.days[index].updatedAt > item.version) continue;
        const days: ChildStreakDay[] = [...snapshot.days];
        days[index >= 0 ? index : days.length] = index >= 0
          ? { ...mergeStreakDays(days[index], normalized), dirty: true }
          : { ...normalized, dirty: true };
        snapshot = { ...snapshot, days };
      }
      if (snapshot !== original || !memorySnapshots.has(snapshotIdentity(resolved, childId))) {
        await writeSnapshot(snapshot);
        repaired += 1;
      }
    });
  }

  const snapshots = await loadCachedAccountSnapshots(resolved);
  for (const snapshot of snapshots) {
    const transitions = [...snapshot.pendingTransitions, ...inferLegacyTransitions(snapshot)];
    for (const transition of transitions) {
      await enqueue(transition);
      repaired += 1;
    }
    for (const day of snapshot.days) {
      if (!day.dirty) continue;
      await enqueue({
        kind: "day",
        mutationId: dayMutationId(day),
        accountId: resolved,
        childId: day.childId,
        epochId: day.streakEpochId,
        localDate: day.localDate,
        day,
        version: day.updatedAt,
      });
      repaired += 1;
    }
  }
  return repaired;
};
