import { Router, type IRouter } from "express";
import { parseUnsubscribeToken, addOptOutTag } from "../services/sequence-utils";

const router: IRouter = Router();

router.get("/unsubscribe", async (req, res): Promise<void> => {
  const token = req.query.token as string;
  if (!token) {
    res.status(400).send(renderPage("Invalid Link", "This unsubscribe link is invalid or expired."));
    return;
  }

  const parsed = parseUnsubscribeToken(token);
  if (!parsed) {
    res.status(400).send(renderPage("Invalid Link", "This unsubscribe link is invalid or expired."));
    return;
  }

  try {
    await addOptOutTag(parsed.memberId, parsed.gymId, "email");

    res.send(renderPage(
      "Unsubscribed",
      "You have been successfully unsubscribed from marketing emails. You may still receive important account-related communications."
    ));
  } catch (err: any) {
    console.error("[unsubscribe] Error processing unsubscribe:", err.message);
    res.status(500).send(renderPage("Error", "Something went wrong. Please try again later."));
  }
});

function renderPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:40px 20px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;">
  <div style="max-width:480px;background:#fff;border-radius:12px;padding:40px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="margin:0 0 16px;font-size:24px;color:#111827;">${title}</h1>
    <p style="margin:0;font-size:16px;color:#6b7280;line-height:1.6;">${message}</p>
  </div>
</body>
</html>`;
}

export default router;
