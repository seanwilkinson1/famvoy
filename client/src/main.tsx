import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
  }
  interface Window {
    deferredInstallPrompt: BeforeInstallPromptEvent | null;
  }
}

window.deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredInstallPrompt = e;
  window.dispatchEvent(new CustomEvent('pwainstallready'));
});

function ClerkApp() {
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.clerkPublishableKey) {
          setPublishableKey(data.clerkPublishableKey);
        } else {
          setError('Clerk publishable key not configured');
        }
      })
      .catch(err => {
        setError('Failed to load configuration');
        console.error(err);
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-soft-beige flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-charcoal/60">{error}</p>
        </div>
      </div>
    );
  }

  if (!publishableKey) {
    return (
      <div className="min-h-screen bg-soft-beige flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-warm-teal border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <App />
    </ClerkProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkApp />
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}
