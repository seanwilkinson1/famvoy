import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";

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
