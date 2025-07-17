import { UserButton, useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const { isSignedIn } = useUser();
  const navigate = useNavigate();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Video className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl">Connectify</span>
        </div>

        <div className="flex items-center space-x-4">
          {isSignedIn ? (
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8"
                }
              }}
            />
          ) : (
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/sign-in")}
              >
                Sign In
              </Button>
              <Button 
                variant="default" 
                onClick={() => navigate("/sign-up")}
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
