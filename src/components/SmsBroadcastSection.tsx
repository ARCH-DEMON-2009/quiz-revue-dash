import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, MessageSquare } from "lucide-react";

export const SmsBroadcastSection = () => {
  return (
    <Card className="mt-4 sm:mt-6">
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          SMS Notifications (Fast2SMS)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border">
          <ShieldAlert className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div className="space-y-2">
            <p className="text-sm font-medium">Bypass Warning SMS — Automatic</p>
            <p className="text-xs text-muted-foreground">
              SMS is automatically sent to users who attempt to bypass the verification process. 
              The warning includes a 24-hour block notice and contact links:
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                Help Bot: t.me/TestSagarHelpRobot
              </Badge>
              <Badge variant="outline" className="text-xs">
                WhatsApp: wa.me/84522122461
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              No broadcast or manual SMS sending — SMS is only used for bypass attempt warnings to save costs.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
