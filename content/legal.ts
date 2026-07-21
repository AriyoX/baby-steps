export type LegalSection = {
  title: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
};

export type LegalDocument = {
  title: string;
  lastUpdated: string;
  introduction: readonly string[];
  sections: readonly LegalSection[];
};

export const PRIVACY_POLICY: LegalDocument = {
  title: "Privacy Policy",
  lastUpdated: "July 21, 2026",
  introduction: [
    "Baby Steps is an educational app for young children and their parents or guardians. This policy explains what information Baby Steps collects or processes, why it is used, and the choices available to families.",
    "Parent accounts and family settings are intended for adults. Children should use Baby Steps with the supervision of a parent or guardian.",
  ],
  sections: [
    {
      title: "1. Information we collect",
      paragraphs: [
        "When a parent or guardian creates an account, we process an email address. Passwords are handled by our authentication provider and are not available to Baby Steps in readable form.",
        "A parent may provide child profile information such as a name, gender, age or age range, preferred learning language, and learning focus. We also process learning information needed to save progress and show family summaries.",
      ],
      bullets: [
        "Activity, game, lesson, story, and coloring progress",
        "Scores, stages, levels, completion times, and achievement records",
        "App settings such as language, onboarding state, active profile, and reminder preferences",
        "Authentication sessions and progress saved locally on the device",
        "Basic technical and security logs processed by our service providers, such as network address, device or browser information, and request logs",
      ],
    },
    {
      title: "2. Optional device features",
      paragraphs: [
        "Baby Steps may ask for notification permission if a parent chooses gentle learning reminders. These reminders are scheduled on the device and do not require a push token or a child's contact details.",
        "If a user saves or shares coloring artwork, the operating system may provide access needed to save the image or open the device share sheet. Baby Steps does not upload that artwork to our servers. Saved or shared copies are controlled by the device and the destination selected by the user.",
        "Audio playback and text-to-speech may use the device's operating-system services. Baby Steps' third-party online translation helper is currently disabled.",
      ],
    },
    {
      title: "3. Information we do not intentionally collect",
      bullets: [
        "Camera or microphone recordings",
        "Precise location or contact lists",
        "Advertising identifiers for targeted advertising",
        "A child's email address or phone number",
      ],
    },
    {
      title: "4. How we use information",
      bullets: [
        "Create, secure, and support parent accounts",
        "Create and manage child profiles and family settings",
        "Save learning progress, activity history, and achievements",
        "Show parent dashboard summaries and continue learning across supported devices",
        "Provide password reset, account recovery, support, and account deletion",
        "Operate, protect, troubleshoot, and improve Baby Steps",
      ],
    },
    {
      title: "5. How information is shared",
      paragraphs: [
        "We use Supabase for authentication, database storage, and related service operations. Device and operating-system providers may process information when a user enables notifications, text-to-speech, saving, or sharing. We may also disclose information when required by law or when reasonably necessary to protect users, rights, safety, or the service.",
        "We do not sell personal information, and Baby Steps does not show targeted advertising to children.",
      ],
    },
    {
      title: "6. Children's privacy and parent control",
      paragraphs: [
        "Children cannot create their own Baby Steps account. A parent or guardian controls the account, chooses what child profile information to provide, supervises use of the app, and may request correction or deletion of child-related information.",
        "By creating a child profile, the parent or guardian confirms that they have authority to provide and manage that child's information.",
      ],
    },
    {
      title: "7. Retention and account deletion",
      paragraphs: [
        "We retain account, profile, and learning information while it is needed to provide Baby Steps. Local app data remains until it is cleared or the app is uninstalled. Images saved to a gallery remain there until the user deletes them.",
        "A parent can schedule account deletion from Settings > Account > Delete Account. During the 30-day period, the account is disabled for normal use and its child profiles and progress are hidden. Signing in during that period allows the parent to keep the account.",
        "After 30 days, Baby Steps deletes or anonymizes user-owned account, child profile, progress, activity, and achievement data through a secure server process. Limited records may be retained where required for security, legal, fraud-prevention, dispute, backup, or compliance reasons. Shared educational content is not user-owned data and is not deleted with an account.",
      ],
    },
    {
      title: "8. Choices and rights",
      paragraphs: [
        "Depending on applicable law, a parent or guardian may ask to access, correct, export, restrict, object to, or delete personal information. Optional notification and media permissions can be changed in device settings. Contact us if an available in-app control does not meet your request.",
      ],
    },
    {
      title: "9. Security and international processing",
      paragraphs: [
        "We use reasonable technical and organizational safeguards, but no storage or transmission method is completely secure. Information may be processed in countries other than the user's own where our service providers operate, subject to applicable safeguards.",
      ],
    },
    {
      title: "10. Policy changes and contact",
      paragraphs: [
        "We may update this policy as Baby Steps changes. We will change the date above and provide additional notice when required.",
        "For privacy questions or data requests, email hello@babystepslearn.com.",
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  title: "Terms of Service",
  lastUpdated: "July 21, 2026",
  introduction: [
    "These Terms of Service govern use of the Baby Steps app and related services. By creating an account or using Baby Steps, you agree to these Terms and our Privacy Policy.",
    "If you do not agree, do not create an account or use the service.",
  ],
  sections: [
    {
      title: "1. Parent or guardian agreement",
      paragraphs: [
        "Parent accounts are for adults who are legally able to agree to these Terms. By creating an account, you confirm that you are a parent, legal guardian, or another adult authorized to manage the child information you provide and to supervise each child's use of Baby Steps.",
      ],
    },
    {
      title: "2. What Baby Steps provides",
      paragraphs: [
        "Baby Steps provides educational stories, language activities, games, coloring, progress tools, achievements, and parent controls for young learners. The content supports learning and family engagement; it is not a substitute for professional educational, medical, developmental, or other advice.",
      ],
    },
    {
      title: "3. Accounts and security",
      bullets: [
        "Provide accurate account information and keep it up to date",
        "Keep your password and device access secure",
        "Do not share an account with anyone who is not authorized to manage the family profiles",
        "Tell us promptly if you believe the account has been accessed without permission",
      ],
      paragraphs: [
        "You are responsible for activity performed through your account unless prohibited by applicable law.",
      ],
    },
    {
      title: "4. Child profiles and supervision",
      paragraphs: [
        "You decide what child profile information to provide and are responsible for having the authority or consent needed to provide it. You must supervise children's use of Baby Steps, choose age-appropriate activities, and manage access to parent-only areas and device features such as sharing or notifications.",
      ],
    },
    {
      title: "5. Acceptable use",
      paragraphs: [
        "You may use Baby Steps only for lawful, personal, family, and educational purposes. You must not:",
      ],
      bullets: [
        "Break the law or violate another person's rights",
        "Attempt to access another family's account or non-public parts of the service",
        "Interfere with security, availability, or normal operation of Baby Steps",
        "Upload or transmit malicious code or harmful, abusive, or unlawful material",
        "Copy, scrape, reverse engineer, resell, or commercially exploit the service except where the law expressly permits it",
      ],
    },
    {
      title: "6. Content and license",
      paragraphs: [
        "Baby Steps and its educational content, illustrations, branding, software, and other materials are owned by Baby Steps or its licensors and are protected by applicable intellectual-property laws. We give you a limited, personal, non-exclusive, non-transferable, revocable license to use the app for its intended family and educational purpose while you follow these Terms.",
      ],
    },
    {
      title: "7. Artwork and information you provide",
      paragraphs: [
        "You keep any rights you have in artwork or other content created through the app. Coloring artwork is handled locally unless you choose to save or share it. You give Baby Steps permission to process account, profile, and progress information only as needed to operate and improve the service in accordance with the Privacy Policy.",
        "You must not provide content or information that you do not have the right to use.",
      ],
    },
    {
      title: "8. Privacy and service providers",
      paragraphs: [
        "Our Privacy Policy explains how information is handled. Baby Steps relies on service providers such as Supabase and on device or operating-system features. Their services may be subject to their own terms and policies.",
      ],
    },
    {
      title: "9. Internet, reminders, and availability",
      paragraphs: [
        "An internet connection is required for account access, syncing, and some content or updates. Some saved activities may remain available offline. Optional reminders depend on device permission and operating-system behavior.",
        "We work to keep Baby Steps useful and available, but features or content may change, be interrupted, or be discontinued. We may release updates needed for security, compatibility, or service operation.",
      ],
    },
    {
      title: "10. Suspension and ending use",
      paragraphs: [
        "You may stop using Baby Steps at any time and may schedule account deletion in the app. We may restrict or suspend access when reasonably necessary to protect children, users, the service, or legal rights, or when these Terms are materially violated. Where appropriate, we will provide notice and an opportunity to resolve the issue.",
      ],
    },
    {
      title: "11. Disclaimers",
      paragraphs: [
        "To the extent permitted by law, Baby Steps is provided on an 'as available' basis. We do not promise that every feature will always be available, error-free, or suitable for every child or learning need. Nothing in these Terms limits consumer guarantees or other rights that cannot legally be excluded.",
      ],
    },
    {
      title: "12. Limitation of liability",
      paragraphs: [
        "To the extent permitted by law, Baby Steps and its team are not liable for indirect, incidental, special, consequential, or punitive losses arising from use of or inability to use the service. Any liability that cannot be excluded is limited only to the extent permitted by applicable law.",
      ],
    },
    {
      title: "13. Changes and contact",
      paragraphs: [
        "We may update these Terms as the service changes. We will update the date above and provide additional notice when required. Continued use after updated Terms take effect means you accept them; if you do not agree, you should stop using the service.",
        "Questions about these Terms can be sent to hello@babystepslearn.com.",
      ],
    },
  ],
};
