import React, { useState } from 'react';
import { User, SslCommerzTransaction } from '../types';
import { upgradeUserSubscription } from '../api';
import { Crown, CheckCircle2, ShieldCheck, X, CreditCard, Lock } from 'lucide-react';
import { SslCommerzModal } from './SslCommerzModal';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserUpgraded: (user: User) => void;
}

export function SubscriptionModal({ isOpen, onClose, currentUser, onUserUpgraded }: SubscriptionModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'PRO_MONTHLY' | 'PRO_YEARLY'>('PRO_YEARLY');
  const [isSslModalOpen, setIsSslModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const planAmountMap = {
    PRO_MONTHLY: 250,
    PRO_YEARLY: 1500
  };

  const planNameMap = {
    PRO_MONTHLY: 'Monthly Pass (৳250/mo)',
    PRO_YEARLY: 'Annual Pass (৳1,500/yr)'
  };

  const handleSslSuccess = (upgradedUser: User, transaction: SslCommerzTransaction) => {
    setIsSslModalOpen(false);
    onUserUpgraded(upgradedUser);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 2200);
  };

  const handleQuickActivateDemo = async () => {
    setLoading(true);
    try {
      const updated = await upgradeUserSubscription(selectedPlan);
      onUserUpgraded(updated);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1800);
    } catch (err: any) {
      alert(err.message || 'Upgrade failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
        <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>

          {success ? (
            <div className="p-10 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Pro Pass Activated via SSLCommerz! 🎉</h2>
              <p className="text-sm text-slate-600">
                Congratulations! You now have unlimited question bank access, AI explanations, custom AI quiz generation, & 1v1 peer challenges!
              </p>
            </div>
          ) : (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 uppercase tracking-wide">
                  <Crown className="w-3.5 h-3.5 fill-amber-500" /> BCS & Govt Job Pro Pass
                </span>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  Unlock Unlimited Exam Preparation
                </h2>
                <p className="text-xs text-slate-500">
                  Current Status: <span className="font-semibold">{currentUser?.isSubscribed ? 'Active Subscriber' : 'Free Tier'}</span>
                </p>
              </div>

              {/* Plan selection cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setSelectedPlan('PRO_MONTHLY')}
                  className={`p-4 rounded-2xl border cursor-pointer text-center transition ${
                    selectedPlan === 'PRO_MONTHLY'
                      ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-600">Monthly Pass</div>
                  <div className="text-xl font-black text-slate-900 mt-1">৳250</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">/ month</div>
                </div>

                <div
                  onClick={() => setSelectedPlan('PRO_YEARLY')}
                  className={`p-4 rounded-2xl border cursor-pointer text-center transition relative ${
                    selectedPlan === 'PRO_YEARLY'
                      ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                    Best Value
                  </span>
                  <div className="text-xs font-bold text-indigo-700">Annual Pass</div>
                  <div className="text-xl font-black text-slate-900 mt-1">৳1,500</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">৳125 / month (Save 50%)</div>
                </div>
              </div>

              {/* Feature List */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-200/80">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Pass Benefits:</div>
                <ul className="text-xs text-slate-700 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Unlimited Question Bank Access</strong> (No daily limits)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Full BCS & Bank Model Tests</strong> with negative marking (-0.25)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Step-by-Step Mathematical Solutions</strong> & Custom Quiz Engine</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>1v1 Live Peer Quiz Battles</strong> & Moderator Chat Support</span>
                  </li>
                </ul>
              </div>

              {/* SSLCOMMERZ Payment Action */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setIsSslModalOpen(true)}
                  className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm shadow-xl shadow-slate-900/20 transition flex items-center justify-center gap-3 border border-slate-700"
                >
                  <div className="w-6 h-6 rounded bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                    SSL
                  </div>
                  <span>Pay ৳{planAmountMap[selectedPlan]} with SSLCommerz Gateway</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </button>

                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Supports bKash, Nagad, Rocket, Cards & Net Banking
                  </span>
                  <button
                    type="button"
                    onClick={handleQuickActivateDemo}
                    disabled={loading}
                    className="text-amber-700 font-bold hover:underline"
                  >
                    {loading ? 'Activating...' : '1-Click Instant Demo Activate'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <SslCommerzModal
        isOpen={isSslModalOpen}
        onClose={() => setIsSslModalOpen(false)}
        currentUser={currentUser}
        planId={selectedPlan}
        planName={planNameMap[selectedPlan]}
        amount={planAmountMap[selectedPlan]}
        onPaymentSuccess={handleSslSuccess}
      />
    </>
  );
}

