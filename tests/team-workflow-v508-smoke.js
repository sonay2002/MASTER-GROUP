const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),css=read('css/team-workflow-v511.css'),sw=read('sw.js');
const check=(ok,msg)=>{if(!ok)throw new Error(msg);console.log('PASS '+msg)};
check(html.includes('team-workflow-v512.css?v=512'),'v508 stylesheet is linked');
check(css.includes('.mg-team-page { padding-top:64px!important; }'),'team page content is shifted down by 64px');
check(sw.includes('master-group-v514-team-editor-sticky-footer')&&sw.includes('team-workflow-v512.css?v=512'),'service worker cache is updated');
console.log('Master Group v508 spacing checks passed.');
