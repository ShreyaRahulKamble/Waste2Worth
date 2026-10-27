import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { getUserActivities } from '../services/db.ts';
import type { UserActivity } from '../types/index.ts';
import {
  Activity,
  Clock,
  Package,
  PlusCircle,
  Loader2,
  Calendar,
  CheckCircle2,
  XCircle,
  Repeat,
  HeartHandshake,
  ShoppingBag,
  Sparkles,
  Inbox,
  Send,
  Check,
  Award,
} from 'lucide-react';

interface ActivityPageProps {
  onNavigate: (path: string) => void;
}

export const ActivityPage: React.FC<ActivityPageProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!currentUser) return;
      try {
        setLoading(true);
        const data = await getUserActivities(currentUser.uid);
        setActivities(data);
      } catch (err) {
        console.error('Error fetching activities:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [currentUser]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'purchase_request_created':
        return (
          <div className="w-10 h-10 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
            <ShoppingBag className="w-5 h-5" />
          </div>
        );
      case 'donation_request_created':
        return (
          <div className="w-10 h-10 rounded-lg bg-teal-950/80 border border-teal-800/60 flex items-center justify-center text-teal-400 flex-shrink-0 mt-0.5">
            <HeartHandshake className="w-5 h-5" />
          </div>
        );
      case 'exchange_request_created':
        return (
          <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-0.5">
            <Repeat className="w-5 h-5" />
          </div>
        );
      case 'interest_request_created':
        return (
          <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
        );
      case 'request_accepted':
        return (
          <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'request_rejected':
        return (
          <div className="w-10 h-10 rounded-lg bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400 flex-shrink-0 mt-0.5">
            <XCircle className="w-5 h-5" />
          </div>
        );
      case 'listing_completed':
        return (
          <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5 shadow-sm">
            <Award className="w-5 h-5" />
          </div>
        );
      case 'listing_created':
      case 'post_created':
      default:
        return (
          <div className="w-10 h-10 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
            <Package className="w-5 h-5" />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-stone-400 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
        <span className="text-sm font-medium">Loading your activity history...</span>
      </div>
    );
  }

  return (
    <div id="activity-page-container" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
          <span>Audit Log & Timeline</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">My Circular Activity</h1>
        <p className="text-sm text-stone-400 mt-1">
          Every listing, request, exchange, and community circular action is recorded here in real-time.
        </p>
      </div>

      {activities.length === 0 ? (
        /* Empty state mandated by user request: "No activity yet. Start by uploading your first item." */
        <div
          id="activity-empty-state"
          className="p-12 sm:p-16 rounded-2xl bg-stone-900 border border-dashed border-stone-800 text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-stone-800/80 mx-auto flex items-center justify-center text-stone-500">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No activity yet. Start by uploading your first item.</h3>
            <p className="text-xs text-stone-400 mt-1.5 max-w-sm mx-auto">
              Once you list, request, or exchange items, your chronological sustainability timeline will appear here.
            </p>
          </div>
          <button
            id="activity-start-upload-btn"
            onClick={() => onNavigate('/upload')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-bold text-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Upload an Item</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((act) => (
            <div
              key={act.id}
              className="p-5 rounded-xl bg-stone-900 border border-stone-800 flex items-start gap-4 hover:border-stone-700 transition-colors"
            >
              {getActivityIcon(act.type)}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h3 className="text-sm font-bold text-white truncate">{act.title}</h3>
                  <span className="text-[11px] text-stone-500 font-mono">
                    {new Date(act.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">{act.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
