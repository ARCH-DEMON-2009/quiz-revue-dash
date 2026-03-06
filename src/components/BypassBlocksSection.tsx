import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, Trash2, RefreshCw, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface BypassBlock {
  id: string;
  user_id: string;
  blocked_until: string;
  reason: string;
  sms_status: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export const BypassBlocksSection = () => {
  const [blocks, setBlocks] = useState<BypassBlock[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bypass_blocks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch user details for each block
      const userIds = [...new Set((data || []).map(b => b.user_id))];
      
      let profileMap = new Map<string, { name: string; email: string }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("user_id, name, email")
          .in("user_id", userIds);
        
        (profiles || []).forEach(p => {
          if (p.user_id) profileMap.set(p.user_id, { name: p.name, email: p.email });
        });
      }

      const enriched: BypassBlock[] = (data || []).map(b => ({
        ...b,
        user_name: profileMap.get(b.user_id)?.name || "Unknown",
        user_email: profileMap.get(b.user_id)?.email || "Unknown",
      }));

      setBlocks(enriched);
    } catch (error) {
      console.error("Error fetching bypass blocks:", error);
      toast.error("Failed to fetch bypass blocks");
    } finally {
      setLoading(false);
    }
  };

  const removeBlock = async (id: string) => {
    try {
      const { error } = await supabase
        .from("bypass_blocks")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setBlocks(blocks.filter(b => b.id !== id));
      toast.success("Block removed successfully");
    } catch (error) {
      console.error("Error removing block:", error);
      toast.error("Failed to remove block");
    }
  };

  const isActive = (blockedUntil: string) => new Date(blockedUntil) > new Date();

  const activeCount = blocks.filter(b => isActive(b.blocked_until)).length;

  return (
    <Card className="mt-8">
      <CardHeader className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            Bypass Block Attempts
            {activeCount > 0 && (
              <Badge variant="destructive">{activeCount} active</Badge>
            )}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchBlocks} disabled={loading}>
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          </div>
        ) : blocks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No bypass attempts detected</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>SMS Status</TableHead>
                  <TableHead>Blocked At</TableHead>
                  <TableHead>Blocked Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blocks.map((block) => (
                  <TableRow key={block.id}>
                    <TableCell className="font-medium">{block.user_name}</TableCell>
                    <TableCell className="text-xs">{block.user_email}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{block.reason}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          block.sms_status === 'sent' ? 'default' : 
                          block.sms_status === 'failed' ? 'destructive' : 
                          block.sms_status === 'no_number' ? 'secondary' : 'outline'
                        }
                        className="text-xs flex items-center gap-1 w-fit"
                      >
                        <MessageSquare className="h-3 w-3" />
                        {block.sms_status === 'sent' ? 'SMS Sent' : 
                         block.sms_status === 'failed' ? 'SMS Failed' : 
                         block.sms_status === 'no_number' ? 'No Number' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(block.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(block.blocked_until), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isActive(block.blocked_until) ? "destructive" : "secondary"}>
                        {isActive(block.blocked_until) ? "Active" : "Expired"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBlock(block.id)}
                        title="Remove block"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
