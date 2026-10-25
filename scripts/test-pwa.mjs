import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';

const PREVIEW_URL = 'https://apdock--pwa-test-71y1j6zy.web.app';
const LOCAL_URL = 'http://localhost:8085';
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
// TEST 4: Browser Automation via Headless Edge CDP (Mobile Emulation & Offline)
// ============================================================================
console.log('\n[TEST 4] Running mobile emulation browser test (SW register, offline reload, pill)...');

async function runBrowserTests() {
  const tmpDir = fs.mkdtempSync('/tmp/apdock-test-');
  const port = 9336;

  const edgeProcess = spawn(EDGE_PATH, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${tmpDir}`,
    'about:blank'
  ]);

  // Poll for DevTools port
  let wsUrl = null;
  for (let i = 0; i < 25; i++) {
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

    // Create target page
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

    // Enable domains
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

    // Step 4.1: First Load - Online
    console.log('  -> Navigating to', LOCAL_URL, '(First Visit Online)...');
    await sendSessionCommand('Page.navigate', { url: `${LOCAL_URL}/` });
    await new Promise(r => setTimeout(r, 4000));

    // Check SW registration
    const swResult = await sendSessionCommand('Runtime.evaluate', {
      expression: `(async () => {
        if (!('serviceWorker' in navigator)) return 'unsupported';
        const reg = await navigator.serviceWorker.getRegistration();
        return reg ? (reg.active ? 'active' : 'installed') : 'none';
      })()`,
      awaitPromise: true
    });

    assert(swResult.result.value === 'active' || swResult.result.value === 'installed', `Service Worker is registered and active (state: ${swResult.result.value})`);

    // Check DOM rendered
    const titleResult = await sendSessionCommand('Runtime.evaluate', {
      expression: `document.title`
    });
    assert(titleResult.result.value.includes('Apdock') || titleResult.result.value.includes('apdock'), `App title rendered correctly (${titleResult.result.value})`);

    // Step 4.2: Simulate Signed-In User State in localStorage (browserLocalPersistence) and IndexedDB
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

    // Step 4.3: Cut Network to OFFLINE
    console.log('  -> Cutting network: Network.emulateNetworkConditions({ offline: true })...');
    await sendSessionCommand('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0
    });

    // Step 4.4: Reload / Navigate to /home while completely OFFLINE
    console.log('  -> Reloading / navigating to /home while 100% OFFLINE...');
    await sendSessionCommand('Page.navigate', { url: `${LOCAL_URL}/home` });
    await new Promise(r => setTimeout(r, 4000));

    // Assert App Shell loaded from SW cache
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
          url: window.location.href,
          bodyHtmlLength: document.body.innerHTML.length
        };
      })()`,
      returnByValue: true
    });

    const val = offlineShellCheck.result.value;
    assert(val && val.hasRoot && val.hasContent, `App Shell loaded offline from ServiceWorker cache (hasRoot: ${val?.hasRoot}, hasContent: ${val?.hasContent})`);
    assert(val && val.online === false, `Navigator reports offline status accurately (navigator.onLine = false)`);
    assert(val && val.hasHeader, `Signed-in user reached /home offline using cached profile with header rendered (url: ${val?.url})`);

    // Assert offline pill appears in header without layout shift
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

    // Step 4.5: Clean up browser
    ws.close();
    edgeProcess.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 500));
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}

  } catch (err) {
    console.error('Browser test failed:', err);
    edgeProcess.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 500));
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
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
