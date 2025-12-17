import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;

    setIsIOS(isIOSDevice);
    setIsStandalone(isInStandaloneMode);

    if (isInStandaloneMode) return;

    if (isIOSDevice) {
      setShowBanner(true);
      return;
    }

    if (window.deferredInstallPrompt) {
      setDeferredPrompt(window.deferredInstallPrompt);
      setShowBanner(true);
      return;
    }

    const handler = () => {
      if (window.deferredInstallPrompt) {
        setDeferredPrompt(window.deferredInstallPrompt);
        setShowBanner(true);
      }
    };

    window.addEventListener('pwainstallready', handler);
    return () => window.removeEventListener('pwainstallready', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showBanner || isStandalone) return null;

  return (
    <div 
      className="px-4 py-3 flex items-center justify-between gap-3 border-b-2 border-gray-300 bg-gray-100"
      data-testid="pwa-install-banner"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Download className="w-5 h-5 flex-shrink-0 text-gray-700" />
        <div className="min-w-0">
          {isIOS ? (
            <p className="text-sm font-medium text-gray-800">
              Install FamVoy: Tap <Share className="w-4 h-4 inline -mt-0.5 text-gray-700" /> then "Add to Home Screen"
            </p>
          ) : (
            <p className="text-sm font-medium text-gray-800">
              Get the app! Install FamVoy for quick access
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstall}
            className="bg-primary text-white px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
            data-testid="button-install-pwa"
          >
            Install
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
          aria-label="Dismiss"
          data-testid="button-dismiss-pwa-banner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
