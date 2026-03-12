import React, { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, AlertTriangle,
  X, Download, CheckCircle2, XCircle, Users, Loader2, SkipForward, Info
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

type Step = "upload" | "map" | "preview" | "importing" | "results";

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
    if (!mappings[header]) {
      mappings[header] = "";
    }
  }

  return mappings;
}

const SAMPLE_CSV = `first_name,last_name,email,phone,status,join_date,membership_type
Sarah,Connor,sarah@example.com,(555) 123-4567,active,2024-01-15,Premium
John,Smith,john.smith@example.com,(555) 987-6543,active,2024-03-01,Basic
Maria,Garcia,maria.g@example.com,,active,2024-06-10,Premium`;

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

  const [step, setStep] = useState<Step>("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<ValidatedRow[]>([]);
  const [summary, setSummary] = useState<PreviewSummary | null>(null);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const reset = useCallback(() => {
    setStep("upload");
    setCsvHeaders([]);
    setCsvRows([]);
    setMappings({});
    setPreviewRows([]);
    setSummary(null);
    setResults(null);
    setIsLoading(false);
    setFileName("");
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
      handleFileSelect(file);
    } else {
      toast({ title: "Invalid file", description: "Please upload a CSV file.", variant: "destructive" });
    }
  }, [handleFileSelect, toast]);

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

  const handleImport = useCallback(async () => {
    const validRows = previewRows.filter((r) => r.errors.length === 0 && !r.isDuplicate).map((r) => r.data);
    if (validRows.length === 0) {
      toast({ title: "No valid rows", description: "There are no valid rows to import.", variant: "destructive" });
      return;
    }

    setStep("importing");
    try {
      const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${apiBase}/api/gyms/${activeGymId}/members/import/confirm`, {
        method: "POST",
        body: JSON.stringify({ rows: validRows }),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Import failed");
      setResults(data);
      setStep("results");
      if (data.created > 0) {
        onImportComplete?.();
      }
    } catch (err: any) {
      toast({ title: "Import failed", description: err?.message || "Something went wrong", variant: "destructive" });
      setStep("preview");
    }
  }, [activeGymId, previewRows, toast, onImportComplete]);

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

  const stepIndex = ["upload", "map", "preview", "importing", "results"].indexOf(step);
  const stepLabels = ["Upload", "Map Columns", "Preview", "Importing", "Results"];

  return (
    <Dialog open={open} onOpenChange={step === "importing" ? undefined : handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 bg-card border-border overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-amber-400" />
            Import Members
          </DialogTitle>
          <div className="flex items-center gap-1 mt-3">
            {stepLabels.slice(0, step === "importing" || step === "results" ? 5 : 3).map((label, i) => (
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
            {step === "upload" && (
              <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div
                  onDrop={handleDrop}
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{fileName}</p>
                    <p className="text-xs text-muted-foreground">{csvRows.length} rows found with {csvHeaders.length} columns</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center px-2 pb-1 border-b border-border">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your CSV Column</p>
                    <div className="w-6" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Maps To</p>
                  </div>
                  {csvHeaders.map((header) => {
                    const mapped = mappings[header];
                    const fieldInfo = MEMBER_FIELDS.find((f) => f.key === mapped);
                    return (
                      <div key={header} className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
                        <div className="bg-muted/30 rounded-lg px-3 py-2 text-sm font-mono truncate" title={header}>{header}</div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        <select
                          value={mapped || ""}
                          onChange={(e) => updateMapping(header, e.target.value)}
                          className={`bg-card border rounded-lg px-3 py-2 text-sm w-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${
                            mapped ? (fieldInfo?.required ? "border-amber-500/40 text-foreground" : "border-emerald-500/40 text-foreground") : "border-border text-muted-foreground"
                          }`}
                        >
                          <option value="">Skip this column</option>
                          {MEMBER_FIELDS.map((f) => {
                            const alreadyUsed = Object.entries(mappings).some(([k, v]) => v === f.key && k !== header);
                            return (
                              <option key={f.key} value={f.key} disabled={alreadyUsed}>
                                {f.label}{f.required ? " *" : ""}{alreadyUsed ? " (already mapped)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="text-amber-400">*</span> Required fields
                </p>
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

            {step === "results" && results && (
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
                  <div className="border border-border rounded-xl p-3 space-y-2 max-h-[200px] overflow-y-auto">
                    <p className="text-xs font-medium text-red-400">Errors</p>
                    {results.errors.map((e, i) => (
                      <div key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-red-400 font-mono shrink-0">Row {e.rowIndex + 1}:</span>
                        <span>{e.error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
          <div>
            {step === "map" && (
              <button onClick={() => { setStep("upload"); reset(); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}
            {step === "preview" && (
              <button onClick={() => setStep("map")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to Mapping
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step !== "importing" && step !== "results" && (
              <button onClick={handleClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
            )}
            {step === "map" && (
              <button onClick={handlePreview} disabled={isLoading} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-black font-medium text-sm rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Preview Import
              </button>
            )}
            {step === "preview" && summary && summary.validRows > 0 && (
              <button onClick={handleImport} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white font-medium text-sm rounded-lg hover:bg-emerald-500 transition-colors">
                <Users className="h-4 w-4" />
                Import {summary.validRows} Member{summary.validRows !== 1 ? "s" : ""}
              </button>
            )}
            {step === "results" && (
              <button onClick={handleClose} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:bg-primary/90 transition-colors">
                <Check className="h-4 w-4" />
                Done
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-muted/20 border border-border rounded-xl p-3 text-center">
      <div className={`flex items-center justify-center gap-1.5 ${color} mb-1`}>
        {icon}
        <span className="text-lg font-bold">{value}</span>
      </div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
    </div>
  );
}
