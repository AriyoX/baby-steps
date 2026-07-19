/* eslint-disable import/first */

import React from "react";
import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";
import type { ChildStreakSnapshot } from "@/lib/streakDate";

const mockChild = {
  id: "child-a",
  name: "Amina",
  gender: "female",
  age: "5",
  reason: "Learning",
  created_at: "2026-07-19T08:00:00.000Z",
  selected_language_code: "lg",
};

const mockStreakSnapshot: ChildStreakSnapshot = {
  persistenceProtocolVersion: 1,
  accountId: "parent-1",
  childId: mockChild.id,
  preferences: {
    childId: mockChild.id,
    streakEnabled: true,
    includeInReminders: true,
    currentEpochId: "epoch-a",
    resetAt: "2026-07-19T08:00:00.000Z",
    updatedAt: "2026-07-19T08:00:00.000Z",
  },
  epochs: [],
  days: [],
  pendingTransitions: [],
  summary: {
    currentStreak: 2,
    longestStreak: 4,
    todayComplete: true,
    lastQualifiedDate: "2026-07-19",
    lastSevenDays: Array.from({ length: 7 }, (_, index) => ({
      localDate: `2026-07-${String(13 + index).padStart(2, "0")}`,
      completed: index >= 5,
    })),
  },
  hydratedAt: "2026-07-19T08:00:00.000Z",
};

const mockGetSession = jest.fn(async () => ({
  data: { session: { user: { id: "parent-1" } } },
}));
let mockFontsLoaded = true;
let mockNotificationOpenHandler: ((url: string) => void) | null = null;
const mockDefinedAchievements: unknown[] = [];
const mockEarnedAchievements: unknown[] = [];

const mockQuery = () => {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = chain;
  builder.eq = chain;
  builder.is = chain;
  builder.order = chain;
  builder.in = chain;
  builder.single = jest.fn(async () => ({ data: mockChild, error: null }));
  builder.then = (
    resolve: (value: { data: typeof mockChild[]; error: null }) => unknown,
  ) => Promise.resolve(resolve({ data: [mockChild], error: null }));
  return builder;
};

jest.mock("@/global.css", () => ({}));

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(async () => undefined),
  preventAutoHideAsync: jest.fn(async () => undefined),
}));

jest.mock("expo-font", () => ({ useFonts: () => [mockFontsLoaded] }));

jest.mock("expo-linking", () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  createURL: (path: string) => `babysteps://${path}`,
  getInitialURL: jest.fn(async () => null),
  parse: jest.fn(() => ({ path: null, queryParams: {} })),
  resolveScheme: jest.fn(() => "babysteps"),
}));

jest.mock("expo-screen-orientation", () => ({
  OrientationLock: { LANDSCAPE_LEFT: 3, PORTRAIT_UP: 1 },
  getOrientationLockAsync: jest.fn(async () => 1),
  lockAsync: jest.fn(async () => undefined),
}));

jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("@expo/vector-icons", () => ({
  FontAwesome5: "FontAwesome5",
  Ionicons: "Ionicons",
}));

jest.mock("@/components/brand/AnimatedSplashTransition", () => ({
  AnimatedSplashTransition: () => null,
}));
jest.mock("@/components/brand/BrandMark", () => ({ BrandMark: () => null }));
jest.mock("@/components/common/NetworkStatusNotice", () => ({
  NetworkStatusNotice: () => null,
  shouldShowPersistentNetworkBanner: () => false,
}));
jest.mock("@/components/games/GameTour", () => ({
  GameTour: () => null,
  GameTourProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TourTarget: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useGameTour: () => ({
    complete: jest.fn(),
    open: jest.fn(),
    visible: false,
  }),
}));
jest.mock("@/components/games/achievements/useAchievements", () => ({
  useAchievements: () => ({
    definedAchievements: mockDefinedAchievements,
    earnedChildAchievements: mockEarnedAchievements,
    isLoadingAchievements: false,
  }),
}));

