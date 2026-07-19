import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { brandColors } from "@/constants/Brand";
import { getLearningReminderCandidates } from "@/lib/streakRepository";
import { supabase } from "@/lib/supabase";

const LEARNING_REMINDER_SETTINGS_PREFIX = "@BabySteps:LearningReminderSettings:v1";
const LEARNING_REMINDER_CANCELLATION_LEDGER_KEY =
  "@BabySteps:LearningReminderCancellationLedger:v1";
const LEGACY_NOTIFICATION_PREFERENCES_KEY = "@baby_steps_notification_preferences";
const LEARNING_REMINDER_SCOPE = "baby-steps-learning-reminder-v1";
const MAX_LEDGER_ACCOUNTS = 32;
const MAX_LEDGER_IDS_PER_ACCOUNT = 64;
export const LEARNING_REMINDER_CHANNEL_ID = "learning-reminders";
export const DEFAULT_LEARNING_REMINDER_TIME = "18:00";

export type NotificationPermissionState = "granted" | "denied" | "undetermined" | "unavailable";

export type LearningReminderSettings = {
  accountId: string | null;
  enabled: boolean;
  reminderTime: string;
  showChildNames: boolean;
  scheduledNotificationIds: string[];
  scheduleFingerprint: string | null;
  updatedAt: string | null;
};

export type NotificationPreferences = LearningReminderSettings;

export type GroupedReminderCopy = {
  title: string;
  body: string;
};

type CancellationLedgerEntry = {
  ownerToken: string;
  notificationIds: string[];
};

type CancellationLedger = {
  entries: CancellationLedgerEntry[];
};

const notificationTails = new Map<string, Promise<void>>();
let cancellationLedgerTail: Promise<void> = Promise.resolve();

const defaultPreferences = (accountId: string | null): NotificationPreferences => ({
  accountId,
  enabled: false,
  reminderTime: DEFAULT_LEARNING_REMINDER_TIME,
  showChildNames: false,
  scheduledNotificationIds: [],
  scheduleFingerprint: null,
  updatedAt: null,
});

const isNativeNotificationsAvailable = () => Platform.OS === "ios" || Platform.OS === "android";

const uniqueIds = (ids: readonly string[]): string[] =>
  [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))];

const accountOwnerToken = (accountId: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < accountId.length; index += 1) {
    hash ^= accountId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `acct-${(hash >>> 0).toString(16).padStart(8, "0")}`;
};

const runSerializedNotificationOperation = <T>(
  accountId: string,
  operation: () => Promise<T>,
): Promise<T> => {
  const previous = notificationTails.get(accountId) ?? Promise.resolve();
  const result = previous.then(operation);
  const tail = result.then(
    () => {
      if (notificationTails.get(accountId) === tail) notificationTails.delete(accountId);
    },
    () => {
      if (notificationTails.get(accountId) === tail) notificationTails.delete(accountId);
    },
  );
  notificationTails.set(accountId, tail);
  return result;
};

const runSerializedCancellationLedger = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = cancellationLedgerTail.then(operation);
  cancellationLedgerTail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

const getAccountId = async (accountId?: string): Promise<string | null> => {
  if (accountId) return accountId;
  const auth = supabase.auth as (typeof supabase.auth & {
    getSession?: typeof supabase.auth.getSession;
    getUser?: typeof supabase.auth.getUser;
  }) | undefined;
  if (auth && typeof auth.getSession === "function") {
    const result = await auth.getSession();
    if (!result) return null;
    const { data } = result;
    return data.session?.user.id ?? null;
  }
  if (auth && typeof auth.getUser === "function") {
    const { data } = await auth.getUser();
    return data.user?.id ?? null;
  }
  return null;
};

export const getLearningReminderSettingsStorageKey = (accountId: string): string =>
  `${LEARNING_REMINDER_SETTINGS_PREFIX}:${encodeURIComponent(accountId)}`;

