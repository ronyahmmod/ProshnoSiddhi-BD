import React, { useState, useEffect } from 'react';
import { SplashOffer } from '../types';
import { X, Sparkles, ArrowRight, Tag, Check, Clock } from 'lucide-react';

interface SplashScreenOfferModalProps {
  offer: SplashOffer | null;
  onNavigateTab: (tab: string) => void;
}

export function SplashScreenOfferModal({ offer, onNavigateTab }: SplashScreenOfferModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [dontShowToday, setDontShowToday] = useState(false);

  useEffect(() => {
    if (!offer || !offer.active) {
      setIsOpen(false);
      return;
    }

    const dismissedKey = `dismissed_splash_offer_${offer.id}`;
    const dismissedTimestamp = localStorage.getItem(dismissedKey);

    if (dismissedTimestamp) {
      const hoursPassed = (Date.now() - parseInt(dismissedTimestamp, 10)) / (1000 * 60 * 60);
      const dismissDuration = offer.dismissDurationHours || 24;
      if (hoursPassed < dismissDuration) {
        setIsOpen(false);
        return;
      }
    }

    // Small delay for smooth entry on boot
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 600);

    return () => clearTimeout(timer);
  }, [offer]);

  if (!isOpen || !offer) return null;

  const handleDismiss = () => {
    setIsOpen(false);
    const dismissedKey = `dismissed_splash_offer_${offer.id}`;
    localStorage.setItem(dismissedKey, Date.now().toString());
  };

  const handleCtaClick = () => {
    handleDismiss();
    if (offer.ctaAction === 'SUBSCRIPTION') {
      onNavigateTab('subscription');
    } else if (offer.ctaAction === 'QUESTION_BANK') {
      onNavigateTab('bank');
    } else if (offer.ctaAction === 'BLOG') {
      onNavigateTab('blog');
    } else if (offer.ctaAction === 'EXTERNAL' && offer.externalUrl) {
      window.open(offer.externalUrl, '_blank', 'noopener,noreferrer');
    } else {
      onNavigateTab('subscription');
    }
  };

  const handleCopyPromo = () => {
    if (!offer.promoCode) return;
    navigator.clipboard.writeText(offer.promoCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-300">
      <div
        className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Dismiss Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white flex items-center justify-center transition shadow-md hover:scale-105 active:scale-95"
          title="Close announcement"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Banner image or artistic gradient background */}
        {offer.imageUrl ? (
          <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-slate-900">
            <img
              src={offer.imageUrl}
              alt={offer.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-extrabold tracking-wide shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
                {offer.badgeText || 'SPECIAL OFFER'}
              </span>
              {offer.discountPercentage && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-xs font-black shadow-md">
                  {offer.discountPercentage}% OFF
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="relative p-6 bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 text-white">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-extrabold tracking-wide shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
                {offer.badgeText || 'SPECIAL ANNOUNCEMENT'}
              </span>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              {offer.title}
            </h2>
            {offer.subtitle && (
              <p className="mt-1 text-sm font-semibold text-indigo-600">
                {offer.subtitle}
              </p>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {offer.description}
          </p>

          {/* Promo code badge if provided */}
          {offer.promoCode && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-indigo-500">Coupon Promo Code</div>
                  <div className="text-sm font-mono font-black text-indigo-900 tracking-wider">
                    {offer.promoCode}
                  </div>
                </div>
              </div>
              <button
                onClick={handleCopyPromo}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition shadow-2xs"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <span>Copy Code</span>
                )}
              </button>
            </div>
          )}

          {/* Call to action & Dismiss actions */}
          <div className="pt-2 space-y-2.5">
            <button
              onClick={handleCtaClick}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <span>{offer.ctaText || 'Claim Offer Now'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between px-1 text-xs text-slate-500 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dontShowToday}
                  onChange={(e) => setDontShowToday(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>Don't show this splash again today</span>
              </label>

              <button
                onClick={handleDismiss}
                className="font-medium text-slate-400 hover:text-slate-700 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
