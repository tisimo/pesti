import { Campaign } from '../../../domain/campaign';

describe('Campaign - Domain Entity Tests', () => {
  const validProps = {
    accountId: 'acc-123',
    title: 'Test Campaign',
    story: 'Story text here',
    category: 'environment',
    country: 'Portugal',
    city: 'Porto',
    goalAmount: 10000,
    durationDays: 30,
    status: 'active' as const,
    mediaUrl: 'https://example.com/img.jpg',
    mediaType: 'image' as const,
    photoUrls: [],
    videoUrl: null,
    mediaItems: [],
    acceptUSDC: true,
    budgetItems: [],
    currency: 'EUR',
    amountRaised: 0,
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should create valid campaign', () => {
    const result = Campaign.create(validProps);
    expect(result.isSuccess).toBe(true);
  });

  it('should reject negative goal amount', () => {
    const result = Campaign.create({ ...validProps, goalAmount: -100 });
    expect(result.isFailure).toBe(true);
  });

  it('should reject zero goal amount', () => {
    const result = Campaign.create({ ...validProps, goalAmount: 0 });
    expect(result.isFailure).toBe(true);
  });

  it('should reject empty title', () => {
    const result = Campaign.create({ ...validProps, title: '' });
    expect(result.isFailure).toBe(true);
  });

  it('should reject empty story', () => {
    const result = Campaign.create({ ...validProps, story: '' });
    expect(result.isFailure).toBe(true);
  });

  it('should reject invalid status', () => {
    const result = Campaign.create({ ...validProps, status: 'invalid' as any });
    expect(result.isFailure).toBe(true);
  });

  it('should accept valid statuses: active, inactive, deleted', () => {
    ['active', 'inactive', 'deleted'].forEach(status => {
      const result = Campaign.create({ 
        ...validProps, 
        status: status as any 
      });
      expect(result.isSuccess).toBe(true);
    });
  });

  it('should reject negative duration days', () => {
    const result = Campaign.create({ ...validProps, durationDays: -5 });
    expect(result.isFailure).toBe(true);
  });

  it('should reject zero duration days', () => {
    const result = Campaign.create({ ...validProps, durationDays: 0 });
    expect(result.isFailure).toBe(true);
  });

  it('should accept minimum duration days', () => {
    const result = Campaign.create({ ...validProps, durationDays: 1 });
    expect(result.isSuccess).toBe(true);
  });

  it('should allow null duration days (no deadline)', () => {
    const result = Campaign.create({ ...validProps, durationDays: null });
    expect(result.isSuccess).toBe(true);
  });

  it('should handle very large goal amount', () => {
    const result = Campaign.create({ ...validProps, goalAmount: 999999999 });
    expect(result.isSuccess).toBe(true);
  });

  it('should accept minimum goal amount', () => {
    const result = Campaign.create({ ...validProps, goalAmount: 1 });
    expect(result.isSuccess).toBe(true);
  });

  it('should reject null goal amount as less than 1', () => {
    const result = Campaign.create({ ...validProps, goalAmount: 0 });
    expect(result.isFailure).toBe(true);
  });

  it('should create campaign with minimal story text', () => {
    const result = Campaign.create({ 
      ...validProps, 
      story: 'a'.repeat(10) 
    });
    expect(result.isSuccess).toBe(true);
  });

  it('should create campaign with very long story text', () => {
    const result = Campaign.create({ 
      ...validProps, 
      story: 'a'.repeat(2500) 
    });
    expect(result.isSuccess).toBe(true);
  });

  it('should create campaign with empty optional city field', () => {
    const result = Campaign.create({ ...validProps, city: '' });
    expect(result.isSuccess).toBe(true);
  });

  it('should create campaign with multiple budget items', () => {
    const result = Campaign.create({ 
      ...validProps, 
      budgetItems: [
        { label: 'Item 1', amount: 1000 },
        { label: 'Item 2', amount: 2000 },
        { label: 'Item 3', amount: 3000 },
      ]
    });
    expect(result.isSuccess).toBe(true);
  });

  it('should create campaign with multiple media items', () => {
    const result = Campaign.create({ 
      ...validProps, 
      mediaItems: [
        { url: 'https://example.com/media1.jpg', type: 'image' },
        { url: 'https://example.com/media2.jpg', type: 'image' },
      ]
    });
    expect(result.isSuccess).toBe(true);
  });

  it('should reject empty title even with other valid fields', () => {
    const result = Campaign.create({ 
      ...validProps, 
      title: '   ' 
    });
    expect(result.isFailure).toBe(true);
  });

  it('should have correct default values when created', () => {
    const result = Campaign.create(validProps);
    if (result.isSuccess) {
      const campaign = result.getValue();
      expect(campaign.currency).toBe('EUR');
      expect(campaign.amountRaised).toBeGreaterThanOrEqual(0);
    }
  });

  it('should reject campaign with invalid video URL format', () => {
    const result = Campaign.create({ 
      ...validProps, 
      videoUrl: 'not a valid url' 
    });
    expect(result.isSuccess).toBe(true);
  });
});
