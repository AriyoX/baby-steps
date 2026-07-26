import {
  clearContentBundleCache,
  loadContentBundle,
} from "@/content/contentRepository";
import { invalidateChildAchievementsCache } from "@/components/games/achievements/achievementManager";
import {
  isSupportedLearningLanguageCode,
  normalizeLearningLanguageCode,
} from "@/content/languages";
import {
  upsertCachedActiveChildProfile,
  type ChildProfile,
} from "@/lib/accountManagement";
import {
  isSupportedChildAge,
  isSupportedChildGender,
} from "@/lib/childProfileOptions";
import { isLikelyNetworkError } from "@/lib/network";
import { validateProfileName } from "@/lib/profileValidation";
import { supabase } from "@/lib/supabase";

export type ChildProfileFailureKind =
  | "not-authenticated"
  | "not-found"
  | "authorization"
  | "network"
  | "session-changed"
  | "validation"
  | "unknown";

export class ChildProfileError extends Error {
  constructor(
    message: string,
    readonly kind: ChildProfileFailureKind,
  ) {
    super(message);
    this.name = "ChildProfileError";
  }
}

export interface ChildProfileEditInput {
  name: string;
  age: string;
  gender: string;
  reason: string;
  selectedLanguageCode: string;
}

export interface LanguageContentAvailability {
  languageCode: string;
  hasPublishedContent: boolean;
}

const CHILD_SELECT_COLUMNS =
  "id, parent_id, name, gender, age, reason, selected_language_code, created_at, deleted_at, archived_by_account_deletion_request_id";

const classifyChildProfileError = (error: unknown): ChildProfileError => {
  if (error instanceof ChildProfileError) return error;
  if (isLikelyNetworkError(error)) {
    return new ChildProfileError(
      "Baby Steps could not be reached. Check your connection and try again.",
      "network",
    );
  }

  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  if (code === "42501" || code.startsWith("PGRST3")) {
    return new ChildProfileError(
      "This parent account is not authorized to edit that child.",
      "authorization",
    );
  }
  return new ChildProfileError(
    "The child profile could not be saved. Please try again.",
    "unknown",
  );
};

const getAuthenticatedParentId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw classifyChildProfileError(error);
  if (!data.user?.id) {
    throw new ChildProfileError(
      "Sign in again before editing a child profile.",
      "not-authenticated",
    );
  }
  return data.user.id;
};

export const validateChildProfileEdit = (
  input: ChildProfileEditInput,
): ChildProfileEditInput => {
  const name = validateProfileName(input.name);
  if (name.error) {
    throw new ChildProfileError(name.error, "validation");
  }
  if (!isSupportedChildAge(input.age)) {
    throw new ChildProfileError(
      "Choose an age from 3 through 12, or 12+.",
      "validation",
    );
  }
  if (!isSupportedChildGender(input.gender)) {
    throw new ChildProfileError(
      "Choose a supported gender option.",
      "validation",
    );
  }

  const selectedLanguageCode = normalizeLearningLanguageCode(
    input.selectedLanguageCode,
  );
  if (!isSupportedLearningLanguageCode(selectedLanguageCode)) {
    throw new ChildProfileError(
      "Choose a supported learning language.",
      "validation",
    );
  }

  const reason = input.reason.normalize("NFC").trim();
  if ([...reason].length > 160) {
    throw new ChildProfileError(
      "Use 160 characters or fewer for the learning reason.",
      "validation",
    );
  }

  return {
    name: name.value,
    age: input.age,
    gender: input.gender,
    reason,
    selectedLanguageCode,
  };
};

export const inspectLanguageContentAvailability = async (
  languageCode: string,
): Promise<LanguageContentAvailability> => {
  const normalizedLanguageCode = normalizeLearningLanguageCode(languageCode);
  if (!isSupportedLearningLanguageCode(normalizedLanguageCode)) {
    throw new ChildProfileError(
      "Choose a supported learning language.",
      "validation",
    );
  }

  try {
    const result = await loadContentBundle(normalizedLanguageCode, {
      forceRefresh: true,
      maxAgeMs: 0,
      throwOnNetworkError: true,
    });
    return {
      languageCode: normalizedLanguageCode,
      hasPublishedContent: result.source === "database" && Boolean(result.bundle),
    };
  } catch (error) {
    throw classifyChildProfileError(error);
  }
};

export const updateOwnedActiveChildProfile = async (
  childId: string,
  input: ChildProfileEditInput,
): Promise<ChildProfile> => {
  if (!childId) {
    throw new ChildProfileError("Choose a child profile.", "validation");
  }
  const normalized = validateChildProfileEdit(input);

  try {
    const parentId = await getAuthenticatedParentId();
    const { data, error } = await supabase
      .from("children")
      .update({
        name: normalized.name,
        age: normalized.age,
        gender: normalized.gender,
        reason: normalized.reason,
        selected_language_code: normalized.selectedLanguageCode,
      })
      .eq("id", childId)
      .eq("parent_id", parentId)
      .is("deleted_at", null)
      .select(CHILD_SELECT_COLUMNS)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new ChildProfileError(
        "This child is not active or does not belong to the signed-in parent.",
        "not-found",
      );
    }

    const currentParentId = await getAuthenticatedParentId();
    if (currentParentId !== parentId) {
      throw new ChildProfileError(
        "The signed-in account changed while this profile was saving.",
        "session-changed",
      );
    }

    const saved = data as ChildProfile;
    try {
      await upsertCachedActiveChildProfile(parentId, saved);
    } catch (cacheError) {
      console.warn("Could not cache the updated child profile:", cacheError);
    }
    return saved;
  } catch (error) {
    throw classifyChildProfileError(error);
  }
};

export const refreshChildLanguageCaches = async (
  childId: string,
  previousLanguageCode: string,
  nextLanguageCode: string,
): Promise<void> => {
  const languages = [
    normalizeLearningLanguageCode(previousLanguageCode),
    normalizeLearningLanguageCode(nextLanguageCode),
  ].filter(
    (languageCode): languageCode is string => Boolean(languageCode),
  );

  await Promise.all(
    [...new Set(languages)].map((languageCode) =>
      clearContentBundleCache(languageCode),
    ),
  );

  await invalidateChildAchievementsCache(childId);
};
