import { Injectable, signal, computed, isDevMode } from '@angular/core';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  Auth,
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser,
  signOut as firebaseSignOut,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore/lite';
import { initializeAppCheck, ReCaptchaV3Provider, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { firebaseConfig } from '../firebase.config';

declare const ngDevMode: boolean | undefined;

export const AUTH_SYNTHETIC_DOMAIN = 'auth.apdock.internal';

export const RESERVED_HANDLES = new Set([
  'admin',
  'administrator',
  'root',
  'support',
  'help',
  'apdock',
  'system',
  'auth',
  'api',
  'null',
  'undefined',
  'anonymous',
  'guest',
  'user',
  'dock',
  'moderator',
  'security',
  'public',
  'private',
  'dev',
  'test',
  'official'
]);

export function handleToSyntheticEmail(handle: string): string {
  const clean = handle.trim().toLowerCase().replace(/^@/, '');
  return `${clean}@${AUTH_SYNTHETIC_DOMAIN}`;
}

export function validatePinStrength(pin: string): { valid: boolean; reason?: string } {
  const trimmed = pin.trim();
  if (!/^\d{6}$/.test(trimmed)) {
    return { valid: false, reason: 'PIN must be exactly 6 digits.' };
  }
  // Reject repeating single digit: 000000, 111111, ..., 999999
  if (/^(\d)\1{5}$/.test(trimmed)) {
    return { valid: false, reason: 'PIN cannot be all the same digit.' };
  }
  // Reject sequential series
  const ascending = '0123456789';
  const descending = '9876543210';
  if (ascending.includes(trimmed) || descending.includes(trimmed)) {
    return { valid: false, reason: 'PIN cannot be a sequential series of numbers.' };
  }
  // Reject common predictable patterns
  const blacklist = ['112233', '121212', '123123', '654321', '000000', '123456'];
  if (blacklist.includes(trimmed)) {
    return { valid: false, reason: 'Please choose a less predictable PIN.' };
  }
  return { valid: true };
}

export function generateCandidateHandles(name: string): string[] {
  const words = name
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);

  let firstName = words[0] || '';
  let fullName = words.join('');

  if (!firstName || firstName.length < 2) {
    firstName = 'user';
  }
  if (!fullName || fullName.length < 2) {
    fullName = firstName;
  }

  firstName = firstName.slice(0, 14);
  fullName = fullName.slice(0, 17);

  const candidates: string[] = [];
  const addIfValid = (h: string) => {
    const clean = h.toLowerCase();
    if (
      clean.length >= 3 &&
      clean.length <= 20 &&
      !RESERVED_HANDLES.has(clean) &&
      !candidates.includes(clean)
    ) {
      candidates.push(clean);
    }
  };

  if (firstName.length >= 3 && !RESERVED_HANDLES.has(firstName)) {
    addIfValid(firstName);
  }

  if (fullName.length >= 3 && fullName !== firstName && !RESERVED_HANDLES.has(fullName)) {
    addIfValid(fullName);
  }

  let attempts = 0;
  while (candidates.length < 8 && attempts < 30) {
    attempts++;
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const base = candidates.length % 2 === 0 && fullName !== firstName ? fullName : firstName;
    const truncated = base.slice(0, 17);
    addIfValid(`${truncated}${randomSuffix}`);
  }

  while (candidates.length < 8) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    addIfValid(`user${randomSuffix}`);
  }

  return candidates.slice(0, 8);
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt?: unknown;
  lastLoginAt?: unknown;
  themePreference?: 'system' | 'light' | 'dark';
  dietPreference?: unknown;
  quadrants?: {
    family: { title: string; enabled: boolean };
    flow: { title: string; enabled: boolean };
    health: { title: string; enabled: boolean };
    home: { title: string; enabled: boolean };
  };
  pendingAuthDeletion?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly app: FirebaseApp;
  private readonly auth: Auth;
  private readonly db: Firestore;

  // Reactive state signals
  readonly currentUser = signal<User | null>(null);
  readonly userProfile = signal<UserProfile | null>(null);
  readonly isAuthLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly isBackendSyncing = signal<boolean>(false);
  readonly authError = signal<string | null>(null);
  readonly backendSyncSuccess = signal<boolean>(false);

  // Progressive loading screen state
  readonly loadingStage = signal<string>('');
  readonly loadingStep = signal<number>(0);
  readonly totalLoadingSteps = signal<number>(5);
  readonly loadingPercentage = computed(() => {
    const total = this.totalLoadingSteps() || 5;
    const current = this.loadingStep();
    return Math.min(100, Math.round((current / total) * 100));
  });

  readonly isAuthenticated = computed(() => !!this.currentUser());

  readonly userDisplayName = computed(() => {
    return (
      this.userProfile()?.displayName ||
      this.currentUser()?.displayName ||
      this.currentUser()?.email?.split('@')[0] ||
      'Member'
    );
  });

  readonly userUsername = computed(() => {
    return this.userProfile()?.username || '';
  });

  /**
   * Resolves once the initial Firebase auth state is determined
   */
  async ensureAuthLoaded(): Promise<boolean> {
    if (!this.isAuthLoading()) {
      return !!this.currentUser();
    }
    return new Promise<boolean>((resolve) => {
      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        unsubscribe();
        resolve(!!user);
      });
    });
  }

  constructor() {
    this.app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

    // Step 1: Initialize Auth with indexedDB persistence and NO popupRedirectResolver
    // Omitting popupRedirectResolver prevents heavy gapi/iframe/recaptcha scripts from loading on cold start
    if (typeof window !== 'undefined') {
      try {
        this.auth = initializeAuth(this.app, {
          persistence: [indexedDBLocalPersistence, browserLocalPersistence]
        });
      } catch {
        // Fallback if already initialized (e.g. repeated test instances)
        this.auth = getAuth(this.app);
      }
    } else {
      this.auth = getAuth(this.app);
    }
    this.db = getFirestore(this.app);

    // Step 2: Initialize App Check only if a genuine siteKey is configured in firebaseConfig
    // In production builds (isDevMode() === false), the debug token branch is completely eliminated
    if (typeof window !== 'undefined') {
      try {
        // In production builds, ngDevMode is defined as false by Angular's esbuild compiler,
        // causing esbuild to completely drop the debug token branch from the dist output
        if (typeof ngDevMode !== 'undefined' && ngDevMode) {
          if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cfg = firebaseConfig as any;
        const siteKey = cfg.recaptchaSiteKey;
        if (siteKey) {
          const isEnterprise = cfg.recaptchaEnterprise === true;
          const provider = isEnterprise
            ? new ReCaptchaEnterpriseProvider(siteKey)
            : new ReCaptchaV3Provider(siteKey);
          initializeAppCheck(this.app, {
            provider,
            isTokenAutoRefreshEnabled: true
          });
        }
      } catch (err) {
        console.warn('App Check initialization:', err);
      }
    }

    // Listen to real-time auth changes
    onAuthStateChanged(this.auth, async (user) => {
      this.currentUser.set(user);
      if (user) {
        // Fast-path: immediately hydrate profile from local cache for instant 0ms offline boot
        try {
          const cached = localStorage.getItem(`apdock_profile_${user.uid}`);
          if (cached) {
            this.userProfile.set(JSON.parse(cached));
            this.isAuthLoading.set(false);
          }
        } catch {}

        // Background sync with 4s timeout
        this.fetchOrSyncUserProfile(user).finally(() => {
          this.isAuthLoading.set(false);
        });

        // Flush any pending offline diet preference sync
        this.flushPendingDietSync();
      } else {
        this.userProfile.set(null);
        this.isAuthLoading.set(false);
      }
    });

    // Offline outbox retry listeners
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      window.addEventListener('online', () => this.flushPendingDietSync());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.flushPendingDietSync();
        }
      });
    }
  }

  /**
   * Password derivation from user PIN
   */
  private formatPinToPassword(pin: string): string {
    return `apdock_pin_${pin.trim()}_secure`;
  }

  /**
   * Sign In with Username (or Email) and 6-Digit PIN
   * Option B: No Firestore read before authentication!
   */
  async signInWithUsernameAndPin(usernameInput: string, pin: string): Promise<User> {
    this.isSubmitting.set(true);
    this.authError.set(null);
    this.totalLoadingSteps.set(4);
    this.loadingStep.set(1);
    this.loadingStage.set('Connecting to secure apdock vault.');

    try {
      const cleanInput = usernameInput.trim().toLowerCase().replace(/^@/, '');
      if (!cleanInput) {
        throw new Error('Please enter your username.');
      }

      const pinValidation = validatePinStrength(pin);
      if (!pinValidation.valid) {
        throw new Error(pinValidation.reason || 'Invalid PIN.');
      }

      await this.delay(200);
      this.loadingStep.set(2);
      this.loadingStage.set(`Resolving @${cleanInput} authentication.`);

      // Derive authentication email:
      // If user typed a real email (existing account), use it directly.
      // Otherwise, map handle to synthetic domain: ${handle}@auth.apdock.internal.
      // Zero Firestore reads before authentication!
      const userEmail = cleanInput.includes('@')
        ? cleanInput
        : handleToSyntheticEmail(cleanInput);

      this.loadingStep.set(3);
      this.loadingStage.set('Verifying your secret 6-digit PIN.');
      await this.delay(200);

      const secret = this.formatPinToPassword(pin);
      const cred = await signInWithEmailAndPassword(this.auth, userEmail, secret);

      this.loadingStep.set(4);
      this.loadingStage.set('Unlocking your apdock space...');
      await this.delay(200);

      // Now authenticated: fetch or sync profile
      await this.fetchOrSyncUserProfile(cred.user);
      return cred.user;
    } catch (err: unknown) {
      const msg = this.translateFirebaseError(err);
      this.authError.set(msg);
      throw new Error(msg);
    } finally {
      this.isSubmitting.set(false);
      this.loadingStage.set('');
      this.loadingStep.set(0);
    }
  }

  /**
   * Sign Up with Name, optional Real Email, and 6-Digit PIN
   * Option B: Generate candidates, attempt createUserWithEmailAndPassword per candidate on synthetic domain
   * (max 8 attempts on collision), then ONE writeBatch for /users/{uid} and /usernames/{handle}.
   */
  async signUpWithNameEmailPin(
    name: string,
    email: string,
    pin: string
  ): Promise<{ user: User; username: string }> {
    this.isSubmitting.set(true);
    this.authError.set(null);
    this.totalLoadingSteps.set(5);
    this.loadingStep.set(1);
    this.loadingStage.set('Preparing your personal dock space.');

    try {
      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanName) {
        throw new Error('Please enter your name.');
      }

      const pinValidation = validatePinStrength(pin);
      if (!pinValidation.valid) {
        throw new Error(pinValidation.reason || 'Invalid PIN.');
      }

      await this.delay(200);
      this.loadingStep.set(2);
      this.loadingStage.set('Generating candidate handles.');

      const candidates = generateCandidateHandles(cleanName);
      const secret = this.formatPinToPassword(pin);

      let createdUser: User | null = null;
      let chosenHandle: string | null = null;

      this.loadingStep.set(3);
      this.loadingStage.set('Securing unique handle & 6-digit PIN.');

      // Try candidates against Firebase Auth (up to 8 attempts)
      for (let i = 0; i < candidates.length && i < 8; i++) {
        const candidate = candidates[i];
        const syntheticEmail = handleToSyntheticEmail(candidate);
        try {
          const cred = await createUserWithEmailAndPassword(this.auth, syntheticEmail, secret);
          createdUser = cred.user;
          chosenHandle = candidate;
          break;
        } catch (authErr: unknown) {
          const code = (authErr as { code?: string })?.code;
          if (code === 'auth/email-already-in-use') {
            // Collision: proceed to next candidate
            continue;
          }
          throw authErr;
        }
      }

      if (!createdUser || !chosenHandle) {
        throw new Error('Unable to allocate a unique username. Please try a different name.');
      }

      // Update Auth display name
      await updateProfile(createdUser, { displayName: cleanName });

      this.loadingStep.set(4);
      this.loadingStage.set(`Finalizing @${chosenHandle} vault space.`);

      // Step 1: ONE writeBatch creating /users/{uid} and /usernames/{handle}
      const batch = writeBatch(this.db);
      const usernameDocRef = doc(this.db, 'usernames', chosenHandle);
      batch.set(usernameDocRef, {
        uid: createdUser.uid,
        createdAt: serverTimestamp()
      });

      const userDocRef = doc(this.db, 'users', createdUser.uid);
      const initialProfile: UserProfile = {
        uid: createdUser.uid,
        username: chosenHandle,
        displayName: cleanName,
        email: cleanEmail || null, // Real email for profile if provided; never synthetic email
        photoURL: createdUser.photoURL || null,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        themePreference: 'system',
        quadrants: {
          family: { title: 'Family & Tribe', enabled: true },
          flow: { title: 'Daily Flow & Tasks', enabled: true },
          health: { title: 'Health & Wellness', enabled: true },
          home: { title: 'Home & Sanctuary', enabled: true }
        }
      };
      batch.set(userDocRef, initialProfile);

      try {
        await batch.commit();
      } catch (batchErr) {
        console.warn('Batch commit notice (will repair idempotently on next launch):', batchErr);
      }

      this.userProfile.set(initialProfile);
      try {
        localStorage.setItem(`apdock_profile_${createdUser.uid}`, JSON.stringify(initialProfile));
      } catch {}

      this.loadingStep.set(5);
      this.loadingStage.set('All set! Welcome to your apdock.');
      await this.delay(300);

      return { user: createdUser, username: chosenHandle };
    } catch (err: unknown) {
      const msg = this.translateFirebaseError(err);
      this.authError.set(msg);
      throw new Error(msg);
    } finally {
      this.isSubmitting.set(false);
      this.loadingStage.set('');
      this.loadingStep.set(0);
    }
  }

  /**
   * Sign out the active user
   */
  async signOut(): Promise<void> {
    this.authError.set(null);
    try {
      await firebaseSignOut(this.auth);
      this.currentUser.set(null);
      this.userProfile.set(null);
      try {
        sessionStorage.clear();
      } catch {}
    } catch (err: unknown) {
      this.authError.set(this.translateFirebaseError(err));
      throw err;
    }
  }

  /**
   * Delete account with pre-reauthentication, atomic batched deletion,
   * local data purge, and orphan prevention marker.
   */
  async deleteAccount(pin?: string): Promise<void> {
    this.isSubmitting.set(true);
    this.authError.set(null);

    const user = this.auth.currentUser || this.currentUser();
    if (!user || !user.email) {
      this.isSubmitting.set(false);
      throw new Error('No authenticated user found.');
    }

    const uid = user.uid;
    const username = this.userProfile()?.username || '';

    try {
      // 1. Re-authenticate with 6-digit PIN first if provided
      if (pin) {
        const pinValidation = validatePinStrength(pin);
        if (!pinValidation.valid) {
          throw new Error('Incorrect PIN. Please enter your valid 6-digit PIN.');
        }
        const secret = this.formatPinToPassword(pin);
        const credential = EmailAuthProvider.credential(user.email, secret);
        await reauthenticateWithCredential(user, credential);
      }

      // 2. Atomic writeBatch deletion of Firestore documents
      const batch = writeBatch(this.db);
      batch.delete(doc(this.db, 'users', uid));
      if (username) {
        batch.delete(doc(this.db, 'usernames', username.toLowerCase()));
      }
      await batch.commit();

      // 3. Delete user from Firebase Auth
      try {
        await deleteUser(user);
        // 4. Purge all local storage for this UID
        this.purgeUserLocalStorage(uid);
        try {
          localStorage.removeItem('apdock_pending_auth_deletion');
        } catch {}
      } catch (authDeleteErr) {
        // If deleteUser fails after Firestore batch commit, record pending deletion marker
        try {
          localStorage.setItem(
            'apdock_pending_auth_deletion',
            JSON.stringify({ uid, timestamp: Date.now() })
          );
        } catch {}
        throw authDeleteErr;
      }

      // 5. Reset reactive state
      this.currentUser.set(null);
      this.userProfile.set(null);
      try {
        sessionStorage.clear();
      } catch {}
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/requires-recent-login') {
        const msg =
          'For security reasons, deleting your account requires recent sign-in. Please sign in again with your PIN before deleting.';
        this.authError.set(msg);
        throw new Error(msg);
      }
      const msg = this.translateFirebaseError(err);
      this.authError.set(msg);
      throw new Error(msg);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Purge all apdock_{uid}_* keys and profile from localStorage
   */
  purgeUserLocalStorage(uid: string): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const prefix = `apdock_${uid}_`;
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(prefix) || key === `apdock_profile_${uid}`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }

  /**
   * Idempotently fetch profile or repair missing profile if user exists in Auth
   */
  private async fetchOrSyncUserProfile(user: User): Promise<void> {
    this.isBackendSyncing.set(true);
    try {
      // Check for orphan pending auth deletion
      try {
        const pending = localStorage.getItem('apdock_pending_auth_deletion');
        if (pending) {
          const parsed = JSON.parse(pending);
          if (parsed.uid === user.uid) {
            await deleteUser(user);
            this.purgeUserLocalStorage(user.uid);
            localStorage.removeItem('apdock_pending_auth_deletion');
            this.currentUser.set(null);
            this.userProfile.set(null);
            return;
          }
        }
      } catch {}

      const userRef = doc(this.db, 'users', user.uid);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 4000)
      );
      const snap = await Promise.race([getDoc(userRef), timeoutPromise]);

      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        this.userProfile.set(data);
        try {
          localStorage.setItem(`apdock_profile_${user.uid}`, JSON.stringify(data));
        } catch {}
        this.backendSyncSuccess.set(true);
      } else {
        // Auth user exists without profile doc -> Repair idempotently!
        await this.repairMissingProfileDoc(user);
      }
    } catch {
      // Offline fallback: load cached profile
      let cachedProfile: UserProfile | null = null;
      try {
        const raw = localStorage.getItem(`apdock_profile_${user.uid}`);
        if (raw) {
          cachedProfile = JSON.parse(raw);
        }
      } catch {}

      if (cachedProfile) {
        this.userProfile.set(cachedProfile);
      } else {
        const fallbackHandle = user.email?.split('@')[0] || 'member';
        this.userProfile.set({
          uid: user.uid,
          username: fallbackHandle,
          email: null,
          displayName: user.displayName || 'Apdock Member',
          photoURL: user.photoURL || null
        });
      }
    } finally {
      this.isBackendSyncing.set(false);
    }
  }

  /**
   * Repair missing profile doc idempotently
   */
  private async repairMissingProfileDoc(user: User): Promise<void> {
    const rawHandle =
      user.email && user.email.includes(`@${AUTH_SYNTHETIC_DOMAIN}`)
        ? user.email.split('@')[0].toLowerCase()
        : (user.displayName ? generateCandidateHandles(user.displayName)[0] : `user${Math.floor(1000 + Math.random() * 9000)}`);

    const handle = rawHandle.slice(0, 20);
    const batch = writeBatch(this.db);

    batch.set(doc(this.db, 'usernames', handle), {
      uid: user.uid,
      createdAt: serverTimestamp()
    });

    const initialProfile: UserProfile = {
      uid: user.uid,
      username: handle,
      displayName: user.displayName || 'Apdock Member',
      email: null,
      photoURL: user.photoURL || null,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      themePreference: 'system',
      quadrants: {
        family: { title: 'Family & Tribe', enabled: true },
        flow: { title: 'Daily Flow & Tasks', enabled: true },
        health: { title: 'Health & Wellness', enabled: true },
        home: { title: 'Home & Sanctuary', enabled: true }
      }
    };
    batch.set(doc(this.db, 'users', user.uid), initialProfile);

    await batch.commit();
    this.userProfile.set(initialProfile);
    try {
      localStorage.setItem(`apdock_profile_${user.uid}`, JSON.stringify(initialProfile));
    } catch {}
    this.backendSyncSuccess.set(true);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private translateFirebaseError(error: unknown): string {
    if (!error || typeof error !== 'object') {
      return 'An unexpected error occurred. Please try again.';
    }

    const err = error as { code?: string; message?: string };
    switch (err.code) {
      case 'auth/invalid-email':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect username or PIN. Please try again.';
      case 'auth/email-already-in-use':
        return 'This account already exists. Please sign in with your PIN.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/weak-password':
        return 'PIN must be exactly 6 digits.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connectivity.';
      default:
        return err.message || 'Authentication failed. Please try again.';
    }
  }

  async updateDietPreference(preference: unknown): Promise<void> {
    const user = this.currentUser();
    if (!user) return;

    // 1. Immediately update local profile and cache (zero delay, offline safe)
    const current = this.userProfile();
    if (current) {
      const updated = { ...current, dietPreference: preference };
      this.userProfile.set(updated);
      try {
        localStorage.setItem(`apdock_profile_${user.uid}`, JSON.stringify(updated));
      } catch {}
    }

    // 2. Write to Firestore Lite; if offline or fails, mark pending in UID-scoped outbox
    const syncKey = `apdock_pending_diet_sync_${user.uid}`;
    try {
      const userRef = doc(this.db, 'users', user.uid);
      await setDoc(userRef, { dietPreference: preference, lastLoginAt: serverTimestamp() }, { merge: true });
      try {
        localStorage.removeItem(syncKey);
        localStorage.removeItem('apdock_pending_diet_sync');
      } catch {}
    } catch (e) {
      console.warn('Diet preference cloud sync deferred (offline):', e);
      try {
        localStorage.setItem(
          syncKey,
          JSON.stringify({ uid: user.uid, preference, timestamp: Date.now() })
        );
      } catch {}
    }
  }

  async flushPendingDietSync(): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    try {
      const user = this.currentUser();
      if (!user) return;

      const syncKey = `apdock_pending_diet_sync_${user.uid}`;
      const raw = localStorage.getItem(syncKey) || localStorage.getItem('apdock_pending_diet_sync');
      if (!raw) return;

      const parsed = JSON.parse(raw);
      // Strictly verify that the queued payload belongs to the currently authenticated user
      if (!parsed || parsed.uid !== user.uid) return;

      const userRef = doc(this.db, 'users', user.uid);
      await setDoc(userRef, { dietPreference: parsed.preference, lastLoginAt: serverTimestamp() }, { merge: true });
      localStorage.removeItem(syncKey);
      localStorage.removeItem('apdock_pending_diet_sync');
      console.log(`Successfully flushed pending diet preference for ${user.uid} to cloud`);
    } catch (err) {
      console.warn('Deferred diet preference sync attempt failed:', err);
    }
  }
}
