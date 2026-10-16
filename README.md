# Установка (GitHub Pages)

Загрузите содержимое архива в корень репозитория (ветка `main`), не вкладывая папку внутрь другой папки. Service Worker использует network-first для JS/CSS, поэтому старые кэшированные сборки не переиспользуются.

---

# Master Group v476 — точечная очистка навигации компьютера и планшета

Внесены только две запрошенные правки интерфейса:
- убрана дублирующая кнопка «Новая смета» из заголовка страницы списка смет; кнопка создания в верхней панели и кнопка создания в боковой панели сохранены;
- убран пункт «История изменений / Уведомления по сметам» из бокового меню; кнопка уведомлений в верхней панели сохранена.

Архив, финансы, обзор, настройки и быстрые переходы к существующим разделам оставлены. Мобильные стили и логика смет/финансов не менялись. Проверки: 39 smoke-тестов пройдены, 54 локальные ссылки на ресурсы проверены, ошибок синтаксиса JavaScript нет.

---

# Master Group v440 — offline estimate and correction fixes

This build fixes offline estimate creation, safely reconciles temporary local estimate numbers when cloud sync returns, allows the “Продолжить без облака” action to close the sign-in overlay, applies the “Запомнить меня” session choice, and disables public self-registration through the app client. Local term correction now receives direction/service context and is used if both model-based routes cannot provide a confident correction. The interface and visual styles are unchanged.

The 570 MB Qwen3 model is optional and is not downloaded automatically. Users can explicitly start the local model when WebGPU is available. OpenRouter remains optional and its key is stored only in this browser's local storage, not in the public source. If neither model route is available, local deterministic term rules try common Russian/Romanian shorthand and leave the source unchanged when confidence is insufficient.

Temporary estimate numbers created offline are replaced with a unique account-scoped number during the first successful cloud upload. Cloud sync failures do not block a local save. Changes to Firebase Authentication and deployed database rules still require the Firebase Console; client-side registration controls alone are not a server-side security boundary.

Real-device verification is still needed for iPhone memory behaviour, WebGPU inference and the live Firebase project's deployed rules.

The notes below describe historical versions and are retained as project history.
# Master Group v417 — five new work-first estimate templates + v416 AI

Service-name AI now uses the free Google Gemma 4 26B A4B endpoint through OpenRouter. The phrase is sent as a whole semantic request. Local Qwen inference is not started for normal service-name suggestions.

Key safeguards: pinned free model, reasoning disabled, structured JSON output, 6.5s network timeout, throughput-first provider routing, and semantic validation so an explicit action/object cannot be silently replaced by an unrelated one.

The OpenRouter key remains in the browser localStorage and is not embedded in GitHub Pages source.

# Master Group v408 — Semantic AI + exactly 10M external correction memory

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

- the first local-model setup needs internet to download the model and JavaScript runtime;
- after caching, Qwen3 can check text on-device;
- if WebGPU is unsupported or a safe correction is unavailable, the configured online route is tried;
- if both AI paths fail, the original text remains available unchanged.

### Tests

Run from the project root:

