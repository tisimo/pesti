import RecoveryCodesService from '../../../services/RecoveryCodesService';
import { IRecoveryCodesRepo } from '../../../repos/RecoveryCodes/IRecoveryCodesRepo';
import { RecoveryCode } from '../../../domain/RecoveryCode';
import { Result } from '../../../core/logic/Result';

jest.mock('../../../repos/RecoveryCodes/RecoveryCodesRepo');

describe('RecoveryCodesService - Unit Tests', () => {
  let service: RecoveryCodesService;
  let mockRepo: jest.Mocked<IRecoveryCodesRepo>;

  beforeEach(() => {
    mockRepo = {
      createRecoveryCodes: jest.fn(),
      getRecoveryCodeByCognitoSub: jest.fn(),
      deleteRecoveryCode: jest.fn(),
    } as any;
    service = new RecoveryCodesService(mockRepo);
  });

  afterEach(() => jest.clearAllMocks());

  describe('generateRecoveryCodes', () => {
    it('should generate 10 recovery codes', async () => {
      mockRepo.createRecoveryCodes.mockResolvedValue(undefined);
      const result = await service.generateRecoveryCodes('sub-123');
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toHaveLength(10);
    });

    it('should generate unique codes', async () => {
      mockRepo.createRecoveryCodes.mockResolvedValue(undefined);
      const result = await service.generateRecoveryCodes('sub-123');
      
      const codes = result.getValue().map(c => c.recoveryCode);
      const unique = new Set(codes);
      expect(unique.size).toBe(10);
    });

    it('should store hashed codes', async () => {
      mockRepo.createRecoveryCodes.mockResolvedValue(undefined);
      await service.generateRecoveryCodes('sub-123');
      
      const savedCodes = mockRepo.createRecoveryCodes.mock.calls[0][0];
      expect(savedCodes).toHaveLength(10);
    });

    it('should generate 12-char alphanumeric codes', async () => {
      mockRepo.createRecoveryCodes.mockResolvedValue(undefined);
      const result = await service.generateRecoveryCodes('sub-123');

      const codes = result.getValue().map(c => c.recoveryCode);
      codes.forEach(code => {
        expect(code).toMatch(/^[A-Za-z0-9]{12}$/);
      });
    });

    it('should store 64-char hex hashes', async () => {
      mockRepo.createRecoveryCodes.mockResolvedValue(undefined);
      await service.generateRecoveryCodes('sub-123');

      const savedCodes = mockRepo.createRecoveryCodes.mock.calls[0][0];
      savedCodes.forEach((code: RecoveryCode) => {
        expect(code.recoveryCode).toMatch(/^[a-f0-9]{64}$/);
      });
    });
  });

  describe('deleteRecoveryCode', () => {
    it('should delete code successfully', async () => {
      const mock = RecoveryCode.create({
        cognitoSub: 'sub-123',
        recoveryCode: 'hashed',
        createdAt: new Date(),
      }).getValue();

      mockRepo.deleteRecoveryCode.mockResolvedValue(mock);
      const result = await service.deleteRecoveryCode('sub-123', 'code');

      expect(result.isSuccess).toBe(true);
    });

    it('should fail when code not found', async () => {
      mockRepo.deleteRecoveryCode.mockResolvedValue(null);
      const result = await service.deleteRecoveryCode('sub-123', 'code');

      expect(result.isFailure).toBe(true);
    });
  });
});
