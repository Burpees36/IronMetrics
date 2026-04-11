import React, { useState, useCallback, useEffect, useMemo } from "react";
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
  Share,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const COOLDOWN_MS = 15 * 60 * 1000;

function getCooldownStorageKey(gymId: number, dayDate?: string): string {
  return `im_notify_cooldown_${gymId}_${dayDate || "all"}`;
}

function getStoredCooldownRemaining(gymId: number, dayDate?: string): number {
  const key = getCooldownStorageKey(gymId, dayDate);
  const stored = localStorage.getItem(key);
  if (!stored) return 0;
  const ts = parseInt(stored, 10);
  if (isNaN(ts)) return 0;
  const remaining = COOLDOWN_MS - (Date.now() - ts);
  return remaining > 0 ? remaining : 0;
}

function useWebShareSupported() {
  return useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return !!navigator.share;
  }, []);
}

interface ShareWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicUrl: string;
  gymId: number;
  activeMemberCount: number;
  dayTitle?: string;
  dayDate?: string;
  dayTrack?: string;
  trackMemberCount?: number;
}

export function ShareWorkoutDialog({
  open,
  onOpenChange,
  publicUrl,
  gymId,
  activeMemberCount,
  dayTitle,
  dayDate,
  dayTrack,
  trackMemberCount,
}: ShareWorkoutDialogProps) {
  const [copied, setCopied] = useState(false);
  const [notifyState, setNotifyState] = useState<"idle" | "loading" | "success" | "cooldown" | "error">("idle");
  const [notifyCount, setNotifyCount] = useState(0);
  const [notifyError, setNotifyError] = useState("");
  const [cooldownMinutes, setCooldownMinutes] = useState(0);
  const webShareSupported = useWebShareSupported();

  const cooldownDateKey = dayDate ? `${dayDate}${dayTrack && dayTrack !== "default" ? `:${dayTrack}` : ""}` : undefined;
  const notifyTargetCount = dayTrack && dayTrack !== "default" && trackMemberCount !== undefined
    ? trackMemberCount
    : activeMemberCount;

  useEffect(() => {
    if (!open) return;
    const remaining = getStoredCooldownRemaining(gymId, cooldownDateKey);
    if (remaining > 0) {
      setCooldownMinutes(Math.ceil(remaining / 60000));
      setNotifyState("cooldown");
      setNotifyError(`Notification was sent recently. Please wait ${Math.ceil(remaining / 60000)} minute${Math.ceil(remaining / 60000) !== 1 ? "s" : ""} before sending again.`);
    }
  }, [open, gymId, cooldownDateKey]);

  useEffect(() => {
    if (notifyState === "success") {
      const timer = setTimeout(() => {
        setNotifyState("idle");
        setNotifyCount(0);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notifyState]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const input = document.createElement("input");
      input.value = publicUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [publicUrl]);

  const handleNativeShare = useCallback(async () => {
    try {
      await navigator.share({
        title: dayTitle ? `Workout: ${dayTitle}` : "Today's Programming",
        text: dayTitle
          ? `Check out "${dayTitle}" — today's workout programming`
          : "Check out today's workout programming",
        url: publicUrl,
      });
    } catch {
    }
  }, [publicUrl, dayTitle]);

  const handleNotifyMembers = useCallback(async () => {
    setNotifyState("loading");
    setNotifyError("");
    try {
      const body: Record<string, string> = {};
      if (dayDate) body.date = dayDate;
      if (dayTrack && dayTrack !== "default") body.track = dayTrack;

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
          if (data.cooldownMinutes) {
            setCooldownMinutes(data.cooldownMinutes);
          }
          return;
        }
        throw new Error(data.error || "Failed to notify members");
      }

      const data = await response.json() as { emailsSent: number };
      setNotifyCount(data.emailsSent);
      setNotifyState("success");

      const key = getCooldownStorageKey(gymId, cooldownDateKey);
      localStorage.setItem(key, String(Date.now()));
    } catch (err: unknown) {
      const error = err as Error;
      setNotifyState("error");
      setNotifyError(error.message || "Failed to send notifications");
    }
  }, [gymId, dayDate, dayTrack, cooldownDateKey]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setCopied(false);
      setNotifyState("idle");
      setNotifyCount(0);
      setNotifyError("");
      setCooldownMinutes(0);
    }
    onOpenChange(open);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
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

        <div className="space-y-4 pt-1">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5 text-primary" />
              Public Programming Link
            </label>
            <div
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground font-mono break-all select-all leading-relaxed cursor-text"
              title={publicUrl}
            >
              {publicUrl}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm transition-all active:scale-[0.98]"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span
                      key="copied"
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Check className="h-4 w-4" />
                      Copied!
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <div className="flex items-center gap-2">
                {webShareSupported && (
                  <button
                    onClick={handleNativeShare}
                    className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border border-border bg-background hover:bg-accent font-medium text-sm transition-all active:scale-[0.98]"
                  >
                    <Share className="h-4 w-4" />
                    Share
                  </button>
                )}
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border border-border bg-background hover:bg-accent transition-colors text-sm text-muted-foreground hover:text-foreground"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open</span>
                </a>
              </div>
            </div>
          </div>

          <div className="relative flex items-center py-1">
            <div className="flex-1 border-t border-border" />
            <span className="px-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">
              or notify via email
            </span>
            <div className="flex-1 border-t border-border" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Email Members</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                <Users className="h-3.5 w-3.5" />
                <span>{notifyTargetCount} {dayTrack && dayTrack !== "default" ? `on ${dayTrack}` : "active"}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {dayTrack && dayTrack !== "default"
                ? `Send an email to ${notifyTargetCount} member${notifyTargetCount !== 1 ? "s" : ""} on the "${dayTrack}" track${dayTitle ? ` with a link to "${dayTitle}"` : ""}.`
                : dayTitle
                  ? `Send an email to all active members with a link to "${dayTitle}".`
                  : "Send an email to all active members with a link to your published programming."}
            </p>

            <AnimatePresence mode="wait">
              {notifyState === "idle" && (
                <motion.button
                  key="send"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleNotifyMembers}
                  disabled={notifyTargetCount === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border bg-background hover:bg-accent rounded-lg font-medium text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                  Notify {notifyTargetCount} Member{notifyTargetCount !== 1 ? "s" : ""}
                </motion.button>
              )}

              {notifyState === "loading" && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-muted/50 text-muted-foreground rounded-lg font-medium text-sm border border-border"
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
                  transition={{ duration: 0.2 }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg font-medium text-sm"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
                  >
                    <Check className="h-4 w-4" />
                  </motion.div>
                  {notifyCount} member{notifyCount !== 1 ? "s" : ""} notified
                </motion.div>
              )}

              {notifyState === "cooldown" && (
                <motion.div
                  key="cooldown"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-start gap-2.5 px-3.5 py-2.5 bg-amber-500/10 text-amber-700 dark:text-amber-500 border border-amber-500/20 rounded-lg text-sm leading-relaxed"
                >
                  <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{notifyError}</span>
                </motion.div>
              )}

              {notifyState === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="w-full space-y-2"
                >
                  <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm leading-relaxed">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{notifyError}</span>
                  </div>
                  <button
                    onClick={handleNotifyMembers}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border bg-background hover:bg-accent rounded-lg font-medium text-sm transition-all active:scale-[0.98]"
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
