const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const html = fs.readFileSync('index.html', 'utf8');
const firebaseSync = fs.readFileSync('js/firebase-sync.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

assert(html.includes('id="mgStartupSplash"'), 'startup splash markup must exist');
assert(html.includes('animation:mgSplashOrbit'), 'orbit animation must exist');
assert(html.includes('animation:mgSplashDraw'), 'MG mark drawing animation must exist');
assert(html.includes('animation:mgSplashProgress'), 'loading indicator animation must exist');
assert(html.includes('<meta name="app-version" content="v566">'), 'visible app version must match v566');
assert(sw.includes("master-group-v566-animated-startup"), 'current cache name must be present');
assert(firebaseSync.includes("function keepAuthVisible(){ try{window.MGSplash?.finish?.()}catch(_){}"), 'Firebase error/login state must release the splash');

const match = html.match(/<script id="mg-startup-splash-controller-v566">([\s\S]*?)<\/script>/);
assert(match, 'startup controller must be embedded before app scripts');
let now = 1000;
const tasks = [];
const listeners = {};
let removed = false;
const classes = [];
const element = {
  classList: { add(name) { classes.push(name); } },
  parentNode: { removeChild() { removed = true; } }
};
const window = { addEventListener(name, fn) { listeners['window:'+name] = fn; } };
const document = { addEventListener(name, fn) { listeners['document:'+name] = fn; }, getElementById(id) { return id === 'mgStartupSplash' ? element : null; } };
const setTimeout = (fn, delay) => { tasks.push({fn, delay}); return tasks.length; };
vm.runInNewContext(match[1], { window, document, Date: { now: () => now }, setTimeout, Math });
assert.strictEqual(typeof window.MGSplash.finish, 'function', 'finish API must be available globally');
assert(listeners['window:load'] && listeners['document:DOMContentLoaded'], 'both startup readiness events must be monitored');
assert(tasks.some(t => t.delay === 12000), 'absolute fallback must prevent a stuck splash');
window.MGSplash.finish();
const entrance = tasks.find(t => t.delay === 1900);
assert(entrance, 'splash must stay visible for the short entrance animation');
entrance.fn();
assert(classes.includes('mg-splash-leaving'), 'finish must start the fade-out');
const fade = tasks.find(t => t.delay === 800);
assert(fade, 'splash removal must wait for the fade-out');
fade.fn();
assert(removed, 'splash must be removed after fade-out');
console.log('startup-splash-v566-smoke: PASS');
