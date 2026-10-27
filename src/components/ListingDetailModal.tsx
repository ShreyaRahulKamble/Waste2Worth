import React, { useEffect, useState } from 'react';
import type { WastePost, ListingRequest } from '../types/index.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  getPostActionType,
  getPostMaterial,
  getNormalizedStatus,
  getRequestTypeFromAction,
  getRequestButtonLabel,
  createListingRequest,
  getExistingActiveRequest,
  formatFriendlyError,
  ensurePostEnvironmentalImpact,
} from '../services/db.ts';
import { getOrComputePostImpact } from '../services/environmentalImpact.ts';
import {
  X,
  Sparkles,
  Tag,
  MapPin,
  Calendar,
  Layers,
  ShieldCheck,
  Lightbulb,
  Leaf,
  DollarSign,
  Package,
  Clock,
  User,
  ExternalLink,
  Wrench,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Repeat,
  ShoppingBag,
  Inbox,
  ArrowRight,
  Sprout,
  Droplets,
  Zap,
  TreePine,
  Scale,
  Info,
} from 'lucide-react';

interface ListingDetailModalProps {
  post: WastePost | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({
  post,
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { currentUser, userProfile } = useAuth();

  // Exchange offer state
  const [offerDescription, setOfferDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<ListingRequest | null>(null);

  // Existing active request check
  const [existingRequest, setExistingRequest] = useState<ListingRequest | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Reset & check existing request whenever post or modal opens
  useEffect(() => {
    if (!isOpen || !post) {
      setOfferDescription('');
      setSubmitError(null);
      setSubmitSuccess(null);
      setExistingRequest(null);
      return;
    }

    setOfferDescription('');
    setSubmitError(null);
    setSubmitSuccess(null);

    async function checkUserRequest() {
      if (!currentUser || !post) return;
      try {
        setCheckingExisting(true);
        const existing = await getExistingActiveRequest(post.id, currentUser.uid);
        setExistingRequest(existing);
      } catch (err) {
        console.error('Error checking existing active request:', err);
      } finally {
        setCheckingExisting(false);
      }
    }

    checkUserRequest();
  }, [isOpen, post, currentUser]);

  if (!isOpen || !post) return null;

  const actionType = getPostActionType(post);
  const material = getPostMaterial(post);
  const normalizedStatus = getNormalizedStatus(post.status);
  const aiAnalysis = post.aiAnalysis;

  const isOwner = Boolean(currentUser && currentUser.uid === post.ownerId);
  const isListingActive = normalizedStatus === 'active';
  const isExchange = actionType.toLowerCase() === 'exchange';
  const requestType = getRequestTypeFromAction(actionType);
  const buttonLabel = getRequestButtonLabel(actionType);

  // Milestone 4.1: Compute environmental impact dynamically
  const impact = getOrComputePostImpact(post);

  // Lazily persist impact to Firestore if missing and current user is owner (safe & idempotent)
  useEffect(() => {
    if (isOpen && post && currentUser && currentUser.uid === post.ownerId && !post.environmentalImpact) {
      ensurePostEnvironmentalImpact(post, currentUser.uid);
    }
  }, [isOpen, post?.id, currentUser?.uid]);

  // Status badge styling
  const statusConfig = {
    active: {
      label: 'Active Listing',
      className: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/80',
    },
    reserved: {
      label: 'Reserved',
      className: 'bg-amber-950/80 text-amber-300 border-amber-600/80',
    },
    completed: {
      label: 'Completed',
      className: 'bg-stone-800 text-stone-300 border-stone-600',
    },
  }[normalizedStatus];

  // Price & Valuation Display
  const isFree = !post.estimatedPrice || post.estimatedPrice === 0;
  const hasAIEstimate = Boolean(
    aiAnalysis?.estimatedValue &&
      (aiAnalysis.estimatedValue.min > 0 || aiAnalysis.estimatedValue.max > 0)
  );

  const formattedDate = post.createdAt
    ? new Date(post.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recently';

  // Handle request submission
  const handleSubmitRequest = async () => {
    if (!currentUser) {
      if (onNavigate) {
        onClose();
        onNavigate('/login');
      }
      return;
    }

    if (isOwner) {
      setSubmitError('Action blocked: You cannot submit a request for your own listing.');
      return;
    }

    if (!isListingActive) {
      setSubmitError(`Listing unavailable: This item is currently marked as "${normalizedStatus}".`);
      return;
    }

    if (isExchange && !offerDescription.trim()) {
      setSubmitError('Please describe what item or service you are offering in exchange.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const created = await createListingRequest({
        listingId: post.id,
        listingOwnerId: post.ownerId,
        requesterId: currentUser.uid,
        requestType,
        offerDescription: isExchange ? offerDescription.trim() : undefined,
        listingTitle: post.title,
        listingImageUrl: post.imageUrl,
        listingCategory: post.category,
        listingMaterial: material,
        listingActionType: actionType,
        listingPrice: post.estimatedPrice,
        listingLocation: post.location,
        requesterName: userProfile?.name || currentUser.displayName || currentUser.email || 'Campus Member',
        requesterEmail: currentUser.email || '',
        ownerName: post.ownerName,
      });

      setSubmitSuccess(created);
      setExistingRequest(created);
    } catch (err: any) {
      console.error('Request creation error:', err);
      setSubmitError(formatFriendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="listing-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="listing-detail-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-3xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden z-10 my-auto flex flex-col max-h-[92vh]">
        {/* Modal Top Header Bar with Close */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 sm:px-6 py-4 bg-stone-900/95 backdrop-blur-md border-b border-stone-800">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusConfig.className}`}
            >
              {statusConfig.label}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
              {actionType}
            </span>
            {post.aiAnalyzed && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-950/80 text-teal-300 border border-teal-700/80">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>AI Verified</span>
              </span>
            )}
          </div>

          <button
            id="modal-close-button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Main Visual & Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Image Preview */}
            <div className="relative aspect-[4/3] rounded-2xl bg-stone-950 border border-stone-800 overflow-hidden flex items-center justify-center group">
              {post.imageUrl ? (
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-6 text-stone-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-stone-600" />
                  <p className="text-xs font-medium">No Image Uploaded</p>
                  <p className="text-[11px] text-stone-600 mt-1">{post.category}</p>
                </div>
              )}

              {/* Price floating tag on image */}
              <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-stone-950/90 border border-stone-700/80 text-white font-mono font-bold text-sm shadow-lg backdrop-blur-sm">
                {isFree ? 'FREE / DONATION' : `₹${post.estimatedPrice}`}
              </div>
            </div>

            {/* Quick Specs & Valuation */}
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  {post.category} • {material}
                </span>
                <h2
                  id="listing-detail-title"
                  className="text-xl sm:text-2xl font-black text-white mt-1 leading-snug"
                >
                  {post.title}
                </h2>
              </div>

              {/* Price & AI Estimated Value Highlight */}
              <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400 font-medium">Listing Price</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">
                    {isFree ? 'Free (Zero Cost)' : `₹${post.estimatedPrice} INR`}
                  </span>
                </div>

                {hasAIEstimate && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-850">
                    <span className="text-teal-300 font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      <span>AI Estimated Value</span>
                    </span>
                    <span className="text-teal-200 font-mono font-semibold">
                      ₹{aiAnalysis!.estimatedValue.min} – ₹{aiAnalysis!.estimatedValue.max} INR
                    </span>
                  </div>
                )}
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-stone-950/40 border border-stone-800/80">
                  <span className="text-stone-500 block text-[10px] uppercase font-bold tracking-wider">
                    Material
                  </span>
                  <span className="text-stone-200 font-medium truncate block mt-0.5">
                    {material}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-stone-950/40 border border-stone-800/80">
                  <span className="text-stone-500 block text-[10px] uppercase font-bold tracking-wider">
                    Condition
                  </span>
                  <span className="text-stone-200 font-medium truncate block mt-0.5">
                    {post.condition || 'Good'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-stone-950/40 border border-stone-800/80">
                  <span className="text-stone-500 block text-[10px] uppercase font-bold tracking-wider">
                    Quantity
                  </span>
                  <span className="text-stone-200 font-medium truncate block mt-0.5">
                    {post.quantity || '1 unit'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-stone-950/40 border border-stone-800/80">
                  <span className="text-stone-500 block text-[10px] uppercase font-bold tracking-wider">
                    Action Type
                  </span>
                  <span className="text-emerald-400 font-semibold truncate block mt-0.5">
                    {actionType}
                  </span>
                </div>
              </div>

              {/* Location & Date */}
              <div className="space-y-1.5 text-xs text-stone-400 pt-1">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{post.location || 'Local Campus Community'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  <span>Posted on {formattedDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  <span>
                    Listed by <strong className="text-stone-200">{post.ownerName}</strong>
                    {post.ownerCollege && ` (${post.ownerCollege})`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Description & Details
            </h3>
            <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 text-stone-300 text-sm leading-relaxed whitespace-pre-line">
              {post.description?.trim() ? (
                post.description
              ) : (
                <span className="text-stone-500 italic">No detailed description provided.</span>
              )}
            </div>
          </div>

          {/* AI Circular Intelligence Card (When aiAnalyzed is true) */}
          {aiAnalysis && (
            <div className="rounded-2xl border border-teal-800/60 bg-teal-950/20 p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-teal-500/10 text-teal-300 border border-teal-500/30">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-teal-200">
                      Gemini Multimodal Waste Intelligence
                    </h3>
                    <p className="text-[11px] text-teal-400/80">
                      Automated classification & circular routing recommendation
                    </p>
                  </div>
                </div>

                {aiAnalysis.confidence !== undefined && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-900/60 text-teal-300 border border-teal-700/60">
                    {Math.round(aiAnalysis.confidence * 100)}% Confidence
                  </span>
                )}
              </div>

              {/* AI Object Identification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-stone-950/60 border border-teal-900/40">
                  <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">
                    AI Object Identified
                  </span>
                  <span className="text-stone-100 font-semibold mt-0.5 block">
                    {aiAnalysis.objectName || post.title}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-stone-950/60 border border-teal-900/40">
                  <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">
                    Recommended Action
                  </span>
                  <span className="text-emerald-400 font-semibold capitalize mt-0.5 block">
                    {aiAnalysis.bestAction || actionType}
                  </span>
                </div>
              </div>

              {/* AI Reuse Ideas */}
              {aiAnalysis.reuseIdeas && aiAnalysis.reuseIdeas.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-300">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span>Creative Upcycle & Reuse Ideas</span>
                  </div>
                  <ul className="grid grid-cols-1 gap-2">
                    {aiAnalysis.reuseIdeas.map((idea, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-stone-300 p-2.5 rounded-xl bg-stone-950/50 border border-stone-800/80 flex items-start gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        <span>{idea}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Environmental Advice */}
              {aiAnalysis.environmentalAdvice && (
                <div className="space-y-1.5 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                    <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Environmental Impact & Recycling Advice</span>
                  </div>
                  <p className="text-stone-300 leading-relaxed pl-5">
                    {aiAnalysis.environmentalAdvice}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ENVIRONMENTAL IMPACT ENGINE CARD (Milestone 4.1) */}
          <div
            id="environmental-impact-section"
            className="rounded-2xl border border-emerald-800/60 bg-emerald-950/20 p-5 space-y-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <Sprout className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>🌱 Estimated Impact</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                      {impact.category}
                    </span>
                  </h3>
                  <p className="text-[11px] text-emerald-300/80">
                    Estimated environmental benefit of circular retention vs disposal
                  </p>
                </div>
              </div>

              <span className="text-[11px] text-stone-400 font-medium">
                Based on category and estimated quantity
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Waste Diverted */}
              <div className="p-3.5 rounded-xl bg-stone-950/70 border border-emerald-900/40 space-y-1">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Waste Diverted</span>
                  <Scale className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-lg font-black text-white font-mono">
                  {impact.wasteDivertedKg} <span className="text-xs font-normal text-stone-400">kg</span>
                </div>
                <p className="text-[10px] text-stone-400">Kept out of municipal landfills</p>
              </div>

              {/* CO2e Avoided */}
              <div className="p-3.5 rounded-xl bg-stone-950/70 border border-emerald-900/40 space-y-1">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Estimated CO₂e Avoided</span>
                  <Leaf className="w-3.5 h-3.5 text-teal-400" />
                </div>
                <div className="text-lg font-black text-emerald-300 font-mono">
                  {impact.co2eAvoidedKg} <span className="text-xs font-normal text-emerald-400/80">kg CO₂e</span>
                </div>
                <p className="text-[10px] text-stone-400">Displaced virgin manufacturing footprint</p>
              </div>

              {/* Resource Savings (Water / Energy / Trees) */}
              <div className="p-3.5 rounded-xl bg-stone-950/70 border border-emerald-900/40 space-y-1">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Resource Savings</span>
                  {impact.resourceSavings?.waterLiters ? (
                    <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                  ) : impact.resourceSavings?.energyKwh ? (
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <TreePine className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
                <div className="text-lg font-black text-cyan-300 font-mono">
                  {impact.resourceSavings?.waterLiters ? (
                    <>
                      ~{impact.resourceSavings.waterLiters.toLocaleString()}{' '}
                      <span className="text-xs font-normal text-cyan-400/80">L Water</span>
                    </>
                  ) : impact.resourceSavings?.energyKwh ? (
                    <>
                      ~{impact.resourceSavings.energyKwh}{' '}
                      <span className="text-xs font-normal text-amber-400/80">kWh Energy</span>
                    </>
                  ) : impact.resourceSavings?.treesSaved ? (
                    <>
                      ~{impact.resourceSavings.treesSaved}{' '}
                      <span className="text-xs font-normal text-emerald-400/80">Trees</span>
                    </>
                  ) : (
                    <span className="text-sm font-semibold text-stone-300">Material Preserved</span>
                  )}
                </div>
                <p className="text-[10px] text-stone-400">Conservation vs raw resource extraction</p>
              </div>
            </div>

            {/* Context & Assumptions Bar */}
            <div className="p-3 rounded-xl bg-stone-950/50 border border-stone-800 text-[11px] text-stone-400 space-y-1">
              <div className="flex items-start gap-1.5 text-stone-300">
                <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{impact.assumption}</span>
              </div>
              <p className="text-[10px] text-stone-500 pl-5">
                Disclaimer: These are estimated environmental benefits based on circular economy baselines, not scientific laboratory measurements.
              </p>
            </div>
          </div>

          {/* REAL FIRESTORE MARKETPLACE REQUEST SECTION (Milestone 3.2) */}
          <div
            id="marketplace-request-section"
            className="p-5 rounded-2xl bg-gradient-to-b from-stone-900 to-stone-950 border border-emerald-900/50 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Marketplace Interaction
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  Connect & Request This Resource
                </h3>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                {requestType}
              </span>
            </div>

            {/* Error Message Display */}
            {submitError && (
              <div
                id="request-error-banner"
                className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/70 text-rose-200 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">{submitError}</div>
              </div>
            )}

            {/* Success Message Display */}
            {submitSuccess && (
              <div
                id="request-success-banner"
                className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700/80 text-emerald-100 text-xs space-y-2"
              >
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Request Created in Firestore!</span>
                </div>
                <p className="text-stone-300 leading-relaxed">
                  Your <strong>{submitSuccess.requestType}</strong> has been logged for{' '}
                  <span className="text-white font-semibold">{post.ownerName || 'the owner'}</span> with status{' '}
                  <span className="font-mono uppercase text-emerald-400 font-bold">pending</span>.
                </p>
                {onNavigate && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigate('/requests');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-200 font-bold underline mt-1"
                  >
                    <span>View in My Requests</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Validation States */}
            {!currentUser ? (
              /* 1. Unauthenticated User Block */
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-center space-y-2">
                <p className="text-xs text-stone-300">
                  You must be logged in with Firebase to submit a request on this listing.
                </p>
                <button
                  id="unauth-login-prompt-btn"
                  onClick={() => {
                    onClose();
                    if (onNavigate) onNavigate('/login');
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-stone-950 text-xs font-bold transition-colors"
                >
                  Log In to Submit Request
                </button>
              </div>
            ) : isOwner ? (
              /* 2. Owner blocked from requesting their own listing */
              <div
                id="owner-self-request-blocked"
                className="p-4 rounded-xl bg-stone-950/80 border border-stone-800 text-stone-400 text-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-stone-400 shrink-0" />
                  <span>You listed this resource. You cannot submit a request for your own listing.</span>
                </div>
                {onNavigate && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigate('/requests');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium whitespace-nowrap transition-colors"
                  >
                    View Requests Received
                  </button>
                )}
              </div>
            ) : !isListingActive ? (
              /* 3. Unavailable / Completed listing block */
              <div
                id="listing-unavailable-blocked"
                className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  This listing is currently <strong>{normalizedStatus}</strong>. It cannot accept new requests.
                </span>
              </div>
            ) : existingRequest && !submitSuccess ? (
              /* 4. Duplicate active request block */
              <div
                id="duplicate-request-blocked"
                className="p-4 rounded-xl bg-stone-950/80 border border-teal-800/60 text-xs space-y-2"
              >
                <div className="flex items-center gap-2 text-teal-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Active Request Already Submitted</span>
                </div>
                <p className="text-stone-300 leading-relaxed">
                  You already have an active{' '}
                  <strong className="text-white">{existingRequest.requestType}</strong> for this item.
                  Current status: <span className="font-mono text-teal-300 font-bold uppercase">{existingRequest.status}</span>.
                </p>
                {onNavigate && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigate('/requests');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-teal-300 hover:text-teal-200 font-bold underline"
                  >
                    <span>Check status in My Requests</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : !submitSuccess ? (
              /* 5. Request Submission Form */
              <div className="space-y-3">
                {/* For Exchange listings: enter offerDescription */}
                {isExchange && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="offer-description-input"
                      className="block text-xs font-bold text-stone-200"
                    >
                      What are you offering in exchange? <span className="text-emerald-400">*</span>
                    </label>
                    <textarea
                      id="offer-description-input"
                      rows={2}
                      value={offerDescription}
                      onChange={(e) => setOfferDescription(e.target.value)}
                      placeholder="e.g. I can exchange an old working desk lamp or electronic components."
                      className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-700/80 rounded-xl text-stone-100 text-xs placeholder-stone-500 focus:outline-none focus:border-emerald-500 transition-all resize-none"
                    />
                    <span className="text-[11px] text-stone-400">
                      The owner will see your offer description when reviewing this request.
                    </span>
                  </div>
                )}

                {/* Action Button */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    id="submit-marketplace-request-btn"
                    onClick={handleSubmitRequest}
                    disabled={submitting || checkingExisting}
                    className="flex-1 px-5 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                        <span>Sending Request to Firestore...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{buttonLabel}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
          <span className="text-[11px] text-stone-500 font-mono">
            Listing ID: {post.id.slice(0, 10)}...
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
