import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import assert from 'assert';
const root=path.dirname(new URL(import.meta.url).pathname);
const dictDir=path.join(root,'../dictionary-10m');
const manifest=JSON.parse(fs.readFileSync(path.join(dictDir,'manifest.json'),'utf8'));
const files=fs.readdirSync(dictDir).filter(x=>/^shard-\d{3}\.txt\.gz$/.test(x)).sort();
assert.equal(files.length,256,'Expected 256 dictionary shards');
assert.equal(Number(manifest.entryCount),10_000_000,'manifest entryCount');
assert.equal(Number(manifest.uniqueEntryCount),10_000_000,'manifest uniqueEntryCount');
let total=0;
for(let i=0;i<files.length;i++){
  const n=zlib.gunzipSync(fs.readFileSync(path.join(dictDir,files[i]))).toString('utf8').split('\n').filter(Boolean).length;
  assert.equal(n,Number(manifest.shardCounts[i]),`${files[i]} count mismatch`);
  total+=n;
}
assert.equal(total,10_000_000,'actual dictionary count');
console.log('10M dictionary integrity: PASS — 256 shards, exactly 10,000,000 records');
