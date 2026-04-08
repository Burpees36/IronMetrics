import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2,
  Copy,
  Check,
  Send,
  Users,
  Loader2,
  ExternalLink,
  Mail,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ShareWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicUrl: string;
  gymId: number;
  activeMemberCount: number;
  dayTitle?: string;
  dayDate?: string;
}

export function ShareWorkoutDialog({
  open,
  onOpenChange,
  publicUrl,
  gymId,
  activeMemberCount,
  dayTitle,
  dayDate,
}: ShareWorkoutDialogProps) {
  const [copied, setCopied] = useState(false);
  const [notifyState, setNotifyState] = useState<"idle" | "loading" | "success" | "cooldown" | "error">("idle");
  const [notifyCount, setNotifyCount] = useState(0);
  const [notifyError, setNotifyError] = useState("");

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = publicUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [publicUrl]);

  const handleNotifyMembers = useCallback(async () => {
    setNotifyState("loading");
    setNotifyError("");
    try {
      const body: Record<string, string> = {};
      if (dayDate) body.date = dayDate;

      const response = await fetch(`/api/gyms/${gymId}/notify-workout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string; cooldownMinutes?: number };
        if (response.status === 429) {
          setNotifyState("cooldown");
          setNotifyError(data.error || "Notification was recently sent. Please wait before sending again.");
          return;
        }
        throw new Error(data.error || "Failed to notify members");
      }

      const data = await response.json() as { emailsSent: number };
      setNotifyCount(data.emailsSent);
      setNotifyState("success");
    } catch (err: unknown) {
      const error = err as Error;
      setNotifyState("error");
      setNotifyError(error.message || "Failed to send notifications");
    }
  }, [gymId, dayDate]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setCopied(false);
      setNotifyState("idle");
      setNotifyCount(0);
      setNotifyError("");
    }
    onOpenChange(open);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share Programming
          </DialogTitle>
          <DialogDescription>
            {dayTitle
              ? `Share "${dayTitle}" with your members`
              : "Share your public programming page with members"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Public Programming Link</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground truncate font-mono">
                {publicUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className="shrink-0 h-10 w-10 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-accent transition-colors"
                title="Copy link"
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Check className="h-4 w-4 text-emerald-500" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Open in new tab
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Notify Members</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>{activeMemberCount} active</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Send an email to all active members with a link to today's published programming.
            </p>

            <AnimatePresence mode="wait">
              {notifyState === "idle" && (
                <motion.button
                  key="send"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  onClick={handleNotifyMembers}
                  disabled={activeMemberCount === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                  Notify {activeMemberCount} Member{activeMemberCount !== 1 ? "s" : ""}
                </motion.button>
              )}

              {notifyState === "loading" && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/80 text-primary-foreground rounded-lg font-medium text-sm"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending notifications...
                </motion.div>
              )}

              {notifyState === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg font-medium text-sm"
                >
                  <Check className="h-4 w-4" />
                  {notifyCount} member{notifyCount !== 1 ? "s" : ""} notified
                </motion.div>
              )}

              {notifyState === "cooldown" && (
                <motion.div
                  key="cooldown"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="w-full space-y-2"
                >
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-lg text-sm">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>{notifyError}</span>
                  </div>
                </motion.div>
              )}

              {notifyState === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="w-full space-y-2"
                >
                  <div className="px-4 py-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm">
                    {notifyError}
                  </div>
                  <button
                    onClick={handleNotifyMembers}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium text-sm transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    Try Again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
