export const MIN_AUTH_PASSWORD_LENGTH = 6;

export const SIGNUP_ACCEPTED_MESSAGE =
  "Check your email to confirm your Baby Steps account.";

export const SIGNUP_EXISTING_ACCOUNT_DETECTED_MESSAGE =
  "An account with this email already exists. Please sign in instead.";

export const SIGNUP_EXISTING_ACCOUNT_SAFE_MESSAGE =
  "If this email is already registered, try signing in instead. If it's new, check your inbox to confirm your account.";

export const LOGIN_FAILED_MESSAGE =
  "We couldn't sign you in with those details. Please check your email and password, or create an account if you're new.";

export const LOGIN_FAILED_AFTER_RESET_REQUEST_MESSAGE =
  `${LOGIN_FAILED_MESSAGE}\n\nIf you recently requested a password reset, please use the link in your email to choose a new password, or request a new link.`;

export const EMAIL_NOT_CONFIRMED_MESSAGE =
  "Please confirm your email before signing in. Check your inbox for the Baby Steps confirmation email.";

export const CONFIRMATION_EMAIL_RESENT_MESSAGE =
  "We sent another confirmation email. Please check your inbox and spam folder.";

export const RESET_EMAIL_SENT_MESSAGE =
  "If an account exists for this email, we'll send a password reset link.";

export const SAME_PASSWORD_MESSAGE =
  "Please choose a new password that is different from your old one.";

export const RESET_LINK_EXPIRED_MESSAGE =
  "This reset link has expired or is no longer valid. Please request a new one.";

export const AUTH_LINK_EXPIRED_MESSAGE =
  "This link has expired or is no longer valid. Please request a new one.";

export const SIGNUP_CONFIRMATION_LINK_EXPIRED_MESSAGE =
  "This confirmation link has expired or is no longer valid. Please sign in or create your Baby Steps account again.";

export const PASSWORD_REQUIREMENT_MESSAGE =
  `Please choose a password with at least ${MIN_AUTH_PASSWORD_LENGTH} characters.`;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FriendlyAuthRedirectFlow =
  | "signup"
  | "recovery"
  | "magiclink"
  | "email_change"
  | null
  | undefined;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const getAuthErrorMessage = (error: unknown): string => {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;

  const record = asRecord(error);
  if (typeof record?.message === "string") return record.message;
  if (typeof record?.error_description === "string") return record.error_description;
  if (typeof record?.error === "string") return record.error;

  return "";
};

const getAuthErrorCode = (error: unknown): string => {
  const record = asRecord(error);
  const code =
    record && (record.code ?? record.error_code ?? record.status ?? record.name);

  return typeof code === "string" || typeof code === "number"
    ? String(code).toLowerCase()
    : "";
};

const normalize = (value: unknown): string =>
  `${getAuthErrorMessage(value)} ${getAuthErrorCode(value)}`.toLowerCase();

export const isExistingAccountSignUpError = (error: unknown): boolean => {
  const normalized = normalize(error);
  return (
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("user already") ||
    normalized.includes("email already") ||
    normalized.includes("user_already_exists")
  );
};

export const isSignUpExistingAccountResponse = (data: unknown): boolean => {
  const record = asRecord(data);
  const user = asRecord(record?.user);
  const identities = user?.identities;

  return Array.isArray(identities) && identities.length === 0;
};

export const isEmailNotConfirmedError = (error: unknown): boolean => {
  const normalized = normalize(error);
  return (
    normalized.includes("email not confirmed") ||
    normalized.includes("email_not_confirmed") ||
    normalized.includes("not confirmed")
  );
};

export const isInvalidLoginCredentialsError = (error: unknown): boolean => {
  const normalized = normalize(error);
  return (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid_credentials") ||
    normalized.includes("invalid grant")
  );
};

export const isWeakPasswordError = (error: unknown): boolean => {
  const normalized = normalize(error);
  return (
    normalized.includes("password should be at least") ||
    normalized.includes("password must be at least") ||
    normalized.includes("weak password") ||
    normalized.includes("weak_password")
  );
};

export const isSamePasswordError = (error: unknown): boolean => {
  const normalized = normalize(error);
  return (
    normalized.includes("same password") ||
    normalized.includes("different from the old password") ||
    normalized.includes("different from your old password") ||
    normalized.includes("new password should be different") ||
    normalized.includes("same_password")
  );
};

