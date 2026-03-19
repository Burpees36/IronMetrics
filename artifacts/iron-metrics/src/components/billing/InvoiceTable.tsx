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
    paid: "text-green-400",
    open: "text-amber-400",
    draft: "text-white/40",
    uncollectible: "text-red-400",
    void: "text-white/30",
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-white/70 flex items-center gap-2">
        <Receipt className="w-4 h-4" /> Invoices & Receipts
      </h4>

      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-white/30" /></div>
      ) : (invoices as any[]).length === 0 ? (
        <div className="text-xs text-white/30 text-center py-3">No invoices yet</div>
      ) : (
        <div className="space-y-1.5">
          {(invoices as any[]).map((inv: any) => (
            <div key={inv.id} className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">${inv.amount.toFixed(2)}</span>
                  <span className={`text-xs ${statusColors[inv.status] || "text-white/50"}`}>{inv.status}</span>
                  {inv.number && <span className="text-xs text-white/30">{inv.number}</span>}
                </div>
                <div className="text-xs text-white/40 mt-0.5">
                  {inv.date ? new Date(inv.date).toLocaleDateString() : "—"}
                  {inv.description && <span className="ml-2 text-white/30">{inv.description}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {inv.invoiceUrl && (
                  <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white" title="View Invoice">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {inv.invoicePdf && (
                  <a href={inv.invoicePdf} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white" title="Download PDF">
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
