export type StreakEpochEndReason = "reset" | "disabled" | "replaced";

export type ChildStreakPreferences = {
  childId: string;
  streakEnabled: boolean;
  includeInReminders: boolean;
  currentEpochId: string | null;
  resetAt: string | null;
  updatedAt: string;
};

export type ChildStreakEpoch = {
  id: string;
  childId: string;
  startedAt: string;
  endedAt: string | null;
  endReason: StreakEpochEndReason | null;
  createdAt?: string;
  updatedAt: string;
  dirty?: boolean;
};

export type StreakSourceType =
  | "learning_hub"
  | "game"
  | "story"
  | "coloring";

export type ChildStreakDay = {
  id?: string;
  childId: string;
  streakEpochId: string;
  localDate: string;
  firstCompletedAt: string;
  firstTimezone: string;
  lastCompletedAt: string;
  lastTimezone: string;
  sourceType: StreakSourceType;
  sourceRef: string | null;
  createdAt?: string;
  updatedAt: string;
  dirty?: boolean;
};

export type StreakDayDisplay = {
  localDate: string;
  completed: boolean;
};

export type ChildStreakSummary = {
  currentStreak: number;
  longestStreak: number;
  todayComplete: boolean;
  lastQualifiedDate: string | null;
  lastSevenDays: StreakDayDisplay[];
};

export type ChildStreakSnapshot = {
  persistenceProtocolVersion?: 1;
  accountId: string;
  childId: string;
  preferences: ChildStreakPreferences;
  epochs: ChildStreakEpoch[];
  days: ChildStreakDay[];
  pendingTransitions: StreakPendingTransition[];
  summary: ChildStreakSummary;
  hydratedAt: string | null;
};

export type StreakPendingTransition =
  | {
      kind: "create_default";
      mutationId: string;
      accountId: string;
      childId: string;
      epochId: string;
      occurredAt: string;
      version: string;
    }
  | {
      kind: "set_enabled";
      mutationId: string;
      accountId: string;
      childId: string;
      enabled: boolean;
      expectedEpochId: string | null;
      newEpochId: string | null;
      occurredAt: string;
      version: string;
    }
  | {
      kind: "reset";
      mutationId: string;
      accountId: string;
      childId: string;
      expectedEpochId: string;
      newEpochId: string;
      occurredAt: string;
      version: string;
    }
  | {
      kind: "set_reminders";
      mutationId: string;
      accountId: string;
      childId: string;
      includeInReminders: boolean;
      occurredAt: string;
      version: string;
    };

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const parseCivilDate = (
  value: string,
): { year: number; month: number; day: number; utc: number } | null => {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = Date.UTC(year, month - 1, day);
  const parsed = new Date(utc);

  if (
    !Number.isFinite(utc) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day, utc };
};

export const isValidLocalDateKey = (value: string): boolean =>
  Boolean(parseCivilDate(value));

export const addLocalCalendarDays = (
  localDate: string,
  amount: number,
): string | null => {
  const parsed = parseCivilDate(localDate);
  if (!parsed || !Number.isInteger(amount)) return null;

  const next = new Date(parsed.utc + amount * 86_400_000);
  return [
    next.getUTCFullYear().toString().padStart(4, "0"),
    (next.getUTCMonth() + 1).toString().padStart(2, "0"),
    next.getUTCDate().toString().padStart(2, "0"),
  ].join("-");
};

export const daysBetweenLocalDates = (
  previousDate: string,
  nextDate: string,
): number | null => {
  const previous = parseCivilDate(previousDate);
  const next = parseCivilDate(nextDate);
  if (!previous || !next) return null;
  return Math.round((next.utc - previous.utc) / 86_400_000);
};

