import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ensureAuroraTheme, repairAuroraIfNeeded } from "@/lib/auroraTheme";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AuroraRouteGuard() {
  const location = useLocation();

  useEffect(() => {
    ensureAuroraTheme("route-change");
    repairAuroraIfNeeded("route-change", {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    });
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      repairAuroraIfNeeded("dom-mutation", { pathname: window.location.pathname });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-aurora", "class", "style"],
    });

    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["data-aurora", "class", "style"],
      });
    }

    return () => observer.disconnect();
  }, []);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <div className="aurora-shell text-foreground">
        <div className="relative z-10 min-h-screen">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuroraRouteGuard />
            <AuthProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/" element={<Index />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </div>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
