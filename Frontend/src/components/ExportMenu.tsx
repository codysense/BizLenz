import { useState } from "react";
import { Download, Info, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";
export type ExportModule = "sales" | "purchases" | "customer-payments" | "vendor-payments" | "cashbook" | "inventory-ledger" | "inventory-valuation" | "items" | "opening-stocks" | "sales-receipts" | "purchase-payments" | "customer-refunds" | "vendor-refunds" | "sales-returns" | "purchase-returns" | "inventory-transfers" | "stock-adjustments" | "pos-sales" | "pos-returns" | "production-orders" | "wip-ledger" | "wip-summary" | "assets" | "asset-categories" | "asset-depreciation" | "journals" | "memos" | "audit-logs" | "customers" | "vendors" | "customer-groups" | "warehouses" | "locations" | "uoms" | "chart-of-accounts" | "cash-accounts" | "boms" | "users" | "roles" | "fiscal-years" | "fiscal-periods" | "approval-workflows" | "approval-requests";

interface ExportMenuProps {
  module: ExportModule;
  filters: Record<string, string>;
  matchingRows?: number;
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function readError(response: Response) {
  const body = await response.json().catch(() => ({}));
  return body.error || "Export failed";
}

export default function ExportMenu({ module, filters, matchingRows }: ExportMenuProps) {
  const roles = useAuthStore((state) => state.user?.roles ?? []);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const canExport = ["General Manager", "Senior Accountant", "Auditor"].some((role) => roles.includes(role));

  if (!canExport) return null;

  const startExport = async (mode: "normal" | "large") => {
    if (busy) return;
    setBusy(true);
    setOpen(false);
    setProgress(null);
    const token = useAuthStore.getState().accessToken;
    try {
      const response = await fetch(`${API_BASE_URL}/exports`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ module, filters, mode }),
      });
      if (!response.ok) throw new Error(await readError(response));

      if (mode === "normal") {
        const blob = await response.blob();
        const href = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = href;
        link.download = `${module}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(href);
        toast.success("Export downloaded");
        return;
      }

      const { jobId, total } = await response.json();
      setProgress({ done: 0, total });
      for (;;) {
        await wait(1200);
        const statusResponse = await fetch(`${API_BASE_URL}/exports/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` },
        });
        if (!statusResponse.ok) throw new Error(await readError(statusResponse));
        const job = await statusResponse.json();
        setProgress({ done: job.progress || 0, total: job.total || total });
        if (job.status === "failed") throw new Error(job.error || "Export generation failed");
        if (job.status === "completed") break;
      }
      const fileResponse = await fetch(`${API_BASE_URL}/exports/jobs/${jobId}/download`, {
        headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` },
      });
      if (!fileResponse.ok) throw new Error(await readError(fileResponse));
      const blob = await fileResponse.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `${module}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
      toast.success("Large export downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-2">
      <button type="button" onClick={() => setOpen((value) => !value)} disabled={busy}
        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60">
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
        {busy ? progress ? `Exporting ${progress.done.toLocaleString()} / ${progress.total.toLocaleString()}` : "Preparing export…" : "Export"}
      </button>
      {open && !busy && <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
        <div className="mb-2 text-sm font-semibold text-gray-900">Choose export size</div>
        <div className="mb-3 flex items-start gap-2 text-xs text-gray-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <span>{matchingRows === undefined ? "Exports use all records matching the filters currently applied." : `${matchingRows.toLocaleString()} records match the current filters. Exports include all matches, not just this page.`}</span>
        </div>
        <button type="button" onClick={() => void startExport("normal")} className="block w-full rounded px-3 py-2 text-left hover:bg-gray-50">
          <span className="block text-sm font-medium text-gray-800">Normal export</span>
          <span className="block text-xs text-gray-500" title="Downloads immediately for up to 10,000 matching rows">Immediate CSV, up to 10,000 rows</span>
        </button>
        <button type="button" onClick={() => void startExport("large")} className="block w-full rounded px-3 py-2 text-left hover:bg-gray-50">
          <span className="block text-sm font-medium text-gray-800">Large export</span>
          <span className="block text-xs text-gray-500" title="Runs in the background in batches and downloads when ready">Background CSV for larger result sets</span>
        </button>
        <button type="button" onClick={() => setOpen(false)} className="mt-1 w-full px-3 py-1 text-right text-xs text-gray-500 hover:text-gray-700">Close</button>
      </div>}
    </div>
  );
}
