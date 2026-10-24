import { Injectable, signal, computed } from '@angular/core';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  signOut as firebaseSignOut
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { firebaseConfig } from '../firebase.config';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt?: unknown;
  lastLoginAt?: unknown;
  themePreference?: 'system' | 'light' | 'dark';
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

  readonly isAuthenticated = computed(() => !!this.currentUser());

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
   * Sign In with Email & Password
   */
  async signIn(email: string, pass: string): Promise<User> {
    this.isSubmitting.set(true);
    this.authError.set(null);
    try {
      const cred = await signInWithEmailAndPassword(this.auth, email.trim(), pass);
      await this.syncUserToBackend(cred.user);
      return cred.user;
    } catch (err: unknown) {
      const msg = this.translateFirebaseError(err);
      this.authError.set(msg);
      throw new Error(msg);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Sign Up with Email, Password & Display Name
   */
  async signUp(email: string, pass: string, displayName: string): Promise<User> {
    this.isSubmitting.set(true);
    this.authError.set(null);
    try {
      const cred = await createUserWithEmailAndPassword(this.auth, email.trim(), pass);
      const cleanName = displayName.trim() || 'Apdock Member';

      // Update Firebase Auth profile
      await updateProfile(cred.user, { displayName: cleanName });

      // Immediate backend sync to Firestore
      await this.syncUserToBackend(cred.user, { displayName: cleanName, isNewUser: true });

      return cred.user;
    } catch (err: unknown) {
      const msg = this.translateFirebaseError(err);
      this.authError.set(msg);
      throw new Error(msg);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * One-Tap / Popup Sign In with Google
   */
  async signInWithGoogle(): Promise<User> {
    this.isSubmitting.set(true);
    this.authError.set(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(this.auth, provider);
      await this.syncUserToBackend(cred.user);
      return cred.user;
    } catch (err: unknown) {
      const msg = this.translateFirebaseError(err);
      this.authError.set(msg);
      throw new Error(msg);
    } finally {
      this.isSubmitting.set(false);
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
    } catch (err: unknown) {
      this.authError.set(this.translateFirebaseError(err));
    }
  }

  /**
   * Synchronize user record to Firestore backend on user creation / login
   */
  async syncUserToBackend(user: User, options?: { displayName?: string; isNewUser?: boolean }): Promise<void> {
    this.isBackendSyncing.set(true);
    this.backendSyncSuccess.set(false);
    try {
      const userRef = doc(this.db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      const name = options?.displayName || user.displayName || 'Apdock Member';

      if (!userSnap.exists() || options?.isNewUser) {
        // Create full initial user document in Firestore
        const newProfile: UserProfile = {
          uid: user.uid,
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
      } else {
        // Update existing user document with login timestamp
        await updateDoc(userRef, {
          lastLoginAt: serverTimestamp(),
          ...(user.photoURL ? { photoURL: user.photoURL } : {}),
          ...(user.displayName ? { displayName: user.displayName } : {})
        });

        const data = userSnap.data() as UserProfile;
        this.userProfile.set(data);
      }

      this.backendSyncSuccess.set(true);
    } catch (err: unknown) {
      console.warn('Backend sync to Firestore failed or offline, caching locally:', err);
      // Fallback local memory profile so user experience is uninterrupted
      this.userProfile.set({
        uid: user.uid,
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
      });
    } finally {
      this.isBackendSyncing.set(false);
    }
  }

  private async fetchOrSyncUserProfile(user: User): Promise<void> {
    try {
      const userRef = doc(this.db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        this.userProfile.set(snap.data() as UserProfile);
      } else {
        await this.syncUserToBackend(user);
      }
    } catch {
      // Offline fallback
      this.userProfile.set({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Apdock Member',
        photoURL: user.photoURL || null
      });
    }
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
        return 'Incorrect email or password. Please verify your credentials.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email. Try signing in instead.';
      case 'auth/weak-password':
        return 'Your password should be at least 6 characters.';
      case 'auth/popup-closed-by-user':
        return 'Google sign-in was canceled before completion.';
      case 'auth/network-request-failed':
        return 'Network connection error. Check your internet connectivity.';
      default:
        return err.message || 'Authentication failed. Please try again.';
    }
  }
}
