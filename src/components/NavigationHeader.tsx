import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart, Trophy, User, LogOut } from "lucide-react";

interface NavigationHeaderProps {
  showFullNav?: boolean;
  onLogout?: () => void;
}

const NavigationHeader = ({ showFullNav = false, onLogout }: NavigationHeaderProps) => {
  const navigate = useNavigate();

  return (
    <nav className="border-b bg-card sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => navigate("/")}
        >
          <img 
            src="/logo.png" 
            alt="Test Sagar Logo" 
            className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
          />
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold">Test Sagar</h1>
        </div>
        
        {showFullNav && (
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/analytics")} className="hidden sm:flex shadow-sm">
              <BarChart className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Analytics</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/leaderboard")} className="hidden sm:flex">
              <Trophy className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Leaderboard</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
              <User className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Profile</span>
            </Button>
            {onLogout && (
              <Button variant="ghost" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Mobile bottom nav */}
      {showFullNav && (
        <div className="sm:hidden flex justify-around border-t py-2 bg-card">
          <Button variant="ghost" size="sm" onClick={() => navigate("/analytics")} className="flex-col h-auto py-1">
            <BarChart className="h-4 w-4" />
            <span className="text-xs">Analytics</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/leaderboard")} className="flex-col h-auto py-1">
            <Trophy className="h-4 w-4" />
            <span className="text-xs">Ranks</span>
          </Button>
        </div>
      )}
    </nav>
  );
};

export default NavigationHeader;
