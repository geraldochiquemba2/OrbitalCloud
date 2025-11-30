import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import About from "@/pages/about";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import SharePage from "@/pages/share";
import AdminPage from "@/pages/admin";
import PublicFolderPage from "@/pages/public-folder";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { InactivityWarningModal } from "@/components/InactivityWarningModal";

function InactivityHandler({ children }: { children: React.ReactNode }) {
  const { showWarning, secondsLeft, handleStayActive } = useInactivityTimeout();
  
  return (
    <>
      {children}
      <InactivityWarningModal 
        isOpen={showWarning}
        secondsLeft={secondsLeft}
        onStayActive={handleStayActive}
      />
    </>
  );
}

function Router() {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const isFirstRender = useRef(true);
  
  const animationDuration = isMobile ? 0.2 : 0.3;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: animationDuration, ease: "easeOut" }}
      >
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/about" component={About} />
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/share/:linkCode" component={SharePage} />
          <Route path="/p/:slug" component={PublicFolderPage} />
          <Route component={NotFound} />
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    
    const isMobileDevice = window.innerWidth < 768;
    const initialLoader = document.getElementById('initial-loader');
    
    const hideInitialLoader = () => {
      if (initialLoader) {
        initialLoader.classList.add('hidden');
        setTimeout(() => {
          initialLoader.remove();
        }, 300);
      }
    };
    
    const preloadImages = [
      "/src/assets/generated_images/minimalist_cloud_storage_icon.png",
      "/src/assets/generated_images/about_page_video_first_frame.png",
    ];

    let loadedCount = 0;
    const totalAssets = preloadImages.length;

    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalAssets) {
        hideInitialLoader();
      }
    };

    preloadImages.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = checkAllLoaded;
      img.onerror = checkAllLoaded;
    });

    const timeoutMs = isMobileDevice ? 1000 : 2000;
    const timeout = setTimeout(() => hideInitialLoader(), timeoutMs);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <InactivityHandler>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </InactivityHandler>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;