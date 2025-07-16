import { SignIn, SignUp, useUser } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";

interface AuthPageProps {
  mode: "sign-in" | "sign-up";
}

export default function AuthPage({ mode }: AuthPageProps) {
  const { isSignedIn, isLoaded } = useUser();

  // Redirect if already signed in
  if (isLoaded && isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Video Meet
          </h1>
          <p className="text-muted-foreground">
            {mode === "sign-in" ? "Welcome back!" : "Create your account"}
          </p>
        </div>
        
        <Card className="p-6">
          {mode === "sign-in" ? (
            <SignIn 
              appearance={{
                elements: {
                  formButtonPrimary: "bg-primary hover:bg-primary/90",
                  card: "shadow-none",
                }
              }}
              fallbackRedirectUrl="/"
            />
          ) : (
            <SignUp 
              appearance={{
                elements: {
                  formButtonPrimary: "bg-primary hover:bg-primary/90",
                  card: "shadow-none",
                }
              }}
              fallbackRedirectUrl="/"
            />
          )}
        </Card>
      </div>
    </div>
  );
}