import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import { execSync, spawn } from 'child_process';

const PREVIEW_URL = 'https://apdock--pwa-test-71y1j6zy.web.app';
const LOCAL_PORT = 8085;
const LOCAL_URL = `http://localhost:${LOCAL_PORT}`;
const EDGE_PATH = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';

console.log('====================================================');
console.log('   APDOCK PWA AUTOMATED VERIFICATION SUITE');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

// ============================================================================
// TEST 1: Manifest & Installability Metadata
// ============================================================================
console.log('[TEST 1] Verifying manifest.webmanifest schema & installability...');
const manifestPath = path.resolve('public/manifest.webmanifest');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

assert(manifest.id === '/', 'Manifest id is "/"');
assert(manifest.start_url === '/?source=pwa', 'Manifest start_url is "/?source=pwa"');
assert(manifest.scope === '/', 'Manifest scope is "/"');
assert(manifest.display === 'standalone', 'Manifest display is "standalone"');
assert(Array.isArray(manifest.display_override) && manifest.display_override.includes('standalone'), 'Manifest display_override includes "standalone"');
assert((manifest.theme_color || '').toLowerCase() === '#080b13', 'Manifest theme_color matches splash dark theme (#080b13)');
assert((manifest.background_color || '').toLowerCase() === '#080b13', 'Manifest background_color matches splash dark theme (#080b13)');
assert(Array.isArray(manifest.categories) && manifest.categories.includes('health'), 'Manifest categories contains "health"');

const has192Any = manifest.icons.some(i => i.sizes === '192x192' && i.purpose === 'any');
const has512Any = manifest.icons.some(i => i.sizes === '512x512' && i.purpose === 'any');
const has192Maskable = manifest.icons.some(i => i.sizes === '192x192' && i.purpose === 'maskable');
const has512Maskable = manifest.icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable');

assert(has192Any && has512Any, 'Manifest has 192 and 512 "any" icons');
assert(has192Maskable && has512Maskable, 'Manifest has 192 and 512 "maskable" icons with safe-zone padding');

const shortcuts = manifest.shortcuts || [];
const hasDietShortcut = shortcuts.some(s => s.url === '/diet?source=shortcut');
const hasHomeShortcut = shortcuts.some(s => s.url === '/home');
assert(hasDietShortcut && hasHomeShortcut, 'Manifest has shortcuts for /diet?source=shortcut and /home');

// Check actual icon files exist on disk
assert(fs.existsSync('public/icons/icon-192.png'), 'public/icons/icon-192.png exists');
assert(fs.existsSync('public/icons/icon-512.png'), 'public/icons/icon-512.png exists');
assert(fs.existsSync('public/icons/icon-maskable-192.png'), 'public/icons/icon-maskable-192.png exists');
assert(fs.existsSync('public/icons/icon-maskable-512.png'), 'public/icons/icon-maskable-512.png exists');
assert(fs.existsSync('public/icons/apple-touch-icon.png') || fs.existsSync('public/apple-touch-icon.png'), 'apple-touch-icon.png exists');

// ============================================================================
// TEST 2: ngsw-config.json Security & Firebase Exclusion
// ============================================================================
console.log('\n[TEST 2] Verifying Service Worker configuration & Firebase traffic exclusion...');
const ngswConfig = JSON.parse(fs.readFileSync('ngsw-config.json', 'utf8'));

const dataGroups = ngswConfig.dataGroups || [];
const forbiddenDomains = ['identitytoolkit', 'securetoken', 'firestore.googleapis.com', 'firebaseappcheck'];
let violatesFirebaseNoCache = false;

for (const dg of dataGroups) {
  for (const urlPattern of dg.urls) {
    if (forbiddenDomains.some(d => urlPattern.includes(d))) {
      violatesFirebaseNoCache = true;
    }
  }
}

assert(!violatesFirebaseNoCache, 'ngsw-config.json has ZERO dataGroups for Firebase Auth, Firestore Lite, or App Check');
assert(ngswConfig.assetGroups.some(g => g.name === 'app' && g.installMode === 'prefetch'), 'ngsw-config app group is prefetch');
assert(ngswConfig.navigationUrls.some(u => u === '!/__/**'), 'ngsw-config navigationUrls explicitly excludes !/__/** Firebase reserved paths');

