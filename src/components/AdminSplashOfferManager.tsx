import React, { useState, useEffect } from 'react';
import { SplashOffer, User } from '../types';
import { fetchSplashOffer, updateSplashOffer } from '../api';
import {
  Sparkles,
  Save,
  Eye,
  AlertCircle,
  CheckCircle2,
  Tag,
  Image as ImageIcon,
  Clock,
  ExternalLink,
  Megaphone,
  Plus
} from 'lucide-react';
import { BroadcastNotificationModal } from './BroadcastNotificationModal';

interface AdminSplashOfferManagerProps {
  currentUser: User | null;
}

export function AdminSplashOfferManager({ currentUser }: AdminSplashOfferManagerProps) {
  const [offer, setOffer] = useState<SplashOffer | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [badgeText, setBadgeText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState<number | ''>('');
  const [ctaText, setCtaText] = useState('');
  const [ctaAction, setCtaAction] = useState<SplashOffer['ctaAction']>('SUBSCRIPTION');
  const [externalUrl, setExternalUrl] = useState('');
  const [active, setActive] = useState(true);
  const [dismissDurationHours, setDismissDurationHours] = useState(24);

  const loadOffer = async () => {
    setLoading(true);
    try {
      const data = await fetchSplashOffer();
      setOffer(data);
      if (data) {
        setTitle(data.title || '');
        setSubtitle(data.subtitle || '');
        setDescription(data.description || '');
        setBadgeText(data.badgeText || '');
        setImageUrl(data.imageUrl || '');
        setPromoCode(data.promoCode || '');
        setDiscountPercentage(data.discountPercentage ?? '');
        setCtaText(data.ctaText || '');
        setCtaAction(data.ctaAction || 'SUBSCRIPTION');
        setExternalUrl(data.externalUrl || '');
        setActive(data.active ?? true);
        setDismissDurationHours(data.dismissDurationHours || 24);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load splash offer configuration' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffer();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setFeedback({ type: 'error', message: 'Offer title and description are required.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const updated = await updateSplashOffer({
        title: title.trim(),
        subtitle: subtitle.trim(),
        description: description.trim(),
        badgeText: badgeText.trim() || 'SPECIAL OFFER',
        imageUrl: imageUrl.trim() || undefined,
        promoCode: promoCode.trim() || undefined,
        discountPercentage: discountPercentage !== '' ? Number(discountPercentage) : undefined,
        ctaText: ctaText.trim() || 'Claim Offer Now',
        ctaAction,
        externalUrl: externalUrl.trim() || undefined,
        active,
        dismissDurationHours: Number(dismissDurationHours) || 24
      });
      setOffer(updated);
      setFeedback({ type: 'success', message: 'Boot splash announcement updated & published successfully!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update splash offer' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestResetDismiss = () => {
    if (offer) {
      localStorage.removeItem(`dismissed_splash_offer_${offer.id}`);
      setFeedback({
        type: 'success',
        message: 'Dismissal cache cleared for your browser! Reload to see splash screen.'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-amber-500/20 text-amber-800 border border-amber-500/30 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Booting Screen Ad & Offer Manager
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              {active ? '● Live on Boot' : '○ Disabled'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2">
            Splash Screen Announcement & Offer Modal
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure promotional deals, admission discounts, and notice popups that candidates see on boot.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBroadcastModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1.5 border border-indigo-200/60"
          >
            <Megaphone className="w-4 h-4 text-indigo-600" />
            <span>Broadcast SMS / Notice</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4 text-slate-600" />
            <span>{showPreview ? 'Hide Preview' : 'Preview Layout'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Live Preview Card */}
      {showPreview && (
        <div className="p-6 rounded-3xl bg-slate-900/95 text-white border border-slate-800 shadow-2xl flex flex-col items-center justify-center">
          <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
            Live Preview (How Candidate sees it upon opening the app)
          </div>
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl text-slate-900 overflow-hidden border border-slate-200">
            {imageUrl ? (
              <div className="relative h-40 w-full overflow-hidden bg-slate-900">
                <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                    {badgeText || 'SPECIAL OFFER'}
                  </span>
                  {discountPercentage && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                      {discountPercentage}% OFF
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-indigo-900 text-white">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                  {badgeText || 'SPECIAL OFFER'}
                </span>
              </div>
            )}
            <div className="p-5 space-y-2">
              <h3 className="text-lg font-black text-slate-900">{title || 'Headline'}</h3>
              {subtitle && <p className="text-xs font-bold text-indigo-600">{subtitle}</p>}
              <p className="text-xs text-slate-600 leading-relaxed">{description || 'Offer details will appear here.'}</p>
              {promoCode && (
                <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-900">Code: {promoCode}</span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded font-bold border border-indigo-200 text-indigo-700">Copy</span>
                </div>
              )}
              <div className="pt-2">
                <div className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs text-center shadow-xs">
                  {ctaText || 'Claim Offer Now'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offer Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Offer Visibility & Status</h3>
            <p className="text-xs text-slate-500">Toggle whether this modal appears to users during app startup</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            <span className="ml-3 text-xs font-bold text-slate-700">
              {active ? 'Active (Display on Boot)' : 'Inactive (Hidden)'}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Headline Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., BCS & Bank Special Model Test Admission Open!"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Subheading / Secondary Line</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g., Get instant 50% discount on Pro Lifetime Pass"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Offer Description <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain the perks, syllabus coverage, live rankings, or discount instructions..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-indigo-600"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Badge Tag</label>
            <input
              type="text"
              value={badgeText}
              onChange={(e) => setBadgeText(e.target.value)}
              placeholder="e.g., FLASH OFFER"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Promo Coupon Code</label>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="e.g., PRO50"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Discount (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={discountPercentage}
              onChange={(e) => setDiscountPercentage(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g., 50"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Banner Image URL</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">CTA Button Text</label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="e.g., Claim Offer Now"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">CTA Destination Action</label>
            <select
              value={ctaAction}
              onChange={(e) => setCtaAction(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-indigo-600"
            >
              <option value="SUBSCRIPTION">Open Pro Pass Subscription Modal</option>
              <option value="QUESTION_BANK">Navigate to Question Bank</option>
              <option value="BLOG">Navigate to Blog & Notices</option>
              <option value="EXTERNAL">Open External Link</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Dismiss Frequency (Hours)</label>
            <input
              type="number"
              min="1"
              max="168"
              value={dismissDurationHours}
              onChange={(e) => setDismissDurationHours(Number(e.target.value))}
              placeholder="24"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-indigo-600"
            />
            <span className="text-[10px] text-slate-400">
              When user clicks Close (X), modal won't show again for {dismissDurationHours} hours.
            </span>
          </div>
        </div>

        {ctaAction === 'EXTERNAL' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">External Target URL</label>
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-indigo-600"
            />
          </div>
        )}

        {/* Form Action Controls */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleTestResetDismiss}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            Clear local dismiss cache (Test view now)
          </button>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Publishing...' : 'Save & Publish Splash Offer'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Broadcast Modal */}
      <BroadcastNotificationModal
        currentUser={currentUser}
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        onSuccess={() => {
          setFeedback({ type: 'success', message: 'Broadcast notification transmitted successfully!' });
        }}
      />
    </div>
  );
}
