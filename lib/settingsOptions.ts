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
        description: "Update your name, email, password, or sign-in.",
        icon: "person-circle-outline",
        iconColor: "#2563EB",
        route: "/parent/settings/account",
      },
      {
        title: "Child Profiles",
        description: "See, add, or change your children's profiles.",
        icon: "people-outline",
        iconColor: "#F97316",
        route: "/parent/settings/child-profiles",
      },
      {
        title: "Parent Access PIN",
        description: "Choose the PIN that protects parent-only areas.",
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
        description: "Choose the music, sounds, and volume.",
        icon: "volume-high-outline",
        iconColor: "#D97706",
        route: "/parent/settings/audio",
      },
      {
        title: "Notifications",
        description: "Choose when Baby Steps reminds you.",
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
        description: "See how your family's information is kept safe.",
        icon: "shield-checkmark-outline",
        iconColor: "#0891B2",
        route: "/parent/settings/privacy-safety",
      },
      {
        title: "Help & Support",
        description: "Find answers or contact us for help.",
        icon: "help-circle-outline",
        iconColor: "#4F46E5",
        route: "/parent/settings/help-support",
      },
      {
        title: "About Baby Steps",
        description: "Learn about Baby Steps and read our policies.",
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
