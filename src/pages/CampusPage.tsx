import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  getWastePosts,
  getPostActionType,
  getPostMaterial,
  getCommunityLeaderboard,
  getCommunityActivityFeed,
  getNormalizedStatus,
} from '../services/db.ts';
import { getOrComputePostImpact } from '../services/environmentalImpact.ts';
import type {
  WastePost,
  WasteCategory,
  LeaderboardEntry,
  CommunityFeedItem,
} from '../types/index.ts';
import { ListingDetailModal } from '../components/ListingDetailModal.tsx';
import {
  GraduationCap,
  MapPin,
  Users,
  Recycle,
  Sparkles,
  ArrowRight,
  Trophy,
  Activity,
  ShoppingBag,
  Filter,
  Search,
  Scale,
  Leaf,
  Award,
  Calendar,
  CheckCircle2,
  Package,
  Eye,
  Loader2,
  Info,
  Building2,
  Share2,
  Sparkle,
} from 'lucide-react';

interface CampusPageProps {
  onNavigate: (path: string) => void;
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
  'Reuse',
  'Donate',
  'Exchange',
  'Upcycle',
  'Sell',
  'Recycle',
] as const;

type ActionFilterType = (typeof ACTION_FILTERS)[number];

export const CampusPage: React.FC<CampusPageProps> = ({ onNavigate }) => {
  const { userProfile, currentUser } = useAuth();

  // Primary navigation tab within Campus Hub
  const [activeTab, setActiveTab] = useState<'listings' | 'leaderboard' | 'feed' | 'hubs'>('listings');

  // Campus scope filter: 'all' or 'my_campus'
  const [campusScope, setCampusScope] = useState<'all' | 'my_campus'>('all');

  // Category and Action filters for community listings
  const [selectedCategory, setSelectedCategory] = useState<WasteCategory | 'All'>('All');
  const [selectedAction, setSelectedAction] = useState<ActionFilterType>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Real Firestore Data
  const [posts, setPosts] = useState<WastePost[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [feedItems, setFeedItems] = useState<CommunityFeedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal inspection state
  const [selectedPost, setSelectedPost] = useState<WastePost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Load live Firestore data
  const loadCommunityData = async () => {
    try {
      setLoading(true);
      const [allPosts, leaderboardData, feedData] = await Promise.all([
        getWastePosts({ status: 'active' }),
        getCommunityLeaderboard(),
        getCommunityActivityFeed(35),
      ]);
      setPosts(allPosts);
      setLeaderboard(leaderboardData);
      setFeedItems(feedData);
    } catch (err) {
      console.error('Failed to load community data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommunityData();
  }, [currentUser]);

  // Filter listings based on category, action, search query, and campus scope
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      // Must be active
      if (getNormalizedStatus(post.status) !== 'active') return false;

      // Campus scope filter
      if (campusScope === 'my_campus' && userProfile?.college) {
        const userCol = userProfile.college.toLowerCase().trim();
        const postCol = (post.ownerCollege || '').toLowerCase().trim();
        const postLoc = (post.location || '').toLowerCase().trim();
        if (!postCol.includes(userCol) && !postLoc.includes(userCol)) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'All' && post.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      // Action filter
      if (selectedAction !== 'All') {
        const act = getPostActionType(post).toLowerCase();
        if (act !== selectedAction.toLowerCase()) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = post.title?.toLowerCase().includes(query);
        const matchDesc = post.description?.toLowerCase().includes(query);
        const matchMat = (post.material || '').toLowerCase().includes(query);
        const matchLoc = (post.location || '').toLowerCase().includes(query);
        const matchCollege = (post.ownerCollege || '').toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchMat && !matchLoc && !matchCollege) {
          return false;
        }
      }

      return true;
    });
  }, [posts, campusScope, selectedCategory, selectedAction, searchQuery, userProfile?.college]);

  const handleOpenListing = (post: WastePost) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleCloseListing = () => {
    setSelectedPost(null);
    setIsModalOpen(false);
  };

  const userCollege = userProfile?.college?.trim();

  return (
    <div id="campus-page-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-stone-900 to-stone-900 border border-emerald-800/40 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/60 text-emerald-300 text-xs font-semibold border border-emerald-700/60">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Campus & Community Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {userCollege ? `${userCollege} Circular Hub` : 'Inter-Campus Circular Network'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
            Discover surplus circular materials from university peers, track verified landfill diversion,
            and view the verified community EcoScore leaderboard.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          <button
            onClick={() => onNavigate('/upload')}
            className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2"
          >
            <Recycle className="w-4 h-4" />
            <span>Share Waste on Campus</span>
          </button>
          <button
            onClick={() => onNavigate('/marketplace')}
            className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs sm:text-sm transition-all border border-stone-700 flex items-center gap-2"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span>Marketplace</span>
          </button>
        </div>
      </div>

      {/* Campus Affiliation & Privacy Disclosure */}
      <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800 text-xs text-stone-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-0" />
          <span>
            {userCollege ? (
              <>
                Affiliated with <strong className="text-stone-200 font-semibold">{userCollege}</strong>.
                You can toggle between your institutional items and all collaborative campus communities.
              </>
            ) : (
              <>
                No campus specified in profile. You are browsing the general campus community network.
                Update your profile to connect with your specific campus hub.
              </>
            )}
          </span>
        </div>

        {userCollege && (
          <div className="flex items-center rounded-lg bg-stone-950 border border-stone-800 p-0.5 flex-shrink-0">
            <button
              onClick={() => setCampusScope('all')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                campusScope === 'all'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              All Campuses
            </button>
            <button
              onClick={() => setCampusScope('my_campus')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                campusScope === 'my_campus'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              My Campus
            </button>
          </div>
        )}
      </div>

      {/* Main Feature Tabs */}
      <div className="border-b border-stone-800 flex items-center gap-2 sm:gap-4 overflow-x-auto pb-1 text-sm">
        <button
          onClick={() => setActiveTab('listings')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'listings'
              ? 'border-emerald-400 text-emerald-300 bg-stone-900/60'
              : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900/30'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Community Listings ({filteredPosts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'leaderboard'
              ? 'border-emerald-400 text-emerald-300 bg-stone-900/60'
              : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900/30'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>EcoScore Leaderboard</span>
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'feed'
              ? 'border-emerald-400 text-emerald-300 bg-stone-900/60'
              : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900/30'
          }`}
        >
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Circular Activity Feed</span>
        </button>

        <button
          onClick={() => setActiveTab('hubs')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'hubs'
              ? 'border-emerald-400 text-emerald-300 bg-stone-900/60'
              : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900/30'
          }`}
        >
          <Building2 className="w-4 h-4 text-teal-400" />
          <span>Depots & Hub Programs</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center text-stone-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <span className="text-sm font-medium">Loading live campus records from Firestore...</span>
        </div>
      )}

      {/* =========================================================================
          TAB 1: AVAILABLE COMMUNITY LISTINGS
         ========================================================================= */}
      {!loading && activeTab === 'listings' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Filters Bar: Category, Action Type, Search */}
          <div className="p-4 sm:p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search community waste (cardboard, wood, PCB, fabric)..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-950 border border-stone-800 text-sm text-stone-200 placeholder:text-stone-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action Type Filter Dropdown / Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-semibold text-stone-400 flex items-center gap-1 flex-shrink-0">
                  <Filter className="w-3.5 h-3.5" /> Action:
                </span>
                {ACTION_FILTERS.map((act) => (
                  <button
                    key={act}
                    onClick={() => setSelectedAction(act)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      selectedAction === act
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-stone-950 text-stone-400 border border-stone-800 hover:text-stone-200'
                    }`}
                  >
                    {act}
                  </button>
                ))}
              </div>
            </div>

            {/* Waste Category Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-stone-800/80">
              <span className="text-xs font-semibold text-stone-400 flex-shrink-0">Category:</span>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-stone-200 text-stone-950 font-bold'
                      : 'bg-stone-950 text-stone-400 border border-stone-800 hover:text-stone-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Listings Grid */}
          {filteredPosts.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-stone-900/50 border border-stone-800 space-y-3">
              <Package className="w-10 h-10 text-stone-500 mx-auto" />
              <h3 className="text-base font-bold text-white">No Community Listings Match</h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto">
                No active waste listings match your current filters. Try resetting category and action filters or switch to All Campuses.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedAction('All');
                  setSearchQuery('');
                  setCampusScope('all');
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-stone-800 text-emerald-400 text-xs font-bold hover:bg-stone-700 transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPosts.map((post) => {
                const impact = getOrComputePostImpact(post);
                const actionType = getPostActionType(post);
                return (
                  <div
                    key={post.id}
                    onClick={() => handleOpenListing(post)}
                    className="cursor-pointer group rounded-2xl bg-stone-900 border border-stone-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between overflow-hidden shadow-sm"
                  >
                    <div>
                      {/* Image / Fallback Header */}
                      <div className="h-44 bg-stone-950 relative overflow-hidden flex items-center justify-center border-b border-stone-800/80">
                        {post.imageUrl ? (
                          <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-stone-600">
                            <Recycle className="w-8 h-8" />
                            <span className="text-xs font-mono uppercase">{post.category}</span>
                          </div>
                        )}

                        {/* Action Badge */}
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 shadow-md uppercase tracking-wider">
                            {actionType}
                          </span>
                        </div>

                        {/* Price / Free Badge */}
                        <div className="absolute top-3 right-3">
                          {post.estimatedPrice && post.estimatedPrice > 0 ? (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950/90 text-amber-300 border border-amber-800 shadow-md">
                              ₹{post.estimatedPrice}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-stone-900/90 text-emerald-400 border border-stone-700 shadow-md">
                              Free Handover
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 sm:p-5 space-y-3">
                        <div>
                          <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono mb-1">
                            <span>{post.category}</span>
                            <span>•</span>
                            <span>{getPostMaterial(post)}</span>
                            <span>•</span>
                            <span>{post.condition}</span>
                          </div>
                          <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                            {post.title}
                          </h3>
                        </div>

                        <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                          {post.description || 'No description provided.'}
                        </p>

                        {/* Environmental Impact Tag */}
                        <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                            <Scale className="w-3.5 h-3.5" />
                            <span>{impact.wasteDivertedKg} kg diverted</span>
                          </span>
                          <span className="text-stone-500 font-mono text-[11px]">
                            ~{impact.co2eAvoidedKg} kg CO₂e
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer with Owner / College info */}
                    <div className="p-4 bg-stone-950/60 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-400">
                      <div className="truncate max-w-[170px] space-y-0.5">
                        <div className="text-stone-300 font-semibold truncate">{post.ownerName}</div>
                        <div className="text-[10px] text-stone-500 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-500/70" />
                          <span>{post.ownerCollege || post.location || 'Campus Member'}</span>
                        </div>
                      </div>

                      <span className="text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1 text-[11px]">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: ECOSCORE LEADERBOARD
         ========================================================================= */}
      {!loading && activeTab === 'leaderboard' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Leaderboard Rules & Transparency Header */}
          <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">Verified EcoScore Leaderboard</h2>
              </div>
              <p className="text-xs text-stone-400 max-w-2xl leading-relaxed">
                Rankings reflect genuinely completed circular handovers verified in Firestore.
                Uploading, listing, or requesting does not grant points. No emails are ever published.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800 text-xs font-semibold">
                {leaderboard.length} Ranked Members
              </span>
            </div>
          </div>

          {leaderboard.length === 0 ? (
            /* Friendly Empty State */
            <div className="py-16 text-center rounded-2xl bg-stone-900/50 border border-stone-800 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400 mx-auto">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Be the First on the Leaderboard!</h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                No circular transfers have been completed yet. When an owner and recipient complete an exchange,
                donation, or marketplace item, verified EcoPoints will appear here automatically.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => setActiveTab('listings')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-stone-950 text-xs font-bold transition-all"
                >
                  Explore Available Items
                </button>
                <button
                  onClick={() => onNavigate('/upload')}
                  className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-all border border-stone-700"
                >
                  Share Waste Now
                </button>
              </div>
            </div>
          ) : (
            /* Leaderboard Table */
            <div className="rounded-2xl bg-stone-900 border border-stone-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-950/80 text-stone-400 border-b border-stone-800 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4 sm:px-6">Rank</th>
                      <th className="py-3.5 px-4 sm:px-6">Member</th>
                      <th className="py-3.5 px-4 sm:px-6">Affiliation / College</th>
                      <th className="py-3.5 px-4 sm:px-6 text-center">Completed Handovers</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Waste Diverted</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Total EcoPoints</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 font-medium">
                    {leaderboard.map((entry) => {
                      const isCurrentUser = currentUser?.uid === entry.userId;
                      return (
                        <tr
                          key={entry.userId}
                          className={`hover:bg-stone-800/40 transition-colors ${
                            isCurrentUser ? 'bg-emerald-950/20' : ''
                          }`}
                        >
                          {/* Rank with Medal icon */}
                          <td className="py-4 px-4 sm:px-6 font-mono font-bold">
                            {entry.rank === 1 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-stone-950 font-black shadow-sm">
                                🥇
                              </span>
                            ) : entry.rank === 2 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-stone-300 text-stone-950 font-black shadow-sm">
                                🥈
                              </span>
                            ) : entry.rank === 3 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700 text-white font-black shadow-sm">
                                🥉
                              </span>
                            ) : (
                              <span className="text-stone-400 font-bold ml-2">#{entry.rank}</span>
                            )}
                          </td>

                          {/* Member Name */}
                          <td className="py-4 px-4 sm:px-6">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{entry.displayName}</span>
                              {isCurrentUser && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  You
                                </span>
                              )}
                            </div>
                          </td>

                          {/* College Affiliation */}
                          <td className="py-4 px-4 sm:px-6 text-stone-300">
                            <div className="flex items-center gap-1.5">
                              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{entry.college || 'Campus Community'}</span>
                            </div>
                          </td>

                          {/* Completed Actions */}
                          <td className="py-4 px-4 sm:px-6 text-center font-mono font-bold text-stone-200">
                            {entry.completedActionsCount}
                          </td>

                          {/* Waste Diverted */}
                          <td className="py-4 px-4 sm:px-6 text-right font-mono text-stone-300">
                            {entry.wasteDivertedKg.toFixed(1)} kg
                          </td>

                          {/* Total EcoPoints */}
                          <td className="py-4 px-4 sm:px-6 text-right">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-black font-mono text-sm">
                              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{entry.totalEcoPoints}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: CIRCULAR ACTIVITY FEED
         ========================================================================= */}
      {!loading && activeTab === 'feed' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <span>Live Community Circular Feed</span>
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                Real-time stream of circular items listed and completed across universities.
              </p>
            </div>
          </div>

          {feedItems.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-stone-900/50 border border-stone-800 space-y-3">
              <Activity className="w-10 h-10 text-stone-500 mx-auto" />
              <h3 className="text-base font-bold text-white">No Circular Activity Recorded Yet</h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto">
                Be the first to list a material or complete a circular exchange on campus!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedItems.map((item) => {
                const isCompleted = item.type === 'completed_action';
                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 rounded-2xl bg-stone-900 border border-stone-800 hover:border-stone-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isCompleted
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            }`}
                          >
                            {isCompleted ? 'Verified Handoff' : 'New Listing'}
                          </span>
                          <span className="text-xs font-bold text-white">{item.title}</span>
                          <span className="text-xs text-stone-400">({item.category})</span>
                        </div>

                        <p className="text-xs text-stone-400">
                          {isCompleted ? (
                            <>
                              Completed circular transfer by <strong className="text-stone-200">{item.actorName}</strong>
                              {item.actorCollege && ` at ${item.actorCollege}`}
                            </>
                          ) : (
                            <>
                              Shared for <strong className="text-stone-200 uppercase">{item.actionType}</strong> by{' '}
                              <strong className="text-stone-200">{item.actorName}</strong>
                              {item.actorCollege && ` at ${item.actorCollege}`}
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono self-end sm:self-auto flex-shrink-0">
                      {item.wasteDivertedKg !== undefined && item.wasteDivertedKg > 0 && (
                        <div className="text-right">
                          <span className="text-stone-300 font-bold">{item.wasteDivertedKg} kg</span>
                          <div className="text-[10px] text-stone-500">diverted</div>
                        </div>
                      )}

                      {item.ecoPointsEarned !== undefined && (
                        <div className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                          +{item.ecoPointsEarned} pts
                        </div>
                      )}

                      <div className="text-[10px] text-stone-500">
                        {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Recent'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: CAMPUS HUBS & CURATED DEPOT PROGRAMS
         ========================================================================= */}
      {!loading && activeTab === 'hubs' && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h2 className="text-lg font-bold text-white">Campus Circular Dropoffs & Maker Hubs</h2>
            <p className="text-xs text-stone-400 mt-1">
              Designated collection points and collaborative circular programs operating on campus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 flex items-center justify-center text-emerald-400">
                <Recycle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">E-Waste & Electronics Drive</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Consolidate circuit boards, dead laptops, soldering leads, and cables for precious metals recycling or student hardware rebuilds.
              </p>
              <div className="pt-2 text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>Engineering Lab Dropoff #2</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-950 flex items-center justify-center text-teal-400">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Dorm Move-Out Circular Swap</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Prevent storage bins, desk lamps, mini fridges, and textbooks from hitting campus dumpsters at semester conclusion.
              </p>
              <div className="pt-2 text-xs font-semibold text-teal-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>Student Union Quad</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 flex items-center justify-center text-cyan-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Makerspace Upcycling Club</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Work with student designers to turn discarded polymers and scrap wood into 3D filament spools and modular furniture.
              </p>
              <div className="pt-2 text-xs font-semibold text-cyan-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Weekly Open Studio Nights</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Listing Detail Modal for inspection & requesting */}
      <ListingDetailModal
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={handleCloseListing}
        onNavigate={onNavigate}
      />
    </div>
  );
};