export const isExpiredOrInvalidAuthLinkError = (error: unknown): boolean => {
  const normalized = normalize(error);
  return (
    normalized.includes("expired") ||
    normalized.includes("invalid token") ||
    normalized.includes("invalid link") ||
    normalized.includes("otp_expired") ||
    normalized.includes("bad_code") ||
    normalized.includes("flow_state_not_found")
  );
};

export const validateEmailAddress = (email: string): string | null => {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) return "Please enter your email address.";
  if (!EMAIL_PATTERN.test(trimmedEmail)) {
    return "Please enter a valid email address.";
  }

  return null;
};

export const validateSignUpForm = (
  email: string,
  password: string,
  confirmPassword: string,
): string | null => {
  const emailMessage = validateEmailAddress(email);
  if (emailMessage) return emailMessage;

  if (!password) return "Please create a password.";
  if (password.length < MIN_AUTH_PASSWORD_LENGTH) return PASSWORD_REQUIREMENT_MESSAGE;
  if (!confirmPassword) return "Please confirm your password.";
  if (password !== confirmPassword) {
    return "Those passwords don't match. Please try again.";
  }

  return null;
};

export const validateLoginForm = (
  email: string,
  password: string,
): string | null => {
  const emailMessage = validateEmailAddress(email);
  if (emailMessage) return emailMessage;
  if (!password) return "Please enter your password.";

  return null;
};

export const validateResetPasswordForm = (
  password: string,
  confirmPassword: string,
): string | null => {
  if (!password || !confirmPassword) return "Please fill in both password fields.";
  if (password !== confirmPassword) {
    return "Those passwords don't match. Please try again.";
  }
  if (password.length < MIN_AUTH_PASSWORD_LENGTH) return PASSWORD_REQUIREMENT_MESSAGE;

  return null;
};

export const getSignUpErrorMessage = (error: unknown): string => {
  if (isExistingAccountSignUpError(error)) {
    return SIGNUP_EXISTING_ACCOUNT_DETECTED_MESSAGE;
  }

  if (isWeakPasswordError(error)) return PASSWORD_REQUIREMENT_MESSAGE;

  const normalized = normalize(error);
  if (normalized.includes("invalid email")) {
    return "Please enter a valid email address.";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "We couldn't create your account just now. Please wait a moment and try again.";
  }

  return "We couldn't create your account just now. Please try again.";
};

export const getLoginErrorMessage = (
  error: unknown,
  options?: { recentlyRequestedPasswordReset?: boolean },
): string => {
  if (isEmailNotConfirmedError(error)) return EMAIL_NOT_CONFIRMED_MESSAGE;

  if (isInvalidLoginCredentialsError(error)) {
    return options?.recentlyRequestedPasswordReset
      ? LOGIN_FAILED_AFTER_RESET_REQUEST_MESSAGE
      : LOGIN_FAILED_MESSAGE;
  }

  const normalized = normalize(error);
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "We couldn't sign you in just now. Please wait a moment and try again.";
  }

  return options?.recentlyRequestedPasswordReset
    ? LOGIN_FAILED_AFTER_RESET_REQUEST_MESSAGE
    : LOGIN_FAILED_MESSAGE;
};

export const getForgotPasswordErrorMessage = (error: unknown): string => {
  const normalized = normalize(error);

  if (normalized.includes("invalid email")) {
    return "Please enter a valid email address.";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "We couldn't send another reset link just now. Please wait a moment and try again.";
  }

  return "We couldn't send the reset link just now. Please try again.";
};

export const getResendConfirmationErrorMessage = (error: unknown): string => {
  const normalized = normalize(error);

  if (normalized.includes("invalid email")) {
    return "Please enter a valid email address.";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "We couldn't send another confirmation email just now. Please wait a moment and try again.";
  }

  return "We couldn't send another confirmation email just now. Please try again.";
};

export const getPasswordUpdateErrorMessage = (error: unknown): string => {
  if (isSamePasswordError(error)) return SAME_PASSWORD_MESSAGE;
  if (isWeakPasswordError(error)) return PASSWORD_REQUIREMENT_MESSAGE;
  if (isExpiredOrInvalidAuthLinkError(error)) return RESET_LINK_EXPIRED_MESSAGE;

  return "We couldn't update your password. Please request a new link and try again.";
};

export const getFriendlyAuthRedirectErrorMessage = (
  flow?: FriendlyAuthRedirectFlow,
): string => {
  if (flow === "recovery") return RESET_LINK_EXPIRED_MESSAGE;
  if (flow === "signup") return SIGNUP_CONFIRMATION_LINK_EXPIRED_MESSAGE;

  return AUTH_LINK_EXPIRED_MESSAGE;
};
