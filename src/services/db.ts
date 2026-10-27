import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase.ts';
import type {
  UserProfile,
  WastePost,
  UserActivity,
  ActivityType,
  UserStats,
  StructuredAIAnalysis,
  AIAnalysisStatus,
  PostStatus,
  ListingRequest,
  ListingRequestType,
  ListingRequestStatus,
  EnvironmentalImpact,
  CompletedActionDoc,
  LeaderboardEntry,
  CommunityFeedItem,
} from '../types/index.ts';
import {
  calculateEnvironmentalImpact,
  getOrComputePostImpact,
  hasEnvironmentalImpact,
} from './environmentalImpact.ts';
import {
  computeUserEcoScore,
  calculateActionEcoPoints,
} from './ecoScore.ts';

/**
 * Strips all undefined fields recursively from an object.
 * Firestore strictly rejects documents containing undefined values.
 */
export function sanitizeFirestoreData<T extends Record<string, any>>(data: T): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      sanitized[key] = sanitizeFirestoreData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Creates or updates user profile in Firestore
 */
export async function createUserProfile(
  uid: string,
  data: { name: string; email: string; college: string }
): Promise<UserProfile> {
  const userRef = doc(db, 'users', uid);
  const now = new Date().toISOString();
  
  const userProfile: UserProfile = {
    uid,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    college: data.college.trim(),
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(userRef, sanitizeFirestoreData(userProfile));
  return userProfile;
}

/**
 * Retrieves a user profile by UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.error('Error fetching user profile:', err);
    throw err;
  }
}

/**
 * Updates profile fields for the authenticated user
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, sanitizeFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString(),
  }));
}

/**
 * Creates a new waste post listing in Firestore
 */
export async function createWastePost(
  postData: Omit<WastePost, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
    status?: PostStatus;
    aiAnalyzed?: boolean;
    aiAnalyzedAt?: string;
    aiAnalysis?: StructuredAIAnalysis;
    aiStatus?: AIAnalysisStatus;
    environmentalImpact?: EnvironmentalImpact;
  }
): Promise<WastePost> {
  const postsCollection = collection(db, 'wastePosts');
  const newDocRef = doc(postsCollection);
  const now = new Date().toISOString();

  // Compute transparent environmental impact estimate
  const environmentalImpact =
    postData.environmentalImpact ||
    calculateEnvironmentalImpact({
      category: postData.category,
      material: postData.material || postData.aiAnalysis?.material,
      quantity: postData.quantity,
      actionType: postData.actionType || postData.intendedAction || postData.aiAnalysis?.bestAction,
      title: postData.title,
      aiObjectName: postData.aiAnalysis?.objectName,
    });

  const rawPost: Record<string, any> = {
    ...postData,
    id: newDocRef.id,
    status: postData.status || 'available',
    aiAnalyzed: postData.aiAnalyzed ?? false,
    aiStatus: postData.aiStatus || (postData.aiAnalyzed ? 'analyzed' : 'pending_ai'),
    environmentalImpact,
    createdAt: now,
    updatedAt: now,
  };

  // Only attach optional fields if defined
  if (postData.aiAnalyzedAt !== undefined) {
    rawPost.aiAnalyzedAt = postData.aiAnalyzedAt;
  }
  if (postData.aiAnalysis !== undefined) {
    rawPost.aiAnalysis = postData.aiAnalysis;
  }

  const cleanPost = sanitizeFirestoreData(rawPost) as WastePost;
  await setDoc(newDocRef, cleanPost);

  // Append user activity audit record if created as an active listing
  const normStatus = getNormalizedStatus(cleanPost.status);
  if (normStatus === 'active') {
    await logUserActivity({
      userId: postData.ownerId,
      type: 'listing_created',
      title: 'Listing Created',
      description: `Listed "${postData.title}" (${postData.category}) for ${postData.intendedAction || 'reuse'}.`,
      targetPostId: newDocRef.id,
    });
  }

  return cleanPost;
}

/**
 * Retrieves a single waste post by its Firestore document ID
 */
export async function getWastePostById(postId: string): Promise<WastePost | null> {
  try {
    const postRef = doc(db, 'wastePosts', postId);
    const snap = await getDoc(postRef);
    if (snap.exists()) {
      return { ...snap.data(), id: snap.id } as WastePost;
    }
    return null;
  } catch (err) {
    console.error('Error fetching waste post by ID:', err);
    throw err;
  }
}

/**
 * Updates an existing waste post with real Gemini AI analysis results
 * and syncs updated environmental impact based on the refined material/category.
 */
export async function saveAIAnalysisToPost(
  postId: string,
  userId: string,
  analysis: StructuredAIAnalysis
): Promise<void> {
  const postRef = doc(db, 'wastePosts', postId);
  const existingPost = await getWastePostById(postId);

  const updatedImpact = calculateEnvironmentalImpact({
    category: analysis.category || existingPost?.category,
    material: analysis.material || existingPost?.material,
    quantity: existingPost?.quantity,
    actionType: existingPost?.intendedAction || analysis.bestAction,
    title: existingPost?.title,
    aiObjectName: analysis.objectName,
  });

  const now = new Date().toISOString();
  await updateDoc(postRef, sanitizeFirestoreData({
    aiAnalyzed: true,
    aiAnalyzedAt: now,
    aiAnalysis: analysis,
    aiStatus: 'analyzed',
    material: analysis.material || existingPost?.material,
    environmentalImpact: updatedImpact,
    updatedAt: now,
  }));
}

