import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  BarChart3,
  Users,
  Trophy,
  Loader2,
  CheckCircle2,
  Zap,
  ChevronLeft,
  ChevronRight,
  Pencil,
  X,
  Medal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getSectionTypeInfo, type SectionType } from "./SectionEditor";
import { useListSectionResults } from "@workspace/api-client-react";
import type { ProgrammingDayWithSections, ProgrammingSection, WorkoutResult, Member } from "@workspace/api-client-react";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function sectionTypeToUiType(sectionType: string): SectionType {
  const map: Record<string, SectionType> = {
    warmup: "warmup",
    strength: "strength",
    conditioning: "conditioning",
    skill: "skill",
    cooldown: "cooldown",
    wod: "conditioning",
    accessory: "accessory",
    custom: "custom",
  };
  return map[sectionType] ?? "conditioning";
}

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

interface ResultPayload {
  result: string;
  notes: string;
  isRx: boolean;
  isPr: boolean;
}

interface SectionResultsPanelProps {
  gymId: number;
  dayId: number;
  section: ProgrammingSection;
  currentMemberId: number | null;
  index: number;
  total: number;
  onLogResult: (dayId: number, sectionId: number, result: ResultPayload, targetMemberId?: number) => void;
  onEditResult: (dayId: number, sectionId: number, resultId: number, result: ResultPayload) => void;
  isLoggingResult: boolean;
  isStaff?: boolean;
  membersList?: Member[];
}