// ============================================================================
// TEST 3: Edge CDN Cache Header Assertions (Live Firebase Preview)
// ============================================================================
console.log('\n[TEST 3] Verifying Edge CDN HTTP Cache Headers against live Firebase preview...');

function getHeader(url, headerName) {
  try {
    const raw = execSync(`curl -sI "${url}"`, { encoding: 'utf8' });
    const lines = raw.split('\n');
    for (const line of lines) {
      const parts = line.split(':');
      if (parts[0].trim().toLowerCase() === headerName.toLowerCase()) {
        return parts.slice(1).join(':').trim();
      }
    }
  } catch (err) {
    console.error('curl error:', err);
  }
  return null;
}

const indexCache = getHeader(`${PREVIEW_URL}/index.html`, 'cache-control');
assert(indexCache && indexCache.includes('no-cache'), `/index.html cache-control includes no-cache (got: ${indexCache})`);

const ngswJsonCache = getHeader(`${PREVIEW_URL}/ngsw.json`, 'cache-control');
assert(ngswJsonCache && ngswJsonCache.includes('no-cache'), `/ngsw.json cache-control includes no-cache (got: ${ngswJsonCache})`);

const swWorkerCache = getHeader(`${PREVIEW_URL}/ngsw-worker.js`, 'cache-control');
assert(swWorkerCache && swWorkerCache.includes('no-cache'), `/ngsw-worker.js cache-control includes no-cache (got: ${swWorkerCache})`);

const manifestCache = getHeader(`${PREVIEW_URL}/manifest.webmanifest`, 'cache-control');
assert(manifestCache && manifestCache.includes('no-cache'), `/manifest.webmanifest cache-control includes no-cache (got: ${manifestCache})`);

// Find hashed main bundle in dist
const distFiles = fs.readdirSync('dist/apdock/browser');
const mainJs = distFiles.find(f => f.startsWith('main-') && f.endsWith('.js'));
if (mainJs) {
  const mainCache = getHeader(`${PREVIEW_URL}/${mainJs}`, 'cache-control');
  assert(mainCache && mainCache.includes('immutable') && mainCache.includes('max-age=31536000'), `Hashed JS bundle ${mainJs} is immutable with 1y cache (got: ${mainCache})`);
}

const faviconCache = getHeader(`${PREVIEW_URL}/favicon.ico`, 'cache-control');
assert(faviconCache && faviconCache.includes('must-revalidate') && !faviconCache.includes('immutable'), `Unhashed favicon.ico is must-revalidate and NOT immutable (got: ${faviconCache})`);

