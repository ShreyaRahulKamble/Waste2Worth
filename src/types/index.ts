export type WasteCategory =
  | 'Plastic'
  | 'Paper'
  | 'Cardboard'
  | 'Glass'
  | 'Metal'
  | 'Wood'
  | 'Textile'
  | 'Electronics'
  | 'Furniture'
  | 'Organic'
  | 'Other';

export type IntendedAction =
  | 'Reuse'
  | 'Sell'
  | 'Donate'
  | 'Exchange'
  | 'Upcycle'
  | 'Recycle';

export type ItemCondition = 'New / Unused' | 'Good' | 'Fair' | 'Needs Repair' | 'Scrap / Raw Material';

export type PostStatus = 'available' | 'active' | 'reserved' | 'completed' | 'archived' | 'pending_ai' | 'analyzing' | 'analyzed';

export type BestActionType = 'reuse' | 'sell' | 'donate' | 'exchange' | 'upcycle' | 'recycle';

export type AIAnalysisStatus = 'pending_ai' | 'analyzing' | 'analyzed' | 'active' | 'failed';

export interface DIYProject {
  title: string;
  difficulty: string;
  time: string;
  additionalCost: number;
  materials: string[];
  steps: string[];
}

export interface AISafetyReport {
  level: string;
  warnings: string[];
  precautions: string[];
}

export interface StructuredAIAnalysis {
  objectName: string;
  material: string;
  category: string;
  condition: string;
  confidence: number;
  reusable: boolean;
  bestAction: BestActionType;
  estimatedValue: {
    min: number;
    max: number;
    currency: 'INR';
  };
  reasoning: string;
  reuseIdeas: string[];
  diyIdeas: DIYProject[];
  safety: AISafetyReport;
  environmentalAdvice: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  college: string;
  createdAt: string;
  updatedAt: string;
  bio?: string;
  avatarUrl?: string;
}

export interface ResourceSavings {
  waterLiters?: number;
  energyKwh?: number;
  treesSaved?: number;
  primaryHighlight?: string;
}

export interface EnvironmentalImpact {
  category: string;
  material: string;
  estimatedWeightKg: number;
  co2eAvoidedKg: number;
  wasteDivertedKg: number;
  resourceSavings?: ResourceSavings;
  actionType: string;
  actionMultiplier: number;
  calculationMethod: string;
  assumption: string;
  calculatedAt: string;
}

export interface WastePost {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerCollege?: string;
  title: string;
  description: string;
  category: WasteCategory;
  condition: ItemCondition;
  quantity: string;
  intendedAction: IntendedAction;
  actionType?: string;
  material?: string;
  estimatedPrice: number; // 0 for free/donate/exchange
  location: string;
  imageUrl?: string;
  imagePath?: string;
  status: PostStatus;
  aiAnalyzed?: boolean;
  aiAnalyzedAt?: string;
  aiAnalysis?: StructuredAIAnalysis;
  aiStatus?: AIAnalysisStatus;
  environmentalImpact?: EnvironmentalImpact;
  createdAt: string;
  updatedAt: string;
}

export type ActivityType =
  | 'post_created'
  | 'listing_created'
  | 'purchase_request_created'
  | 'donation_request_created'
  | 'exchange_request_created'
  | 'interest_request_created'
  | 'request_created'
  | 'request_accepted'
  | 'request_rejected'
  | 'listing_completed'
  | 'item_donated'
  | 'item_sold'
  | 'item_exchanged'
  | 'item_upcycled'
  | string;

export interface UserActivity {
  id: string;
  userId: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  targetPostId?: string;
}

export interface UserStats {
  itemsListed: number;
  itemsDonated: number;
  itemsSold: number;
  itemsExchanged: number;
  ecoPoints: number;
  activeListings: number;
  requestsSent: number;
  requestsReceived: number;
  completedCircularActions: number;
  totalWasteDivertedKg?: number;
  totalCo2eAvoidedKg?: number;
  ecoScoreSummary?: any; // UserEcoScoreSummary
}

export interface CompletedActionDoc {
  id: string; // 'completion_' + postId
  postId: string;
  requestId?: string;
  listingTitle: string;
  category: string;
  material: string;
  actionType: string;
  ownerId: string;
  requesterId?: string;
  confirmedBy: string;
  environmentalImpact: EnvironmentalImpact;
  ecoPointsEarned: number;
  status: 'completed';
  completedAt: string;
  createdAt: string;
}

export type ListingRequestType =
  | 'Purchase Request'
  | 'Donation Request'
  | 'Exchange Request'
  | 'Interest'
  | 'Recycling Interest';

export type ListingRequestStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export interface ListingRequest {
  id: string;
  listingId: string;
  listingOwnerId: string;
  requesterId: string;
  requestType: ListingRequestType | string;
  status: ListingRequestStatus;
  createdAt: string;
  updatedAt: string;
  offerDescription?: string;
  // Denormalized fields for optimal UI display
  listingTitle?: string;
  listingImageUrl?: string;
  listingCategory?: string;
  listingMaterial?: string;
  listingActionType?: string;
  listingPrice?: number;
  listingLocation?: string;
  requesterName?: string;
  requesterEmail?: string;
  ownerName?: string;
}

export interface CampusHub {
  id: string;
  name: string;
  city: string;
  activeMembersCount: number;
  totalItemsDiverted: number;
  collectionPoints: string[];
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  college?: string;
  totalEcoPoints: number;
  completedActionsCount: number;
  wasteDivertedKg: number;
  co2eAvoidedKg: number;
  rank: number;
}

export interface CommunityFeedItem {
  id: string;
  type: 'completed_action' | 'new_listing';
  title: string;
  category: string;
  material?: string;
  actionType: string;
  actorName: string;
  actorCollege?: string;
  timestamp: string;
  wasteDivertedKg?: number;
  co2eAvoidedKg?: number;
  ecoPointsEarned?: number;
  postId?: string;
  imageUrl?: string;
}
