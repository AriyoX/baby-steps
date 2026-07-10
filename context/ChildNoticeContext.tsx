import { Ionicons } from "@expo/vector-icons";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/StyledText";
import type { AchievementDefinition } from "@/components/games/achievements/achievementTypes";
import {
  brandAnimation,
  brandColors,
  brandRadius,
  brandShadows,
} from "@/constants/Brand";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const DEFAULT_NOTICE_DURATION_MS = 4500;
const CHILD_HEADER_CLEARANCE = 56;

export type AchievementUnlockedNoticeInput = {
  type: "achievement-unlocked";
  achievement: AchievementDefinition;
  durationMs?: number;
};

export type ChildNoticeInput = AchievementUnlockedNoticeInput;

type ChildNotice = ChildNoticeInput & {
  key: string;
  durationMs: number;
};

type EnqueueAchievementOptions = {
  durationMs?: number;
};

interface ChildNoticeContextValue {
  enqueueNotice: (notice: ChildNoticeInput) => boolean;
  enqueueNotices: (notices: ChildNoticeInput[]) => number;
  enqueueAchievementUnlocked: (
    achievement: AchievementDefinition,
    options?: EnqueueAchievementOptions,
  ) => boolean;
  enqueueAchievementUnlocks: (
    achievements: AchievementDefinition[],
    options?: EnqueueAchievementOptions,
  ) => number;
}

interface ChildNoticeProviderProps {
  childId: string;
  children: React.ReactNode;
  defaultDurationMs?: number;
}

interface ChildNoticeHostProps {
  notice: ChildNotice | null;
  onDismiss: (key: string) => void;
}

const ChildNoticeContext = createContext<ChildNoticeContextValue | undefined>(
  undefined,
);

const getNoticeKey = (childId: string, notice: ChildNoticeInput): string => {
  switch (notice.type) {
    case "achievement-unlocked":
      return `${childId}:achievement-unlocked:${notice.achievement.id}`;
  }
};

