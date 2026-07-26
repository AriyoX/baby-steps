/* global jest */

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
)

// Some component tests intentionally render without loading a project .env.
// Valid local-only placeholders let modules construct the Supabase client;
// suites that exercise Supabase behavior continue to provide focused mocks.
process.env.EXPO_PUBLIC_SUPABASE_URL ||= "http://127.0.0.1:54321"
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key"
