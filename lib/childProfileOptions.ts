export const CHILD_AGE_OPTIONS = [
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "12+",
] as const;

export const CHILD_GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "female", label: "Girl" },
  { value: "male", label: "Boy" },
] as const;

export const CHILD_LEARNING_REASON_OPTIONS = [
  "Build language and memory",
  "Grow creativity",
  "Connect with culture",
  "Prepare for school",
  "Enjoy healthier screen time",
  "Explore and have fun",
] as const;

export const OLDER_CHILD_GUIDANCE =
  "Baby Steps is designed mainly for ages 3–12. Older learners can still use it for language practice and confidence.";

export const isSupportedChildAge = (age: string): boolean =>
  CHILD_AGE_OPTIONS.includes(age as (typeof CHILD_AGE_OPTIONS)[number]);

export const isSupportedChildGender = (gender: string): boolean =>
  CHILD_GENDER_OPTIONS.some((option) => option.value === gender);
