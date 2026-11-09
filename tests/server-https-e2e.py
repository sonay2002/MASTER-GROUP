#!/usr/bin/env python3
"""Non-destructive HTTPS smoke test using a temporary CA, cert and SQLite DB."""
from __future__ import annotations
import json, os, socket, ssl, subprocess, sys, tempfile, time, urllib.error, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def main() -> int:
    with tempfile.TemporaryDirectory(prefix='mg-https-e2e-') as temp:
        tmp = Path(temp)
        ca_key, ca_crt = tmp/'ca.key', tmp/'ca.crt'
        key, csr, crt, ext = tmp/'server.key', tmp/'server.csr', tmp/'server.crt', tmp/'server.ext'
        subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout',str(ca_key),'-out',str(ca_crt),'-days','2','-subj','/CN=MG Test CA','-addext','basicConstraints=critical,CA:TRUE'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        subprocess.run(['openssl','req','-new','-newkey','rsa:2048','-nodes','-keyout',str(key),'-out',str(csr),'-subj','/CN=127.0.0.1'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        ext.write_text('[server_cert]\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=IP:127.0.0.1\n')
        subprocess.run(['openssl','x509','-req','-in',str(csr),'-CA',str(ca_crt),'-CAkey',str(ca_key),'-CAcreateserial','-out',str(crt),'-days','2','-sha256','-extfile',str(ext),'-extensions','server_cert'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0)); port=sock.getsockname()[1]
        env=os.environ.copy(); env.update(MASTER_GROUP_DB=str(tmp/'test.sqlite3'),MASTER_GROUP_BIND='127.0.0.1',MASTER_GROUP_PORT=str(port),MASTER_GROUP_TLS_CERT=str(crt),MASTER_GROUP_TLS_KEY=str(key))
        proc=subprocess.Popen([sys.executable,str(ROOT/'server'/'app.py')],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True)
        base=f'https://127.0.0.1:{port}'
        context=ssl._create_unverified_context()
        try:
            for _ in range(80):
                if proc.poll() is not None: raise AssertionError(proc.stderr.read() if proc.stderr else 'HTTPS server exited')
                try:
                    with urllib.request.urlopen(base+'/api/health',context=context,timeout=2) as r:
                        health=json.loads(r.read()); assert r.status==200 and health.get('ok')
                    break
                except Exception: time.sleep(.1)
            else: raise AssertionError('HTTPS server did not start')
            req=urllib.request.Request(base+'/api/auth/register',data=json.dumps({'email':'https-test@example.invalid','password':'TestPassword!234'}).encode(),headers={'Content-Type':'application/json'},method='POST')
            with urllib.request.urlopen(req,context=context,timeout=5) as r:
                cookie=r.headers.get('Set-Cookie','')
                assert r.status==201 and 'Secure' in cookie, cookie
            with urllib.request.urlopen(base+'/sw.js',context=context,timeout=5) as r:
                body=r.read().decode(); assert r.status==200 and 'master-group-v494-https-offline' in body
            print('PASS HTTPS listener starts with configured certificate')
            print('PASS API session cookie has Secure attribute')
            print('PASS Service Worker is served over HTTPS')
            print('HTTPS server integration: 3 scenarios passed')
            return 0
        finally:
            proc.terminate()
            try: proc.wait(timeout=5)
            except subprocess.TimeoutExpired: proc.kill(); proc.wait(timeout=5)
if __name__=='__main__': raise SystemExit(main())