jest.mock("@/context/AudioContext", () => ({
  AudioProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/lib/accountManagement", () => ({
  getAccountDeletionState: jest.fn(async () => ({ phase: "none" })),
  isAccountDeletionBlockingNormalAccess: () => false,
}));
jest.mock("@/lib/onboarding", () => ({ hasCompletedOnboarding: jest.fn(async () => true) }));
jest.mock("@/lib/network", () => ({
  requireInternet: jest.fn(async () => true),
  showNetworkErrorIfNeeded: jest.fn(async () => false),
}));
jest.mock("@/lib/utils", () => ({
  getActivityStats: jest.fn(async () => ({
    recentActivities: [],
    dailyMinutes: [0, 0, 0, 0, 0, 0, 0],
    totalActivities: 0,
    averageScore: 0,
  })),
}));
jest.mock("@/lib/progressRepository", () => ({
  cancelScheduledProgressSync: jest.fn(),
  hydrateProgressFromRemote: jest.fn(async () => undefined),
  syncProgressNow: jest.fn(async () => undefined),
}));
jest.mock("@/lib/notifications", () => ({
  configureNotificationPresentation: jest.fn(),
  deactivateAccountLearningReminders: jest.fn(async () => undefined),
  observeNotificationOpens: jest.fn((handler: (url: string) => void) => {
    mockNotificationOpenHandler = handler;
    return jest.fn();
  }),
  syncRecurringRemindersIfEnabled: jest.fn(async () => undefined),
}));
jest.mock("@/lib/streakRepository", () => ({
  cancelScheduledStreakSync: jest.fn(),
  clearStreakMemory: jest.fn(),
  disableChildStreak: jest.fn(async () => mockStreakSnapshot),
  enableChildStreak: jest.fn(async () => mockStreakSnapshot),
  getCachedChildStreak: jest.fn(async () => mockStreakSnapshot),
  getChildStreak: jest.fn(async () => mockStreakSnapshot),
  hydrateChildStreak: jest.fn(async () => mockStreakSnapshot),
  repairStreakQueue: jest.fn(async () => 0),
  resetChildCurrentStreak: jest.fn(async () => mockStreakSnapshot),
  setChildReminderParticipation: jest.fn(async () => mockStreakSnapshot),
  setChildStreakEnabled: jest.fn(async () => mockStreakSnapshot),
  subscribeToChildStreak: jest.fn(() => jest.fn()),
  subscribeToStreakCelebrations: jest.fn(() => jest.fn()),
  syncDirtyStreakState: jest.fn(async () => ({ pushed: 0, rejected: 0, failed: 0, skipped: 0 })),
}));
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => mockQuery()),
  },
}));

import RootLayout from "../app/_layout";
import ParentLayout from "../app/parent/_layout";
import ParentDashboard from "../app/parent/index";
import ChildDetailScreen from "../app/parent/child-detail/[id]";

const EmptyRoute = () => null;
const context = {
  _layout: { default: RootLayout },
  index: { default: EmptyRoute },
  login: { default: EmptyRoute },
  signup: { default: EmptyRoute },
  "notification-permission": { default: EmptyRoute },
  "check-email": { default: EmptyRoute },
  "forgot-password": { default: EmptyRoute },
  "auth/callback": { default: EmptyRoute },
  "reset-password": { default: EmptyRoute },
  "account-reactivation": { default: EmptyRoute },
  "child-list": { default: EmptyRoute },
  "parent/_layout": { default: ParentLayout },
  "parent/index": { default: ParentDashboard },
  "parent/settings": { default: EmptyRoute },
  "parent/add-child": { default: EmptyRoute },
  "parent/child-progress": { default: EmptyRoute },
  "parent/child-detail/[id]": { default: ChildDetailScreen },
  child: { default: EmptyRoute },
};

describe("streak navigation runtime relationship", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFontsLoaded = true;
    mockNotificationOpenHandler = null;
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "parent-1" } } },
    });
  });

  it("keeps the real root navigator mounted through bootstrap and opens a dashboard child profile", async () => {
    mockFontsLoaded = false;

    const router = renderRouter(context, { initialUrl: "/parent" });

    await waitFor(() => expect(screen.getByLabelText(`Open profile for ${mockChild.name}`)).toBeTruthy());

    expect(mockNotificationOpenHandler).not.toBeNull();
    fireEvent.press(screen.getByLabelText(`Open profile for ${mockChild.name}`));

    await waitFor(() => expect(router.getPathname()).toBe(`/parent/child-detail/${mockChild.id}`));
    expect(screen.getByText("Child Profile")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("2-days learning streak")).toBeTruthy());
    expect(screen.getByTestId("active-streak-stats")).toBeTruthy();
    expect(screen.queryByTestId("child-streak-enabled-switch")).toBeNull();
  });
});
