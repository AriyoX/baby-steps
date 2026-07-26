export const PROFILE_NAME_MAX_LENGTH = 80;

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

export interface ProfileNameValidation {
  value: string;
  error: string | null;
}

export const normalizeProfileName = (value: string): string =>
  value.normalize("NFC").trim();

export const validateProfileName = (value: string): ProfileNameValidation => {
  const normalized = normalizeProfileName(value);

  if (!normalized) {
    return { value: normalized, error: "Enter a name." };
  }
  if ([...normalized].length > PROFILE_NAME_MAX_LENGTH) {
    return {
      value: normalized,
      error: `Use ${PROFILE_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }
  if (CONTROL_CHARACTER_PATTERN.test(normalized)) {
    return {
      value: normalized,
      error: "Remove line breaks or other unsupported control characters.",
    };
  }

  return { value: normalized, error: null };
};