export function ChildNoticeHost({ notice, onDismiss }: ChildNoticeHostProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isExitingRef = useRef(false);

  const clearDismissTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    if (!notice || isExitingRef.current) {
      return;
    }

    isExitingRef.current = true;
    clearDismissTimer();
    animationRef.current?.stop();

    if (reduceMotion) {
      onDismiss(notice.key);
      return;
    }

    const exitAnimation = Animated.parallel([
      Animated.timing(opacity, {
        duration: brandAnimation.fastMs,
        easing: Easing.in(Easing.quad),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        duration: brandAnimation.fastMs,
        easing: Easing.in(Easing.quad),
        toValue: -12,
        useNativeDriver: true,
      }),
    ]);

    animationRef.current = exitAnimation;
    exitAnimation.start(({ finished }) => {
      if (finished) {
        onDismiss(notice.key);
      }
    });
  }, [clearDismissTimer, notice, onDismiss, opacity, reduceMotion, translateY]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    isExitingRef.current = false;
    clearDismissTimer();
    animationRef.current?.stop();

    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
    } else {
      opacity.setValue(0);
      translateY.setValue(-16);
      const enterAnimation = Animated.parallel([
        Animated.timing(opacity, {
          duration: brandAnimation.normalMs,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          duration: brandAnimation.normalMs,
          easing: Easing.out(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]);

      animationRef.current = enterAnimation;
      enterAnimation.start();
    }

    timerRef.current = setTimeout(dismiss, notice.durationMs);

    return () => {
      clearDismissTimer();
      animationRef.current?.stop();
      animationRef.current = null;
    };
  }, [clearDismissTimer, dismiss, notice, opacity, reduceMotion, translateY]);

  if (!notice) {
    return null;
  }

  const { achievement } = notice;
  const accessibilityLabel = `Achievement unlocked: ${achievement.name}`;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        { top: Math.max(insets.top, 8) + CHILD_HEADER_CLEARANCE },
      ]}
      testID="child-notice-host"
    >
      <Animated.View
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        pointerEvents="auto"
        style={[
          styles.card,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
        testID="achievement-unlocked-notice"
      >
        <View style={styles.badge}>
          <Ionicons
            name={
              (achievement.icon_name as keyof typeof Ionicons.glyphMap) ||
              "star-outline"
            }
            size={27}
            color={brandColors.white}
          />
        </View>
        <View style={styles.copy}>
          <Text variant="bold" style={styles.kicker}>
            Achievement unlocked
            {achievement.points > 0 ? `  |  +${achievement.points} points` : ""}
          </Text>
          <Text variant="bold" style={styles.title}>
            {achievement.name}
          </Text>
          <Text style={styles.description}>{achievement.description}</Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Dismiss achievement notice"
          accessibilityRole="button"
          hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
          onPress={dismiss}
          style={styles.closeButton}
          testID="dismiss-child-notice"
        >
          <Ionicons
            name="close"
            size={20}
            color={brandColors.neutral[700]}
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export function ChildNoticeProvider({
  childId,
  children,
  defaultDurationMs = DEFAULT_NOTICE_DURATION_MS,
}: ChildNoticeProviderProps) {
  const [queue, setQueue] = useState<ChildNotice[]>([]);
  const seenNoticeKeysRef = useRef(new Set<string>());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      seenNoticeKeysRef.current.clear();
    };
  }, []);

  const enqueueNotices = useCallback(
    (notices: ChildNoticeInput[]): number => {
      if (!mountedRef.current || notices.length === 0) {
        return 0;
      }

      const additions: ChildNotice[] = [];

      notices.forEach((notice) => {
        const key = getNoticeKey(childId, notice);
        if (seenNoticeKeysRef.current.has(key)) {
          return;
        }

        seenNoticeKeysRef.current.add(key);
        additions.push({
          ...notice,
          durationMs: notice.durationMs ?? defaultDurationMs,
          key,
        });
      });

      if (additions.length > 0) {
        setQueue((currentQueue) => [...currentQueue, ...additions]);
      }

      return additions.length;
    },
    [childId, defaultDurationMs],
  );

  const enqueueNotice = useCallback(
    (notice: ChildNoticeInput): boolean => enqueueNotices([notice]) === 1,
    [enqueueNotices],
  );

  const enqueueAchievementUnlocks = useCallback(
    (
      achievements: AchievementDefinition[],
      options: EnqueueAchievementOptions = {},
    ): number =>
      enqueueNotices(
        achievements.map((achievement) => ({
          achievement,
          durationMs: options.durationMs,
          type: "achievement-unlocked" as const,
        })),
      ),
    [enqueueNotices],
  );

  const enqueueAchievementUnlocked = useCallback(
    (
      achievement: AchievementDefinition,
      options: EnqueueAchievementOptions = {},
    ): boolean => enqueueAchievementUnlocks([achievement], options) === 1,
    [enqueueAchievementUnlocks],
  );

  const dismissNotice = useCallback((key: string) => {
    if (!mountedRef.current) {
      return;
    }

    setQueue((currentQueue) =>
      currentQueue[0]?.key === key ? currentQueue.slice(1) : currentQueue,
    );
  }, []);

  const value = useMemo<ChildNoticeContextValue>(
    () => ({
      enqueueAchievementUnlocked,
      enqueueAchievementUnlocks,
      enqueueNotice,
      enqueueNotices,
    }),
    [
      enqueueAchievementUnlocked,
      enqueueAchievementUnlocks,
      enqueueNotice,
      enqueueNotices,
    ],
  );

  return (
    <ChildNoticeContext.Provider value={value}>
      {children}
      <ChildNoticeHost notice={queue[0] ?? null} onDismiss={dismissNotice} />
    </ChildNoticeContext.Provider>
  );
}

export function useChildNotice(): ChildNoticeContextValue {
  const context = useContext(ChildNoticeContext);
  if (!context) {
    throw new Error("useChildNotice must be used within a ChildNoticeProvider");
  }

  return context;
}

const styles = StyleSheet.create({
  host: {
    alignItems: "center",
    left: 0,
    paddingHorizontal: 16,
    position: "absolute",
    right: 0,
    zIndex: 1200,
  },
  card: {
    ...brandShadows.lifted,
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: brandColors.babyStepsWhite,
    borderColor: brandColors.gold[400],
    borderRadius: brandRadius.lg,
    borderWidth: 2,
    elevation: 10,
    flexDirection: "row",
    maxWidth: 520,
    minHeight: 78,
    paddingBottom: 11,
    paddingLeft: 12,
    paddingRight: 8,
    paddingTop: 11,
    width: "100%",
  },
  badge: {
    alignItems: "center",
    backgroundColor: brandColors.shanaOrange,
    borderColor: brandColors.orange[200],
    borderRadius: brandRadius.pill,
    borderWidth: 2,
    height: 50,
    justifyContent: "center",
    marginRight: 12,
    width: 50,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  kicker: {
    color: brandColors.orange[700],
    fontSize: 12,
    letterSpacing: 0.2,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  title: {
    color: brandColors.charcoalBlack,
    flexShrink: 1,
    fontSize: 18,
    lineHeight: 22,
  },
  description: {
    color: brandColors.neutral[600],
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
  },
  closeButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: brandRadius.pill,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
});