/**
 * Safely extracts the action type for a post, prioritizing actionType if present,
 * then intendedAction, then aiAnalysis.bestAction, preserving older records safely.
 */
export function getPostActionType(post: Partial<WastePost>): string {
  if (post.actionType && typeof post.actionType === 'string' && post.actionType.trim()) {
    const at = post.actionType.trim();
    return at.charAt(0).toUpperCase() + at.slice(1).toLowerCase();
  }
  if (post.intendedAction && typeof post.intendedAction === 'string' && post.intendedAction.trim()) {
    const ia = post.intendedAction.trim();
    return ia.charAt(0).toUpperCase() + ia.slice(1).toLowerCase();
  }
  if (post.aiAnalysis?.bestAction && typeof post.aiAnalysis.bestAction === 'string') {
    const ba = post.aiAnalysis.bestAction.trim();
    return ba.charAt(0).toUpperCase() + ba.slice(1).toLowerCase();
  }
  return 'Reuse';
}

/**
 * Safely extracts the primary material for a post from material or AI intelligence
 */
export function getPostMaterial(post: Partial<WastePost>): string {
  if (post.material && typeof post.material === 'string' && post.material.trim()) {
    return post.material.trim();
  }
  if (post.aiAnalysis?.material && typeof post.aiAnalysis.material === 'string' && post.aiAnalysis.material.trim()) {
    return post.aiAnalysis.material.trim();
  }
  return post.category || 'General Scrap';
}

/**
 * Normalizes post status to standard display states: 'active', 'reserved', or 'completed'
 */
export function getNormalizedStatus(status?: string): 'active' | 'reserved' | 'completed' {
  if (!status || status === 'available' || status === 'active') return 'active';
  if (status === 'reserved') return 'reserved';
  if (status === 'completed') return 'completed';
  return 'active';
}

/**
 * Maps marketplace listing actionType to standardized ListingRequestType:
 * - Sell -> Purchase Request
 * - Donate -> Donation Request
 * - Exchange -> Exchange Request
 * - Reuse -> Interest
 * - Upcycle -> Interest
 * - Recycle -> Recycling Interest
 */
export function getRequestTypeFromAction(actionType?: string): ListingRequestType {
  const norm = (actionType || '').trim().toLowerCase();
  if (norm === 'sell') return 'Purchase Request';
  if (norm === 'donate') return 'Donation Request';
  if (norm === 'exchange') return 'Exchange Request';
  if (norm === 'reuse' || norm === 'upcycle') return 'Interest';
  if (norm === 'recycle') return 'Recycling Interest';
  return 'Interest';
}

/**
 * Returns user-facing action button text on the listing detail page:
 * - Sell: "Request to Buy"
 * - Donate: "Request Donation"
 * - Exchange: "Request Exchange"
 * - Reuse / Upcycle: "I'm Interested"
 * - Recycle: "I'm Interested"
 */
export function getRequestButtonLabel(actionType?: string): string {
  const norm = (actionType || '').trim().toLowerCase();
  if (norm === 'sell') return 'Request to Buy';
  if (norm === 'donate') return 'Request Donation';
  if (norm === 'exchange') return 'Request Exchange';
  if (norm === 'reuse' || norm === 'upcycle') return "I'm Interested";
  if (norm === 'recycle') return "I'm Interested";
  return "I'm Interested";
}

/**
 * Retrieves waste posts with optional filtering for category, action, condition, location, and status.
 * By default, only active listings normally appear in the available marketplace.
 */
export async function getWastePosts(filters?: {
  category?: string;
  action?: string;
  condition?: string;
  location?: string;
  status?: 'active' | 'reserved' | 'completed' | 'all';
}): Promise<WastePost[]> {
  try {
    const postsCollection = collection(db, 'wastePosts');
    // Query published items
    const q = query(postsCollection, limit(100));
    const snapshot = await getDocs(q);

    let posts: WastePost[] = [];
    snapshot.forEach((d) => {
      posts.push({ ...d.data(), id: d.id } as WastePost);
    });

    // Exclude incomplete drafts that are still analyzing or pending_ai
    posts = posts.filter(
      (p) => p.status !== 'analyzing' && p.status !== 'pending_ai' && p.status !== 'archived'
    );

    // Filter by display status:
    // Only active listings should normally appear in the available marketplace.
    const targetStatus = filters?.status || 'active';
    if (targetStatus === 'active') {
      posts = posts.filter((p) => {
        const norm = getNormalizedStatus(p.status);
        return norm === 'active';
      });
    } else if (targetStatus === 'reserved') {
      posts = posts.filter((p) => getNormalizedStatus(p.status) === 'reserved');
    } else if (targetStatus === 'completed') {
      posts = posts.filter((p) => getNormalizedStatus(p.status) === 'completed');
    }
    // If targetStatus === 'all', all valid published statuses (active, reserved, completed) are retained

    // Client-side in-memory filter to prevent complex compound index requirements on Firestore
    if (filters) {
      // Category filter
      if (filters.category && filters.category !== 'All') {
        posts = posts.filter((p) => p.category?.toLowerCase() === filters.category?.toLowerCase());
      }
      // Action Type filter: supports All, Sell, Donate, Exchange, Reuse, Upcycle, Recycle
      if (filters.action && filters.action !== 'All') {
        const targetAction = filters.action.toLowerCase();
        posts = posts.filter((p) => {
          const act = getPostActionType(p).toLowerCase();
          return act === targetAction;
        });
      }
      // Condition filter
      if (filters.condition && filters.condition !== 'All') {
        posts = posts.filter((p) => p.condition === filters.condition);
      }
      // Location filter
      if (filters.location && filters.location.trim()) {
        const queryLoc = filters.location.toLowerCase().trim();
        posts = posts.filter((p) => p.location && p.location.toLowerCase().includes(queryLoc));
      }
    }

    // Sort by createdAt desc
    return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Error fetching waste posts:', err);
    throw err;
  }
}

