import { TestBed } from '@angular/core/testing';
import {
  AuthService,
  validatePinStrength,
  generateCandidateHandles,
  handleToSyntheticEmail,
  AUTH_SYNTHETIC_DOMAIN,
  RESERVED_HANDLES
} from './auth.service';

describe('AuthService - Phase 1 Option B Hardened Unit Tests', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('PIN Validation Rules (Exactly 6 digits & anti-trivial)', () => {
    it('accepts random 6-digit non-trivial PINs', () => {
      expect(validatePinStrength('849201').valid).toBe(true);
      expect(validatePinStrength('395820').valid).toBe(true);
      expect(validatePinStrength('719382').valid).toBe(true);
    });

    it('rejects PINs that are not exactly 6 digits', () => {
      expect(validatePinStrength('1234').valid).toBe(false);
      expect(validatePinStrength('12345').valid).toBe(false);
      expect(validatePinStrength('1234567').valid).toBe(false);
      expect(validatePinStrength('').valid).toBe(false);
      expect(validatePinStrength('abcdef').valid).toBe(false);
    });

    it('rejects repeating identical digits', () => {
      expect(validatePinStrength('000000').valid).toBe(false);
      expect(validatePinStrength('111111').valid).toBe(false);
      expect(validatePinStrength('999999').valid).toBe(false);
    });

    it('rejects ascending sequential series', () => {
      expect(validatePinStrength('012345').valid).toBe(false);
      expect(validatePinStrength('123456').valid).toBe(false);
      expect(validatePinStrength('234567').valid).toBe(false);
      expect(validatePinStrength('456789').valid).toBe(false);
    });

    it('rejects descending sequential series', () => {
      expect(validatePinStrength('987654').valid).toBe(false);
      expect(validatePinStrength('876543').valid).toBe(false);
      expect(validatePinStrength('654321').valid).toBe(false);
      expect(validatePinStrength('543210').valid).toBe(false);
    });

    it('rejects common blacklisted predictable patterns', () => {
      expect(validatePinStrength('112233').valid).toBe(false);
      expect(validatePinStrength('121212').valid).toBe(false);
      expect(validatePinStrength('123123').valid).toBe(false);
    });
  });

  describe('Handle Candidate Generation', () => {
    it('generates first name, full name, and random 3-digit suffix candidates', () => {
      const candidates = generateCandidateHandles('Alex River');
      expect(candidates.length).toBeLessThanOrEqual(8);
      expect(candidates.length).toBeGreaterThanOrEqual(3);
      expect(candidates[0]).toBe('alex');
      expect(candidates[1]).toBe('alexriver');
      // Subsequent candidates must have digits
      expect(/\d{3}$/.test(candidates[2])).toBe(true);
    });

    it('all generated handles match ^[a-z0-9]{3,20}$', () => {
      const candidates = generateCandidateHandles('John Michael Doe');
      candidates.forEach((handle) => {
        expect(handle).toMatch(/^[a-z0-9]{3,20}$/);
      });
    });

    it('falls back to "user" + random suffix when name is non-Latin, emoji, or empty', () => {
      const candidatesNonLatin = generateCandidateHandles('राहुल');
      expect(candidatesNonLatin.length).toBeGreaterThanOrEqual(1);
      candidatesNonLatin.forEach((handle) => {
        expect(handle).toMatch(/^user\d+/);
      });

      const candidatesEmpty = generateCandidateHandles('   ');
      candidatesEmpty.forEach((handle) => {
        expect(handle).toMatch(/^user\d+/);
      });
    });

    it('filters out reserved handles from initial candidates', () => {
      const candidates = generateCandidateHandles('Admin');
      // "admin" must be excluded from candidates
      expect(candidates.includes('admin')).toBe(false);
      candidates.forEach((handle) => {
        expect(RESERVED_HANDLES.has(handle)).toBe(false);
      });
    });
  });

  describe('Synthetic Domain Email Mapping', () => {
    it('maps handle to synthetic domain @auth.apdock.internal', () => {
      expect(handleToSyntheticEmail('alex')).toBe('alex@auth.apdock.internal');
      expect(handleToSyntheticEmail('@alexriver')).toBe('alexriver@auth.apdock.internal');
      expect(handleToSyntheticEmail('Dock123')).toBe('dock123@auth.apdock.internal');
    });

    it('AUTH_SYNTHETIC_DOMAIN matches auth.apdock.internal', () => {
      expect(AUTH_SYNTHETIC_DOMAIN).toBe('auth.apdock.internal');
    });
  });

  describe('Local Storage Tenant Isolation & Purge', () => {
    it('purges all apdock_{uid}_* keys and apdock_profile_{uid} on deletion', () => {
      localStorage.setItem('apdock_u1_diet_preference', '{"goal":"loss"}');
      localStorage.setItem('apdock_u1_custom_recipes', '[]');
      localStorage.setItem('apdock_profile_u1', '{"username":"u1"}');
      localStorage.setItem('apdock_u2_custom_recipes', '["u2-recipe"]'); // other user

      service.purgeUserLocalStorage('u1');

      expect(localStorage.getItem('apdock_u1_diet_preference')).toBeNull();
      expect(localStorage.getItem('apdock_u1_custom_recipes')).toBeNull();
      expect(localStorage.getItem('apdock_profile_u1')).toBeNull();
      // Other user data must remain untouched
      expect(localStorage.getItem('apdock_u2_custom_recipes')).toBe('["u2-recipe"]');
    });
  });

  describe('Diet Preference Updates', () => {
    it('safe exit when currentUser is null', async () => {
      service.userProfile.set({
        uid: 'u-1',
        username: 'alex',
        email: null,
        displayName: 'Alex'
      } as any);

      await service.updateDietPreference({ goal: 'loss', dietType: 'veg' });
      expect(service.userProfile()?.dietPreference).toBeUndefined();
    });
  });
});
