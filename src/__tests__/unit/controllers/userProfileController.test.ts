import { Request, Response } from 'express';
import userProfileController from '../../../controllers/userProfileController';
import { IUserProfileService } from '../../../services/IUserProfileService';
import { Result } from '../../../core/logic/Result';
import { UserProfileDTO, ProfileCompletionDataDTO, ProfileCompletionSaveResultDTO, ProfileCompletionVerificationResultDTO } from '../../../dto/profileDTO';

jest.mock('../../../services/userProfileService');

interface AuthRequest extends Request {
  auth?: { cognitoSub: string };
  accountId?: string;
}

describe('userProfileController - Unit Tests', () => {
  let controller: userProfileController;
  let mockService: jest.Mocked<IUserProfileService>;
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockService = {
      getProfileCompletionData: jest.fn(),
      saveProfileCompletion: jest.fn(),
      getProfileByUsername: jest.fn(),
      getUserProfile: jest.fn(),
      verifyProfile: jest.fn(),
    } as any;

    controller = new userProfileController(mockService);
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

  describe('getProfileCompletionData', () => {
    it('should return 200 with form data', async () => {
      const mockData: ProfileCompletionDataDTO = {
        text: {
          headingTitle: 'Complete Your Profile',
          headingSubtitle: 'Help us know you better',
          avatar: { placeholder: '', hint: '' },
          name: { firstLabel: 'First', firstPlaceholder: '', lastLabel: 'Last', lastPlaceholder: '' },
          username: { label: 'Username', placeholder: '', helper: '', prefix: '@' },
          bio: { label: 'Bio', placeholder: '', maxLength: 500, helperSuffix: '' },
          location: { countryLabel: 'Country', countryPlaceholder: '', cityLabel: 'City', cityPlaceholder: '' },
          causes: { label: 'Causes', helper: '', maxSelections: 5, errorMax: '' },
          userType: { label: 'Type', options: [], verificationNote: '' },
          verification: { title: '', description: '', pendingTitle: '', pendingDescription: '', successTitle: '', successDescription: '' },
          actions: { backLabel: '', skipLabel: '', continueLabel: '', verifyLabel: '', finishLabel: '' },
        },
        causes: ['Education', 'Health'],
        countries: [],
        defaults: { userType: 'donor' },
      };

      mockService.getProfileCompletionData.mockResolvedValue(Result.ok(mockData));
      await controller.getProfileCompletionData(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockData);
    });

    it('should return 500 on service error', async () => {
      mockService.getProfileCompletionData.mockResolvedValue(Result.fail('Service error'));
      await controller.getProfileCompletionData(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('saveProfileCompletion', () => {
    it('should return 400 when required fields missing', async () => {
      mockReq.body = {};
      mockService.saveProfileCompletion.mockResolvedValue(Result.fail('Missing fields'));
      await controller.saveProfileCompletion(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 on successful profile creation', async () => {
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        bio: 'My bio',
        country: 'Portugal',
        city: 'Lisbon',
        causes: ['Education'],
        userType: 'donor',
      };

      const mockDTO: ProfileCompletionSaveResultDTO = {
        message: 'Profile saved successfully',
        verificationRequired: false,
      };

      mockService.saveProfileCompletion.mockResolvedValue(Result.ok(mockDTO));
      await controller.saveProfileCompletion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockDTO);
    });

    it('should return 401 when not authenticated', async () => {
      mockReq.accountId = undefined;
      mockReq.auth = undefined;
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
      };
      await controller.saveProfileCompletion(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when username already taken', async () => {
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'taken',
      };

      mockService.saveProfileCompletion.mockResolvedValue(Result.fail('Username already taken'));
      await controller.saveProfileCompletion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when more than 5 causes selected', async () => {
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        causes: ['Education', 'Health', 'Environment', 'Poverty', 'Children', 'Extra'],
      };

      mockService.saveProfileCompletion.mockResolvedValue(Result.fail('Maximum 5 causes allowed'));
      await controller.saveProfileCompletion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getProfileByUsername', () => {
    it('should return 400 when username missing', async () => {
      mockReq.params = {};
      await controller.getProfileByUsername(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 with profile data', async () => {
      mockReq.params = { username: 'johndoe' };

      const mockDTO: UserProfileDTO = {
        id: 'prof-123',
        accountId: 'acc-123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        bio: 'My bio',
        country: 'PT',
        city: 'Lisbon',
        causes: ['Education'],
        userType: 'donor',
        verificationStatus: 'verified',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.getProfileByUsername.mockResolvedValue(Result.ok(mockDTO));
      await controller.getProfileByUsername(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockDTO);
    });

    it('should accept username from array param', async () => {
      mockReq.params = { username: ['johndoe'] as any };

      const mockDTO: UserProfileDTO = {
        id: 'prof-123',
        accountId: 'acc-123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        bio: 'My bio',
        country: 'PT',
        city: 'Lisbon',
        causes: ['Education'],
        userType: 'donor',
        verificationStatus: 'verified',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.getProfileByUsername.mockResolvedValue(Result.ok(mockDTO));
      await controller.getProfileByUsername(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockDTO);
    });

    it('should return 404 when profile not found', async () => {
      mockReq.params = { username: 'nonexistent' };
      mockService.getProfileByUsername.mockResolvedValue(Result.ok(null));
      
      await controller.getProfileByUsername(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getUserProfile', () => {
    it('should return 401 when not authenticated', async () => {
      mockReq.accountId = undefined;
      mockReq.auth = undefined;
      await controller.getUserProfile(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 200 with user profile data', async () => {
      const mockDTO: UserProfileDTO = {
        id: 'prof-123',
        accountId: 'acc-123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        bio: 'My bio',
        country: 'PT',
        city: 'Lisbon',
        causes: ['Education'],
        userType: 'donor',
        verificationStatus: 'verified',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockService.getUserProfile.mockResolvedValue(Result.ok(mockDTO));
      await controller.getUserProfile(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockDTO);
    });

    it('should return 404 when profile not found', async () => {
      mockService.getUserProfile.mockResolvedValue(Result.ok(null));
      
      await controller.getUserProfile(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on service error', async () => {
      mockService.getUserProfile.mockResolvedValue(Result.fail('Database error'));
      await controller.getUserProfile(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('verifyProfile', () => {
    it('should return 401 when not authenticated', async () => {
      mockReq.accountId = undefined;
      mockReq.auth = undefined;
      await controller.verifyProfile(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 200 on successful verification', async () => {
      const mockResult: ProfileCompletionVerificationResultDTO = {
        message: 'Profile verified successfully',
        verified: true,
        status: 'verified',
      };
      mockService.verifyProfile.mockResolvedValue(Result.ok(mockResult));
      await controller.verifyProfile(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when verification fails', async () => {
      mockService.verifyProfile.mockResolvedValue(Result.fail('Profile incomplete'));
      await controller.verifyProfile(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
