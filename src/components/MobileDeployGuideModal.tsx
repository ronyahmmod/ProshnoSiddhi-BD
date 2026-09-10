import React from 'react';
import {
  Smartphone,
  X,
  Download,
  ExternalLink,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Globe
} from 'lucide-react';

interface MobileDeployGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDeployGuideModal: React.FC<MobileDeployGuideModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950 flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5" /> Mobile App
            </span>
            <span className="text-xs text-emerald-200 font-semibold">Official Stores</span>
          </div>

          <h2 className="text-2xl font-black tracking-tight">
            Get PROSHNOSIDDHI Mobile App
          </h2>
          <p className="text-emerald-100/90 text-xs mt-1">
            Download our verified mobile application to practice BCS & Govt job model tests on the go.
          </p>
        </div>

        {/* Store Links & Download Actions */}
        <div className="p-6 space-y-5 text-slate-800">
          
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
            <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h4 className="font-extrabold text-emerald-950 text-sm">
                Published & Store Ready
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Practice offline, receive daily exam alerts, and synchronize your progress seamlessly across devices.
              </p>
            </div>
          </div>

          {/* Store Download Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Google Play Store */}
            <a
              href="https://play.google.com/store/apps"
              target="_blank"
              rel="noreferrer"
              className="p-5 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 border border-slate-800 shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      GET IT ON
                    </span>
                    <span className="text-base font-black text-white group-hover:text-emerald-400 transition-colors">
                      Google Play
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </div>
              
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Android 8.0+</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              </div>
            </a>

            {/* Apple App Store */}
            <a
              href="https://www.apple.com/app-store/"
              target="_blank"
              rel="noreferrer"
              className="p-5 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 border border-slate-800 shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-sky-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Download on the
                    </span>
                    <span className="text-base font-black text-white group-hover:text-sky-400 transition-colors">
                      App Store
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>iOS 14.0+</span>
                <span className="text-sky-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              </div>
            </a>
          </div>

          {/* Features Highlights */}
          <div className="space-y-2 pt-2">
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mobile App Highlights</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Instant timed tests with negative marking</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Offline revision notebook & explanation view</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Daily BCS streak reminders & progress sync</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Instant Bengali & English question support</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>Official PROSHNOSIDDHI Application</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
