'use strict';
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'js','catalog.js'),'utf8');
const match=source.match(/const defaults=(\[.*\]);/);
if(!match)throw new Error('Default catalog is missing');
const dirs=JSON.parse(match[1]);
if(dirs.length!==24)throw new Error(`Expected 24 directions, got ${dirs.length}`);
const count=dirs.reduce((n,d)=>n+d[2].length,0);
if(count!==558)throw new Error(`Expected 558 unique default services, got ${count}`);
const seen=new Map();
for(const [name,icon,services] of dirs){
 if(!name||!icon||!Array.isArray(services)||!services.length)throw new Error(`Invalid direction ${name}`);
 for(const [service,unit] of services){
  if(!service.trim()||!unit.trim())throw new Error(`Missing name/unit in ${name}`);
  const key=service.trim().toLocaleLowerCase('ru-RU');
  if(seen.has(key))throw new Error(`Duplicate service ${service}: ${seen.get(key)} / ${name}`);
  seen.set(key,name);
 }
}
console.log(`24 directions, ${count} services, every service has a unit, no exact duplicates: PASS`);