export const getLearningReminderCancellationLedgerStorageKey = (): string =>
  LEARNING_REMINDER_CANCELLATION_LEDGER_KEY;

const isReminderTime = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
};

const saveNotificationPreferences = async (preferences: NotificationPreferences) => {
  if (!preferences.accountId) return;
  await AsyncStorage.setItem(
    getLearningReminderSettingsStorageKey(preferences.accountId),
    JSON.stringify(preferences),
  );
};

const readNotificationPreferences = async (
  accountId: string,
): Promise<NotificationPreferences> => {
  const stored = await AsyncStorage.getItem(getLearningReminderSettingsStorageKey(accountId));
  if (!stored) return defaultPreferences(accountId);
  const parsed = JSON.parse(stored) as Partial<NotificationPreferences> & { scheduledIds?: unknown };
  return {
    accountId,
    enabled: parsed.enabled === true,
    reminderTime: isReminderTime(parsed.reminderTime)
      ? parsed.reminderTime
      : DEFAULT_LEARNING_REMINDER_TIME,
    showChildNames: parsed.showChildNames === true,
    scheduledNotificationIds: uniqueIds(
      Array.isArray(parsed.scheduledNotificationIds)
        ? parsed.scheduledNotificationIds
        : Array.isArray(parsed.scheduledIds)
          ? parsed.scheduledIds
          : [],
    ),
    scheduleFingerprint:
      typeof parsed.scheduleFingerprint === "string" ? parsed.scheduleFingerprint : null,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
  };
};

const readCancellationLedger = async (): Promise<CancellationLedger> => {
  const stored = await AsyncStorage.getItem(LEARNING_REMINDER_CANCELLATION_LEDGER_KEY);
  if (!stored) return { entries: [] };
  const parsed = JSON.parse(stored) as Partial<CancellationLedger>;
  if (!Array.isArray(parsed.entries)) return { entries: [] };
  return {
    entries: parsed.entries
      .filter((entry): entry is CancellationLedgerEntry =>
        Boolean(entry) &&
        typeof entry.ownerToken === "string" &&
        Array.isArray(entry.notificationIds))
      .map((entry) => ({
        ownerToken: entry.ownerToken,
        notificationIds: uniqueIds(entry.notificationIds),
      }))
      .filter((entry) => entry.notificationIds.length > 0)
      .slice(0, MAX_LEDGER_ACCOUNTS),
  };
};

const saveCancellationLedger = async (ledger: CancellationLedger): Promise<void> => {
  if (ledger.entries.length === 0) {
    await AsyncStorage.removeItem(LEARNING_REMINDER_CANCELLATION_LEDGER_KEY);
    return;
  }
  await AsyncStorage.setItem(
    LEARNING_REMINDER_CANCELLATION_LEDGER_KEY,
    JSON.stringify(ledger),
  );
};

const setLedgerIds = (ownerToken: string, ids: readonly string[]): Promise<void> =>
  runSerializedCancellationLedger(async () => {
    const ledger = await readCancellationLedger();
    const nextIds = uniqueIds(ids);
    if (nextIds.length > MAX_LEDGER_IDS_PER_ACCOUNT) {
      throw new Error("Too many scoped learning reminder identifiers to cancel safely.");
    }
    const existingIndex = ledger.entries.findIndex((entry) => entry.ownerToken === ownerToken);
    const entries = [...ledger.entries];
    if (nextIds.length === 0) {
      if (existingIndex >= 0) entries.splice(existingIndex, 1);
    } else if (existingIndex >= 0) {
      entries[existingIndex] = { ownerToken, notificationIds: nextIds };
    } else {
      if (entries.length >= MAX_LEDGER_ACCOUNTS) {
        throw new Error("Learning reminder cancellation ledger is full.");
      }
      entries.push({ ownerToken, notificationIds: nextIds });
    }
    await saveCancellationLedger({ entries });
  });

