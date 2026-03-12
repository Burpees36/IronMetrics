import React, { useState } from "react";
import { motion } from "framer-motion";
import {
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
import { getSectionTypeInfo } from "./SectionEditor";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

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

interface MemberSectionCardProps {
  workout: Workout;
  onLogResult: (workoutId: number, result: { result: string; notes: string; isRx: boolean; isPr: boolean }) => void;
  isLoggingResult: boolean;
  index: number;
  total: number;
}

function MemberSectionCard({ workout, onLogResult, isLoggingResult, index, total }: MemberSectionCardProps) {
  const [showLogForm, setShowLogForm] = useState(false);
  const [result, setResult] = useState("");
  const [notes, setNotes] = useState("");
  const [isRx, setIsRx] = useState(false);
  const [isPr, setIsPr] = useState(false);

  const typeMapping: Record<string, string> = {
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
  const typeInfo = getSectionTypeInfo(sectionType as any);
  const letter = LETTERS[index] || String(index + 1);

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
      transition={{ delay: index * 0.06 }}
      className="space-y-1"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="h-6 w-6 rounded-lg flex items-center justify-center bg-primary/10 text-primary text-xs font-bold shrink-0">
          {letter}
        </span>
        <span className={`${typeInfo.color} shrink-0`}>{typeInfo.icon}</span>
        <h3 className="text-sm font-bold text-foreground">
          {workout.title}
        </h3>
        {workout.resultCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
            <Users className="h-3 w-3" />
            {workout.resultCount}
          </span>
        )}
      </div>

      {workout.description && (
        <div className="pl-8 mb-2">
          <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
            {workout.description}
          </p>
        </div>
      )}

      {workout.movements.length > 0 && !workout.description && (
        <div className="pl-8 mb-2">
          <p className="text-sm text-foreground/80">
            {workout.movements.join(" · ")}
          </p>
        </div>
      )}

      <div className="pl-8">
        {!showLogForm ? (
          <button
            onClick={() => setShowLogForm(true)}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Log Result
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2.5 p-3 rounded-xl bg-muted/30 border border-border mt-1"
          >
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLogForm(false)}
                  className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitResult}
                  disabled={!result.trim() || isLoggingResult}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isLoggingResult && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  Submit
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {index < total - 1 && (
        <div className="border-b border-border/50 my-3 ml-8" />
      )}
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
            <h2 className="text-lg font-bold text-foreground">Today's Workout</h2>
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
          <div className="bg-card border border-border rounded-2xl p-5">
            {todayWorkouts.map((workout, i) => (
              <MemberSectionCard
                key={workout.id}
                workout={workout}
                onLogResult={onLogResult}
                isLoggingResult={isLoggingResult}
                index={i}
                total={todayWorkouts.length}
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
                <div className="bg-card border border-border rounded-2xl p-5">
                  {dateWorkouts.map((workout, i) => (
                    <MemberSectionCard
                      key={workout.id}
                      workout={workout}
                      onLogResult={onLogResult}
                      isLoggingResult={isLoggingResult}
                      index={i}
                      total={dateWorkouts.length}
                    />
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
