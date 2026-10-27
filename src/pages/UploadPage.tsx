import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  createWastePost,
  updateWastePost,
  getWastePostById,
  saveAIAnalysisToPost,
  logUserActivity,
} from '../services/db.ts';
import { calculateEnvironmentalImpact } from '../services/environmentalImpact.ts';
import type {
  WasteCategory,
  IntendedAction,
  ItemCondition,
  StructuredAIAnalysis,
  BestActionType,
} from '../types/index.ts';
import {
  Upload,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  DollarSign,
  MapPin,
  Tag,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Share2,
  BookOpen,
  ArrowRight,
  Clock,
  Hammer,
  Leaf,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface UploadPageProps {
  onNavigate: (path: string) => void;
}

const CATEGORIES: WasteCategory[] = [
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

const ACTIONS: IntendedAction[] = [
  'Reuse',
  'Sell',
  'Donate',
  'Exchange',
  'Upcycle',
  'Recycle',
];

const CONDITIONS: ItemCondition[] = [
  'New / Unused',
  'Good',
  'Fair',
  'Needs Repair',
  'Scrap / Raw Material',
];

// Verified high-resolution real test image presets (Milestone 2 Acceptance Suite)
const REAL_IMAGE_PRESETS = [
  {
    name: 'Plastic Bottle',
    icon: '🍾',
    url: 'https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?auto=format&fit=crop&w=800&q=80',
    category: 'Plastic' as WasteCategory,
  },
  {
    name: 'Cardboard Box',
    icon: '📦',
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    category: 'Cardboard' as WasteCategory,
  },
  {
    name: 'Old Wooden Furniture',
    icon: '🪑',
    url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    category: 'Furniture' as WasteCategory,
  },
  {
    name: 'Old Clothes / Textile',
    icon: '👕',
    url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80',
    category: 'Textile' as WasteCategory,
  },
  {
    name: 'Electronic Item',
    icon: '💻',
    url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80',
    category: 'Electronics' as WasteCategory,
  },
];

export const UploadPage: React.FC<UploadPageProps> = ({ onNavigate }) => {
  const { currentUser, userProfile } = useAuth();
  const diySectionRef = useRef<HTMLDivElement>(null);
  const formSectionRef = useRef<HTMLFormElement>(null);

  // Existing waste post document tracking (ensures no duplicates across analysis and publishing)
  const [existingPostId, setExistingPostId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<WasteCategory>('Cardboard');
  const [condition, setCondition] = useState<ItemCondition>('Good');
  const [quantity, setQuantity] = useState('1 unit / 2 kg');
  const [description, setDescription] = useState('');
  const [intendedAction, setIntendedAction] = useState<IntendedAction>('Reuse');
  const [estimatedPrice, setEstimatedPrice] = useState<number>(0);
  const [location, setLocation] = useState(userProfile?.college || 'Main Campus Hub');

  // Image State (supports drag-and-drop, file upload, & real sample presets)
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<StructuredAIAnalysis | null>(null);

  // Status and feedback
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'info' | 'success' | 'error';
    text: string;
    canRetryAI?: boolean;
  } | null>(null);

  // Dynamic Environmental Impact Preview
  const previewImpact = calculateEnvironmentalImpact({
    category,
    material: aiAnalysis?.material,
    quantity,
    actionType: intendedAction,
    title,
    aiObjectName: aiAnalysis?.objectName,
  });

  // Restore draft state from Firestore on page refresh
  useEffect(() => {
    const draftId = sessionStorage.getItem('w2w_draft_post_id');
    if (!draftId || !currentUser) return;

    let isMounted = true;
    (async () => {
      try {
        const post = await getWastePostById(draftId);
        if (post && isMounted && post.ownerId === currentUser.uid) {
          setExistingPostId(post.id);
          if (post.imageUrl) setImagePreview(post.imageUrl);
          if (post.title) setTitle(post.title);
          if (post.category) setCategory(post.category);
          if (post.condition) setCondition(post.condition);
          if (post.quantity) setQuantity(post.quantity);
          if (post.description) setDescription(post.description);
          if (post.intendedAction) setIntendedAction(post.intendedAction);
          if (post.estimatedPrice !== undefined) setEstimatedPrice(post.estimatedPrice);
          if (post.location) setLocation(post.location);
          if (post.aiAnalysis) {
            setAiAnalysis(post.aiAnalysis);
            setStatusMessage({
              type: 'info',
              text: 'Restored your saved draft and Gemini AI analysis from Firestore.',
            });
          }
        }
      } catch (err) {
        console.error('Failed to restore draft from Firestore:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Optimized image loader that scales large images down to max 1280px
  // to avoid Vercel 4.5MB payload limit while preserving crisp detail for Gemini
  const compressImageForAnalysis = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1280;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Handle uploaded files
  const handleImageFile = (file: File) => {
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setStatusMessage({
        type: 'error',
        text: 'Please upload a valid image file (JPEG, PNG, or WEBP).',
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setStatusMessage({
        type: 'error',
        text: 'Image file size exceeds 20MB limit. Please choose a smaller photo.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const raw = reader.result as string;
      const optimized = await compressImageForAnalysis(raw);
      setImagePreview(optimized);
      // Reset previous AI analysis when a new image is selected
      setAiAnalysis(null);
      setStatusMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  // Quick preset loader for real images
  const handleSelectPreset = (preset: typeof REAL_IMAGE_PRESETS[0]) => {
    setImagePreview(preset.url);
    setCategory(preset.category);
    setAiAnalysis(null);
    setStatusMessage({
      type: 'info',
      text: `Loaded real sample: ${preset.name}. Click "✨ Analyze with AI" to run Gemini multimodal vision.`,
    });
  };

  /**
   * REAL GEMINI AI MULTIMODAL ANALYSIS
   * Explicitly triggered ONLY by the user clicking the button.
   */
  const handleAIAnalysisClick = async () => {
    if (isAnalyzing) return; // Prevent duplicate requests

    if (!imagePreview) {
      setStatusMessage({
        type: 'error',
        text: 'Please upload or select a waste photo first before analyzing.',
      });
      return;
    }

    if (!currentUser) {
      setStatusMessage({
        type: 'error',
        text: 'You must be signed in to perform AI waste analysis.',
      });
      return;
    }

    try {
      setIsAnalyzing(true);
      setStatusMessage({
        type: 'info',
        text: 'AI is examining your waste photo with Gemini Multimodal Flash...',
      });

      // 1. Ensure existing wastePosts document exists to prevent duplicates
      let activePostId = existingPostId;
      if (!activePostId) {
        const draftDoc = await createWastePost({
          ownerId: currentUser.uid,
          ownerName: userProfile?.name || currentUser.displayName || 'Campus Member',
          ownerCollege: userProfile?.college || 'Campus Community',
          title: title.trim() || 'Scrap / Unidentified Material',
          description: description.trim() || 'Item uploaded for Gemini AI waste intelligence analysis.',
          category: category || 'Other',
          condition: condition || 'Good',
          quantity: quantity || '1 unit',
          intendedAction: intendedAction || 'Reuse',
          estimatedPrice: Number(estimatedPrice) || 0,
          location: location || userProfile?.college || 'Main Campus Hub',
          imageUrl: imagePreview,
          status: 'analyzing',
          aiStatus: 'analyzing',
          aiAnalyzed: false,
        });
        activePostId = draftDoc.id;
        setExistingPostId(draftDoc.id);
        sessionStorage.setItem('w2w_draft_post_id', draftDoc.id);
      } else {
        await updateWastePost(activePostId, currentUser.uid, {
          status: 'analyzing',
          aiStatus: 'analyzing',
          imageUrl: imagePreview,
        });
      }

      // Ensure image is optimized before transmission
      const payloadImage = await compressImageForAnalysis(imagePreview);

      // 2. Call server-side Gemini API
      const response = await fetch('/api/waste/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: payloadImage,
          context: {
            title: title.trim() || undefined,
            category,
            userNotes: description.trim() || undefined,
          },
        }),
      });

      if (!response.ok) {
        let errorMsg = 'AI analysis could not be completed. Please try again.';
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errorMsg = errData.error;
          }
        } catch {
          if (response.status === 404) {
            errorMsg = 'AI backend endpoint not found (404). Please ensure serverless functions or backend server is running on your deployment.';
          } else if (response.status === 413) {
            errorMsg = 'Image payload exceeded the serverless function limit (413). Please choose a smaller photo.';
          } else {
            errorMsg = `Server error (${response.status}): ${response.statusText || 'Request failed'}.`;
          }
        }
        throw new Error(errorMsg);
      }

      const data = await response.json().catch(() => null);
      if (!data || !data.analysis || !data.analysis.objectName) {
        throw new Error(data?.error || 'Malformed AI response from server.');
      }
      const analysis: StructuredAIAnalysis = data.analysis;

      // 3. Save AI analysis to existing Firestore wastePosts document
      await saveAIAnalysisToPost(activePostId, currentUser.uid, analysis);

      // 4. Update UI State
      setAiAnalysis(analysis);

      // Map action strictly to IntendedAction
      const actionMap: Record<BestActionType, IntendedAction> = {
        reuse: 'Reuse',
        sell: 'Sell',
        donate: 'Donate',
        exchange: 'Exchange',
        upcycle: 'Upcycle',
        recycle: 'Recycle',
      };
      if (analysis.bestAction && actionMap[analysis.bestAction]) {
        setIntendedAction(actionMap[analysis.bestAction]);
      }

      // Smart autofill fields if not already typed by user
      if (!title.trim() || title === 'Scrap / Unidentified Material') {
        setTitle(analysis.objectName);
      }
      if (CATEGORIES.includes(analysis.category as WasteCategory)) {
        setCategory(analysis.category as WasteCategory);
      }
      if (CONDITIONS.includes(analysis.condition as ItemCondition)) {
        setCondition(analysis.condition as ItemCondition);
      }
      if (!description.trim() || description.startsWith('Item uploaded')) {
        setDescription(
          `${analysis.reasoning}\n\nIdentified Material: ${analysis.material}. Circular Recommendation: ${analysis.bestAction.toUpperCase()}.`
        );
      }
      if (analysis.estimatedValue?.max && estimatedPrice === 0) {
        // AI Estimated Value in INR
        setEstimatedPrice(analysis.estimatedValue.max);
      }

      setStatusMessage({
        type: 'success',
        text: '✨ Gemini AI analysis completed and saved to Firestore! Review the material insights, DIY projects, and safety notes below.',
      });
    } catch (err: any) {
      console.error('Error during AI analysis:', err);
      // Mark failed state in Firestore if document exists
      if (existingPostId) {
        try {
          await updateWastePost(existingPostId, currentUser.uid, {
            aiStatus: 'failed',
          });
        } catch {
          // ignore cleanup error
        }
      }
      setStatusMessage({
        type: 'error',
        text: err.message || 'AI analysis could not be completed. Please try again.',
        canRetryAI: true,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Action: Save Analysis explicitly
   */
  const handleSaveAnalysis = async () => {
    if (!aiAnalysis || !existingPostId || !currentUser) return;
    try {
      await saveAIAnalysisToPost(existingPostId, currentUser.uid, aiAnalysis);
      setStatusMessage({
        type: 'success',
        text: 'AI analysis explicitly saved and synced to your Firestore waste post.',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: 'Failed to update Firestore document with analysis.',
      });
    }
  };

  /**
   * Action: Try Another Image
   */
  const handleResetImage = () => {
    setImagePreview(null);
    setAiAnalysis(null);
    setExistingPostId(null);
    sessionStorage.removeItem('w2w_draft_post_id');
    setTitle('');
    setDescription('');
    setEstimatedPrice(0);
    setStatusMessage(null);
  };

  /**
   * Action: Scroll to DIY Ideas
   */
  const handleScrollToDIY = () => {
    diySectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * Action: Share (Real browser Web Share API or clipboard copy)
   */
  const handleShare = async () => {
    const shareData = {
      title: title || 'Waste2Worth Item',
      text: `Check out this circular economy item: ${title || 'Waste Material'} on Waste2Worth!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setStatusMessage({
          type: 'info',
          text: 'Listing URL copied to clipboard! (Share with your campus network).',
        });
      } catch {
        setStatusMessage({
          type: 'info',
          text: 'Sharing is active. Copy the browser link to share this item.',
        });
      }
    }
  };

  /**
   * Form submission (Publish / Create listing)
   */
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setStatusMessage({ type: 'error', text: 'You must be logged in to create a listing.' });
      return;
    }

    if (!title.trim()) {
      setStatusMessage({ type: 'error', text: 'Please provide a waste item title.' });
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage(null);

      if (existingPostId) {
        // Update the EXISTING wastePosts document (no duplicate post is created)
        await updateWastePost(existingPostId, currentUser.uid, {
          title: title.trim(),
          description: description.trim(),
          category,
          condition,
          quantity: quantity.trim(),
          intendedAction,
          estimatedPrice: Number(estimatedPrice) || 0,
          location: location.trim(),
          imageUrl: imagePreview || undefined,
          status: 'available',
          aiAnalyzed: Boolean(aiAnalysis),
          aiAnalysis: aiAnalysis || undefined,
          aiStatus: aiAnalysis ? 'analyzed' : undefined,
        });

        await logUserActivity({
          userId: currentUser.uid,
          type: 'post_created',
          title: `Listed: ${title.trim()}`,
          description: `Published ${quantity} of ${category} for ${intendedAction}. ${
            aiAnalysis ? 'AI Verified.' : ''
          }`,
          targetPostId: existingPostId,
        });
      } else {
        // Create new post if user didn't run AI analysis
        const newPost = await createWastePost({
          ownerId: currentUser.uid,
          ownerName: userProfile?.name || currentUser.displayName || 'Campus Member',
          ownerCollege: userProfile?.college || 'Campus Community',
          title: title.trim(),
          description: description.trim(),
          category,
          condition,
          quantity: quantity.trim(),
          intendedAction,
          estimatedPrice: Number(estimatedPrice) || 0,
          location: location.trim(),
          imageUrl: imagePreview || undefined,
          status: 'available',
          aiAnalyzed: false,
          aiStatus: 'pending_ai',
        });
        setExistingPostId(newPost.id);
      }

      // Clear draft session storage upon successful publication
      sessionStorage.removeItem('w2w_draft_post_id');

      setStatusMessage({
        type: 'success',
        text: 'Listing successfully published to Firestore! Redirecting to marketplace...',
      });

      setTimeout(() => {
        onNavigate('/marketplace');
      }, 1000);
    } catch (err: any) {
      console.error('Error creating/updating waste post:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to save waste listing. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="upload-page-container" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
          <span>Milestone 2 • Multimodal Waste Intelligence</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Upload Waste & Material</h1>
        <p className="text-sm text-stone-400 mt-1">
          Catalog scrap materials, salvage electronics, or surplus items to route them into the circular loop.
        </p>
      </div>

      {/* Status & Feedback Banner */}
      {statusMessage && (
        <div
          id="upload-status-alert"
          className={`p-4 rounded-xl border text-sm flex items-start justify-between gap-3 transition-all ${
            statusMessage.type === 'info'
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
              : statusMessage.type === 'success'
              ? 'bg-teal-950/40 border-teal-800/80 text-teal-200'
              : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {statusMessage.type === 'info' && <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />}
            {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />}
            <div className="leading-relaxed">{statusMessage.text}</div>
          </div>
          {statusMessage.canRetryAI && (
            <button
              onClick={handleAIAnalysisClick}
              className="px-3 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-100 text-xs font-bold border border-rose-700 flex items-center gap-1.5 whitespace-nowrap"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {/* Photo Upload & Preview Dropzone */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
          Waste Photo / Material Image
        </label>
        <div
          id="image-dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-colors relative ${
            isDragging
              ? 'border-emerald-400 bg-emerald-950/20'
              : 'border-stone-700 hover:border-emerald-500/60 bg-stone-900/60'
          }`}
        >
          <input
            id="waste-image-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          {imagePreview ? (
            <div className="space-y-3">
              <img
                src={imagePreview}
                alt="Waste Preview"
                className="max-h-64 mx-auto rounded-xl object-contain border border-stone-700 bg-stone-950"
              />
              <p className="text-xs text-stone-400">Click or drag another image to replace</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-stone-800 mx-auto flex items-center justify-center text-emerald-400">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="font-semibold text-stone-200 text-sm">
                  Drag and drop your waste photo here, or browse
                </span>
                <p className="text-xs text-stone-400 mt-1">JPEG, PNG, WEBP up to 15MB</p>
              </div>
            </div>
          )}
        </div>

        {/* Real Test Presets for Instant Multimodal Verification */}
        <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              Or Test with Real Material Samples:
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">Milestone 2 Real Verification</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {REAL_IMAGE_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                id={`preset-${preset.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => handleSelectPreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                  imagePreview === preset.url
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                    : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:border-stone-600 hover:text-white'
                }`}
              >
                <span>{preset.icon}</span>
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 8: Gemini AI Analysis Trigger Bar */}
      <div
        id="ai-analysis-control-bar"
        className="p-5 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Gemini Multimodal Waste Intelligence</span>
              {aiAnalysis && (
                <span className="text-[10px] uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full font-bold">
                  Analyzed
                </span>
              )}
            </div>
            <div className="text-xs text-stone-400 mt-0.5">
              Identifies material composition, circular value, safety hazards, and custom DIY projects.
            </div>
          </div>
        </div>

        <button
          id="analyze-with-ai-btn"
          type="button"
          disabled={!imagePreview || isAnalyzing}
          onClick={handleAIAnalysisClick}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-stone-950 text-xs font-extrabold transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
              <span>AI is examining your waste...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-stone-950" />
              <span>✨ Analyze with AI</span>
            </>
          )}
        </button>
      </div>

      {/* Section 9: Real AI Waste Analysis Result Section */}
      {aiAnalysis && (
        <div
          id="ai-waste-analysis-section"
          className="p-6 sm:p-8 rounded-3xl bg-stone-900 border border-emerald-900/60 space-y-6 shadow-xl relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-800 gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Waste Analysis</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                {aiAnalysis.objectName}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1 rounded-full bg-stone-800 text-stone-300 border border-stone-700 font-mono">
                Confidence: {Math.round(aiAnalysis.confidence * 100)}%
              </span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  aiAnalysis.reusable
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                    : 'bg-stone-800 text-stone-400 border-stone-700'
                }`}
              >
                {aiAnalysis.reusable ? 'Reusable' : 'Raw Scrap'}
              </span>
            </div>
          </div>

          {/* Structured Attributes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-400 block">
                Object
              </span>
              <span className="text-sm font-bold text-white mt-1 block truncate">
                {aiAnalysis.objectName}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-400 block">
                Material
              </span>
              <span className="text-sm font-bold text-white mt-1 block truncate">
                {aiAnalysis.material}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-400 block">
                Category
              </span>
              <span className="text-sm font-bold text-emerald-300 mt-1 block truncate">
                {aiAnalysis.category}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-400 block">
                Condition
              </span>
              <span className="text-sm font-bold text-stone-200 mt-1 block truncate">
                {aiAnalysis.condition}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-400 block">
                Confidence
              </span>
              <span className="text-sm font-bold text-white mt-1 block font-mono">
                {(aiAnalysis.confidence * 100).toFixed(0)}%
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-400 block">
                Reusable
              </span>
              <span className="text-sm font-bold text-teal-300 mt-1 block">
                {aiAnalysis.reusable ? 'Yes' : 'No'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-400 block">
                Best Action
              </span>
              <span className="text-sm font-extrabold text-emerald-400 mt-1 block uppercase tracking-wide">
                {aiAnalysis.bestAction}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/80">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-400 block">
                AI Estimated Value
              </span>
              <span className="text-sm font-black text-white mt-1 block font-mono">
                ₹{aiAnalysis.estimatedValue.min} – ₹{aiAnalysis.estimatedValue.max} INR
              </span>
            </div>
          </div>

          {/* Reasoning */}
          {aiAnalysis.reasoning && (
            <div className="p-4 rounded-xl bg-stone-950/50 border border-stone-800 text-xs text-stone-300 leading-relaxed">
              <span className="font-bold text-white mr-1.5">Visual Observation:</span>
              {aiAnalysis.reasoning}
            </div>
          )}

          {/* What can it become? (reuseIdeas) */}
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>What can it become?</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {aiAnalysis.reuseIdeas.map((idea, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-stone-950/70 border border-stone-800/90 text-xs text-stone-200 flex items-start gap-2.5"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{idea}</span>
                </div>
              ))}
            </div>
          </div>

          {/* DIY Projects */}
          <div ref={diySectionRef} id="diy-projects-section" className="space-y-4 pt-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Hammer className="w-4 h-4 text-teal-400" />
              <span>DIY Projects</span>
            </h3>
            <div className="space-y-4">
              {aiAnalysis.diyIdeas.map((project, idx) => (
                <div
                  key={idx}
                  className="p-4 sm:p-5 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="text-teal-400">#{idx + 1}</span>
                      <span>{project.title}</span>
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 font-medium">
                        Difficulty: {project.difficulty}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>{project.time}</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
                        Cost: ₹{project.additionalCost} INR
                      </span>
                    </div>
                  </div>

                  {project.materials?.length > 0 && (
                    <div className="text-xs text-stone-400">
                      <span className="font-semibold text-stone-300">Required Materials: </span>
                      {project.materials.join(', ')}
                    </div>
                  )}

                  {project.steps?.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block">
                        Step-by-Step Instructions:
                      </span>
                      <ol className="list-decimal list-inside space-y-1 text-xs text-stone-300 leading-relaxed">
                        {project.steps.map((step, sIdx) => (
                          <li key={sIdx} className="pl-1">
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Safety Section */}
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Safety</span>
            </h3>
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                aiAnalysis.safety.level?.toLowerCase() === 'hazardous'
                  ? 'bg-rose-950/30 border-rose-800/80 text-rose-200'
                  : aiAnalysis.safety.level?.toLowerCase() === 'caution'
                  ? 'bg-amber-950/30 border-amber-800/80 text-amber-200'
                  : 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                <span>Safety Level:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-stone-900 border font-mono">
                  {aiAnalysis.safety.level}
                </span>
              </div>

              {aiAnalysis.safety.warnings?.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-bold block">Warnings:</span>
                  <ul className="list-disc list-inside text-xs space-y-0.5">
                    {aiAnalysis.safety.warnings.map((warn, wIdx) => (
                      <li key={wIdx}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiAnalysis.safety.precautions?.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-bold block">Precautions:</span>
                  <ul className="list-disc list-inside text-xs space-y-0.5">
                    {aiAnalysis.safety.precautions.map((prec, pIdx) => (
                      <li key={pIdx}>{prec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Environmental Advice */}
          {aiAnalysis.environmentalAdvice && (
            <div className="space-y-2 pt-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-400" />
                <span>Environmental Advice</span>
              </h3>
              <div className="p-4 rounded-xl bg-stone-950/70 border border-stone-800 text-xs text-stone-300 leading-relaxed">
                {aiAnalysis.environmentalAdvice}
              </div>
            </div>
          )}

          {/* Section 10: User Actions After Analysis */}
          <div className="pt-4 border-t border-stone-800 flex flex-wrap items-center gap-3">
            <button
              id="save-analysis-btn"
              type="button"
              onClick={handleSaveAnalysis}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Analysis</span>
            </button>

            <button
              id="create-waste-listing-btn"
              type="button"
              onClick={() => formSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-stone-950 text-xs font-bold transition-all flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Create Waste Listing</span>
            </button>

            <button
              id="view-diy-ideas-btn"
              type="button"
              onClick={handleScrollToDIY}
              className="px-4 py-2.5 rounded-xl border border-stone-700 hover:bg-stone-800 text-stone-300 text-xs font-semibold transition-all flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>View DIY Ideas</span>
            </button>

            <button
              id="share-btn"
              type="button"
              onClick={handleShare}
              className="px-4 py-2.5 rounded-xl border border-stone-700 hover:bg-stone-800 text-stone-300 text-xs font-semibold transition-all flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>

            <button
              id="try-another-image-btn"
              type="button"
              onClick={handleResetImage}
              className="px-4 py-2.5 rounded-xl border border-stone-700 hover:bg-stone-800 text-stone-400 text-xs font-semibold transition-all flex items-center gap-2 ml-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Another Image</span>
            </button>
          </div>
        </div>
      )}

      {/* Section 14: Existing Listing Form Flow (Maintained & Enhanced) */}
      <form ref={formSectionRef} onSubmit={handleFormSubmit} className="space-y-6 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Listing Details</h2>
          <span className="text-xs text-stone-400">
            {aiAnalysis ? 'Pre-filled with AI recommendations (editable)' : 'Standard listing details'}
          </span>
        </div>

        {/* Core Metadata Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Waste Item Title
            </label>
            <input
              id="upload-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 5 Large Heavy-Duty Corrugated Boxes"
              className="w-full px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Category
            </label>
            <select
              id="upload-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as WasteCategory)}
              className="w-full px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 focus:outline-none focus:border-emerald-500 text-sm"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Condition
            </label>
            <select
              id="upload-condition-select"
              value={condition}
              onChange={(e) => setCondition(e.target.value as ItemCondition)}
              className="w-full px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 focus:outline-none focus:border-emerald-500 text-sm"
            >
              {CONDITIONS.map((cond) => (
                <option key={cond} value={cond}>
                  {cond}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Quantity / Weight
            </label>
            <input
              id="upload-quantity-input"
              type="text"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 10 kg, 3 pieces, 1 sack"
              className="w-full px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          {/* Intended Action */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Intended Action
            </label>
            <select
              id="upload-action-select"
              value={intendedAction}
              onChange={(e) => setIntendedAction(e.target.value as IntendedAction)}
              className="w-full px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 focus:outline-none focus:border-emerald-500 text-sm"
            >
              {ACTIONS.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          {/* Estimated Price */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Estimated Price (INR)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500 font-mono text-xs">
                ₹
              </div>
              <input
                id="upload-price-input"
                type="number"
                min="0"
                step="1"
                value={estimatedPrice}
                onChange={(e) => setEstimatedPrice(parseFloat(e.target.value) || 0)}
                placeholder="0 for free / donate / exchange"
                className="w-full pl-8 pr-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500 text-sm font-mono"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Pickup / Campus Location
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                id="upload-location-input"
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Engineering Quad, Maker Space Room 102"
                className="w-full pl-9 pr-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Item Details & Material Notes
            </label>
            <textarea
              id="upload-description-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe condition, cleanliness, original use, or dimensions..."
              className="w-full px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>
        </div>

        {/* Estimated Circular Impact Preview (Milestone 4.1) */}
        <div
          id="upload-impact-preview"
          className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2 text-emerald-300 font-semibold">
            <Leaf className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>🌱 Estimated Circular Impact Preview:</span>
            <span className="text-[10px] uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800 font-mono">
              {previewImpact.category}
            </span>
          </div>
          <div className="flex items-center gap-3 text-stone-300 font-mono text-[11px] flex-wrap">
            <span>
              Diverted: <strong className="text-white font-bold">{previewImpact.wasteDivertedKg} kg</strong>
            </span>
            <span>•</span>
            <span>
              CO₂e Avoided: <strong className="text-emerald-400 font-bold">{previewImpact.co2eAvoidedKg} kg</strong>
            </span>
            {previewImpact.resourceSavings?.waterLiters ? (
              <>
                <span>•</span>
                <span className="text-cyan-300 font-bold">~{previewImpact.resourceSavings.waterLiters.toLocaleString()} L water</span>
              </>
            ) : previewImpact.resourceSavings?.energyKwh ? (
              <>
                <span>•</span>
                <span className="text-amber-300 font-bold">~{previewImpact.resourceSavings.energyKwh} kWh energy</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Submit & Cancel Buttons */}
        <div className="pt-2 flex justify-end gap-3">
          <button
            id="upload-cancel-btn"
            type="button"
            onClick={() => onNavigate('/dashboard')}
            className="px-6 py-3 rounded-xl border border-stone-700 text-stone-300 font-semibold text-sm hover:bg-stone-800 transition-colors"
          >
            Cancel
          </button>
          <button
            id="upload-submit-btn"
            type="submit"
            disabled={submitting}
            className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-sm transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing to Firestore...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Publish Waste Listing</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
