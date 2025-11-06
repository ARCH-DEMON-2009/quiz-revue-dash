import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface BlockedUserDialogProps {
  open: boolean;
}

export const BlockedUserDialog = ({ open }: BlockedUserDialogProps) => {
  const handleContactAdmin = () => {
    window.open("https://t.me/TestSagarHelpRobot", "_blank");
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            <AlertDialogTitle>Account Blocked</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            Your account has been blocked by the administrator. You cannot access the site at this time.
            <br /><br />
            For any help or to appeal this decision, please contact our support team.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={handleContactAdmin} className="w-full">
            Contact Admin Support
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
