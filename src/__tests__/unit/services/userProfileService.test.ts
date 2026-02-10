import UserProfileService from '../../../services/userProfileService';
import { IUserProfileRepo } from '../../../repos/IUserProfileRepo';
import { ICampaignRepo } from '../../../repos/ICampaignRepo';
import { UserProfile } from '../../../domain/userProfile';
import { Result } from '../../../core/logic/Result';
import Logger from '../../../loaders/logger';

jest.mock('../../../repos/userProfileRepo');
jest.mock('../../../repos/campaignRepo');

describe('UserProfileService - Unit Tests', () => {
  let service: UserProfileService;
  let mockUserRepo: jest.Mocked<IUserProfileRepo>;
  let mockCampaignRepo: jest.Mocked<ICampaignRepo>;
  let mockLogger: any;

  beforeEach(() => {
    mockUserRepo = {
      findByAccountId: jest.fn(),
      findByUsername: jest.fn(),
      usernameExists: jest.fn(),
      save: jest.fn(),
    } as any;
    mockCampaignRepo = {} as any;
    mockLogger = { error: jest.fn(), info: jest.fn(), warn: jest.fn() };
    service = new UserProfileService(mockUserRepo, mockCampaignRepo, mockLogger);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getProfileCompletionData', () => {
    it('should return form data', async () => {
      const result = await service.getProfileCompletionData();
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toHaveProperty('text');
      expect(result.getValue()).toHaveProperty('causes');
    });
  });

  describe('saveProfileCompletion', () => {
    const validPayload = {
      firstName: 'John',
      lastName: 'Doe',
      username: '@johndoe',
      bio: 'Bio',
      country: 'Portugal',
      city: 'Porto',
      causes: ['Education'],
      userType: 'donor' as const,
      avatarUrl: null,
    };

    it('should create new profile', async () => {
      mockUserRepo.findByAccountId.mockResolvedValue(null);
      mockUserRepo.usernameExists.mockResolvedValue(false);
      mockUserRepo.save.mockResolvedValue(undefined);

      const result = await service.saveProfileCompletion('acc-123', validPayload);

      expect(result.isSuccess).toBe(true);
      expect(mockUserRepo.save).toHaveBeenCalled();
    });

    it('should normalize username', async () => {
      mockUserRepo.findByAccountId.mockResolvedValue(null);
      mockUserRepo.usernameExists.mockResolvedValue(false);
      mockUserRepo.save.mockResolvedValue(undefined);

      await service.saveProfileCompletion('acc-123', {
        ...validPayload,
        username: '@JOHNDOE',
      });

      const saved = mockUserRepo.save.mock.calls[0][0];
      expect((saved as any).props.username).toBe('johndoe');
    });

    it('should reject duplicate username', async () => {
      mockUserRepo.findByAccountId.mockResolvedValue(null);
      mockUserRepo.usernameExists.mockResolvedValue(true);

      const result = await service.saveProfileCompletion('acc-123', validPayload);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('already taken');
    });

    it('should reject when firstName is empty', async () => {
      mockUserRepo.findByAccountId.mockResolvedValue(null);
      mockUserRepo.usernameExists.mockResolvedValue(false);

      const result = await service.saveProfileCompletion('acc-123', {
        ...validPayload,
        firstName: '',
      });

      expect(result.isFailure).toBe(true);
    });

    it('should reject when username is empty', async () => {
      mockUserRepo.findByAccountId.mockResolvedValue(null);
      mockUserRepo.usernameExists.mockResolvedValue(false);

      const result = await service.saveProfileCompletion('acc-123', {
        ...validPayload,
        username: '',
      });

      expect(result.isFailure).toBe(true);
    });

    it('should reject when more than 5 causes are selected', async () => {
      mockUserRepo.findByAccountId.mockResolvedValue(null);
      mockUserRepo.usernameExists.mockResolvedValue(false);

      const result = await service.saveProfileCompletion('acc-123', {
        ...validPayload,
        causes: ['Education', 'Health', 'Environment', 'Poverty', 'Children', 'Extra'],
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('5 causes');
    });

    it('should reject invalid userType', async () => {
      mockUserRepo.findByAccountId.mockResolvedValue(null);
      mockUserRepo.usernameExists.mockResolvedValue(false);

      const result = await service.saveProfileCompletion('acc-123', {
        ...validPayload,
        userType: 'invalid' as any,
      });

      expect(result.isFailure).toBe(true);
    });

    it('should update existing profile', async () => {
      const existingProfile = UserProfile.create({
        accountId: 'acc-123',
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        bio: 'Old bio',
        country: 'USA',
        city: 'NYC',
        causes: [],
        userType: 'donor',
        avatarUrl: null,
        verificationStatus: 'not_required',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).getValue();

      mockUserRepo.findByAccountId.mockResolvedValue(existingProfile);
      mockUserRepo.usernameExists.mockResolvedValue(false);
      mockUserRepo.save.mockResolvedValue(undefined);

      const result = await service.saveProfileCompletion('acc-123', validPayload);

      expect(result.isSuccess).toBe(true);
      expect(mockUserRepo.save).toHaveBeenCalled();
    });

    it('should allow empty optional fields', async () => {
      mockUserRepo.findByAccountId.mockResolvedValue(null);
      mockUserRepo.usernameExists.mockResolvedValue(false);
      mockUserRepo.save.mockResolvedValue(undefined);

      const result = await service.saveProfileCompletion('acc-123', {
        ...validPayload,
        bio: '',
        country: '',
        city: '',
        avatarUrl: null,
      });

      expect(result.isSuccess).toBe(true);
    });

    it('should handle database save error gracefully', async () => {
      mockUserRepo.findByAccountId.mockResolvedValue(null);
      mockUserRepo.usernameExists.mockResolvedValue(false);
      mockUserRepo.save.mockRejectedValue(new Error('Database error'));

      const result = await service.saveProfileCompletion('acc-123', validPayload);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBeTruthy();
    });
  });
});
