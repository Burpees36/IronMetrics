import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle, AlertTriangle, CreditCard, ShieldCheck } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL || "/";
const API_BASE = `${BASE_URL}api`.replace(/\/\//g, "/");

type PageState = "loading" | "card-input" | "processing" | "success" | "error";

export function UpdatePayment() {
  const [state, setState] = useState<PageState>("loading");
  const [error, setError] = useState("");
  const [gymName, setGymName] = useState("");
  const [gymLogoUrl, setGymLogoUrl] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("");
  const [cardResult, setCardResult] = useState<{ last4: string; brand: string } | null>(null);

  const [stripe, setStripe] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) {
      setError("No payment update token provided. Please use the link from your email.");
      setState("error");
      return;
    }
    setToken(t);
    validateToken(t);
  }, []);

  async function validateToken(t: string) {
    try {
      const res = await fetch(`${API_BASE}/payment-update/validate?token=${encodeURIComponent(t)}`);
      const data = await res.json();

      if (!data.valid) {
        setError(data.error || "This link is invalid or expired.");
        setState("error");
        return;
      }

      setGymName(data.gymName || "");
      setGymLogoUrl(data.gymLogoUrl || null);
      setMemberName(data.memberName || "");

      await initializePaymentForm(t);
    } catch {
      setError("Unable to validate your link. Please try again.");
      setState("error");
    }
  }

  async function initializePaymentForm(t: string) {
    try {
      const res = await fetch(`${API_BASE}/payment-update/setup-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t }),
      });
      const data = await res.json();

      if (!data.clientSecret || !data.publishableKey) {
        setError("Failed to initialize payment form.");
        setState("error");
        return;
      }

      setClientSecret(data.clientSecret);

      const stripeJs = await loadStripeJs(data.publishableKey);
      if (!stripeJs) {
        setError("Failed to load payment system.");
        setState("error");
        return;
      }

      setStripe(stripeJs);

      const elems = stripeJs.elements({
        clientSecret: data.clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#10B981",
            colorBackground: "#ffffff",
            colorText: "#111827",
            borderRadius: "8px",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
        },
      });

      elems.create("payment", {
        layout: "tabs",
      });

      setElements(elems);
      setState("card-input");
    } catch {
      setError("Failed to initialize payment form. Please try again.");
      setState("error");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setState("processing");

    try {
      const { error: stripeError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });

      if (stripeError) {
        setError(stripeError.message || "Payment method could not be verified.");
        setState("card-input");
        return;
      }

      if (setupIntent?.payment_method) {
        const res = await fetch(`${API_BASE}/payment-update/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            paymentMethodId: setupIntent.payment_method,
          }),
        });
        const data = await res.json();

        if (data.success) {
          setCardResult({ last4: data.cardLast4, brand: data.cardBrand });
          setState("success");
        } else {
          setError(data.error || "Failed to update payment method.");
          setState("card-input");
        }
      } else {
        setError("Payment setup did not return a payment method.");
        setState("card-input");
      }
    } catch {
      setError("An error occurred while processing your payment method.");
      setState("card-input");
    }
  }

  useEffect(() => {
    if (elements && state === "card-input") {
      const container = document.getElementById("payment-element");
      if (container && container.children.length === 0) {
        const paymentElement = elements.getElement("payment");
        if (paymentElement) {
          paymentElement.mount("#payment-element");
        }
      }
    }
  }, [elements, state]);

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ maxWidth: "480px", width: "100%", background: "#ffffff", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <div style={{ padding: "32px 24px 24px", background: "#10B981", textAlign: "center" }}>
          {gymLogoUrl && (
            <img src={gymLogoUrl} alt={gymName} style={{ maxHeight: "48px", maxWidth: "200px", marginBottom: "12px", display: "inline-block" }} />
          )}
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "#ffffff" }}>
            {gymName || "Update Payment Method"}
          </h1>
        </div>

        <div style={{ padding: "32px 24px" }}>
          {state === "loading" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Loader2 style={{ width: "40px", height: "40px", color: "#10B981", margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
              <p style={{ color: "#6b7280", fontSize: "15px" }}>Validating your link...</p>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {state === "error" && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <AlertTriangle style={{ width: "32px", height: "32px", color: "#ef4444" }} />
              </div>
              <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 600, color: "#111827" }}>Unable to Continue</h2>
              <p style={{ margin: 0, fontSize: "15px", color: "#6b7280", lineHeight: 1.5 }}>{error}</p>
            </div>
          )}

          {state === "card-input" && (
            <form onSubmit={handleSubmit}>
              {memberName && (
                <p style={{ margin: "0 0 16px", fontSize: "15px", color: "#374151" }}>
                  Hi <strong>{memberName}</strong>, please enter your new payment method below.
                </p>
              )}

              {error && (
                <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", marginBottom: "16px" }}>
                  <p style={{ margin: 0, fontSize: "14px", color: "#dc2626" }}>{error}</p>
                </div>
              )}

              <div id="payment-element" style={{ marginBottom: "24px", minHeight: "100px" }} />

              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "#10B981",
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Update Payment Method
              </button>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "16px" }}>
                <ShieldCheck style={{ width: "14px", height: "14px", color: "#9ca3af" }} />
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>Secured by Stripe</span>
              </div>
            </form>
          )}

          {state === "processing" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Loader2 style={{ width: "40px", height: "40px", color: "#10B981", margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
              <p style={{ color: "#374151", fontSize: "15px", fontWeight: 500 }}>Processing your payment method...</p>
              <p style={{ color: "#9ca3af", fontSize: "13px", marginTop: "8px" }}>Please don't close this page.</p>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {state === "success" && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <CheckCircle style={{ width: "32px", height: "32px", color: "#22c55e" }} />
              </div>
              <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 600, color: "#111827" }}>Payment Method Updated</h2>
              <p style={{ margin: "0 0 16px", fontSize: "15px", color: "#374151" }}>
                Your payment method has been successfully updated.
              </p>
              {cardResult && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 20px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px" }}>
                  <CreditCard style={{ width: "18px", height: "18px", color: "#166534" }} />
                  <span style={{ fontSize: "15px", color: "#166534", fontWeight: 500, textTransform: "capitalize" }}>
                    {cardResult.brand} ending in {cardResult.last4}
                  </span>
                </div>
              )}
              <p style={{ margin: "24px 0 0", fontSize: "13px", color: "#9ca3af" }}>
                You can close this page. A confirmation email has been sent.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

let stripePromise: Promise<any> | null = null;

function loadStripeJs(publishableKey: string): Promise<any> {
  if (stripePromise) return stripePromise;

  stripePromise = new Promise((resolve) => {
    if ((window as any).Stripe) {
      resolve((window as any).Stripe(publishableKey));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.onload = () => {
      resolve((window as any).Stripe(publishableKey));
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return stripePromise;
}
