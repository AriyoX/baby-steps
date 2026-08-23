import {
  completeLocallyFirst,
  runCompletionOnce,
} from "../completionReliability";

const deferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe("completeLocallyFirst", () => {
  it("persists and reveals completion without waiting for delayed network work", async () => {
    const network = deferred();
    const timeline: string[] = [];

    await expect(
      completeLocallyFirst({
        persistLocal: async () => {
          timeline.push("local");
          return "saved";
        },
        fallbackValue: "unsaved",
        revealCompletion: () => timeline.push("ui"),
        runBestEffortNetworkWork: async () => {
          timeline.push("network");
          await network.promise;
        },
      }),
    ).resolves.toEqual({
      value: "saved",
      persistence: { persisted: true },
    });

    expect(timeline).toEqual(["local", "ui", "network"]);
    network.resolve();
    await network.promise;
  });

  it("keeps completion resolved when detached network work rejects", async () => {
    const network = deferred();
    const onNetworkError = jest.fn();
    const revealCompletion = jest.fn();

    await expect(
      completeLocallyFirst({
        persistLocal: async () => "saved",
        fallbackValue: "unsaved",
        revealCompletion,
        runBestEffortNetworkWork: () => network.promise,
        onNetworkError,
      }),
    ).resolves.toEqual({
      value: "saved",
      persistence: { persisted: true },
    });

    network.reject(new Error("offline"));
    await Promise.resolve();
    await Promise.resolve();

    expect(revealCompletion).toHaveBeenCalledWith("saved", { persisted: true });
    expect(onNetworkError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("reports local failure, reveals the fallback, and continues detached work", async () => {
    const localError = new Error("storage unavailable");
    const onLocalError = jest.fn();
    const revealCompletion = jest.fn();
    const runBestEffortNetworkWork = jest.fn().mockResolvedValue(undefined);

    await expect(
      completeLocallyFirst({
        persistLocal: async () => {
          throw localError;
        },
        fallbackValue: "accepted-but-unsaved",
        revealCompletion,
        runBestEffortNetworkWork,
        onLocalError,
      }),
    ).resolves.toEqual({
      value: "accepted-but-unsaved",
      persistence: { persisted: false, error: localError },
    });

    await Promise.resolve();

    expect(onLocalError).toHaveBeenCalledWith(localError);
    expect(revealCompletion).toHaveBeenCalledWith(
      "accepted-but-unsaved",
      { persisted: false, error: localError },
    );
    expect(runBestEffortNetworkWork).toHaveBeenCalledWith(
      "accepted-but-unsaved",
      { persisted: false, error: localError },
    );
  });
});

describe("runCompletionOnce", () => {
  it("installs one synchronous in-flight promise and releases it after rejection", async () => {
    const lock = { current: null as Promise<void> | null };
    const firstAttempt = deferred();
    const runCompletion = jest
      .fn<Promise<void>, []>()
      .mockReturnValueOnce(firstAttempt.promise)
      .mockResolvedValueOnce(undefined);

    const first = runCompletionOnce(lock, runCompletion);
    const duplicate = runCompletionOnce(lock, runCompletion);
    expect(first).toBe(duplicate);
    expect(runCompletion).not.toHaveBeenCalled();

    await Promise.resolve();
    expect(runCompletion).toHaveBeenCalledTimes(1);

    firstAttempt.reject(new Error("retryable local failure"));
    await expect(first).rejects.toThrow("retryable local failure");
    await expect(duplicate).rejects.toThrow("retryable local failure");
    expect(lock.current).toBeNull();

    await expect(runCompletionOnce(lock, runCompletion)).resolves.toBeUndefined();
    expect(runCompletion).toHaveBeenCalledTimes(2);
  });
});
