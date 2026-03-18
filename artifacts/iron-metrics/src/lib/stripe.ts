interface StripeWindow {
  Stripe?: (key: string) => unknown;
}

let stripePromise: Promise<unknown> | null = null;

export function loadStripeJs(publishableKey: string): Promise<unknown> {
  if (stripePromise) return stripePromise;

  stripePromise = new Promise((resolve) => {
    const win = window as unknown as StripeWindow;
    if (win.Stripe) {
      resolve(win.Stripe(publishableKey));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.onload = () => {
      const w = window as unknown as StripeWindow;
      resolve(w.Stripe ? w.Stripe(publishableKey) : null);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return stripePromise;
}
