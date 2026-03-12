import React, { useState, useMemo, useCallback } from "react";
import { useGym } from "@/store/GymContext";
import {
  useListWorkouts,
  useCreateWorkout,
  useLogWorkoutResult,
  useListMembers,
  getListWorkoutsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Activity,
  Plus,
  Rocket,
  CalendarDays,
  Dumbbell,
} from "lucide-react";

import { DateNavigation } from "@/components/programming/DateNavigation";
import { DayCard } from "@/components/programming/DayCard";
import {
  CreateProgrammingPanel,
  ProgrammingDayData,
} from "@/components/programming/CreateProgrammingPanel";
import { MemberProgrammingView } from "@/components/programming/MemberProgrammingView";
import { useUserRole } from "@/components/programming/useUserRole";
import { SectionData, createEmptySection } from "@/components/programming/SectionEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getWeekDates(date: Date): string[] {
  const d = new Date(date);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    dates.push(toDateString(dayDate));
  }
  return dates;
}

interface WorkoutWithSections {
  id: number;
  title: string;
  description?: string | null;
  workoutDate: string;
  type: string;
  movements: string[];
  resultCount: number;
}

function workoutsToDay(workouts: WorkoutWithSections[]): {
  date: string;
  title: string;
  status: "draft" | "published";
  sections: SectionData[];
  resultCount: number;
  workoutIds: number[];
} | null {
  if (workouts.length === 0) return null;

  const first = workouts[0];
  const sections: SectionData[] = workouts.map((w) => {
    const typeMapping: Record<string, string> = {
      amrap: "conditioning",
      for_time: "conditioning",
      emom: "conditioning",
      strength: "strength",
      custom: "custom",
    };
    const sectionType = typeMapping[w.type] || w.type || "conditioning";

    return {
      id: `workout-${w.id}`,
      type: sectionType as any,
      title: w.title,
      instructions: w.description || "",
      movements: w.movements || [],
      timeCap: "",
      stimulus: "",
      scalingNotes: "",
      coachNotes: "",
      memberNotes: "",
      trackResults: true,
    };
  });

  return {
    date: first.workoutDate,
    title: workouts.length === 1 ? first.title : `${first.workoutDate} Programming`,
    status: "published",
    sections,
    resultCount: workouts.reduce((sum, w) => sum + w.resultCount, 0),
    workoutIds: workouts.map((w) => w.id),
  };
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <Skeleton className="h-10 w-96" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function EmptyOnboarding({ onCreateFirst }: { onCreateFirst: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-20"
    >
      <div className="h-20 w-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <Rocket className="h-10 w-10 text-primary" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">
        Welcome to the Programming Hub
      </h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        This is where you build and publish daily workouts for your athletes.
        Create your first programming day to get started.
      </p>
      <button
        onClick={onCreateFirst}
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20"
      >
        <Plus className="h-5 w-5" />
        Create First Programming Day
      </button>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto mt-12">
        {[
          {
            icon: <CalendarDays className="h-5 w-5" />,
            title: "Day-by-Day",
            desc: "Program each day with multiple sections",
          },
          {
            icon: <Dumbbell className="h-5 w-5" />,
            title: "Section Types",
            desc: "Warm-up, strength, conditioning & more",
          },
          {
            icon: <Activity className="h-5 w-5" />,
            title: "Track Results",
            desc: "Members log scores on published workouts",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="p-4 rounded-xl border border-border bg-card text-center"
          >
            <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center mx-auto mb-2 text-primary">
              {item.icon}
            </div>
            <p className="text-sm font-semibold text-foreground">
              {item.title}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function Workouts() {
  const { activeGymId } = useGym();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isStaff, isLoading: roleLoading } = useUserRole();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editData, setEditData] = useState<ProgrammingDayData | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<string | null>(null);

  const dateStr = toDateString(selectedDate);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [dateStr]);

  const startDate = viewMode === "day" ? dateStr : weekDates[0];
  const endDate = viewMode === "day" ? dateStr : weekDates[6];

  const { data: workouts, isLoading: workoutsLoading } = useListWorkouts(
    activeGymId as number,
    { startDate, endDate },
    { query: { enabled: !!activeGymId } }
  );

  const { user: currentUser } = useAuth();
  const { data: membersList } = useListMembers(
    activeGymId as number,
    undefined,
    { query: { enabled: !!activeGymId && !isStaff } }
  );

  const currentMemberId = useMemo(() => {
    if (!currentUser?.email || !membersList) return null;
    const members = (membersList as any).members || membersList;
    if (!Array.isArray(members)) return null;
    const match = members.find(
      (m: any) => m.email === currentUser.email
    );
    return match?.id ?? null;
  }, [currentUser, membersList]);

  const createWorkoutMutation = useCreateWorkout();
  const logResultMutation = useLogWorkoutResult();

  const workoutsByDate = useMemo(() => {
    const map: Record<string, WorkoutWithSections[]> = {};
    if (!workouts) return map;
    for (const w of workouts as WorkoutWithSections[]) {
      const d = w.workoutDate;
      if (!map[d]) map[d] = [];
      map[d].push(w);
    }
    return map;
  }, [workouts]);

  const handleSave = useCallback(
    async (data: ProgrammingDayData) => {
      if (!activeGymId) return;
      try {
        for (const section of data.sections) {
          await createWorkoutMutation.mutateAsync({
            gymId: activeGymId,
            data: {
              title: section.title,
              description: section.instructions || undefined,
              workoutDate: data.date,
              type: section.type,
              movements:
                section.movements.length > 0 ? section.movements : undefined,
            },
          });
        }
        queryClient.invalidateQueries({
          queryKey: getListWorkoutsQueryKey(activeGymId),
        });
        toast({
          title: data.status === "published" ? "Programming Published" : "Draft Saved",
          description: `${data.title} for ${new Date(data.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} has been saved.`,
        });
        setPanelOpen(false);
        setEditData(null);
      } catch {
        toast({
          title: "Error",
          description: "Failed to save programming. Please try again.",
          variant: "destructive",
        });
      }
    },
    [activeGymId, createWorkoutMutation, queryClient, toast]
  );

  const handleLogResult = useCallback(
    (workoutId: number, result: { result: string; notes: string; isRx: boolean; isPr: boolean }) => {
      if (!activeGymId) return;
      if (!currentMemberId) {
        toast({
          title: "Unable to log result",
          description: "Your member profile could not be found. Please contact your gym.",
          variant: "destructive",
        });
        return;
      }
      logResultMutation.mutate(
        {
          gymId: activeGymId,
          workoutId,
          data: {
            memberId: currentMemberId,
            result: result.result,
            notes: result.notes || undefined,
            isRx: result.isRx,
            isPr: result.isPr,
          },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getListWorkoutsQueryKey(activeGymId),
            });
            toast({
              title: "Result Logged",
              description: "Your result has been recorded.",
            });
          },
          onError: () => {
            toast({
              title: "Error",
              description: "Failed to log result.",
              variant: "destructive",
            });
          },
        }
      );
    },
    [activeGymId, currentMemberId, logResultMutation, queryClient, toast]
  );

  const handleDuplicate = useCallback(
    (sourceDate: string) => {
      const sourceWorkouts = workoutsByDate[sourceDate];
      if (!sourceWorkouts || sourceWorkouts.length === 0) return;

      const dayData = workoutsToDay(sourceWorkouts);
      if (!dayData) return;

      const tomorrow = new Date(selectedDate);
      tomorrow.setDate(tomorrow.getDate() + 1);

      setEditData({
        date: toDateString(tomorrow),
        title: dayData.title + " (Copy)",
        status: "draft",
        sections: dayData.sections.map((s) => ({
          ...s,
          id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        })),
      });
      setPanelOpen(true);
    },
    [workoutsByDate, selectedDate]
  );

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">
          Select a gym to view programming.
        </p>
      </div>
    );
  }

  if (workoutsLoading || roleLoading) {
    return <LoadingSkeleton />;
  }

  if (!isStaff) {
    return (
      <div className="space-y-6 pb-10">
        <header className="flex items-center gap-3 mb-1">
          <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Programming
            </h1>
            <p className="text-sm text-muted-foreground">
              Today's workout and upcoming programming
            </p>
          </div>
        </header>

        <MemberProgrammingView
          workouts={(workouts || []) as WorkoutWithSections[]}
          selectedDate={selectedDate}
          onLogResult={handleLogResult}
          isLoggingResult={logResultMutation.isPending}
        />
      </div>
    );
  }

  const hasAnyWorkouts =
    workouts && (workouts as WorkoutWithSections[]).length > 0;

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              Programming Hub
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Build and publish daily programming for your athletes.
          </p>
        </div>
        <button
          onClick={() => {
            setEditData(null);
            setPanelOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20"
        >
          <Plus className="h-5 w-5" />
          <span>New Day</span>
        </button>
      </header>

      <DateNavigation
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {!hasAnyWorkouts && viewMode === "day" ? (
        <EmptyOnboarding
          onCreateFirst={() => {
            setEditData(null);
            setPanelOpen(true);
          }}
        />
      ) : viewMode === "day" ? (
        <div className="space-y-4">
          {workoutsByDate[dateStr] ? (
            (() => {
              const day = workoutsToDay(workoutsByDate[dateStr]);
              if (!day) return null;
              return (
                <DayCard
                  date={day.date}
                  title={day.title}
                  status={day.status}
                  sections={day.sections}
                  resultCount={day.resultCount}
                  isStaff={isStaff}
                  onEdit={() => {
                    setEditData({
                      date: day.date,
                      title: day.title,
                      status: day.status,
                      sections: day.sections,
                    });
                    setPanelOpen(true);
                  }}
                  onDuplicate={() => handleDuplicate(day.date)}
                  onTogglePublish={() => {
                    toast({
                      title:
                        day.status === "published"
                          ? "Unpublished"
                          : "Published",
                      description: `Programming for ${new Date(day.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} has been ${day.status === "published" ? "unpublished" : "published"}.`,
                    });
                  }}
                />
              );
            })()
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 border border-dashed border-border rounded-2xl"
            >
              <div className="h-12 w-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
                <CalendarDays className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No programming for{" "}
                {new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <button
                onClick={() => {
                  setEditData(null);
                  setPanelOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Programming
              </button>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {weekDates.map((d, i) => {
            const dayWorkouts = workoutsByDate[d];
            if (!dayWorkouts || dayWorkouts.length === 0) {
              return (
                <motion.div
                  key={d}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border border-dashed border-border rounded-2xl p-5 text-center"
                >
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    {new Date(d + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    No programming
                  </p>
                  <button
                    onClick={() => {
                      setSelectedDate(new Date(d + "T00:00:00"));
                      setEditData(null);
                      setPanelOpen(true);
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    + Add
                  </button>
                </motion.div>
              );
            }

            const day = workoutsToDay(dayWorkouts);
            if (!day) return null;

            return (
              <DayCard
                key={d}
                date={day.date}
                title={day.title}
                status={day.status}
                sections={day.sections}
                resultCount={day.resultCount}
                isStaff={isStaff}
                animationDelay={i * 0.05}
                onEdit={() => {
                  setEditData({
                    date: day.date,
                    title: day.title,
                    status: day.status,
                    sections: day.sections,
                  });
                  setPanelOpen(true);
                }}
                onDuplicate={() => handleDuplicate(day.date)}
                onTogglePublish={() => {
                  toast({
                    title:
                      day.status === "published"
                        ? "Unpublished"
                        : "Published",
                    description: `Programming updated.`,
                  });
                }}
              />
            );
          })}
        </div>
      )}

      <CreateProgrammingPanel
        open={panelOpen}
        onClose={() => {
          setPanelOpen(false);
          setEditData(null);
        }}
        onSave={handleSave}
        isSaving={createWorkoutMutation.isPending}
        initialDate={dateStr}
        initialData={editData}
      />
    </div>
  );
}
