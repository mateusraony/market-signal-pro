import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalErrorHandlers } from "./lib/errorLogger";

installGlobalErrorHandlers();

// Aurora theme is always enabled
document.documentElement.classList.remove("aurora-off");
document.documentElement.setAttribute("data-aurora", "on");
try { localStorage.removeItem("aurora-theme-enabled"); } catch {}

createRoot(document.getElementById("root")!).render(<App />);
