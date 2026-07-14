import React from "react";
import renderer, { act } from "react-test-renderer";

const mockHydrateLearningProgressFromSharedProgress = jest.fn();
const mockCancelScheduledProgressSync = jest.fn();
const mockHydrateProgressFromRemote = jest.fn();
const mockSyncProgressNow = jest.fn();

jest.mock("@/lib/learningProgressRepository", () => ({
  hydrateLearningProgressFromSharedProgress: (...args: unknown[]) =>
    mockHydrateLearningProgressFromSharedProgress(...args),
}));

jest.mock("@/lib/progressRepository", () => ({
  cancelScheduledProgressSync: () => mockCancelScheduledProgressSync(),
  hydrateProgressFromRemote: (...args: unknown[]) =>
    mockHydrateProgressFromRemote(...args),
  syncProgressNow: (...args: unknown[]) => mockSyncProgressNow(...args),
}));

const {
  ChildProvider,
  SIGN_OUT_PROGRESS_SYNC_TIMEOUT_MS,
  useChild,
}: typeof import("../ChildContext") = require("../ChildContext");

type ChildContextApi = ReturnType<typeof useChild>;

const flushChildEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const deferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe("ChildProvider progress hydration", () => {
  let api: ChildContextApi | undefined;
  let tree: renderer.ReactTestRenderer | undefined;

  const Probe = () => {
    api = useChild();
    return null;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrateLearningProgressFromSharedProgress.mockResolvedValue({
      completedLessonIds: [],
    });
    mockHydrateProgressFromRemote.mockResolvedValue({ activities: 0, stages: 0 });
    mockSyncProgressNow.mockResolvedValue({ pushed: 0, skipped: 0, failed: 0 });
    api = undefined;
    tree = undefined;
  });

  afterEach(() => {
    act(() => {
      tree?.unmount();
    });
  });

  it("syncs the previous child and hydrates shared and Learning progress for the active child", async () => {
    await act(async () => {
      tree = renderer.create(
        <ChildProvider>
          <Probe />
        </ChildProvider>,
      );
    });

    await act(async () => {
      api?.setActiveChild({
        id: "child-1",
        name: "A",
        gender: "girl",
        age: "4",
        selected_language_code: "luganda",
      });
    });
    await flushChildEffects();

    const firstWorkOptions = mockSyncProgressNow.mock.calls[0]?.[1] as {
      signal: AbortSignal;
    };
    expect(firstWorkOptions.signal).toBeInstanceOf(AbortSignal);
    expect(firstWorkOptions.signal.aborted).toBe(false);
    expect(mockSyncProgressNow).toHaveBeenNthCalledWith(1, "child-1", {
      signal: firstWorkOptions.signal,
    });
    expect(mockHydrateProgressFromRemote).toHaveBeenCalledWith("child-1", "lg", {
      activityTypes: ["language", "learning", "counting", "words", "stories", "coloring"],
      signal: firstWorkOptions.signal,
    });
    expect(mockHydrateLearningProgressFromSharedProgress).toHaveBeenCalledWith(
      "child-1",
      "lg",
    );

    await act(async () => {
      api?.setActiveChild({
        id: "child-2",
        name: "B",
        gender: "boy",
        age: "5",
        selected_language_code: "nyn",
      });
    });
    await flushChildEffects();

    const secondWorkOptions = mockSyncProgressNow.mock.calls[1]?.[1] as {
      signal: AbortSignal;
    };
    expect(firstWorkOptions.signal.aborted).toBe(true);
    expect(secondWorkOptions.signal).toBeInstanceOf(AbortSignal);
    expect(secondWorkOptions.signal.aborted).toBe(false);
    expect(mockSyncProgressNow).toHaveBeenNthCalledWith(2, "child-1", {
      signal: secondWorkOptions.signal,
    });
    expect(mockSyncProgressNow).toHaveBeenNthCalledWith(3, "child-2", {
      signal: secondWorkOptions.signal,
    });
    expect(mockHydrateProgressFromRemote).toHaveBeenCalledWith("child-2", "nyn", {
      activityTypes: ["language", "learning", "counting", "words", "stories", "coloring"],
      signal: secondWorkOptions.signal,
    });
    expect(mockHydrateLearningProgressFromSharedProgress).toHaveBeenCalledWith(
      "child-2",
      "nyn",
    );
  });

  it("clears active-child state and cancels scheduled work when sign-out sync fails", async () => {
    await act(async () => {
      tree = renderer.create(
        <ChildProvider>
          <Probe />
        </ChildProvider>,
      );
    });
    await act(async () => {
      api?.setActiveChild({
        id: "child-1",
        name: "A",
        gender: "girl",
        age: "4",
        selected_language_code: "nyn",
      });
    });
    await flushChildEffects();
    mockSyncProgressNow.mockClear();
    mockCancelScheduledProgressSync.mockClear();
    mockSyncProgressNow.mockRejectedValueOnce(new Error("offline"));

    await act(async () => {
      await api?.clearActiveChildForSignOut();
    });

    expect(api?.activeChild).toBeNull();
    expect(mockCancelScheduledProgressSync).toHaveBeenCalledTimes(1);
    const signOutOptions = mockSyncProgressNow.mock.calls[0]?.[1] as {
      signal: AbortSignal;
    };
    expect(signOutOptions.signal).toBeInstanceOf(AbortSignal);
    expect(signOutOptions.signal.aborted).toBe(false);
    expect(mockSyncProgressNow).toHaveBeenCalledWith("child-1", {
      signal: signOutOptions.signal,
    });
  });

  it("bounds sign-out synchronization while clearing child memory immediately", async () => {
    jest.useFakeTimers();
    try {
      await act(async () => {
        tree = renderer.create(
          <ChildProvider>
            <Probe />
          </ChildProvider>,
        );
      });
      await act(async () => {
        api?.setActiveChild({
          id: "child-1",
          name: "A",
          gender: "girl",
          age: "4",
          selected_language_code: "lg",
        });
      });
      await flushChildEffects();
      mockSyncProgressNow.mockClear();
      const pendingSync = deferred<{
        pushed: number;
        skipped: number;
        failed: number;
      }>();
      mockSyncProgressNow.mockReturnValueOnce(pendingSync.promise);

      let clearing!: Promise<void>;
      act(() => {
        clearing = api!.clearActiveChildForSignOut();
      });

      expect(api?.activeChild).toBeNull();
      const signOutOptions = mockSyncProgressNow.mock.calls[0]?.[1] as {
        signal: AbortSignal;
      };
      expect(mockSyncProgressNow).toHaveBeenCalledWith("child-1", {
        signal: signOutOptions.signal,
      });
      expect(signOutOptions.signal).toBeInstanceOf(AbortSignal);
      expect(signOutOptions.signal.aborted).toBe(false);

      await act(async () => {
        jest.advanceTimersByTime(SIGN_OUT_PROGRESS_SYNC_TIMEOUT_MS);
        await clearing;
      });

      expect(signOutOptions.signal.aborted).toBe(true);
      pendingSync.resolve({ pushed: 0, skipped: 1, failed: 0 });
      await Promise.resolve();
    } finally {
      jest.useRealTimers();
    }
  });

  it("invalidates stale child hydration when sign-out begins", async () => {
    await act(async () => {
      tree = renderer.create(
        <ChildProvider>
          <Probe />
        </ChildProvider>,
      );
    });
    const staleSync = deferred<{ pushed: number; skipped: number; failed: number }>();
    mockSyncProgressNow
      .mockReturnValueOnce(staleSync.promise)
      .mockResolvedValueOnce({ pushed: 0, skipped: 0, failed: 0 });

    act(() => {
      api?.setActiveChild({
        id: "child-1",
        name: "A",
        gender: "girl",
        age: "4",
        selected_language_code: "nyn",
      });
    });
    await Promise.resolve();
    const staleWorkOptions = mockSyncProgressNow.mock.calls[0]?.[1] as {
      signal: AbortSignal;
    };
    expect(mockSyncProgressNow).toHaveBeenNthCalledWith(1, "child-1", {
      signal: staleWorkOptions.signal,
    });
    expect(staleWorkOptions.signal.aborted).toBe(false);

    await act(async () => {
      await api?.clearActiveChildForSignOut();
    });
    const signOutOptions = mockSyncProgressNow.mock.calls[1]?.[1] as {
      signal: AbortSignal;
    };
    expect(mockSyncProgressNow).toHaveBeenNthCalledWith(2, "child-1", {
      signal: signOutOptions.signal,
    });
    expect(staleWorkOptions.signal.aborted).toBe(true);
    expect(signOutOptions.signal.aborted).toBe(false);
    staleSync.resolve({ pushed: 0, skipped: 1, failed: 0 });
    await flushChildEffects();

    expect(api?.activeChild).toBeNull();
    expect(mockHydrateProgressFromRemote).not.toHaveBeenCalled();
    expect(mockHydrateLearningProgressFromSharedProgress).not.toHaveBeenCalled();
  });
});
