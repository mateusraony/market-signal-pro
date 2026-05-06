import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalErrorHandlers } from "./lib/errorLogger";

installGlobalErrorHandlers();

// Apply Aurora theme preference before first paint to avoid flash on any route
try {
  const stored = localStorage.getItem("aurora-theme-enabled");
  const enabled = stored === null ? true : stored === "true";
  const root = document.documentElement;
  root.classList.toggle("aurora-off", !enabled);
  root.setAttribute("data-aurora", enabled ? "on" : "off");
} catch {
  document.documentElement.setAttribute("data-aurora", "on");
}

createRoot(document.getElementById("root")!).render(<App />);
