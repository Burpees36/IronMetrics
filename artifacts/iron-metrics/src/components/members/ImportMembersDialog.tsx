import React, { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, AlertTriangle,
  X, Download, CheckCircle2, XCircle, Users, Loader2, SkipForward, Info,
  ChevronRight, Sparkles, DollarSign, HelpCircle, ExternalLink
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGym } from "@/store/GymContext";
import { useToast } from "@/hooks/use-toast";

const MEMBER_FIELDS = [
  { key: "firstName", label: "First Name", required: true },
  { key: "lastName", label: "Last Name", required: true },
  { key: "email", label: "Email", required: true },
  { key: "phone", label: "Phone", required: false },
  { key: "status", label: "Status", required: false },
  { key: "joinDate", label: "Join Date", required: false },
  { key: "birthDate", label: "Birth Date", required: false },
  { key: "membershipType", label: "Membership Type", required: false },
  { key: "emergencyContactName", label: "Emergency Contact Name", required: false },
  { key: "emergencyContactPhone", label: "Emergency Contact Phone", required: false },
  { key: "address", label: "Address", required: false },
  { key: "city", label: "City", required: false },
  { key: "state", label: "State", required: false },
  { key: "tags", label: "Tags", required: false },
] as const;

type Step = "source" | "upload" | "map" | "preview" | "importing" | "results"
  | "wodify-upload" | "wodify-preview" | "wodify-importing" | "wodify-results";

interface ValidatedRow {
  rowIndex: number;
  data: Record<string, string>;
  errors: string[];
  isDuplicate: boolean;
  duplicateOf?: { id: number; name: string; email: string };
}

interface PreviewSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
}

interface ImportResults {
  processed: number;
  created: number;
  skipped: number;
  errored: number;
  errors: { rowIndex: number; error: string }[];
}

interface WodifyPreviewRow {
  rowIndex: number;
  data: Record<string, string>;
  memberships: { name: string; amount: number }[];
  totalMonthlyRevenue: number;
  paymentMethod: string;
  emailSubscribed: boolean;
  programCount: number;
  errors: string[];
  isDuplicate: boolean;
  duplicateOf?: { id: number; name: string; email: string };
}

interface WodifySummary {
  totalRows: number;
  uniqueMembers: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  totalMRR: number;
  membershipBreakdown: Record<string, number>;
  emailOptOuts: number;
}

const COMMON_ALIASES: Record<string, string[]> = {
  firstName: ["first name", "first_name", "firstname", "first", "given name", "given_name"],
  lastName: ["last name", "last_name", "lastname", "last", "surname", "family name", "family_name"],
  email: ["email", "email address", "email_address", "e-mail", "e_mail"],
  phone: ["phone", "phone number", "phone_number", "tel", "telephone", "mobile", "cell"],
  status: ["status", "membership status", "member_status", "active"],
  joinDate: ["join date", "join_date", "joindate", "start date", "start_date", "date joined", "signup date", "signup_date", "created"],
  birthDate: ["birth date", "birth_date", "birthdate", "birthday", "dob", "date of birth", "date_of_birth"],
  membershipType: ["membership type", "membership_type", "plan", "plan name", "plan_name", "membership", "type"],
  emergencyContactName: ["emergency contact", "emergency_contact", "emergency name", "emergency_contact_name", "ice name", "ice_name"],
  emergencyContactPhone: ["emergency phone", "emergency_phone", "emergency_contact_phone", "ice phone", "ice_phone"],
  address: ["address", "street", "street address", "street_address"],
  city: ["city", "town"],
  state: ["state", "province", "region"],
  tags: ["tags", "labels", "categories"],
};

function autoMapColumns(csvHeaders: string[]): Record<string, string> {
  const mappings: Record<string, string> = {};
  const usedFields = new Set<string>();
  for (const header of csvHeaders) {
    const normalized = header.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(COMMON_ALIASES)) {
      if (!usedFields.has(field) && aliases.includes(normalized)) {
        mappings[header] = field;
        usedFields.add(field);
        break;
      }
    }
    if (!mappings[header]) mappings[header] = "";
  }
  return mappings;
}