function SectionResultsPanel({
  gymId,
  dayId,
  section,
  currentMemberId,
  index,
  total,
  onLogResult,
  onEditResult,
  isLoggingResult,
  isStaff,
  membersList,
}: SectionResultsPanelProps) {
  const [showLogForm, setShowLogForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [result, setResult] = useState("");
  const [notes, setNotes] = useState("");
  const [isRx, setIsRx] = useState(false);
  const [isPr, setIsPr] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  const { data: sectionResults } = useListSectionResults(gymId, dayId, section.id, {
    query: { enabled: section.resultTrackingEnabled },
  });

  const results = (sectionResults || []) as WorkoutResult[];
  const myResult = currentMemberId ? results.find(r => r.memberId === currentMemberId) : null;
  const hasLogged = !!myResult;

  const uiType = sectionTypeToUiType(section.sectionType);
  const typeInfo = getSectionTypeInfo(uiType);
  const letter = LETTERS[index] || String(index + 1);

  const handleSubmitResult = () => {
    if (!result.trim()) return;
    const targetMemberId = isStaff ? selectedMemberId ?? undefined : undefined;
    if (!isStaff && !currentMemberId) return;
    if (isStaff && !selectedMemberId) return;
    onLogResult(dayId, section.id, { result: result.trim(), notes: notes.trim(), isRx, isPr }, targetMemberId ?? undefined);
    setResult("");
    setNotes("");
    setIsRx(false);
    setIsPr(false);
    setShowLogForm(false);
  };

  const handleStartEdit = () => {
    if (!myResult) return;
    setResult(myResult.result);
    setNotes(myResult.notes || "");
    setIsRx(myResult.isRx);
    setIsPr(myResult.isPr);
    setShowEditForm(true);
  };

  const handleSubmitEdit = () => {
    if (!myResult || !result.trim()) return;
    onEditResult(dayId, section.id, myResult.id, { result: result.trim(), notes: notes.trim(), isRx, isPr });
    setShowEditForm(false);
  };

  const canLogResult = section.resultTrackingEnabled;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="space-y-1"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="h-6 w-6 rounded-lg flex items-center justify-center bg-primary/10 text-primary text-xs font-bold shrink-0">
          {letter}
        </span>
        <span className={`${typeInfo.color} shrink-0`}>{typeInfo.icon}</span>
        <h3 className="text-sm font-bold text-foreground">
          {section.title}
        </h3>
        {results.length > 0 && (
          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto hover:text-foreground transition-colors"
          >
            <Users className="h-3 w-3" />
            {results.length}
          </button>
        )}
      </div>

      {section.instructions && (
        <div className="pl-8 mb-2">
          <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
            {section.instructions}
          </p>
        </div>
      )}

      {section.memberNotes && (
        <div className="pl-8 mb-2">
          <p className="text-xs text-primary/80 italic">{section.memberNotes}</p>
        </div>
      )}

      {section.intendedStimulus && (
        <div className="pl-8 mb-2">
          <p className="text-xs text-blue-500">🎯 Stimulus: {section.intendedStimulus}</p>
        </div>
      )}

      {section.scalingNotes && (
        <div className="pl-8 mb-2">
          <p className="text-xs text-muted-foreground">Scaling: {section.scalingNotes}</p>
        </div>
      )}

      {section.timeCap && (
        <div className="pl-8 mb-2">
          <p className="text-xs text-amber-500">⏱ {section.timeCap}</p>
        </div>
      )}

      {showLeaderboard && results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="pl-8 mb-2"
        >
          <div className="rounded-xl bg-muted/20 border border-border p-3 space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Leaderboard</p>
            {results.slice(0, 10).map((r, i) => (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <span className={`font-bold w-4 ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-muted-foreground"}`}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                </span>
                <span className={`flex-1 font-medium ${r.memberId === currentMemberId ? "text-primary" : "text-foreground"}`}>
                  {r.memberName}
                </span>
                <span className="text-muted-foreground">{r.result}</span>
                {r.isRx && <span className="text-emerald-500 text-[10px] font-bold">Rx</span>}
                {r.isPr && <span className="text-amber-500 text-[10px] font-bold">PR</span>}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {canLogResult && (
        <div className="pl-8">
          {hasLogged && !showEditForm ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="font-medium">{myResult?.result}</span>
                {myResult?.isRx && <span className="text-emerald-600 font-bold">Rx</span>}
                {myResult?.isPr && <span className="text-amber-500 font-bold">PR</span>}
              </div>
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
                title="Edit result"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          ) : !showLogForm && !showEditForm ? (
            <button
              onClick={() => setShowLogForm(true)}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Log Result
            </button>
          ) : null}

          {(showLogForm || showEditForm) && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2.5 p-3 rounded-xl bg-muted/30 border border-border mt-1"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-foreground">{showEditForm ? "Edit Result" : "Log Result"}</p>
                <button onClick={() => { setShowLogForm(false); setShowEditForm(false); }}>
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              {isStaff && showLogForm && membersList && membersList.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Member <span className="text-destructive">*</span></Label>
                  <select
                    value={selectedMemberId ?? ""}
                    onChange={(e) => setSelectedMemberId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full h-8 text-sm rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select member...</option>
                    {membersList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">
                  Result <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  placeholder="e.g. 5 rounds + 3 reps, 12:45, 225 lbs"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={isRx}
                      onCheckedChange={setIsRx}
                      className="scale-75"
                    />
                    <Label className="text-xs cursor-pointer flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      Rx
                    </Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={isPr}
                      onCheckedChange={setIsPr}
                      className="scale-75"
                    />
                    <Label className="text-xs cursor-pointer flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-amber-500" />
                      PR
                    </Label>
                  </div>
                </div>
                <button
                  onClick={showEditForm ? handleSubmitEdit : handleSubmitResult}
                  disabled={!result.trim() || isLoggingResult || (isStaff && showLogForm && !selectedMemberId)}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isLoggingResult && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {showEditForm ? "Update" : "Submit"}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {isStaff && section.resultTrackingEnabled && results.length > 0 && (
        <div className="pl-8 mt-1">
          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Medal className="h-3.5 w-3.5" />
            {showLeaderboard ? "Hide" : "Show"} results ({results.length})
          </button>
        </div>
      )}

      {index < total - 1 && (
        <div className="border-b border-border/50 my-3 ml-8" />
      )}
    </motion.div>
  );
}

interface MemberProgrammingViewProps {
  days: ProgrammingDayWithSections[];
  selectedDate: Date;
  onSelectedDateChange: (date: Date) => void;
  onLogResult: (dayId: number, sectionId: number, result: ResultPayload, targetMemberId?: number) => void;
  onEditResult: (dayId: number, sectionId: number, resultId: number, result: ResultPayload) => void;
  currentMemberId: number | null;
  isLoggingResult: boolean;
  gymId: number;
  isStaff?: boolean;
  membersList?: Member[];
  showNavigation?: boolean;
}

export function MemberProgrammingView({
  days,
  selectedDate,
  onSelectedDateChange,
  onLogResult,
  onEditResult,
  currentMemberId,
  isLoggingResult,
  gymId,
  isStaff,
  membersList,
  showNavigation = true,
}: MemberProgrammingViewProps) {
  const todayStr = toDateString(selectedDate);

  const daysByDate: Record<string, ProgrammingDayWithSections[]> = {};
  for (const d of days) {
    if (!daysByDate[d.date]) daysByDate[d.date] = [];
    daysByDate[d.date].push(d);
  }

  const todayDays = daysByDate[todayStr] || [];
  const hasMultipleTracksByDate = (dateStr: string) =>
    (daysByDate[dateStr] || []).length > 1;

  const futureDates = [...new Set(days.map(d => d.date))]
    .filter(d => d > todayStr)
    .sort()
    .slice(0, 5);

  const pastDates = [...new Set(days.map(d => d.date))]
    .filter(d => d < todayStr)
    .sort()
    .reverse()
    .slice(0, 10);

  const navigate = (direction: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + direction);
    onSelectedDateChange(d);
  };

  const goToToday = () => onSelectedDateChange(new Date());

  const isToday = (() => {
    const today = new Date();
    return (
      selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getDate() === today.getDate()
    );
  })();

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">
              {showNavigation ? "Today's Workout" : "Log Results"}
            </h2>
            {showNavigation && (
              <p className="text-xs text-muted-foreground">
                {new Date(todayStr + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
          </div>
          {showNavigation && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate(-1)}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {!isToday && (
                <button
                  onClick={goToToday}
                  className="px-2.5 h-8 text-xs font-medium rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  Today
                </button>
              )}
              <button
                onClick={() => navigate(1)}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {todayDays.length > 0 ? (
          <div className="bg-card border border-border rounded-2xl p-5">
            {todayDays.map((day, dayIdx) => {
              const showTrackHeader = hasMultipleTracksByDate(todayStr);
              return (
                <React.Fragment key={day.id}>
                  {showTrackHeader && (
                    <>
                      {dayIdx > 0 && <div className="border-b border-border my-4" />}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-1 w-1 rounded-full bg-primary" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {day.track || "Daily WOD"}
                        </span>
                      </div>
                    </>
                  )}
                  {day.sections.map((section, i) => (
                    <SectionResultsPanel
                      key={section.id}
                      gymId={gymId}
                      dayId={day.id}
                      section={section}
                      currentMemberId={currentMemberId}
                      index={i}
                      total={day.sections.length}
                      onLogResult={onLogResult}
                      onEditResult={onEditResult}
                      isLoggingResult={isLoggingResult}
                      isStaff={isStaff}
                      membersList={membersList}
                    />
                  ))}
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl">
            <div className="h-12 w-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              No programming posted for this day
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Check back later for updates
            </p>
          </div>
        )}
      </div>

      {showNavigation && futureDates.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Upcoming
          </h2>
          {futureDates.map((dateStr) => {
            const daysForDate = daysByDate[dateStr];
            if (!daysForDate?.length) return null;
            const showTrackHeader = daysForDate.length > 1;
            return (
              <div key={dateStr} className="space-y-2">
                <p className="text-xs font-medium text-foreground">
                  {new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <div className="bg-card border border-border rounded-2xl p-5">
                  {daysForDate.map((day, dayIdx) => (
                    <React.Fragment key={day.id}>
                      {showTrackHeader && (
                        <>
                          {dayIdx > 0 && <div className="border-b border-border my-3" />}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-1 w-1 rounded-full bg-primary" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {day.track || "Daily WOD"}
                            </span>
                          </div>
                        </>
                      )}
                      {day.sections.map((section, i) => {
                        const uiType = sectionTypeToUiType(section.sectionType);
                        const typeInfo = getSectionTypeInfo(uiType);
                        const letter = LETTERS[i] || String(i + 1);
                        return (
                          <div key={section.id} className="mb-2 last:mb-0">
                            <div className="flex items-center gap-2">
                              <span className="h-5 w-5 rounded flex items-center justify-center bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                                {letter}
                              </span>
                              <span className={`${typeInfo.color} shrink-0`}>{typeInfo.icon}</span>
                              <span className="text-sm font-semibold text-foreground">{section.title}</span>
                            </div>
                            {section.instructions && (
                              <p className="text-xs text-muted-foreground pl-7 mt-0.5 line-clamp-2 whitespace-pre-line">
                                {section.instructions}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNavigation && pastDates.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Past Workouts
          </h2>
          {pastDates.map((dateStr) => {
            const daysForDate = daysByDate[dateStr];
            if (!daysForDate?.length) return null;
            const showTrackHeader = daysForDate.length > 1;
            return (
              <div key={dateStr} className="space-y-2">
                <p className="text-xs font-medium text-foreground">
                  {new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <div className="bg-card border border-border rounded-2xl p-5 opacity-80">
                  {daysForDate.map((day, dayIdx) => (
                    <React.Fragment key={day.id}>
                      {showTrackHeader && (
                        <>
                          {dayIdx > 0 && <div className="border-b border-border my-4" />}
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-1 w-1 rounded-full bg-primary" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {day.track || "Daily WOD"}
                            </span>
                          </div>
                        </>
                      )}
                      {day.sections.map((section, i) => (
                        <SectionResultsPanel
                          key={section.id}
                          gymId={gymId}
                          dayId={day.id}
                          section={section}
                          currentMemberId={currentMemberId}
                          index={i}
                          total={day.sections.length}
                          onLogResult={onLogResult}
                          onEditResult={onEditResult}
                          isLoggingResult={isLoggingResult}
                          isStaff={isStaff}
                          membersList={membersList}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
