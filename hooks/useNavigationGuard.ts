import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

type NavigationAction = () => unknown;

export type NavigationGuard = {
  activeNavigationKey: string | null;
  navigateOnce: (key: string, action: NavigationAction) => boolean;
};

/**
 * Keeps a screen from starting the same navigation twice before it loses focus.
 * The lock is released when the screen becomes active again or immediately when
 * a navigation action throws.
 */
export function useNavigationGuard(): NavigationGuard {
  const navigationInProgressRef = useRef(false);
  const [activeNavigationKey, setActiveNavigationKey] = useState<string | null>(null);

  const reset = useCallback(() => {
    navigationInProgressRef.current = false;
    setActiveNavigationKey(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reset();
    }, [reset]),
  );

  const navigateOnce = useCallback((key: string, action: NavigationAction): boolean => {
    if (navigationInProgressRef.current) return false;

    navigationInProgressRef.current = true;
    setActiveNavigationKey(key);

    try {
      const result = action();
      if (result && typeof (result as Promise<unknown>).catch === "function") {
        void (result as Promise<unknown>).catch((error) => {
          reset();
          console.warn("Navigation did not complete:", error);
        });
      }
      return true;
    } catch (error) {
      reset();
      throw error;
    }
  }, [reset]);

  return { activeNavigationKey, navigateOnce };
}