/**
 * Retrieves waste posts created by a specific user
 */
export async function getUserWastePosts(userId: string): Promise<WastePost[]> {
  try {
    const postsCollection = collection(db, 'wastePosts');
    const q = query(postsCollection, where('ownerId', '==', userId));
    const snapshot = await getDocs(q);

    const posts: WastePost[] = [];
    snapshot.forEach((d) => {
      posts.push({ ...d.data(), id: d.id } as WastePost);
    });

    return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Error fetching user posts:', err);
    throw err;
  }
}

/**
 * Updates post status or details, keeping environmental impact in sync
 */
export async function updateWastePost(
  postId: string,
  userId: string,
  updates: Partial<WastePost>
): Promise<void> {
  const postRef = doc(db, 'wastePosts', postId);

  let finalUpdates: Partial<WastePost> = { ...updates };

  // If environmental impact is not explicitly passed, check if attributes affecting it changed
  if (!finalUpdates.environmentalImpact) {
    if (
      updates.category !== undefined ||
      updates.material !== undefined ||
      updates.quantity !== undefined ||
      updates.intendedAction !== undefined ||
      updates.actionType !== undefined ||
      updates.aiAnalysis !== undefined
    ) {
      try {
        const existingPost = await getWastePostById(postId);
        if (existingPost) {
          finalUpdates.environmentalImpact = calculateEnvironmentalImpact({
            category: updates.category || existingPost.category,
            material:
              updates.material ||
              existingPost.material ||
              updates.aiAnalysis?.material ||
              existingPost.aiAnalysis?.material,
            quantity: updates.quantity || existingPost.quantity,
            actionType:
              updates.intendedAction ||
              updates.actionType ||
              existingPost.intendedAction ||
              existingPost.actionType,
            title: updates.title || existingPost.title,
            aiObjectName: updates.aiAnalysis?.objectName || existingPost.aiAnalysis?.objectName,
          });
        }
      } catch (err) {
        console.warn('Could not recompute environmental impact on update:', err);
      }
    }
  }

  await updateDoc(postRef, sanitizeFirestoreData({
    ...finalUpdates,
    updatedAt: new Date().toISOString(),
  }));
}

/**
 * Ensures an environmentalImpact object is attached to a waste post.
 * If missing, computes it in-memory. If currentUserId matches the owner,
 * persists it to Firestore so refresh keeps it without repeating writes.
 */
export async function ensurePostEnvironmentalImpact(
  post: WastePost,
  currentUserId?: string
): Promise<EnvironmentalImpact> {
  if (post.environmentalImpact && typeof post.environmentalImpact.co2eAvoidedKg === 'number') {
    return post.environmentalImpact;
  }

  const computed = calculateEnvironmentalImpact({
    category: post.category,
    material: getPostMaterial(post),
    quantity: post.quantity,
    actionType: getPostActionType(post),
    title: post.title,
    aiObjectName: post.aiAnalysis?.objectName,
  });

  // If user is owner, asynchronously persist to Firestore
  if (currentUserId && currentUserId === post.ownerId && post.id) {
    try {
      const postRef = doc(db, 'wastePosts', post.id);
      await updateDoc(postRef, sanitizeFirestoreData({
        environmentalImpact: computed,
        updatedAt: new Date().toISOString(),
      }));
      post.environmentalImpact = computed;
    } catch (err) {
      console.warn('Could not lazily persist environmentalImpact:', err);
    }
  }

  return computed;
}

/**
 * Deletes a waste post
 */
export async function deleteWastePost(postId: string): Promise<void> {
  const postRef = doc(db, 'wastePosts', postId);
  await deleteDoc(postRef);
}

/**
 * Logs a persistent activity record for the user
 */
export async function logUserActivity(activity: {
  userId: string;
  type: UserActivity['type'];
  title: string;
  description: string;
  targetPostId?: string;
}): Promise<void> {
  try {
    const activitiesCollection = collection(db, 'activities');
    const newDocRef = doc(activitiesCollection);
    const activityDoc: UserActivity = {
      id: newDocRef.id,
      userId: activity.userId,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      timestamp: new Date().toISOString(),
    };
    if (activity.targetPostId !== undefined) {
      activityDoc.targetPostId = activity.targetPostId;
    }
    await setDoc(newDocRef, sanitizeFirestoreData(activityDoc));
  } catch (err) {
    console.error('Error logging user activity:', err);
  }
}

