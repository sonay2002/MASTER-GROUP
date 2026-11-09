const fs = require('fs');
const app = fs.readFileSync('server/app.py', 'utf8');
const setup = fs.readFileSync('server/setup-local-https.sh', 'utf8');
const runner = fs.readFileSync('server/run-test-https.sh', 'utf8');
const pwa = fs.readFileSync('js/pwa.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const checks = [
  ['server supports TLS certificate environment variables', /MASTER_GROUP_TLS_CERT/.test(app) && /MASTER_GROUP_TLS_KEY/.test(app)],
  ['HTTPS cookies are marked Secure', /secure_flag = "; Secure"/.test(app)],
  ['TLS setup creates a local CA and IP SAN certificate', /basicConstraints=critical,CA:TRUE/.test(setup) && /subjectAltName=@alt_names/.test(setup) && /IP\.2=\$LAN_IP/.test(setup)],
  ['test HTTPS runner uses isolated test database and port 8443', /\/var\/lib\/master-group-test\/data\.sqlite3/.test(runner) && /MASTER_GROUP_PORT.*8443/.test(runner)],
  ['PWA registration is present', /navigator\.serviceWorker\.register/.test(pwa)],
  ['root URL is pre-cached for offline app launch', /\"\.\/\"/.test(sw)],
  ['navigation falls back to exact cached URL then index', /caches\.match\(event\.request\)/.test(sw) && /caches\.match\('\.\/index\.html'\)/.test(sw)],
  ['app version and cache are bumped together', /content="v497"/.test(html) && /master-group-v497-firebase-conflict-fix/.test(sw)],
  ['offline DB is pre-cached', /\.\/js\/offline-db\.js/.test(sw)]
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
if (failed) process.exit(1);
console.log(`HTTPS/offline static checks: ${checks.length} passed`);
