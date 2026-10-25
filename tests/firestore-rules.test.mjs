import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  serverTimestamp
} from 'firebase/firestore';
import fs from 'node:fs';
import path from 'node:path';

describe('Firestore Security Rules - Option B Hardened Rules', () => {
  let testEnv;

  before(async () => {
    const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
    const rules = fs.readFileSync(rulesPath, 'utf8');

    testEnv = await initializeTestEnvironment({
      projectId: 'apdock-rules-test',
      firestore: {
        rules,
        host: '127.0.0.1',
        port: 8080
      }
    });
  });

  after(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  // 1. Unauthenticated access denied on all paths
  describe('Unauthenticated access denied everywhere', () => {
    it('denies unauthenticated get on /users/{uid}', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, 'users', 'user_123')));
    });

    it('denies unauthenticated list on /users', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDocs(collection(db, 'users')));
    });

    it('denies unauthenticated write on /users/{uid}', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(setDoc(doc(db, 'users', 'user_123'), { uid: 'user_123' }));
    });

    it('denies unauthenticated get on /usernames/{h}', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, 'usernames', 'alex')));
    });

    it('denies unauthenticated list on /usernames', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDocs(collection(db, 'usernames')));
    });

    it('denies unauthenticated create on /usernames/{h}', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(setDoc(doc(db, 'usernames', 'alex'), { uid: 'user_123', createdAt: serverTimestamp() }));
    });

    it('denies unauthenticated access on arbitrary path', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, 'other', 'item')));
      await assertFails(setDoc(doc(db, 'other', 'item'), { key: 'val' }));
    });
  });

  // 2. Signed-in user boundaries: list /usernames denied & reading /users/{otherUid} denied
  describe('Signed-in user boundaries', () => {
    it('denies signed-in user from listing /usernames collection', async () => {
      const aliceDb = testEnv.authenticatedContext('user_alice').firestore();
      await assertFails(getDocs(collection(aliceDb, 'usernames')));
    });

    it('allows signed-in user to get a specific handle document in /usernames/{h}', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'usernames', 'bob'), {
          uid: 'user_bob',
          createdAt: new Date()
        });
      });

      const aliceDb = testEnv.authenticatedContext('user_alice').firestore();
      await assertSucceeds(getDoc(doc(aliceDb, 'usernames', 'bob')));
    });

    it('denies user from reading another user profile /users/{otherUid}', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'users', 'user_bob'), {
          uid: 'user_bob',
          username: 'bob',
          createdAt: new Date(),
          lastLoginAt: new Date()
        });
      });

      const aliceDb = testEnv.authenticatedContext('user_alice').firestore();
      await assertFails(getDoc(doc(aliceDb, 'users', 'user_bob')));
    });

    it('denies user from writing to another user profile /users/{otherUid}', async () => {
      const aliceDb = testEnv.authenticatedContext('user_alice').firestore();
      await assertFails(
        setDoc(doc(aliceDb, 'users', 'user_bob'), {
          uid: 'user_bob',
          username: 'bob',
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        })
      );
    });
  });

  // 3. /usernames/{h} validation and immutability
  describe('/usernames/{h} validation & immutability', () => {
    it('succeeds when creating with exactly {uid, createdAt} and matching uid', async () => {
      const aliceDb = testEnv.authenticatedContext('user_alice').firestore();
      await assertSucceeds(
        setDoc(doc(aliceDb, 'usernames', 'alice'), {
          uid: 'user_alice',
          createdAt: serverTimestamp()
        })
      );
    });

    it('fails when creating with extra fields (email, displayName)', async () => {
      const aliceDb = testEnv.authenticatedContext('user_alice').firestore();
      await assertFails(
        setDoc(doc(aliceDb, 'usernames', 'alice'), {
          uid: 'user_alice',
          email: 'alice@example.com',
          createdAt: serverTimestamp()
        })
      );
      await assertFails(
        setDoc(doc(aliceDb, 'usernames', 'alice'), {
          uid: 'user_alice',
          displayName: 'Alice',
          createdAt: serverTimestamp()
        })
      );
    });

    it('fails when uid does not match authenticated user', async () => {
      const aliceDb = testEnv.authenticatedContext('user_alice').firestore();
      await assertFails(
        setDoc(doc(aliceDb, 'usernames', 'alice'), {
          uid: 'user_bob',
          createdAt: serverTimestamp()
        })
      );
    });

    it('fails when handle has invalid format (too short, uppercase, symbols)', async () => {
      const aliceDb = testEnv.authenticatedContext('user_alice').firestore();
      await assertFails(
        setDoc(doc(aliceDb, 'usernames', 'al'), {
          uid: 'user_alice',
          createdAt: serverTimestamp()
        })
      );
      await assertFails(
        setDoc(doc(aliceDb, 'usernames', 'ALICE'), {
          uid: 'user_alice',
          createdAt: serverTimestamp()
        })
      );
      await assertFails(
        setDoc(doc(aliceDb, 'usernames', 'alice_river'), {
          uid: 'user_alice',
          createdAt: serverTimestamp()
        })
      );
    });

    it('denies update on /usernames/{h}', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'usernames', 'alice'), {
          uid: 'user_alice',
          createdAt: new Date()
        });
      });

      const aliceDb = testEnv.authenticatedContext('user_alice').firestore();
      await assertFails(
        updateDoc(doc(aliceDb, 'usernames', 'alice'), {
          uid: 'user_alice_modified'
        })
      );
    });

    it('allows delete of /usernames/{h} by owner only', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'usernames', 'alice'), {
          uid: 'user_alice',
          createdAt: new Date()
        });
      });

      const bobDb = testEnv.authenticatedContext('user_bob').firestore();
      await assertFails(deleteDoc(doc(bobDb, 'usernames', 'alice')));

      const aliceDb = testEnv.authenticatedContext('user_alice').firestore();
      await assertSucceeds(deleteDoc(doc(aliceDb, 'usernames', 'alice')));
    });
  });

  // 4. /users/{uid} profile validation and immutability
  describe('/users/{uid} validation & immutability', () => {
    it('succeeds on initial creation with valid schema', async () => {
      const aliceDb = testEnv.authenticatedContext('user_alice').firestore();
      await assertSucceeds(
        setDoc(doc(aliceDb, 'users', 'user_alice'), {
          uid: 'user_alice',
          username: 'alice',
          displayName: 'Alice River',
          email: null,
          photoURL: null,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          themePreference: 'system',
          dietPreference: {
            goal: 'loss',
            dietType: 'veg',
            updatedAt: '2026-10-25T12:00:00.000Z'
          },
          quadrants: {
            health: { title: 'Health', enabled: true }
          }
        })
      );
    });

    it('fails update when attempting to change immutable uid, username, or createdAt', async () => {
      const initialDate = new Date();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'users', 'user_alice'), {
          uid: 'user_alice',
          username: 'alice',
          createdAt: initialDate,
          lastLoginAt: initialDate,
          themePreference: 'system'
        });
      });

      const aliceDb = testEnv.authenticatedContext('user_alice').firestore();
      // Attempting to change uid
      await assertFails(updateDoc(doc(aliceDb, 'users', 'user_alice'), { uid: 'user_tampered' }));
      // Attempting to change username
      await assertFails(updateDoc(doc(aliceDb, 'users', 'user_alice'), { username: 'bob' }));
      // Attempting to change createdAt
      await assertFails(updateDoc(doc(aliceDb, 'users', 'user_alice'), { createdAt: new Date('2020-01-01') }));
    });

    it('fails update when adding unknown keys not on allowlist', async () => {
      const initialDate = new Date();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'users', 'user_alice'), {
          uid: 'user_alice',
          username: 'alice',
          createdAt: initialDate,
          lastLoginAt: initialDate,
          themePreference: 'system'
        });
      });

      const aliceDb = testEnv.authenticatedContext('user_alice').firestore();
      await assertFails(updateDoc(doc(aliceDb, 'users', 'user_alice'), { isAdmin: true }));
    });

    it('fails update with invalid enums or oversized fields', async () => {
      const initialDate = new Date();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'users', 'user_alice'), {
          uid: 'user_alice',
          username: 'alice',
          createdAt: initialDate,
          lastLoginAt: initialDate,
          themePreference: 'system'
        });
      });

      const aliceDb = testEnv.authenticatedContext('user_alice').firestore();
      // Invalid theme enum
      await assertFails(updateDoc(doc(aliceDb, 'users', 'user_alice'), { themePreference: 'cyberpunk' }));
      // Invalid diet enum
      await assertFails(updateDoc(doc(aliceDb, 'users', 'user_alice'), { dietPreference: { goal: 'ultra', dietType: 'veg' } }));
      // Oversized string (> 60 chars)
      await assertFails(updateDoc(doc(aliceDb, 'users', 'user_alice'), { displayName: 'A'.repeat(61) }));
    });

    it('succeeds update with valid allowed fields', async () => {
      const initialDate = new Date();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'users', 'user_alice'), {
          uid: 'user_alice',
          username: 'alice',
          createdAt: initialDate,
          lastLoginAt: initialDate,
          themePreference: 'system'
        });
      });

      const aliceDb = testEnv.authenticatedContext('user_alice').firestore();
      await assertSucceeds(
        updateDoc(doc(aliceDb, 'users', 'user_alice'), {
          themePreference: 'dark',
          dietPreference: {
            goal: 'gain',
            dietType: 'both'
          }
        })
      );
    });

    it('denies access to subcollections under /users/{uid}', async () => {
      const aliceDb = testEnv.authenticatedContext('user_alice').firestore();
      await assertFails(getDoc(doc(aliceDb, 'users', 'user_alice', 'diet', 'customizations')));
      await assertFails(setDoc(doc(aliceDb, 'users', 'user_alice', 'diet', 'customizations'), { active: true }));
    });
  });

  // 5. End-to-End Client Emulation Flow
  describe('End-to-End Client Emulation Flow', () => {
    it('sign-up on a fresh browser profile works end-to-end with no pre-auth reads', async () => {
      const candidate = 'alice';
      const clientAuthContext = testEnv.authenticatedContext('uid_alice_fresh', {
        email: `${candidate}@auth.apdock.internal`
      });
      const clientDb = clientAuthContext.firestore();

      // Client writes username reservation and profile without any pre-auth read
      await assertSucceeds(
        setDoc(doc(clientDb, 'usernames', candidate), {
          uid: 'uid_alice_fresh',
          createdAt: serverTimestamp()
        })
      );

      await assertSucceeds(
        setDoc(doc(clientDb, 'users', 'uid_alice_fresh'), {
          uid: 'uid_alice_fresh',
          username: candidate,
          displayName: 'Alice River',
          email: null,
          photoURL: null,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          themePreference: 'system'
        })
      );

      const snap = await getDoc(doc(clientDb, 'users', 'uid_alice_fresh'));
      assert.equal(snap.exists(), true);
      assert.equal(snap.data()?.username, 'alice');
    });

    it('sign-in on a fresh browser profile works with zero pre-auth reads', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'users', 'uid_bob_existing'), {
          uid: 'uid_bob_existing',
          username: 'bob',
          displayName: 'Bob Builder',
          email: null,
          photoURL: null,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          themePreference: 'system'
        });
        await setDoc(doc(context.firestore(), 'usernames', 'bob'), {
          uid: 'uid_bob_existing',
          createdAt: new Date()
        });
      });

      // Fresh device signs in directly via synthetic email without querying Firestore first
      const clientAuthContext = testEnv.authenticatedContext('uid_bob_existing', {
        email: 'bob@auth.apdock.internal'
      });
      const clientDb = clientAuthContext.firestore();

      const snap = await assertSucceeds(getDoc(doc(clientDb, 'users', 'uid_bob_existing')));
      assert.equal(snap.exists(), true);
      assert.equal(snap.data()?.username, 'bob');
    });

    it('handle collision retry works when first candidate is taken', async () => {
      // Seed taken handle 'alex'
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'usernames', 'alex'), {
          uid: 'uid_first_alex',
          createdAt: new Date()
        });
      });

      // Second user automatically allocates candidate 2 ('alexriver')
      const candidate2 = 'alexriver';
      const secondUserContext = testEnv.authenticatedContext('uid_second_alex', {
        email: `${candidate2}@auth.apdock.internal`
      });
      const secondDb = secondUserContext.firestore();

      await assertSucceeds(
        setDoc(doc(secondDb, 'usernames', candidate2), {
          uid: 'uid_second_alex',
          createdAt: serverTimestamp()
        })
      );

      await assertSucceeds(
        setDoc(doc(secondDb, 'users', 'uid_second_alex'), {
          uid: 'uid_second_alex',
          username: candidate2,
          displayName: 'Alex River',
          email: null,
          photoURL: null,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          themePreference: 'system'
        })
      );

      const snap = await getDoc(doc(secondDb, 'usernames', 'alexriver'));
      assert.equal(snap.exists(), true);
      assert.equal(snap.data()?.uid, 'uid_second_alex');
    });
  });
});