/**
 * Retrieves the user's activities from Firestore
 */
export async function getUserActivities(userId: string): Promise<UserActivity[]> {
  try {
    const activitiesCollection = collection(db, 'activities');
    const q = query(activitiesCollection, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const activities: UserActivity[] = [];
    snapshot.forEach((d) => {
      activities.push({ ...d.data(), id: d.id } as UserActivity);
    });

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    console.error('Error fetching user activities:', err);
    throw err;
  }
}

/**
 * Computes live, real stats from user waste posts, marketplace requests, and verified
 * completed circular actions (Milestone 4.2 EcoScore Engine).
 *
 * Rules:
 * - EcoPoints are awarded strictly upon verified circular action completion
 * - No points awarded for merely uploading photos, running AI, or creating listings
 * - Empty accounts show 0 values and no fake estimations
 */
export async function computeUserStats(userId: string): Promise<UserStats> {
  const [posts, sentRequests, receivedRequests, ecoScoreSummary] = await Promise.all([
    getUserWastePosts(userId),
    getMySentRequests(userId),
    getRequestsReceived(userId),
    computeUserEcoScore(userId),
  ]);

  let itemsListed = posts.length;
  let itemsDonated = 0;
  let itemsSold = 0;
  let itemsExchanged = 0;
  let activeListings = 0;

  posts.forEach((post) => {
    const norm = getNormalizedStatus(post.status);
    if (norm === 'active') {
      activeListings++;
    } else if (norm === 'completed') {
      const action = (post.intendedAction || post.actionType || '').toLowerCase();
      if (action.includes('donat')) itemsDonated++;
      else if (action.includes('sell') || action.includes('sale')) itemsSold++;
      else if (action.includes('exchang') || action.includes('swap')) itemsExchanged++;
    }
  });

  const requestsSent = sentRequests.length;
  const requestsReceived = receivedRequests.length;

  return {
    itemsListed,
    itemsDonated,
    itemsSold,
    itemsExchanged,
    ecoPoints: ecoScoreSummary.totalEcoPoints,
    activeListings,
    requestsSent,
    requestsReceived,
    completedCircularActions: ecoScoreSummary.completedActionsCount,
    totalWasteDivertedKg: ecoScoreSummary.estimatedWasteDivertedKg,
    totalCo2eAvoidedKg: ecoScoreSummary.estimatedCo2eAvoidedKg,
    ecoScoreSummary,
  };
}

/**
 * Checks if the current user already has an active request ('pending' or 'accepted')
 * for the specified listing.
 */
export async function getExistingActiveRequest(
  listingId: string,
  requesterId: string
): Promise<ListingRequest | null> {
  if (!listingId || !requesterId) return null;
  try {
    const requestsRef = collection(db, 'listingRequests');
    const q = query(
      requestsRef,
      where('listingId', '==', listingId),
      where('requesterId', '==', requesterId)
    );
    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
      const data = { ...docSnap.data(), id: docSnap.id } as ListingRequest;
      if (data.status === 'pending' || data.status === 'accepted') {
        return data;
      }
    }
    return null;
  } catch (err) {
    console.error('Error checking existing request:', err);
    return null;
  }
}

/**
 * Creates a real Firestore request document in listingRequests
 */
