import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Users, Shield, Zap } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function LandingPage() {
  const [meetingCode, setMeetingCode] = useState("");
  const navigate = useNavigate();

  const createMeeting = () => {
    const newMeetingId = uuidv4();
    navigate(`/meeting/${newMeetingId}`);
  };

  const joinMeeting = () => {
    if (meetingCode.trim()) {
      navigate(`/meeting/${meetingCode.trim()}`);
    }
  };

  const features = [
    {
      icon: Video,
      title: "HD Video Quality",
      description: "Crystal clear video calls with adaptive quality"
    },
    {
      icon: Users,
      title: "Group Meetings",
      description: "Connect with multiple participants seamlessly"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "End-to-end encryption for all your conversations"
    },
    {
      icon: Zap,
      title: "Instant Connect",
      description: "Join or start meetings in seconds"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Video Conferencing
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Connect with anyone, anywhere. Professional video meetings made simple and secure.
          </p>
          
          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
            {/* Create Meeting Card */}
            <Card className="p-8 hover:shadow-large transition-all duration-300">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-2">Start New Meeting</CardTitle>
                <CardDescription>
                  Create an instant meeting room
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={createMeeting}
                  variant="meeting"
                  size="xl"
                  className="w-full animate-fade-in"
                >
                  <Video className="mr-2 h-6 w-6" />
                  New Meeting
                </Button>
              </CardContent>
            </Card>

            {/* Join Meeting Card */}
            <Card className="p-8 hover:shadow-large transition-all duration-300">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-2">Join Meeting</CardTitle>
                <CardDescription>
                  Enter meeting code to join
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Enter meeting code"
                  value={meetingCode}
                  onChange={(e) => setMeetingCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && joinMeeting()}
                  className="text-center text-lg h-12"
                />
                <Button 
                  onClick={joinMeeting}
                  disabled={!meetingCode.trim()}
                  variant="default"
                  size="xl"
                  className="w-full"
                >
                  <Users className="mr-2 h-6 w-6" />
                  Join Meeting
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="text-center p-6 hover:shadow-medium transition-all duration-300">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <feature.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-muted-foreground">
            No downloads required • Works in any modern browser • Free to use
          </p>
        </div>
      </div>
    </div>
  );
}