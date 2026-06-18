# Privacy Policy for Baby Steps

**Last updated:** June 18, 2026

Baby Steps ("we," "our," or "us") is an educational prototype app for young children and their parents/guardians. This Privacy Policy explains what the current app implementation collects or processes, how it is used, and the choices users have.

## 1. Information We Collect

### Account Information

When a parent/guardian creates an account, the app uses Supabase Authentication to process:

- Email address
- Password

Passwords are handled by Supabase Authentication.

### Child Profile Information

When adding a child profile, the app stores parent-provided information such as:

- Child name
- Child gender
- Child age/range
- Learning focus/reason from the add-child flow

### Learning And Progress Information

To support the parent dashboard, activity history, and achievements, the app may process:

- Game/activity progress and completion data
- Activity metadata, including activity type, activity name, score, duration, completion time, stage, level, and details
- Achievement definition and unlock data
- Locally stored game progress

### Local Device Storage

The app stores certain data locally on the device with AsyncStorage, including:

- Supabase auth session data
- App onboarding status
- Language preference
- Game progress
- Session and weekly learning stats in some utilities

### Optional Media Access

The coloring feature uses device media and sharing APIs. If a user chooses to save or share artwork, the app may request media/photo access to:

- Save images to the device gallery, including a `ColoringBook` album where supported
- Share images using the device share sheet

### Text Sent To Third-Party Language Services

The current UI language toggle uses hardcoded local translations. Prototype Sunbird helpers also exist in the codebase for translation and text-to-speech. If those helpers are enabled or used, text may be sent to Sunbird AI endpoints.

## 2. Information We Do Not Intentionally Collect

Based on the current app implementation, we do not intentionally collect:

- Camera recordings
- Microphone recordings
- Precise location data
- Contacts
- In-app advertising identifiers for ad targeting

## 3. How We Use Information

We use collected information to:

- Create and maintain parent accounts
- Create and manage child profiles
- Track learning activity, quiz scores, and game completion
- Show parent dashboard summaries
- Display earned achievements
- Provide password reset and account security features
- Support optional translation/text-to-speech prototype features when used
- Improve app reliability and MVP readiness

## 4. How We Share Information

We may share information with service providers that help operate the app:

- **Supabase** for authentication and database storage
- **Sunbird AI** for translation/text-to-speech processing if those prototype features are used

We may also share information:

- When a user explicitly shares content through device sharing features
- If required by law or to protect rights, safety, and security

We do not sell personal information.

## 5. Data Retention

We retain data for as long as needed to provide the app and related services, including:

- Account and profile data while an account remains active
- Learning/progress records needed for parent dashboards and continuity
- Local device data until it is removed, app storage is cleared, or the app is uninstalled

Saved images remain in the device gallery until the user deletes them.

## 6. Children's Privacy

Baby Steps is intended for children's learning, but account control is designed for parents/guardians. Parents/guardians are responsible for:

- Providing child profile information
- Supervising a child's use of the app
- Requesting updates or deletion of child-related data

## 7. Security

We use reasonable technical and organizational measures to protect information. No method of storage or transmission is 100% secure.

Current MVP-readiness note: `lib/lugandaTTS.ts` contains a hardcoded prototype service token and must be secured before production release.

## 8. International Data Processing

Depending on user region and provider infrastructure, data may be processed or stored outside the user's country.

## 9. User Choices And Rights

Users can:

- Update profile details where the app supports it
- Manage optional media permissions through device settings
- Avoid prototype translation/text-to-speech features if they do not want text sent to a third-party language service
- Request account or data deletion by contacting us

## 10. Account And Data Deletion

Account and data deletion request instructions are available at:

- [docs/delete-account.html](docs/delete-account.html)

## 11. Changes To This Policy

We may update this Privacy Policy from time to time. We will update the "Last updated" date when changes are made.

## 12. Contact Us

For privacy questions or deletion requests, contact:

- **Email:** hello@babystepslearn.com
- **Organization/App Team:** Baby Steps
