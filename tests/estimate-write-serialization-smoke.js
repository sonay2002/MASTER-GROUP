const fs = require('fs');
const s = fs.readFileSync('js/firebase-sync.js', 'utf8');
const checks = [
  ['per-estimate promise queue exists', /const estimateWriteQueues=new Map\(\)/.test(s)],
  ['lock serializes after the previous task settles', /const previous=estimateWriteQueues\.get\(id\)\|\|Promise\.resolve\(\);[\s\S]*?previous\.catch\(\(\)=>\{\}\)\.then\(task\)/.test(s)],
  ['queue cleanup only removes the current tail', /if\(estimateWriteQueues\.get\(id\)===current\)estimateWriteQueues\.delete\(id\)/.test(s)],
  ['background upload enters shared lock', /async function uploadEstimate\(id\)[\s\S]*?return withEstimateWriteLock\(id,async\(\)=>\{/.test(s)],
  ['direct save delegates to background upload', /window\.__mgCloudSaveEstimate=async function\(estimate\)[\s\S]*?await uploadEstimate\(String\(estimate\.id\)\)/.test(s)],
  ['latest local revision is re-read after server confirmation', /const latest=current\[index\];[\s\S]*?if\(Number\(latest\._syncUpdatedAt\|\|0\)===Number\(e\._syncUpdatedAt\|\|0\)\)/.test(s)],
  ['changed local version is queued for another pass', /markDirty\(\[id\]\);\s*\}/.test(s)],
  ['real server conflicts are still captured', /captureEstimateConflict\(e,error\)/.test(s)]
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
if (failed) process.exit(1);
console.log(`Estimate write serialization checks: ${checks.length} passed`);
