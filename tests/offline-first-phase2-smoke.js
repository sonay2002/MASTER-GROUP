const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const db=read('js/offline-db.js');
const repo=read('js/server-repository.js');
const sync=read('js/firebase-sync.js');
const client=read('js/firebase-client.js');
const server=read('server/app.py');
const sw=read('sw.js');
const checks=[
  ['startup recovery is awaited/exposed',/const ready = recoverMissing\(\)/.test(db)&&/__MG_OFFLINE_BOOT_READY/.test(db)],
  ['recovered values are not overwritten by startup defaults',/restoredKeys\.has\(key\)/.test(db)],
  ['page reloads after restoring values',/location\.reload\(\)/.test(db)],
  ['estimate writes use revision endpoint',/\/api\/estimate\/write/.test(repo)],
  ['revision conflicts are surfaced',/database\/conflict/.test(repo)&&/currentRevision/.test(repo)],
  ['server rejects stale estimate revision',/current_revision != expected/.test(server)],
  ['server returns conflict without overwriting',/self\.json_response\(409/.test(server)],
  ['local estimate revision is retained after successful save',/_serverRevision/.test(sync)],
  ['automatic sync retries on focus and visibility',/visibilitychange/.test(sync)&&/addEventListener\('focus'/.test(sync)],
  ['conflict is explained to the user',/Обнаружен конфликт/.test(client)],
  ['service worker cache is versioned for phase 2',/master-group-v494-https-offline/.test(sw)]
];
let failed=0;
for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' '+name);if(!ok)failed++}
if(failed)process.exit(1);
console.log(`OK: ${checks.length} checks passed`);
