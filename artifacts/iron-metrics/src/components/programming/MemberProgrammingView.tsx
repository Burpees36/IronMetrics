import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Clock,
  Timer,
  FileText,
  BarChart3,
  Users,
  Trophy,
  Loader2,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getSectionTypeInfo, SectionData } from "./SectionEditor";

interface Workout {
  id: number;
  title: string;
  description?: string | null;
  workoutDate: string;
  type: string;
  movements: string[];
  resultCount: number;
}

interface MemberProgrammingViewProps {
  workouts: Workout[];
  selectedDate: Date;
  onLogResult: (workoutId: number, result: { result: string; notes: string; isRx: boolean; isPr: boolean }) => void;
  isLoggingResult: boolean;
}

function workoutToSection(workout: Workout): SectionData & { workoutId: number } {
  return {
    workoutId: workout.id,
    id: `workout-${workout.id}`,
    type: (workout.type as any) || "conditioning",
    title: workout.title,
    instructions: workout.description || "",
    movements: workout.movements || [],
    timeCap: "",
    stimulus: "",
    scalingNotes: "",
    coachNotes: "",
    memberNotes: "",
    trackResults: true,
  };
}

interface MemberSectionCardProps {
  workout: Workout;
  onLogResult: (workoutId: number, result: { result: string; notes: string; isRx: boolean; isPr: boolean }) => void;
  isLoggingResult: boolean;
  index: number;
}

function MemberSectionCard({ workout, onLogResult, isLoggingResult, index }: MemberSectionCardProps) {
  const [expanded, setExpanded] = useState(index === 0);
  const [showLogForm, setShowLogForm] = useState(false);
  const [result, setResult] = useState("");
  const [notes, setNotes] = useState("");
  const [isRx, setIsRx] = useState(false);
  const [isPr, setIsPr] = useState(false);

  const typeMapping: Record<string, any> = {
    amrap: "conditioning",
    for_time: "conditioning",
    emom: "conditioning",
    strength: "strength",
    custom: "custom",
    warmup: "warmup",
    mobility: "mobility",
    skill: "skill",
    conditioning: "conditioning",
    accessory: "accessory",
    cooldown: "cooldown",
    notes: "notes",
  };

  const sectionType = typeMapping[workout.type] || "conditioning";
  const typeInfo = getSectionTypeInfo(sectionType);

  const handleSubmitResult = () => {
    if (!result.trim()) return;
    onLogResult(workout.id, { result: result.trim(), notes: notes.trim(), isRx, isPr });
    setResult("");
    setNotes("");
    setIsRx(false);
    setIsPr(false);
    setShowLogForm(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-muted ${typeInfo.color}`}>
          {typeInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-foreground truncate">
            {workout.title}
          </h3>
          <p className="text-xs text-muted-foreground capitalize">
            {workout.type?.replace("_", " ")}
            {workout.movements.length > 0 && ` · ${workout.movements.length} movements`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {workout.resultCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {workout.resultCount}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {workout.description && (
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                    {workout.description}
                  </p>
                </div>
              )}

              {workout.movements.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Movements
                  </p>
                  <div className="space-y-1.5">
                    {workout.movements.map((mov, j) => (
                      <div
                        key={j}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/30"
                      >
                        <Dumbbell className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-sm text-foreground">{mov}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-border">
                {!showLogForm ? (
                  <button
                    onClick={() => setShowLogForm(true)}
                    className="flex items-center gap-2 px-4 py-2.5 w-full justify-center rounded-xl border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors text-sm font-medium"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Log My Result
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border"
                  >
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Result <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={result}
                        onChange={(e) => setResult(e.target.value)}
                        placeholder="e.g. 5 rounds + 3 reps, 12:45, 225 lbs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Notes</Label>
                      <Input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Optional notes about your performance"
                      />
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isRx}
                          onCheckedChange={setIsRx}
                        />
                        <Label className="text-xs cursor-pointer flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          Rx
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isPr}
                          onCheckedChange={setIsPr}
                        />
                        <Label className="text-xs cursor-pointer flex items-center gap-1">
                          <Trophy className="h-3 w-3 text-amber-500" />
                          PR
                        </Label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setShowLogForm(false)}
                        className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitResult}
                        disabled={!result.trim() || isLoggingResult}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {isLoggingResult && (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                        Submit Result
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function MemberProgrammingView({
  workouts,
  selectedDate,
  onLogResult,
  isLoggingResult,
}: MemberProgrammingViewProps) {
  const todayStr = selectedDate.toISOString().split("T")[0];
  const todayWorkouts = workouts.filter((w) => w.workoutDate === todayStr);

  const futureWorkouts = workouts
    .filter((w) => w.workoutDate > todayStr)
    .sort((a, b) => a.workoutDate.localeCompare(b.workoutDate));

  const upcomingDates = [...new Set(futureWorkouts.map((w) => w.workoutDate))].slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Today's Programming</h2>
            <p className="text-xs text-muted-foreground">
              {new Date(todayStr + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {todayWorkouts.length > 0 ? (
          <div className="space-y-3">
            {todayWorkouts.map((workout, i) => (
              <MemberSectionCard
                key={workout.id}
                workout={workout}
                onLogResult={onLogResult}
                isLoggingResult={isLoggingResult}
                index={i}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl">
            <div className="h-12 w-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              No programming posted for today
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Check back later for updates
            </p>
          </div>
        )}
      </div>

      {upcomingDates.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Upcoming
          </h2>
          {upcomingDates.map((dateStr) => {
            const dateWorkouts = futureWorkouts.filter(
              (w) => w.workoutDate === dateStr
            );
            return (
              <div key={dateStr} className="space-y-2">
                <p className="text-xs font-medium text-foreground">
                  {new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                {dateWorkouts.map((workout, i) => (
                  <MemberSectionCard
                    key={workout.id}
                    workout={workout}
                    onLogResult={onLogResult}
                    isLoggingResult={isLoggingResult}
                    index={i}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
