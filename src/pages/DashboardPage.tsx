import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  getUserWastePosts,
  getUserActivities,
  computeUserStats,
  getMySentRequests,
  getRequestsReceived,
  updateListingRequestStatus,
  cancelListingRequest,
  completeWastePostListing,
  confirmCircularActionCompletion,
  formatFriendlyError,
  getNormalizedStatus,
} from '../services/db.ts';
import type { UserEcoScoreSummary, CompletedActionRecord } from '../services/ecoScore.ts';
import type {
  WastePost,
  UserActivity,
  UserStats,
  ListingRequest,
  ListingRequestStatus,
} from '../types/index.ts';
import {
  Package,
  HeartHandshake,
  ShoppingBag,
  Repeat,
  Leaf,
  PlusCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  Tag,
  Loader2,
  Calendar,
  Inbox,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  RefreshCw,
  User,
  MessageSquare,
  Award,
  ShieldCheck,
  Scale,
  Sprout,
  Info,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { currentUser, userProfile } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    itemsListed: 0,
    itemsDonated: 0,
    itemsSold: 0,
    itemsExchanged: 0,
    ecoPoints: 0,
    activeListings: 0,
    requestsSent: 0,
    requestsReceived: 0,
    completedCircularActions: 0,
  });
  const [userPosts, setUserPosts] = useState<WastePost[]>([]);
  const [recentActivities, setRecentActivities] = useState<UserActivity[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<ListingRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ListingRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active sub-tab in the dashboard management card
  const [activeTab, setActiveTab] = useState<'listings' | 'received' | 'sent'>('listings');
  const [showEcoDetails, setShowEcoDetails] = useState<boolean>(false);

  // Action status message & state
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const loadDashboardData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const [loadedStats, loadedPosts, loadedActs, loadedReceived, loadedSent] =
        await Promise.all([
          computeUserStats(currentUser.uid),
          getUserWastePosts(currentUser.uid),
          getUserActivities(currentUser.uid),
          getRequestsReceived(currentUser.uid),
          getMySentRequests(currentUser.uid),
        ]);
      setStats(loadedStats);
      setUserPosts(loadedPosts);
      setRecentActivities(loadedActs.slice(0, 6));
      setReceivedRequests(loadedReceived);
      setSentRequests(loadedSent);
    } catch (err) {
      console.error('Failed to load dashboard data from Firestore:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  // Handle owner accepting a request
  const handleAcceptRequest = async (request: ListingRequest) => {
    if (!currentUser) return;
    try {
      setActionInProgressId(request.id);
      setActionMessage(null);

      await updateListingRequestStatus(
        request.id,
        'accepted',
        request.listingId,
        currentUser.uid,
        request.listingTitle
      );

      setActionMessage({
        type: 'success',
        text: `Request accepted! Listing "${request.listingTitle || 'Item'}" has been marked as Reserved.`,
      });

      await loadDashboardData();
    } catch (err: any) {
      console.error('Failed to accept request:', err);
      setActionMessage({
        type: 'error',
        text: formatFriendlyError(err),
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handle owner rejecting a request
  const handleRejectRequest = async (request: ListingRequest) => {
    if (!currentUser) return;
    try {
      setActionInProgressId(request.id);
      setActionMessage(null);

      await updateListingRequestStatus(
        request.id,
        'rejected',
        request.listingId,
        currentUser.uid,
        request.listingTitle
      );

      setActionMessage({
        type: 'success',
        text: `Request rejected for "${request.listingTitle || 'Item'}".`,
      });

      await loadDashboardData();
    } catch (err: any) {
      console.error('Failed to reject request:', err);
      setActionMessage({
        type: 'error',
        text: formatFriendlyError(err),
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handle requester cancelling a pending request
  const handleCancelRequest = async (request: ListingRequest) => {
    if (!currentUser) return;
    try {
      setActionInProgressId(request.id);
      setActionMessage(null);

      await cancelListingRequest(request.id);

      setActionMessage({
        type: 'success',
        text: `Your request for "${request.listingTitle || 'Item'}" has been cancelled.`,
      });

      await loadDashboardData();
    } catch (err: any) {
      console.error('Failed to cancel request:', err);
      setActionMessage({
        type: 'error',
        text: formatFriendlyError(err),
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handle confirming circular action completion (owner or accepted requester)
  const handleConfirmCompletion = async (
    listingId: string,
    requestId?: string,
    title?: string
  ) => {
    if (!currentUser) return;
    try {
      setActionInProgressId(requestId || listingId);
      setActionMessage(null);

      const result = await confirmCircularActionCompletion({
        postId: listingId,
        requestId,
        confirmedByUserId: currentUser.uid,
      });

      setActionMessage({
        type: 'success',
        text: `Circular action completed for "${title || 'Item'}"! Diverted ${result.wasteDivertedKg} kg from landfill and earned ${result.ecoPointsEarned} EcoPoints!`,
      });

      await loadDashboardData();
    } catch (err: any) {
      console.error('Failed to confirm completion:', err);
      setActionMessage({
        type: 'error',
        text: formatFriendlyError(err),
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handle owner completing a listing
  const handleCompleteListing = async (post: WastePost) => {
    await handleConfirmCompletion(post.id, undefined, post.title);
  };

  const getStatusBadge = (status: ListingRequestStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-800">
            <Clock className="w-3 h-3 text-amber-400" />
            Pending Review
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Accepted / Reserved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
            <XCircle className="w-3 h-3 text-rose-400" />
            Declined
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-800 text-stone-400 border border-stone-700">
            Cancelled
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800">
            <Check className="w-3 h-3 text-cyan-400" />
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-800 text-stone-300">
            {status}
          </span>
        );
    }
  };

  const pendingReceivedCount = receivedRequests.filter((r) => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-stone-400 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        <span className="text-sm font-medium">Loading live dashboard metrics...</span>
      </div>
    );
  }

  return (
    <div id="dashboard-page-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-stone-900 border border-stone-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Verified Member • {userProfile?.college || 'Campus Community'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Welcome, {userProfile?.name || currentUser?.email}
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Track your circular lifecycle, marketplace requests, and sustainability metrics in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <button
            id="dashboard-requests-cta-btn"
            onClick={() => onNavigate('/requests')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-200 font-bold text-xs sm:text-sm transition-all shadow-sm relative"
          >
            <Inbox className="w-4 h-4 text-emerald-400" />
            <span>Marketplace Requests Hub</span>
            {pendingReceivedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-stone-950">
                {pendingReceivedCount}
              </span>
            )}
          </button>

          <button
            id="dashboard-upload-cta-btn"
            onClick={() => onNavigate('/upload')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-bold text-xs sm:text-sm transition-all shadow-md"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Upload Waste</span>
          </button>
        </div>
      </div>

      {/* Action feedback message */}
      {actionMessage && (
        <div
          id="dashboard-action-banner"
          className={`p-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm animate-fadeIn ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200'
              : 'bg-rose-950/60 border-rose-800/80 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-stone-400 hover:text-white text-xs underline ml-4 flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Primary Real-Time Metrics (Milestone 3.3 Goal 1) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Circular Marketplace Metrics</span>
          </h2>
          <span className="text-[11px] text-stone-500 font-mono">Live Firestore Data</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* Active Listings */}
          <div
            id="metric-active-listings"
            onClick={() => setActiveTab('listings')}
            className="cursor-pointer p-4 sm:p-5 rounded-xl bg-stone-900 border border-stone-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-xs font-semibold group-hover:text-emerald-300 transition-colors">Active Listings</span>
              <Package className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-white">{stats.activeListings}</span>
              <span className="text-xs text-stone-500 ml-1.5">available</span>
            </div>
          </div>

          {/* Requests Sent */}
          <div
            id="metric-requests-sent"
            onClick={() => setActiveTab('sent')}
            className="cursor-pointer p-4 sm:p-5 rounded-xl bg-stone-900 border border-stone-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-xs font-semibold group-hover:text-cyan-300 transition-colors">Requests Sent</span>
              <Send className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-white">{stats.requestsSent}</span>
              <span className="text-xs text-stone-500 ml-1.5">outbound</span>
            </div>
          </div>

          {/* Requests Received */}
          <div
            id="metric-requests-received"
            onClick={() => setActiveTab('received')}
            className="cursor-pointer p-4 sm:p-5 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-500/50 transition-all flex flex-col justify-between group relative"
          >
            <div className="flex items-center justify-between text-stone-400">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold group-hover:text-amber-300 transition-colors">Requests Received</span>
                {pendingReceivedCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>
              <Inbox className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-2xl sm:text-3xl font-black text-white">{stats.requestsReceived}</span>
                <span className="text-xs text-stone-500 ml-1.5">inbound</span>
              </div>
              {pendingReceivedCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {pendingReceivedCount} pending
                </span>
              )}
            </div>
          </div>

          {/* Completed Circular Actions */}
          <div
            id="metric-completed-actions"
            className="p-4 sm:p-5 rounded-xl bg-stone-900 border border-stone-800 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-xs font-semibold">Completed Actions</span>
              <Repeat className="w-4 h-4 text-teal-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-white">{stats.completedCircularActions}</span>
              <span className="text-xs text-stone-500 ml-1.5">transfers</span>
            </div>
          </div>

          {/* EcoPoints */}
          <div
            id="metric-ecopoints"
            className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-emerald-950/70 to-teal-950/70 border border-emerald-800/40 flex flex-col justify-between col-span-2 sm:col-span-1"
          >
            <div className="flex items-center justify-between text-emerald-300">
              <span className="text-xs font-semibold">EcoPoints</span>
              <Leaf className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-emerald-300">{stats.ecoPoints}</span>
              <span className="text-xs text-emerald-400/80 ml-1.5">pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Cumulative Counts (Preserving all existing metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-stone-900/60 border border-stone-800/80 text-xs text-stone-400">
        <div className="flex items-center justify-between px-3 py-1.5 border-r border-stone-800 last:border-0">
          <span className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-stone-500" />
            Total Listed:
          </span>
          <span className="font-bold text-stone-200 font-mono">{stats.itemsListed}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-1.5 border-r border-stone-800 last:border-0">
          <span className="flex items-center gap-1.5">
            <HeartHandshake className="w-3.5 h-3.5 text-teal-400" />
            Donations:
          </span>
          <span className="font-bold text-stone-200 font-mono">{stats.itemsDonated}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-1.5 border-r border-stone-800 last:border-0">
          <span className="flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
            Sales:
          </span>
          <span className="font-bold text-stone-200 font-mono">{stats.itemsSold}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5 text-cyan-400" />
            Exchanges:
          </span>
          <span className="font-bold text-stone-200 font-mono">{stats.itemsExchanged}</span>
        </div>
      </div>

      {/* =========================================================================
          ECOSCORE & CIRCULAR IMPACT VISUALIZATION SECTION (Milestone 4.2)
         ========================================================================= */}
      <section
        id="dashboard-ecoscore-section"
        className="rounded-2xl border border-emerald-800/60 bg-gradient-to-b from-stone-900 via-stone-900 to-emerald-950/20 p-6 sm:p-7 space-y-6 shadow-sm"
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <span>EcoScore & Verified Circular Contributions</span>
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                  Milestone 4.2
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Points and environmental metrics derived strictly from genuinely completed circular actions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-stone-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Documented Scoring Engine</span>
            </span>
          </div>
        </div>

        {/* 4 Core Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Total EcoPoints */}
          <div
            id="ecoscore-card-points"
            className="p-4 sm:p-5 rounded-xl bg-stone-950/80 border border-emerald-800/40 relative overflow-hidden group"
          >
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total EcoPoints</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black text-emerald-300 font-mono">
                {stats.ecoPoints}
              </span>
              <span className="text-xs font-semibold text-emerald-500">pts</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Verified circular transfers
            </p>
          </div>

          {/* Completed Circular Actions */}
          <div
            id="ecoscore-card-actions"
            className="p-4 sm:p-5 rounded-xl bg-stone-950/80 border border-stone-800"
          >
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-xs font-bold uppercase tracking-wider">Completed Actions</span>
              <Repeat className="w-4 h-4 text-teal-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                {stats.completedCircularActions}
              </span>
              <span className="text-xs font-semibold text-stone-500">transfers</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Genuine campus handovers
            </p>
          </div>

          {/* Estimated Waste Diverted */}
          <div
            id="ecoscore-card-diverted"
            className="p-4 sm:p-5 rounded-xl bg-stone-950/80 border border-stone-800"
          >
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-xs font-bold uppercase tracking-wider">Waste Diverted</span>
              <Scale className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                {(stats.totalWasteDivertedKg ?? 0).toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-stone-400">kg est.</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Kept out of municipal landfill
            </p>
          </div>

          {/* Estimated CO2e Avoided */}
          <div
            id="ecoscore-card-carbon"
            className="p-4 sm:p-5 rounded-xl bg-stone-950/80 border border-stone-800"
          >
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-xs font-bold uppercase tracking-wider">CO₂e Avoided</span>
              <Leaf className="w-4 h-4 text-teal-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black text-teal-300 font-mono">
                {(stats.totalCo2eAvoidedKg ?? 0).toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-teal-500/80">kg CO₂e est.</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Displaced virgin production
            </p>
          </div>
        </div>

        {/* Action Type Breakdown: Reuse, Donation, Exchange, Upcycling, Recycling, Sale */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Breakdown by Circular Action Type</span>
            </h3>
            <span className="text-[11px] text-stone-500 font-mono">
              {stats.completedCircularActions} verified completed
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            {/* Direct Reuse */}
            <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-stone-400">
                <span className="font-semibold text-stone-300">Reuse</span>
                <Repeat className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-lg font-black text-white font-mono">
                {stats.ecoScoreSummary?.actionBreakdown?.reuse?.count ?? 0}
              </div>
              <div className="text-[10px] text-stone-400 flex items-center justify-between">
                <span>{(stats.ecoScoreSummary?.actionBreakdown?.reuse?.wasteDivertedKg ?? 0).toFixed(1)} kg</span>
                <span className="text-emerald-400 font-mono">+{stats.ecoScoreSummary?.actionBreakdown?.reuse?.ecoPoints ?? 0} pts</span>
              </div>
            </div>

            {/* Donation */}
            <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-stone-400">
                <span className="font-semibold text-stone-300">Donation</span>
                <HeartHandshake className="w-3.5 h-3.5 text-teal-400" />
              </div>
              <div className="text-lg font-black text-white font-mono">
                {stats.ecoScoreSummary?.actionBreakdown?.donate?.count ?? 0}
              </div>
              <div className="text-[10px] text-stone-400 flex items-center justify-between">
                <span>{(stats.ecoScoreSummary?.actionBreakdown?.donate?.wasteDivertedKg ?? 0).toFixed(1)} kg</span>
                <span className="text-teal-400 font-mono">+{stats.ecoScoreSummary?.actionBreakdown?.donate?.ecoPoints ?? 0} pts</span>
              </div>
            </div>

            {/* Exchange */}
            <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-stone-400">
                <span className="font-semibold text-stone-300">Exchange</span>
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-lg font-black text-white font-mono">
                {stats.ecoScoreSummary?.actionBreakdown?.exchange?.count ?? 0}
              </div>
              <div className="text-[10px] text-stone-400 flex items-center justify-between">
                <span>{(stats.ecoScoreSummary?.actionBreakdown?.exchange?.wasteDivertedKg ?? 0).toFixed(1)} kg</span>
                <span className="text-cyan-400 font-mono">+{stats.ecoScoreSummary?.actionBreakdown?.exchange?.ecoPoints ?? 0} pts</span>
              </div>
            </div>

            {/* Upcycling */}
            <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-stone-400">
                <span className="font-semibold text-stone-300">Upcycle</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-lg font-black text-white font-mono">
                {stats.ecoScoreSummary?.actionBreakdown?.upcycle?.count ?? 0}
              </div>
              <div className="text-[10px] text-stone-400 flex items-center justify-between">
                <span>{(stats.ecoScoreSummary?.actionBreakdown?.upcycle?.wasteDivertedKg ?? 0).toFixed(1)} kg</span>
                <span className="text-amber-400 font-mono">+{stats.ecoScoreSummary?.actionBreakdown?.upcycle?.ecoPoints ?? 0} pts</span>
              </div>
            </div>

            {/* Recycling */}
            <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-stone-400">
                <span className="font-semibold text-stone-300">Recycling</span>
                <Scale className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-lg font-black text-white font-mono">
                {stats.ecoScoreSummary?.actionBreakdown?.recycle?.count ?? 0}
              </div>
              <div className="text-[10px] text-stone-400 flex items-center justify-between">
                <span>{(stats.ecoScoreSummary?.actionBreakdown?.recycle?.wasteDivertedKg ?? 0).toFixed(1)} kg</span>
                <span className="text-emerald-400 font-mono">+{stats.ecoScoreSummary?.actionBreakdown?.recycle?.ecoPoints ?? 0} pts</span>
              </div>
            </div>

            {/* Marketplace Sale */}
            <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between text-stone-400">
                <span className="font-semibold text-stone-300">Marketplace</span>
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-lg font-black text-white font-mono">
                {stats.ecoScoreSummary?.actionBreakdown?.sell?.count ?? 0}
              </div>
              <div className="text-[10px] text-stone-400 flex items-center justify-between">
                <span>{(stats.ecoScoreSummary?.actionBreakdown?.sell?.wasteDivertedKg ?? 0).toFixed(1)} kg</span>
                <span className="text-amber-400 font-mono">+{stats.ecoScoreSummary?.actionBreakdown?.sell?.ecoPoints ?? 0} pts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State vs Completed Actions History */}
        {stats.completedCircularActions === 0 ? (
          <div
            id="ecoscore-empty-state"
            className="p-6 rounded-2xl bg-stone-950/60 border border-dashed border-stone-800 text-center space-y-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">No Completed Circular Actions Yet</h4>
              <p className="text-xs text-stone-400 max-w-md mx-auto mt-1 leading-relaxed">
                EcoPoints and environmental savings are awarded strictly when circular transactions reach a confirmed completed handover. Merely uploading a photo or listing waste does not generate points.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                onClick={() => onNavigate('/marketplace')}
                className="px-3.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-all border border-stone-700"
              >
                Browse Marketplace
              </button>
              <button
                onClick={() => onNavigate('/upload')}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-stone-950 text-xs font-bold transition-all"
              >
                Upload Waste to List
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => setShowEcoDetails(!showEcoDetails)}
              className="text-xs font-semibold text-stone-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
            >
              {showEcoDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{showEcoDetails ? 'Hide' : 'View'} Completed Actions Audit Trail ({stats.ecoScoreSummary?.completedActions?.length ?? 0})</span>
            </button>

            {showEcoDetails && stats.ecoScoreSummary?.completedActions && (
              <div className="p-4 rounded-xl bg-stone-950/70 border border-stone-800 space-y-2 text-xs">
                {stats.ecoScoreSummary.completedActions.map((act: CompletedActionRecord) => (
                  <div
                    key={act.actionId}
                    className="p-3 rounded-lg bg-stone-900 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{act.title}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase">
                          {act.actionType}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          as {act.userRole}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        {act.pointsBreakdown?.formulaExplanation || `${act.wasteDivertedKg} kg diverted, ${act.co2eAvoidedKg} kg CO₂e avoided`}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-emerald-400 font-mono">+{act.ecoPoints} pts</span>
                      <div className="text-[10px] text-stone-500 font-mono">
                        {new Date(act.completedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scoring Methodology & Disclaimer Box */}
        <div className="p-3.5 rounded-xl bg-stone-950/50 border border-stone-800/80 text-[11px] text-stone-400 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-stone-300">Scoring Formula & Transparency: </strong>
            EcoPoints = 50 Base Points + 100 pts/kg diverted + 25 pts/kg CO₂e avoided + Action Tier Bonus (Reuse: +25, Donate: +25, Exchange: +20, Upcycle: +20, Sale: +15, Recycle: +10).
            Environmental metrics are educational lifecycle estimates based on circular benchmarks, not certified scientific carbon credits.
          </div>
        </div>
      </section>

      {/* Main Grid: Management Center & Recent Activity/Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Integrated Management Center (My Listings, Requests Received, My Requests) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Navigation Tabs Header */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-stone-900/90 p-1 rounded-xl border border-stone-800">
              <button
                id="dashboard-tab-listings"
                onClick={() => setActiveTab('listings')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'listings'
                    ? 'bg-emerald-400 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>My Listings ({userPosts.length})</span>
              </button>

              <button
                id="dashboard-tab-received"
                onClick={() => setActiveTab('received')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 relative ${
                  activeTab === 'received'
                    ? 'bg-emerald-400 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Requests Received ({receivedRequests.length})</span>
                {pendingReceivedCount > 0 && activeTab !== 'received' && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </button>

              <button
                id="dashboard-tab-sent"
                onClick={() => setActiveTab('sent')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'sent'
                    ? 'bg-emerald-400 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>My Requests ({sentRequests.length})</span>
              </button>
            </div>

            <button
              onClick={() => onNavigate('/requests')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>Full Requests Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* TAB 1: MY WASTE LISTINGS */}
          {activeTab === 'listings' && (
            <div id="dashboard-listings-section" className="space-y-3">
              {userPosts.length === 0 ? (
                <div className="p-8 rounded-2xl bg-stone-900 border border-dashed border-stone-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-stone-800/80 mx-auto flex items-center justify-center text-stone-500">
                    <Package className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-stone-200">No waste listings created yet</h3>
                  <p className="text-xs text-stone-400 max-w-sm mx-auto">
                    Got discarded cardboard, lab scrap, electronic parts, or reusable furniture? Upload your first item.
                  </p>
                  <button
                    id="dashboard-first-upload-btn"
                    onClick={() => onNavigate('/upload')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition-all mt-2"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Upload First Item</span>
                  </button>
                </div>
              ) : (
                userPosts.map((post) => {
                  const normStatus = getNormalizedStatus(post.status);
                  const isActionLoading = actionInProgressId === post.id;
                  return (
                    <div
                      key={post.id}
                      className="p-4 rounded-xl bg-stone-900 border border-stone-800 hover:border-stone-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        {post.imageUrl ? (
                          <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-16 h-16 rounded-lg object-cover bg-stone-800 flex-shrink-0 border border-stone-700"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-stone-800 flex items-center justify-center text-stone-500 flex-shrink-0 border border-stone-700 text-xs font-mono">
                            {post.category}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">{post.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                              {post.intendedAction}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                normStatus === 'active'
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                  : normStatus === 'reserved'
                                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                                  : 'bg-stone-800 text-stone-400 border border-stone-700'
                              }`}
                            >
                              {normStatus}
                            </span>
                          </div>
                          <p className="text-xs text-stone-400 mt-1 line-clamp-1">{post.description}</p>
                          <div className="flex items-center gap-3 text-[11px] text-stone-500 mt-1.5 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3 text-stone-400" />
                              {post.category} • {post.condition}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-stone-400" />
                              {post.location}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-800 gap-2">
                        <span className="text-sm font-black text-emerald-400">
                          {post.estimatedPrice > 0 ? `$${post.estimatedPrice.toFixed(2)}` : 'Free'}
                        </span>

                        {/* Owner action: Mark reserved listing as completed */}
                        {normStatus === 'reserved' && (
                          <button
                            id={`complete-listing-${post.id}`}
                            onClick={() => handleCompleteListing(post)}
                            disabled={isActionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-bold transition-all disabled:opacity-50"
                          >
                            {isActionLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            <span>Mark Completed</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: REQUESTS RECEIVED (Milestone 3.3 Goal 3) */}
          {activeTab === 'received' && (
            <div id="dashboard-received-section" className="space-y-3">
              {receivedRequests.length === 0 ? (
                <div className="p-8 rounded-2xl bg-stone-900 border border-dashed border-stone-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-stone-800/80 mx-auto flex items-center justify-center text-stone-500">
                    <Inbox className="w-6 h-6 text-amber-400/80" />
                  </div>
                  <h3 className="font-semibold text-stone-200">No requests received yet</h3>
                  <p className="text-xs text-stone-400 max-w-sm mx-auto">
                    When community members request to buy, donate, exchange, or claim your listings, their offers will appear here for your review.
                  </p>
                </div>
              ) : (
                receivedRequests.map((req) => {
                  const isActionLoading = actionInProgressId === req.id;
                  return (
                    <div
                      key={req.id}
                      className="p-4 sm:p-5 rounded-xl bg-stone-900 border border-stone-800 hover:border-stone-700 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">
                              {req.listingTitle || 'Marketplace Item'}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 font-semibold">
                              {req.requestType}
                            </span>
                            {getStatusBadge(req.status)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-stone-400 mt-1">
                            <span className="flex items-center gap-1 text-stone-300 font-medium">
                              <User className="w-3.5 h-3.5 text-stone-500" />
                              {req.requesterName}
                            </span>
                            <span className="text-stone-500 font-mono text-[11px]">
                              {new Date(req.createdAt).toLocaleDateString()} at{' '}
                              {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Accept / Reject actions for Pending requests */}
                        {req.status === 'pending' && (
                          <div className="flex items-center gap-2 self-start sm:self-auto pt-2 sm:pt-0">
                            <button
                              id={`dashboard-reject-${req.id}`}
                              onClick={() => handleRejectRequest(req)}
                              disabled={isActionLoading}
                              className="px-3 py-1.5 rounded-lg border border-rose-800/80 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>

                            <button
                              id={`dashboard-accept-${req.id}`}
                              onClick={() => handleAcceptRequest(req)}
                              disabled={isActionLoading}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-stone-950 text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {isActionLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>Accept Offer</span>
                            </button>
                          </div>
                        )}

                        {/* Owner Complete Handover for Accepted requests */}
                        {req.status === 'accepted' && (
                          <div className="flex items-center gap-2 self-start sm:self-auto pt-2 sm:pt-0">
                            <button
                              id={`dashboard-owner-complete-${req.id}`}
                              onClick={() => handleConfirmCompletion(req.listingId, req.id, req.listingTitle)}
                              disabled={isActionLoading}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{isActionLoading ? 'Confirming...' : 'Mark Handover Completed'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Offer description if exchange or note */}
                      {req.offerDescription && (
                        <div className="p-3 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-300 flex items-start gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-stone-400">Offer details: </span>
                            <span>{req.offerDescription}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: MY REQUESTS (Milestone 3.3 Goal 2) */}
          {activeTab === 'sent' && (
            <div id="dashboard-sent-section" className="space-y-3">
              {sentRequests.length === 0 ? (
                <div className="p-8 rounded-2xl bg-stone-900 border border-dashed border-stone-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-stone-800/80 mx-auto flex items-center justify-center text-stone-500">
                    <Send className="w-6 h-6 text-cyan-400/80" />
                  </div>
                  <h3 className="font-semibold text-stone-200">No requests sent yet</h3>
                  <p className="text-xs text-stone-400 max-w-sm mx-auto">
                    Interested in materials listed by others on campus? Browse the marketplace and request items.
                  </p>
                  <button
                    onClick={() => onNavigate('/marketplace')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold hover:bg-cyan-500/30 transition-all mt-2"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Explore Marketplace</span>
                  </button>
                </div>
              ) : (
                sentRequests.map((req) => {
                  const isActionLoading = actionInProgressId === req.id;
                  return (
                    <div
                      key={req.id}
                      className="p-4 sm:p-5 rounded-xl bg-stone-900 border border-stone-800 hover:border-stone-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">
                            {req.listingTitle || 'Marketplace Item'}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 font-semibold">
                            {req.requestType}
                          </span>
                          {getStatusBadge(req.status)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-stone-400">
                          <span>Owner: <strong className="text-stone-300">{req.ownerName || 'Campus Member'}</strong></span>
                          <span>•</span>
                          <span className="font-mono text-[11px] text-stone-500">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {req.offerDescription && (
                          <p className="text-xs text-stone-400 italic line-clamp-1">
                            Your offer: "{req.offerDescription}"
                          </p>
                        )}
                      </div>

                      {/* Requester cancel action for pending request */}
                      {req.status === 'pending' && (
                        <button
                          id={`dashboard-cancel-${req.id}`}
                          onClick={() => handleCancelRequest(req)}
                          disabled={isActionLoading}
                          className="px-3 py-1.5 rounded-lg border border-stone-700 bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-semibold transition-all disabled:opacity-50 self-start sm:self-center"
                        >
                          {isActionLoading ? 'Cancelling...' : 'Cancel Request'}
                        </button>
                      )}

                      {/* Requester Confirm Received / Complete for Accepted requests */}
                      {req.status === 'accepted' && (
                        <button
                          id={`dashboard-requester-complete-${req.id}`}
                          onClick={() => handleConfirmCompletion(req.listingId, req.id, req.listingTitle)}
                          disabled={isActionLoading}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 self-start sm:self-center"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{isActionLoading ? 'Confirming...' : 'Confirm Received / Complete'}</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right Column: Recent Activity & Impact Card */}
        <div className="space-y-6">
          {/* Recent Activity Log (Milestone 3.3 Goal 4) */}
          <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Recent Activity</span>
              </h3>
              <button
                onClick={() => onNavigate('/activity')}
                className="text-xs text-stone-400 hover:text-white"
              >
                View all
              </button>
            </div>

            {recentActivities.length === 0 ? (
              <div className="text-center py-6 text-stone-500 text-xs">
                No recent activity recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((act) => (
                  <div key={act.id} className="text-xs pb-3 border-b border-stone-800/80 last:border-0 last:pb-0">
                    <div className="font-semibold text-stone-200">{act.title}</div>
                    <div className="text-stone-400 text-[11px] mt-0.5">{act.description}</div>
                    <div className="text-[10px] text-stone-500 mt-1">
                      {new Date(act.timestamp).toLocaleDateString()} at{' '}
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Environmental Impact Summary */}
          <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Leaf className="w-4 h-4 text-emerald-400" />
              <span>Environmental Impact</span>
            </h3>

            <div className="space-y-3 text-xs text-stone-300">
              <div className="flex items-center justify-between p-3 rounded-lg bg-stone-950 border border-stone-800">
                <span className="text-stone-400">Landfill Diverted</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {(stats.totalWasteDivertedKg ?? 0).toFixed(1)} kg est.
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-stone-950 border border-stone-800">
                <span className="text-stone-400">Carbon Avoided</span>
                <span className="font-bold text-teal-400 font-mono">
                  {(stats.totalCo2eAvoidedKg ?? 0).toFixed(1)} kg CO₂e est.
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-stone-950 border border-stone-800">
                <span className="text-stone-400">Circular Tier</span>
                <span className="font-bold text-white font-mono">
                  {stats.completedCircularActions >= 5
                    ? 'Level 3 Circular Champion'
                    : stats.completedCircularActions >= 2
                    ? 'Level 2 Circular Advocate'
                    : stats.completedCircularActions >= 1
                    ? 'Level 1 Contributor'
                    : 'Getting Started'}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-stone-500 leading-normal">
              Educational estimates calculated directly from completed circular actions and category lifecycles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
