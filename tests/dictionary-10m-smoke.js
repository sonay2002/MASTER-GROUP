const fs=require('fs');
const path=require('path');
const zlib=require('zlib');
const crypto=require('crypto');
const d=path.join(__dirname,'..','dictionary-10m');
const manifest=JSON.parse(fs.readFileSync(path.join(d,'manifest.json'),'utf8'));
if(manifest.entryCount!==10000000||manifest.uniqueEntryCount!==10000000||manifest.shardCount!==256)throw new Error('10M manifest mismatch');
const files=fs.readdirSync(d).filter(x=>/^shard-\d{3}\.txt\.gz$/.test(x)).sort();
if(files.length!==256)throw new Error(`Expected 256 shards, got ${files.length}`);
const checks=JSON.parse(fs.readFileSync(path.join(d,'checksums.json'),'utf8'));
const checkMap=new Map(checks.map(x=>[x.file,x]));
let total=0;
for(const file of files){
  const buf=fs.readFileSync(path.join(d,file));
  const row=checkMap.get(file); if(!row)throw new Error('Missing checksum '+file);
  if(buf.length!==row.bytes||crypto.createHash('sha256').update(buf).digest('hex')!==row.sha256)throw new Error('Checksum mismatch '+file);
  const txt=zlib.gunzipSync(buf).toString('utf8');
  const lines=txt.split('\n').filter(Boolean);
  const seen=new Set();
  for(const line of lines){const i=line.indexOf('\t'); if(i<1)throw new Error('Bad dictionary row '+file); const cand=line.slice(0,i); const canon=line.slice(i+1); if(!cand||!canon)throw new Error('Empty dictionary row '+file); if(seen.has(cand))throw new Error(`Duplicate candidate ${cand} in ${file}`); seen.add(cand);}
  const idx=Number(file.slice(6,9));
  if(lines.length!==manifest.shardCounts[idx])throw new Error(`Shard count mismatch ${file}: ${lines.length} != ${manifest.shardCounts[idx]}`);
  total+=lines.length;
}
if(total!==10000000)throw new Error(`Exact count failed: ${total}`);
console.log('dictionary-10m smoke: PASS — exactly 10,000,000 unique entries, 256 shards, checksums OK');
