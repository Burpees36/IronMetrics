import React, { useRef, useEffect, useState, useCallback } from "react";
import { loadStripeJs } from "@/lib/stripe";
import { useGym } from "@/store/GymContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Loader2, CreditCard } from "lucide-react";

interface StripePaymentElementEvent {
  complete: boolean;
  error?: { message: string };
}

interface StripePaymentElement {
  mount(el: HTMLElement): void;
  destroy(): void;
  on(event: string, handler: (e: StripePaymentElementEvent) => void): void;
}

interface StripeElements {
  create(type: string, options?: Record<string, unknown>): StripePaymentElement;
  getElement(type: string): StripePaymentElement | null;
}

interface StripeInstance {
  elements(options: Record<string, unknown>): StripeElements;
  confirmSetup(options: Record<string, unknown>): Promise<{ error?: { message: string } }>;
}

interface AddCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientSecret: string | null;
  onSuccess: () => void;
}

export function AddCardDialog({ open, onOpenChange, clientSecret, onSuccess }: AddCardDialogProps) {
  const { activeGymId } = useGym();
  const cardMountRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const [stripe, setStripe] = useState<StripeInstance | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  const BASE_URL = import.meta.env.BASE_URL || "/";
  const API_BASE = `${BASE_URL}api`.replace(/\/\//g, "/");

  const initStripe = useCallback(async () => {
    if (!clientSecret || stripe) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/stripe/publishable-key`);
      if (!res.ok) { setError("Failed to load payment system."); setLoading(false); return; }
      const { publishableKey } = await res.json();

      const stripeRaw = await loadStripeJs(publishableKey);
      if (!stripeRaw) { setError("Failed to load payment system."); setLoading(false); return; }
      const stripeInst = stripeRaw as StripeInstance;
      setStripe(stripeInst);

      const els = stripeInst.elements({
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#FBBF24",
            colorBackground: "hsl(220, 20%, 12%)",
            colorText: "#e4e4e7",
            colorDanger: "#ef4444",
            borderRadius: "8px",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
        },
      });
      setElements(els);

      const cardEl = els.create("payment", {
        layout: "accordion",
        paymentMethodOrder: ["card"],
        fields: { billingDetails: { address: { country: "never", postalCode: "auto" } } },
        wallets: { applePay: "never", googlePay: "never" },
      });

      setLoading(false);

      requestAnimationFrame(() => {
        if (cardMountRef.current && !mountedRef.current) {
          cardEl.mount(cardMountRef.current);
          mountedRef.current = true;
          cardEl.on("change", (event: StripePaymentElementEvent) => {
            setComplete(event.complete);
            setError(event.error?.message || "");
          });
        }
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initialize payment.");
      setLoading(false);
    }
  }, [clientSecret, stripe, API_BASE]);

  useEffect(() => {
    if (open && clientSecret) {
      initStripe();
    }
  }, [open, clientSecret, initStripe]);

  useEffect(() => {
    if (!open) {
      mountedRef.current = false;
      setStripe(null);
      setElements(null);
      setComplete(false);
      setError("");
      setLoading(true);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!stripe || !elements || !complete) return;
    setSubmitting(true);
    setError("");

    try {
      const result = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (result.error) {
        setError(result.error.message || "Card setup failed.");
        setSubmitting(false);
        return;
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Card setup failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Add Payment Method
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-[120px]">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Loading payment form...</span>
            </div>
          )}
          <div ref={cardMountRef} className={loading ? "hidden" : ""} />
          {error && (
            <p className="text-sm text-destructive mt-2">{error}</p>
          )}
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!complete || submitting || loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Card
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
