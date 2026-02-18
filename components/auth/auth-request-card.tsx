"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle2, ExternalLink } from "lucide-react";

interface AuthRequestCardProps {
  authUrl: string;
  onAuthenticated?: () => void;
}

export function AuthRequestCard({ authUrl, onAuthenticated }: AuthRequestCardProps) {
  const [isClicked, setIsClicked] = useState(false);

  const handleConnect = () => {
    // Append current path as return_path to the auth URL
    const returnPath = window.location.pathname + window.location.search;
    const separator = authUrl.includes('?') ? '&' : '?';
    const finalUrl = `${authUrl}${separator}return_path=${encodeURIComponent(returnPath)}`;
    
    window.open(finalUrl, "_blank");
    setIsClicked(true);
  };

  return (
    <Card className="w-full max-w-sm bg-slate-900 border-primary/20 shadow-lg shadow-primary/5 my-4 animate-in fade-in zoom-in-95 duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-primary mb-1">
          <Calendar className="h-5 w-5" />
          <span className="text-xs font-bold tracking-wider uppercase">Calendar Access Required</span>
        </div>
        <CardTitle className="text-white text-lg">Connect Google Calendar</CardTitle>
        <CardDescription className="text-slate-400">
          To schedule or manage events, please authorize access to your calendar.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <Button 
          onClick={handleConnect} 
          className="w-full gap-2 bg-primary hover:bg-primary/90 text-white transition-all shadow-md active:scale-95"
          size="lg"
        >
          <ExternalLink className="h-4 w-4" />
          Link Account
        </Button>
      </CardContent>
      {isClicked && (
        <CardFooter className="pt-0 flex flex-col gap-2">
            <div className="w-full h-px bg-border-dark mb-2"></div>
            <p className="text-xs text-center text-slate-500 mb-2">
                Done connecting?
            </p>
            <Button 
                variant="outline" 
                onClick={onAuthenticated}
                className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary transition-colors"
                size="sm"
            >
                <CheckCircle2 className="h-4 w-4" />
                I've Connected Successfully
            </Button>
        </CardFooter>
      )}
    </Card>
  );
}
