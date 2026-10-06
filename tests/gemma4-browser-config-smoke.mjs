import fs from 'fs';
import assert from 'assert';
const ai=fs.readFileSync(new URL('../js/mg-ai-service.js',import.meta.url),'utf8');
for (const model of [
  'onnx-community/Qwen3.5-2B-ONNX-OPT',
  'onnx-community/gemma-3-1b-it-ONNX',
  'onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX'
]) assert(ai.includes(model));
assert(ai.includes("const AI_ROUTER_VERSION='v417-local-ai-router-qwen-gemma-deepseek'"));
assert(ai.includes("state.state=device==='webgpu'?'ready-webgpu':'ready-wasm'"));
assert(ai.includes("brainOrder:'brains-first-then-10m-memory'"));
assert(ai.includes("memoryStage:'10m-after-brains'"));
assert(ai.includes("max_new_tokens:40"));
console.log('Local AI router browser config smoke: PASS');
