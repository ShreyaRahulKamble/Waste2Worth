import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  getMySentRequests,
  getRequestsReceived,
  updateListingRequestStatus,
  cancelListingRequest,
  confirmCircularActionCompletion,
  formatFriendlyError,
} from '../services/db.ts';
import type { ListingRequest, ListingRequestStatus } from '../types/index.ts';
import {
  Inbox,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShoppingBag,
  ArrowRight,
  Package,
  Calendar,
  User,
  MessageSquare,
  Repeat,
  Tag,
  ShieldCheck,
} from 'lucide-react';

interface RequestsPageProps {
  onNavigate: (path: string) => void;
  defaultTab?: 'received' | 'sent';
}

export const RequestsPage: React.FC<RequestsPageProps> = ({
  onNavigate,
  defaultTab = 'received',
}) => {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>(defaultTab);

  // Data states
  const [receivedRequests, setReceivedRequests] = useState<ListingRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ListingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action status message
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError(null);

      const [received, sent] = await Promise.all([
        getRequestsReceived(currentUser.uid),
        getMySentRequests(currentUser.uid),
      ]);

      setReceivedRequests(received);
      setSentRequests(sent);
    } catch (err: any) {
      console.error('Failed to load requests from Firestore:', err);
      setError('Unable to load requests from Firestore. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUser]);

  // Handle Owner Accepting a Request
  const handleAcceptRequest = async (request: ListingRequest) => {
    if (!currentUser) return;
    try {
      setActionInProgressId(request.id);
      setActionMessage(null);

      // Update Firestore request to 'accepted', and update listing to 'reserved' (Milestone 3.2: do NOT mark completed)
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

      // Refresh list
      await fetchRequests();
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

  // Handle Owner Rejecting a Request
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

      await fetchRequests();
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

  // Handle Requester Cancelling their own pending request
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

      await fetchRequests();
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

  // Handle confirming circular completion (owner or accepted requester)
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

      await fetchRequests();
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

  // Status Badge Configuration
  const getStatusBadge = (status: ListingRequestStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/80 font-mono">
            <Clock className="w-3 h-3" />
            <span>PENDING</span>
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-600/80 font-mono">
            <CheckCircle2 className="w-3 h-3" />
            <span>ACCEPTED</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/80 font-mono">
            <XCircle className="w-3 h-3" />
            <span>REJECTED</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-400 border border-stone-700 font-mono">
            <span>CANCELLED</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-950/80 text-teal-300 border border-teal-700 font-mono">
            <CheckCircle2 className="w-3 h-3" />
            <span>COMPLETED</span>
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 font-mono">
            {status}
          </span>
        );
    }
  };

  const pendingReceivedCount = receivedRequests.filter((r) => r.status === 'pending').length;

  return (
    <div id="requests-page-container" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <span>Marketplace Interaction Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Marketplace Requests</h1>
          <p className="text-sm text-stone-400 mt-1">
            Review incoming requests for your listings, track your purchase and exchange offers, and manage circular transfers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="requests-refresh-btn"
            onClick={fetchRequests}
            className="p-2.5 rounded-xl border border-stone-800 bg-stone-900 text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
            title="Refresh requests"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => onNavigate('/marketplace')}
            className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs transition-colors flex items-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Browse Marketplace</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
        <button
          id="tab-requests-received"
          onClick={() => {
            setActiveTab('received');
            setActionMessage(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'received'
              ? 'bg-emerald-400 text-stone-950 shadow-md'
              : 'text-stone-300 hover:text-white hover:bg-stone-800'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Requests Received</span>
          {pendingReceivedCount > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'received'
                  ? 'bg-stone-950 text-emerald-300 font-black'
                  : 'bg-emerald-500 text-stone-950 font-bold'
              }`}
            >
              {pendingReceivedCount}
            </span>
          )}
        </button>

        <button
          id="tab-requests-sent"
          onClick={() => {
            setActiveTab('sent');
            setActionMessage(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'sent'
              ? 'bg-emerald-400 text-stone-950 shadow-md'
              : 'text-stone-300 hover:text-white hover:bg-stone-800'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>My Requests</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'sent'
                ? 'bg-stone-950 text-emerald-300 font-black'
                : 'bg-stone-800 text-stone-400'
            }`}
          >
            {sentRequests.length}
          </span>
        </button>
      </div>

      {/* Status Action Message Banner */}
      {actionMessage && (
        <div
          id="requests-action-notification"
          className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 border ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-200'
              : 'bg-rose-950/60 border-rose-800/80 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-stone-400 hover:text-stone-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchRequests}
            className="px-3 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-100 text-xs font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-stone-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <span className="text-sm font-medium">Loading real requests from Firestore...</span>
        </div>
      ) : activeTab === 'received' ? (
        /* TAB 1: REQUESTS RECEIVED */
        receivedRequests.length === 0 ? (
          <div
            id="received-empty-state"
            className="p-12 rounded-3xl bg-stone-900 border border-dashed border-stone-800 text-center space-y-4 max-w-md mx-auto"
          >
            <div className="w-14 h-14 rounded-2xl bg-stone-800/80 mx-auto flex items-center justify-center text-stone-500">
              <Inbox className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No requests received yet</h3>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                When other students or community members request or express interest in your listed waste materials, they will appear here.
              </p>
            </div>
            <button
              onClick={() => onNavigate('/upload')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-bold text-xs transition-colors"
            >
              <span>List More Items</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {receivedRequests.map((req) => {
              const isPending = req.status === 'pending';
              const isExchange = req.requestType.toLowerCase().includes('exchange');
              const formattedDate = req.createdAt
                ? new Date(req.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recent';

              return (
                <div
                  key={req.id}
                  id={`received-request-${req.id}`}
                  className="p-5 rounded-2xl bg-stone-900 border border-stone-800 hover:border-stone-700 transition-all space-y-4"
                >
                  {/* Top Bar: Listing info & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Image Thumbnail */}
                      <div className="w-12 h-12 rounded-xl bg-stone-950 border border-stone-800 overflow-hidden flex items-center justify-center shrink-0">
                        {req.listingImageUrl ? (
                          <img
                            src={req.listingImageUrl}
                            alt={req.listingTitle || 'Listing'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-stone-600" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                            {req.listingActionType || 'Listing'}
                          </span>
                          <span className="text-stone-600">•</span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {req.listingPrice ? `₹${req.listingPrice}` : 'Free'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white leading-tight">
                          {req.listingTitle || 'Untitled Waste Item'}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-stone-950 text-stone-300 border border-stone-800">
                        {req.requestType}
                      </span>
                      {getStatusBadge(req.status)}
                    </div>
                  </div>

                  {/* Requester details & Date */}
                  <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800/80 text-xs text-stone-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Requested by{' '}
                        <strong className="text-white">{req.requesterName || 'Community Member'}</strong>
                        {req.requesterEmail && (
                          <span className="text-stone-400 ml-1">({req.requesterEmail})</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-stone-500 font-mono text-[11px]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Exchange Offer Description Card */}
                  {req.offerDescription && (
                    <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                        <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Offered in Exchange:</span>
                      </div>
                      <p className="text-stone-200 pl-5 leading-relaxed">
                        &ldquo;{req.offerDescription}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Owner Action Buttons (Accept / Reject) */}
                  {isPending && (
                    <div className="pt-2 border-t border-stone-800/60 flex items-center justify-end gap-3">
                      <button
                        id={`reject-request-btn-${req.id}`}
                        onClick={() => handleRejectRequest(req)}
                        disabled={actionInProgressId === req.id}
                        className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-rose-300 text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {actionInProgressId === req.id ? 'Updating...' : 'Reject Request'}
                      </button>

                      <button
                        id={`accept-request-btn-${req.id}`}
                        onClick={() => handleAcceptRequest(req)}
                        disabled={actionInProgressId === req.id}
                        className="px-5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-stone-950 text-xs font-extrabold transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-md"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {actionInProgressId === req.id ? 'Reserving...' : 'Accept & Reserve'}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Status explanation for non-pending */}
                  {!isPending && (
                    <div className="pt-2 border-t border-stone-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                        <span>
                          Status: <strong className="text-white capitalize">{req.status}</strong>.
                          {req.status === 'accepted' && ' Reserved for this requester.'}
                          {req.status === 'completed' && ' Circular exchange verified!'}
                        </span>
                      </div>

                      {req.status === 'accepted' && (
                        <button
                          id={`complete-received-btn-${req.id}`}
                          onClick={() => handleConfirmCompletion(req.listingId, req.id, req.listingTitle)}
                          disabled={actionInProgressId === req.id}
                          className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 self-start sm:self-auto"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{actionInProgressId === req.id ? 'Confirming...' : 'Mark Handover Completed'}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* TAB 2: MY SENT REQUESTS */
        sentRequests.length === 0 ? (
          <div
            id="sent-empty-state"
            className="p-12 rounded-3xl bg-stone-900 border border-dashed border-stone-800 text-center space-y-4 max-w-md mx-auto"
          >
            <div className="w-14 h-14 rounded-2xl bg-stone-800/80 mx-auto flex items-center justify-center text-stone-500">
              <Send className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No requests sent yet</h3>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                Browse the circular marketplace to discover surplus items, scrap materials, and reusable goods.
              </p>
            </div>
            <button
              onClick={() => onNavigate('/marketplace')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-bold text-xs transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explore Marketplace</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sentRequests.map((req) => {
              const isPending = req.status === 'pending';
              const formattedDate = req.createdAt
                ? new Date(req.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recent';

              return (
                <div
                  key={req.id}
                  id={`sent-request-${req.id}`}
                  className="p-5 rounded-2xl bg-stone-900 border border-stone-800 hover:border-stone-700 transition-all space-y-4"
                >
                  {/* Top Bar: Listing Info & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-stone-950 border border-stone-800 overflow-hidden flex items-center justify-center shrink-0">
                        {req.listingImageUrl ? (
                          <img
                            src={req.listingImageUrl}
                            alt={req.listingTitle || 'Listing'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-stone-600" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                            {req.listingActionType || 'Listing'}
                          </span>
                          <span className="text-stone-600">•</span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {req.listingPrice ? `₹${req.listingPrice}` : 'Free'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white leading-tight">
                          {req.listingTitle || 'Untitled Waste Item'}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-stone-950 text-stone-300 border border-stone-800">
                        {req.requestType}
                      </span>
                      {getStatusBadge(req.status)}
                    </div>
                  </div>

                  {/* Owner & Submission Date */}
                  <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800/80 text-xs text-stone-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-stone-400 shrink-0" />
                      <span>
                        Owner: <strong className="text-white">{req.ownerName || 'Campus Member'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-stone-500 font-mono text-[11px]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Submitted on {formattedDate}</span>
                    </div>
                  </div>

                  {/* Offer Description for Exchange */}
                  {req.offerDescription && (
                    <div className="p-3 rounded-xl bg-stone-950/40 border border-stone-800/60 text-xs space-y-1">
                      <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                        Your Offer Description
                      </span>
                      <p className="text-stone-300 italic">&ldquo;{req.offerDescription}&rdquo;</p>
                    </div>
                  )}

                  {/* Cancel action if pending */}
                  {isPending && (
                    <div className="pt-2 border-t border-stone-800/60 flex items-center justify-between">
                      <span className="text-[11px] text-amber-400/90 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Awaiting listing owner review.</span>
                      </span>

                      <button
                        id={`cancel-request-btn-${req.id}`}
                        onClick={() => handleCancelRequest(req)}
                        disabled={actionInProgressId === req.id}
                        className="px-3.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {actionInProgressId === req.id ? 'Cancelling...' : 'Cancel Request'}
                      </button>
                    </div>
                  )}

                  {req.status === 'accepted' && (
                    <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>The owner accepted your request! The listing is reserved for you.</span>
                      </div>
                      <button
                        id={`confirm-received-btn-${req.id}`}
                        onClick={() => handleConfirmCompletion(req.listingId, req.id, req.listingTitle)}
                        disabled={actionInProgressId === req.id}
                        className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-stone-950 text-xs font-extrabold transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{actionInProgressId === req.id ? 'Confirming...' : 'Confirm Received / Complete'}</span>
                      </button>
                    </div>
                  )}

                  {req.status === 'rejected' && (
                    <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/30 text-rose-300 text-xs flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>The owner declined this request.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};
