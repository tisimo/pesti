import { Request, Response, NextFunction } from 'express';
import RecoveryCodesController from '../../../controllers/RecoveryCodesController';
import IRecoveryCodesService from '../../../services/IServices/IRecoveryCodesService';
import { Result } from '../../../core/logic/Result';
import { RecoveryCodeDTO } from '../../../dto/RecoveryCodesDTO';

jest.mock('../../../services/RecoveryCodesService');

// Extend Request type to include auth property
interface AuthRequest extends Request {
  auth?: {
    cognitoSub: string;
  };
}

describe('RecoveryCodesController - Unit Tests', () => {
  let controller: RecoveryCodesController;
  let mockService: jest.Mocked<IRecoveryCodesService>;
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockService = {
      generateRecoveryCodes: jest.fn(),
      deleteRecoveryCode: jest.fn(),
    } as any;

    controller = new RecoveryCodesController(mockService);
    mockReq = { params: {}, body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => jest.clearAllMocks());

  describe('generateRecoveryCodes', () => {
    it('should return 401 when not authenticated', async () => {
      mockReq.auth = undefined;
      await controller.generateRecoveryCodes(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should return 201 with codes when successful', async () => {
      mockReq.auth = { cognitoSub: 'sub-123' };
      const mockCodes: RecoveryCodeDTO[] = [
        { cognitoSub: 'sub-123', recoveryCode: 'code1' },
        { cognitoSub: 'sub-123', recoveryCode: 'code2' },
      ];
      mockService.generateRecoveryCodes.mockResolvedValue(Result.ok(mockCodes));

      await controller.generateRecoveryCodes(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockCodes);
    });

    it('should return 500 when service fails', async () => {
      mockReq.auth = { cognitoSub: 'sub-123' };
      mockService.generateRecoveryCodes.mockResolvedValue(Result.fail('Generation failed'));

      await controller.generateRecoveryCodes(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteRecoveryCode', () => {
    it('should return 401 when not authenticated', async () => {
      mockReq.auth = undefined;
      mockReq.params = { cognitoSub: 'sub-123', recoveryCode: 'code' };
      
      await controller.deleteRecoveryCode(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when params missing', async () => {
      mockReq.auth = { cognitoSub: 'sub-123' };
      mockReq.params = {};
      
      await controller.deleteRecoveryCode(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 when auth mismatch', async () => {
      mockReq.auth = { cognitoSub: 'sub-123' };
      mockReq.params = { cognitoSub: 'different', recoveryCode: 'code' };
      
      await controller.deleteRecoveryCode(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 200 when code deleted successfully', async () => {
      mockReq.auth = { cognitoSub: 'sub-123' };
      mockReq.params = { cognitoSub: 'sub-123', recoveryCode: 'code123' };
      
      const mockDTO: RecoveryCodeDTO = {
        cognitoSub: 'sub-123',
        recoveryCode: 'code123',
      };
      
      mockService.deleteRecoveryCode.mockResolvedValue(Result.ok(mockDTO));
      
      await controller.deleteRecoveryCode(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockDTO);
    });
  });
});
