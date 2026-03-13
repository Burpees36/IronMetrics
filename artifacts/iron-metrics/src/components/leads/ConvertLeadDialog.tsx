import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConvertLeadToMember, getListLeadsQueryKey, getGetLeadInsightsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, Calendar, MessageSquare, PartyPopper } from "lucide-react";

interface ConvertLeadDialogProps {
  lead: any;
  gymId: number;
  open: boolean;
  onClose: () => void;
  onInvalidate: () => void;
}

export function ConvertLeadDialog({ lead, gymId, open, onClose, onInvalidate }: ConvertLeadDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");

  const convertMutation = useConvertLeadToMember();

  const handleConvert = () => {
    if (!lead) return;
    convertMutation.mutate(
      { gymId, leadId: lead.id, data: { startDate, note: note || undefined } },
      {
        onSuccess: () => {
          toast({
            title: "Lead converted!",
            description: `${lead.firstName} ${lead.lastName} is now a member.`,
          });
          onInvalidate();
          queryClient.invalidateQueries({ queryKey: getGetLeadInsightsQueryKey(gymId) });
          onClose();
          setNote("");
          setStartDate(new Date().toISOString().split("T")[0]);
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || "Failed to convert lead." });
        },
      }
    );
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <DialogTitle>Convert to Member</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                {lead.firstName} {lead.lastName} will become an active member.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <PartyPopper className="h-4 w-4" />
              <span className="font-medium">This will create a new member record</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 pl-6">
              The lead's contact info will transfer over. Their lead history will be preserved.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="convert-date" className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              Membership Start Date
            </Label>
            <Input
              id="convert-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="convert-note" className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              Note (optional)
            </Label>
            <Input
              id="convert-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Signed up for 3-month plan"
            />
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConvert}
            disabled={convertMutation.isPending}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-600/20"
          >
            {convertMutation.isPending ? "Converting..." : "Convert to Member"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
