const fs=require('fs');
const src=fs.readFileSync(__dirname+'/../js/mg-ai-service.js','utf8');
if(!src.includes('function proofreadCandidateCompatible(input,candidate)')) throw new Error('Missing meaning-preservation guard');
if(!src.includes('Не добавляй и не удаляй содержательные слова')) throw new Error('Local proofreader prompt must preserve content words');
if(!src.includes('sourceNumbers.join(\'|\')!==candidateNumbers.join(\'|\')')) throw new Error('Number preservation guard missing');
if(src.indexOf('localLlmRepair(input')>src.indexOf('remoteBrainSuggest(input')) throw new Error('Local model must run before online fallback once enabled');
if(!src.includes('if(!localLlmAutoEnabled&&!manual)return null')) throw new Error('Large model is not protected by an opt-in gate');
if(!src.includes("version:'v440-offline-fixes'")) throw new Error('Version mismatch');
console.log('AI manual-download proofreader guard smoke: PASS');
