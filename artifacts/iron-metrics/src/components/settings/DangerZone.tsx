import React, { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Trash2, Power, UserMinus } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Props {
  gymName: string;
}

export function DangerZone({ gymName }: Props) {
  const { toast } = useToast();
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const actions = [
    {
      id: "deactivate",
      icon: Power,
      label: "Deactivate Business",
      desc: "Temporarily disable this business. Members and staff will lose access until reactivated.",
      buttonText: "Deactivate",
      confirmWord: "DEACTIVATE",
    },
    {
      id: "delete",
      icon: Trash2,
      label: "Delete Business",
      desc: "Permanently delete this business and all associated data. This action cannot be undone.",
      buttonText: "Delete Business",
      confirmWord: gymName.toUpperCase(),
    },
  ];

  const currentAction = actions.find(a => a.id === confirmAction);

  const handleConfirm = () => {
    if (!currentAction) return;
    if (confirmText !== currentAction.confirmWord) {
      toast({ title: "Confirmation Failed", description: `Please type "${currentAction.confirmWord}" to confirm.`, variant: "destructive" });
      return;
    }
    toast({ title: "Not Available", description: "This action is not yet available. Contact support for assistance." });
    setConfirmAction(null);
    setConfirmText("");
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-destructive/30 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">Irreversible and destructive actions. Proceed with caution.</p>

        <div className="space-y-3">
          {actions.map(action => (
            <div key={action.id} className="flex items-center justify-between p-4 rounded-xl border border-destructive/20 bg-destructive/5">
              <div className="flex items-start gap-3">
                <action.icon className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmAction(action.id)}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors shrink-0 ml-4"
              >
                {action.buttonText}
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      <AlertDialog open={!!confirmAction} onOpenChange={open => { if (!open) { setConfirmAction(null); setConfirmText(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {currentAction?.label}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This is a destructive action. To confirm, type <strong className="text-foreground">{currentAction?.confirmWord}</strong> below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder={`Type "${currentAction?.confirmWord}" to confirm`}
            className="my-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={confirmText !== currentAction?.confirmWord}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              Confirm {currentAction?.buttonText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