export async function createListingRequest(params: {
  listingId: string;
  listingOwnerId: string;
  requesterId: string;
  requestType: ListingRequestType | string;
  offerDescription?: string;
  // Denormalized fields to provide instant, rich display
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
}): Promise<ListingRequest> {
  const { listingId, listingOwnerId, requesterId, requestType, offerDescription } = params;

  // 1. Validation: Prevent unauthenticated users
  if (!requesterId) {
    throw new Error('Authentication required: You must be logged in to submit a request.');
  }

  // 2. Validation: Prevent users requesting their own listing
  if (requesterId === listingOwnerId) {
    throw new Error('Action blocked: You cannot submit a request for your own listing.');
  }

  // 3. Validation: Prevent requests for unavailable or completed listings
  const currentPost = await getWastePostById(listingId);
  if (!currentPost) {
    throw new Error('Listing not found: The requested item does not exist.');
  }
  const normStatus = getNormalizedStatus(currentPost.status);
  if (normStatus === 'completed' || normStatus === 'reserved') {
    throw new Error(
      `Listing unavailable: This item is currently marked as "${normStatus}". New requests are not accepted.`
    );
  }

  // 4. Validation: Prevent duplicate active requests for the same listing
  const existingActive = await getExistingActiveRequest(listingId, requesterId);
  if (existingActive) {
    throw new Error(
      `Duplicate request: You already have an active "${existingActive.requestType}" (status: ${existingActive.status}) for this item.`
    );
  }

  // 5. Build request document
  const requestsCollection = collection(db, 'listingRequests');
  const newDocRef = doc(requestsCollection);
  const now = new Date().toISOString();

  const requestData: ListingRequest = {
    id: newDocRef.id,
    listingId,
    listingOwnerId,
    requesterId,
    requestType,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    offerDescription: offerDescription?.trim() ? offerDescription.trim() : undefined,
    listingTitle: params.listingTitle || currentPost.title,
    listingImageUrl: params.listingImageUrl || currentPost.imageUrl,
    listingCategory: params.listingCategory || currentPost.category,
    listingMaterial: params.listingMaterial || getPostMaterial(currentPost),
    listingActionType: params.listingActionType || getPostActionType(currentPost),
    listingPrice: params.listingPrice !== undefined ? params.listingPrice : currentPost.estimatedPrice,
    listingLocation: params.listingLocation || currentPost.location,
    requesterName: params.requesterName || 'Community Member',
    requesterEmail: params.requesterEmail || '',
    ownerName: params.ownerName || currentPost.ownerName,
  };

  const cleanData = sanitizeFirestoreData(requestData);
  await setDoc(newDocRef, cleanData);

  // 6. Record audit activity for requester according to Milestone 3.3 specifications
  let actType: ActivityType = 'request_created';
  let actTitle = 'Request Created';
  if (requestType === 'Purchase Request') {
    actType = 'purchase_request_created';
    actTitle = 'Purchase Request Created';
  } else if (requestType === 'Donation Request') {
    actType = 'donation_request_created';
    actTitle = 'Donation Request Created';
  } else if (requestType === 'Exchange Request') {
    actType = 'exchange_request_created';
    actTitle = 'Exchange Request Created';
  } else if (requestType === 'Interest' || requestType === 'Recycling Interest') {
    actType = 'interest_request_created';
    actTitle = 'Interest Request Created';
  }

  await logUserActivity({
    userId: requesterId,
    type: actType,
    title: actTitle,
    description: `Submitted ${requestType} for "${currentPost.title}" to ${currentPost.ownerName || 'listing owner'}.`,
    targetPostId: listingId,
  });

  return requestData;
}

/**
 * Retrieves all requests sent by the current user
 */
export async function getMySentRequests(userId: string): Promise<ListingRequest[]> {
  if (!userId) return [];
  try {
    const requestsRef = collection(db, 'listingRequests');
    const q = query(requestsRef, where('requesterId', '==', userId));
    const snapshot = await getDocs(q);

    const requests: ListingRequest[] = [];
    snapshot.forEach((docSnap) => {
      requests.push({ ...docSnap.data(), id: docSnap.id } as ListingRequest);
    });

    return requests.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    console.error('Error fetching sent requests:', err);
    throw err;
  }
}

/**
 * Retrieves all requests received for listings owned by the current user
 */
export async function getRequestsReceived(ownerId: string): Promise<ListingRequest[]> {
  if (!ownerId) return [];
  try {
    const requestsRef = collection(db, 'listingRequests');
    const q = query(requestsRef, where('listingOwnerId', '==', ownerId));
    const snapshot = await getDocs(q);

    const requests: ListingRequest[] = [];
    snapshot.forEach((docSnap) => {
      requests.push({ ...docSnap.data(), id: docSnap.id } as ListingRequest);
    });

    return requests.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    console.error('Error fetching received requests:', err);
    throw err;
  }
}

/**
 * Updates status of a listing request (Accept / Reject / Complete).
 * If owner accepts, listing status becomes 'reserved' (Milestone 3.2: do NOT mark completed).
 * Logs activity for the listing owner.
 */
export async function updateListingRequestStatus(
  requestId: string,
  newStatus: ListingRequestStatus,
  listingId?: string,
  listingOwnerId?: string,
  listingTitle?: string
): Promise<void> {
  if (!requestId) return;

  const requestRef = doc(db, 'listingRequests', requestId);
  const now = new Date().toISOString();

  await updateDoc(requestRef, {
    status: newStatus,
    updatedAt: now,
  });

  // When an owner accepts a request, the listing becomes 'reserved'
  if (newStatus === 'accepted') {
    if (listingId) {
      try {
        const postRef = doc(db, 'wastePosts', listingId);
        await updateDoc(postRef, {
          status: 'reserved',
          updatedAt: now,
        });
      } catch (err) {
        console.warn('Could not update listing status to reserved:', err);
      }
    }
    if (listingOwnerId) {
      await logUserActivity({
        userId: listingOwnerId,
        type: 'request_accepted',
        title: 'Request Accepted',
        description: `Accepted request for "${listingTitle || 'item'}". Listing marked as reserved.`,
        targetPostId: listingId,
      });
    }
  } else if (newStatus === 'rejected') {
    if (listingOwnerId) {
      await logUserActivity({
        userId: listingOwnerId,
        type: 'request_rejected',
        title: 'Request Rejected',
        description: `Declined request for "${listingTitle || 'item'}".`,
        targetPostId: listingId,
      });
    }
  }
}

/**
 * Confirms completion of a circular action by an authorized participant
 * (the listing owner or the accepted requester).
 *
 * Rules:
 * - Only authorized participants (owner or accepted requester) can confirm completion
 * - Prevents completing the same action multiple times
 * - Persists an immutable completedActions record with deterministic ID `completion_${postId}`
 * - Updates wastePost status to 'completed'
 * - Updates accepted request to 'completed'
 * - Logs audit activity for participants
 */
