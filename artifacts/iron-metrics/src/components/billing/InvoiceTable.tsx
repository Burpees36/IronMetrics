import React from "react";
import { useGym } from "@/store/GymContext";
import { getMemberStripeInvoices, getGetMemberStripeInvoicesQueryOptions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Receipt, ExternalLink, Download } from "lucide-react";

interface Props {
  memberId: number;
}

export function InvoiceTable({ memberId }: Props) {
  const { activeGymId } = useGym();
  const { data: invoices = [], isLoading } = useQuery(
    getGetMemberStripeInvoicesQueryOptions(activeGymId || 0, memberId, { query: { enabled: !!activeGymId && !!memberId } })
  );

  const statusColors: Record<string, string> = {
    paid: "text-emerald-600",
    open: "text-amber-600",
    draft: "text-muted-foreground",
    uncollectible: "text-destructive",
    void: "text-muted-foreground/50",
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
        <Receipt className="w-4 h-4 text-primary" /> Invoices & Receipts
      </h4>

      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : (invoices as any[]).length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-3">No invoices yet</div>
      ) : (
        <div className="space-y-1.5">
          {(invoices as any[]).map((inv: any) => (
            <div key={inv.id} className="p-3 rounded-lg bg-muted/20 border border-border flex items-center justify-between group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">${inv.amount.toFixed(2)}</span>
                  <span className={`text-xs ${statusColors[inv.status] || "text-muted-foreground"}`}>{inv.status}</span>
                  {inv.number && <span className="text-xs text-muted-foreground/70">{inv.number}</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {inv.date ? new Date(inv.date).toLocaleDateString() : "—"}
                  {inv.description && <span className="ml-2 text-muted-foreground/70">{inv.description}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {inv.invoiceUrl && (
                  <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="View Invoice">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {inv.invoicePdf && (
                  <a href={inv.invoicePdf} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Download PDF">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
