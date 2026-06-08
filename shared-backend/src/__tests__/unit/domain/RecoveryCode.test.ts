import { RecoveryCode } from '../../../domain/RecoveryCode';

describe('RecoveryCode - Domain Entity Tests', () => {
  const validProps = {
    cognitoSub: 'sub-123',
    recoveryCode: 'hashed-code',
    createdAt: new Date(),
  };

  it('should create valid recovery code', () => {
    const result = RecoveryCode.create(validProps);
    expect(result.isSuccess).toBe(true);
  });

  it('should reject empty code', () => {
    const result = RecoveryCode.create({ ...validProps, recoveryCode: '' });
    expect(result.isFailure).toBe(true);
  });

  it('should reject null cognitoSub', () => {
    const result = RecoveryCode.create({ ...validProps, cognitoSub: null as any });
    expect(result.isFailure).toBe(true);
  });

  it('should reject null recoveryCode', () => {
    const result = RecoveryCode.create({ ...validProps, recoveryCode: null as any });
    expect(result.isFailure).toBe(true);
  });

  it('should reject whitespace-only code', () => {
    const result = RecoveryCode.create({ ...validProps, recoveryCode: '   ' });
    expect(result.isFailure).toBe(true);
  });

  it('should accept valid hashed recovery code', () => {
    const result = RecoveryCode.create({ 
      ...validProps, 
      recoveryCode: 'bcrypt-hash-string-123456789' 
    });
    expect(result.isSuccess).toBe(true);
  });

  it('should accept long recovery code', () => {
    const result = RecoveryCode.create({ 
      ...validProps, 
      recoveryCode: 'a'.repeat(256)
    });
    expect(result.isSuccess).toBe(true);
  });

  it('should have generated ID from UniqueEntityID', () => {
    const result = RecoveryCode.create(validProps);
    if (result.isSuccess) {
      const code = result.getValue();
      expect(code.id).toBeDefined();
      expect(code.id.toValue()).toBeTruthy();
    }
  });

  it('should reject empty cognitoSub', () => {
    const result = RecoveryCode.create({ ...validProps, cognitoSub: '' });
    expect(result.isFailure).toBe(true);
  });

  it('should reject whitespace-only cognitoSub', () => {
    const result = RecoveryCode.create({ ...validProps, cognitoSub: '   ' });
    expect(result.isFailure).toBe(true);
  });

  it('should have createdAt timestamp', () => {
    const now = new Date();
    const result = RecoveryCode.create({ ...validProps, createdAt: now });
    if (result.isSuccess) {
      const code = result.getValue();
      expect(code.createdAt).toEqual(now);
    }
  });

  it('should handle multiple recovery codes with different IDs', () => {
    const result1 = RecoveryCode.create(validProps);
    const result2 = RecoveryCode.create({ ...validProps, cognitoSub: 'sub-456' });
    
    if (result1.isSuccess && result2.isSuccess) {
      expect(result1.getValue().id.toValue()).not.toEqual(result2.getValue().id.toValue());
    }
  });
});
