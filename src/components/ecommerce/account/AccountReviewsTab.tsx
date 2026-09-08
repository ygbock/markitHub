import React, { useState } from 'react';
import { ProductReview, Product, Order } from '../../../types';
import { 
  Star, MessageSquare, CheckCircle2, Sparkles, Plus, 
  Trash2, ThumbsUp, Package, ExternalLink, X, Send
} from 'lucide-react';

interface AccountReviewsTabProps {
  reviews: ProductReview[];
  customerName: string;
  purchasedProducts: Product[];
  onAddReview: (review: Omit<ProductReview, 'id' | 'createdAt' | 'helpfulVotes' | 'status'>) => void;
  onOpenProduct?: (product: Product) => void;
}

export const AccountReviewsTab: React.FC<AccountReviewsTabProps> = ({
  reviews,
  customerName,
  purchasedProducts,
  onAddReview,
  onOpenProduct
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'published' | 'awaiting'>('published');
  const [writingForProduct, setWritingForProduct] = useState<Product | null>(null);

  // Review Form state
  const [rating, setRating] = useState(5);
  const [headline, setHeadline] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter reviews by this customer
  const myReviews = reviews.filter(r => 
    r.customerName?.toLowerCase() === customerName.toLowerCase() ||
    r.author?.toLowerCase() === customerName.toLowerCase()
  );

  // Products awaiting review
  const reviewedProductIds = new Set(myReviews.map(r => r.productId));
  const awaitingProducts = purchasedProducts.filter(p => !reviewedProductIds.has(p.id));

  const handleStartReview = (product: Product) => {
    setWritingForProduct(product);
    setRating(5);
    setHeadline('');
    setComment('');
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!writingForProduct || !headline || !comment) return;

    setSubmitting(true);
    onAddReview({
      productId: writingForProduct.id,
      productName: writingForProduct.name,
      customerName: customerName,
      author: customerName,
      rating,
      title: headline,
      headline: headline,
      comment: comment,
      content: comment,
      verifiedPurchase: true
    });

    setSubmitting(false);
    setWritingForProduct(null);
    setActiveSubTab('published');
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150" id="account-tab-reviews">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
            <span>My Product Reviews & Ratings</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Share feedback on your verified purchases to earn bonus loyalty reward points.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSubTab('published')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'published'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Published ({myReviews.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('awaiting')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'awaiting'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Awaiting Review</span>
            {awaitingProducts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-mono font-bold">
                {awaitingProducts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Write Review Modal / Inline Box */}
      {writingForProduct && (
        <form onSubmit={handleSubmitReview} className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-amber-500/40 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Star className="w-5 h-5 fill-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Review: {writingForProduct.name}</h3>
                <span className="text-xs text-amber-600 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Earn +50 Loyalty Points upon review approval</span>
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setWritingForProduct(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Star Rating Picker */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Your Rating *</label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 text-slate-300 hover:scale-110 transition-transform cursor-pointer"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-bold text-slate-600 ml-2">
                {rating === 5 ? '5 Stars (Excellent)' : `${rating} Stars`}
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Review Headline *</label>
              <input
                type="text"
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Outstanding quality, fast delivery in Freetown!"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Your Experience / Feedback *</label>
              <textarea
                required
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share specific details about performance, durability, build quality, and usability..."
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setWritingForProduct(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Review (+50 Pts)</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. Published Reviews Sub-View */}
      {activeSubTab === 'published' && (
        myReviews.length > 0 ? (
          <div className="space-y-3">
            {myReviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-xs text-slate-900">{rev.title || rev.headline}</span>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Verified Purchase</span>
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  {rev.content || rev.comment}
                </p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-medium text-slate-800">
                    Product: {rev.productName || 'Catalog Item'}
                  </span>
                  <span>{new Date(rev.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200/90 shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
              <Star className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No published reviews yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven't written any reviews yet. Review your delivered items to earn +50 loyalty points per review.
            </p>
          </div>
        )
      )}

      {/* 4. Awaiting Review Sub-View */}
      {activeSubTab === 'awaiting' && (
        awaitingProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {awaitingProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {prod.imageUrl ? (
                    <img src={prod.imageUrl} alt={prod.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">
                      PKG
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-xs text-slate-900 truncate">{prod.name}</h5>
                    <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                      <Sparkles className="w-3 h-3" />
                      <span>+50 Bonus Points</span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleStartReview(prod)}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  Write Review
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/90 shadow-2xs space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">All caught up!</h3>
            <p className="text-xs text-slate-500">
              You have reviewed all your purchased items. Thank you for supporting the community!
            </p>
          </div>
        )
      )}

    </div>
  );
};