const SAMPLE_CSV = `first_name,last_name,email,phone,status,join_date,membership_type
Sarah,Connor,sarah@example.com,(555) 123-4567,active,2024-01-15,Premium
John,Smith,john.smith@example.com,(555) 987-6543,active,2024-03-01,Basic
Maria,Garcia,maria.g@example.com,,active,2024-06-10,Premium`;

function SummaryCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-muted/20 border border-border rounded-xl p-3 text-center">
      <div className={`flex items-center justify-center gap-1.5 mb-1 ${color}`}>{icon}<span className="text-xl font-bold">{value}</span></div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function isWodifyFormat(headers: string[]): boolean {
  const wodifyColumns = ["Client ID", "Client Name", "Membership ID", "Membership", "Payment Plan"];
  return wodifyColumns.filter(c => headers.includes(c)).length >= 3;
}

export function ImportMembersDialog({
  open,
  onOpenChange,
  onImportComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}) {
  const { activeGymId } = useGym();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wodifyFileInputRef = useRef<HTMLInputElement>(null);
  const wodifyAbortRef = useRef<AbortController | null>(null);

  const [step, setStep] = useState<Step>("source");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<ValidatedRow[]>([]);
  const [summary, setSummary] = useState<PreviewSummary | null>(null);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const [wodifyPreviewRows, setWodifyPreviewRows] = useState<WodifyPreviewRow[]>([]);
  const [wodifySummary, setWodifySummary] = useState<WodifySummary | null>(null);

  const reset = useCallback(() => {
    setStep("source");
    setCsvHeaders([]);
    setCsvRows([]);
    setMappings({});
    setPreviewRows([]);
    setSummary(null);
    setResults(null);
    setIsLoading(false);
    setFileName("");
    setWodifyPreviewRows([]);
    setWodifySummary(null);
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(reset, 300);
  }, [onOpenChange, reset]);

  const handleFileSelect = useCallback((file: File) => {
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length > 0 && result.data.length === 0) {
          toast({ title: "Failed to parse CSV", description: result.errors[0]?.message || "Unknown parsing error", variant: "destructive" });
          return;
        }
        const headers = result.meta.fields || [];
        const rows = result.data as Record<string, string>[];
        if (headers.length === 0 || rows.length === 0) {
          toast({ title: "Empty file", description: "The CSV file appears to be empty or has no data rows.", variant: "destructive" });
          return;
        }
        setCsvHeaders(headers);
        setCsvRows(rows);
        setMappings(autoMapColumns(headers));
        setStep("map");
      },
      error: (err) => {
        toast({ title: "Failed to read file", description: err.message, variant: "destructive" });
      },
    });
  }, [toast]);

  const handleWodifyFileSelect = useCallback((file: File) => {
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const headers = result.meta.fields || [];
        const rows = result.data as Record<string, string>[];
        if (headers.length === 0 || rows.length === 0) {
          toast({ title: "Empty file", description: "The CSV file appears to be empty.", variant: "destructive" });
          return;
        }
        if (!isWodifyFormat(headers)) {
          toast({ title: "Not a Wodify export", description: "This doesn't look like a Wodify membership export. Try using the generic CSV import instead.", variant: "destructive" });
          return;
        }
        setCsvRows(rows);
        setStep("wodify-preview");
        setIsLoading(true);
        wodifyAbortRef.current?.abort();
        const controller = new AbortController();
        wodifyAbortRef.current = controller;
        try {
          const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
          const resp = await fetch(`${apiBase}/api/gyms/${activeGymId}/members/import/wodify/preview`, {
            method: "POST",
            body: JSON.stringify({ rows }),
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          const data = await resp.json();
          if (!resp.ok) throw new Error(data.error || "Preview failed");
          setWodifyPreviewRows(data.rows);
          setWodifySummary(data.summary);
        } catch (err: any) {
          if (err?.name === "AbortError") return;
          toast({ title: "Preview failed", description: err?.message || "Something went wrong", variant: "destructive" });
          setStep("wodify-upload");
        } finally {
          if (!controller.signal.aborted) setIsLoading(false);
        }
      },
      error: (err) => {
        toast({ title: "Failed to read file", description: err.message, variant: "destructive" });
      },
    });
  }, [activeGymId, toast]);

  const handleDrop = useCallback((e: React.DragEvent, isWodify: boolean) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
      isWodify ? handleWodifyFileSelect(file) : handleFileSelect(file);
    } else {
      toast({ title: "Invalid file", description: "Please upload a CSV file.", variant: "destructive" });
    }
  }, [handleFileSelect, handleWodifyFileSelect, toast]);

  const handlePreview = useCallback(async () => {
    const requiredFields = MEMBER_FIELDS.filter((f) => f.required).map((f) => f.key);
    const mappedFields = Object.values(mappings).filter(Boolean);
    const missingRequired = requiredFields.filter((f) => !mappedFields.includes(f));
    if (missingRequired.length > 0) {
      const labels = missingRequired.map((k) => MEMBER_FIELDS.find((f) => f.key === k)?.label || k);
      toast({ title: "Required fields not mapped", description: `Please map: ${labels.join(", ")}`, variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${apiBase}/api/gyms/${activeGymId}/members/import/preview`, {
        method: "POST",
        body: JSON.stringify({ rows: csvRows, mappings }),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Preview failed");
      setPreviewRows(data.rows);
      setSummary(data.summary);
      setStep("preview");
    } catch (err: any) {
      toast({ title: "Preview failed", description: err?.message || "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [activeGymId, csvRows, mappings, toast]);

  const handleImport = useCallback(async (rows: Record<string, string>[], isWodify: boolean) => {
    if (rows.length === 0) {
      toast({ title: "No valid rows", description: "There are no valid rows to import.", variant: "destructive" });
      return;
    }
    setStep(isWodify ? "wodify-importing" : "importing");
    try {
      const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${apiBase}/api/gyms/${activeGymId}/members/import/confirm`, {
        method: "POST",
        body: JSON.stringify({ rows, source: isWodify ? "wodify" : "csv", fileName }),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Import failed");
      setResults(data);
      setStep(isWodify ? "wodify-results" : "results");
      onImportComplete?.();
    } catch (err: any) {
      toast({ title: "Import failed", description: err?.message || "Something went wrong", variant: "destructive" });
      setStep(isWodify ? "wodify-preview" : "preview");
    }
  }, [activeGymId, toast, onImportComplete]);

  const downloadSample = useCallback(() => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "iron_metrics_member_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const updateMapping = useCallback((csvCol: string, field: string) => {
    setMappings((prev) => {
      const next = { ...prev };
      if (field) {
        for (const [key, val] of Object.entries(next)) {
          if (val === field && key !== csvCol) next[key] = "";
        }
      }
      next[csvCol] = field;
      return next;
    });
  }, []);

  const isImporting = step === "importing" || step === "wodify-importing";

  const getStepLabels = () => {
    if (step.startsWith("wodify")) return ["Source", "Upload", "Preview", "Import"];
    if (step === "source") return ["Source"];
    return ["Source", "Upload", "Map", "Preview", "Import"];
  };
  const getStepIndex = () => {
    if (step === "source") return 0;
    if (step === "wodify-upload") return 1;
    if (step === "wodify-preview") return 2;
    if (step === "wodify-importing" || step === "wodify-results") return 3;
    if (step === "upload") return 1;
    if (step === "map") return 2;
    if (step === "preview") return 3;
    if (step === "importing" || step === "results") return 4;
    return 0;
  };

  const stepLabels = getStepLabels();
  const stepIndex = getStepIndex();

  return (
    <Dialog open={open} onOpenChange={isImporting ? undefined : handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 bg-card border-border overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-amber-400" />
            Import Members
          </DialogTitle>
          <div className="flex items-center gap-1 mt-3">
            {stepLabels.map((label, i) => (
              <React.Fragment key={label}>
                {i > 0 && <div className="h-px w-4 bg-border" />}
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                  i < stepIndex ? "bg-emerald-500/10 text-emerald-400" :
                  i === stepIndex ? "bg-amber-500/10 text-amber-400" :
                  "bg-muted/30 text-muted-foreground"
                }`}>
                  {i < stepIndex ? <Check className="h-3 w-3" /> : null}
                  {label}
                </div>
              </React.Fragment>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {step === "source" && (
              <motion.div key="source" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-sm text-muted-foreground">Choose how you'd like to import your members:</p>

                <button
                  onClick={() => setStep("wodify-upload")}
                  className="w-full text-left bg-gradient-to-br from-violet-500/10 via-card to-primary/5 border border-violet-500/20 rounded-xl p-5 hover:border-violet-500/40 transition-colors group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 bg-violet-500/15 rounded-xl flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-violet-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-foreground">Import from Wodify</h3>
                      <p className="text-xs text-muted-foreground">Smart import that understands Wodify's membership export format</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-violet-500 transition-colors" />
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground ml-[52px]">
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Auto-deduplicates members</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Consolidates revenue</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Maps plan types</span>
                  </div>
                </button>

                <button
                  onClick={() => setStep("upload")}
                  className="w-full text-left bg-card border border-border rounded-xl p-5 hover:border-amber-500/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                      <FileSpreadsheet className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-foreground">Import from CSV</h3>
                      <p className="text-xs text-muted-foreground">Upload any spreadsheet and map columns manually</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-400 transition-colors" />
                  </div>
                </button>
              </motion.div>
            )}

            {step === "wodify-upload" && (
              <motion.div key="wodify-upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="bg-gradient-to-br from-violet-500/10 via-card to-primary/5 border border-violet-500/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-violet-500 shrink-0" />
                    <p className="text-sm font-medium text-foreground">How to export from Wodify</p>
                  </div>
                  <ol className="text-xs text-muted-foreground space-y-2 ml-6 list-decimal">
                    <li>In Wodify, go to <span className="font-medium text-foreground">Reports &rarr; Membership Reports &rarr; All Memberships</span></li>
                    <li>Set your filters (or leave defaults to include all members)</li>
                    <li>Click the <span className="font-medium text-foreground">Export</span> button (top right) and choose CSV</li>
                    <li>Upload that file here — either the formatted or unformatted version works</li>
                  </ol>
                  <div className="bg-muted/20 rounded-lg px-3 py-2 mt-2">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      <span className="font-medium text-foreground">What happens automatically:</span> Members with multiple memberships (e.g., Unlimited + 24hr Access) are combined into one record. Couples plans are recognized. Revenue is totaled across all plans per member. Both formatted ("Feb 24, 2026") and raw ("2026-02-24") date formats are handled.
                    </p>
                  </div>
                </div>

                <div
                  onDrop={(e) => handleDrop(e, true)}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => wodifyFileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-violet-500/40 hover:bg-violet-500/5 transition-all group"
                >
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground group-hover:text-violet-500 transition-colors mb-3" />
                  <p className="text-sm font-medium text-foreground">Drop your Wodify export here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">Accepts the "All Memberships" CSV report</p>
                  <input
                    ref={wodifyFileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleWodifyFileSelect(file);
                    }}
                  />
                </div>
              </motion.div>
            )}

            {step === "wodify-preview" && (
              <motion.div key="wodify-preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-4">
                    <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
                    <p className="text-sm font-medium">Analyzing your Wodify data...</p>
                    <p className="text-xs text-muted-foreground">Deduplicating members and consolidating memberships</p>
                  </div>
                ) : wodifySummary ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <SummaryCard label="Unique Members" value={wodifySummary.uniqueMembers} icon={<Users className="h-4 w-4" />} color="text-foreground" />
                      <SummaryCard label="Ready to Import" value={wodifySummary.validRows} icon={<CheckCircle2 className="h-4 w-4" />} color="text-emerald-400" />
                      <SummaryCard label="Monthly Revenue" value={`$${wodifySummary.totalMRR.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} color="text-primary" />
                      <SummaryCard label="Duplicates" value={wodifySummary.duplicateRows} icon={<SkipForward className="h-4 w-4" />} color="text-amber-400" />
                    </div>

                    {wodifySummary.totalRows !== wodifySummary.uniqueMembers && (
                      <div className="bg-muted/20 border border-border rounded-lg px-3 py-2 flex items-start gap-2">
                        <Info className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{wodifySummary.totalRows} rows</span> in the file were consolidated into <span className="font-medium text-foreground">{wodifySummary.uniqueMembers} unique members</span>.
                          Members with multiple memberships were combined — their total revenue reflects all plans.
                        </p>
                      </div>
                    )}

                    {Object.keys(wodifySummary.membershipBreakdown).length > 0 && (
                      <div className="bg-card border border-border rounded-xl p-4">
                        <h4 className="text-xs font-medium text-foreground mb-2">Membership Breakdown</h4>
                        <div className="space-y-1.5">
                          {Object.entries(wodifySummary.membershipBreakdown)
                            .sort(([, a], [, b]) => b - a)
                            .map(([plan, count]) => (
                              <div key={plan} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground truncate mr-3">{plan}</span>
                                <span className="font-medium text-foreground shrink-0">{count} member{count !== 1 ? "s" : ""}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    <div className="border border-border rounded-xl overflow-hidden">
                      <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/30 sticky top-0">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Email</th>
                              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Plan</th>
                              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Revenue</th>
                              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {wodifyPreviewRows.map((row) => (
                              <tr key={row.rowIndex} className={row.isDuplicate ? "bg-amber-500/5" : row.errors.length > 0 ? "bg-red-500/5" : ""}>
                                <td className="px-3 py-2 font-medium">{row.data.firstName} {row.data.lastName}</td>
                                <td className="px-3 py-2 text-muted-foreground">{row.data.email}</td>
                                <td className="px-3 py-2 text-muted-foreground truncate max-w-[120px]">{row.data.membershipType}</td>
                                <td className="px-3 py-2 text-right font-medium">
                                  {row.totalMonthlyRevenue > 0 ? `$${row.totalMonthlyRevenue.toFixed(0)}` : <span className="text-muted-foreground">$0</span>}
                                </td>
                                <td className="px-3 py-2">
                                  {row.isDuplicate ? (
                                    <span className="inline-flex items-center gap-1 text-amber-400 text-[10px] font-medium bg-amber-500/10 px-1.5 py-0.5 rounded">
                                      <SkipForward className="h-3 w-3" /> Exists
                                    </span>
                                  ) : row.errors.length > 0 ? (
                                    <span className="inline-flex items-center gap-1 text-red-400 text-[10px] font-medium bg-red-500/10 px-1.5 py-0.5 rounded" title={row.errors.join(", ")}>
                                      <XCircle className="h-3 w-3" /> {row.errors[0]}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                      <CheckCircle2 className="h-3 w-3" /> Ready
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {wodifySummary.emailOptOuts > 0 && (
                      <div className="bg-muted/20 border border-border rounded-lg px-3 py-2 flex items-start gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          {wodifySummary.emailOptOuts} member{wodifySummary.emailOptOuts !== 1 ? "s" : ""} opted out of mass emails in Wodify. They'll be tagged "email-opt-out" so your retention sequences respect their preference.
                        </p>
                      </div>
                    )}
                  </>
                ) : null}
              </motion.div>
            )}

            {(step === "wodify-importing") && (
              <motion.div key="wodify-importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 space-y-4">
                <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
                <p className="text-sm font-medium">Importing members from Wodify...</p>
                <p className="text-xs text-muted-foreground">Creating member profiles and calculating initial metrics</p>
              </motion.div>
            )}

            {(step === "wodify-results" || step === "results") && results && (
              <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <div className="text-center py-4">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold">Import Complete</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {results.created} member{results.created !== 1 ? "s" : ""} successfully added to your gym
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <SummaryCard label="Processed" value={results.processed} icon={<FileSpreadsheet className="h-4 w-4" />} color="text-foreground" />
                  <SummaryCard label="Created" value={results.created} icon={<CheckCircle2 className="h-4 w-4" />} color="text-emerald-400" />
                  <SummaryCard label="Skipped" value={results.skipped} icon={<SkipForward className="h-4 w-4" />} color="text-amber-400" />
                  <SummaryCard label="Errors" value={results.errored} icon={<XCircle className="h-4 w-4" />} color="text-red-400" />
                </div>

                {results.errors.length > 0 && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 space-y-1">
                    <p className="text-xs font-medium text-red-400 mb-1">Errors:</p>
                    {results.errors.slice(0, 5).map((err) => (
                      <p key={err.rowIndex} className="text-xs text-muted-foreground">Row {err.rowIndex + 1}: {err.error}</p>
                    ))}
                    {results.errors.length > 5 && (
                      <p className="text-xs text-muted-foreground">...and {results.errors.length - 5} more</p>
                    )}
                  </div>
                )}

                {step === "wodify-results" && (
                  <div className="bg-muted/20 border border-border rounded-lg px-3 py-2 flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Your dashboard, risk scores, and retention metrics will start populating with this data. Check back on the Overview page to see your gym's health at a glance.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {step === "upload" && (
              <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div
                  onDrop={(e) => handleDrop(e, false)}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-amber-500/40 hover:bg-amber-500/5 transition-all group"
                >
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground group-hover:text-amber-400 transition-colors mb-3" />
                  <p className="text-sm font-medium text-foreground">Drop your CSV file here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports .csv files up to 5,000 rows</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                </div>

                <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-amber-400 shrink-0" />
                    <p className="text-sm font-medium">What to include in your CSV</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your file should have column headers in the first row. Required fields are
                    <span className="text-amber-400 font-medium"> First Name</span>,
                    <span className="text-amber-400 font-medium"> Last Name</span>, and
                    <span className="text-amber-400 font-medium"> Email</span>.
                    Optional fields include phone, status, join date, membership type, and more.
                    You'll be able to match your columns in the next step.
                  </p>
                  <button onClick={downloadSample} className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium">
                    <Download className="h-3.5 w-3.5" />
                    Download sample template
                  </button>
                </div>
              </motion.div>
            )}

            {step === "map" && (
              <motion.div key="map" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="bg-muted/20 border border-border rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FileSpreadsheet className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="text-sm font-medium text-foreground">{fileName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {csvRows.length} rows · {csvHeaders.length} columns · Match each column to a member field below
                  </p>
                </div>

                {(() => {
                  const mappedRequired = MEMBER_FIELDS.filter(f => f.required && Object.values(mappings).includes(f.key));
                  const totalRequired = MEMBER_FIELDS.filter(f => f.required).length;
                  const allRequiredMapped = mappedRequired.length === totalRequired;
                  return !allRequiredMapped ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <p className="text-xs text-amber-400">
                        Map the required fields to continue: {MEMBER_FIELDS.filter(f => f.required && !Object.values(mappings).includes(f.key)).map(f => f.label).join(", ")}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <p className="text-xs text-emerald-400">All required fields mapped — ready to preview</p>
                    </div>
                  );
                })()}

                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5 w-[45%]">Column in your file</th>
                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5 w-[45%]">Import as</th>
                        <th className="w-[10%]" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {csvHeaders.map((header) => {
                        const mapped = mappings[header];
                        const fieldInfo = MEMBER_FIELDS.find((f) => f.key === mapped);
                        const sampleValues = csvRows.slice(0, 3).map(r => r[header]).filter(Boolean);
                        return (
                          <tr key={header} className={mapped ? "bg-card" : "bg-card/50"}>
                            <td className="px-4 py-2.5">
                              <div className="text-sm font-medium text-foreground truncate" title={header}>{header}</div>
                              {sampleValues.length > 0 && (
                                <div className="text-[11px] text-muted-foreground truncate mt-0.5" title={sampleValues.join(", ")}>
                                  e.g. {sampleValues[0]}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              <select
                                value={mapped || ""}
                                onChange={(e) => updateMapping(header, e.target.value)}
                                className={`bg-card border rounded-lg px-3 py-1.5 text-sm w-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors ${
                                  mapped
                                    ? fieldInfo?.required
                                      ? "border-amber-500/50 text-foreground font-medium"
                                      : "border-emerald-500/40 text-foreground"
                                    : "border-border text-muted-foreground"
                                }`}
                              >
                                <option value="">— Skip —</option>
                                {MEMBER_FIELDS.map((f) => {
                                  const alreadyUsed = Object.entries(mappings).some(([k, v]) => v === f.key && k !== header);
                                  return (
                                    <option key={f.key} value={f.key} disabled={alreadyUsed}>
                                      {f.label}{f.required ? " (required)" : ""}{alreadyUsed ? " ✓" : ""}
                                    </option>
                                  );
                                })}
                              </select>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {mapped ? (
                                fieldInfo?.required ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15">
                                    <Check className="h-3 w-3 text-amber-400" />
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15">
                                    <Check className="h-3 w-3 text-emerald-400" />
                                  </span>
                                )
                              ) : (
                                <span className="text-[10px] text-muted-foreground/50">skip</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {step === "preview" && summary && (
              <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <SummaryCard label="Total Rows" value={summary.totalRows} icon={<FileSpreadsheet className="h-4 w-4" />} color="text-foreground" />
                  <SummaryCard label="Ready to Import" value={summary.validRows} icon={<CheckCircle2 className="h-4 w-4" />} color="text-emerald-400" />
                  <SummaryCard label="Issues Found" value={summary.invalidRows} icon={<XCircle className="h-4 w-4" />} color="text-red-400" />
                  <SummaryCard label="Duplicates" value={summary.duplicateRows} icon={<SkipForward className="h-4 w-4" />} color="text-amber-400" />
                </div>

                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/30 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Email</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {previewRows.map((row) => (
                          <tr key={row.rowIndex} className={row.isDuplicate ? "bg-amber-500/5" : row.errors.length > 0 ? "bg-red-500/5" : ""}>
                            <td className="px-3 py-2 text-muted-foreground">{row.rowIndex + 1}</td>
                            <td className="px-3 py-2">
                              <span className="font-medium">{row.data.firstName} {row.data.lastName}</span>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{row.data.email}</td>
                            <td className="px-3 py-2">
                              {row.isDuplicate ? (
                                <span className="inline-flex items-center gap-1 text-amber-400 text-[10px] font-medium bg-amber-500/10 px-1.5 py-0.5 rounded">
                                  <SkipForward className="h-3 w-3" /> Duplicate{row.duplicateOf ? ` of ${row.duplicateOf.name}` : ""}
                                </span>
                              ) : row.errors.length > 0 ? (
                                <span className="inline-flex items-center gap-1 text-red-400 text-[10px] font-medium bg-red-500/10 px-1.5 py-0.5 rounded" title={row.errors.join(", ")}>
                                  <XCircle className="h-3 w-3" /> {row.errors[0]}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                  <CheckCircle2 className="h-3 w-3" /> Ready
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {summary.invalidRows > 0 && (
                  <div className="bg-muted/20 border border-border rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      {summary.invalidRows} row{summary.invalidRows > 1 ? "s" : ""} with issues will be skipped.
                      {summary.duplicateRows > 0 && ` ${summary.duplicateRows} duplicate${summary.duplicateRows > 1 ? "s" : ""} will also be skipped.`}
                      {" "}Only the {summary.validRows} valid row{summary.validRows > 1 ? "s" : ""} will be imported.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {step === "importing" && (
              <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 space-y-4">
                <Loader2 className="h-10 w-10 text-amber-400 animate-spin" />
                <p className="text-sm font-medium">Importing members...</p>
                <p className="text-xs text-muted-foreground">This may take a moment for large files</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
          <div>
            {(step === "map" || step === "preview" || step === "upload" || step === "wodify-upload" || step === "wodify-preview") && (
              <button
                onClick={() => {
                  if (step === "map") setStep("upload");
                  else if (step === "preview") setStep("map");
                  else if (step === "upload" || step === "wodify-upload") setStep("source");
                  else if (step === "wodify-preview") { wodifyAbortRef.current?.abort(); setStep("wodify-upload"); setWodifyPreviewRows([]); setWodifySummary(null); setIsLoading(false); }
                }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(step === "results" || step === "wodify-results") && (
              <button onClick={handleClose} className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium text-sm transition-colors">
                Done
              </button>
            )}
            {step === "map" && (
              <button
                onClick={handlePreview}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Preview
              </button>
            )}
            {step === "preview" && summary && summary.validRows > 0 && (
              <button
                onClick={() => {
                  const validRows = previewRows.filter((r) => r.errors.length === 0 && !r.isDuplicate).map((r) => r.data);
                  handleImport(validRows, false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-500 rounded-lg font-medium text-sm transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                Import {summary.validRows} Member{summary.validRows !== 1 ? "s" : ""}
              </button>
            )}
            {step === "wodify-preview" && wodifySummary && wodifySummary.validRows > 0 && !isLoading && (
              <button
                onClick={() => {
                  const validRows = wodifyPreviewRows.filter((r) => r.errors.length === 0 && !r.isDuplicate).map((r) => r.data);
                  handleImport(validRows, true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-500 rounded-lg font-medium text-sm transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                Import {wodifySummary.validRows} Member{wodifySummary.validRows !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
