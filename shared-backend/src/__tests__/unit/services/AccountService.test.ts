import AccountService from '../../../services/AccountService';
import { IAccountRepo } from '../../../repos/Account/IAccountRepo';
import { Account } from '../../../domain/Account';
import { Result } from '../../../core/logic/Result';

jest.mock('../../../repos/Account/AccountRepo');

describe('AccountService - Unit Tests', () => {
  let service: AccountService;
  let mockRepo: jest.Mocked<IAccountRepo>;

  beforeEach(() => {
    mockRepo = {
      getAccountByCognitoSub: jest.fn(),
      getAccountByAccountId: jest.fn(),
      getAccountByEmail: jest.fn(),
      createAccount: jest.fn(),
      deleteAccountByCognitoSub: jest.fn(),
    } as any;
    service = new AccountService(mockRepo);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createAccount', () => {
    it('should create account with valid data', async () => {
      mockRepo.getAccountByCognitoSub.mockResolvedValue(null);
      mockRepo.getAccountByEmail.mockResolvedValue(null);
      mockRepo.createAccount.mockImplementation((account) => Promise.resolve(account));

      const result = await service.createAccount('sub-123', 'user@example.com', 'MEMBER');

      expect(result.isSuccess).toBe(true);
      expect(mockRepo.createAccount).toHaveBeenCalled();
    });

    it('should reject duplicate cognitoSub', async () => {
      const existing = Account.create({
        cognitoSub: 'sub-123',
        email: 'different@example.com',
        role: 'MEMBER',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).getValue();

      mockRepo.getAccountByCognitoSub.mockResolvedValue(existing);

      const result = await service.createAccount('sub-123', 'user@example.com', 'MEMBER');

      expect(result.isFailure).toBe(true);
      expect(mockRepo.getAccountByCognitoSub).toHaveBeenCalledWith('sub-123');
    });

    it('should reject duplicate email', async () => {
      const existing = Account.create({
        cognitoSub: 'different',
        email: 'user@example.com',
        role: 'MEMBER',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).getValue();

      mockRepo.getAccountByCognitoSub.mockResolvedValue(null);
      mockRepo.getAccountByEmail.mockResolvedValue(existing);

      const result = await service.createAccount('sub-123', 'user@example.com', 'MEMBER');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Already Exists');
      expect(mockRepo.getAccountByEmail).toHaveBeenCalledWith('user@example.com');
    });
  });

  describe('getAccountByCognitoSub', () => {
    it('should return account when exists', async () => {
      const mock = Account.create({
        cognitoSub: 'sub-123',
        email: 'user@example.com',
        role: 'MEMBER',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).getValue();

      mockRepo.getAccountByCognitoSub.mockResolvedValue(mock);

      const result = await service.getAccountByCognitoSub('sub-123');

      expect(result.isSuccess).toBe(true);
    });

    it('should return failure when not found', async () => {
      mockRepo.getAccountByCognitoSub.mockResolvedValue(null);
      const result = await service.getAccountByCognitoSub('sub-123');
      expect(result.isFailure).toBe(true);
    });
  });

  describe('getAccountByAccountId', () => {
    it('should return account when exists', async () => {
      const mock = Account.create({
        cognitoSub: 'sub-123',
        email: 'user@example.com',
        role: 'MEMBER',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).getValue();

      mockRepo.getAccountByAccountId.mockResolvedValue(mock);

      const result = await service.getAccountByAccountId('acc-123');

      expect(result.isSuccess).toBe(true);
    });

    it('should return failure when not found', async () => {
      mockRepo.getAccountByAccountId.mockResolvedValue(null);

      const result = await service.getAccountByAccountId('acc-123');

      expect(result.isFailure).toBe(true);
    });
  });

  describe('deleteAccountByCognitoSub', () => {
    it('should delete account', async () => {
      const mock = Account.create({
        cognitoSub: 'sub-123',
        email: 'user@example.com',
        role: 'MEMBER',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).getValue();

      mockRepo.getAccountByCognitoSub.mockResolvedValue(mock);
      mockRepo.deleteAccountByCognitoSub.mockResolvedValue(mock);

      const result = await service.deleteAccountByCognitoSub('sub-123');

      expect(result.isSuccess).toBe(true);
    });
  });
});
