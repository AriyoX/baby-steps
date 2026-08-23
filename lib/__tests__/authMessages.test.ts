import {
  EMAIL_NOT_CONFIRMED_MESSAGE,
  CONFIRMATION_EMAIL_RESENT_MESSAGE,
  LOGIN_FAILED_AFTER_RESET_REQUEST_MESSAGE,
  LOGIN_FAILED_MESSAGE,
  PASSWORD_REQUIREMENT_MESSAGE,
  RESET_EMAIL_SENT_MESSAGE,
  RESET_LINK_EXPIRED_MESSAGE,
  SAME_PASSWORD_MESSAGE,
  SIGNUP_ACCEPTED_MESSAGE,
  SIGNUP_CONFIRMATION_LINK_EXPIRED_MESSAGE,
  SIGNUP_EXISTING_ACCOUNT_DETECTED_MESSAGE,
  getForgotPasswordErrorMessage,
  getFriendlyAuthRedirectErrorMessage,
  getLoginErrorMessage,
  getPasswordUpdateErrorMessage,
  getResendConfirmationErrorMessage,
  getSignUpErrorMessage,
  isSignUpExistingAccountResponse,
  validateEmailAddress,
  validateLoginForm,
  validateResetPasswordForm,
  validateSignUpForm,
} from "@/lib/authMessages";

describe("auth message helpers", () => {
  it("maps signup outcomes to friendly copy", () => {
    expect(getSignUpErrorMessage({ message: "User already registered" })).toBe(
      SIGNUP_EXISTING_ACCOUNT_DETECTED_MESSAGE,
    );
    expect(getSignUpErrorMessage({ message: "Password should be at least 6 characters" })).toBe(
      PASSWORD_REQUIREMENT_MESSAGE,
    );
    expect(SIGNUP_ACCEPTED_MESSAGE).toBe(
      "Check your email to confirm your Baby Steps account.",
    );
    expect(
      isSignUpExistingAccountResponse({
        user: { identities: [] },
      }),
    ).toBe(true);
  });

  it("keeps login failures friendly and optionally mentions a recent reset request", () => {
    expect(getLoginErrorMessage({ message: "Invalid login credentials" })).toBe(
      LOGIN_FAILED_MESSAGE,
    );
    expect(
      getLoginErrorMessage(
        { message: "Invalid login credentials" },
        { recentlyRequestedPasswordReset: true },
      ),
    ).toBe(LOGIN_FAILED_AFTER_RESET_REQUEST_MESSAGE);
    expect(getLoginErrorMessage({ message: "Email not confirmed" })).toBe(
      EMAIL_NOT_CONFIRMED_MESSAGE,
    );
  });

  it("uses safe forgot-password and redirect-link copy", () => {
    expect(RESET_EMAIL_SENT_MESSAGE).toBe(
      "If an account exists for this email, we'll send a password reset link.",
    );
    expect(getForgotPasswordErrorMessage({ message: "unexpected service error" })).toBe(
      "We couldn't send the reset link just now. Please try again.",
    );
    expect(getFriendlyAuthRedirectErrorMessage("recovery")).toBe(
      RESET_LINK_EXPIRED_MESSAGE,
    );
    expect(getFriendlyAuthRedirectErrorMessage("signup")).toBe(
      SIGNUP_CONFIRMATION_LINK_EXPIRED_MESSAGE,
    );
  });

  it("keeps resend-confirmation feedback friendly", () => {
    expect(CONFIRMATION_EMAIL_RESENT_MESSAGE).toBe(
      "We sent another confirmation email. Please check your inbox and spam folder.",
    );
    expect(getResendConfirmationErrorMessage({ message: "rate limit exceeded" })).toBe(
      "We couldn't send another confirmation email just now. Please wait a moment and try again.",
    );
    expect(getResendConfirmationErrorMessage({ message: "unexpected service error" })).toBe(
      "We couldn't send another confirmation email just now. Please try again.",
    );
  });

  it("maps reset-password errors to clear next actions", () => {
    expect(
      getPasswordUpdateErrorMessage({
        message: "New password should be different from the old password",
      }),
    ).toBe(SAME_PASSWORD_MESSAGE);
    expect(getPasswordUpdateErrorMessage({ message: "Auth session missing" })).toBe(
      "We couldn't update your password. Please request a new link and try again.",
    );
    expect(getPasswordUpdateErrorMessage({ message: "Token has expired" })).toBe(
      RESET_LINK_EXPIRED_MESSAGE,
    );
  });

  it("validates auth forms with parent-friendly messages", () => {
    expect(validateEmailAddress("")).toBe("Please enter your email address.");
    expect(validateEmailAddress("parent")).toBe("Please enter a valid email address.");
    expect(validateEmailAddress("parent@example.com")).toBeNull();

    expect(validateLoginForm("parent@example.com", "")).toBe("Please enter your password.");
    expect(validateSignUpForm("parent@example.com", "123", "123")).toBe(
      PASSWORD_REQUIREMENT_MESSAGE,
    );
    expect(validateSignUpForm("parent@example.com", "123456", "654321")).toBe(
      "Those passwords don't match. Please try again.",
    );
    expect(validateResetPasswordForm("123456", "654321")).toBe(
      "Those passwords don't match. Please try again.",
    );
  });
});