export const getDeviceTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export const toLocalDateKey = (
  timestamp: string | number | Date,
  timezone = getDeviceTimezone(),
): string | null => {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return null;

  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    }).formatToParts(date);
    const values = new Map(parts.map((part) => [part.type, part.value]));
    const result = `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
    return isValidLocalDateKey(result) ? result : null;
  } catch {
    return null;
  }
};

export const isCompletionInsideEpoch = (
  completedAt: string,
  epoch: Pick<ChildStreakEpoch, "startedAt" | "endedAt">,
): boolean => {
  const completion = new Date(completedAt).getTime();
  const start = new Date(epoch.startedAt).getTime();
  const end = epoch.endedAt ? new Date(epoch.endedAt).getTime() : null;

  return (
    Number.isFinite(completion) &&
    Number.isFinite(start) &&
    completion >= start &&
    (end === null || (Number.isFinite(end) && completion < end))
  );
};

type CompletionBoundary = {
  completedAt: string;
  timezone: string;
};

const boundaryTime = (boundary: CompletionBoundary): number =>
  new Date(boundary.completedAt).getTime();

const isValidDayBoundary = (
  boundary: CompletionBoundary,
  localDate: string,
  epoch: Pick<ChildStreakEpoch, "startedAt" | "endedAt">,
  eligibilityBoundary?: string | null,
): boolean => {
  if (
    !boundary.timezone ||
    toLocalDateKey(boundary.completedAt, boundary.timezone) !== localDate ||
    !isCompletionInsideEpoch(boundary.completedAt, epoch)
  ) {
    return false;
  }

  if (!eligibilityBoundary) return true;
  const completedAt = boundaryTime(boundary);
  const eligibleAt = new Date(eligibilityBoundary).getTime();
  return Number.isFinite(eligibleAt) && completedAt >= eligibleAt;
};

/**
 * Conservatively normalizes a cached aggregate against a half-open epoch.
 * Each supplied timestamp/timezone pair is evaluated independently. If only
 * one real boundary is valid, that same real boundary becomes both ends.
 */
export const normalizeStreakDayForEpoch = (
  day: ChildStreakDay,
  epoch: Pick<ChildStreakEpoch, "startedAt" | "endedAt">,
  eligibilityBoundary?: string | null,
): ChildStreakDay | null => {
  const supplied: CompletionBoundary[] = [
    { completedAt: day.firstCompletedAt, timezone: day.firstTimezone },
    { completedAt: day.lastCompletedAt, timezone: day.lastTimezone },
  ];
  const valid = supplied
    .filter((boundary) =>
      isValidDayBoundary(boundary, day.localDate, epoch, eligibilityBoundary),
    )
    .sort((left, right) => boundaryTime(left) - boundaryTime(right));
  if (valid.length === 0) return null;

  const first = valid[0];
  const last = valid.at(-1)!;
  return {
    ...day,
    firstCompletedAt: first.completedAt,
    firstTimezone: first.timezone,
    lastCompletedAt: last.completedAt,
    lastTimezone: last.timezone,
  };
};

/** Atomically merges timestamps with the timezone that validates each one. */
export const mergeStreakDays = (
  left: ChildStreakDay,
  right: ChildStreakDay,
): ChildStreakDay => {
  const boundaries: CompletionBoundary[] = [
    { completedAt: left.firstCompletedAt, timezone: left.firstTimezone },
    { completedAt: left.lastCompletedAt, timezone: left.lastTimezone },
    { completedAt: right.firstCompletedAt, timezone: right.firstTimezone },
    { completedAt: right.lastCompletedAt, timezone: right.lastTimezone },
  ].sort((a, b) => boundaryTime(a) - boundaryTime(b));
  const first = boundaries[0];
  const last = boundaries.at(-1)!;

  return {
    ...left,
    id: left.id ?? right.id,
    firstCompletedAt: first.completedAt,
    firstTimezone: first.timezone,
    lastCompletedAt: last.completedAt,
    lastTimezone: last.timezone,
    updatedAt:
      new Date(left.updatedAt).getTime() >= new Date(right.updatedAt).getTime()
        ? left.updatedAt
        : right.updatedAt,
    dirty: left.dirty === true || right.dirty === true,
  };
};

const getQualifiedDateSets = (
  days: readonly ChildStreakDay[],
  today: string,
): Map<string, Set<string>> => {
  const datesByEpoch = new Map<string, Set<string>>();

  for (const day of days) {
    if (!isValidLocalDateKey(day.localDate)) continue;
    if ((daysBetweenLocalDates(day.localDate, today) ?? -1) < 0) continue;

    const epochDates = datesByEpoch.get(day.streakEpochId) ?? new Set<string>();
    epochDates.add(day.localDate);
    datesByEpoch.set(day.streakEpochId, epochDates);
  }

  return datesByEpoch;
};

const longestRun = (dates: Iterable<string>): number => {
  const sorted = [...new Set(dates)].filter(isValidLocalDateKey).sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;

  for (const date of sorted) {
    const distance = previous ? daysBetweenLocalDates(previous, date) : null;
    run = distance === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  }

  return longest;
};

export const calculateLongestStreak = (
  days: readonly ChildStreakDay[],
  today: string,
): number => {
  const datesByEpoch = getQualifiedDateSets(days, today);
  let longest = 0;
  for (const dates of datesByEpoch.values()) {
    longest = Math.max(longest, longestRun(dates));
  }
  return longest;
};

export const calculateCurrentStreak = (
  days: readonly ChildStreakDay[],
  currentEpochId: string | null,
  today: string,
): number => {
  if (!currentEpochId || !isValidLocalDateKey(today)) return 0;

  const dates = getQualifiedDateSets(days, today).get(currentEpochId);
  if (!dates?.size) return 0;

  const usableDates = [...dates].filter(
    (date) => (daysBetweenLocalDates(date, today) ?? -1) >= 0,
  );
  if (usableDates.length === 0) return 0;

  const mostRecent = usableDates.sort().at(-1)!;
  const age = daysBetweenLocalDates(mostRecent, today);
  if (age === null || age > 1) return 0;

  let current = 1;
  let cursor = mostRecent;
  while (true) {
    const previous = addLocalCalendarDays(cursor, -1);
    if (!previous || !dates.has(previous)) break;
    current += 1;
    cursor = previous;
  }

  return current;
};

export const deriveStreakSummary = (
  days: readonly ChildStreakDay[],
  epochs: readonly ChildStreakEpoch[],
  preferences: ChildStreakPreferences,
  now: string | number | Date = new Date(),
  timezone = getDeviceTimezone(),
): ChildStreakSummary => {
  const today = toLocalDateKey(now, timezone) ?? toLocalDateKey(now, "UTC")!;
  const epochsById = new Map(
    epochs
      .filter((epoch) => epoch.childId === preferences.childId)
      .map((epoch) => [epoch.id, epoch]),
  );
  const qualifiedDays = days.flatMap((day) => {
    const epoch = epochsById.get(day.streakEpochId);
    if (day.childId !== preferences.childId || !epoch) return [];
    const boundary = epoch.id === preferences.currentEpochId
      ? preferences.resetAt
      : null;
    const normalized = normalizeStreakDayForEpoch(day, epoch, boundary);
    return normalized ? [normalized] : [];
  });
  const allQualifiedDates = new Set(
    qualifiedDays
      .filter((day) => isValidLocalDateKey(day.localDate))
      .map((day) => day.localDate),
  );
  const activeEpochDates = preferences.currentEpochId
    ? getQualifiedDateSets(qualifiedDays, today).get(preferences.currentEpochId) ?? new Set<string>()
    : new Set<string>();
  const currentStreak = preferences.streakEnabled
    ? calculateCurrentStreak(qualifiedDays, preferences.currentEpochId, today)
    : 0;
  const lastQualifiedDate = [...activeEpochDates]
    .filter((date) => (daysBetweenLocalDates(date, today) ?? -1) >= 0)
    .sort()
    .at(-1) ?? null;
  const lastSevenDays: StreakDayDisplay[] = [];

  for (let offset = -6; offset <= 0; offset += 1) {
    const localDate = addLocalCalendarDays(today, offset)!;
    lastSevenDays.push({
      localDate,
      completed: allQualifiedDates.has(localDate),
    });
  }

  return {
    currentStreak,
    longestStreak: calculateLongestStreak(qualifiedDays, today),
    todayComplete: preferences.streakEnabled && activeEpochDates.has(today),
    lastQualifiedDate,
    lastSevenDays,
  };
};
