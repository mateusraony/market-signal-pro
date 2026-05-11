import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalErrorHandlers } from "./lib/errorLogger";
import { ensureAuroraTheme, installAuroraDebugHelpers, syncAuroraDebugPreference } from "./lib/auroraTheme";

installGlobalErrorHandlers();
syncAuroraDebugPreference();
installAuroraDebugHelpers();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
    });
  });
}

if ("caches" in window) {
  caches.keys().then((cacheNames) => {
    cacheNames.forEach((cacheName) => {
      caches.delete(cacheName);
    });
  });
}

// Aurora theme is permanently enabled
ensureAuroraTheme("main-entry");
try { localStorage.removeItem("aurora-theme-enabled"); } catch {}

createRoot(document.getElementById("root")!).render(<App />);
