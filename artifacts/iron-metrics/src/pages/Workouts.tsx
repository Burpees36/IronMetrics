import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useGym } from "@/store/GymContext";
import {
  useListProgrammingDays,
  useCreateProgrammingDay,
  useUpdateProgrammingDay,
  useDeleteProgrammingDay,
  useToggleProgrammingDayPublish,
  useDuplicateProgrammingDay,
  useAddProgrammingSection,
  useUpdateProgrammingSection,
  useDeleteProgrammingSection,
  useReorderProgrammingSections,
  useLogSectionResult,
  useListMembers,
  useGenerateProgrammingDay,
  useGenerateProgrammingWeek,
  getListProgrammingDaysQueryKey,
  useGetGym,
  useListProgrammingTracks,
  getListProgrammingTracksQueryKey,
} from "@workspace/api-client-react";
import type { ProgrammingDayWithSections, SectionType as ApiSectionType } from "@workspace/api-client-react";
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
  Eye,
  Sparkles,
  Wand2,
  Share2,
  GitBranch,
  ChevronDown,
  Check,
  Users,
  Info,
} from "lucide-react";

import { DateNavigation } from "@/components/programming/DateNavigation";
import { DayCard } from "@/components/programming/DayCard";
import {
  CreateProgrammingPanel,
  ProgrammingDayData,
} from "@/components/programming/CreateProgrammingPanel";
import { MemberProgrammingView } from "@/components/programming/MemberProgrammingView";
import { useUserRole } from "@/components/programming/useUserRole";
import { SectionData, createEmptySection, type SectionType as LocalSectionType } from "@/components/programming/SectionEditor";
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
import { ShareWorkoutDialog } from "@/components/programming/ShareWorkoutDialog";
import { useGymTier } from "@/hooks/useGymTier";

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

function programmingDayToData(day: ProgrammingDayWithSections): ProgrammingDayData {
  const sections: SectionData[] = day.sections.map((s) => {
    const sectionTypeMap: Record<string, LocalSectionType> = {
      warmup: "warmup",
      strength: "strength",
      conditioning: "conditioning",
      skill: "skill",
      cooldown: "cooldown",
      wod: "conditioning",
      accessory: "accessory",
      custom: "custom",
    };
    return {
      id: `section-${s.id}`,
      dbId: s.id,
      type: sectionTypeMap[s.sectionType] ?? ("conditioning" as LocalSectionType),
      title: s.title,
      instructions: s.instructions || "",
      movements: s.movements || [],
      timeCap: s.timeCap || "",
      stimulus: s.intendedStimulus || "",
      scalingNotes: s.scalingNotes || "",
      coachNotes: s.coachNotes || "",
      memberNotes: s.memberNotes || "",
      trackResults: s.resultTrackingEnabled,
    };
  });

  return {
    dayId: day.id,
    date: day.date,
    title: day.title,
    status: (day.status === "archived" ? "draft" : day.status) as "draft" | "published",
    track: day.track || "default",
    sections,
  };
}

function sectionDataToApiBody(section: SectionData, orderIndex: number) {
  const sectionTypeMap: Record<string, ApiSectionType> = {
    warmup: "warmup",
    strength: "strength",
    conditioning: "conditioning",
    skill: "skill",
    cooldown: "cooldown",
    accessory: "accessory",
    custom: "custom",
    notes: "custom",
    mobility: "custom",
  };
  return {
    orderIndex,
    sectionType: sectionTypeMap[section.type] ?? ("conditioning" as const),
    title: section.title,
    instructions: section.instructions || null,
    timeCap: section.timeCap || null,
    intendedStimulus: section.stimulus || null,
    scalingNotes: section.scalingNotes || null,
    coachNotes: section.coachNotes || null,
    memberNotes: section.memberNotes || null,
    resultTrackingEnabled: section.trackResults,
    movements: section.movements.length > 0 ? section.movements : [],
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
      <div className="max-w-lg mx-auto mt-10 p-5 rounded-xl border border-primary/20 bg-primary/5 text-left">
        <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          Draft vs. Published
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Workouts start as <span className="font-medium text-foreground">drafts</span> visible only to staff.
          When you <span className="font-medium text-foreground">publish</span> a workout, it becomes visible to
          all your members so they can view the programming and log their results. You can unpublish at any time
          to hide it again.
        </p>
      </div>
    </motion.div>
  );
}