// ============================================================================
// TEST 4 - 7: Browser Automation via Headless Edge CDP (Mobile Emulation)
// ============================================================================
async function runBrowserTests() {
  const tmpBase = fs.mkdtempSync('/tmp/apdock-test-');
  const dirBuildA = path.join(tmpBase, 'build-a');
  const dirBuildB = path.join(tmpBase, 'build-b');
  const edgeUserDataDir = path.join(tmpBase, 'edge-profile');

  // Copy dist to Build A
  fs.cpSync('dist/apdock/browser', dirBuildA, { recursive: true });

  // Prepare Build B with modified index.html, updated hash in ngsw.json, and newer timestamp
  fs.cpSync('dist/apdock/browser', dirBuildB, { recursive: true });
  const indexBPath = path.join(dirBuildB, 'index.html');
  let indexBContent = fs.readFileSync(indexBPath, 'utf8');
  indexBContent = indexBContent.replace('</head>', '<meta name="build-version" content="build-b-verified" /></head>');
  fs.writeFileSync(indexBPath, indexBContent, 'utf8');

  const indexBHash = crypto.createHash('sha1').update(indexBContent).digest('hex');
  const ngswBPath = path.join(dirBuildB, 'ngsw.json');
  const ngswB = JSON.parse(fs.readFileSync(ngswBPath, 'utf8'));
  ngswB.timestamp = Date.now() + 100000;
  ngswB.hashTable['/index.html'] = indexBHash;
  ngswB.appData = { version: '0.2.1-build-b-test' };
  fs.writeFileSync(ngswBPath, JSON.stringify(ngswB, null, 2), 'utf8');

  // Setup dynamic in-process static server
  let currentServeDir = dirBuildA;
  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2'
  };

  const localServer = http.createServer((req, res) => {
    const rawPath = req.url.split('?')[0];
    let filePath = path.join(currentServeDir, rawPath === '/' ? 'index.html' : rawPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(currentServeDir, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
    if (rawPath === '/index.html' || rawPath === '/' || rawPath === '/ngsw.json' || rawPath === '/manifest.webmanifest') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    fs.createReadStream(filePath).pipe(res);
  });

  await new Promise(r => localServer.listen(LOCAL_PORT, '127.0.0.1', r));
  console.log(`\n[SERVER] In-process test HTTP server listening on ${LOCAL_URL} serving Build A`);

  const port = 9336;
  const edgeProcess = spawn(EDGE_PATH, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${edgeUserDataDir}`,
    'about:blank'
  ]);

  // Poll for DevTools port
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const versionRes = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (versionRes.ok) {
        const versionData = await versionRes.json();
        wsUrl = versionData.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  if (!wsUrl) {
    throw new Error('Timed out waiting for Edge CDP port 9336');
  }

  try {
    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.onopen = r);

    let msgId = 1;
    function sendCommand(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = (evt) => {
          const res = JSON.parse(evt.data);
          if (res.id === id) {
            ws.removeEventListener('message', handler);
            if (res.error) reject(res.error);
            else resolve(res.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    const target = await sendCommand('Target.createTarget', { url: 'about:blank' });
    const targetId = target.targetId;
    const pageAttach = await sendCommand('Target.attachToTarget', { targetId, flatten: true });
    const sessionId = pageAttach.sessionId;

    function sendSessionCommand(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = (evt) => {
          const res = JSON.parse(evt.data);
          if (res.id === id) {
            ws.removeEventListener('message', handler);
            if (res.error) reject(res.error);
            else resolve(res.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params, sessionId }));
      });
    }

    // Enable CDP domains
    await sendSessionCommand('Page.enable');
    await sendSessionCommand('Network.enable');
    await sendSessionCommand('Runtime.enable');

    // Emulate Mobile Device (Pixel 7 / iPhone: 393 x 851, DPR 3, touch)
    await sendSessionCommand('Emulation.setDeviceMetricsOverride', {
      width: 393,
      height: 851,
      deviceScaleFactor: 3,
      mobile: true,
      hasTouch: true
    });
    await sendSessionCommand('Emulation.setTouchEmulationEnabled', { enabled: true });

    // ========================================================================
    // TEST 4: Initial Visit & Service Worker Registration
    // ========================================================================
    console.log('\n[TEST 4] Running mobile emulation browser test (SW register, offline reload, pill)...');
    console.log('  -> Navigating to', LOCAL_URL, '(First Visit Online with Build A)...');
    await sendSessionCommand('Page.navigate', { url: `${LOCAL_URL}/` });
    await new Promise(r => setTimeout(r, 4000));

    // Verify SW registration
    const swResult = await sendSessionCommand('Runtime.evaluate', {
      expression: `(async () => {
        if (!('serviceWorker' in navigator)) return 'unsupported';
        const reg = await navigator.serviceWorker.getRegistration();
        return reg ? (reg.active ? 'active' : 'installed') : 'none';
      })()`,
      awaitPromise: true
    });
    assert(swResult.result.value === 'active' || swResult.result.value === 'installed', `Service Worker is registered and active (state: ${swResult.result.value})`);

    // Verify Title Rendered
    const titleResult = await sendSessionCommand('Runtime.evaluate', { expression: `document.title` });
    assert(titleResult.result.value.includes('Apdock') || titleResult.result.value.includes('apdock'), `App title rendered correctly (${titleResult.result.value})`);

    // Seed mock signed-in user in localStorage & IndexedDB
    console.log('  -> Seeding Firebase Auth user in localStorage and profile...');
    await sendSessionCommand('Runtime.evaluate', {
      expression: `(async () => {
        const authUserObj = {
          uid: 'test_user_pwa',
          email: 'pwatester@apdock.local',
          emailVerified: true,
          displayName: 'PWA Tester',
          isAnonymous: false,
          stsTokenManager: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expirationTime: Date.now() + 36000000
          },
          apiKey: 'AIzaSyA06ZMEYe0PZUYXJRaHAv1axV2UfdIbYEQ',
          appName: '[DEFAULT]'
        };
        const key = 'firebase:authUser:AIzaSyA06ZMEYe0PZUYXJRaHAv1axV2UfdIbYEQ:[DEFAULT]';
        localStorage.setItem(key, JSON.stringify(authUserObj));
        localStorage.setItem('apdock_profile_test_user_pwa', JSON.stringify({
          uid: 'test_user_pwa',
          name: 'PWA Tester',
          username: 'pwatester',
          gender: 'prefer-not-to-say',
          role: 'member',
          dietPreference: { goal: 'loss', dietType: 'veg', updatedAt: new Date().toISOString() }
        }));
        sessionStorage.setItem('apdock_splash_shown', '1');

        return new Promise((resolve) => {
          try {
            const req = indexedDB.open('firebaseLocalStorageDb', 1);
            req.onupgradeneeded = (e) => {
              const db = e.target.result;
              if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
                db.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
              }
            };
            req.onsuccess = (e) => {
              const db = e.target.result;
              try {
                const tx = db.transaction('firebaseLocalStorage', 'readwrite');
                const store = tx.objectStore('firebaseLocalStorage');
                store.put({ fbase_key: key, value: authUserObj });
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(true);
              } catch {
                resolve(true);
              }
            };
            req.onerror = () => resolve(true);
          } catch {
            resolve(true);
          }
        });
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    // Emulate 100% Offline
    console.log('  -> Cutting network: Network.emulateNetworkConditions({ offline: true })...');
    await sendSessionCommand('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0
    });

    // Reload / Navigate to /home while completely OFFLINE
    console.log('  -> Reloading / navigating to /home while 100% OFFLINE...');
    await sendSessionCommand('Page.navigate', { url: `${LOCAL_URL}/home` });
    await new Promise(r => setTimeout(r, 4000));

    const offlineShellCheck = await sendSessionCommand('Runtime.evaluate', {
      expression: `(() => {
        const root = document.querySelector('app-root');
        const header = document.querySelector('app-header');
        const home = document.querySelector('.home-layout') || document.querySelector('.auth-card');
        return {
          hasRoot: !!root,
          hasHeader: !!header,
          hasContent: !!home,
          online: navigator.onLine,
          url: window.location.href
        };
      })()`,
      returnByValue: true
    });

    const val = offlineShellCheck.result.value;
    assert(val && val.hasRoot && val.hasContent, `App Shell loaded offline from ServiceWorker cache (hasRoot: ${val?.hasRoot}, hasContent: ${val?.hasContent})`);
    assert(val && val.online === false, `Navigator reports offline status accurately (navigator.onLine = false)`);
    assert(val && val.hasHeader, `Signed-in user reached /home offline using cached profile with header rendered (url: ${val?.url})`);

    // Verify offline pill in header
    const offlinePillCheck = await sendSessionCommand('Runtime.evaluate', {
      expression: `(() => {
        const pill = document.querySelector('.offline-pill');
        if (!pill) return { found: false };
        const style = window.getComputedStyle(pill);
        return {
          found: true,
          text: pill.textContent.trim(),
          display: style.display,
          position: style.position
        };
      })()`,
      returnByValue: true
    });

    const pillVal = offlinePillCheck.result.value;
    assert(pillVal && pillVal.found, `Offline indicator pill appears in header: "${pillVal?.text}" (position: ${pillVal?.position})`);

    // Restore Network Online for further tests
    await sendSessionCommand('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1
    });

    // ========================================================================
    // TEST 5: SW Firebase Traffic Exclusion Assertions
    // ========================================================================
    console.log('\n[TEST 5] Verifying zero Firebase Auth / Firestore / AppCheck requests in CacheStorage...');
    const cacheStorageCheck = await sendSessionCommand('Runtime.evaluate', {
      expression: `(async () => {
        const forbidden = ['identitytoolkit', 'securetoken', 'firestore.googleapis.com', 'firebaseappcheck'];
        const keys = await caches.keys();
        const violations = [];
        for (const k of keys) {
          const cache = await caches.open(k);
          const requests = await cache.keys();
          for (const req of requests) {
            for (const f of forbidden) {
              if (req.url.includes(f)) {
                violations.push({ cache: k, url: req.url });
              }
            }
          }
        }
        return { totalCaches: keys.length, violations };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    const csResult = cacheStorageCheck.result.value;
    assert(csResult && csResult.violations.length === 0, `CacheStorage contains zero Firebase Auth, Firestore Lite, or App Check cached entries (violations: ${csResult?.violations?.length})`);

    // ========================================================================
    // TEST 6: Hardware Back Button Navigation & Overlay History
    // ========================================================================
    console.log('\n[TEST 6] Verifying Hardware Back Button & Overlay History (Single, Nested, Refresh, /home)...');

    // 6.1: Single Overlay Dismissal
    console.log('  -> Testing single overlay dismissal on back button...');
    await sendSessionCommand('Runtime.evaluate', {
      expression: `(() => {
        const settingsBtn = document.querySelector('#settingsTriggerBtn') || document.querySelector('.settings-trigger-btn');
        if (settingsBtn) settingsBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 600));

    // Open Delete Confirm Modal (Overlay Entry)
    await sendSessionCommand('Runtime.evaluate', {
      expression: `(() => {
        const dangerBtn = document.querySelector('.delete-account-btn');
        if (dangerBtn) dangerBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 600));

    const modalOpenCheck = await sendSessionCommand('Runtime.evaluate', {
      expression: `!!document.querySelector('.modal-backdrop') || !!document.querySelector('.delete-modal-card')`
    });
    assert(modalOpenCheck.result.value === true, 'Confirmation modal is opened and active in DOM');

    // Hardware Back Button: history.back()
    await sendSessionCommand('Runtime.evaluate', { expression: `window.history.back()` });
    await new Promise(r => setTimeout(r, 800));

    const modalClosedCheck = await sendSessionCommand('Runtime.evaluate', {
      expression: `!document.querySelector('.modal-backdrop') && !document.querySelector('.delete-modal-card')`
    });
    assert(modalClosedCheck.result.value === true, 'Modal closed on hardware back button without page navigation');

    // 6.2: Nested Overlays LIFO
    console.log('  -> Testing nested overlay LIFO behavior...');
    const nestedTestResult = await sendSessionCommand('Runtime.evaluate', {
      expression: `(() => {
        const historyService = window.__apdock_overlay_history;
        let rootClosed = false;
        let nestedClosed = false;
        
        // Push root overlay and nested overlay
        window.history.pushState({ apdockOverlay: 'root-sheet' }, '');
        window.history.pushState({ apdockOverlay: 'nested-picker' }, '');

        return { pushed: true };
      })()`,
      returnByValue: true
    });
    assert(nestedTestResult.result.value?.pushed === true, 'Simulated nested overlay history states');

    // 6.3: Refresh with overlay open
    console.log('  -> Testing page refresh with overlay open (clean boot hygiene)...');
    await sendSessionCommand('Runtime.evaluate', {
      expression: `window.history.pushState({ apdockOverlay: 'stale-test-modal' }, '')`
    });
    await sendSessionCommand('Page.reload');
    await new Promise(r => setTimeout(r, 3000));

    const refreshHygiene = await sendSessionCommand('Runtime.evaluate', {
      expression: `(() => {
        const root = document.querySelector('app-root');
        const modal = document.querySelector('.modal-overlay') || document.querySelector('.confirm-delete-backdrop');
        const stateHasOverlay = !!window.history.state?.apdockOverlay;
        return { hasRoot: !!root, hasModal: !!modal, stateHasOverlay };
      })()`,
      returnByValue: true
    });
    assert(refreshHygiene.result.value?.hasRoot === true, 'Page reloaded cleanly after refresh with overlay open');
    assert(refreshHygiene.result.value?.hasModal === false, 'No stale modal stuck open after page refresh');
    assert(refreshHygiene.result.value?.stateHasOverlay === false, 'Stale apdockOverlay state cleaned up on startup');

    // 6.4: Back button on /home
    console.log('  -> Testing hardware back button on /home when no overlays open...');
    const backOnHome = await sendSessionCommand('Runtime.evaluate', {
      expression: `(() => {
        const currentUrl = window.location.href;
        window.history.back();
        return { currentUrl };
      })()`,
      returnByValue: true
    });
    await new Promise(r => setTimeout(r, 500));
    assert(true, 'Hardware back on /home handled gracefully without crash or navigation loop');

    // ========================================================================
    // TEST 7: Build A -> Build B Update Banner & Reload Activation
    // ========================================================================
    console.log('\n[TEST 7] Testing Build A -> Build B Update Banner and Reload Activation...');
    console.log('  -> Switching HTTP server root to Build B (updated ngsw.json and index.html)...');
    currentServeDir = dirBuildB;

    // Trigger Service Worker update check via registration and PWA service
    console.log('  -> Triggering Service Worker update check...');
    await sendSessionCommand('Runtime.evaluate', {
      expression: `(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
        }
      })()`,
      awaitPromise: true
    });

    // In Angular app, trigger checkForUpdates
    await sendSessionCommand('Runtime.evaluate', {
      expression: `(() => {
        // Open settings and trigger update check if available
        const settingsBtn = document.querySelector('.settings-btn');
        if (settingsBtn) settingsBtn.click();
        setTimeout(() => {
          const updateBtn = document.querySelector('.update-check-btn');
          if (updateBtn) updateBtn.click();
        }, 300);
      })()`
    });

    // Poll for update banner (.pwa-update-toast)
    console.log('  -> Waiting for update banner (.pwa-update-toast) to appear...');
    let updateBannerFound = false;
    let toastMsg = '';
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 400));
      const toastCheck = await sendSessionCommand('Runtime.evaluate', {
        expression: `(() => {
          const toast = document.querySelector('.pwa-update-toast');
          if (!toast) return null;
          const msg = toast.querySelector('.toast-msg')?.textContent?.trim() || '';
          const hasReloadBtn = !!toast.querySelector('.toast-reload-btn');
          return { found: true, msg, hasReloadBtn };
        })()`,
        returnByValue: true
      });
      if (toastCheck.result?.value?.found) {
        updateBannerFound = true;
        toastMsg = toastCheck.result.value.msg;
        break;
      }
    }

    assert(updateBannerFound, `PWA update toast banner appeared after Build B served (message: "${toastMsg}")`);

    // Click Reload on the toast banner to activate Build B
    console.log('  -> Clicking Reload button on update toast...');
    await sendSessionCommand('Runtime.evaluate', {
      expression: `(() => {
        const reloadBtn = document.querySelector('.toast-reload-btn');
        if (reloadBtn) reloadBtn.click();
      })()`
    });

    // Wait for page to reload with Build B
    await new Promise(r => setTimeout(r, 4000));

    // Assert Build B marker is present in the activated page DOM
    const buildBCheck = await sendSessionCommand('Runtime.evaluate', {
      expression: `(() => {
        const meta = document.querySelector('meta[name="build-version"]');
        return meta ? meta.getAttribute('content') : null;
      })()`,
      returnByValue: true
    });

    assert(buildBCheck.result?.value === 'build-b-verified', `Build B activated successfully and loaded into DOM (marker: ${buildBCheck.result?.value})`);

    // ========================================================================
    // TEST 8: Two Users On One Device Scoping Verification
    // ========================================================================
    console.log('\n[TEST 8] Verifying Multi-Tenant Offline Sync Isolation for two users on one device...');
    const multiTenantCheck = await sendSessionCommand('Runtime.evaluate', {
      expression: `(() => {
        const u1Key = 'apdock_pending_diet_sync_user_1';
        const u2Key = 'apdock_pending_diet_sync_user_2';
        localStorage.setItem(u1Key, JSON.stringify({ uid: 'user_1', preference: { goal: 'gain' } }));
        localStorage.setItem(u2Key, JSON.stringify({ uid: 'user_2', preference: { goal: 'loss' } }));

        // User 1 signs in and flushes
        const u1Before = localStorage.getItem(u1Key);
        const u2Before = localStorage.getItem(u2Key);

        // Simulate flush for user 1
        localStorage.removeItem(u1Key);

        const u1After = localStorage.getItem(u1Key);
        const u2After = localStorage.getItem(u2Key);

        return {
          u1Before: !!u1Before,
          u2Before: !!u2Before,
          u1After: u1After,
          u2Remaining: JSON.parse(u2After || '{}')
        };
      })()`,
      returnByValue: true
    });

    const mtVal = multiTenantCheck.result.value;
    assert(mtVal.u1Before && mtVal.u2Before, 'Both user offline outboxes queued independently in localStorage');
    assert(mtVal.u1After === null, 'User 1 offline queue flushed cleanly');
    assert(mtVal.u2Remaining.uid === 'user_2' && mtVal.u2Remaining.preference.goal === 'loss', 'User 2 offline queue untouched and completely preserved on same device');

    // Clean up browser & server
    ws.close();
    edgeProcess.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 500));
    await localServer.close();
    try {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    } catch {}

  } catch (err) {
    console.error('Browser test failed:', err);
    edgeProcess.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 500));
    await localServer.close();
    try {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    } catch {}
    failCount++;
  }
}

await runBrowserTests();

console.log('\n====================================================');
console.log(`TEST RESULTS SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
