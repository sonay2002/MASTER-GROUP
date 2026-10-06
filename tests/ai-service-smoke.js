const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '../js/mg-ai-service.js'), 'utf8');
const context = {
  window: {MGCatalog:{data:[{name:'Отделочные работы',services:[{name:'Укладка плитки',unit:'м²'}]}]}},
  console,
  setTimeout,
  clearTimeout,
  JSON,
  String,
  Number,
  Map,
  Object,
  Array,
  Error,
  Set,
  Math,
  Promise
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(source, context, {filename:'mg-ai-service.js'});

if (!context.window.MG_AI_SERVICE) throw new Error('MG_AI_SERVICE missing');
if (context.window.MG_AI_SERVICE.version !== 'v413-10m-whole-text-semantic-memory-gemma4-e4b') throw new Error('Unexpected AI service version');
if (context.window.MG_AI_SERVICE.getStatus().offline !== true) throw new Error('AI must be offline/local');

(async () => {
  const cases = [
    ['укладк кафел', 'Укладка плитки'],
    ['montare faianta baie', 'Укладка плитки в ванной комнате'],
    ['убрть корни дерева', 'Удаление корней'],
    ['покос травы участок', 'Покос травы на участке'],
    ['устанвка раковн', 'Установка раковины'],
    ['старая плитка в baie', 'Укладка старой плитки'],
    ['покрас стен', 'Покраска стен'],
    ['schimbare teava apa', 'Замена труб'],
    ['Задняя багажник', 'Задний багажник'],
    ['фиксац генератора', 'Фиксация генератора'],
    ['ремнт двгателя', 'Ремонт двигателя']
  ];
  for (const [input, expected] of cases) {
    const result = await context.window.MG_AI_SERVICE.suggestServiceName({text: input, direction: 'Клининг участка'});
    if (!result?.corrected) throw new Error(`No correction for: ${input}`);
    if (result?.offline !== true) throw new Error(`Non-local engine used for: ${input}`);
    if (!['master-local-ai-open-v4','master-ai-with-10m-memory','master-semantic-brain-v408','master-semantic-brain-v412','native-local-ai','local-llm-gemma-4-e4b'].includes(result.engine)) throw new Error(`Unexpected engine for: ${input}: ${result.engine}`);
    if (input === 'укладк кафел' && result.corrected !== expected) throw new Error(`Unexpected correction: ${result.corrected}`);
    if (input === 'montare faianta baie' && !/плитк/i.test(result.corrected)) throw new Error(`Romanian input not understood: ${result.corrected}`);
  }
  console.log('AI local smoke OK');
})();