export async function confirmCircularActionCompletion(params: {
  postId: string;
  confirmedByUserId: string;
  requestId?: string;
  completionNotes?: string;
}): Promise<{
  completionId: string;
  ecoPointsEarned: number;
  wasteDivertedKg: number;
  co2eAvoidedKg: number;
}> {
  const { postId, confirmedByUserId, requestId } = params;
  if (!postId || !confirmedByUserId) {
    throw new Error('Invalid parameters: postId and confirmedByUserId are required.');
  }

  // 1. Fetch the listing
  const post = await getWastePostById(postId);
  if (!post) {
    throw new Error('Listing not found or was removed.');
  }

  // 2. Authorization check: must be owner OR accepted requester
  const isOwner = post.ownerId === confirmedByUserId;
  let isAcceptedRequester = false;
  let activeRequest: ListingRequest | null = null;

  // Check if requestId provided
  if (requestId) {
    try {
      const reqRef = doc(db, 'listingRequests', requestId);
      const reqSnap = await getDoc(reqRef);
      if (reqSnap.exists()) {
        const reqData = { ...reqSnap.data(), id: reqSnap.id } as ListingRequest;
        if (reqData.listingId === postId) {
          activeRequest = reqData;
          if (reqData.requesterId === confirmedByUserId) {
            isAcceptedRequester = true;
          }
        }
      }
    } catch (e) {
      console.warn('Could not load specific request:', e);
    }
  }

  // If not established via requestId, check whether user has an accepted request for this post
  if (!isOwner && !isAcceptedRequester) {
    try {
      const requestsRef = collection(db, 'listingRequests');
      const q = query(
        requestsRef,
        where('listingId', '==', postId),
        where('requesterId', '==', confirmedByUserId)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const r = d.data() as ListingRequest;
        if (r.status === 'accepted' || r.status === 'completed') {
          isAcceptedRequester = true;
          activeRequest = { ...r, id: d.id };
          break;
        }
      }
    } catch (e) {
      console.warn('Could not query requester status:', e);
    }
  }

  if (!isOwner && !isAcceptedRequester) {
    throw new Error(
      'Unauthorized: Only the listing owner or the accepted requester can confirm circular completion.'
    );
  }

  const completionId = `completion_${postId}`;
  const completionRef = doc(db, 'completedActions', completionId);

  // 3. Prevent duplicate completion
  const existingCompletionSnap = await getDoc(completionRef);
  if (existingCompletionSnap.exists()) {
    const existingData = existingCompletionSnap.data() as CompletedActionDoc;
    return {
      completionId,
      ecoPointsEarned: existingData.ecoPointsEarned,
      wasteDivertedKg: existingData.environmentalImpact?.wasteDivertedKg ?? 0,
      co2eAvoidedKg: existingData.environmentalImpact?.co2eAvoidedKg ?? 0,
    };
  }

  // 4. Calculate or retrieve environmental impact & EcoScore
  const impact = getOrComputePostImpact(post);
  const actionType = getPostActionType(post);
  const pointsData = calculateActionEcoPoints(impact, actionType);
  const now = new Date().toISOString();

  // 5. If we don't have activeRequest yet, query if there's any accepted request for this post
  if (!activeRequest) {
    try {
      const requestsRef = collection(db, 'listingRequests');
      const q = query(
        requestsRef,
        where('listingId', '==', postId),
        where('status', '==', 'accepted')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        activeRequest = { ...snap.docs[0].data(), id: snap.docs[0].id } as ListingRequest;
      }
    } catch (e) {
      console.warn('Could not query accepted request:', e);
    }
  }

  // 6. Persist unique completedActions record
  const completedDoc: CompletedActionDoc = {
    id: completionId,
    postId,
    requestId: activeRequest?.id,
    listingTitle: post.title,
    category: impact.category,
    material: impact.material,
    actionType,
    ownerId: post.ownerId,
    requesterId: activeRequest?.requesterId,
    confirmedBy: confirmedByUserId,
    environmentalImpact: impact,
    ecoPointsEarned: pointsData.total,
    status: 'completed',
    completedAt: now,
    createdAt: now,
  };

  await setDoc(completionRef, sanitizeFirestoreData(completedDoc));

  // 7. Update wastePosts document status to 'completed'
  const postRef = doc(db, 'wastePosts', postId);
  await updateDoc(postRef, sanitizeFirestoreData({
    status: 'completed',
    completedAt: now,
    completedBy: confirmedByUserId,
    completionId,
    updatedAt: now,
  }));

  // 8. Update accepted request(s) to 'completed'
  if (activeRequest) {
    try {
      const reqRef = doc(db, 'listingRequests', activeRequest.id);
      await updateDoc(reqRef, {
        status: 'completed',
        updatedAt: now,
      });
    } catch (e) {
      console.warn('Could not update request status to completed:', e);
    }
  }

  // 9. Record audit activity for participants
  await logUserActivity({
    userId: post.ownerId,
    type: 'listing_completed',
    title: 'Listing Completed',
    description: `Circular handover completed for "${post.title}". Diverted ${impact.wasteDivertedKg} kg from landfill and earned ${pointsData.total} EcoPoints!`,
    targetPostId: postId,
  });

  if (activeRequest?.requesterId && activeRequest.requesterId !== post.ownerId) {
    await logUserActivity({
      userId: activeRequest.requesterId,
      type: 'listing_completed',
      title: 'Circular Transfer Received',
      description: `Received "${post.title}" for circular reuse/recycling. Diverted ${impact.wasteDivertedKg} kg from landfill and earned ${pointsData.total} EcoPoints!`,
      targetPostId: postId,
    });
  }

  return {
    completionId,
    ecoPointsEarned: pointsData.total,
    wasteDivertedKg: impact.wasteDivertedKg,
    co2eAvoidedKg: impact.co2eAvoidedKg,
  };
}

