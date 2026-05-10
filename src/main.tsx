import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalErrorHandlers } from "./lib/errorLogger";
import { ensureAuroraTheme, installAuroraDebugHelpers, syncAuroraDebugPreference } from "./lib/auroraTheme";

installGlobalErrorHandlers();
syncAuroraDebugPreference();
installAuroraDebugHelpers();

// Aurora theme is permanently enabled
ensureAuroraTheme("main-entry");
try { localStorage.removeItem("aurora-theme-enabled"); } catch {}

createRoot(document.getElementById("root")!).render(<App />);
