export interface HomeNavLink {
  label: string;
  href: string;
}

export interface HomeNavAction {
  label: string;
  to: string;
}

export interface HomeNavData {
  links: HomeNavLink[];
  signIn: HomeNavAction;
  cta: HomeNavAction;
}

export interface HomeHero {
  title: string;
  subtitle: string;
}

export type HomeSearchTabId = "causes" | "people" | "keywords";

export interface HomeSearchTab {
  id: HomeSearchTabId;
  label: string;
  iconClass: string;
  placeholder: string;
}

export interface HomeSearchFilters {
  categories: string[];
  locations: string[];
  sorts: string[];
  profileTypes: string[];
}

export interface HomeSearchData {
  title: string;
  tabs: HomeSearchTab[];
  filters: HomeSearchFilters;
  keywordsHelper: string;
}

export interface HomeSearchState {
  activeTab: HomeSearchTabId;
  causesQuery: string;
  peopleQuery: string;
  keywordsQuery: string;
  category: string;
  location: string;
  sort: string;
  profileType: string;
}

export interface HomeCampaign {
  id: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  title: string;
  category: string;
  creator: {
    username: string;
    name: string;
    avatarUrl: string;
  };
  creatorType?: "verified" | "ngo" | "individual";
  location: {
    city: string;
    country: string;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
  region?: string;
  amountRaised: number;
  goalAmount: number;
  currency: string;
  progress: number;
  deadlineDaysRemaining?: number | null;
  engagementScore?: number;
  publishedAt?: number;
  featureTag?: string;
  status?: "active" | "inactive" | "finished" | "deleted";
}

export interface HomeFeaturedData {
  title: string;
  ctaLabel: string;
  ctaTo: string;
  categories: string[];
  campaigns: HomeCampaign[];
}

export interface HomeHowItWorksStep {
  title: string;
  description: string;
}

export interface HomeHowItWorksData {
  title: string;
  subtitle: string;
  steps: HomeHowItWorksStep[];
}

export interface HomeImpactProfile {
  handle: string;
  bio: string;
  tags: string[];
  campaignsCreated: number;
  totalRaisedLabel: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
}

export interface HomeImpactData {
  title: string;
  description: string;
  bullets: string[];
  profileExample: HomeImpactProfile;
}

export interface HomeFooterLink {
  label: string;
  href: string;
}

export interface HomeFooterData {
  text: string;
  links: HomeFooterLink[];
}

export interface HomePageData {
  nav: HomeNavData;
  hero: HomeHero;
  search: HomeSearchData;
  featured: HomeFeaturedData;
  howItWorks: HomeHowItWorksData;
  impact: HomeImpactData;
  footer: HomeFooterData;
}
