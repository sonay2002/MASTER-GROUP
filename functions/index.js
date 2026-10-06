const {onCall, HttpsError} = require('firebase-functions/https');
const {defineSecret, defineString} = require('firebase-functions/params');
const {setGlobalOptions} = require('firebase-functions');
const OpenAI = require('openai');

setGlobalOptions({
  region: 'europe-west1',
  maxInstances: 5,
  timeoutSeconds: 20,
  memory: '256MiB'
});

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const OPENAI_MODEL = defineString('OPENAI_MODEL', {
  default: 'gpt-6-luna'
});

const MAX_INPUT = 500;
const MAX_DIRECTION = 120;
const MAX_CONTEXT_ITEM = 120;
const MAX_CONTEXT_ITEMS = 12;

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    corrected: {type: 'string'},
    suggestions: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          text: {type: 'string'},
          note: {type: 'string'},
          confidence: {type: 'number'}
        },
        required: ['text', 'note', 'confidence']
      }
    }
  },
  required: ['corrected', 'suggestions']
};

function clean(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function sanitizeContext(list) {
  return (Array.isArray(list) ? list : [])
    .map(x => clean(x, MAX_CONTEXT_ITEM))
    .filter(Boolean)
    .slice(0, MAX_CONTEXT_ITEMS);
}

function buildInput({text, direction, selectedServices}) {
  return [
    'Контекст приложения: Master Group, создание названия строительной/ремонтной услуги.',
    `Направление: ${direction || 'не указано'}`,
    `Уже выбранные услуги: ${selectedServices.length ? selectedServices.join('; ') : 'нет'}`,
    `Текст пользователя: ${text}`
  ].join('\n');
}

const INSTRUCTIONS = [
  'Ты — встроенный AI-помощник Master Group для людей, которые могут плохо знать русский язык.',
  'Твоя задача — понять намерение пользователя, даже если русское слово или целая фраза написаны с сильными ошибками, пропусками букв, переставленными буквами, фонетически или на слух.',
  'Пользователь может писать на русском, румынском, английском, другом языке, латиницей, транслитом или смешивать языки. Пойми смысл и предложи профессиональную формулировку на русском.',
  'Исправляй орфографию, грамматику, окончания и порядок слов. Переформулируй в естественный профессиональный русский язык.',
  'Понимай строительные, ремонтные, сантехнические, электрические, отделочные, монтажные и другие профессиональные термины, а также обычные слова и словосочетания.',
  'Не ограничивайся фиксированным словарём. Разрешены любые русские слова и новые сочетания, если они логичны по смыслу.',
  'Старайся сохранить исходный смысл. Не выдумывай размеры, материалы, марки, количество, характеристики или виды работ, которых пользователь не указал.',
  'Если исходная фраза уже нормальная — оставь её без ненужной замены.',
  'Если возможны несколько трактовок, выбери наиболее вероятную и дай до двух альтернатив.',
  'В corrected дай лучший вариант для сохранения в смете. Он должен быть кратким, конкретным и профессиональным, без кавычек и пояснений.',
  'В suggestions верни от 1 до 3 вариантов от наиболее вероятного к менее вероятному. note — очень короткое пояснение на русском, например «Исправлена опечатка» или «Более профессиональная формулировка».',
  'confidence — число от 0 до 1. Не используй его для лишнего текста.',
  'Верни только данные по заданной JSON-схеме.'
].join('\n');

exports.correctServiceText = onCall(
  {secrets: [OPENAI_API_KEY]},
  async (request) => {
    const data = request.data || {};
    const text = clean(data.text, MAX_INPUT);
    const direction = clean(data.direction, MAX_DIRECTION);
    const selectedServices = sanitizeContext(data.selectedServices);

    if (!text) {
      throw new HttpsError('invalid-argument', 'Введите название услуги.');
    }
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Войдите в Master Group для использования AI-помощника.');
    }

    const apiKey = OPENAI_API_KEY.value();
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'AI-помощник ещё не настроен на сервере.');
    }

    try {
      const client = new OpenAI({apiKey});
      const response = await client.responses.create({
        model: OPENAI_MODEL.value(),
        store: false,
        instructions: INSTRUCTIONS,
        input: buildInput({text, direction, selectedServices}),
        text: {
          format: {
            type: 'json_schema',
            name: 'service_name_correction',
            strict: true,
            schema: OUTPUT_SCHEMA
          }
        },
        max_output_tokens: 420,
        safety_identifier: `mg_${request.auth.uid}`
      });

      let parsed;
      try {
        parsed = JSON.parse(response.output_text || '{}');
      } catch (err) {
        throw new Error('AI returned invalid structured output.');
      }

      const suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
            .map(item => ({
              text: clean(item?.text, 240),
              note: clean(item?.note, 180),
              confidence: Math.max(0, Math.min(1, Number(item?.confidence) || 0))
            }))
            .filter(item => item.text)
            .slice(0, 3)
        : [];

      const corrected = clean(parsed.corrected || suggestions[0]?.text || text, 240);
      if (!suggestions.length) {
        suggestions.push({text: corrected, note: 'Исправлено AI', confidence: 0.7});
      }

      return {corrected, suggestions};
    } catch (error) {
      console.error('correctServiceText failed', {
        code: error?.code,
        name: error?.name,
        message: error?.message
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Не удалось получить AI-подсказку.');
    }
  }
);
