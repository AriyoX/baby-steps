export const BABY_STEPS_SUPPORT_EMAIL = "hello@babystepslearn.com";

export const getSupportMailtoUrl = (subject: string): string =>
  `mailto:${BABY_STEPS_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
