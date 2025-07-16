import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./components/auth/AuthPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MeetingRoom from "./components/meeting/MeetingRoom";

const queryClient = new QueryClient();

// You need to set your Clerk Publishable Key here
// Get it from: https://go.clerk.com/lovable
const PUBLISHABLE_KEY = "pk_test_c3RpcnJlZC1zaWxrd29ybS05Mi5jbGVyay5hY2NvdW50cy5kZXYk";

const App = () => {
  // if (!PUBLISHABLE_KEY || PUBLISHABLE_KEY === "pk_test_c3RpcnJlZC1zaWxrd29ybS05Mi5jbGVyay5hY2NvdW50cy5kZXYk") {
  //   return (
  //     <div className="min-h-screen bg-background flex items-center justify-center p-4">
  //       <div className="text-center max-w-md">
  //         <h1 className="text-2xl font-bold mb-4 text-destructive">
  //           Clerk Configuration Required
  //         </h1>
  //         <p className="text-muted-foreground mb-4">
  //           Please set your Clerk Publishable Key in src/App.tsx to enable authentication.
  //         </p>
  //         <p className="text-sm text-muted-foreground">
  //           Get your key from:{" "}
  //           <a 
  //             href="https://go.clerk.com/lovable" 
  //             target="_blank" 
  //             rel="noopener noreferrer"
  //             className="text-primary hover:underline"
  //           >
  //             https://go.clerk.com/lovable
  //           </a>
  //         </p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/sign-in" element={<AuthPage mode="sign-in" />} />
              <Route path="/sign-up" element={<AuthPage mode="sign-up" />} />
              <Route 
                path="/meeting/:meetingId" 
                element={
                  <ProtectedRoute>
                    <MeetingRoom />
                  </ProtectedRoute>
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
};

export default App;
