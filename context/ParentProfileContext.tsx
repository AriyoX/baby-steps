import React from "react";
import {
  fetchParentProfile,
  type ParentProfile,
} from "@/lib/parentProfileRepository";

interface ParentProfileContextValue {
  profile: ParentProfile | null;
  isLoading: boolean;
  error: string | null;
  refreshParentProfile: () => Promise<ParentProfile | null>;
  setConfirmedParentProfile: (profile: ParentProfile) => void;
}

const ParentProfileContext =
  React.createContext<ParentProfileContextValue | undefined>(undefined);

export function ParentProfileProvider({
  accountId,
  children,
}: {
  accountId: string | null;
  children: React.ReactNode;
}) {
  const [profile, setProfile] = React.useState<ParentProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(Boolean(accountId));
  const [error, setError] = React.useState<string | null>(null);
  const accountIdRef = React.useRef(accountId);
  accountIdRef.current = accountId;

  const refreshParentProfile = React.useCallback(async () => {
    const requestedAccountId = accountIdRef.current;
    if (!requestedAccountId) {
      setProfile(null);
      setIsLoading(false);
      setError(null);
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const nextProfile = await fetchParentProfile();
      if (
        accountIdRef.current !== requestedAccountId ||
        nextProfile.id !== requestedAccountId
      ) {
        return null;
      }
      setProfile(nextProfile);
      return nextProfile;
    } catch (refreshError) {
      if (accountIdRef.current === requestedAccountId) {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "Could not load the parent profile.",
        );
      }
      return null;
    } finally {
      if (accountIdRef.current === requestedAccountId) {
        setIsLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    setProfile(null);
    setError(null);
    setIsLoading(Boolean(accountId));
    if (accountId) {
      void refreshParentProfile();
    }
  }, [accountId, refreshParentProfile]);

  const setConfirmedParentProfile = React.useCallback(
    (nextProfile: ParentProfile) => {
      if (nextProfile.id !== accountIdRef.current) return;
      setProfile(nextProfile);
      setError(null);
      setIsLoading(false);
    },
    [],
  );

  return (
    <ParentProfileContext.Provider
      value={{
        profile,
        isLoading,
        error,
        refreshParentProfile,
        setConfirmedParentProfile,
      }}
    >
      {children}
    </ParentProfileContext.Provider>
  );
}

export const useParentProfile = (): ParentProfileContextValue => {
  const context = React.useContext(ParentProfileContext);
  if (!context) {
    throw new Error(
      "useParentProfile must be used within a ParentProfileProvider",
    );
  }
  return context;
};
