import React, { useEffect, useState, useMemo } from 'react';
import {
  getWastePosts,
  getPostActionType,
  getPostMaterial,
  getNormalizedStatus,
} from '../services/db.ts';
import { getOrComputePostImpact } from '../services/environmentalImpact.ts';
import type { WastePost, WasteCategory, ItemCondition } from '../types/index.ts';
import { ListingDetailModal } from '../components/ListingDetailModal.tsx';
import {
  ShoppingBag,
  Search,
  Filter,
  MapPin,
  Tag,
  Sparkles,
  Loader2,
  RefreshCw,
  PlusCircle,
  AlertCircle,
  Package,
  X,
  Eye,
  SlidersHorizontal,
  Inbox,
} from 'lucide-react';

interface MarketplacePageProps {
  onNavigate: (path: string) => void;
  currentUserId?: string;
}

const CATEGORIES: (WasteCategory | 'All')[] = [
  'All',
  'Plastic',
  'Paper',
  'Cardboard',
  'Glass',
  'Metal',
  'Wood',
  'Textile',
  'Electronics',
  'Furniture',
  'Organic',
  'Other',
];

const ACTION_FILTERS = [
  'All',
  'Sell',
  'Donate',
  'Exchange',
  'Reuse',
  'Upcycle',
  'Recycle',
] as const;

type ActionFilterType = (typeof ACTION_FILTERS)[number];

const CONDITIONS: (ItemCondition | 'All')[] = [
  'All',
  'New / Unused',
  'Good',
  'Fair',
  'Needs Repair',
  'Scrap / Raw Material',
];

