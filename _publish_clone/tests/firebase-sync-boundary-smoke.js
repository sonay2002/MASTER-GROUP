/* Static boundary smoke test: firebase-sync must define the constants/helpers it uses locally. */
const fs=require('fs');
const s=fs.readFileSync(__dirname+'/../js/firebase-sync.js','utf8');
for(const token of [
  "const KEY='master_group_estimates_v8'",
  "const DEL='master_group_cloud_deleted_v1'",
  "DIRTY='master_group_cloud_dirty_v3'",
  "CATDIRTY='master_group_cloud_catalog_dirty_v2'",
  "PROFDIRTY='master_group_cloud_profile_dirty_v2'",
  "const SYNC_VER='master_group_firebase_v18'",
  'const read=', 'const write=', 'const uid=', 'const newId=uid'
]) if(!s.includes(token)) throw Error('missing firebase sync boundary: '+token);
if(!s.includes("F.v58RenderEstimates") || !s.includes("F.dashboard")) throw Error('missing modular UI refresh boundary');
console.log('firebase-sync-boundary-smoke: OK');
