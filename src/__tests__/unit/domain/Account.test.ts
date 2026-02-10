import { Account } from '../../../domain/Account';

describe('Account - Domain Entity Tests', () => {
  const validProps = {
    cognitoSub: 'sub-123',
    email: 'user@example.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should create valid account', () => {
    const result = Account.create(validProps);
    expect(result.isSuccess).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = Account.create({ ...validProps, email: 'invalid' });
    expect(result.isFailure).toBe(true);
  });

  it('should reject empty cognitoSub', () => {
    const result = Account.create({ ...validProps, cognitoSub: '' });
    expect(result.isFailure).toBe(true);
  });

  it('should reject null cognitoSub', () => {
    const result = Account.create({ ...validProps, cognitoSub: null as any });
    expect(result.isFailure).toBe(true);
  });

  it('should reject null email', () => {
    const result = Account.create({ ...validProps, email: null as any });
    expect(result.isFailure).toBe(true);
  });

  it('should reject invalid email formats', () => {
    const invalidEmails = [
      'user@',
      '@example.com',
      'user@example',
      'user example@example.com',
      'user@.com',
      'user@example.',
    ];

    invalidEmails.forEach(email => {
      const result = Account.create({ ...validProps, email });
      expect(result.isFailure).toBe(true);
    });
  });

  it('should accept valid email formats', () => {
    const validEmails = [
      'user@example.com',
      'test.user@example.com',
      'user+tag@example.co.uk',
      'user123@example-domain.com',
    ];

    validEmails.forEach(email => {
      const result = Account.create({ ...validProps, email });
      expect(result.isSuccess).toBe(true);
    });
  });

  it('should reject empty email', () => {
    const result = Account.create({ ...validProps, email: '' });
    expect(result.isFailure).toBe(true);
  });

  it('should reject whitespace-only email', () => {
    const result = Account.create({ ...validProps, email: '   ' });
    expect(result.isFailure).toBe(true);
  });

  it('should reject null role', () => {
    const result = Account.create({ ...validProps, role: null as any });
    expect(result.isFailure).toBe(true);
  });

  it('should reject null status', () => {
    const result = Account.create({ ...validProps, status: null as any });
    expect(result.isFailure).toBe(true);
  });

  it('should accept valid roles: MEMBER, ADMIN, etc', () => {
    ['MEMBER', 'ADMIN', 'MODERATOR'].forEach(role => {
      const result = Account.create({ ...validProps, role });
      expect(result.isSuccess).toBe(true);
    });
  });

  it('should accept valid statuses: ACTIVE, INACTIVE, SUSPENDED', () => {
    ['ACTIVE', 'INACTIVE', 'SUSPENDED'].forEach(status => {
      const result = Account.create({ ...validProps, status });
      expect(result.isSuccess).toBe(true);
    });
  });

  it('should have timestamps set correctly', () => {
    const now = new Date();
    const result = Account.create({
      ...validProps,
      createdAt: now,
      updatedAt: now,
    });

    if (result.isSuccess) {
      const account = result.getValue();
      expect(account.createdAt).toEqual(now);
      expect(account.updatedAt).toEqual(now);
    }
  });

  it('should generate unique ID for each account', () => {
    const result1 = Account.create(validProps);
    const result2 = Account.create({ ...validProps, cognitoSub: 'sub-456' });

    if (result1.isSuccess && result2.isSuccess) {
      expect(result1.getValue().id.toValue()).not.toEqual(result2.getValue().id.toValue());
    }
  });

  it('should have proper getter methods', () => {
    const result = Account.create(validProps);
    if (result.isSuccess) {
      const account = result.getValue();
      expect(account.cognitoSub).toBe('sub-123');
      expect(account.email).toBe('user@example.com');
      expect(account.role).toBe('MEMBER');
      expect(account.status).toBe('ACTIVE');
    }
  });

  it('should allow role modification via setter', () => {
    const result = Account.create(validProps);
    if (result.isSuccess) {
      const account = result.getValue();
      account.role = 'ADMIN';
      expect(account.role).toBe('ADMIN');
    }
  });

  it('should allow status modification via setter', () => {
    const result = Account.create(validProps);
    if (result.isSuccess) {
      const account = result.getValue();
      account.status = 'SUSPENDED';
      expect(account.status).toBe('SUSPENDED');
    }
  });

  it('should allow updatedAt modification via setter', () => {
    const result = Account.create(validProps);
    if (result.isSuccess) {
      const account = result.getValue();
      const newDate = new Date();
      account.updatedAt = newDate;
      expect(account.updatedAt).toEqual(newDate);
    }
  });

  it('should reject whitespace-only cognitoSub', () => {
    const result = Account.create({ ...validProps, cognitoSub: '   ' });
    expect(result.isFailure).toBe(true);
  });
});
