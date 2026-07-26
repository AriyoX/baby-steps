import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { useChild } from "./ChildContext";
import {
  cancelScheduledStreakSync,
  disableChildStreak,
  enableChildStreak,
  getCachedChildStreak,
  hydrateChildStreak,
  repairStreakQueue,
  resetChildCurrentStreak,
  setChildReminderParticipation,
  subscribeToChildStreak,
  subscribeToStreakCelebrations,
  syncDirtyStreakState,
  type StreakCelebrationEvent,
} from "@/lib/streakRepository";
import type { ChildStreakSnapshot } from "@/lib/streakDate";
import { getDeviceTimezone } from "@/lib/streakDate";
import { supabase } from "@/lib/supabase";
import { syncRecurringRemindersIfEnabled } from "@/lib/notifications";

type StreakContextValue = {
  childId: string | null;
  snapshot: ChildStreakSnapshot | null;
  isLoading: boolean;
  celebration: StreakCelebrationEvent | null;
  dismissCelebration: () => void;
  refresh: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  setIncludeInReminders: (included: boolean) => Promise<void>;
  reset: () => Promise<void>;
};

const DEFAULT_VALUE: StreakContextValue = {
  childId: null,
  snapshot: null,
  isLoading: false,
  celebration: null,
  dismissCelebration: () => undefined,
  refresh: async () => undefined,
  setEnabled: async () => undefined,
  setIncludeInReminders: async () => undefined,
  reset: async () => undefined,
};

const StreakContext = createContext<StreakContextValue>(DEFAULT_VALUE);

const getAccountId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
};

export function StreakProvider({ children }: { children: React.ReactNode }) {
  const { activeChild } = useChild();
  const activeChildId = activeChild?.id ?? null;
  const [snapshot, setSnapshot] = useState<ChildStreakSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(activeChildId));
  const [celebration, setCelebration] = useState<StreakCelebrationEvent | null>(null);
  const generationRef = useRef(0);
  const midnightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rescheduleMidnightRef = useRef<() => void>(() => undefined);
  const timezoneRef = useRef(getDeviceTimezone());

  const load = useCallback(async () => {
    const generation = generationRef.current;
    const childId = activeChildId;
    if (!childId) return;

    await repairStreakQueue();
    const local = await getCachedChildStreak(childId);
    if (generationRef.current !== generation || activeChildId !== childId) return;
    setSnapshot(local?.hydratedAt ? local : null);

    const hydrated = await hydrateChildStreak(childId, { throwOnRemoteError: true });
    if (generationRef.current !== generation || activeChildId !== childId) return;
    if (!hydrated) throw new Error("Learning streak data is unavailable for this child.");
    setSnapshot(hydrated);
    setIsLoading(false);
    void syncDirtyStreakState().catch((error) => {
      console.warn("Could not finish detached streak synchronization:", error);
    });
  }, [activeChildId]);

  useEffect(() => {
    if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
    midnightTimerRef.current = null;
    if (!activeChildId) return;

    let cancelled = false;
    const scheduleNextMidnight = () => {
      if (cancelled) return;
      const now = new Date();
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      midnightTimerRef.current = setTimeout(() => {
        timezoneRef.current = getDeviceTimezone();
        void load().catch((error) => {
          console.warn("Could not refresh learning streaks at local midnight:", error);
        }).finally(scheduleNextMidnight);
      }, Math.max(1_000, next.getTime() - now.getTime()));
      (midnightTimerRef.current as unknown as { unref?: () => void }).unref?.();
    };

    rescheduleMidnightRef.current = () => {
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
      midnightTimerRef.current = null;
      scheduleNextMidnight();
    };
    scheduleNextMidnight();
    return () => {
      cancelled = true;
      cancelScheduledStreakSync();
      rescheduleMidnightRef.current = () => undefined;
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
      midnightTimerRef.current = null;
    };
  }, [activeChildId, load]);

  useEffect(() => {
    generationRef.current += 1;
    const generation = generationRef.current;
    setSnapshot(null);
    setCelebration(null);
    setIsLoading(Boolean(activeChildId));
    if (!activeChildId) return;

    let cancelled = false;
    let unsubscribe: () => void = () => undefined;
    void getAccountId()
      .then((accountId) => {
        if (cancelled || generationRef.current !== generation || !activeChildId) return;
        if (!accountId) {
          setIsLoading(false);
          return;
        }
        unsubscribe = subscribeToChildStreak(accountId, activeChildId, (next) => {
          if (generationRef.current === generation && next.hydratedAt) setSnapshot(next);
        });
        void load().catch((error) => {
          if (generationRef.current === generation) setIsLoading(false);
          console.warn("Could not load the active child's learning streak:", error);
        });
      })
      .catch((error) => {
        if (!cancelled && generationRef.current === generation) setIsLoading(false);
        console.warn("Could not verify the account for learning streaks:", error);
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeChildId, load]);

  useEffect(() => {
    if (!snapshot?.accountId || snapshot.childId !== activeChildId) return;
    void syncRecurringRemindersIfEnabled(snapshot.accountId).catch((error) => {
      console.warn("Could not refresh the grouped learning reminder:", error);
    });
  }, [
    activeChildId,
    snapshot?.accountId,
    snapshot?.childId,
    snapshot?.preferences.includeInReminders,
    snapshot?.preferences.streakEnabled,
    snapshot?.summary.todayComplete,
  ]);

  useEffect(
    () =>
      subscribeToStreakCelebrations((event) => {
        if (event.childId === activeChildId) setCelebration(event);
      }),
    [activeChildId],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && activeChildId) {
        const currentTimezone = getDeviceTimezone();
        const timezoneChanged = currentTimezone !== timezoneRef.current;
        timezoneRef.current = currentTimezone;
        if (timezoneChanged || midnightTimerRef.current) rescheduleMidnightRef.current();
        void load().catch((error) => {
          console.warn("Could not refresh learning streaks on app resume:", error);
        });
      }
    });
    return () => subscription.remove();
  }, [activeChildId, load]);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (!activeChildId) return;
      const next = enabled
        ? await enableChildStreak(activeChildId)
        : await disableChildStreak(activeChildId);
      if (next) setSnapshot(next);
    },
    [activeChildId],
  );

  const setIncludeInReminders = useCallback(
    async (included: boolean) => {
      if (!activeChildId) return;
      const next = await setChildReminderParticipation(activeChildId, included);
      if (next) setSnapshot(next);
    },
    [activeChildId],
  );

  const reset = useCallback(async () => {
    if (!activeChildId) return;
    const next = await resetChildCurrentStreak(activeChildId);
    if (next) setSnapshot(next);
  }, [activeChildId]);

  const value = useMemo<StreakContextValue>(
    () => ({
      childId: activeChildId,
      snapshot: snapshot?.childId === activeChildId ? snapshot : null,
      isLoading,
      celebration,
      dismissCelebration: () => setCelebration(null),
      refresh: load,
      setEnabled,
      setIncludeInReminders,
      reset,
    }),
    [activeChildId, celebration, isLoading, load, reset, setEnabled, setIncludeInReminders, snapshot],
  );

  return <StreakContext.Provider value={value}>{children}</StreakContext.Provider>;
}

