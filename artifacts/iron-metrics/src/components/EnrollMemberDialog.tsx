import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Loader2, UserPlus, CheckCircle2, AlertCircle,
  ChevronRight, Mail, ClipboardList, Users
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

function apiFetch(url: string, opts?: RequestInit) {
  return fetch(`${API_BASE}${url}`, { credentials: "include", ...opts });
}

interface MemberResult {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  riskTier: string | null;
  riskScore: number | null;
}

interface SequenceOption {
  id: number;
  name: string;
  type: string;
  isEnabled: boolean;
  activeEnrollments: number;
  steps?: { stepOrder: number; actionType: string; delayDays: number; config: Record<string, unknown> }[];
}

interface ActiveEnrollment {
  memberId: number;
  sequenceId: number;
  status: string;
}

interface EnrollMemberDialogProps {
  open: boolean;
  onClose: () => void;
  gymId: number;
  sequenceId?: number;
  sequenceName?: string;
  sequences?: SequenceOption[];
  onEnrolled: () => void;
}

type DialogStep = "search" | "confirm";

interface EnrollResult {
  memberId: number;
  memberName: string;
  success: boolean;
  error?: string;
}

export function EnrollMemberDialog({
  open,
  onClose,
  gymId,
  sequenceId: preSelectedSequenceId,
  sequenceName: preSelectedSequenceName,
  sequences: providedSequences,
  onEnrolled,
}: EnrollMemberDialogProps) {
  const [dialogStep, setDialogStep] = useState<DialogStep>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MemberResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<MemberResult[]>([]);
  const [selectedSequenceId, setSelectedSequenceId] = useState<number | undefined>(preSelectedSequenceId);
  const [sequences, setSequences] = useState<SequenceOption[]>(providedSequences || []);
  const [activeEnrollments, setActiveEnrollments] = useState<ActiveEnrollment[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollResults, setEnrollResults] = useState<EnrollResult[]>([]);
  const [enrollProgress, setEnrollProgress] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setDialogStep("search");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedMembers([]);
      setSelectedSequenceId(preSelectedSequenceId);
      setEnrollResults([]);
      setEnrollProgress(0);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [open, preSelectedSequenceId]);

  useEffect(() => {
    if (providedSequences && providedSequences.length > 0) {
      setSequences(providedSequences);
    }
  }, [providedSequences]);

  useEffect(() => {
    if (!open || !gymId) return;
    if (!providedSequences || providedSequences.length === 0) {
      apiFetch(`/api/gyms/${gymId}/retention/sequences`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setSequences(data))
        .catch(() => {});
    }
    apiFetch(`/api/gyms/${gymId}/retention/enrollments?status=active`)
      .then(res => res.ok ? res.json() : [])
      .then((data: Array<{ memberId: number; sequenceId: number; status: string }>) =>
        setActiveEnrollments(data.map(e => ({ memberId: e.memberId, sequenceId: e.sequenceId, status: e.status })))
      )
      .catch(() => {});
  }, [open, gymId, providedSequences]);

  const searchMembers = useCallback(async (query: string) => {
    if (!gymId || query.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    try {
      const res = await apiFetch(`/api/gyms/${gymId}/members?search=${encodeURIComponent(query.trim())}&limit=20`);
      if (controller.signal.aborted) return;
      if (res.ok) {
        const data = await res.json();
        const members: MemberResult[] = (data.members || data || []).map((m: Record<string, unknown>) => ({
          id: m.id as number,
          firstName: m.firstName as string,
          lastName: m.lastName as string,
          email: m.email as string,
          status: m.status as string,
          riskTier: (m.riskTier as string | null) || null,
          riskScore: (m.riskScore as number | null) || null,
        }));
        if (!controller.signal.aborted) setSearchResults(members);
      }
    } catch {
      if (!controller.signal.aborted) setSearchResults([]);
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }, [gymId]);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchMembers(value), 300);
  };

  const isAlreadyEnrolled = (memberId: number): boolean => {
    if (!selectedSequenceId) return false;
    return activeEnrollments.some(
      e => e.memberId === memberId && e.sequenceId === selectedSequenceId && e.status === "active"
    );
  };

  const toggleMember = (member: MemberResult) => {
    if (isAlreadyEnrolled(member.id)) return;
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.id === member.id);
      if (exists) return prev.filter(m => m.id !== member.id);
      return [...prev, member];
    });
  };

  const isMemberSelected = (memberId: number): boolean => {
    return selectedMembers.some(m => m.id === memberId);
  };

  const selectedSequence = sequences.find(s => s.id === selectedSequenceId);

  const getFirstStepPreview = (): string | null => {
    if (!selectedSequence?.steps || selectedSequence.steps.length === 0) return null;
    const step = selectedSequence.steps[0];
    if (step.actionType === "email") {
      const subject = (step.config as Record<string, string>).subject || "";
      return `Send Email: ${subject || "(no subject)"}`;
    }
    if (step.actionType === "task") {
      const title = (step.config as Record<string, string>).title || "";
      return `Create Staff Task: ${title || "(no title)"}`;
    }
    return step.actionType;
  };

  const loadSequenceWithSteps = async (seqId: number) => {
    setSelectedSequenceId(seqId);
    try {
      const res = await apiFetch(`/api/gyms/${gymId}/retention/sequences/${seqId}`);
      if (res.ok) {
        const detail = await res.json();
        setSequences(prev => prev.map(s => s.id === seqId ? { ...s, steps: detail.steps } : s));
      }
    } catch {}
  };

  const handleEnroll = async () => {
    if (!selectedSequenceId || selectedMembers.length === 0) return;
    setEnrolling(true);
    setEnrollProgress(0);
    const results: EnrollResult[] = [];

    for (let i = 0; i < selectedMembers.length; i++) {
      const member = selectedMembers[i];
      try {
        const res = await apiFetch(`/api/gyms/${gymId}/retention/enroll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: member.id, sequenceId: selectedSequenceId }),
        });
        if (res.ok) {
          results.push({ memberId: member.id, memberName: `${member.firstName} ${member.lastName}`, success: true });
        } else {
          const data = await res.json();
          results.push({ memberId: member.id, memberName: `${member.firstName} ${member.lastName}`, success: false, error: data.error });
        }
      } catch {
        results.push({ memberId: member.id, memberName: `${member.firstName} ${member.lastName}`, success: false, error: "Network error" });
      }
      setEnrollProgress(i + 1);
    }

    setEnrollResults(results);
    setEnrolling(false);

    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      onEnrolled();
    }
  };

  const canProceedToConfirm = selectedMembers.length > 0 && !!selectedSequenceId;
  const hasResults = enrollResults.length > 0;
  const successCount = enrollResults.filter(r => r.success).length;
  const failCount = enrollResults.filter(r => !r.success).length;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={enrolling ? undefined : onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col z-10"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-primary/15 rounded-lg flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Enroll Member</h3>
              <p className="text-[11px] text-muted-foreground">
                {dialogStep === "search" ? "Search and select members" : hasResults ? "Enrollment complete" : "Review and confirm"}
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={enrolling} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {dialogStep === "search" && (
              <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5 space-y-4">
                {!preSelectedSequenceId && (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Select Sequence</label>
                    <select
                      value={selectedSequenceId || ""}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val) loadSequenceWithSteps(val);
                        else setSelectedSequenceId(undefined);
                      }}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Choose a sequence...</option>
                      {sequences.map(seq => (
                        <option key={seq.id} value={seq.id}>
                          {seq.name} {!seq.isEnabled ? "(paused)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {preSelectedSequenceId && preSelectedSequenceName && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-foreground">Enrolling into: {preSelectedSequenceName}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Search Members</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(e) => handleSearchInput(e.target.value)}
                      placeholder="Search by name or email..."
                      className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
                    )}
                  </div>
                </div>

                {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Type at least 2 characters to search</p>
                )}

                {searchResults.length > 0 && (
                  <div className="border border-border rounded-lg divide-y divide-border max-h-60 overflow-y-auto">
                    {searchResults.map(member => {
                      const enrolled = isAlreadyEnrolled(member.id);
                      const selected = isMemberSelected(member.id);
                      return (
                        <button
                          key={member.id}
                          onClick={() => toggleMember(member)}
                          disabled={enrolled}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                            enrolled
                              ? "opacity-50 cursor-not-allowed bg-muted/10"
                              : selected
                              ? "bg-primary/5"
                              : "hover:bg-muted/20"
                          }`}
                        >
                          <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            enrolled
                              ? "border-muted-foreground/30 bg-muted/20"
                              : selected
                              ? "border-primary bg-primary"
                              : "border-border"
                          }`}>
                            {(selected || enrolled) && (
                              <CheckCircle2 className={`h-3 w-3 ${enrolled ? "text-muted-foreground/50" : "text-primary-foreground"}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground truncate">
                                {member.firstName} {member.lastName}
                              </span>
                              {member.riskTier && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                                  member.riskTier === "critical" ? "bg-red-500/15 text-red-500" :
                                  member.riskTier === "high" ? "bg-amber-500/15 text-amber-500" :
                                  member.riskTier === "medium" ? "bg-yellow-500/15 text-yellow-500" :
                                  "bg-emerald-500/15 text-emerald-500"
                                }`}>{member.riskTier}</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          </div>
                          {enrolled && (
                            <span className="text-[10px] text-muted-foreground font-medium shrink-0">Already enrolled</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
                  <div className="text-center py-6">
                    <Search className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No members found for "{searchQuery}"</p>
                  </div>
                )}

                {selectedMembers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Selected ({selectedMembers.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMembers.map(member => (
                        <span
                          key={member.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium"
                        >
                          {member.firstName} {member.lastName}
                          <button onClick={() => toggleMember(member)} className="hover:text-primary/70 transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {dialogStep === "confirm" && !hasResults && (
              <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5 space-y-4">
                <div className="bg-muted/10 border border-border rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Sequence</p>
                    <p className="text-sm font-semibold text-foreground">{selectedSequence?.name || "Unknown"}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                      Members ({selectedMembers.length})
                    </p>
                    <div className="space-y-1">
                      {selectedMembers.map(member => (
                        <div key={member.id} className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          <span className="text-sm text-foreground">{member.firstName} {member.lastName}</span>
                          <span className="text-xs text-muted-foreground">({member.email})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {getFirstStepPreview() && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-1">First Step</p>
                      <div className="flex items-center gap-2">
                        {selectedSequence?.steps?.[0]?.actionType === "email"
                          ? <Mail className="h-3.5 w-3.5 text-blue-500" />
                          : <ClipboardList className="h-3.5 w-3.5 text-amber-500" />}
                        <span className="text-xs text-foreground">{getFirstStepPreview()}</span>
                      </div>
                      {selectedSequence?.steps?.[0]?.delayDays === 0 && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">Triggers immediately after enrollment</p>
                      )}
                      {selectedSequence?.steps?.[0] && selectedSequence.steps[0].delayDays > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Triggers after {selectedSequence.steps[0].delayDays} day{selectedSequence.steps[0].delayDays !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {enrolling && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Enrolling...</span>
                      <span>{enrollProgress} / {selectedMembers.length}</span>
                    </div>
                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${(enrollProgress / selectedMembers.length) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {dialogStep === "confirm" && hasResults && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5 space-y-4">
                <div className="text-center py-2">
                  {failCount === 0 ? (
                    <>
                      <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-foreground">
                        {successCount === 1
                          ? "Member enrolled successfully"
                          : `${successCount} members enrolled successfully`}
                      </p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-foreground">
                        {successCount} enrolled, {failCount} failed
                      </p>
                    </>
                  )}
                </div>

                <div className="border border-border rounded-lg divide-y divide-border">
                  {enrollResults.map(result => (
                    <div key={result.memberId} className="flex items-center gap-3 px-3 py-2.5">
                      {result.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{result.memberName}</p>
                        {result.error && (
                          <p className="text-xs text-red-500">{result.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-between shrink-0">
          {dialogStep === "search" && (
            <>
              <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedSequenceId && !selectedSequence?.steps) {
                    loadSequenceWithSteps(selectedSequenceId);
                  }
                  setDialogStep("confirm");
                }}
                disabled={!canProceedToConfirm}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Review
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          {dialogStep === "confirm" && !hasResults && (
            <>
              <button
                onClick={() => setDialogStep("search")}
                disabled={enrolling}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {enrolling ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    {selectedMembers.length === 1
                      ? "Enroll Member"
                      : `Enroll ${selectedMembers.length} Members`}
                  </>
                )}
              </button>
            </>
          )}

          {dialogStep === "confirm" && hasResults && (
            <div className="w-full flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
