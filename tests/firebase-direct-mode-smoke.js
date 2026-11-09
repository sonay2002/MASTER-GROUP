#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const client=fs.readFileSync(path.join(root,'js/firebase-client.js'),'utf8');
const sync=fs.readFileSync(path.join(root,'js/firebase-sync.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const checks={
  'Firebase Auth is the active auth provider':/auth=window\.firebase\.auth\(app\)/.test(client)&&/getAuth,/.test(client),
  'Realtime Database is the active database':/db=window\.firebase\.database\(app\)/.test(client)&&/getDb,/.test(client),
  'sync uses Firebase DB, not Acer bridge':/getDb\(\);if\(!db\)/.test(sync)&&!sync.includes('MGServerRepository'),
  'startup does not call the server-only migration bridge':!sync.includes('migrateFromFirebase'),
  'HTML requests the v510 Firebase sync script':html.includes('js/firebase-sync.js?v=510')&&!html.includes('js/firebase-sync.js?v=494'),
  'HTML loads Firebase repository':html.includes('js/firebase-repository.js')&&!html.includes('js/server-repository.js'),
  'Firebase SDK scripts remain present':html.includes('firebase-auth-compat.js')&&html.includes('firebase-database-compat.js')&&!html.includes('<script defer src=\"https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js'),
  'service worker caches Firebase repository':sw.includes('./js/firebase-repository.js')&&!sw.includes('./js/server-repository.js'),
  'service worker cache bumped':sw.includes('master-group-v514-team-editor-sticky-footer'),
  'Firebase project config retained':client.includes('master-group-3e18e')&&client.includes('master-group-3e18e-default-rtdb.firebaseio.com')
};
let failed=0;for(const [name,ok] of Object.entries(checks)){console.log((ok?'PASS':'FAIL')+' '+name);if(!ok)failed++}
if(failed)process.exit(1);
