# Master Group v36 — AI assistant

This is a static PWA. The application entry point is `index.html` in the repository root.

## AI assistant for service names

The previous offline fuzzy dictionary has been removed from the project. The 1M-term client-side dictionary, fuzzy search scripts, dictionary autocomplete and dictionary-specific tests are gone.

The service-name field now uses an AI assistant. A user can write Russian with spelling errors, missing letters, phonetic/keyboard mistakes or incomplete wording. The assistant uses the current direction and already selected services as context, understands construction terms and ordinary phrases, and can infer intent from Russian with errors, transliteration, mixed-language input, Romanian or English. It proposes a natural professional Russian formulation. The user can tap the suggestion or simply press **Добавить**. When AI is unavailable (for example, offline), the app keeps the original text instead of blocking the estimate.

The browser never contains the OpenAI API key. The frontend calls the Firebase callable function `correctServiceText`; the server stores `OPENAI_API_KEY` in Firebase Secret Manager. OpenAI recommends routing API requests through your own backend rather than shipping an API key to a browser.

## Firebase Functions

The backend is in `functions/` and uses Node.js 22, Firebase Functions 7.4.0 and the OpenAI Responses API with structured JSON output. Firebase currently supports Node.js 22 for Cloud Functions, and parameterized secrets are the recommended configuration mechanism.

From the repository root:

```bash
firebase use master-group-3e18e
firebase functions:secrets:set OPENAI_API_KEY
firebase deploy --only functions:correctServiceText
```

The model defaults to `gpt-6-luna`. You can change it with the `OPENAI_MODEL` parameter. The callable requires a signed-in Master Group user.

## GitHub Pages

The existing GitHub Actions workflow still deploys the PWA to GitHub Pages. The AI backend is deployed separately to Firebase Cloud Functions.

## Local tests

Run from the repository root:

```bash
node tests/calculations-smoke.js
node tests/data-model-smoke.js
node tests/finance-sync-smoke.js
node tests/firebase-sync-boundary-smoke.js
node tests/offline-engine-smoke.js
node tests/ai-service-smoke.js
```