export const MarketplacePage: React.FC<MarketplacePageProps> = ({ onNavigate }) => {
  const [posts, setPosts] = useState<WastePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<ActionFilterType>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCondition, setSelectedCondition] = useState<string>('All');
  // Default status: 'active' (Only active listings normally appear in the available marketplace)
  const [statusFilter, setStatusFilter] = useState<'active' | 'reserved' | 'completed' | 'all'>('active');

  // Selected post for modal
  const [selectedPost, setSelectedPost] = useState<WastePost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError(null);
      // Query Firestore via db.ts
      const data = await getWastePosts({
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        action: selectedAction !== 'All' ? selectedAction : undefined,
        condition: selectedCondition !== 'All' ? selectedCondition : undefined,
        status: statusFilter,
      });
      setPosts(data);
    } catch (err: any) {
      console.error('Marketplace fetch error:', err);
      setError('Could not load marketplace listings from Firestore. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [selectedCategory, selectedAction, selectedCondition, statusFilter]);

  // Client-side search across title, category, material, and AI object name
  const filteredPosts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return posts;

    return posts.filter((post) => {
      // 1. Title match
      const titleMatch = post.title?.toLowerCase().includes(term);

      // 2. Category match
      const categoryMatch = post.category?.toLowerCase().includes(term);

      // 3. Material match (from post.material or AI analysis)
      const material = getPostMaterial(post).toLowerCase();
      const materialMatch = material.includes(term);

      // 4. AI Object Name match, when available
      const aiObjectName = post.aiAnalysis?.objectName?.toLowerCase();
      const objectNameMatch = aiObjectName ? aiObjectName.includes(term) : false;

      // 5. Description match (user-friendly fallback)
      const descriptionMatch = post.description?.toLowerCase().includes(term);

      return titleMatch || categoryMatch || materialMatch || objectNameMatch || descriptionMatch;
    });
  }, [posts, searchTerm]);

  // Compute counts for action filters based on current listings (when no action filter is applied)
  const actionCounts = useMemo(() => {
    const counts: Record<string, number> = { All: posts.length };
    ACTION_FILTERS.forEach((act) => {
      if (act !== 'All') counts[act] = 0;
    });
    posts.forEach((p) => {
      const act = getPostActionType(p);
      const key = ACTION_FILTERS.find((f) => f.toLowerCase() === act.toLowerCase());
      if (key && key !== 'All') {
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [posts]);

  const handleOpenListing = (post: WastePost) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleCloseListing = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedAction('All');
    setSelectedCategory('All');
    setSelectedCondition('All');
    setStatusFilter('active');
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    selectedAction !== 'All' ||
    selectedCategory !== 'All' ||
    selectedCondition !== 'All' ||
    statusFilter !== 'active';

  return (
    <div id="marketplace-page-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <span>Circular Economy Marketplace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Live Waste & Materials Marketplace</h1>
          <p className="text-sm text-stone-400 mt-1">
            Discover and route scrap materials, surplus goods, and reusable items directly from campus members.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="marketplace-refresh-btn"
            onClick={fetchListings}
            className="p-2.5 rounded-xl border border-stone-800 bg-stone-900 text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
            title="Refresh listings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            id="marketplace-requests-btn"
            onClick={() => onNavigate('/requests')}
            className="px-4 py-2.5 rounded-xl border border-stone-800 bg-stone-900 hover:bg-stone-800 text-stone-200 font-bold text-xs sm:text-sm transition-all flex items-center gap-2"
          >
            <Inbox className="w-4 h-4 text-emerald-400" />
            <span>Requests</span>
          </button>
          <button
            id="marketplace-add-item-btn"
            onClick={() => onNavigate('/upload')}
            className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>List Waste</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="p-4 sm:p-5 rounded-3xl bg-stone-900 border border-stone-800 space-y-4 shadow-lg">
        {/* Search Box */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="marketplace-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, category, material, or AI object name..."
            className="w-full pl-10 pr-10 py-3 bg-stone-950 border border-stone-700/80 rounded-2xl text-stone-100 text-sm placeholder-stone-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-200"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 1. Functional Action Filters (All, Sell, Donate, Exchange, Reuse, Upcycle, Recycle) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-emerald-400" />
              <span>Action Type</span>
            </span>
            {selectedAction !== 'All' && (
              <button
                onClick={() => setSelectedAction('All')}
                className="text-xs text-emerald-400 hover:underline font-medium"
              >
                Reset Action
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-wrap">
            {ACTION_FILTERS.map((action) => {
              const isSelected = selectedAction === action;
              return (
                <button
                  key={action}
                  id={`action-filter-${action.toLowerCase()}`}
                  onClick={() => setSelectedAction(action)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-400 text-stone-950 font-bold shadow-md shadow-emerald-500/20'
                      : 'bg-stone-950 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
                  }`}
                >
                  <span>{action}</span>
                  {actionCounts[action] !== undefined && actionCounts[action] > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected
                          ? 'bg-stone-900 text-emerald-300 font-bold'
                          : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {actionCounts[action]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Filter Row: Category, Condition, and Status */}
        <div className="pt-2 border-t border-stone-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Category Filter */}
          <div>
            <label
              htmlFor="filter-category-select"
              className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5"
            >
              Category
            </label>
            <select
              id="filter-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-700/80 rounded-xl text-stone-200 text-xs focus:outline-none focus:border-emerald-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Condition Filter */}
          <div>
            <label
              htmlFor="filter-condition-select"
              className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5"
            >
              Condition
            </label>
            <select
              id="filter-condition-select"
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-700/80 rounded-xl text-stone-200 text-xs focus:outline-none focus:border-emerald-500"
            >
              {CONDITIONS.map((cond) => (
                <option key={cond} value={cond}>
                  {cond === 'All' ? 'All Conditions' : cond}
                </option>
              ))}
            </select>
          </div>

          {/* Listing Status Filter */}
          <div>
            <label
              htmlFor="filter-status-select"
              className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5"
            >
              Listing Status
            </label>
            <select
              id="filter-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-700/80 rounded-xl text-stone-200 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="active">Active Only (Default)</option>
              <option value="reserved">Reserved</option>
              <option value="completed">Completed</option>
              <option value="all">All Statuses</option>
            </select>
          </div>
        </div>

        {/* Status bar showing current result count & quick clear */}
        <div className="flex items-center justify-between text-xs text-stone-400 pt-1">
          <span>
            Showing <strong className="text-white">{filteredPosts.length}</strong>{' '}
            {statusFilter === 'active' ? 'active' : statusFilter === 'all' ? '' : statusFilter} listing{filteredPosts.length === 1 ? '' : 's'}
            {searchTerm && ` matching "${searchTerm}"`}
          </span>

          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="text-stone-400 hover:text-white flex items-center gap-1 text-xs transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear all filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-200 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchListings}
            className="px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-100 text-xs font-bold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-stone-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <span className="text-sm font-medium">Fetching real Firestore waste listings...</span>
        </div>
      ) : filteredPosts.length === 0 ? (
        /* Empty states */
        hasActiveFilters ? (
          <div
            id="marketplace-filtered-empty"
            className="p-10 sm:p-14 rounded-3xl bg-stone-900 border border-stone-800 text-center space-y-4 max-w-lg mx-auto"
          >
            <div className="w-14 h-14 rounded-2xl bg-stone-800/80 mx-auto flex items-center justify-center text-stone-400">
              <SlidersHorizontal className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No matching listings found</h3>
              <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">
                No waste listings matched your search keyword or selected filters. Try changing or clearing your criteria.
              </p>
            </div>
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Reset Filters</span>
            </button>
          </div>
        ) : (
          <div
            id="marketplace-empty-state"
            className="p-12 sm:p-16 rounded-3xl bg-stone-900 border border-dashed border-stone-800 text-center space-y-4 max-w-lg mx-auto"
          >
            <div className="w-16 h-16 rounded-2xl bg-stone-800/80 mx-auto flex items-center justify-center text-stone-500">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No items available yet.</h3>
              <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">
                Be the first in your campus or local community to upload unwanted materials, scrap, or equipment.
              </p>
            </div>
            <button
              id="empty-marketplace-upload-btn"
              onClick={() => onNavigate('/upload')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-bold text-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Upload the First Listing</span>
            </button>
          </div>
        )
      ) : (
        /* Real Firestore Listings Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => {
            const actionType = getPostActionType(post);
            const material = getPostMaterial(post);
            const normStatus = getNormalizedStatus(post.status);
            const isFree = !post.estimatedPrice || post.estimatedPrice === 0;

            const statusBadgeConfig = {
              active: {
                label: 'Active',
                className: 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80',
              },
              reserved: {
                label: 'Reserved',
                className: 'bg-amber-950/90 text-amber-300 border-amber-700/80',
              },
              completed: {
                label: 'Completed',
                className: 'bg-stone-800/90 text-stone-300 border-stone-700',
              },
            }[normStatus];

            return (
              <div
                key={post.id}
                onClick={() => handleOpenListing(post)}
                className="bg-stone-900 border border-stone-800 hover:border-emerald-500/50 rounded-3xl overflow-hidden transition-all flex flex-col justify-between group shadow-sm hover:shadow-emerald-950/30 cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleOpenListing(post);
                  }
                }}
              >
                <div>
                  {/* Image / Thumbnail Container */}
                  <div className="relative aspect-[16/10] bg-stone-950 border-b border-stone-800 overflow-hidden flex items-center justify-center">
                    {post.imageUrl ? (
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Package className="w-10 h-10 text-stone-600 mx-auto mb-1" />
                        <span className="text-xs text-stone-500 font-mono">{post.category}</span>
                      </div>
                    )}

                    {/* Badge Overlay */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                      {/* Status Badge */}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border backdrop-blur-md ${statusBadgeConfig.className}`}
                      >
                        {statusBadgeConfig.label}
                      </span>

                      {/* Action Type Badge */}
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-900/90 text-stone-200 border border-stone-700/80 backdrop-blur-md">
                        {actionType}
                      </span>

                      {/* AI Verified Badge */}
                      {post.aiAnalyzed && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-950/90 text-teal-300 border border-teal-600/80 backdrop-blur-md flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-teal-400" />
                          <span>AI Verified</span>
                        </span>
                      )}
                    </div>

                    {/* Price Badge */}
                    <span className="absolute top-3 right-3 text-xs font-black px-2.5 py-1 rounded-xl bg-stone-950/90 text-white border border-stone-700/80 backdrop-blur-md font-mono">
                      {isFree ? 'FREE' : `₹${post.estimatedPrice}`}
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                        {post.title}
                      </h3>
                      <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                        {post.description || 'No detailed description provided.'}
                      </p>
                    </div>

                    {/* Category, Material, Condition Tags */}
                    <div className="space-y-1.5 pt-2 border-t border-stone-800/80 text-[11px] text-stone-400">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 truncate">
                          <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">
                            {post.category} • {material}
                          </span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-stone-300 shrink-0 font-medium">
                          {post.condition || 'Good'}
                        </span>
                      </div>

                      {/* AI Object Name if present */}
                      {post.aiAnalysis?.objectName && (
                        <div className="text-[10px] text-teal-400/90 font-mono truncate">
                          AI: {post.aiAnalysis.objectName}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-stone-400 truncate pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="truncate">{post.location || 'Campus Hub'}</span>
                      </div>

                      {/* Estimated Impact Pill */}
                      <div className="pt-2 border-t border-stone-850 flex items-center justify-between text-[10px] text-emerald-400/90 font-mono">
                        <span className="flex items-center gap-1">
                          <span>🌱</span>
                          <span>~{getOrComputePostImpact(post).co2eAvoidedKg} kg CO₂e avoided</span>
                        </span>
                        <span className="text-stone-500 font-sans">
                          {getOrComputePostImpact(post).wasteDivertedKg} kg diverted
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-4 bg-stone-950/50 border-t border-stone-800/60 flex items-center justify-between text-xs">
                  <span className="text-stone-400 truncate max-w-[140px]">
                    By <strong className="text-stone-300">{post.ownerName}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-stone-500">
                      {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Recent'}
                    </span>
                    <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 text-[11px] font-semibold">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Listing Detail Modal */}
      <ListingDetailModal
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={handleCloseListing}
        onNavigate={onNavigate}
      />
    </div>
  );
};
