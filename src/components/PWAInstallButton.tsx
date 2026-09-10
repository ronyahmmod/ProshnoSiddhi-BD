import React, { useState } from 'react';
import { usePWAInstall } from '../usePWAInstall';
import { Download, Smartphone, X, Check, Share, PlusSquare } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ className = '', compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      await install();
    } finally {
      setInstalling(false);
    }
  };

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={handleInstallClick}
        disabled={installing}
        className={`flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-xs hover:shadow transition-all shrink-0 active:scale-95 ${
          compact ? 'px-2.5 py-1.5' : 'px-3 py-1.5 sm:px-3.5 sm:py-2'
        } ${className}`}
        title="Install ProshnoSiddhi Progressive Web App on your device"
      >
        <Download className="w-3.5 h-3.5 text-indigo-100" />
        <span className="whitespace-nowrap">{compact ? 'Install' : 'Install PWA'}</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-800 font-bold text-xs transition shrink-0 ${
            compact ? 'px-2 py-1.5' : 'px-3 py-1.5'
          } ${className}`}
          title="Install on iPhone or iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
          <span className="whitespace-nowrap">{compact ? 'Install' : 'Install on iOS'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Install ProshnoSiddhi BD</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p className="font-semibold text-slate-800 flex items-center gap-2">
                  <Share className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>1. Tap the <strong>Share</strong> icon in Safari toolbar</span>
                </p>
                <p className="font-semibold text-slate-800 flex items-center gap-2">
                  <PlusSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>2. Scroll down & select <strong>Add to Home Screen</strong></span>
                </p>
                <p className="font-semibold text-slate-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>3. Tap <strong>Add</strong> to launch like a native mobile app!</span>
                </p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop or browsers where prompt not triggered yet: show friendly install button that guides user
  return (
    <button
      onClick={() => {
        alert("To install ProshnoSiddhi BD:\n1. Click the 'Install App' or '+' icon in your browser address bar.\n2. Or tap your browser settings menu > 'Install ProshnoSiddhi BD'.");
      }}
      className={`hidden sm:flex items-center gap-1.5 rounded-xl border border-indigo-200/80 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition shrink-0 ${
        compact ? 'px-2 py-1.5' : 'px-3 py-1.5'
      } ${className}`}
      title="Install ProshnoSiddhi as a Progressive Web App"
    >
      <Download className="w-3.5 h-3.5 text-indigo-500" />
      <span className="whitespace-nowrap">Install App</span>
    </button>
  );
};
