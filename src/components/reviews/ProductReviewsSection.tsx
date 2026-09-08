import React, { useState, useMemo } from 'react';
import { 
  Star, 
  CheckCircle2, 
  ThumbsUp, 
  Image as ImageIcon, 
  Plus, 
  X, 
  UploadCloud, 
  Building2, 
  ShieldCheck, 
  Camera, 
  MessageSquare, 
  Send,
  Sparkles,
  ShoppingBag,
  UserCheck,
  Info,
  Check
} from 'lucide-react';
import { ProductReview, Product, Order, Customer, StaffMember } from '../../types';
import { checkCustomerVerifiedPurchase } from '../../services/dbService';

interface ProductReviewsSectionProps {
  product: Product;
  selectedVariantSku?: string;
  selectedVariantName?: string;
  reviews: ProductReview[];
  orders: Order[];
  activeCustomer?: Customer | null;
  onAddReview: (newReview: Omit<ProductReview, 'id' | 'date'>) => Promise<void> | void;
  onHelpfulClick?: (reviewId: string) => void;
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  product,
  selectedVariantSku,
  selectedVariantName,
  reviews = [],
  orders = [],
  activeCustomer,
  onAddReview,
  onHelpfulClick
}) => {
  // Filter only reviews for this product that are approved (or pending authored by user)
  const productReviews = useMemo(() => {
    return reviews.filter(r => {
      const isThisProduct = r.productId === product.id;
      if (!isThisProduct) return false;
      // Show approved reviews, or user's own review
      return r.status === 'approved' || !r.status || (r.status === 'pending' && activeCustomer?.email && r.userEmail === activeCustomer.email);
    });
  }, [reviews, product.id, activeCustomer?.email]);

  // UI state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'verified' | 'photos' | '5' | '4' | '3'>('all');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [helpfulVotedIds, setHelpfulVotedIds] = useState<Set<string>>(new Set());

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [userName, setUserName] = useState(activeCustomer?.name || '');
  const [userEmail, setUserEmail] = useState(activeCustomer?.email || '');
  const [orderId, setOrderId] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null);

  // Live Purchase Verification check for the form
  const purchaseVerification = useMemo(() => {
    return checkCustomerVerifiedPurchase(
      orders,
      {
        customerId: activeCustomer?.id,
        email: userEmail.trim(),
        orderId: orderId.trim()
      },
      product.id,
      selectedVariantSku
    );
  }, [orders, activeCustomer?.id, userEmail, orderId, product.id, selectedVariantSku]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = productReviews.length;
    if (total === 0) {
      return {
        avgRating: 5.0,
        totalReviews: 0,
        verifiedCount: 0,
        verifiedPercent: 100,
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }

    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    let verifiedCount = 0;

    productReviews.forEach(r => {
      const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
      counts[star] = (counts[star] || 0) + 1;
      sum += (r.rating || 5);
      if (r.verifiedPurchase) verifiedCount++;
    });

    return {
      avgRating: Number((sum / total).toFixed(1)),
      totalReviews: total,
      verifiedCount,
      verifiedPercent: Math.round((verifiedCount / total) * 100),
      breakdown: {
        5: Math.round(((counts[5] || 0) / total) * 100),
        4: Math.round(((counts[4] || 0) / total) * 100),
        3: Math.round(((counts[3] || 0) / total) * 100),
        2: Math.round(((counts[2] || 0) / total) * 100),
        1: Math.round(((counts[1] || 0) / total) * 100)
      }
    };
  }, [productReviews]);

  // Filtered reviews
  const displayedReviews = useMemo(() => {
    return productReviews.filter(rev => {
      if (activeFilter === 'verified' && !rev.verifiedPurchase) return false;
      if (activeFilter === 'photos' && (!rev.images || rev.images.length === 0)) return false;
      if (activeFilter === '5' && Math.round(rev.rating) !== 5) return false;
      if (activeFilter === '4' && Math.round(rev.rating) !== 4) return false;
      if (activeFilter === '3' && Math.round(rev.rating) !== 3) return false;
      return true;
    });
  }, [productReviews, activeFilter]);

  // All photos aggregated across reviews for gallery
  const allCustomerPhotos = useMemo(() => {
    const list: string[] = [];
    productReviews.forEach(r => {
      if (r.images && Array.isArray(r.images)) {
        r.images.forEach(img => {
          if (img && !list.includes(img)) list.push(img);
        });
      }
    });
    return list;
  }, [productReviews]);

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    (Array.from(files) as File[]).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setImages(prev => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove Photo
  const handleRemovePhoto = (index: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== index));
  };

  // Handle Review Submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !comment.trim() || !title.trim()) return;

    setIsSubmitting(true);
    try {
      // Strictly set verifiedPurchase based on real order match
      const isVerified = purchaseVerification.isVerified;

      await onAddReview({
        productId: product.id,
        productName: product.name,
        variantSku: selectedVariantSku,
        variantName: selectedVariantName,
        orderId: purchaseVerification.matchedOrder?.id || (orderId.trim() ? orderId.trim() : undefined),
        customerId: activeCustomer?.id,
        userName: userName.trim(),
        userEmail: userEmail.trim() || undefined,
        customer: {
          id: activeCustomer?.id,
          name: userName.trim(),
          email: userEmail.trim(),
        },
        rating,
        title: title.trim(),
        comment: comment.trim(),
        images,
        verifiedPurchase: isVerified, // Strictly computed based on actual order history
        status: 'approved',
        helpfulCount: 0
      });

      setSubmitSuccessMessage(
        isVerified
          ? 'Thank you! Your verified purchase review is now published.'
          : 'Thank you for your review! It has been successfully posted.'
      );
      setShowReviewForm(false);
      setTitle('');
      setComment('');
      setImages([]);
      setTimeout(() => setSubmitSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHelpful = (reviewId: string) => {
    if (helpfulVotedIds.has(reviewId)) return;
    setHelpfulVotedIds(prev => new Set(prev).add(reviewId));
    if (onHelpfulClick) {
      onHelpfulClick(reviewId);
    }
  };

  return (
    <div id="product-reviews-container" className="space-y-6">
      {/* Success banner */}
      {submitSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{submitSuccessMessage}</span>
          </div>
          <button onClick={() => setSubmitSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Reviews Summary Dashboard Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left: Big Rating Score */}
          <div className="md:col-span-4 text-center md:text-left border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Overall Customer Rating
            </span>
            <div className="flex items-center justify-center md:justify-start gap-3">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {stats.avgRating}
              </span>
              <div>
                <div className="flex items-center text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= Math.round(stats.avgRating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-500 font-medium mt-0.5 block">
                  Based on {stats.totalReviews} customer reviews
                </span>
              </div>
            </div>

            {/* Verified buyer ratio pill */}
            <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-semibold border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{stats.verifiedPercent}% of reviewers are Verified Buyers</span>
            </div>
          </div>

          {/* Center: Rating Distribution Bars */}
          <div className="md:col-span-5 space-y-1.5">
            {[5, 4, 3, 2, 1].map((starVal) => {
              const pct = (stats.breakdown as any)[starVal] || 0;
              return (
                <div key={starVal} className="flex items-center gap-2 text-xs">
                  <span className="w-12 font-semibold text-slate-600 text-right">{starVal} Stars</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-9 text-slate-400 text-[11px] font-mono text-right">{pct}%</span>
                </div>
              );
            })}
          </div>

          {/* Right: Write Review CTA */}
          <div className="md:col-span-3 flex flex-col justify-center items-center md:items-end">
            <button
              id="write-review-cta-btn"
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {showReviewForm ? (
                <>
                  <X className="w-4 h-4" />
                  <span>Close Form</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Write a Review</span>
                </>
              )}
            </button>
            <span className="text-[11px] text-slate-400 mt-2 text-center md:text-right">
              {purchaseVerification.isVerified 
                ? '✓ Verified purchase detected on your account' 
                : 'Share your real experience with other shoppers'}
            </span>
          </div>
        </div>
      </div>

      {/* Customer Photo Gallery (if photos exist) */}
      {allCustomerPhotos.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-indigo-600" />
              Customer Photo Gallery ({allCustomerPhotos.length})
            </h3>
            <span className="text-xs text-slate-400">Click to view high-res</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
            {allCustomerPhotos.map((imgUrl, i) => (
              <div
                key={i}
                onClick={() => setLightboxImage(imgUrl)}
                className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 cursor-pointer hover:scale-105 transition-all relative group bg-slate-100"
              >
                <img
                  src={imgUrl}
                  alt={`Customer uploaded photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* "Write a Review" Interactive Form Modal/Box */}
      {showReviewForm && (
        <div className="bg-white rounded-2xl p-6 border-2 border-indigo-200 shadow-md animate-in fade-in duration-150 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Write a Customer Review
              </h3>
              <p className="text-xs text-slate-500">
                Reviewing <strong className="text-slate-800">{product.name}</strong>
                {selectedVariantName && <span className="text-indigo-600 font-semibold"> ({selectedVariantName})</span>}
              </p>
            </div>
            <button
              onClick={() => setShowReviewForm(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Live Verified Purchase Notification */}
          <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 transition-all ${
            purchaseVerification.isVerified
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            {purchaseVerification.isVerified ? (
              <>
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <strong>Automatic Verified Purchase Status:</strong> You purchased this item in order{' '}
                  <span className="font-mono font-bold text-emerald-800">
                    {purchaseVerification.matchedOrder?.id}
                  </span>. Your review will receive the official green Verified Purchase badge.
                </div>
              </>
            ) : (
              <>
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <strong>Notice:</strong> Only customers with a confirmed order for this item will receive the green "Verified Purchase" badge. Enter your order ID or buyer email below if you purchased it.
                </div>
              </>
            )}
          </div>

          <form onSubmit={handleSubmitReview} className="space-y-4">
            {/* Interactive Star Rating Selector */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Your Overall Rating <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center text-amber-400">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      key={starVal}
                      type="button"
                      onMouseEnter={() => setHoverRating(starVal)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(starVal)}
                      className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          starVal <= (hoverRating || rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-700">
                  {rating === 5 && '5.0 — Outstanding / Highly Recommended'}
                  {rating === 4 && '4.0 — Very Good / Met Expectations'}
                  {rating === 3 && '3.0 — Average / Decent Quality'}
                  {rating === 2 && '2.0 — Below Expectations'}
                  {rating === 1 && '1.0 — Poor / Needs Major Improvement'}
                </span>
              </div>
            </div>

            {/* Review Title */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Review Headline / Summary <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                id="review-form-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Exceptional sound quality and comfortable fit!"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Review Detailed Comment */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Detailed Feedback & Experience <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                id="review-form-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you like or dislike about this product? How is the sizing, material, durability, or usability?"
                className="w-full p-3 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Reviewer Details Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Your Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  id="review-form-name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Your Email Address
                </label>
                <input
                  type="email"
                  id="review-form-email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="e.g. sarah.c@example.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Order ID (For Verification)
                </label>
                <input
                  type="text"
                  id="review-form-order-id"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g. ord-5001"
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Photo Upload Section */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                Attach Customer Photos (Optional)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer transition-colors">
                  <UploadCloud className="w-4 h-4 text-slate-500" />
                  <span>Choose Photos</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                {/* Previews */}
                {images.map((imgSrc, i) => (
                  <div key={i} className="w-14 h-14 rounded-xl border border-slate-200 relative group overflow-hidden bg-slate-100">
                    <img src={imgSrc} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(i)}
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="submit-customer-review-btn"
                disabled={isSubmitting || !userName.trim() || !comment.trim() || !title.trim()}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Post Customer Review'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: `All Reviews (${productReviews.length})` },
            { id: 'verified', label: `Verified Purchases (${productReviews.filter(r => r.verifiedPurchase).length})` },
            { id: 'photos', label: `With Photos (${allCustomerPhotos.length})` },
            { id: '5', label: '5 Stars ★' },
            { id: '4', label: '4 Stars ★' },
            { id: '3', label: '3 Stars ★' },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                activeFilter === chip.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Showing {displayedReviews.length} reviews
        </span>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {displayedReviews.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800 mb-1">No reviews match your selection</h4>
            <p className="text-xs text-slate-500 mb-3">Be the first to share your thoughts on this product!</p>
            <button
              onClick={() => {
                setActiveFilter('all');
                setShowReviewForm(true);
              }}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 cursor-pointer"
            >
              Write First Review
            </button>
          </div>
        ) : (
          displayedReviews.map((rev) => (
            <div
              key={rev.id}
              id={`product-review-item-${rev.id}`}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3 transition-all hover:border-slate-300"
            >
              {/* Header: User details, Verified status, and Stars */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                    {rev.avatar || rev.customer?.avatar ? (
                      <img
                        src={rev.avatar || rev.customer?.avatar}
                        alt={rev.userName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      rev.userName?.charAt(0).toUpperCase() || 'C'
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {rev.userName || rev.customer?.name || 'Customer'}
                      </span>

                      {/* Verified Purchase Badge */}
                      {rev.verifiedPurchase && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                          Verified Purchase
                        </span>
                      )}
                    </div>

                    {/* Variant and Location info */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      {rev.variantName && (
                        <span className="text-slate-600 font-medium">Purchased: {rev.variantName}</span>
                      )}
                      {rev.customer?.location && (
                        <span>• {rev.customer.location}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rating & Date */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1">
                  <div className="flex items-center text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= rev.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {new Date(rev.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Review Title & Body */}
              <div className="space-y-1 pt-1">
                <h4 className="text-xs font-bold text-slate-900">{rev.title}</h4>
                <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                  {rev.comment}
                </p>
              </div>

              {/* Attached Photos */}
              {rev.images && rev.images.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {rev.images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => setLightboxImage(imgUrl)}
                      className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:scale-105 transition-all bg-slate-50"
                    >
                      <img src={imgUrl} alt="Review attachment" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Official Admin / Store Response */}
              {rev.adminResponse && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-indigo-900 font-bold">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      <span>Official Store Response</span>
                      <span className="text-slate-500 font-normal text-[11px]">
                        — {rev.adminResponse.responderName} ({rev.adminResponse.responderRole || 'Store Staff'})
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {new Date(rev.adminResponse.respondedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-normal bg-white p-2.5 rounded-lg border border-slate-200/80">
                    {rev.adminResponse.text}
                  </p>
                </div>
              )}

              {/* Helpful vote action */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                <span>Was this review helpful?</span>
                <button
                  onClick={() => handleHelpful(rev.id)}
                  disabled={helpfulVotedIds.has(rev.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    helpfulVotedIds.has(rev.id)
                      ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${helpfulVotedIds.has(rev.id) ? 'text-emerald-600 fill-emerald-600' : 'text-slate-400'}`} />
                  <span>Helpful ({rev.helpfulCount || 0})</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Lightbox modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <img
              src={lightboxImage}
              alt="Enlarged customer photo"
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
