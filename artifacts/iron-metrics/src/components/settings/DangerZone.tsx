import React, { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Trash2, Power, RefreshCw, ShieldAlert, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useDeactivateGym, useReactivateGym, useDeleteGym, useGetGym, getListGymsQueryKey, getGetGymQueryKey } from "@workspace/api-client-react";
import { useGym } from "@/store/GymContext";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  gymName: string;
}

export function DangerZone({ gymName }: Props) {
  const { toast } = useToast();
  const { activeGymId, setActiveGymId } = useGym();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const { data: gym } = useGetGym(activeGymId as number, { query: { enabled: !!activeGymId } });
  const isDeactivated = gym?.isActive === false;
  const isOwner = !!(gym?.ownerId && user?.id && gym.ownerId === user.id);

  const deactivateMutation = useDeactivateGym();
  const reactivateMutation = useReactivateGym();
  const deleteMutation = useDeleteGym();

  const isLoading = deactivateMutation.isPending || reactivateMutation.isPending || deleteMutation.isPending;

  const actions = isDeactivated
    ? [
        {
          id: "reactivate",
          icon: RefreshCw,
          label: "Reactivate Business",
          desc: "Restore this business to active status. Members and staff will regain access.",
          buttonText: "Reactivate",
          confirmWord: "REACTIVATE",
          variant: "default" as const,
        },
        {
          id: "delete",
          icon: Trash2,
          label: "Delete Business",
          desc: "Permanently delete this business and all associated data. This action cannot be undone.",
          buttonText: "Delete Business",
          confirmWord: gymName.toUpperCase(),
          variant: "destructive" as const,
        },
      ]
    : [
        {
          id: "deactivate",
          icon: Power,
          label: "Deactivate Business",
          desc: "Temporarily disable this business. Members and staff will lose access until reactivated.",
          buttonText: "Deactivate",
          confirmWord: "DEACTIVATE",
          variant: "destructive" as const,
        },
        {
          id: "delete",
          icon: Trash2,
          label: "Delete Business",
          desc: "Permanently delete this business and all associated data. This action cannot be undone.",
          buttonText: "Delete Business",
          confirmWord: gymName.toUpperCase(),
          variant: "destructive" as const,
        },
      ];

  const currentAction = actions.find(a => a.id === confirmAction);

  const handleConfirm = () => {
    if (!currentAction || !activeGymId) return;
    if (confirmText !== currentAction.confirmWord) {
      toast({ title: "Confirmation Failed", description: `Please type "${currentAction.confirmWord}" to confirm.`, variant: "destructive" });
      return;
    }

    if (currentAction.id === "deactivate") {
      deactivateMutation.mutate(
        { gymId: activeGymId },
        {
          onSuccess: () => {
            toast({ title: "Business Deactivated", description: "Your business has been deactivated. Members and staff can no longer access it." });
            queryClient.invalidateQueries({ queryKey: getGetGymQueryKey(activeGymId) });
            queryClient.invalidateQueries({ queryKey: getListGymsQueryKey() });
            setConfirmAction(null);
            setConfirmText("");
          },
          onError: (err: any) => {
            toast({ title: "Deactivation Failed", description: err?.message || "Something went wrong. Please try again.", variant: "destructive" });
          },
        },
      );
    } else if (currentAction.id === "reactivate") {
      reactivateMutation.mutate(
        { gymId: activeGymId },
        {
          onSuccess: () => {
            toast({ title: "Business Reactivated", description: "Your business is active again. Members and staff can access it." });
            queryClient.invalidateQueries({ queryKey: getGetGymQueryKey(activeGymId) });
            queryClient.invalidateQueries({ queryKey: getListGymsQueryKey() });
            setConfirmAction(null);
            setConfirmText("");
          },
          onError: (err: any) => {
            toast({ title: "Reactivation Failed", description: err?.message || "Something went wrong. Please try again.", variant: "destructive" });
          },
        },
      );
    } else if (currentAction.id === "delete") {
      deleteMutation.mutate(
        { gymId: activeGymId },
        {
          onSuccess: () => {
            toast({ title: "Business Deleted", description: "Your business and all associated data have been permanently deleted." });
            setActiveGymId(null);
            queryClient.invalidateQueries({ queryKey: getListGymsQueryKey() });
            setConfirmAction(null);
            setConfirmText("");
            setLocation("/select-gym");
          },
          onError: (err: any) => {
            toast({ title: "Deletion Failed", description: err?.message || "Something went wrong. Please try again.", variant: "destructive" });
          },
        },
      );
    }
  };

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">Owner Access Required</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Only the business owner can deactivate or delete this business. Contact the owner if you need these actions performed.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isDeactivated && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Power className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400">Business Deactivated</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            This business is currently deactivated. Members and staff cannot access it. You can reactivate it at any time.
          </p>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-destructive/30 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">Irreversible and destructive actions. Proceed with caution.</p>

        <div className="space-y-3">
          {actions.map(action => (
            <div key={action.id} className={`flex items-center justify-between p-4 rounded-xl border ${
              action.variant === "destructive"
                ? "border-destructive/20 bg-destructive/5"
                : "border-primary/20 bg-primary/5"
            }`}>
              <div className="flex items-start gap-3">
                <action.icon className={`h-5 w-5 mt-0.5 shrink-0 ${
                  action.variant === "destructive" ? "text-destructive" : "text-primary"
                }`} />
                <div>
                  <p className="text-sm font-semibold text-foreground">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmAction(action.id)}
                disabled={isLoading}
                className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors shrink-0 ml-4 disabled:opacity-50 ${
                  action.variant === "destructive"
                    ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                    : "border-primary/30 text-primary hover:bg-primary/10"
                }`}
              >
                {action.buttonText}
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      <AlertDialog open={!!confirmAction} onOpenChange={open => { if (!open && !isLoading) { setConfirmAction(null); setConfirmText(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={`flex items-center gap-2 ${
              currentAction?.variant === "destructive" ? "text-destructive" : "text-primary"
            }`}>
              <AlertTriangle className="h-5 w-5" />
              {currentAction?.label}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {currentAction?.id === "delete"
                ? <>This will <strong className="text-foreground">permanently delete</strong> your business and all associated data including members, billing, staff records, and integrations. This cannot be undone.</>
                : currentAction?.id === "deactivate"
                ? "This will temporarily disable your business. All staff and members will lose access until you reactivate."
                : "This will restore your business to active status. Members and staff will regain access."}
              {" "}To confirm, type <strong className="text-foreground">{currentAction?.confirmWord}</strong> below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder={`Type "${currentAction?.confirmWord}" to confirm`}
            className="my-2"
            disabled={isLoading}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={confirmText !== currentAction?.confirmWord || isLoading}
              className={`disabled:opacity-50 ${
                currentAction?.variant === "destructive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm {currentAction?.buttonText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