const ledgerIdsFor = async (ownerToken: string): Promise<string[]> =>
  (await readCancellationLedger()).entries.find((entry) => entry.ownerToken === ownerToken)
    ?.notificationIds ?? [];

export async function getNotificationPreferences(
  accountId?: string,
): Promise<NotificationPreferences> {
  const resolvedAccountId = await getAccountId(accountId);
  if (!resolvedAccountId) return defaultPreferences(null);

  try {
    const stored = await AsyncStorage.getItem(
      getLearningReminderSettingsStorageKey(resolvedAccountId),
    );
    if (stored) return readNotificationPreferences(resolvedAccountId);

    const legacyStored = await AsyncStorage.getItem(LEGACY_NOTIFICATION_PREFERENCES_KEY);
    if (!legacyStored) return defaultPreferences(resolvedAccountId);
    const legacy = JSON.parse(legacyStored) as {
      enabled?: unknown;
      scheduledIds?: unknown;
      updatedAt?: unknown;
    };
    const legacyIds = Array.isArray(legacy.scheduledIds)
      ? legacy.scheduledIds.filter((id): id is string => typeof id === "string")
      : [];
    if (isNativeNotificationsAvailable()) {
      await cancelIdsDurably(accountOwnerToken(resolvedAccountId), legacyIds);
    }
    await AsyncStorage.removeItem(LEGACY_NOTIFICATION_PREFERENCES_KEY);
    const migrated: NotificationPreferences = {
      ...defaultPreferences(resolvedAccountId),
      enabled: legacy.enabled === true,
      updatedAt: typeof legacy.updatedAt === "string" ? legacy.updatedAt : new Date().toISOString(),
    };
    await saveNotificationPreferences(migrated);
    return migrated;
  } catch (error) {
    console.warn("Could not read learning reminder settings:", error);
    return defaultPreferences(resolvedAccountId);
  }
}

export function configureNotificationPresentation() {
  if (!isNativeNotificationsAvailable()) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  void retryPendingLearningReminderCancellations().catch((error) => {
    console.warn("Could not retry pending learning reminder cancellations:", error);
  });
}

async function ensureLearningReminderChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(LEARNING_REMINDER_CHANNEL_ID, {
    name: "Learning reminders",
    description: "One gentle daily Baby Steps learning reminder.",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: brandColors.equatorialGold,
    sound: "default",
    showBadge: false,
  });
}

const permissionStateFromSettings = (
  settings: Notifications.NotificationPermissionsStatus,
): NotificationPermissionState => {
  if (settings.granted) return "granted";
  const iosStatus = settings.ios?.status;
  if (
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
  ) return "granted";
  return settings.status === Notifications.PermissionStatus.DENIED ? "denied" : "undetermined";
};

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (!isNativeNotificationsAvailable()) return "unavailable";
  try {
    return permissionStateFromSettings(await Notifications.getPermissionsAsync());
  } catch (error) {
    console.warn("Could not read notification permission:", error);
    return "unavailable";
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNativeNotificationsAvailable()) return "unavailable";
  try {
    await ensureLearningReminderChannel();
    const current = await Notifications.getPermissionsAsync();
    const currentState = permissionStateFromSettings(current);
    if (currentState === "granted" || currentState === "denied") return currentState;
    return permissionStateFromSettings(await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    }));
  } catch (error) {
    console.warn("Could not request notification permission:", error);
    return "unavailable";
  }
}

const cancelIdsDurably = async (
  ownerToken: string,
  ids: readonly string[],
): Promise<string[]> => {
  const pending = uniqueIds([...(await ledgerIdsFor(ownerToken)), ...ids]);
  if (pending.length === 0) return [];
  await setLedgerIds(ownerToken, pending);
  const failed: string[] = [];
  for (const id of pending) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (error) {
      failed.push(id);
      console.warn("Could not cancel a scheduled Baby Steps learning reminder:", error);
    }
  }
  await setLedgerIds(ownerToken, failed);
  return failed;
};

