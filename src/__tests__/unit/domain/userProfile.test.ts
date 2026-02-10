import { UserProfile } from '../../../domain/userProfile';

describe('UserProfile - Domain Entity Tests', () => {
  const validProps = {
    accountId: 'acc-123',
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe',
    bio: 'Bio',
    country: 'Portugal',
    city: 'Porto',
    causes: [],
    userType: 'donor' as const,
    avatarUrl: null,
    verificationStatus: 'not_required' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should create valid profile', () => {
    const result = UserProfile.create(validProps);
    expect(result.isSuccess).toBe(true);
  });

  it('should reject empty firstName', () => {
    const result = UserProfile.create({ ...validProps, firstName: '' });
    expect(result.isFailure).toBe(true);
  });

  it('should reject empty username', () => {
    const result = UserProfile.create({ ...validProps, username: '' });
    expect(result.isFailure).toBe(true);
  });

  it('should reject whitespace-only firstName', () => {
    const result = UserProfile.create({ ...validProps, firstName: '   ' });
    expect(result.isFailure).toBe(true);
  });

  it('should reject invalid userType', () => {
    const result = UserProfile.create({ ...validProps, userType: 'invalid' as any });
    expect(result.isFailure).toBe(true);
  });

  it('should reject more than 5 causes', () => {
    const result = UserProfile.create({
      ...validProps,
      causes: ['a', 'b', 'c', 'd', 'e', 'f'],
    });
    expect(result.isFailure).toBe(true);
  });
});
