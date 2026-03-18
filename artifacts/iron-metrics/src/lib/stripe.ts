let stripePromise: Promise<any> | null = null;

export function loadStripeJs(publishableKey: string): Promise<any> {
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