export const retryPendingLearningReminderCancellations = async (): Promise<number> => {
  if (!isNativeNotificationsAvailable()) return 0;
  const ledger = await readCancellationLedger();
  let remaining = 0;
  for (const entry of ledger.entries) {
    remaining += (await cancelIdsDurably(entry.ownerToken, entry.notificationIds)).length;
  }
  return remaining;
};

const safeFirstName = (name: string): string | null => {
  const firstName = name.trim().split(/\s+/)[0] ?? "";
  return /^[\p{L}\p{M}'’-]{1,30}$/u.test(firstName) ? firstName : null;
};

export const buildGroupedReminderCopy = (
  names: readonly string[],
  showChildNames: boolean,
): GroupedReminderCopy => {
  const generic = {
    title: "Baby Steps learning time",
    body: "A little learning today can build a strong habit.",
  };
  if (!showChildNames || names.length === 0) return generic;
  const safeNames = names.map(safeFirstName);
  if (safeNames.some((name) => !name)) return generic;
  const firstNames = safeNames as string[];
  if (firstNames.length === 1) {
    return { ...generic, body: `${firstNames[0]} can complete a lesson, game, story, or coloring activity today.` };
  }
  if (firstNames.length === 2) {
    return { ...generic, body: `${firstNames[0]} and ${firstNames[1]} can do a little learning today.` };
  }
  return {
    ...generic,
    body: `${firstNames[0]}, ${firstNames[1]}, and ${firstNames.length - 2} others can do a little learning today.`,
  };
};

const parseReminderTime = (value: string): { hour: number; minute: number } => {
  const normalized = isReminderTime(value) ? value : DEFAULT_LEARNING_REMINDER_TIME;
  const [hour, minute] = normalized.split(":").map(Number);
  return { hour, minute };
};

const tomorrowAt = (hour: number, minute: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const getScopedScheduledIds = async (ownerToken: string): Promise<string[]> => {
  const getAll = (Notifications as typeof Notifications & {
    getAllScheduledNotificationsAsync?: () => Promise<Notifications.NotificationRequest[]>;
  }).getAllScheduledNotificationsAsync;
  if (typeof getAll !== "function") return [];
  try {
    return (await getAll())
      .filter((request) => {
        const data = request.content.data;
        return data?.babyStepsScope === LEARNING_REMINDER_SCOPE && data?.ownerToken === ownerToken;
      })
      .map((request) => request.identifier);
  } catch (error) {
    console.warn("Could not inspect scheduled Baby Steps learning reminders:", error);
    return [];
  }
};

const persistCancellationBlockedState = async (
  current: NotificationPreferences,
  failedIds: string[],
): Promise<NotificationPreferences> => {
  const next = {
    ...current,
    scheduledNotificationIds: uniqueIds(failedIds),
    scheduleFingerprint: null,
    updatedAt: new Date().toISOString(),
  };
  await saveNotificationPreferences(next);
  return next;
};

const disableInsideOperation = async (
  current: NotificationPreferences,
  enabled: boolean,
): Promise<NotificationPreferences> => {
  const accountId = current.accountId;
  if (!accountId) return current;
  const ownerToken = accountOwnerToken(accountId);
  const ids = uniqueIds([
    ...current.scheduledNotificationIds,
    ...(await getScopedScheduledIds(ownerToken)),
    ...(await ledgerIdsFor(ownerToken)),
  ]);
  const failed = isNativeNotificationsAvailable()
    ? await cancelIdsDurably(ownerToken, ids)
    : [];
  const next = {
    ...current,
    enabled,
    scheduledNotificationIds: failed,
    scheduleFingerprint: null,
    updatedAt: new Date().toISOString(),
  };
  await saveNotificationPreferences(next);
  return next;
};

const scheduleInsideOperation = async (
  accountId: string,
  permissionAlreadyGranted: boolean,
): Promise<NotificationPreferences> => {
  const current = await readNotificationPreferences(accountId);
  const ownerToken = accountOwnerToken(accountId);

  const pendingFailures = await cancelIdsDurably(ownerToken, await ledgerIdsFor(ownerToken));
  if (pendingFailures.length > 0) {
    return persistCancellationBlockedState(current, pendingFailures);
  }
  if (!permissionAlreadyGranted) {
    const permission = await getNotificationPermissionState();
    if (permission !== "granted") return disableInsideOperation(current, false);
  }

  const candidates = await getLearningReminderCandidates(accountId);
  const incomplete = candidates.filter((candidate) => !candidate.completedToday);
  const allCompleted = candidates.length > 0 && incomplete.length === 0;
  const namedCandidates = allCompleted ? candidates : incomplete;
  const copy = buildGroupedReminderCopy(
    namedCandidates.map((candidate) => candidate.name),
    current.showChildNames,
  );
  const { hour, minute } = parseReminderTime(current.reminderTime);
  const fingerprint = JSON.stringify({
    allCompleted,
    candidateIds: namedCandidates.map((candidate) => candidate.childId).sort(),
    copy,
    hour,
    minute,
  });
  const inspectedIds = await getScopedScheduledIds(ownerToken);
  const knownIds = uniqueIds([...current.scheduledNotificationIds, ...inspectedIds]);

  if ((await getAccountId()) !== accountId) {
    return disableInsideOperation(current, true);
  }

  if (candidates.length === 0) {
    const failed = await cancelIdsDurably(ownerToken, knownIds);
    if (failed.length > 0) return persistCancellationBlockedState(current, failed);
    const next = {
      ...current,
      enabled: true,
      scheduledNotificationIds: [],
      scheduleFingerprint: fingerprint,
      updatedAt: new Date().toISOString(),
    };
    await saveNotificationPreferences(next);
    return next;
  }

  if (knownIds.length === 1 && current.scheduleFingerprint === fingerprint) {
    if (current.scheduledNotificationIds[0] !== knownIds[0]) {
      const adopted = { ...current, scheduledNotificationIds: knownIds };
      await saveNotificationPreferences(adopted);
      return adopted;
    }
    return current;
  }

  const failed = await cancelIdsDurably(ownerToken, knownIds);
  if (failed.length > 0) return persistCancellationBlockedState(current, failed);

  await ensureLearningReminderChannel();
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: copy.title,
      body: copy.body,
      sound: "default",
      data: {
        url: "/parent",
        kind: "learning-reminder",
        babyStepsScope: LEARNING_REMINDER_SCOPE,
        ownerToken,
      },
    },
    trigger: allCompleted
      ? {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: tomorrowAt(hour, minute),
          channelId: LEARNING_REMINDER_CHANNEL_ID,
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: LEARNING_REMINDER_CHANNEL_ID,
        },
  });

  // The new native ID is journaled before the settings write. If that write
  // fails, restart/sign-out recovery can still discover and cancel it.
  await setLedgerIds(ownerToken, [identifier]);
  if ((await getAccountId()) !== accountId) {
    const failedAfterAccountChange = await cancelIdsDurably(ownerToken, [identifier]);
    return persistCancellationBlockedState(current, failedAfterAccountChange);
  }
  const next: NotificationPreferences = {
    ...current,
    enabled: true,
    scheduledNotificationIds: [identifier],
    scheduleFingerprint: fingerprint,
    updatedAt: new Date().toISOString(),
  };
  await saveNotificationPreferences(next);
  await setLedgerIds(ownerToken, []);
  return next;
};

