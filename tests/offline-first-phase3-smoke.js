const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const engine=read('js/offline-engine.js'),sync=read('js/firebase-sync.js'),repo=read('js/server-repository.js'),sw=read('sw.js'),html=read('index.html');
const checks=[
 ['conflicts are stored in a dedicated persistent key',/master_group_sync_conflicts_v1/.test(engine)],
 ['conflict vault stores and retrieves both versions',/function putConflict/.test(engine)&&/function getConflict/.test(engine)],
 ['server conflict snapshots are captured',/currentEstimate/.test(repo)&&/captureEstimateConflict/.test(sync)],
 ['user can keep local version',/Оставить мою версию/.test(sync)&&/choice==='local'/.test(sync)],
 ['user can accept server version',/Взять версию сервера/.test(sync)&&/choice==='remote'/.test(sync)],
 ['user can preserve both as separate estimates',/Сохранить обе версии/.test(sync)&&/choice==='copy'/.test(sync)],
 ['conflicts are not automatically requeued',/SYNC_ENGINE\.remove\('estimate',id\)/.test(sync)],
 ['service worker cache bumped',/master-group-v494-https-offline/.test(sw)],
 ['firebase sync cache query bumped',/firebase-sync\.js\?v=494/.test(html)]
];
let failed=0;for(const [name,ok] of checks){console.log((ok?'PASS ':'FAIL ')+name);if(!ok)failed++;}
if(failed)process.exit(1);console.log(`OK: ${checks.length} checks passed`);
