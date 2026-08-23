export interface LocalFirstCompletionOptions<T> {
  persistLocal: () => Promise<T>;
  fallbackValue: T | (() => T);
  revealCompletion: (value: T, persistence: LocalPersistenceStatus) => void;
  runBestEffortNetworkWork: (
    value: T,
    persistence: LocalPersistenceStatus,
  ) => Promise<void>;
  onLocalError?: (error: unknown) => void;
  onNetworkError?: (error: unknown) => void;
}

export type LocalPersistenceStatus =
  | { persisted: true }
  | { persisted: false; error: unknown };

export interface LocalFirstCompletionResult<T> {
  value: T;
  persistence: LocalPersistenceStatus;
}

export interface CompletionPromiseLock<T> {
  current: Promise<T> | null;
}

/**
 * Installs the in-flight promise synchronously so repeated callbacks reuse the
 * same completion. A rejected completion releases only its own lock; a
 * successful completion stays locked until the owning game explicitly starts a
 * new level or scope.
 */
export const runCompletionOnce = <T>(
  lock: CompletionPromiseLock<T>,
  runCompletion: () => Promise<T>,
): Promise<T> => {
  if (lock.current) return lock.current;

  const completion = Promise.resolve().then(runCompletion);
  lock.current = completion;
  void completion.catch(() => {
    if (lock.current === completion) {
      lock.current = null;
    }
  });
  return completion;
};

/**
 * Attempts the authoritative local write, reports a failed write internally,
 * and keeps completion UI non-blocking. Best-effort activity, achievement, and
 * sync work is deliberately detached even when the local write fails.
 */
export const completeLocallyFirst = async <T>({
  persistLocal,
  fallbackValue,
  revealCompletion,
  runBestEffortNetworkWork,
  onLocalError,
  onNetworkError,
}: LocalFirstCompletionOptions<T>): Promise<LocalFirstCompletionResult<T>> => {
  let value: T;
  let persistence: LocalPersistenceStatus;

  try {
    value = await persistLocal();
    persistence = { persisted: true };
  } catch (error) {
    value = typeof fallbackValue === "function"
      ? (fallbackValue as () => T)()
      : fallbackValue;
    persistence = { persisted: false, error };
    onLocalError?.(error);
  }

  revealCompletion(value, persistence);

  void Promise.resolve()
    .then(() => runBestEffortNetworkWork(value, persistence))
    .catch((error) => {
      onNetworkError?.(error);
    });

  return { value, persistence };
};
