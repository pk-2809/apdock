import { Injectable, signal, computed } from '@angular/core';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser,
  signOut as firebaseSignOut
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore/lite';
import { firebaseConfig } from '../firebase.config';

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
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);

    // Listen to real-time auth changes
    onAuthStateChanged(this.auth, async (user) => {
      this.currentUser.set(user);
      if (user) {
        await this.fetchOrSyncUserProfile(user);
      } else {
        this.userProfile.set(null);
      }
      this.isAuthLoading.set(false);
    });
  }

  /**
   * Helper: Hash/format internal password from user PIN
   */
  private formatPinToPassword(pin: string): string {
    return `apdock_pin_${pin.trim()}_secure`;
  }

  /**
   * Login with Username and Security PIN
   */
  async signInWithUsernameAndPin(usernameInput: string, pin: string): Promise<User> {
    this.isSubmitting.set(true);
    this.authError.set(null);
    this.totalLoadingSteps.set(4);
    this.loadingStep.set(1);
    this.loadingStage.set('Connecting to secure apdock vault.');

    try {
      const cleanUser = usernameInput.trim().toLowerCase().replace(/^@/, '');
      if (!cleanUser) {
        throw new Error('Please enter your username.');
      }

      await this.delay(350);
      this.loadingStep.set(2);
      this.loadingStage.set(`Locating @${cleanUser} profile.`);

      // 1. Check local device cache first (instant & immune to adblockers)
      let userEmail: string | null = null;
      try {
        userEmail = localStorage.getItem(`apdock_user_${cleanUser}`);
      } catch {}

      // 2. Resolve email linked to username in Firestore if not in local cache
      let lookupError: unknown = null;
      if (!userEmail) {
        try {
          const usernameDocRef = doc(this.db, 'usernames', cleanUser);
          const usernameSnap = await getDoc(usernameDocRef);

          if (usernameSnap.exists()) {
            userEmail = usernameSnap.data()['email'];
            if (userEmail) {
              try {
                localStorage.setItem(`apdock_user_${cleanUser}`, userEmail);
              } catch {}
            }
          }
        } catch (err) {
          lookupError = err;
          console.warn('Firestore lookup warning:', err);
        }
      }

      if (!userEmail) {
        if (cleanUser.includes('@')) {
          userEmail = cleanUser;
        } else if (lookupError) {
          throw new Error('Database connection blocked by browser shields or adblocker. Please turn off Brave Shields for localhost, or sign in using your email.');
        } else {
          throw new Error(`Username ${cleanUser} not found, Please re-verify or create an account.`);
        }
      }

      this.loadingStep.set(3);
      this.loadingStage.set('Verifying your secret 4-digit PIN.');
      await this.delay(350);

      const secret = this.formatPinToPassword(pin);
      const cred = await signInWithEmailAndPassword(this.auth, userEmail, secret);

      this.loadingStep.set(4);
      this.loadingStage.set('All set! Unlocking your apdock...');
      await this.delay(400);

      await this.syncUserToBackend(cred.user, { username: cleanUser });
      await this.delay(300);
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
   * Sign Up with Name, Email, PIN & Confirm PIN
   * Automatically generates a unique username with incrementing number if taken (e.g., test, test1, test2)
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

      await this.delay(350);
      this.loadingStep.set(2);

      // Auto-create unique username (e.g. test, test1, test2...)
      const uniqueUsername = await this.generateUniqueUsername(cleanName, cleanEmail);
      this.loadingStage.set(`Creating unique @${uniqueUsername} handle.`);
      try {
        localStorage.setItem(`apdock_user_${uniqueUsername.toLowerCase()}`, cleanEmail);
      } catch {}
      await this.delay(350);

      this.loadingStep.set(3);
      this.loadingStage.set('Securing your private 4-digit PIN.');
      const secret = this.formatPinToPassword(pin);
      const cred = await createUserWithEmailAndPassword(this.auth, cleanEmail, secret);

      // Update Firebase Auth display name
      await updateProfile(cred.user, { displayName: cleanName });
      await this.delay(350);

      this.loadingStep.set(4);
      this.loadingStage.set('Configuring 4 lifestyle quadrants.');

      // Backend sync to Firestore
      await this.syncUserToBackend(cred.user, {
        displayName: cleanName,
        username: uniqueUsername,
        isNewUser: true
      });
      await this.delay(350);

      this.loadingStep.set(5);
      this.loadingStage.set('All set! Welcome to your apdock.');
      await this.delay(400);

      return { user: cred.user, username: uniqueUsername };
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
   * Auto-create unique username based on dynamic name logic:
   * e.g., 'Alex River' ->
   * 1. 'alex'
   * 2. if taken -> 'alexriver'
   * 3. if taken -> 'alex1'
   * 4. if taken -> 'alexriver1'
   * 5. if taken -> 'alex2'
   * 6. if taken -> 'alexriver2'...
   */
  async generateUniqueUsername(name: string, email: string): Promise<string> {
    const words = name
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/g, ''))
      .filter(Boolean);

    let firstName = words[0] || '';
    let fullName = words.join('');

    if (!firstName || firstName.length < 2) {
      firstName = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    if (!firstName) firstName = 'dock';
    if (!fullName || fullName.length < 2) fullName = firstName;

    firstName = firstName.slice(0, 14);
    fullName = fullName.slice(0, 20);

    const hasDistinctFull = fullName !== firstName && fullName.length > firstName.length;

    // Helper: checks candidate availability in both localStorage cache and Firestore
    const isAvailable = async (candidate: string): Promise<boolean> => {
      // 1. Check local device cache
      try {
        if (localStorage.getItem(`apdock_user_${candidate}`)) {
          return false;
        }
      } catch {}

      // 2. Check Firestore usernames collection
      try {
        const usernameDocRef = doc(this.db, 'usernames', candidate);
        const snap = await getDoc(usernameDocRef);
        return !snap.exists();
      } catch {
        // If Firestore is temporarily unreachable or blocked, consider available if not locally taken
        return true;
      }
    };

    // Candidate 1: First name (e.g. 'alex')
    if (await isAvailable(firstName)) {
      return firstName;
    }

    // Candidate 2: Full name (e.g. 'alexriver')
    if (hasDistinctFull && (await isAvailable(fullName))) {
      return fullName;
    }

    // Candidate 3+: Alternating sequence with numbers (e.g. 'alex1', 'alexriver1', 'alex2', 'alexriver2'...)
    let counter = 1;
    while (counter <= 200) {
      const candidateFirst = `${firstName}${counter}`;
      if (await isAvailable(candidateFirst)) {
        return candidateFirst;
      }

      if (hasDistinctFull) {
        const candidateFull = `${fullName}${counter}`;
        if (await isAvailable(candidateFull)) {
          return candidateFull;
        }
      }

      counter++;
    }

    return `${firstName}${Date.now().toString().slice(-4)}`;
  }

  /**
   * Sign out the active user with complete session killing mechanism
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
   * Delete account with complete backend deletion mechanism:
   * 1. Removes user profile document from Firestore (`users/{uid}`)
   * 2. Releases reserved username document from Firestore (`usernames/{username}`)
   * 3. Cleans up local device caches
   * 4. Deletes Firebase Auth user (`deleteUser`)
   * 5. Fully kills active session
   */
  async deleteAccount(): Promise<void> {
    this.isSubmitting.set(true);
    this.authError.set(null);

    const user = this.auth.currentUser || this.currentUser();
    if (!user) {
      this.isSubmitting.set(false);
      throw new Error('No authenticated user found.');
    }

    const uid = user.uid;
    const username = this.userProfile()?.username || '';

    try {
      // 1. Delete user document in Firestore
      try {
        const userDocRef = doc(this.db, 'users', uid);
        await deleteDoc(userDocRef);
      } catch (err) {
        console.warn('Could not delete user Firestore doc:', err);
      }

      // 2. Delete reserved username in Firestore
      if (username) {
        try {
          const usernameDocRef = doc(this.db, 'usernames', username.toLowerCase());
          await deleteDoc(usernameDocRef);
        } catch (err) {
          console.warn('Could not release username in Firestore:', err);
        }

        // Clean up local device username cache
        try {
          localStorage.removeItem(`apdock_user_${username.toLowerCase()}`);
        } catch {}
      }

      // 3. Delete user from Firebase Auth
      await deleteUser(user);

      // 4. Kill session and reset signals
      this.currentUser.set(null);
      this.userProfile.set(null);
      try {
        sessionStorage.clear();
      } catch {}
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/requires-recent-login') {
        const msg = 'For security reasons, deleting your account requires recent sign-in. Please sign out and sign in again before deleting your account.';
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
   * Synchronize user record to Firestore backend on user creation / login
   */
  async syncUserToBackend(
    user: User,
    options?: { displayName?: string; username?: string; isNewUser?: boolean }
  ): Promise<void> {
    this.isBackendSyncing.set(true);
    this.backendSyncSuccess.set(false);
    try {
      const userRef = doc(this.db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      const name = options?.displayName || user.displayName || 'Apdock Member';
      const existingData = userSnap.exists() ? (userSnap.data() as UserProfile) : null;
      const username = options?.username || existingData?.username || (await this.generateUniqueUsername(name, user.email || 'dock'));

      if (!userSnap.exists() || options?.isNewUser) {
        // 1. Save username claim in Firestore
        try {
          await setDoc(doc(this.db, 'usernames', username.toLowerCase()), {
            uid: user.uid,
            username: username.toLowerCase(),
            email: user.email?.toLowerCase() || '',
            displayName: name,
            createdAt: serverTimestamp()
          });
        } catch (e) {
          console.warn('Could not write to usernames index:', e);
        }

        // 2. Create full initial user document in Firestore
        const newProfile: UserProfile = {
          uid: user.uid,
          username: username.toLowerCase(),
          email: user.email,
          displayName: name,
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

        await setDoc(userRef, newProfile);
        this.userProfile.set(newProfile);
        try {
          localStorage.setItem(`apdock_profile_${user.uid}`, JSON.stringify(newProfile));
        } catch {}
      } else {
        // Update existing user document with login timestamp
        await updateDoc(userRef, {
          lastLoginAt: serverTimestamp(),
          ...(user.photoURL ? { photoURL: user.photoURL } : {}),
          ...(user.displayName ? { displayName: user.displayName } : {})
        });

        const data = userSnap.data() as UserProfile;
        this.userProfile.set(data);
        try {
          localStorage.setItem(`apdock_profile_${user.uid}`, JSON.stringify(data));
        } catch {}
      }

      this.backendSyncSuccess.set(true);
    } catch (err: unknown) {
      console.warn('Backend sync to Firestore failed or offline, caching locally:', err);
      const fallbackUser = options?.username || user.email?.split('@')[0] || 'member';
      const fallbackProfile: UserProfile = {
        uid: user.uid,
        username: fallbackUser,
        email: user.email,
        displayName: options?.displayName || user.displayName || 'Apdock Member',
        photoURL: user.photoURL || null,
        themePreference: 'system',
        quadrants: {
          family: { title: 'Family & Tribe', enabled: true },
          flow: { title: 'Daily Flow & Tasks', enabled: true },
          health: { title: 'Health & Wellness', enabled: true },
          home: { title: 'Home & Sanctuary', enabled: true }
        }
      };
      this.userProfile.set(fallbackProfile);
      try {
        localStorage.setItem(`apdock_profile_${user.uid}`, JSON.stringify(fallbackProfile));
      } catch {}
    } finally {
      this.isBackendSyncing.set(false);
    }
  }

  private async fetchOrSyncUserProfile(user: User): Promise<void> {
    try {
      const userRef = doc(this.db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        this.userProfile.set(data);
        try {
          localStorage.setItem(`apdock_profile_${user.uid}`, JSON.stringify(data));
        } catch {}
      } else {
        await this.syncUserToBackend(user);
      }
    } catch {
      // Offline fallback: check local profile cache
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
        this.userProfile.set({
          uid: user.uid,
          username: user.email?.split('@')[0] || 'member',
          email: user.email,
          displayName: user.displayName || 'Apdock Member',
          photoURL: user.photoURL || null
        });
      }
    }
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
        return 'Please enter a valid email address.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect username or PIN. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Try signing in with your username.';
      case 'auth/weak-password':
        return 'PIN must be exactly 4 digits.';
      case 'auth/configuration-not-found':
      case 'auth/operation-not-allowed':
        return 'Email/Password sign-in is not enabled yet in your Firebase Console. Please go to Firebase Console > Authentication > Sign-in method and enable "Email/Password".';
      case 'auth/admin-restricted-operation':
        return 'Sign-up is restricted in your Firebase project settings.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connectivity.';
      default:
        return err.message || 'Authentication failed. Please try again.';
    }
  }

  async updateDietPreference(preference: unknown): Promise<void> {
    const user = this.currentUser();
    if (!user) return;
    try {
      const userRef = doc(this.db, 'users', user.uid);
      await setDoc(userRef, { dietPreference: preference, updatedAt: serverTimestamp() }, { merge: true });
      const current = this.userProfile();
      if (current) {
        const updated = { ...current, dietPreference: preference };
        this.userProfile.set(updated);
        try {
          localStorage.setItem(`apdock_profile_${user.uid}`, JSON.stringify(updated));
        } catch {}
      }
    } catch (e) {
      console.warn('Could not update dietPreference in firestore:', e);
    }
  }
}

