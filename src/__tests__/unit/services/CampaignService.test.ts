import CampaignService from '../../../services/campaignService';
import { ICampaignRepo } from '../../../repos/ICampaignRepo';
import { IUserProfileRepo } from '../../../repos/IUserProfileRepo';
import { Campaign } from '../../../domain/campaign';
import { UserProfile } from '../../../domain/userProfile';
import { Result } from '../../../core/logic/Result';
import Logger from '../../../loaders/logger';

jest.mock('../../../repos/campaignRepo');
jest.mock('../../../repos/userProfileRepo');

describe('CampaignService - Unit Tests', () => {
  let service: CampaignService;
  let mockCampaignRepo: jest.Mocked<ICampaignRepo>;
  let mockUserRepo: jest.Mocked<IUserProfileRepo>;
  let mockLogger: any;

  beforeEach(() => {
    mockCampaignRepo = { save: jest.fn(), findById: jest.fn() } as any;
    mockUserRepo = { findByAccountId: jest.fn() } as any;
    mockLogger = { error: jest.fn(), info: jest.fn() };
    service = new CampaignService(mockCampaignRepo, mockUserRepo, mockLogger);
  });

  afterEach(() => jest.clearAllMocks());

  const validPayload = {
    title: 'Test Campaign',
    story: 'This is a test campaign story with more details',
    category: 'environment',
    country: 'Portugal',
    city: 'Porto',
    goalAmount: 10000,
    durationDays: 30,
    mediaUrl: 'https://example.com/img.jpg',
    mediaType: 'image' as const,
    photoUrls: ['https://example.com/photo1.jpg'],
    acceptUSDC: true,
    budgetItems: [],
  };

  describe('createCampaign', () => {
    it('should create campaign with verified creator', async () => {
      const profile = UserProfile.create({
        accountId: 'acc-123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'john',
        bio: '',
        country: '',
        city: '',
        causes: [],
        userType: 'creator',
        avatarUrl: null,
        verificationStatus: 'verified',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).getValue();

      mockUserRepo.findByAccountId.mockResolvedValue(profile);
      mockCampaignRepo.save.mockResolvedValue(undefined);

      const result = await service.createCampaign('acc-123', validPayload);

      expect(result.isSuccess).toBe(true);
    });

    it('should reject when profile not found', async () => {
      mockUserRepo.findByAccountId.mockResolvedValue(null);
      const result = await service.createCampaign('acc-123', validPayload);

      expect(result.isFailure).toBe(true);
      expect((result.error as any).message).toContain('Profile not found');
    });

    it('should reject donor profile', async () => {
      const profile = UserProfile.create({
        accountId: 'acc-123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'john',
        bio: '',
        country: '',
        city: '',
        causes: [],
        userType: 'donor',
        avatarUrl: null,
        verificationStatus: 'not_required',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).getValue();

      mockUserRepo.findByAccountId.mockResolvedValue(profile);
      const result = await service.createCampaign('acc-123', validPayload);

      expect(result.isFailure).toBe(true);
    });

    it('should reject unverified creator', async () => {
      const profile = UserProfile.create({
        accountId: 'acc-123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'john',
        bio: '',
        country: '',
        city: '',
        causes: [],
        userType: 'creator',
        avatarUrl: null,
        verificationStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).getValue();

      mockUserRepo.findByAccountId.mockResolvedValue(profile);
      const result = await service.createCampaign('acc-123', validPayload);

      expect(result.isFailure).toBe(true);
      expect((result.error as any).message).toContain('Verification required');
    });

    it('should reject payload with no photos', async () => {
      const profile = UserProfile.create({
        accountId: 'acc-123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'john',
        bio: '',
        country: '',
        city: '',
        causes: [],
        userType: 'creator',
        avatarUrl: null,
        verificationStatus: 'verified',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).getValue();

      mockUserRepo.findByAccountId.mockResolvedValue(profile);

      const payload = {
        ...validPayload,
        photoUrls: [],
        mediaItems: [{ url: 'https://example.com/video.mp4', type: 'video' as const }],
      };

      const result = await service.createCampaign('acc-123', payload);

      expect(result.isFailure).toBe(true);
      expect((result.error as any).message).toContain('photo');
    });

    it('should reject more than 10 photos', async () => {
      const profile = UserProfile.create({
        accountId: 'acc-123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'john',
        bio: '',
        country: '',
        city: '',
        causes: [],
        userType: 'creator',
        avatarUrl: null,
        verificationStatus: 'verified',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).getValue();

      mockUserRepo.findByAccountId.mockResolvedValue(profile);

      const payload = {
        ...validPayload,
        photoUrls: Array.from({ length: 11 }, (_, i) => `https://example.com/${i}.jpg`),
      };

      const result = await service.createCampaign('acc-123', payload);

      expect(result.isFailure).toBe(true);
      expect((result.error as any).message).toContain('10 photos');
    });

    it('should ensure cover image is first media item', async () => {
      const profile = UserProfile.create({
        accountId: 'acc-123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'john',
        bio: '',
        country: '',
        city: '',
        causes: [],
        userType: 'creator',
        avatarUrl: null,
        verificationStatus: 'verified',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).getValue();

      mockUserRepo.findByAccountId.mockResolvedValue(profile);
      mockCampaignRepo.save.mockResolvedValue(undefined);

      const payload = {
        ...validPayload,
        photoUrls: [],
        mediaItems: [
          { url: 'https://example.com/video.mp4', type: 'video' as const },
          { url: 'https://example.com/cover.jpg', type: 'image' as const },
        ],
      };

      const result = await service.createCampaign('acc-123', payload);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().mediaItems[0].type).toBe('image');
    });
  });
});
