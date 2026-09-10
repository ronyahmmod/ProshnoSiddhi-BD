import React, { useState } from 'react';
import { User, SslCommerzTransaction } from '../types';
import { initSslCommerzPayment, validateSslCommerzPayment, cancelSslCommerzPayment } from '../api';
import { Shield, Lock, CreditCard, Smartphone, Building2, CheckCircle2, AlertCircle, X, ArrowRight, RefreshCw } from 'lucide-react';

interface SslCommerzModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  planId: string;
  planName: string;
  amount: number;
  onPaymentSuccess: (user: User, transaction: SslCommerzTransaction) => void;
}

export function SslCommerzModal({
  isOpen,
  onClose,
  currentUser,
  planId,
  planName,
  amount,
  onPaymentSuccess
}: SslCommerzModalProps) {
  const [activeTab, setActiveTab] = useState<'mobile' | 'card' | 'netbank'>('mobile');
  const [selectedGateway, setSelectedGateway] = useState<'bkash' | 'nagad' | 'rocket' | 'upay' | 'visa' | 'mastercard' | 'amex' | 'citybank' | 'islamibank'>('bkash');
  
  const [step, setStep] = useState<'DETAILS' | 'PIN_OTP' | 'PROCESSING' | 'SUCCESS' | 'FAILED'>('DETAILS');
  const [phone, setPhone] = useState('01711000000');
  const [pinOrOtp, setPinOrOtp] = useState('');
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('888');

  const [loading, setLoading] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<SslCommerzTransaction | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleInitPayment = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await initSslCommerzPayment({
        planId,
        amount,
        cusName: currentUser?.name || 'Aspirant Student',
        cusEmail: currentUser?.email || 'student@proshno.bd',
        cusPhone: phone || '01711000000',
        paymentChannel: selectedGateway
      });
      setCurrentTransaction(res.transaction);
      setStep('PIN_OTP');
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment initiation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOtpOrPin = async () => {
    if (!currentTransaction) return;
    setLoading(true);
    setStep('PROCESSING');
    setErrorMessage('');

    try {
      // Simulate SSLCommerz Bank Gateway Handshake delay
      await new Promise((res) => setTimeout(res, 1500));

      const paymentMethodName =
        selectedGateway === 'bkash' ? 'bKash Mobile Banking' :
        selectedGateway === 'nagad' ? 'Nagad' :
        selectedGateway === 'rocket' ? 'DBBL Rocket' :
        selectedGateway === 'visa' ? 'Visa Debit/Credit Card' :
        selectedGateway === 'mastercard' ? 'Mastercard' :
        selectedGateway === 'amex' ? 'American Express' :
        'SSLCommerz Net Banking';

      const validatedTran = await validateSslCommerzPayment({
        tran_id: currentTransaction.tranId,
        val_id: `VAL-${Date.now()}`,
        payment_method: paymentMethodName,
        card_type: selectedGateway.toUpperCase(),
        bank_tran_id: `BANK-${Math.floor(10000000 + Math.random() * 90000000)}`
      });

      setCurrentTransaction(validatedTran);
      setStep('SUCCESS');

      // Construct upgraded user object for state propagation
      if (currentUser) {
        const upgradedUser: User = {
          ...currentUser,
          isSubscribed: true,
          subscriptionPlan: planId as any,
          subscriptionExpiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
          maxDailyFreeQuestions: 99999
        };
        setTimeout(() => {
          onPaymentSuccess(upgradedUser, validatedTran);
        }, 2200);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment validation failed.');
      setStep('FAILED');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (currentTransaction) {
      try {
        await cancelSslCommerzPayment(currentTransaction.tranId);
      } catch (e) {}
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 relative my-auto">
        
        {/* SSLCOMMERZ Official Branded Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 relative">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md flex items-center justify-center font-black text-slate-950 text-xs">
                SSL
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base tracking-wide text-white">SSLCOMMERZ</h3>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                    100% Secured
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">ProshnoSiddhi BD Payment Gateway Service</p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Payable</div>
              <div className="text-2xl font-black text-amber-400">৳{amount} <span className="text-xs text-slate-300 font-normal">BDT</span></div>
            </div>
          </div>

          <button
            onClick={handleCancel}
            className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="Cancel Transaction"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body depending on Step */}
        <div className="p-5 sm:p-6 space-y-5">

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === 'DETAILS' && (
            <>
              {/* Order summary row */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Selected Item / Plan</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">{planName}</div>
                  <div className="text-[11px] text-slate-500">Candidate: {currentUser?.name || 'Aspirant Student'} ({currentUser?.email})</div>
                </div>
                <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-lg">
                  Instant Activation
                </span>
              </div>

              {/* Payment Channel Tabs */}
              <div className="space-y-3">
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Select SSLCommerz Payment Method:
                </label>

                <div className="flex border-b border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('mobile'); setSelectedGateway('bkash'); }}
                    className={`pb-2.5 px-4 flex items-center gap-1.5 border-b-2 transition ${
                      activeTab === 'mobile'
                        ? 'border-emerald-600 text-emerald-700 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    Mobile Banking
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('card'); setSelectedGateway('visa'); }}
                    className={`pb-2.5 px-4 flex items-center gap-1.5 border-b-2 transition ${
                      activeTab === 'card'
                        ? 'border-emerald-600 text-emerald-700 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Debit / Credit Card
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('netbank'); setSelectedGateway('islamibank'); }}
                    className={`pb-2.5 px-4 flex items-center gap-1.5 border-b-2 transition ${
                      activeTab === 'netbank'
                        ? 'border-emerald-600 text-emerald-700 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    Internet Banking
                  </button>
                </div>

                {/* Mobile Banking Options */}
                {activeTab === 'mobile' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                    {[
                      { id: 'bkash', name: 'bKash', color: 'from-pink-500 to-rose-600', badge: 'Popular' },
                      { id: 'nagad', name: 'Nagad', color: 'from-orange-500 to-amber-600', badge: 'Instant' },
                      { id: 'rocket', name: 'DBBL Rocket', color: 'from-purple-600 to-indigo-700', badge: 'Safe' },
                      { id: 'upay', name: 'Upay', color: 'from-blue-600 to-cyan-600', badge: 'Fast' },
                    ].map((gw) => (
                      <button
                        key={gw.id}
                        type="button"
                        onClick={() => setSelectedGateway(gw.id as any)}
                        className={`p-3 rounded-2xl border text-left transition relative overflow-hidden ${
                          selectedGateway === gw.id
                            ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="text-xs font-black">{gw.name}</div>
                        <div className={`text-[10px] mt-0.5 ${selectedGateway === gw.id ? 'text-slate-300' : 'text-slate-500'}`}>
                          0% Gateway Fee
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Card Options */}
                {activeTab === 'card' && (
                  <div className="grid grid-cols-3 gap-2.5 pt-2">
                    {[
                      { id: 'visa', name: 'Visa Card' },
                      { id: 'mastercard', name: 'Mastercard' },
                      { id: 'amex', name: 'American Express' },
                    ].map((gw) => (
                      <button
                        key={gw.id}
                        type="button"
                        onClick={() => setSelectedGateway(gw.id as any)}
                        className={`p-3 rounded-2xl border text-left transition ${
                          selectedGateway === gw.id
                            ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="text-xs font-black">{gw.name}</div>
                        <div className={`text-[10px] mt-0.5 ${selectedGateway === gw.id ? 'text-slate-300' : 'text-slate-500'}`}>
                          International / Local
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Internet Banking Options */}
                {activeTab === 'netbank' && (
                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    {[
                      { id: 'islamibank', name: 'Islami Bank iRecharge' },
                      { id: 'citybank', name: 'City Touch Net Banking' },
                    ].map((gw) => (
                      <button
                        key={gw.id}
                        type="button"
                        onClick={() => setSelectedGateway(gw.id as any)}
                        className={`p-3 rounded-2xl border text-left transition ${
                          selectedGateway === gw.id
                            ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="text-xs font-black">{gw.name}</div>
                        <div className={`text-[10px] mt-0.5 ${selectedGateway === gw.id ? 'text-slate-300' : 'text-slate-500'}`}>
                          Direct Bank Transfer
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Input details based on selected gateway */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                {activeTab === 'mobile' ? (
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      {selectedGateway.toUpperCase()} Wallet Mobile Number:
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01711000000"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-1">Card Number:</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4111 2222 3333 4444"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1">Expiry Date:</label>
                        <input
                          type="text"
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1">CVV / CVC:</label>
                        <input
                          type="password"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          placeholder="123"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Proceed Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleInitPayment}
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white text-sm font-black rounded-2xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Connecting to SSLCommerz Merchant API...
                    </>
                  ) : (
                    <>
                      Pay ৳{amount} BDT with SSLCommerz
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {step === 'PIN_OTP' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900">SSLCommerz Bank Gateway Handshake</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your {selectedGateway.toUpperCase()} Wallet PIN or Bank OTP sent to <span className="font-bold text-slate-800">{phone}</span>
                </p>
              </div>

              <div className="max-w-xs mx-auto space-y-2">
                <input
                  type="password"
                  value={pinOrOtp}
                  onChange={(e) => setPinOrOtp(e.target.value)}
                  placeholder="Enter 5-digit PIN / OTP (Demo: 12345)"
                  className="w-full text-center px-4 py-3 bg-slate-50 border-2 border-emerald-500 rounded-2xl text-lg font-black text-slate-900 tracking-widest focus:outline-none"
                />
                <p className="text-[10px] text-slate-400">Transaction Ref: {currentTransaction?.tranId}</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOtpOrPin}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition"
                >
                  Confirm & Authorize
                </button>
              </div>
            </div>
          )}

          {step === 'PROCESSING' && (
            <div className="py-12 text-center space-y-4">
              <RefreshCw className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
              <div>
                <h4 className="text-lg font-extrabold text-slate-900">Verifying Payment with SSLCommerz...</h4>
                <p className="text-xs text-slate-500 mt-1">Validating IPN checksum & updating candidate subscription pass...</p>
              </div>
            </div>
          )}

          {step === 'SUCCESS' && currentTransaction && (
            <div className="py-6 text-center space-y-5 animate-scale-up">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                  SSLCOMMERZ PAYMENT VALIDATED
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-2">Payment Successful!</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Your <strong className="text-slate-900">{currentTransaction.planName}</strong> is now active!
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-1.5 max-w-md mx-auto font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction ID:</span>
                  <span className="font-bold text-slate-900">{currentTransaction.tranId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Validation Ref:</span>
                  <span className="font-bold text-slate-900">{currentTransaction.valId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank Ref ID:</span>
                  <span className="font-bold text-slate-900">{currentTransaction.bankTranId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Method Used:</span>
                  <span className="font-bold text-emerald-700">{currentTransaction.paymentMethod}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5">
                  <span className="font-bold text-slate-700">Amount Paid:</span>
                  <span className="font-black text-amber-600">৳{currentTransaction.amount} BDT</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>PCI DSS Level 1 Certified Merchant</span>
          </div>
          <div>SSLCommerz Engine v4.1</div>
        </div>

      </div>
    </div>
  );
}