```bash
node tests/ai-service-smoke.js
node tests/ai-local-llm-smoke.js
node tests/ai-open-vocabulary-guard-smoke.js
node tests/ai-model-download-guard-smoke.js
node tests/ai-ui-race-smoke.js
node tests/ai-ui-persistent-smoke.js
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


## OpenRouter AI

Version 412 moves the heavy service-name reasoning to OpenRouter using the free router `openrouter/free`. The original whole phrase is sent to the remote AI first; the local 10M memory is supporting evidence and is not used for one-word auto-correction.

The API key is entered once in the browser when the AI is first used and stored only in that browser's local storage. It is not embedded in GitHub Pages source. Do not commit or paste the key into source files.

OpenRouter endpoint: https://openrouter.ai/api/v1/chat/completions
Model: openrouter/free

If OpenRouter is unavailable, the existing deterministic Master Group fallback remains available. The old on-device Qwen3 deep-inference path is disabled to avoid the iPhone memory/reload problem.

---

## История: v467

Master Group v467 — Mobile-matched desktop/tablet sidebar

Changes:
- Restored valid links to the existing desktop/tablet workspace stylesheet and navigation handler.
- Added css/desktop-layout-v467.css for screens 700px wide and larger with 600px minimum height.
- Sidebar palette matches the existing dark mobile drawer: near-black graphite surface, readable light text, subtle icon wells.
- Removed bright borders around navigation rows and icon tiles; added quiet hover/selected states.
- Updated service worker cache version and precache list.
- Phone layout and core estimate/finance logic are unchanged.

## Desktop polish v469

Новый файл `css/desktop-layout-v469.css` (подключён после v467 и добавлен в precache). Только оформление для экранов от 700px, телефон и логика не менялись: единые радиусы и тени карточек, типографика заголовков и чисел, аккуратные фильтры, таблица смет со статусами-«пилюлями», карточки обзора и графики, видимый фокус с клавиатуры, центрирование рабочей области на широких экранах.

## Desktop variant A, шаг 1 (v470): «Все сметы» — список и детали

`js/desktop-master-detail-v470.js` + `css/desktop-master-detail-v470.css` (от 1100px). Слева компактный список смет, справа панель выбранной сметы: клиент, адрес, услуги, оплаты, итоги, смена статуса, «Редактировать», «Открыть смету», «Удалить». Панель только читает данные; действия выполняются теми же кнопками и обработчиками, что и раньше. Во время редактирования режим выключается. На телефоне и планшете до 1100px ничего не меняется.

## Desktop variant A, шаг 2 (v471): «Главный экран»

`js/desktop-home-v471.js` + `css/desktop-home-v471.css` (от 1100px). Показатели (сумма смет, получено, осталось получить, расходы), последние сметы, блок оплаты и быстрые действия. Строка сметы открывает «Все сметы» с этой сметой выбранной. Если смет нет, показывается пустое состояние с кнопкой «Создать смету». Экран отображается сразу, не дожидаясь старой отрисовки (`mg-home-render-pending`). Только читает данные.

## Desktop variant A, шаг 3 (v472): редактор новой сметы

`css/desktop-editor-v472.css` (только стили, от 1100px). Шаг «Расчёт»: услуги слева (одна строка: название, количество, цена, сумма), справа тёмная карточка «Итого» с кнопкой «Добавить» и кнопки «Далее» / «Назад». Шаг «Направления»: карточки 2×2 без переноса слов посреди слова. Разметка и расчёты не менялись. Шаги мастера скрываются атрибутом `hidden`, поэтому `display:grid` задан только для `:not([hidden])`. Шаги «Клиент» и «Проверка», а также экран правки существующей сметы в этом шаге не переработаны.

## Desktop variant A, шаг 4 (v473): остальные вкладки

`css/desktop-pages-v473.css` (только стили, от 1100px). Настройки и её разделы (Каталог, Шаблоны смет, Корзина, Обновления): заголовок слева без мобильной «гамбургер»-кнопки, единые карточки, спокойные поля каталога, шаблоны смет сеткой 2 колонки вместо горизонтальной прокрутки. Архив получил заголовок и пустое состояние во всю ширину. Вкладка «Финансы»: четыре показателя в ряд, единые карточки и фильтры. Разметка и логика не менялись.

## Исправление «step is not defined» (finance-ui.js)

`js/finance-ui.js` брал функции из `MGAppCore` через `const {...}=C`, но в этом списке не было `step` (и `renderSettings`), а ниже код переопределяет `step`. Из-за этого файл падал на строке ~210, и весь его хвост (экспорт `MGAppFinance`, отрисовка главного экрана, обработчики) не выполнялся. Исправлено: `const` → `let`, в список добавлены `step` и `renderSettings`; в экспорте опечатка `v58Payments` заменена на существующую `v59Payments`. Последствие для пользователя: на телефоне и планшете главный экран больше не остаётся пустым при первой загрузке.

## Desktop variant A, шаг 5 (v475): шаги «Клиент» / «Проверка», документ, правка, корзина, уведомления

`css/desktop-flow-v475.css` (только стили, от 1100px). «Проверка»: таблица с тёмной строкой итога. Документ: бумага слева, кнопки «Поделиться / Печать / WhatsApp / Telegram» справа колонкой. Правка существующей сметы: финансы тёмной карточкой, единые поля и карточки. Корзина: карточка удалённой сметы с компактными кнопками. Уведомления: единый размер кнопок. Разметка и логика не менялись.

## Desktop variant A, шаг 6 (v476): оформление новой сметы

`js/desktop-wizard-v476.js` + `css/desktop-wizard-v476.css` (от 1100px). Шаг «Клиент»: форма в две колонки (имя и телефон в ряд, адрес во всю ширину), справа тёмная карточка с итогом по смете. Итог читается из уже существующих элементов, ничего не пересчитывается и не сохраняется. Окно выбора услуг: по центру экрана, список больше не перекрывается блоком подсказки. Настройки → Компания: единые подписи, поля и кнопка сохранения.

## Cleanup v468 (служебная чистка)

Удалены неиспользуемые файлы прежних версий (estimates-editor v448–v452/v455, estimates-redesign v448–v452, desktop-layout v461–v464), устаревший `desktop-layout-v462.css` убран из precache, удалены `login-css.txt` и разрозненные txt-заметки. Поведение приложения не менялось.
