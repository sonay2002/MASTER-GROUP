import fs from 'fs';
import assert from 'assert';
const src=fs.readFileSync(new URL('../js/mg-ai-service.js', import.meta.url),'utf8');
assert.match(src,/AI_BRAIN_MODE='whole-text-primary'/);
assert.match(src,/const multiToken=tokens\.length>=2;/);
assert.match(src,/if\(multiToken \|\| suspicious\)/);
assert.match(src,/local-llm-gemma-4-e4b-whole-text/);
assert.match(src,/const dict=await dictionarySuggest\(input\);/);
console.log('WHOLE-TEXT PRIMARY ARCHITECTURE: PASS');
