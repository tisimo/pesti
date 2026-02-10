import { Request, Response } from 'express';
import campaignController from '../../../controllers/campaignController';
import { ICampaignService } from '../../../services/ICampaignService';
import { Result } from '../../../core/logic/Result';
import { CampaignRecordDTO } from '../../../dto/campaignDTO';

jest.mock('../../../services/campaignService');

interface AuthRequest extends Request {
  auth?: { cognitoSub: string };
  accountId?: string;
}

describe('campaignController - Unit Tests', () => {
  let controller: campaignController;
  let mockService: jest.Mocked<ICampaignService>;
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;

  const createMockCampaign = (overrides?: Partial<CampaignRecordDTO>): CampaignRecordDTO => ({
    id: 'camp-123',
    title: 'Test Campaign',
    story: 'Campaign story',
    category: 'Education',
    country: 'PT',
    city: 'Lisbon',
    goalAmount: 5000,
    durationDays: 30,
    status: 'active',
    creatorName: 'John Doe',
    creatorAvatarUrl: 'https://example.com/avatar.jpg',
    creatorType: 'individual',
    currency: 'EUR',
    amountRaised: 0,
    publishedAt: Date.now(),
    mediaItems: [],
    photoUrls: [],
    mediaUrl: '',
    mediaType: 'image',
    acceptUSDC: false,
    budgetItems: [],
    ...overrides,
  });

  beforeEach(() => {
    mockService = {
      createCampaign: jest.fn(),
      getCampaignById: jest.fn(),
      updateCampaign: jest.fn(),
      deleteCampaign: jest.fn(),
      getCampaigns: jest.fn(),
      getCampaignsPage: jest.fn(),
      setCampaignStatus: jest.fn(),
    } as any;

    controller = new campaignController(mockService);
    mockReq = {
      params: {},
      body: {},
      accountId: 'acc-123',
      auth: { cognitoSub: 'sub-123' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => jest.clearAllMocks());

  describe('createCampaign', () => {
    it('should return 400 when required fields missing', async () => {
      mockReq.body = {};
      mockService.createCampaign.mockResolvedValue(
        Result.fail({ code: 'validation', message: 'Missing fields' })
      );
      await controller.createCampaign(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 201 on successful campaign creation', async () => {
      mockReq.body = {
        title: 'Test Campaign',
        story: 'Campaign story',
        goalAmount: 5000,
        durationDays: 30,
      };

      const mockDTO = createMockCampaign();
      mockService.createCampaign.mockResolvedValue(Result.ok(mockDTO));
      await controller.createCampaign(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockDTO);
    });

    it('should return 401 when not authenticated', async () => {
      mockReq.accountId = undefined;
      mockReq.auth = undefined;
      mockReq.body = { title: 'Test', story: 'Story', goalAmount: 5000, durationDays: 30 };
      await controller.createCampaign(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when user not verified', async () => {
      mockReq.body = {
        title: 'Test Campaign',
        story: 'Campaign story',
        goalAmount: 5000,
        durationDays: 30,
      };

      mockService.createCampaign.mockResolvedValue(
        Result.fail({ code: 'validation', message: 'Verification required' })
      );
      await controller.createCampaign(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getCampaignById', () => {
    it('should return 400 when campaignId missing', async () => {
      mockReq.params = {};
      await controller.getCampaignById(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 with campaign data', async () => {
      mockReq.params = { id: 'camp-123' };

      const mockDTO = createMockCampaign();
      mockService.getCampaignById.mockResolvedValue(Result.ok(mockDTO));
      await controller.getCampaignById(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockDTO);
    });

    it('should return 404 when campaign not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockService.getCampaignById.mockResolvedValue(Result.ok(null));
      
      await controller.getCampaignById(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateCampaign', () => {
    it('should return 400 when campaignId missing', async () => {
      mockReq.params = {};
      mockReq.body = { title: 'Updated' };
      await controller.updateCampaign(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 when user not owner', async () => {
      mockReq.params = { id: 'camp-123' };
      mockReq.body = { title: 'Updated' };
      mockReq.accountId = 'different-account';
      mockReq.auth = { cognitoSub: 'different-sub' };
      
      mockService.updateCampaign.mockResolvedValue(
        Result.fail({ code: 'forbidden', message: 'You do not have permission to edit this campaign.' })
      );
      await controller.updateCampaign(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 200 on successful update', async () => {
      mockReq.params = { id: 'camp-123' };
      mockReq.body = { title: 'Updated Campaign' };

      const mockDTO = createMockCampaign({ title: 'Updated Campaign' });
      mockService.updateCampaign.mockResolvedValue(Result.ok(mockDTO));
      await controller.updateCampaign(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockDTO);
    });
  });

  describe('deleteCampaign', () => {
    it('should return 400 when campaignId missing', async () => {
      mockReq.params = {};
      await controller.deleteCampaign(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 on successful deletion', async () => {
      mockReq.params = { id: 'camp-123' };
      mockService.deleteCampaign.mockResolvedValue(Result.ok(undefined));
      
      await controller.deleteCampaign(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });

    it('should return 404 when campaign not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockService.deleteCampaign.mockResolvedValue(
        Result.fail({ code: 'not_found', message: 'Campaign not found' })
      );
      
      await controller.deleteCampaign(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getCampaigns', () => {
    it('should return 200 with campaign list', async () => {
      const mockCampaigns: CampaignRecordDTO[] = [
        createMockCampaign({ id: 'camp-1', title: 'Campaign 1' }),
        createMockCampaign({ id: 'camp-2', title: 'Campaign 2' }),
      ];

      mockService.getCampaigns.mockResolvedValue(Result.ok(mockCampaigns));
      await controller.getCampaigns(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockCampaigns);
    });

    it('should return 200 with empty list when no campaigns', async () => {
      mockService.getCampaigns.mockResolvedValue(Result.ok([]));
      await controller.getCampaigns(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([]);
    });

    it('should include inactive when includeInactive is true in query', async () => {
      mockReq.query = { includeInactive: 'true', accountId: 'acc-999' } as any;

      mockService.getCampaigns.mockResolvedValue(Result.ok([]));
      await controller.getCampaigns(mockReq as Request, mockRes as Response);

      expect(mockService.getCampaigns).toHaveBeenCalled();
      const options = mockService.getCampaigns.mock.calls[0][0];
      expect(options.includeInactive).toBe(true);
    });
  });
});
