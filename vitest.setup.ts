import "@testing-library/jest-dom/vitest"

// `lib/env.client.ts` throws at import time if these are unset — the test
// environment never loads `.env.local`, so any test that transitively
// imports a module touching `clientEnv` (e.g. email templates) needs these
// present. Placeholder values only; never read for anything functional here.
process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??= "test-api-key"
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??= "test.firebaseapp.com"
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??= "test-project"
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??= "test-project.appspot.com"
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??= "000000000000"
process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??=
  "1:000000000000:web:0000000000000000000000"
