export type SettingsRoute =
  | "/parent/settings/account"
  | "/parent/settings/child-profiles"
  | "/parent/settings/audio"
  | "/parent/settings/language-learning"
  | "/parent/settings/notifications"
  | "/parent/settings/privacy-safety"
  | "/parent/settings/subscription-payments"
  | "/parent/settings/help-support"
  | "/parent/settings/about";

export interface SettingsEntry {
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  route: SettingsRoute;
}

export interface SettingsSection {
  title: string;
  entries: SettingsEntry[];
}

export interface PlaceholderSettingsInfo {
  title: string;
  description: string;
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    title: "Family",
    entries: [
      {
        title: "Account",
        description: "Manage parent account details and sign-in options.",
        icon: "person-circle-outline",
        iconColor: "#2563EB",
        route: "/parent/settings/account",
      },
      {
        title: "Child Profiles",
        description: "View, add, edit, or archive learner profiles.",
        icon: "people-outline",
        iconColor: "#F97316",
        route: "/parent/settings/child-profiles",
      },
    ],
  },
  {
    title: "Preferences",
    entries: [
      {
        title: "Audio",
        description: "Adjust music, sounds, and background tracks.",
        icon: "volume-high-outline",
        iconColor: "#D97706",
        route: "/parent/settings/audio",
      },
      {
        title: "Language & Learning",
        description: "Choose learning languages and lesson preferences.",
        icon: "language-outline",
        iconColor: "#7C3AED",
        route: "/parent/settings/language-learning",
      },
      {
        title: "Notifications",
        description: "Manage reminders and learning updates.",
        icon: "notifications-outline",
        iconColor: "#059669",
        route: "/parent/settings/notifications",
      },
    ],
  },
  {
    title: "Care & Support",
    entries: [
      {
        title: "Privacy & Safety",
        description: "Review family privacy, safety, and deletion information.",
        icon: "shield-checkmark-outline",
        iconColor: "#0891B2",
        route: "/parent/settings/privacy-safety",
      },
      {
        title: "Subscription / Payments",
        description: "Manage plans, receipts, and payment options.",
        icon: "card-outline",
        iconColor: "#DB2777",
        route: "/parent/settings/subscription-payments",
      },
      {
        title: "Help & Support",
        description: "Get help with accounts, deletion requests, and app questions.",
        icon: "help-circle-outline",
        iconColor: "#4F46E5",
        route: "/parent/settings/help-support",
      },
      {
        title: "About Baby Steps",
        description: "See app version, policies, and Baby Steps information.",
        icon: "information-circle-outline",
        iconColor: "#475569",
        route: "/parent/settings/about",
      },
    ],
  },
];

export const PLACEHOLDER_SETTINGS: Record<string, PlaceholderSettingsInfo> = {
  "language-learning": {
    title: "Language & Learning",
    description: "Language choices and learning preferences will be managed here.",
  },
  notifications: {
    title: "Notifications",
    description: "Reminder and learning update preferences will be managed here.",
  },
  "privacy-safety": {
    title: "Privacy & Safety",
    description: "Family privacy and child safety choices will be managed here.",
  },
  "subscription-payments": {
    title: "Subscription / Payments",
    description: "Plan, receipt, and payment settings will be managed here.",
  },
  "help-support": {
    title: "Help & Support",
    description: "Help articles and support contact options will be managed here.",
  },
  about: {
    title: "About Baby Steps",
    description: "App details, policies, and Baby Steps information will be shown here.",
  },
  "account-edit-profile": {
    title: "Edit Parent Profile",
    description: "Parent profile editing will be managed here.",
  },
  "account-security": {
    title: "Email & Password",
    description: "Email and password changes will be managed here.",
  },
  "child-profile-edit": {
    title: "Edit Child Details",
    description: "Child profile details and learning preferences will be managed here.",
  },
};

export const REQUIRED_SETTINGS_ENTRY_TITLES = [
  "Account",
  "Child Profiles",
  "Audio",
  "Language & Learning",
  "Notifications",
  "Privacy & Safety",
  "Subscription / Payments",
  "Help & Support",
  "About Baby Steps",
] as const;