export async function disableRecurringReminders(
  accountId?: string,
): Promise<NotificationPreferences> {
  const resolved = await getAccountId(accountId);
  if (!resolved) return defaultPreferences(null);
  return runSerializedNotificationOperation(resolved, async () =>
    disableInsideOperation(await readNotificationPreferences(resolved), false));
}

export async function deactivateAccountLearningReminders(
  accountId: string,
): Promise<NotificationPreferences> {
  if (!accountId) return defaultPreferences(null);
  return runSerializedNotificationOperation(accountId, async () =>
    disableInsideOperation(await readNotificationPreferences(accountId), true));
}

export async function scheduleRecurringReminders(
  permissionAlreadyGranted = false,
  accountId?: string,
): Promise<NotificationPreferences> {
  const resolved = await getAccountId(accountId);
  if (!resolved) return defaultPreferences(null);
  if (!isNativeNotificationsAvailable()) return disableRecurringReminders(resolved);
  const signedInAccount = await getAccountId();
  if (signedInAccount !== resolved) return deactivateAccountLearningReminders(resolved);
  return runSerializedNotificationOperation(resolved, () =>
    scheduleInsideOperation(resolved, permissionAlreadyGranted));
}

export async function updateLearningReminderSettings(
  updates: Partial<Pick<NotificationPreferences, "reminderTime" | "showChildNames">>,
  accountId?: string,
): Promise<NotificationPreferences> {
  const resolved = await getAccountId(accountId);
  if (!resolved) return defaultPreferences(null);
  return runSerializedNotificationOperation(resolved, async () => {
    const current = await readNotificationPreferences(resolved);
    const next = {
      ...current,
      reminderTime: isReminderTime(updates.reminderTime)
        ? updates.reminderTime
        : current.reminderTime,
      showChildNames: typeof updates.showChildNames === "boolean"
        ? updates.showChildNames
        : current.showChildNames,
      scheduleFingerprint: null,
      updatedAt: new Date().toISOString(),
    };
    await saveNotificationPreferences(next);
    return next.enabled ? scheduleInsideOperation(resolved, true) : next;
  });
}

