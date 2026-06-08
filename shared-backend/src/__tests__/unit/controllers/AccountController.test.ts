import { Request, Response, NextFunction } from 'express';
import AccountController from '../../../controllers/AccountController';
import IAccountService from '../../../services/IServices/IAccountService';
import { Result } from '../../../core/logic/Result';
import { AccountDTO } from '../../../dto/AccountDTO';

jest.mock('../../../services/AccountService');

interface AuthRequest extends Request {
  auth?: { cognitoSub: string };
  accountId?: string;
}

describe('AccountController - Unit Tests', () => {
  let controller: AccountController;
  let mockService: jest.Mocked<IAccountService>;
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockService = {
      getAccountByCognitoSub: jest.fn(),
      getAccountByAccountId: jest.fn(),
      createAccount: jest.fn(),
      deleteAccountByCognitoSub: jest.fn(),
    } as any;

    controller = new AccountController(mockService);
    mockReq = { params: {}, body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => jest.clearAllMocks());

  describe('getAccountByCognitoSub', () => {
    it('should return 400 when cognitoSub missing', async () => {
      mockReq.params = {};
      await controller.getAccountByCognitoSub(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 when auth mismatch', async () => {
      mockReq.params = { cognitoSub: 'sub-123' };
      mockReq.auth = { cognitoSub: 'different' };
      await controller.getAccountByCognitoSub(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 200 with account data', async () => {
      mockReq.params = { cognitoSub: 'sub-123' };
      mockReq.auth = { cognitoSub: 'sub-123' };

      const mockDTO: AccountDTO = {
        accountId: 'acc-123',
        cognitoSub: 'sub-123',
        email: 'user@example.com',
        role: 'MEMBER',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.getAccountByCognitoSub.mockResolvedValue(Result.ok(mockDTO));
      await controller.getAccountByCognitoSub(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockDTO);
    });
  });

  describe('createAccount', () => {
    it('should return 400 when fields missing', async () => {
      mockReq.body = {};
      await controller.createAccount(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 201 on success', async () => {
      mockReq.body = { cognitoSub: 'sub-123', email: 'user@example.com' };
      const mockDTO: AccountDTO = {
        accountId: 'acc-123',
        cognitoSub: 'sub-123',
        email: 'user@example.com',
        role: 'MEMBER',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.createAccount.mockResolvedValue(Result.ok(mockDTO));
      await controller.createAccount(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 409 when account exists', async () => {
      mockReq.body = { cognitoSub: 'sub-123', email: 'user@example.com' };
      mockService.createAccount.mockResolvedValue(Result.fail('Account Already Exists!'));

      await controller.createAccount(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(409);
    });
  });
});
