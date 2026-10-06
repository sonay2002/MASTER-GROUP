# Master Group v380 — Autonomous Local AI

## AI assistant

The service-name assistant runs independently from OpenAI and Firebase Functions. Its main engine is local and works offline. The current UI contract is unchanged: the user types in the service field and the suggested professional Russian wording is shown above the field.

### Open-vocabulary behavior
The engine does not require an exact catalog entry for every service name. It can recover unseen action stems and preserve previously unknown objects, for example:

- `крепл мотора` → `Крепление мотора`
- `крепление мотор` → `Крепление мотора`
- `fixare motor` → `Фиксация мотора`
- `prindere motor` → `Крепление мотора`
- `kreplenie motora` → `Крепление мотора`
- `сверл дырк` → `Сверление дырки`
- `montare faianta baie` → `Укладка плитки в ванной комнате`
- `неизвестная новая услуга` → `Неизвестная новая услуга`

The catalog is used as grounding when a close known service exists, not as a hard whitelist of allowed words.

### Processing layers
1. Input normalization (Russian, Romanian/Latin, transliteration and keyboard-layout recovery).
2. Conservative typo/phonetic recovery.
3. Semantic grounding against the live Master Group catalog.
4. Open-vocabulary local generation for unseen service names.
5. Guardrails to avoid inventing locations, quantities, prices or unsupported facts.
6. Optional browser on-device LanguageModel can improve generation when the device exposes it; there is no remote fallback.

### Firebase role
Firebase can remain responsible for authentication, cloud data and synchronization elsewhere in Master Group. The service-name AI does not require Firebase Functions or OpenAI.

### Tests
Run from the project root:

```bash
node tests/ai-service-smoke.js
node tests/ai-stress-smoke.js
node tests/ai-open-vocabulary-smoke.js
node tests/calculations-smoke.js
node tests/data-model-smoke.js
node tests/finance-sync-smoke.js
node tests/firebase-sync-boundary-smoke.js
node tests/offline-engine-smoke.js
node tests/pwa-update-smoke.js
node tests/settings-navigation-smoke.js
```
