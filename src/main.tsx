import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalErrorHandlers } from "./lib/errorLogger";

installGlobalErrorHandlers();

// Apply Aurora theme preference before first paint to avoid flash on any route
try {
  const stored = localStorage.getItem("aurora-theme-enabled");
  const enabled = stored === null ? true : stored === "true";
  if (!enabled) document.documentElement.classList.add("aurora-off");
} catch {}

createRoot(document.getElementById("root")!).render(<App />);
