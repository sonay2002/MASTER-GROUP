# Master Group v403 — Local Generative AI + 10M external correction memory

## AI assistant

The service-name assistant now has a real local generative layer based on **Qwen3-0.6B** running in the browser through Transformers.js/ONNX. There is no OpenAI API, Firebase Function, or remote inference call in the service-name AI path. The current UI contract is unchanged: the user types in the service field and the proposed Russian wording appears **above the field**.

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

1. Local Qwen3 generative model: reconstruct meaning and formulate a professional Russian service name.
2. Existing deterministic Master Group language engine as a fast fallback.
3. Catalog grounding for known services without restricting unknown services.
4. Guardrails for quantities, units, prices, locations and unsupported facts.
5. Optional browser-native on-device LanguageModel enhancement when the platform exposes it.

Qwen3 is multilingual and explicitly supports both Russian and Romanian, which is useful for this application.

### First-run behavior

The local model is approximately **570 MB** for the `q4f16` WebGPU weight currently used by this build. It is not embedded into the small application archive because doing that would turn a ~1–2 MB app into a several-hundred-megabyte deployment. The browser downloads it once and caches it.

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