export function Workouts() {
  const { activeGymId } = useGym();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isStaff, isLoading: roleLoading } = useUserRole();
  const { canAccess } = useGymTier();
  const canUseAiProgramming = canAccess("ai-programming");

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editData, setEditData] = useState<ProgrammingDayData | null>(null);
  const [deleteConfirmDay, setDeleteConfirmDay] = useState<ProgrammingDayWithSections | null>(null);
  const [overwriteConfirm, setOverwriteConfirm] = useState<{ date: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDialogDay, setShareDialogDay] = useState<{ title?: string; date?: string; track?: string; dayId?: number; status?: string } | null>(null);
  const [sharePreviewUrl, setSharePreviewUrl] = useState<string>("");
  const [notifyVersion, setNotifyVersion] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState("default");
  const [trackDropdownOpen, setTrackDropdownOpen] = useState(false);
  const [showNewTrackInline, setShowNewTrackInline] = useState(false);
  const [newTrackInlineName, setNewTrackInlineName] = useState("");
  const [trackOverviewOpen, setTrackOverviewOpen] = useState(false);

  const { data: gym } = useGetGym(activeGymId as number, { query: { enabled: !!activeGymId } });
  const gymSlug = (gym as { slug?: string } | undefined)?.slug;
  const baseWodUrl = gymSlug
    ? `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/wod/${gymSlug}`
    : "";

  const { data: tracksList } = useListProgrammingTracks(
    activeGymId as number,
    { query: { enabled: !!activeGymId && !roleLoading } }
  );
  const availableTracks = useMemo(() => {
    if (!tracksList) return ["default"];
    const tracks = tracksList as string[];
    return tracks.length > 0 ? tracks : ["default"];
  }, [tracksList]);

  const dateStr = toDateString(selectedDate);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [dateStr]);

  const staffStartDate = viewMode === "day" ? dateStr : weekDates[0];
  const staffEndDate = viewMode === "day" ? dateStr : weekDates[6];

  const memberRangeStart = useMemo(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 30);
    return toDateString(d);
  }, [dateStr]);

  const memberRangeEnd = useMemo(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 14);
    return toDateString(d);
  }, [dateStr]);

  const startDate = isStaff ? staffStartDate : memberRangeStart;
  const endDate = isStaff ? staffEndDate : memberRangeEnd;

  const trackParam = isStaff && selectedTrack !== "all" ? selectedTrack : undefined;
  const { data: programmingDays, isLoading: programmingLoading } = useListProgrammingDays(
    activeGymId as number,
    { startDate, endDate, track: trackParam },
    { query: { enabled: !!activeGymId && !roleLoading } }
  );

  const { data: allDaysForCurrentDate } = useListProgrammingDays(
    activeGymId as number,
    { startDate: dateStr, endDate: dateStr },
    { query: { enabled: !!activeGymId && !roleLoading && isStaff } }
  );

  const { user: currentUser } = useAuth();
  const { data: membersList } = useListMembers(
    activeGymId as number,
    undefined,
    { query: { enabled: !!activeGymId && !roleLoading } }
  );

  const allMembers = useMemo(() => {
    if (!membersList) return [];
    const raw = (membersList as { members?: unknown }).members || membersList;
    return Array.isArray(raw) ? (raw as import("@workspace/api-client-react").Member[]) : [];
  }, [membersList]);

  const activeMemberCount = useMemo(() => {
    return allMembers.filter((m) => m.status === "active" && m.email).length;
  }, [allMembers]);

  const getTrackMemberCount = useCallback((track: string | null | undefined): number => {
    if (!track || track === "default") return activeMemberCount;
    const trackTag = `track:${track}`;
    return allMembers.filter((m) => m.status === "active" && m.email && (m.tags as string[] | null)?.includes(trackTag)).length;
  }, [allMembers, activeMemberCount]);

  useEffect(() => {
    if (!shareDialogOpen || !shareDialogDay?.dayId || !activeGymId || !baseWodUrl) return;
    if (shareDialogDay.status === "published") {
      setSharePreviewUrl("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/gyms/${activeGymId}/programming/${shareDialogDay.dayId}/preview-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        if (res.ok && !cancelled) {
          const data = await res.json() as { token: string; dayId: number };
          const params = new URLSearchParams();
          params.set("preview", String(data.dayId));
          params.set("token", data.token);
          if (shareDialogDay.date) params.set("date", shareDialogDay.date);
          setSharePreviewUrl(`${baseWodUrl}?${params.toString()}`);
        } else if (!cancelled) {
          toast({ title: "Preview unavailable", description: "Could not generate preview link.", variant: "destructive" });
        }
      } catch {
        if (!cancelled) {
          toast({ title: "Preview unavailable", description: "Could not generate preview link.", variant: "destructive" });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [shareDialogOpen, shareDialogDay, activeGymId, baseWodUrl, toast]);

  const currentMemberId = useMemo(() => {
    if (!currentUser?.email || allMembers.length === 0) return null;
    const match = allMembers.find((m) => m.email === currentUser.email);
    return match?.id ?? null;
  }, [currentUser, allMembers]);

  const dateHasDefaultTrackDay = useMemo(() => {
    const daysToCheck = allDaysForCurrentDate || programmingDays;
    if (!daysToCheck) return false;
    return (daysToCheck as ProgrammingDayWithSections[]).some(
      (d) => d.date === dateStr && (!d.track || d.track === "default")
    );
  }, [allDaysForCurrentDate, programmingDays, dateStr]);

  const suggestedTrackForNewDay = useMemo(() => {
    if (!dateHasDefaultTrackDay) return undefined;
    const nonDefaultTracks = availableTracks.filter((t) => t !== "default");
    return nonDefaultTracks.length > 0 ? nonDefaultTracks[0] : undefined;
  }, [dateHasDefaultTrackDay, availableTracks]);

  const resolveDayForShare = useCallback((date: string, track: string): { dayId?: number; status?: string } => {
    const days = (programmingDays || []) as ProgrammingDayWithSections[];
    const match = days.find((d) => {
      const dayTrack = d.track || "default";
      return d.date === date && dayTrack === track;
    });
    return match ? { dayId: match.id, status: match.status } : {};
  }, [programmingDays]);

  const createDayMutation = useCreateProgrammingDay();
  const updateDayMutation = useUpdateProgrammingDay();
  const deleteDayMutation = useDeleteProgrammingDay();
  const togglePublishMutation = useToggleProgrammingDayPublish();
  const duplicateDayMutation = useDuplicateProgrammingDay();
  const addSectionMutation = useAddProgrammingSection();
  const updateSectionMutation = useUpdateProgrammingSection();
  const deleteSectionMutation = useDeleteProgrammingSection();
  const reorderSectionsMutation = useReorderProgrammingSections();
  const logSectionResultMutation = useLogSectionResult();
  const generateDayMutation = useGenerateProgrammingDay();
  const generateWeekMutation = useGenerateProgrammingWeek();
  const [isGenerating, setIsGenerating] = useState(false);

  const invalidateProgramming = useCallback(() => {
    if (activeGymId) {
      queryClient.invalidateQueries({
        queryKey: getListProgrammingDaysQueryKey(activeGymId),
      });
      queryClient.invalidateQueries({
        queryKey: getListProgrammingTracksQueryKey(activeGymId),
      });
    }
  }, [activeGymId, queryClient]);

  const handleGenerateDay = useCallback(
    async (targetDate?: string, overwrite?: boolean) => {
      if (!activeGymId) return;
      setIsGenerating(true);
      try {
        await generateDayMutation.mutateAsync({
          gymId: activeGymId,
          data: { date: targetDate || dateStr, overwrite: overwrite ?? false },
        });
        invalidateProgramming();
        toast({
          title: overwrite ? "Day Regenerated" : "Day Generated",
          description: "AI-generated programming has been created as a draft. Review and edit before publishing.",
        });
      } catch (error: unknown) {
        const err = error as { status?: number; data?: { error?: string }; message?: string };
        if (err.status === 409 && !overwrite) {
          setOverwriteConfirm({ date: targetDate || dateStr });
          setIsGenerating(false);
          return;
        }
        toast({
          title: "Generation Failed",
          description: err?.data?.error || err?.message || "Failed to generate programming. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [activeGymId, dateStr, generateDayMutation, invalidateProgramming, toast]
  );

  const handleGenerateWeek = useCallback(
    async () => {
      if (!activeGymId) return;
      setIsGenerating(true);
      try {
        const result = await generateWeekMutation.mutateAsync({
          gymId: activeGymId,
          data: { startDate: weekDates[0] },
        });
        invalidateProgramming();
        const resultData = result as { generated?: number; skipped?: number };
        const generated = resultData?.generated ?? 0;
        const skipped = resultData?.skipped ?? 0;
        if (generated === 0 && skipped > 0) {
          toast({
            title: "No Days Generated",
            description: `All ${skipped} days already have programming. Delete existing days first to regenerate.`,
          });
        } else {
          toast({
            title: "Week Generated",
            description: `${generated} days created${skipped > 0 ? `, ${skipped} days skipped (already exist)` : ""}. Review and edit before publishing.`,
          });
          if (generated > 0 && baseWodUrl) {
            const track = selectedTrack === "all" ? "default" : (selectedTrack || "default");
            const resolved = resolveDayForShare(dateStr, track);
            setShareDialogDay({ date: dateStr, track, ...resolved });
            setShareDialogOpen(true);
          }
        }
      } catch (error: unknown) {
        const err = error as { data?: { error?: string }; message?: string };
        toast({
          title: "Generation Failed",
          description: err?.data?.error || err?.message || "Failed to generate week. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [activeGymId, weekDates, generateWeekMutation, invalidateProgramming, toast, baseWodUrl, selectedTrack, dateStr, resolveDayForShare]
  );

  const daysByDate = useMemo(() => {
    const map: Record<string, ProgrammingDayWithSections[]> = {};
    if (!programmingDays) return map;
    for (const day of programmingDays as ProgrammingDayWithSections[]) {
      if (!map[day.date]) map[day.date] = [];
      map[day.date].push(day);
    }
    return map;
  }, [programmingDays]);

  const handleSave = useCallback(
    async (data: ProgrammingDayData) => {
      if (!activeGymId) return;
      setIsSaving(true);
      try {
        if (data.dayId) {
          const dayId = data.dayId;
          await updateDayMutation.mutateAsync({
            gymId: activeGymId,
            dayId,
            data: {
              date: data.date,
              title: data.title,
              status: data.status,
              track: data.track || null,
            },
          });

          const existingDay = (programmingDays as ProgrammingDayWithSections[] || []).find(d => d.id === dayId);
          const existingSectionIds = new Set(existingDay?.sections.map(s => s.id) || []);

          const incomingDbIds = new Set(
            data.sections
              .filter(s => s.dbId)
              .map(s => s.dbId as number)
          );

          for (const existing of (existingDay?.sections || [])) {
            if (!incomingDbIds.has(existing.id)) {
              await deleteSectionMutation.mutateAsync({
                gymId: activeGymId,
                dayId,
                sectionId: existing.id,
              });
            }
          }

          const sectionDbIds: number[] = [];
          for (let i = 0; i < data.sections.length; i++) {
            const section = data.sections[i];
            if (section.dbId && existingSectionIds.has(section.dbId)) {
              await updateSectionMutation.mutateAsync({
                gymId: activeGymId,
                dayId,
                sectionId: section.dbId,
                data: sectionDataToApiBody(section, i),
              });
              sectionDbIds.push(section.dbId);
            } else {
              const newSection = await addSectionMutation.mutateAsync({
                gymId: activeGymId,
                dayId,
                data: sectionDataToApiBody(section, i),
              });
              sectionDbIds.push(newSection.id);
            }
          }

          if (sectionDbIds.length > 1) {
            await reorderSectionsMutation.mutateAsync({
              gymId: activeGymId,
              dayId,
              data: { sectionIds: sectionDbIds },
            });
          }
        } else {
          await createDayMutation.mutateAsync({
            gymId: activeGymId,
            data: {
              date: data.date,
              title: data.title,
              status: data.status,
              track: data.track || null,
              sections: data.sections.map((s, idx) => sectionDataToApiBody(s, idx)),
            },
          });
        }

        const isNewTrack = data.track && data.track !== "default" && !availableTracks.includes(data.track);
        invalidateProgramming();
        toast({
          title: data.status === "published" ? "Programming Published" : "Draft Saved",
          description: `${data.title} for ${new Date(data.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} has been saved.`,
        });
        if (isNewTrack) {
          setTimeout(() => {
            toast({
              title: `New track "${data.track}" created`,
              description: "Members need to be assigned to this track (via their profile) to see its programming.",
              duration: 8000,
            });
          }, 500);
        }
        setPanelOpen(false);
        setEditData(null);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.data?.error || error?.message || "Failed to save programming. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [activeGymId, programmingDays, availableTracks, createDayMutation, updateDayMutation, deleteSectionMutation, updateSectionMutation, addSectionMutation, reorderSectionsMutation, invalidateProgramming, toast]
  );

  const handleTogglePublish = useCallback(
    async (day: ProgrammingDayWithSections) => {
      if (!activeGymId) return;
      try {
        await togglePublishMutation.mutateAsync({
          gymId: activeGymId,
          dayId: day.id,
        });
        invalidateProgramming();
        const wasPublishing = day.status !== "published";
        toast({
          title: wasPublishing ? "Published" : "Unpublished",
          description: `Programming for ${new Date(day.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} has been ${wasPublishing ? "published" : "unpublished"}.`,
        });
        if (wasPublishing && baseWodUrl) {
          setShareDialogDay({ title: day.title, date: day.date, track: day.track || "default", dayId: day.id, status: "published" });
          setShareDialogOpen(true);
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.data?.error || error?.message || "Failed to update publish status.",
          variant: "destructive",
        });
      }
    },
    [activeGymId, togglePublishMutation, invalidateProgramming, toast, baseWodUrl]
  );

  const handleDelete = useCallback(
    async (day: ProgrammingDayWithSections) => {
      if (!activeGymId) return;
      try {
        await deleteDayMutation.mutateAsync({
          gymId: activeGymId,
          dayId: day.id,
        });
        invalidateProgramming();
        setDeleteConfirmDay(null);
        toast({
          title: "Programming Deleted",
          description: `${day.title} has been removed.`,
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.data?.error || error?.message || "Failed to delete programming.",
          variant: "destructive",
        });
      }
    },
    [activeGymId, deleteDayMutation, invalidateProgramming, toast]
  );

  const handleDuplicate = useCallback(
    async (day: ProgrammingDayWithSections) => {
      if (!activeGymId) return;
      const tomorrow = new Date(selectedDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      try {
        await duplicateDayMutation.mutateAsync({
          gymId: activeGymId,
          dayId: day.id,
          data: { date: toDateString(tomorrow) },
        });
        invalidateProgramming();
        toast({
          title: "Day Duplicated",
          description: `${day.title} has been duplicated to ${tomorrow.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`,
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.data?.error || error?.message || "Failed to duplicate programming.",
          variant: "destructive",
        });
      }
    },
    [activeGymId, duplicateDayMutation, selectedDate, invalidateProgramming, toast]
  );

  const handleLogResult = useCallback(
    (dayId: number, sectionId: number, result: { result: string; notes: string; isRx: boolean; isPr: boolean }, targetMemberId?: number) => {
      if (!activeGymId) return;
      const memberId = targetMemberId ?? currentMemberId;
      if (!memberId) {
        toast({
          title: "Unable to log result",
          description: "No member selected. Please select a member or contact your gym.",
          variant: "destructive",
        });
        return;
      }
      logSectionResultMutation.mutate(
        {
          gymId: activeGymId,
          dayId,
          sectionId,
          data: {
            memberId,
            result: result.result,
            notes: result.notes || undefined,
            isRx: result.isRx,
            isPr: result.isPr,
          },
        },
        {
          onSuccess: () => {
            invalidateProgramming();
            toast({
              title: "Result Logged",
              description: "Your result has been recorded.",
            });
          },
          onError: (error: any) => {
            const errData = error?.data || {};
            if (errData.existing) {
              toast({
                title: "Already Logged",
                description: "You have already submitted a result for this section.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Error",
                description: errData.error || error?.message || "Failed to log result.",
                variant: "destructive",
              });
            }
          },
        }
      );
    },
    [activeGymId, currentMemberId, logSectionResultMutation, invalidateProgramming, toast]
  );

  const handleEditResult = useCallback(
    async (dayId: number, sectionId: number, resultId: number, result: { result: string; notes: string; isRx: boolean; isPr: boolean }) => {
      if (!activeGymId) return;
      try {
        const response = await fetch(`/api/gyms/${activeGymId}/programming/${dayId}/sections/${sectionId}/results/${resultId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(result),
        });
        if (!response.ok) throw new Error("Failed to update result");
        invalidateProgramming();
        toast({ title: "Result Updated", description: "Your result has been updated." });
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Failed to update result.", variant: "destructive" });
      }
    },
    [activeGymId, invalidateProgramming, toast]
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

  if (programmingLoading || roleLoading) {
    return <LoadingSkeleton />;
  }

  if (!isStaff) {
    const allDays = (programmingDays || []) as ProgrammingDayWithSections[];
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
          days={allDays}
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
          onLogResult={handleLogResult}
          onEditResult={handleEditResult}
          currentMemberId={currentMemberId}
          isLoggingResult={logSectionResultMutation.isPending}
          gymId={activeGymId}
          isStaff={false}
          membersList={allMembers}
        />
      </div>
    );
  }

  const hasAnyDays = programmingDays && (programmingDays as ProgrammingDayWithSections[]).length > 0;

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
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <button
              onClick={() => { setTrackDropdownOpen(!trackDropdownOpen); setTrackOverviewOpen(false); }}
              className="flex items-center gap-2 px-3 py-2.5 border border-border bg-background hover:bg-accent rounded-xl font-medium transition-colors text-sm text-foreground"
            >
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{selectedTrack === "all" ? "All Tracks" : selectedTrack}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {trackDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => { setTrackDropdownOpen(false); setShowNewTrackInline(false); setNewTrackInlineName(""); }} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-lg py-1 min-w-[220px]">
                  {availableTracks.length > 1 && (
                    <button
                      onClick={() => { setSelectedTrack("all"); setTrackDropdownOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                    >
                      {selectedTrack === "all" && <Check className="h-3.5 w-3.5 text-primary" />}
                      <span className={selectedTrack !== "all" ? "pl-5.5" : ""}>All Tracks</span>
                    </button>
                  )}
                  {availableTracks.map((t) => (
                    <button
                      key={t}
                      onClick={() => { setSelectedTrack(t); setTrackDropdownOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                    >
                      <span className="flex items-center gap-2">
                        {selectedTrack === t && <Check className="h-3.5 w-3.5 text-primary" />}
                        <span className={selectedTrack !== t ? "pl-5.5 capitalize" : "capitalize"}>{t}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {getTrackMemberCount(t)}
                      </span>
                    </button>
                  ))}
                  <div className="border-t border-border mt-1 pt-1">
                    {!showNewTrackInline ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowNewTrackInline(true); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-accent text-left font-medium"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        New Track
                      </button>
                    ) : (
                      <div className="px-3 py-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={newTrackInlineName}
                          onChange={(e) => setNewTrackInlineName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newTrackInlineName.trim()) {
                              setSelectedTrack(newTrackInlineName.trim());
                              setEditData(null);
                              setPanelOpen(true);
                              setTrackDropdownOpen(false);
                              setShowNewTrackInline(false);
                              setNewTrackInlineName("");
                            }
                            if (e.key === "Escape") {
                              setShowNewTrackInline(false);
                              setNewTrackInlineName("");
                            }
                          }}
                          placeholder="e.g. competitors"
                          className="w-full text-sm px-2 py-1.5 rounded-lg border border-input bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          Type a name and press Enter to create a new programming track.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setTrackOverviewOpen(!trackOverviewOpen); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent text-left"
                    >
                      <Info className="h-3.5 w-3.5" />
                      Track Overview
                    </button>
                    {trackOverviewOpen && (
                      <div className="px-3 pb-2 pt-1 space-y-1.5">
                        {availableTracks.map((t) => (
                          <div key={t} className="flex items-center justify-between text-xs py-1 px-2 bg-muted/40 rounded-lg">
                            <span className="font-medium capitalize text-foreground">{t}</span>
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {getTrackMemberCount(t)} member{getTrackMemberCount(t) !== 1 ? "s" : ""}
                            </span>
                          </div>
                        ))}
                        <p className="text-[11px] text-muted-foreground leading-tight pt-1">
                          Assign members to tracks from their profile page.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          {isGenerating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating...</span>
            </div>
          )}
          {baseWodUrl && (
            <button
              onClick={() => {
                const track = selectedTrack === "all" ? "default" : (selectedTrack || "default");
                const resolved = resolveDayForShare(dateStr, track);
                setShareDialogDay({ date: dateStr, track, ...resolved });
                setShareDialogOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 border border-border bg-background hover:bg-accent rounded-xl font-medium transition-colors text-foreground"
              title="Share programming"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}
          {canUseAiProgramming ? (
            <>
              <button
                onClick={() => handleGenerateDay()}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white hover:bg-violet-700 rounded-xl font-medium transition-colors shadow-lg shadow-violet-600/20 disabled:opacity-50"
              >
                <Wand2 className="h-4 w-4" />
                <span className="hidden sm:inline">Generate Day</span>
              </button>
              <button
                onClick={handleGenerateWeek}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 rounded-xl font-medium transition-colors shadow-lg shadow-purple-600/20 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Generate Week</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => toast({ title: "Upgrade Required", description: "AI workout generation is available on the Growth plan and above." })}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600/50 text-white/70 rounded-xl font-medium transition-colors cursor-not-allowed"
            >
              <Wand2 className="h-4 w-4" />
              <span className="hidden sm:inline">AI Generate</span>
              <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">Growth</span>
            </button>
          )}
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
        </div>
      </header>

      <DateNavigation
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {!hasAnyDays && viewMode === "day" ? (
        <EmptyOnboarding
          onCreateFirst={() => {
            setEditData(null);
            setPanelOpen(true);
          }}
        />
      ) : viewMode === "day" ? (
        <div className="space-y-4">
          {daysByDate[dateStr]?.length ? (
            daysByDate[dateStr].map((day) => {
              const hasTrackableSections = day.sections.some(s => s.resultTrackingEnabled);
              return (
                <div key={day.id} className="space-y-4">
                  <DayCard
                    day={day}
                    isStaff={isStaff}
                    gymId={activeGymId}
                    notifyVersion={notifyVersion}
                    onEdit={() => {
                      setEditData(programmingDayToData(day));
                      setPanelOpen(true);
                    }}
                    onDuplicate={() => handleDuplicate(day)}
                    onTogglePublish={() => handleTogglePublish(day)}
                    onDelete={() => setDeleteConfirmDay(day)}
                    onNotify={() => {
                      setShareDialogDay({ title: day.title, date: day.date, track: day.track || "default", dayId: day.id, status: day.status });
                      setShareDialogOpen(true);
                    }}
                    publicWodUrl={baseWodUrl}
                    onCopyLink={(msg) => toast({ title: "Link Copied", description: msg })}
                  />
                  {hasTrackableSections && (
                    <MemberProgrammingView
                      days={[day]}
                      selectedDate={selectedDate}
                      onSelectedDateChange={setSelectedDate}
                      onLogResult={handleLogResult}
                      onEditResult={handleEditResult}
                      currentMemberId={currentMemberId}
                      isLoggingResult={logSectionResultMutation.isPending}
                      gymId={activeGymId}
                      isStaff={true}
                      membersList={allMembers}
                      showNavigation={false}
                    />
                  )}
                </div>
              );
            })
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
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => handleGenerateDay()}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  AI Generate
                </button>
                <button
                  onClick={() => {
                    setEditData(null);
                    setPanelOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create Manually
                </button>
              </div>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {weekDates.map((d, i) => {
            const daysForDate = daysByDate[d];
            if (!daysForDate?.length) {
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

            return (
              <div key={d} className="space-y-4">
                {daysForDate.map((day) => (
                  <DayCard
                    key={day.id}
                    day={day}
                    isStaff={isStaff}
                    gymId={activeGymId}
                    notifyVersion={notifyVersion}
                    animationDelay={i * 0.05}
                    onEdit={() => {
                      setEditData(programmingDayToData(day));
                      setPanelOpen(true);
                    }}
                    onDuplicate={() => handleDuplicate(day)}
                    onTogglePublish={() => handleTogglePublish(day)}
                    onDelete={() => setDeleteConfirmDay(day)}
                    onNotify={() => {
                      setShareDialogDay({ title: day.title, date: day.date, track: day.track || "default", dayId: day.id, status: day.status });
                      setShareDialogOpen(true);
                    }}
                    publicWodUrl={baseWodUrl}
                    onCopyLink={(msg) => toast({ title: "Link Copied", description: msg })}
                  />
                ))}
              </div>
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
        isSaving={isSaving}
        initialDate={dateStr}
        initialData={editData}
        availableTracks={availableTracks}
        defaultTrack={selectedTrack !== "all" ? selectedTrack : "default"}
        suggestAlternateTrack={!editData ? suggestedTrackForNewDay : undefined}
        dateHasDefaultTrackDay={dateHasDefaultTrackDay}
      />

      <AlertDialog
        open={!!deleteConfirmDay}
        onOpenChange={(open) => !open && setDeleteConfirmDay(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Programming Day?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive <strong>{deleteConfirmDay?.title}</strong> and remove it from the member view. This action cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmDay && handleDelete(deleteConfirmDay)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDayMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!overwriteConfirm}
        onOpenChange={(open) => !open && setOverwriteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Existing Programming?</AlertDialogTitle>
            <AlertDialogDescription>
              Programming already exists for this date. Do you want to replace it with a new AI-generated workout?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (overwriteConfirm) {
                  handleGenerateDay(overwriteConfirm.date, true);
                  setOverwriteConfirm(null);
                }
              }}
            >
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {baseWodUrl && activeGymId && (
        <ShareWorkoutDialog
          open={shareDialogOpen}
          onOpenChange={(open) => {
            setShareDialogOpen(open);
            if (!open) setSharePreviewUrl("");
          }}
          publicUrl={(() => {
            const isDraftDay = shareDialogDay?.status !== "published" && !!shareDialogDay?.dayId;
            if (isDraftDay) return sharePreviewUrl;
            const params = new URLSearchParams();
            if (shareDialogDay?.date) params.set("date", shareDialogDay.date);
            if (shareDialogDay?.track && shareDialogDay.track !== "default") params.set("track", shareDialogDay.track);
            const qs = params.toString();
            return qs ? `${baseWodUrl}?${qs}` : baseWodUrl;
          })()}
          gymId={activeGymId}
          activeMemberCount={activeMemberCount}
          dayTitle={shareDialogDay?.title}
          dayDate={shareDialogDay?.date}
          dayTrack={shareDialogDay?.track}
          isDraft={shareDialogDay?.status !== "published" && !!shareDialogDay?.dayId}
          trackMemberCount={shareDialogDay?.track ? getTrackMemberCount(shareDialogDay.track) : undefined}
          onNotifySuccess={(count) => { setNotifyVersion((v) => v + 1); toast({ title: "Notifications sent", description: `${count} member${count !== 1 ? "s" : ""} notified.` }); }}
          onNotifyError={(error) => toast({ title: "Notification failed", description: error, variant: "destructive" })}
        />
      )}
    </div>
  );
}
