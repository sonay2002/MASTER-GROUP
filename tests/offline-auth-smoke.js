const fs=require('fs');
const s=fs.readFileSync('js/firebase-client.js','utf8');
const checks=[
  ['PBKDF2 verifier',/PBKDF2/.test(s)&&/310000/.test(s)],
  ['no plaintext password persistence',!/localStorage\.setItem\([^,]+,\s*JSON\.stringify\(\{[^}]*password/.test(s)],
  ['offline login fallback',/verifyOfflineGrant\(pendingCredentials\.email,pendingCredentials\.password\)/.test(s)],
  ['server rejection does not fall back',/if\(error\?\.code==='auth\/invalid-credential'\)throw error/.test(s)],
  ['offline session expires',/expiresAt/.test(s)&&/OFFLINE_AUTH_TTL/.test(s)],
  ['offline logout clears grant',/clearOfflineGrant\(\)/.test(s)],
  ['connectivity event',/mg:auth-connectivity/.test(s)]
];
for(const [name,ok] of checks){if(!ok)throw new Error('FAIL: '+name);console.log('PASS: '+name)}
console.log('Offline authentication smoke: '+checks.length+' checks passed');
