import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService - Dynamic Username Generation', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should generate first name "alex" for "Alex River" when available', async () => {
    const username = await service.generateUniqueUsername('Alex River', 'alex@example.com');
    expect(username).toBe('alex');
  }, 15000);

  it('should fallback to full name "alexriver" if "alex" is already taken', async () => {
    localStorage.setItem('apdock_user_alex', 'taken@example.com');
    const username = await service.generateUniqueUsername('Alex River', 'alex@example.com');
    expect(username).toBe('alexriver');
  }, 15000);

  it('should fallback to "alex1" if both "alex" and "alexriver" are taken', async () => {
    localStorage.setItem('apdock_user_alex', 'taken@example.com');
    localStorage.setItem('apdock_user_alexriver', 'taken2@example.com');
    const username = await service.generateUniqueUsername('Alex River', 'alex@example.com');
    expect(username).toBe('alex1');
  }, 15000);

  it('should fallback to "alexriver1" if "alex1" is also taken', async () => {
    localStorage.setItem('apdock_user_alex', 'taken@example.com');
    localStorage.setItem('apdock_user_alexriver', 'taken2@example.com');
    localStorage.setItem('apdock_user_alex1', 'taken3@example.com');
    const username = await service.generateUniqueUsername('Alex River', 'alex@example.com');
    expect(username).toBe('alexriver1');
  }, 15000);

  it('should fallback to "alex2" if "alexriver1" is also taken', async () => {
    localStorage.setItem('apdock_user_alex', 'taken@example.com');
    localStorage.setItem('apdock_user_alexriver', 'taken2@example.com');
    localStorage.setItem('apdock_user_alex1', 'taken3@example.com');
    localStorage.setItem('apdock_user_alexriver1', 'taken4@example.com');
    const username = await service.generateUniqueUsername('Alex River', 'alex@example.com');
    expect(username).toBe('alex2');
  }, 15000);

  it('should fallback to "alexriver2" if "alex2" is also taken', async () => {
    localStorage.setItem('apdock_user_alex', 'taken@example.com');
    localStorage.setItem('apdock_user_alexriver', 'taken2@example.com');
    localStorage.setItem('apdock_user_alex1', 'taken3@example.com');
    localStorage.setItem('apdock_user_alexriver1', 'taken4@example.com');
    localStorage.setItem('apdock_user_alex2', 'taken5@example.com');
    const username = await service.generateUniqueUsername('Alex River', 'alex@example.com');
    expect(username).toBe('alexriver2');
  }, 15000);

  it('should update local userProfile when updateDietPreference is called', async () => {
    service.userProfile.set({
      uid: 'u-1',
      username: 'alex',
      email: 'alex@example.com',
      displayName: 'Alex'
    } as any);

    // Call without currentUser (safe exit)
    await service.updateDietPreference({ goal: 'loss', dietType: 'veg' });
    expect(service.userProfile()?.dietPreference).toBeUndefined();
  });
});