/**
 * Marks a waste post listing as completed and logs the activity.
 * Validates that caller is the owner and cascades to accepted request.
 */
export async function completeWastePostListing(
  postId: string,
  userId: string
): Promise<void> {
  await confirmCircularActionCompletion({
    postId,
    confirmedByUserId: userId,
  });
}

/**
 * Cancels a pending request submitted by the current user
 */
export async function cancelListingRequest(requestId: string): Promise<void> {
  if (!requestId) return;
  const requestRef = doc(db, 'listingRequests', requestId);
  await updateDoc(requestRef, {
    status: 'cancelled',
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Standard friendly error formatter preventing raw Firebase/network leaks to the UI
 */
export function formatFriendlyError(err: any): string {
  if (!err) return 'An unexpected error occurred. Please try again.';
  const msg = typeof err === 'string' ? err : err.message || String(err);
  if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
    return 'Access denied: You do not have permission to perform this action.';
  }
  if (msg.includes('not-found')) {
    return 'The requested record was not found or was removed.';
  }
  if (msg.includes('unavailable') || msg.includes('network') || msg.includes('Failed to fetch')) {
    return 'Network connection issue. Please check your internet and try again.';
  }
  if (msg.includes('already-exists')) {
    return 'A duplicate record already exists.';
  }
  return msg.replace(/^Error:\s*/, '');
}

/**
 * Retrieves verified completed circular actions across the community (Milestone 4.2 / Campus Hub).
 * Uses real Firestore records with no mocked or invented entries.
 */
export async function getCommunityCompletedActions(limitCount = 50): Promise<CompletedActionDoc[]> {
  try {
    const completionsRef = collection(db, 'completedActions');
    const q = query(completionsRef, limit(limitCount));
    const snap = await getDocs(q);
    const actions: CompletedActionDoc[] = [];
    snap.forEach((d) => {
      actions.push({ ...d.data(), id: d.id } as CompletedActionDoc);
    });
    return actions.sort(
      (a, b) =>
        new Date(b.completedAt || b.createdAt).getTime() -
        new Date(a.completedAt || a.createdAt).getTime()
    );
  } catch (err) {
    console.error('Error fetching community completed actions:', err);
    return [];
  }
}

/**
 * Builds the real-time community leaderboard strictly from verified completedActions.
 *
 * Leaderboard Rules:
 * - Uses only valid, persisted EcoPoints from genuinely completed circular actions
 * - 0 points awarded for merely publishing, analyzing, or requesting
 * - Each completed action ID (completion_<postId>) is unique to prevent duplicate scoring
 * - Respects privacy: NEVER outputs user email addresses or private info
 * - Displays a friendly empty state if no completed actions exist yet
 */
export async function getCommunityLeaderboard(collegeFilter?: string): Promise<LeaderboardEntry[]> {
  try {
    const [completionsSnap, usersSnap] = await Promise.all([
      getDocs(query(collection(db, 'completedActions'), limit(150))),
      getDocs(query(collection(db, 'users'), limit(200))),
    ]);

    if (completionsSnap.empty) {
      return [];
    }

    // Build privacy-safe user profile lookup (names and colleges only; NO emails exposed)
    const profileMap = new Map<string, { displayName: string; college?: string }>();
    usersSnap.forEach((uDoc) => {
      const data = uDoc.data();
      profileMap.set(uDoc.id, {
        displayName: data.name || 'Circular Pioneer',
        college: data.college || undefined,
      });
    });

    // Aggregate user scores from unique completed actions
    const userAggregates = new Map<
      string,
      {
        totalEcoPoints: number;
        completedActionsCount: number;
        wasteDivertedKg: number;
        co2eAvoidedKg: number;
      }
    >();

    const getOrInitUser = (uid: string) => {
      let agg = userAggregates.get(uid);
      if (!agg) {
        agg = {
          totalEcoPoints: 0,
          completedActionsCount: 0,
          wasteDivertedKg: 0,
          co2eAvoidedKg: 0,
        };
        userAggregates.set(uid, agg);
      }
      return agg;
    };

    completionsSnap.forEach((docSnap) => {
      const action = docSnap.data() as CompletedActionDoc;
      const points = action.ecoPointsEarned || 0;
      const diverted = action.environmentalImpact?.wasteDivertedKg || 0;
      const co2e = action.environmentalImpact?.co2eAvoidedKg || 0;

      // Credit listing owner
      if (action.ownerId) {
        const ownerAgg = getOrInitUser(action.ownerId);
        ownerAgg.totalEcoPoints += points;
        ownerAgg.completedActionsCount += 1;
        ownerAgg.wasteDivertedKg = Math.round((ownerAgg.wasteDivertedKg + diverted) * 100) / 100;
        ownerAgg.co2eAvoidedKg = Math.round((ownerAgg.co2eAvoidedKg + co2e) * 100) / 100;
      }

      // Credit accepted requester if distinct
      if (action.requesterId && action.requesterId !== action.ownerId) {
        const reqAgg = getOrInitUser(action.requesterId);
        reqAgg.totalEcoPoints += points;
        reqAgg.completedActionsCount += 1;
        reqAgg.wasteDivertedKg = Math.round((reqAgg.wasteDivertedKg + diverted) * 100) / 100;
        reqAgg.co2eAvoidedKg = Math.round((reqAgg.co2eAvoidedKg + co2e) * 100) / 100;
      }
    });

    let entries: LeaderboardEntry[] = [];
    userAggregates.forEach((agg, uid) => {
      const profile = profileMap.get(uid);
      const college = profile?.college;

      // Optional college filtering
      if (
        collegeFilter &&
        collegeFilter !== 'All' &&
        college?.toLowerCase() !== collegeFilter.toLowerCase()
      ) {
        return;
      }

      entries.push({
        userId: uid,
        displayName: profile?.displayName || 'Community Member',
        college,
        totalEcoPoints: agg.totalEcoPoints,
        completedActionsCount: agg.completedActionsCount,
        wasteDivertedKg: agg.wasteDivertedKg,
        co2eAvoidedKg: agg.co2eAvoidedKg,
        rank: 1, // Will be set after sorting
      });
    });

    // Sort descending by points, then completed actions, then diverted kg
    entries.sort((a, b) => {
      if (b.totalEcoPoints !== a.totalEcoPoints) return b.totalEcoPoints - a.totalEcoPoints;
      if (b.completedActionsCount !== a.completedActionsCount)
        return b.completedActionsCount - a.completedActionsCount;
      return b.wasteDivertedKg - a.wasteDivertedKg;
    });

    // Assign rank
    entries = entries.map((e, idx) => ({ ...e, rank: idx + 1 }));

    return entries;
  } catch (err) {
    console.error('Error computing community leaderboard:', err);
    return [];
  }
}

/**
 * Builds a live circular activity feed combining verified completed handovers
 * and active community listings from Firestore.
 */
export async function getCommunityActivityFeed(limitCount = 30): Promise<CommunityFeedItem[]> {
  try {
    const [completionsSnap, postsSnap, usersSnap] = await Promise.all([
      getDocs(query(collection(db, 'completedActions'), limit(limitCount))),
      getDocs(query(collection(db, 'wastePosts'), limit(limitCount))),
      getDocs(query(collection(db, 'users'), limit(100))),
    ]);

    const profileMap = new Map<string, { displayName: string; college?: string }>();
    usersSnap.forEach((uDoc) => {
      const data = uDoc.data();
      profileMap.set(uDoc.id, {
        displayName: data.name || 'Community Member',
        college: data.college || undefined,
      });
    });

    const feed: CommunityFeedItem[] = [];

    // 1. Completed circular actions
    completionsSnap.forEach((d) => {
      const data = d.data() as CompletedActionDoc;
      const ownerProfile = profileMap.get(data.ownerId);
      feed.push({
        id: `feed_completed_${d.id}`,
        type: 'completed_action',
        title: data.listingTitle || 'Circular Transfer',
        category: data.category || 'Mixed',
        material: data.material,
        actionType: data.actionType || 'reuse',
        actorName: ownerProfile?.displayName || 'Community Member',
        actorCollege: ownerProfile?.college,
        timestamp: data.completedAt || data.createdAt || new Date().toISOString(),
        wasteDivertedKg: data.environmentalImpact?.wasteDivertedKg,
        co2eAvoidedKg: data.environmentalImpact?.co2eAvoidedKg,
        ecoPointsEarned: data.ecoPointsEarned,
        postId: data.postId,
      });
    });

    // 2. Active published community waste listings
    postsSnap.forEach((d) => {
      const post = { ...d.data(), id: d.id } as WastePost;
      const normStatus = getNormalizedStatus(post.status);
      if (normStatus === 'active') {
        feed.push({
          id: `feed_post_${post.id}`,
          type: 'new_listing',
          title: post.title,
          category: post.category,
          material: post.material,
          actionType: post.actionType || post.intendedAction,
          actorName: post.ownerName || 'Campus Member',
          actorCollege: post.ownerCollege || profileMap.get(post.ownerId)?.college,
          timestamp: post.createdAt || new Date().toISOString(),
          wasteDivertedKg: post.environmentalImpact?.wasteDivertedKg,
          co2eAvoidedKg: post.environmentalImpact?.co2eAvoidedKg,
          postId: post.id,
          imageUrl: post.imageUrl,
        });
      }
    });

    // Sort descending by timestamp
    return feed
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limitCount);
  } catch (err) {
    console.error('Error fetching community activity feed:', err);
    return [];
  }
}
