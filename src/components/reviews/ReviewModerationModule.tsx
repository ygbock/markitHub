import React, { useState, useMemo } from 'react';
import { 
  Star, 
  CheckCircle2, 
  EyeOff, 
  Flag, 
  MessageSquare, 
  Trash2, 
  Search, 
  Filter, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Building2, 
  ThumbsUp, 
  Image as ImageIcon, 
  X, 
  Send, 
  Sparkles,
  ExternalLink,
  ChevronDown,
  ShoppingBag,
  UserCheck,
  Tag,
  Check
} from 'lucide-react';
import { ProductReview, ReviewStatus, ReviewAdminResponse, StaffMember, Order, Product } from '../../types';

interface ReviewModerationModuleProps {
  reviews: ProductReview[];
  products: Product[];
  orders: Order[];
  activeStaff?: StaffMember;
  onUpdateReviewStatus: (reviewId: string, status: ReviewStatus, flagReason?: string) => Promise<void> | void;
  onSaveAdminResponse: (reviewId: string, response: ReviewAdminResponse) => Promise<void> | void;
  onDeleteReview?: (reviewId: string) => Promise<void> | void;
  onRemoveAdminResponse?: (reviewId: string) => Promise<void> | void;
}

export const ReviewModerationModule: React.FC<ReviewModerationModuleProps> = ({
  reviews = [],
  products = [],
  orders = [],
  activeStaff,
  onUpdateReviewStatus,
  onSaveAdminResponse,
  onDeleteReview,
  onRemoveAdminResponse
}) => {
  // Filters state
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'hidden' | 'flagged'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [hasImagesOnly, setHasImagesOnly] = useState(false);

  // Modal states
  const [respondingToReview, setRespondingToReview] = useState<ProductReview | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responderName, setResponderName] = useState(activeStaff?.name || 'Store Management');
  const [responderRole, setResponderRole] = useState(activeStaff?.role || 'Customer Experience Manager');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  const [flaggingReview, setFlaggingReview] = useState<ProductReview | null>(null);
  const [customFlagReason, setCustomFlagReason] = useState('');
  const [selectedFlagPreset, setSelectedFlagPreset] = useState('Suspected promotional spam');

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Flag presets
  const FLAG_PRESETS = [
    'Suspected promotional spam or external link',
    'Profanity or offensive language',
    'Unrelated to product / Off-topic review',
    'Suspected fraudulent or unverified rating abuse',
    'Contains private customer personal info',
    'Competitor defamation or false claims'
  ];

  // Quick reply templates
  const REPLY_TEMPLATES = [
    'Thank you for your valuable feedback! We are thrilled that you love the quality and performance.',
    'Thank you for taking the time to review! We take your feedback seriously and are actively working on improvements.',
    'We apologize for your experience. Please reach out to our dedicated support team at support@store.com so we can make this right immediately.',
    'Thanks for sharing your photos and experience with our community!'
  ];

  // Filtered reviews calculation
  const filteredReviews = useMemo(() => {
    return reviews.filter(rev => {
      // Tab status filter
      if (activeTab === 'pending' && rev.status !== 'pending') return false;
      if (activeTab === 'approved' && rev.status !== 'approved') return false;
      if (activeTab === 'hidden' && rev.status !== 'hidden') return false;
      if (activeTab === 'flagged' && rev.status !== 'flagged') return false;

      // Product filter
      if (selectedProductId !== 'all' && rev.productId !== selectedProductId) return false;

      // Rating filter
      if (ratingFilter !== 'all' && rev.rating !== Number(ratingFilter)) return false;

      // Verified purchase filter
      if (verifiedOnly && !rev.verifiedPurchase) return false;

      // Images filter
      if (hasImagesOnly && (!rev.images || rev.images.length === 0)) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = rev.userName?.toLowerCase().includes(q) || rev.customer?.name?.toLowerCase().includes(q);
        const matchEmail = rev.userEmail?.toLowerCase().includes(q) || rev.customer?.email?.toLowerCase().includes(q);
        const matchTitle = rev.title?.toLowerCase().includes(q);
        const matchComment = rev.comment?.toLowerCase().includes(q);
        const matchProd = rev.productName?.toLowerCase().includes(q) || rev.productId?.toLowerCase().includes(q);
        const matchSku = rev.variantSku?.toLowerCase().includes(q);
        const matchOrder = rev.orderId?.toLowerCase().includes(q);

        if (!matchName && !matchEmail && !matchTitle && !matchComment && !matchProd && !matchSku && !matchOrder) {
          return false;
        }
      }

      return true;
    });
  }, [reviews, activeTab, selectedProductId, ratingFilter, verifiedOnly, hasImagesOnly, searchQuery]);

  // Overall statistics
  const stats = useMemo(() => {
    const total = reviews.length;
    const pending = reviews.filter(r => r.status === 'pending').length;
    const approved = reviews.filter(r => r.status === 'approved').length;
    const hidden = reviews.filter(r => r.status === 'hidden').length;
    const flagged = reviews.filter(r => r.status === 'flagged').length;
    const verifiedCount = reviews.filter(r => r.verifiedPurchase).length;
    const avgRating = total > 0 
      ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / total).toFixed(1) 
      : '5.0';
    const verifiedPercent = total > 0 ? Math.round((verifiedCount / total) * 100) : 100;

    return { total, pending, approved, hidden, flagged, verifiedCount, avgRating, verifiedPercent };
  }, [reviews]);

  // Open Response Modal
  const handleOpenResponseModal = (review: ProductReview) => {
    setRespondingToReview(review);
    setResponseText(review.adminResponse?.text || '');
    setResponderName(review.adminResponse?.responderName || activeStaff?.name || 'Elena Rostova');
    setResponderRole(review.adminResponse?.responderRole || activeStaff?.role || 'Customer Experience Manager');
  };

  // Submit Admin Response
  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingToReview || !responseText.trim()) return;

    setIsSubmittingResponse(true);
    try {
      const responsePayload: ReviewAdminResponse = {
        text: responseText.trim(),
        respondedAt: new Date().toISOString(),
        responderName: responderName.trim() || 'Store Management',
        responderRole: responderRole.trim() || 'Customer Experience'
      };

      await onSaveAdminResponse(respondingToReview.id, responsePayload);
      setRespondingToReview(null);
      setResponseText('');
    } catch (err) {
      console.error('Failed to save response:', err);
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  // Submit Flag
  const handleSubmitFlag = async () => {
    if (!flaggingReview) return;
    const reason = customFlagReason.trim() || selectedFlagPreset;
    await onUpdateReviewStatus(flaggingReview.id, 'flagged', reason);
    setFlaggingReview(null);
    setCustomFlagReason('');
  };

  return (
    <div id="review-moderation-module" className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Customer Reviews & Moderation Center
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Moderate incoming customer feedback, verify authentic purchases, respond officially, and maintain high review integrity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Strict Purchase Verification Active</span>
          </div>
        </div>
      </div>

      {/* Analytics KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">Total Reviews</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">All</span>
          </div>
        </div>

        {/* Avg Rating */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">Average Rating</span>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span className="text-2xl font-bold text-slate-900">{stats.avgRating}</span>
            </div>
            <span className="text-xs text-slate-400 font-medium">/ 5.0</span>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white p-4 rounded-xl border border-amber-200/80 bg-amber-50/30 shadow-sm">
          <span className="text-xs font-medium text-amber-800 block mb-1">Pending Approval</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-700">{stats.pending}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {stats.pending > 0 ? 'Needs Action' : 'Clear'}
            </span>
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/30 shadow-sm">
          <span className="text-xs font-medium text-emerald-800 block mb-1">Approved & Live</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-700">{stats.approved}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Live</span>
          </div>
        </div>

        {/* Flagged */}
        <div className="bg-white p-4 rounded-xl border border-rose-200/80 bg-rose-50/30 shadow-sm">
          <span className="text-xs font-medium text-rose-800 block mb-1">Flagged / Spam</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-700">{stats.flagged}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">Review</span>
          </div>
        </div>

        {/* Verified Purchase % */}
        <div className="bg-white p-4 rounded-xl border border-indigo-200/80 bg-indigo-50/30 shadow-sm">
          <span className="text-xs font-medium text-indigo-800 block mb-1">Verified Purchases</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-indigo-700">{stats.verifiedPercent}%</span>
            <span className="text-xs font-medium text-indigo-600">{stats.verifiedCount} buyers</span>
          </div>
        </div>
      </div>

      {/* Main Review Management Workspace */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-slate-200 px-6 pt-4 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-3">
            {[
              { id: 'all', label: 'All Reviews', count: stats.total, icon: MessageSquare },
              { id: 'pending', label: 'Pending Moderation', count: stats.pending, icon: Clock, badgeColor: 'bg-amber-100 text-amber-800' },
              { id: 'approved', label: 'Approved', count: stats.approved, icon: CheckCircle2, badgeColor: 'bg-emerald-100 text-emerald-800' },
              { id: 'flagged', label: 'Flagged', count: stats.flagged, icon: Flag, badgeColor: 'bg-rose-100 text-rose-800' },
              { id: 'hidden', label: 'Hidden', count: stats.hidden, icon: EyeOff, badgeColor: 'bg-slate-100 text-slate-700' }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`review-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 text-[11px] rounded-md font-bold ${
                    isActive ? 'bg-slate-800 text-slate-200' : (tab.badgeColor || 'bg-slate-100 text-slate-600')
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pb-3 text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{filteredReviews.length}</strong> of {reviews.length} reviews
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-slate-50/60 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="review-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviewer, title, comment, SKU, or order ID..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-white rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Product Filter */}
          <div className="lg:col-span-3">
            <select
              id="review-product-filter"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-white rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">All Products ({products.length})</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Rating Filter */}
          <div className="lg:col-span-2">
            <select
              id="review-rating-filter"
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-white rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars ★★★★★</option>
              <option value="4">4 Stars ★★★★☆</option>
              <option value="3">3 Stars ★★★☆☆</option>
              <option value="2">2 Stars ★★☆☆☆</option>
              <option value="1">1 Star ★☆☆☆☆</option>
            </select>
          </div>

          {/* Toggles: Verified Only & Photos Only */}
          <div className="lg:col-span-3 flex items-center justify-end gap-2">
            <button
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                verifiedOnly
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${verifiedOnly ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Verified Buyers</span>
            </button>

            <button
              onClick={() => setHasImagesOnly(!hasImagesOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                hasImagesOnly
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ImageIcon className={`w-3.5 h-3.5 ${hasImagesOnly ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>With Photos</span>
            </button>
          </div>
        </div>

        {/* Reviews List */}
        <div className="divide-y divide-slate-100">
          {filteredReviews.length === 0 ? (
            <div className="py-16 text-center px-4">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">No reviews match current filters</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Try switching the status tab or clearing search and product filters to see customer reviews.
              </p>
              <button
                onClick={() => {
                  setActiveTab('all');
                  setSearchQuery('');
                  setSelectedProductId('all');
                  setRatingFilter('all');
                  setVerifiedOnly(false);
                  setHasImagesOnly(false);
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredReviews.map((review) => {
              const isApproved = review.status === 'approved' || !review.status;
              const isPending = review.status === 'pending';
              const isHidden = review.status === 'hidden';
              const isFlagged = review.status === 'flagged';

              // Find product details
              const productObj = products.find(p => p.id === review.productId);

              return (
                <div 
                  key={review.id}
                  id={`review-row-${review.id}`}
                  className={`p-6 transition-colors hover:bg-slate-50/50 ${
                    isPending ? 'bg-amber-50/20' : isFlagged ? 'bg-rose-50/20' : isHidden ? 'bg-slate-50/40 opacity-75' : ''
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Left details */}
                    <div className="space-y-3 flex-1">
                      {/* Top metadata row */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status badge */}
                        {isApproved && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Approved
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1 animate-pulse">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Moderation
                          </span>
                        )}
                        {isFlagged && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                            <Flag className="w-3 h-3 text-rose-600" />
                            Flagged
                          </span>
                        )}
                        {isHidden && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700 flex items-center gap-1">
                            <EyeOff className="w-3 h-3 text-slate-500" />
                            Hidden
                          </span>
                        )}

                        {/* Verified Purchase Badge (Strictly checks verifiedPurchase) */}
                        {review.verifiedPurchase ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                            Verified Purchase
                            {review.orderId && <span className="text-[10px] font-mono text-emerald-900">({review.orderId})</span>}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Unverified Reviewer
                          </span>
                        )}

                        {/* Product & Variant Tag */}
                        <div className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 flex items-center gap-1.5 border border-slate-200">
                          <ShoppingBag className="w-3 h-3 text-slate-500" />
                          <span className="font-semibold">{review.productName || productObj?.name || review.productId}</span>
                          {review.variantName && (
                            <span className="text-slate-500 font-normal">({review.variantName})</span>
                          )}
                          {review.variantSku && (
                            <span className="text-[10px] font-mono text-slate-400">SKU: {review.variantSku}</span>
                          )}
                        </div>

                        {/* Date */}
                        <span className="text-xs text-slate-400 font-medium ml-auto">
                          {new Date(review.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      {/* Flag reason banner if flagged */}
                      {isFlagged && review.flagReason && (
                        <div className="p-2.5 rounded-xl bg-rose-100/70 border border-rose-200 text-rose-900 text-xs font-medium flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <div>
                            <strong>Moderation Flag Reason:</strong> {review.flagReason}
                          </div>
                        </div>
                      )}

                      {/* Customer info & Rating stars */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 border border-indigo-200">
                          {review.avatar || review.customer?.avatar ? (
                            <img 
                              src={review.avatar || review.customer?.avatar} 
                              alt={review.userName} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            review.userName?.charAt(0).toUpperCase() || 'C'
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">
                              {review.userName || review.customer?.name || 'Customer'}
                            </h4>
                            {(review.userEmail || review.customer?.email) && (
                              <span className="text-xs text-slate-400">
                                &lt;{review.userEmail || review.customer?.email}&gt;
                              </span>
                            )}
                            {review.customer?.location && (
                              <span className="text-xs text-slate-400">
                                • {review.customer.location}
                              </span>
                            )}
                          </div>

                          {/* Star Rating Display */}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="flex items-center text-amber-400">
                              {[1, 2, 3, 4, 5].map((starVal) => (
                                <Star
                                  key={starVal}
                                  className={`w-3.5 h-3.5 ${
                                    starVal <= review.rating 
                                      ? 'fill-amber-400 text-amber-400' 
                                      : 'text-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-bold text-slate-700">{review.rating}.0</span>
                          </div>
                        </div>
                      </div>

                      {/* Review Title & Comment */}
                      <div className="space-y-1.5 pt-1">
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {review.title}
                        </h3>
                        <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line max-w-3xl">
                          {review.comment}
                        </p>
                      </div>

                      {/* Customer Photo Gallery */}
                      {review.images && review.images.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                            Customer Attached Photos ({review.images.length}):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {review.images.map((imgSrc, idx) => (
                              <div
                                key={idx}
                                onClick={() => setLightboxImage(imgSrc)}
                                className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:opacity-90 hover:scale-105 transition-all relative group bg-slate-100"
                              >
                                <img
                                  src={imgSrc}
                                  alt={`Review attachment ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Search className="w-4 h-4" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Helpful votes */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3.5 h-3.5 text-slate-400" />
                          <strong>{review.helpfulCount || 0}</strong> people found this review helpful
                        </span>
                      </div>

                      {/* Admin Response Box (if exists) */}
                      {review.adminResponse && (
                        <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-indigo-900 font-bold">
                              <Building2 className="w-4 h-4 text-indigo-600" />
                              <span>Official Store Response</span>
                              <span className="font-normal text-slate-500">
                                from {review.adminResponse.responderName} ({review.adminResponse.responderRole || 'Staff'})
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400">
                                {new Date(review.adminResponse.respondedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {onRemoveAdminResponse && (
                                <button
                                  onClick={() => onRemoveAdminResponse(review.id)}
                                  className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold cursor-pointer underline"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-slate-700 leading-relaxed font-normal bg-white p-3 rounded-lg border border-slate-200">
                            {review.adminResponse.text}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right action controls */}
                    <div className="flex lg:flex-col flex-wrap gap-2 lg:w-44 shrink-0 pt-2 lg:pt-0">
                      {/* Approve button */}
                      {!isApproved && (
                        <button
                          id={`review-approve-btn-${review.id}`}
                          onClick={() => onUpdateReviewStatus(review.id, 'approved')}
                          className="w-full px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve Review</span>
                        </button>
                      )}

                      {/* Hide button */}
                      {!isHidden && (
                        <button
                          id={`review-hide-btn-${review.id}`}
                          onClick={() => onUpdateReviewStatus(review.id, 'hidden')}
                          className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                          <span>Hide Review</span>
                        </button>
                      )}

                      {/* Flag button */}
                      {!isFlagged && (
                        <button
                          id={`review-flag-btn-${review.id}`}
                          onClick={() => setFlaggingReview(review)}
                          className="w-full px-3 py-2 bg-white border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Flag className="w-3.5 h-3.5 text-rose-500" />
                          <span>Flag as Spam</span>
                        </button>
                      )}

                      {/* Respond button */}
                      <button
                        id={`review-respond-btn-${review.id}`}
                        onClick={() => handleOpenResponseModal(review)}
                        className="w-full px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{review.adminResponse ? 'Edit Response' : 'Write Response'}</span>
                      </button>

                      {/* Delete button */}
                      {onDeleteReview && (
                        <button
                          id={`review-delete-btn-${review.id}`}
                          onClick={() => {
                            if (window.confirm('Are you sure you want to permanently delete this customer review?')) {
                              onDeleteReview(review.id);
                            }
                          }}
                          className="w-full px-3 py-1.5 text-slate-400 hover:text-rose-600 rounded-xl text-[11px] font-medium transition-all flex items-center justify-center gap-1 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete Review</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Admin Respond Modal */}
      {respondingToReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Official Store Response
                </h3>
                <p className="text-xs text-slate-500">
                  Responding to <strong className="text-slate-800">{respondingToReview.userName}</strong> on{' '}
                  <span className="italic">{respondingToReview.productName}</span>
                </p>
              </div>
              <button
                onClick={() => setRespondingToReview(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Review excerpt */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{respondingToReview.rating}.0 — {respondingToReview.title}</span>
              </div>
              <p className="text-slate-600 italic line-clamp-2">"{respondingToReview.comment}"</p>
            </div>

            {/* Response Form */}
            <form onSubmit={handleSubmitResponse} className="space-y-4">
              {/* Responder identity inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Responder Name
                  </label>
                  <input
                    type="text"
                    required
                    value={responderName}
                    onChange={(e) => setResponderName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900"
                    placeholder="Elena Rostova"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Responder Title / Role
                  </label>
                  <input
                    type="text"
                    required
                    value={responderRole}
                    onChange={(e) => setResponderRole(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900"
                    placeholder="Customer Experience Manager"
                  />
                </div>
              </div>

              {/* Quick Reply Templates */}
              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Quick Reply Templates
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {REPLY_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setResponseText(tmpl)}
                      className="text-left p-2 rounded-lg bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-200 text-slate-700 text-xs transition-all cursor-pointer"
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Official Merchant Reply Message
                </label>
                <textarea
                  rows={4}
                  required
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Write a clear, courteous, and helpful response..."
                  className="w-full p-3 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRespondingToReview(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResponse || !responseText.trim()}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingResponse ? 'Publishing...' : 'Publish Official Response'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flag Reason Modal */}
      {flaggingReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2 text-rose-700 font-bold">
                <Flag className="w-5 h-5" />
                <h3 className="text-base text-slate-900">Flag Review for Moderation</h3>
              </div>
              <button
                onClick={() => setFlaggingReview(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Flagging marks this review for supervisory audit and temporarily conceals it from public storefront algorithms.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Select Violation Reason</label>
              <div className="space-y-1.5">
                {FLAG_PRESETS.map((preset, idx) => (
                  <label 
                    key={idx} 
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedFlagPreset === preset 
                        ? 'bg-rose-50/70 border-rose-300 text-rose-950 font-medium' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="flagPreset"
                      checked={selectedFlagPreset === preset}
                      onChange={() => setSelectedFlagPreset(preset)}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <span>{preset}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">Additional Staff Notes (Optional)</label>
              <input
                type="text"
                value={customFlagReason}
                onChange={(e) => setCustomFlagReason(e.target.value)}
                placeholder="Specific details regarding why this was flagged..."
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFlaggingReview(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitFlag}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Confirm & Flag Review</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox photo viewer */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[85vh] bg-transparent" onClick={e => e.stopPropagation()}>
            <img 
              src={lightboxImage} 
              alt="Customer product review attachment enlarged" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 p-2 bg-white text-slate-900 rounded-full shadow-lg hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
