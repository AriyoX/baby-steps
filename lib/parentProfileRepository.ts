import { isLikelyNetworkError } from "@/lib/network";
import { validateProfileName } from "@/lib/profileValidation";
import { supabase } from "@/lib/supabase";

export type ParentProfileFailureKind =
  | "not-authenticated"
  | "authorization"
  | "network"
  | "session-changed"
  | "validation"
  | "unknown";

export class ParentProfileError extends Error {
  constructor(
    message: string,
    readonly kind: ParentProfileFailureKind,
  ) {
    super(message);
    this.name = "ParentProfileError";
  }
}

export interface ParentProfile {
  id: string;
  displayName: string | null;
  email: string;
}

interface ParentProfileRow {
  id: string;
  display_name: string | null;
}

const classifyRepositoryError = (error: unknown): ParentProfileError => {
  if (error instanceof ParentProfileError) return error;
  if (isLikelyNetworkError(error)) {
    return new ParentProfileError(
      "Baby Steps could not be reached. Check your connection and try again.",
      "network",
    );
  }

  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  if (code === "42501" || code.startsWith("PGRST3")) {
    return new ParentProfileError(
      "This account is not authorized to edit that parent profile.",
      "authorization",
    );
  }

  return new ParentProfileError(
    "The parent profile could not be saved. Please try again.",
    "unknown",
  );
};

const requireAuthenticatedParent = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw classifyRepositoryError(error);
  if (!data.user?.id || !data.user.email) {
    throw new ParentProfileError(
      "Sign in again before editing the parent profile.",
      "not-authenticated",
    );
  }
  return data.user;
};

export const fetchParentProfile = async (): Promise<ParentProfile> => {
  try {
    const user = await requireAuthenticatedParent();
    const { data, error } = await supabase
      .from("parent_profiles")
      .select("id, display_name")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;
    const row = (data as ParentProfileRow | null) ?? null;
    return {
      id: user.id,
      displayName: row?.display_name ?? null,
      email: user.email!,
    };
  } catch (error) {
    throw classifyRepositoryError(error);
  }
};

const writeParentProfile = async (
  parentId: string,
  displayName: string,
  exists: boolean,
): Promise<ParentProfileRow> => {
  const query = exists
    ? supabase
        .from("parent_profiles")
        .update({ display_name: displayName })
        .eq("id", parentId)
    : supabase
        .from("parent_profiles")
        .insert({ id: parentId, display_name: displayName });

  const { data, error } = await query
    .select("id, display_name")
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new ParentProfileError(
      "This account is not authorized to edit that parent profile.",
      "authorization",
    );
  }
  return data as ParentProfileRow;
};

export const saveParentDisplayName = async (
  input: string,
): Promise<ParentProfile> => {
  const validation = validateProfileName(input);
  if (validation.error) {
    throw new ParentProfileError(validation.error, "validation");
  }

  try {
    const user = await requireAuthenticatedParent();
    const { data: existing, error: readError } = await supabase
      .from("parent_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (readError) throw readError;

    let row: ParentProfileRow;
    try {
      row = await writeParentProfile(
        user.id,
        validation.value,
        Boolean(existing),
      );
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: unknown }).code ?? "")
          : "";
      // A concurrent first save may win the insert race. Retry only the
      // allowlisted display-name update.
      if (!existing && code === "23505") {
        row = await writeParentProfile(user.id, validation.value, true);
      } else {
        throw error;
      }
    }

    const currentUser = await requireAuthenticatedParent();
    if (currentUser.id !== user.id) {
      throw new ParentProfileError(
        "The signed-in account changed while this profile was saving.",
        "session-changed",
      );
    }

    return {
      id: user.id,
      displayName: row.display_name,
      email: user.email!,
    };
  } catch (error) {
    throw classifyRepositoryError(error);
  }
};
