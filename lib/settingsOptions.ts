export type SettingsRoute =
  | "/parent/settings/account"
  | "/parent/settings/parent-pin"
  | "/parent/settings/child-profiles"
  | "/parent/settings/audio"
  | "/parent/settings/notifications"
  | "/parent/settings/privacy-safety"
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
      {
        title: "Parent Access PIN",
        description: "Set, change, or review the PIN used to leave child mode.",
        icon: "keypad-outline",
        iconColor: "#7C3AED",
        route: "/parent/settings/parent-pin",
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

export const REQUIRED_SETTINGS_ENTRY_TITLES = [
  "Account",
  "Child Profiles",
  "Parent Access PIN",
  "Audio",
  "Notifications",
  "Privacy & Safety",
  "Help & Support",
  "About Baby Steps",
] as const;
