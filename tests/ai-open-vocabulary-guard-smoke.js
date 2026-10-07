const fs=require('fs');
const src=fs.readFileSync(__dirname+'/../js/mg-ai-service.js','utf8');
if(!src.includes('inputConceptsMustSurvive')) throw new Error('Missing open-vocabulary concept guard');
if(!src.includes('НИКОГДА не заменяй существительное/объект')) throw new Error('Missing unknown-object preservation prompt');
if(src.includes("const lines=raw.split(/\\r?\\n/)") ) throw new Error('Free-form OpenRouter prose fallback still enabled');
if(!src.includes("version:'v416-openrouter-open-vocabulary-guard'")) throw new Error('Version mismatch');
console.log('AI open-vocabulary guard smoke: PASS');