export const useStreak = (): StreakContextValue => useContext(StreakContext);

export const useChildStreakSnapshot = (childId: string): {
  snapshot: ChildStreakSnapshot | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} => {
  type QueryState = {
    childId: string;
    snapshot: ChildStreakSnapshot | null;
    loading: boolean;
    error: Error | null;
  };
  const [state, setState] = useState<QueryState>({
    childId,
    snapshot: null,
    loading: Boolean(childId),
    error: null,
  });
  const generationRef = useRef(0);

  const refresh = useCallback(async () => {
    const generation = generationRef.current;
    if (!childId) {
      setState({ childId, snapshot: null, loading: false, error: null });
      return;
    }

    setState((current) => ({
      childId,
      snapshot: current.childId === childId ? current.snapshot : null,
      loading: true,
      error: null,
    }));

    try {
      const local = await getCachedChildStreak(childId);
      if (generationRef.current !== generation) return;
      const verifiedLocal = local?.hydratedAt ? local : null;
      setState({ childId, snapshot: verifiedLocal, loading: true, error: null });

      const hydrated = await hydrateChildStreak(childId, { throwOnRemoteError: true });
      if (generationRef.current !== generation) return;
      if (!hydrated) {
        throw new Error("Learning streak data is unavailable for this child.");
      }
      setState({ childId, snapshot: hydrated, loading: false, error: null });
    } catch (error) {
      if (generationRef.current !== generation) return;
      const normalized = error instanceof Error
        ? error
        : new Error("Learning streak data could not be loaded.");
      setState((current) => ({
        childId,
        snapshot: current.childId === childId ? current.snapshot : null,
        loading: false,
        error: normalized,
      }));
    }
  }, [childId]);

  useEffect(() => {
    generationRef.current += 1;
    const generation = generationRef.current;
    setState({ childId, snapshot: null, loading: Boolean(childId), error: null });
    if (!childId) return;
    let cancelled = false;
    let unsubscribe: () => void = () => undefined;

    void getAccountId()
      .then((accountId) => {
        if (cancelled || generationRef.current !== generation) return;
        if (!accountId) {
          setState({
            childId,
            snapshot: null,
            loading: false,
            error: new Error("Sign in to manage this child's learning streak."),
          });
          return;
        }
        unsubscribe = subscribeToChildStreak(accountId, childId, (next) => {
          if (
            generationRef.current !== generation ||
            next.childId !== childId ||
            !next.hydratedAt
          ) return;
          setState((current) => ({
            childId,
            snapshot: next,
            loading: current.childId === childId ? current.loading : false,
            error: current.childId === childId ? current.error : null,
          }));
        });
        void refresh();
      })
      .catch((error) => {
        if (cancelled || generationRef.current !== generation) return;
        setState({
          childId,
          snapshot: null,
          loading: false,
          error: error instanceof Error
            ? error
            : new Error("Learning streak data could not be loaded."),
        });
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [childId, refresh]);

  const stateMatchesChild = state.childId === childId;
  return {
    snapshot: stateMatchesChild && state.snapshot?.childId === childId ? state.snapshot : null,
    loading: Boolean(childId) && (!stateMatchesChild || state.loading),
    error: stateMatchesChild ? state.error : null,
    refresh,
  };
};