export async function requestAndEnableRecurringReminders(
  accountId?: string,
): Promise<NotificationPermissionState> {
  const resolved = await getAccountId(accountId);
  if (!resolved) return "unavailable";
  const permission = await requestNotificationPermission();
  await runSerializedNotificationOperation(resolved, async () => {
    const current = await readNotificationPreferences(resolved);
    if (permission !== "granted") {
      await disableInsideOperation(current, false);
      return;
    }
    await saveNotificationPreferences({
      ...current,
      enabled: true,
      updatedAt: new Date().toISOString(),
    });
    await scheduleInsideOperation(resolved, true);
  });
  return permission;
}

export async function syncRecurringRemindersIfEnabled(accountId?: string) {
  const resolved = await getAccountId(accountId);
  if (!resolved) return defaultPreferences(null);
  return runSerializedNotificationOperation(resolved, async () => {
    const current = await readNotificationPreferences(resolved);
    if (!current.enabled) return current;
    const signedInAccount = await getAccountId();
    if (signedInAccount !== resolved) return disableInsideOperation(current, true);
    const permission = await getNotificationPermissionState();
    if (permission !== "granted") return disableInsideOperation(current, false);
    return scheduleInsideOperation(resolved, true);
  });
}

export async function sendTestLearningReminder() {
  const permission = await getNotificationPermissionState();
  if (permission !== "granted") throw new Error("Notification permission is not granted.");
  await ensureLearningReminderChannel();
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Baby Steps learning time",
      body: "A little learning today can build a strong habit.",
      sound: "default",
      data: { url: "/parent", kind: "test-learning-reminder" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      channelId: LEARNING_REMINDER_CHANNEL_ID,
    },
  });
}

export function observeNotificationOpens(onOpenUrl: (url: string) => void) {
  if (!isNativeNotificationsAvailable()) return () => undefined;
  const openResponse = async (response: Notifications.NotificationResponse | null) => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url === "string") {
      onOpenUrl(url);
      await Notifications.clearLastNotificationResponseAsync();
    }
  };
  void Notifications.getLastNotificationResponseAsync().then(openResponse);
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    void openResponse(response);
  });
  return () => subscription.remove();
}
