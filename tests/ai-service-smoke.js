const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '../js/mg-ai-service.js'), 'utf8');
const context = {
  window: {}, console, setTimeout, clearTimeout, JSON, String, Number, Map, Object, Array, Error
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(source, context, {filename: 'mg-ai-service.js'});

if (!context.window.MG_AI_SERVICE) throw new Error('MG_AI_SERVICE missing');
if (context.window.MG_AI_SERVICE.version !== 'v36-ai') throw new Error('Unexpected AI service version');

(async () => {
  const result = await Promise.race([
    context.window.MG_AI_SERVICE.suggestServiceName({text: 'монтаж плитк'}).catch(err => err),
    new Promise(resolve => setTimeout(() => resolve(new Error('timeout')), 100)),
  ]);
  if (!result || result.code !== 'ai/unavailable') {
    throw new Error('AI service should fail cleanly when Firebase Functions is unavailable');
  }
  console.log('AI service smoke OK');
})();
