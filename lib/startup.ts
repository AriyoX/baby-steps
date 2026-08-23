export const STARTUP_SESSION_DEADLINE_MS = 1_200;

export type StartupTaskResult<T> =
  | { status: "resolved"; value: T }
  | { status: "rejected"; error: unknown }
  | { status: "timed-out" };

/**
 * Stops a slow startup task from holding the native splash indefinitely.
 * The source promise is left running so its result can still be applied later.
 */
export const waitForStartupTask = <T>(
  task: Promise<T>,
  deadlineMs = STARTUP_SESSION_DEADLINE_MS,
): Promise<StartupTaskResult<T>> =>
  new Promise((resolve) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout>;
    const finish = (result: StartupTaskResult<T>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };
    timeout = setTimeout(
      () => finish({ status: "timed-out" }),
      Math.max(0, deadlineMs),
    );

    task.then(
      (value) => finish({ status: "resolved", value }),
      (error) => finish({ status: "rejected", error }),
    );
  });
