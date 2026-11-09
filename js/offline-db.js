/* Master Group Offline DB v2 — durable mirror and guarded startup recovery.
   localStorage remains the synchronous compatibility layer; IndexedDB is its backup. */
(function () {
  'use strict';
  const DB_NAME = 'master-group-offline-v1';
  const STORE = 'records';
  const PREFIXES = ['master_group_', 'mg_ai_personal_terms_'];
  const EXACT_KEYS = new Set(['mg_counter']);
  let dbPromise;
  const eligible = key => EXACT_KEYS.has(String(key)) || String(key).startsWith('mg_counter__account_') || PREFIXES.some(prefix => String(key).startsWith(prefix));
  function open() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB unavailable'));
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
      request.onblocked = () => reject(new Error('IndexedDB upgrade blocked'));
    });
    return dbPromise;
  }
  function put(key, value) {
    return open().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ key: String(key), value: String(value), savedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('IndexedDB write failed'));
    }));
  }
  function remove(key) {
    return open().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(String(key));
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('IndexedDB delete failed'));
    }));
  }
  function clear() {
    return open().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('IndexedDB clear failed'));
    }));
  }
  function get(key) {
    return open().then(db => new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(String(key));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    }));
  }
  function all() {
    return open().then(db => new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    }));
  }
  const initialKeys = new Set();
  try { for (let i=0;i<localStorage.length;i++) initialKeys.add(localStorage.key(i)); } catch (_) {}
  let booting = true;
  const bufferedWrites = new Map();
  const original = Storage.prototype.setItem;
  const originalRemove = Storage.prototype.removeItem;
  const originalClear = Storage.prototype.clear;
  try {
    if (!Storage.prototype.__mgOfflineWrappedV3) {
      Storage.prototype.setItem = function (key, value) {
        if (this === window.localStorage && booting && eligible(key)) {
          bufferedWrites.set(String(key), String(value));
          return;
        }
        const result = original.call(this, key, value);
        if (this === window.localStorage && eligible(key)) put(key, value).catch(error => {
          console.warn('[Master Group] IndexedDB backup write failed:', error);
          window.dispatchEvent(new CustomEvent('mg:offline-db-error'));
        });
        return result;
      };
      Storage.prototype.removeItem = function (key) {
        const result = originalRemove.call(this, key);
        if (this === window.localStorage && eligible(key)) {
          bufferedWrites.delete(String(key));
          remove(key).catch(error => console.warn('[Master Group] IndexedDB delete failed:', error));
        }
        return result;
      };
      Storage.prototype.clear = function () {
        const keys=[];
        if(this===window.localStorage){
          try { for(let i=0;i<this.length;i++){const key=this.key(i);if(key&&eligible(key))keys.push(key);} } catch(_) {}
        }
        const result=originalClear.call(this);
        if(this===window.localStorage){
          for(const key of keys)bufferedWrites.delete(key);
          clear().catch(error=>console.warn('[Master Group] IndexedDB clear failed:',error));
        }
        return result;
      };
      Object.defineProperty(Storage.prototype, '__mgOfflineWrappedV3', { value: true });
    }
  } catch (error) { console.warn('[Master Group] Could not attach IndexedDB mirror:', error); }
  function mirrorExisting() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && eligible(key)) put(key, localStorage.getItem(key)).catch(error => console.warn('[Master Group] Offline backup failed:', error));
      }
    } catch (_) {}
  }
  async function recoverMissing() {
    try {
      const records = await all();
      let restored = 0;
      const restoredKeys = new Set();
      for (const record of records) {
        if (!eligible(record.key)) continue;
        let current = null;
        try { current = localStorage.getItem(record.key); } catch (_) {}
        if (current === null || current === undefined) {
          try { original.call(localStorage, record.key, record.value); restored++; restoredKeys.add(record.key); } catch (_) {}
        }
      }
      // App startup scripts may have attempted to write defaults while recovery ran.
      // Never let those defaults overwrite a recovered backup.
      for (const [key, value] of bufferedWrites) {
        // Keep either an IndexedDB-restored value or anything that already existed
        // when this page started. App boot code often writes empty defaults; those
        // must never replace user data during the recovery window.
        if (restoredKeys.has(key) || initialKeys.has(key)) continue;
        try { original.call(localStorage, key, value); } catch (_) {}
      }
      bufferedWrites.clear();
      booting = false;
      if (restored) {
        window.dispatchEvent(new CustomEvent('mg:offline-db-restored', { detail: { count: restored } }));
        // Reload once so synchronous app modules re-read the restored values.
        try {
          const marker='mgOfflineRecoveredReload';
          if (!sessionStorage.getItem(marker)) {
            sessionStorage.setItem(marker, '1');
            location.reload();
            return restored;
          }
          sessionStorage.removeItem(marker);
        } catch (_) {}
      }
      mirrorExisting();
      return restored;
    } catch (error) {
      console.warn('[Master Group] IndexedDB recovery unavailable:', error);
      for (const [key,value] of bufferedWrites) { try { original.call(localStorage,key,value); } catch (_) {} }
      bufferedWrites.clear();
      booting = false;
      return 0;
    } finally {
      document.documentElement.classList.remove('mg-offline-restoring');
    }
  }
  try {
    document.documentElement.classList.add('mg-offline-restoring');
    const style=document.createElement('style');
    style.textContent='html.mg-offline-restoring body{visibility:hidden!important}';
    (document.head||document.documentElement).appendChild(style);
  } catch (_) {}
  const ready = recoverMissing();
  window.MGOfflineDB = { ready, put, get, all, remove, clear, recoverMissing, eligible, databaseName: DB_NAME };
  window.__MG_OFFLINE_BOOT_READY = ready;
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => false);
})();