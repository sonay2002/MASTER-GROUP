# Master Group v408 — Semantic AI + exactly 10M external correction memory

## AI assistant

The service-name assistant now has a real local generative layer based on **Gemma 4 E4B** running in the browser through Transformers.js/ONNX. There is no OpenAI API, Firebase Function, or remote inference call in the service-name AI path. The current UI contract is unchanged: the user types in the service field and the proposed Russian wording appears **above the field**.

The model is downloaded on first use and cached by the browser; after the model is cached, generation is performed on the user's device. WebGPU is used when available; CPU/WASM is used when it is not. Transformers.js supports browser-side ONNX execution and browser caching for models.

### Open-vocabulary behavior

The generative prompt explicitly allows new words and new services that are not present in the Master Group catalog. The catalog is contextual information, not a whitelist. Examples the assistant is expected to understand include:

- `крепл мотора` → `Крепление мотора`
- `креплн мотра` → `Крепление мотора`
- `prindere motor` → `Крепление мотора`
- `kreplenie motora` → `Крепление мотора`
- `свeрл дырк бет` → `Сверление отверстия в бетоне`
- `montare faianta baie` → `Укладка плитки в ванной комнате`

The smaller local model still cannot guarantee a correct interpretation of literally every possible typo or meaningless string. For highly damaged or ambiguous input, the existing deterministic Master Group fallback remains available.

### Processing layers

1. Local Gemma 4 E4B generative model: reconstruct meaning and formulate a professional Russian service name.
2. Existing deterministic Master Group language engine as a fast fallback.
3. Catalog grounding for known services without restricting unknown services.
4. Guardrails for quantities, units, prices, locations and unsupported facts.
5. Optional browser-native on-device LanguageModel enhancement when the platform exposes it.

Gemma 4 E4B is multilingual and explicitly supports both Russian and Romanian, which is useful for this application.

### First-run behavior

The model is several hundred MB in the browser cache for the `q4f16` WebGPU weight currently used by this build. It is not embedded into the small application archive because doing that would turn a ~1–2 MB app into a several-hundred-megabyte deployment. The browser downloads it once and caches it.

This means:

- no remote AI inference;
- first activation needs internet to obtain the model and JavaScript runtime;
- subsequent inference can be local after the model has been cached;
- if the model cannot run on a particular browser/device, the existing offline engine remains the fallback.

### Tests

Run from the project root:

```bash
node tests/ai-service-smoke.js
node tests/ai-stress-smoke.js
node tests/ai-open-vocabulary-smoke.js
node tests/ai-local-llm-smoke.js
node tests/calculations-smoke.js
node tests/data-model-smoke.js
node tests/finance-sync-smoke.js
node tests/firebase-sync-boundary-smoke.js
node tests/offline-engine-smoke.js
node tests/pwa-update-smoke.js
node tests/settings-navigation-smoke.js
```


## UI change in v383
The AI suggestion is now positioned as a compact floating layer above the service input. It is removed from normal document flow, so the input, Add button, service list, and modal height do not move when the suggestion appears.



## AI v408 semantic brain
The service-name assistant treats the 10,000,000-entry index as external memory, not as a phrase database. It repairs candidate word forms, resolves morphology/context, constructs unseen phrases, and uses a local language model only for hard cases. The user's original text is never replaced without an explicit tap on the suggestion.


## v410 fixes
- Contact card title reduced to roughly one-third of the previous mobile visual height.
- Added semantic sewer/trenching phrase recovery: noisy forms such as `штробавко канала канализации` resolve to `Штробление канала канализации`.
- Rejects known malformed generated combinations such as `травы канализац канализации`.


## v410 whole-text semantic memory
The service-name assistant treats the entire user string as a semantic request first. The 10M dictionary is supporting external memory; visible suggestions are taken from phrase/catalog memory and action+object concept retrieval, not from per-token replacement. A relevance gate rejects candidates that lose the main object of the request. Single nouns open a phrase neighborhood (e.g. “багажник” → “Установка багажника”, “Монтаж багажника”, …).
