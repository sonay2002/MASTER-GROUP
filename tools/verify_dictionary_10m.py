#!/usr/bin/env python3
import gzip,hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
D=ROOT/"dictionary-10m"
M=json.loads((D/"manifest.json").read_text(encoding="utf-8"))
assert M["entryCount"]==10_000_000 and M["uniqueEntryCount"]==10_000_000 and M["shardCount"]==256
files=sorted(D.glob("shard-*.txt.gz"))
assert len(files)==256, len(files)
total=0
for p in files:
    c=0; seen=set()
    with gzip.open(p,"rt",encoding="utf-8") as f:
        for line in f:
            cand,canon=line.rstrip("\n").split("\t",1)
            assert cand and canon
            assert cand not in seen, f"duplicate {p.name}: {cand}"
            seen.add(cand); c+=1
    expected=M["shardCounts"][int(p.name.split("-")[1].split(".")[0])]
    assert c==expected,(p.name,c,expected)
    total+=c
assert total==10_000_000,total
# Verify the published checksums exactly.
checks=json.loads((D/"checksums.json").read_text(encoding="utf-8"))
assert len(checks)==256,len(checks)
for row in checks:
    p=D/row["file"]; data=p.read_bytes(); assert len(data)==row["bytes"] and hashlib.sha256(data).hexdigest()==row["sha256"],row["file"]
print(f"dictionary-10m verification PASS: {total:,} unique entries; 256/256 shards; checksums OK")
