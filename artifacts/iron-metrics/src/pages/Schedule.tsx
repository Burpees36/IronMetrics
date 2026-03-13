import React, { useState, useMemo, useRef, useEffect } from "react";
import { useGym } from "@/store/GymContext";
import { useListClasses, useCreateClass, useGetClass, useDeleteClass, useCheckInToClass, useUpdateClass, useListMembers, useListStaff, getListClassesQueryKey, getGetClassQueryKey, usePreviewCopyWeek, useCopyWeek, useListClassTemplates, useCreateClassTemplate, useGetClassTemplate, useDeleteClassTemplate, useUpdateClassTemplate, usePreviewApplyTemplate, useApplyClassTemplate, getListClassTemplatesQueryKey } from "@workspace/api-client-react";
import type { StaffMember, CreateClassBodyType, Member, ClassTemplate, CopyWeekPreviewItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday, endOfWeek, getHours, getMinutes } from "date-fns";
import { motion } from "framer-motion";
import { Loader2, Plus, Clock, Users, Trash2, Search, UserCheck, X, ChevronLeft, ChevronRight, Copy, FileText, MoreHorizontal, Save, Play, Pencil, AlertTriangle, CalendarPlus, LayoutTemplate, CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const CLASS_TYPE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  regular: { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-300", dot: "bg-blue-400" },
  personal_training: { bg: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-300", dot: "bg-violet-400" },
  intro: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-300", dot: "bg-emerald-400" },
  specialty: { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-300", dot: "bg-amber-400" },
  open_gym: { bg: "bg-cyan-500/15", border: "border-cyan-500/30", text: "text-cyan-300", dot: "bg-cyan-400" },
};

function getClassColors(type: string) {
  return CLASS_TYPE_COLORS[type] || CLASS_TYPE_COLORS.regular;
}

const HOUR_HEIGHT = 64;
const CALENDAR_START_HOUR = 5;
const CALENDAR_END_HOUR = 22;

export function Schedule() {
  const { activeGymId } = useGym();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const calendarRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [weekOffset, setWeekOffset] = useState(0);
  const currentWeekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return weekOffset === 0 ? base : addWeeks(base, weekOffset);
  }, [weekOffset]);
  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i)), [currentWeekStart]);

  const weekEnd = useMemo(() => endOfWeek(currentWeekStart, { weekStartsOn: 1 }), [currentWeekStart]);
  const classParams = useMemo(() => ({
    startDate: currentWeekStart.toISOString(),
    endDate: weekEnd.toISOString(),
  }), [currentWeekStart, weekEnd]);

  const { data: classes, isLoading } = useListClasses(activeGymId as number, classParams, {
    query: { enabled: !!activeGymId }
  });

  const { data: staffList } = useListStaff(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });
  const activeStaff = useMemo(() => (staffList || []).filter((s) => s.isActive), [staffList]);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailClassId, setDetailClassId] = useState<number | null>(null);
  const [deleteClassId, setDeleteClassId] = useState<number | null>(null);
  const [checkinClassId, setCheckinClassId] = useState<number | null>(null);
  const [memberSearch, setMemberSearch] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    date: "",
    startHour: "9",
    startMinute: "00",
    startAmPm: "AM",
    endHour: "10",
    endMinute: "00",
    endAmPm: "AM",
    capacity: "",
    coachId: "none",
    description: "",
    type: "regular" as string,
    repeatDays: [] as number[],
  });

  const createClassMutation = useCreateClass();
  const deleteClassMutation = useDeleteClass();
  const checkInMutation = useCheckInToClass();
  const updateClassMutation = useUpdateClass();

  const [copyWeekOpen, setCopyWeekOpen] = useState(false);
  const [copyWeekPreviewData, setCopyWeekPreviewData] = useState<{ toCreate: CopyWeekPreviewItem[]; toSkip: CopyWeekPreviewItem[]; warnings: string[] } | null>(null);

  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [applyTemplateId, setApplyTemplateId] = useState<number | null>(null);
  const [applyTemplatePreviewData, setApplyTemplatePreviewData] = useState<{ toCreate: CopyWeekPreviewItem[]; toSkip: CopyWeekPreviewItem[]; warnings: string[] } | null>(null);
  const [renameTemplateId, setRenameTemplateId] = useState<number | null>(null);
  const [renameTemplateName, setRenameTemplateName] = useState("");
  const [deleteTemplateId, setDeleteTemplateId] = useState<number | null>(null);
  const [viewTemplateId, setViewTemplateId] = useState<number | null>(null);

  const { data: templates } = useListClassTemplates(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  const { data: viewTemplateDetail } = useGetClassTemplate(activeGymId as number, viewTemplateId as number, {
    query: { enabled: !!activeGymId && !!viewTemplateId }
  });

  const previewCopyWeekMutation = usePreviewCopyWeek();
  const copyWeekMutation = useCopyWeek();
  const createTemplateMutation = useCreateClassTemplate();
  const deleteTemplateMutation = useDeleteClassTemplate();
  const updateTemplateMutation = useUpdateClassTemplate();
  const previewApplyMutation = usePreviewApplyTemplate();
  const applyTemplateMutation = useApplyClassTemplate();

  const previousWeekStart = useMemo(() => subWeeks(currentWeekStart, 1), [currentWeekStart]);

  const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const hasClassesThisWeek = (classes && classes.length > 0) || false;

  const { data: classDetail, isLoading: detailLoading } = useGetClass(
    activeGymId as number,
    detailClassId as number,
    { query: { enabled: !!activeGymId && !!detailClassId } }
  );

  const { data: membersData } = useListMembers(
    activeGymId as number,
    { search: memberSearch || undefined, limit: 20 },
    { query: { enabled: !!activeGymId && !!checkinClassId } }
  );
  const members: Member[] = membersData?.members ?? [];

  const classesByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    if (!classes) return map;
    for (const cls of classes) {
      const clsDate = new Date(cls.startTime);
      for (let i = 0; i < 7; i++) {
        if (isSameDay(clsDate, days[i])) {
          map[i].push(cls);
          break;
        }
      }
    }
    for (let i = 0; i < 7; i++) {
      map[i].sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }
    return map;
  }, [classes, days]);

  const [nowMinutes, setNowMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollTo = Math.max(0, (7 - CALENDAR_START_HOUR) * HOUR_HEIGHT - 40);
      scrollContainerRef.current.scrollTop = scrollTo;
    }
  }, []);

  const todayDayIndex = days.findIndex((d) => isToday(d));
  const showNowLine = weekOffset === 0 && todayDayIndex >= 0;
  const nowLineTop = ((nowMinutes / 60) - CALENDAR_START_HOUR) * HOUR_HEIGHT;

  const usedTypes = useMemo(() => {
    if (!classes || classes.length === 0) return [];
    const types = new Set(classes.map((c: any) => c.type || "regular"));
    return Array.from(types) as string[];
  }, [classes]);

  function resetForm() {
    setFormData({ name: "", date: "", startHour: "9", startMinute: "00", startAmPm: "AM", endHour: "10", endMinute: "00", endAmPm: "AM", capacity: "", coachId: "none", description: "", type: "regular", repeatDays: [] });
  }

  function openCreateForDay(dayIndex: number) {
    resetForm();
    setFormData(p => ({ ...p, date: format(days[dayIndex], 'yyyy-MM-dd') }));
    setCreateOpen(true);
  }

  function openCreateDialog() {
    resetForm();
    const todayIdx = days.findIndex((d) => isToday(d));
    setFormData(p => ({ ...p, date: format(days[todayIdx >= 0 ? todayIdx : 0], 'yyyy-MM-dd') }));
    setCreateOpen(true);
  }

  function to24Hour(hour: string, amPm: string): number {
    let h = parseInt(hour, 10);
    if (amPm === "AM" && h === 12) h = 0;
    if (amPm === "PM" && h !== 12) h += 12;
    return h;
  }

  function getDateForCalendarDay(calendarDayIndex: number): string {
    return format(days[calendarDayIndex], "yyyy-MM-dd");
  }

  function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    if (!activeGymId) return;
    const startH = to24Hour(formData.startHour, formData.startAmPm);
    const endH = to24Hour(formData.endHour, formData.endAmPm);
    const startDate = new Date(`${formData.date}T${String(startH).padStart(2, '0')}:${formData.startMinute}:00`);
    const endDate = new Date(`${formData.date}T${String(endH).padStart(2, '0')}:${formData.endMinute}:00`);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      toast({ title: "Invalid Date/Time", description: "Please check your date and time selections." });
      return;
    }
    if (endDate <= startDate) {
      toast({ title: "Invalid Time Range", description: "End time must be after start time." });
      return;
    }
    const datesToCreate: string[] = [formData.date];
    if (formData.repeatDays.length > 0) {
      for (const calDayIdx of formData.repeatDays) {
        const dateStr = getDateForCalendarDay(calDayIdx);
        if (dateStr !== formData.date && !datesToCreate.includes(dateStr)) {
          datesToCreate.push(dateStr);
        }
      }
    }
    let created = 0;
    let failed = 0;
    const total = datesToCreate.length;
    for (const dateStr of datesToCreate) {
      const dayStart = new Date(`${dateStr}T${String(startH).padStart(2, '0')}:${formData.startMinute}:00`);
      const dayEnd = new Date(`${dateStr}T${String(endH).padStart(2, '0')}:${formData.endMinute}:00`);
      createClassMutation.mutate(
        {
          gymId: activeGymId,
          data: {
            name: formData.name,
            startTime: dayStart.toISOString(),
            endTime: dayEnd.toISOString(),
            capacity: parseInt(formData.capacity, 10),
            type: formData.type as CreateClassBodyType,
            description: formData.description || null,
            coachId: formData.coachId && formData.coachId !== "none" ? parseInt(formData.coachId, 10) : null,
          },
        },
        {
          onSuccess: () => {
            created++;
            if (created + failed === total) {
              queryClient.invalidateQueries({ queryKey: getListClassesQueryKey(activeGymId!) });
              setCreateOpen(false);
              resetForm();
              toast({ title: total === 1 ? "Class Created" : "Classes Created", description: `${formData.name} scheduled for ${created} day${created > 1 ? "s" : ""}.` });
            }
          },
          onError: (error: any) => {
            failed++;
            if (created + failed === total) {
              queryClient.invalidateQueries({ queryKey: getListClassesQueryKey(activeGymId!) });
              if (created > 0) {
                setCreateOpen(false);
                resetForm();
                toast({ title: "Partially Created", description: `${created} of ${total} classes created.` });
              } else {
                toast({ title: "Error", description: error?.data?.error || "Failed to create class." });
              }
            }
          },
        }
      );
    }
  }

  function handleDeleteClass() {
    if (!activeGymId || !deleteClassId) return;
    deleteClassMutation.mutate(
      { gymId: activeGymId, classId: deleteClassId },
      {
        onSuccess: () => {
          toast({ title: "Class Deleted", description: "The class has been removed." });
          queryClient.invalidateQueries({ queryKey: getListClassesQueryKey(activeGymId) });
          setDeleteClassId(null);
          if (detailClassId === deleteClassId) setDetailClassId(null);
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || "Failed to delete class." });
        },
      }
    );
  }

  function handleCheckIn(memberId: number) {
    if (!activeGymId || !checkinClassId) return;
    checkInMutation.mutate(
      { gymId: activeGymId, classId: checkinClassId, data: { memberId, status: "present" } },
      {
        onSuccess: () => {
          toast({ title: "Checked In", description: "Member has been checked in." });
          queryClient.invalidateQueries({ queryKey: getListClassesQueryKey(activeGymId) });
          if (detailClassId) queryClient.invalidateQueries({ queryKey: getGetClassQueryKey(activeGymId, detailClassId) });
          setCheckinClassId(null);
          setMemberSearch("");
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || "Failed to check in member." });
        },
      }
    );
  }

  function handleAssignCoach(coachId: string) {
    if (!activeGymId || !detailClassId) return;
    updateClassMutation.mutate(
      { gymId: activeGymId, classId: detailClassId, data: { coachId: coachId === "none" ? null : parseInt(coachId, 10) } },
      {
        onSuccess: () => {
          toast({ title: "Coach Updated", description: "Coach assignment has been updated." });
          queryClient.invalidateQueries({ queryKey: getListClassesQueryKey(activeGymId) });
          queryClient.invalidateQueries({ queryKey: getGetClassQueryKey(activeGymId, detailClassId) });
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || "Failed to update coach." });
        },
      }
    );
  }

  function handlePrevWeek() { setWeekOffset(w => w - 1); }
  function handleNextWeek() { setWeekOffset(w => w + 1); }
  function goToday() { setWeekOffset(0); }

  function handleCopyWeekPreview() {
    if (!activeGymId) return;
    previewCopyWeekMutation.mutate(
      { gymId: activeGymId, data: { sourceWeek: previousWeekStart.toISOString().split("T")[0], targetWeek: currentWeekStart.toISOString().split("T")[0] } },
      {
        onSuccess: (data) => { setCopyWeekPreviewData(data as any); },
        onError: (error: any) => { toast({ title: "Error", description: error?.data?.error || "Failed to preview copy." }); },
      }
    );
    setCopyWeekOpen(true);
  }

  function handleCopyWeekConfirm() {
    if (!activeGymId) return;
    copyWeekMutation.mutate(
      { gymId: activeGymId, data: { sourceWeek: previousWeekStart.toISOString().split("T")[0], targetWeek: currentWeekStart.toISOString().split("T")[0] } },
      {
        onSuccess: (data: any) => {
          queryClient.invalidateQueries({ queryKey: getListClassesQueryKey(activeGymId) });
          setCopyWeekOpen(false);
          setCopyWeekPreviewData(null);
          toast({ title: "Week Copied", description: data.message });
        },
        onError: (error: any) => { toast({ title: "Error", description: error?.data?.error || "Failed to copy week." }); },
      }
    );
  }

  function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!activeGymId || !templateName.trim()) return;
    createTemplateMutation.mutate(
      { gymId: activeGymId, data: { name: templateName.trim(), sourceWeek: currentWeekStart.toISOString().split("T")[0] } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClassTemplatesQueryKey(activeGymId) });
          setSaveTemplateOpen(false);
          setTemplateName("");
          toast({ title: "Template Saved", description: `"${templateName.trim()}" has been saved.` });
        },
        onError: (error: any) => { toast({ title: "Error", description: error?.data?.error || "Failed to save template." }); },
      }
    );
  }

  function handleApplyTemplatePreview(templateId: number) {
    if (!activeGymId) return;
    setApplyTemplateId(templateId);
    previewApplyMutation.mutate(
      { gymId: activeGymId, templateId, data: { targetWeek: currentWeekStart.toISOString().split("T")[0] } },
      {
        onSuccess: (data) => { setApplyTemplatePreviewData(data as any); },
        onError: (error: any) => { toast({ title: "Error", description: error?.data?.error || "Failed to preview." }); },
      }
    );
  }

  function handleApplyTemplateConfirm() {
    if (!activeGymId || !applyTemplateId) return;
    applyTemplateMutation.mutate(
      { gymId: activeGymId, templateId: applyTemplateId, data: { targetWeek: currentWeekStart.toISOString().split("T")[0] } },
      {
        onSuccess: (data: any) => {
          queryClient.invalidateQueries({ queryKey: getListClassesQueryKey(activeGymId) });
          setApplyTemplateId(null);
          setApplyTemplatePreviewData(null);
          setTemplateManagerOpen(false);
          toast({ title: "Template Applied", description: data.message });
        },
        onError: (error: any) => { toast({ title: "Error", description: error?.data?.error || "Failed to apply template." }); },
      }
    );
  }

  function handleRenameTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!activeGymId || !renameTemplateId || !renameTemplateName.trim()) return;
    updateTemplateMutation.mutate(
      { gymId: activeGymId, templateId: renameTemplateId, data: { name: renameTemplateName.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClassTemplatesQueryKey(activeGymId) });
          setRenameTemplateId(null);
          setRenameTemplateName("");
          toast({ title: "Renamed", description: "Template has been renamed." });
        },
        onError: (error: any) => { toast({ title: "Error", description: error?.data?.error || "Failed to rename." }); },
      }
    );
  }

  function handleDeleteTemplate() {
    if (!activeGymId || !deleteTemplateId) return;
    deleteTemplateMutation.mutate(
      { gymId: activeGymId, templateId: deleteTemplateId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClassTemplatesQueryKey(activeGymId) });
          setDeleteTemplateId(null);
          toast({ title: "Deleted", description: "Template has been deleted." });
        },
        onError: (error: any) => { toast({ title: "Error", description: error?.data?.error || "Failed to delete." }); },
      }
    );
  }

  const totalHours = CALENDAR_END_HOUR - CALENDAR_START_HOUR;
  const calendarHeight = totalHours * HOUR_HEIGHT;
  const hours = Array.from({ length: totalHours }, (_, i) => CALENDAR_START_HOUR + i);

  const typeLabels: Record<string, string> = {
    regular: "Regular",
    personal_training: "Personal Training",
    intro: "Intro",
    specialty: "Specialty",
    open_gym: "Open Gym",
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Schedule</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Weekly calendar view</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center gap-2 px-3 py-2.5 border border-border hover:bg-secondary text-foreground rounded-xl font-medium transition-colors min-h-[44px]">
                <MoreHorizontal className="h-5 w-5" />
                <span className="hidden sm:inline">Actions</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleCopyWeekPreview}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Last Week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSaveTemplateOpen(true)} disabled={!hasClassesThisWeek}>
                <Save className="h-4 w-4 mr-2" />
                Save Week as Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTemplateManagerOpen(true)}>
                <LayoutTemplate className="h-4 w-4 mr-2" />
                Manage Templates
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={openCreateDialog}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 min-h-[44px] flex-1 sm:flex-initial"
          >
            <Plus className="h-5 w-5" />
            <span>New Class</span>
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={handlePrevWeek} className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors" aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors text-xs font-medium text-muted-foreground hover:text-foreground">
            Today
          </button>
          <button onClick={handleNextWeek} className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors" aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="text-sm md:text-base font-semibold text-foreground ml-2">
            {format(currentWeekStart, 'MMM d')} — {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
          </h2>
        </div>

        {usedTypes.length > 0 && (
          <div className="hidden md:flex items-center gap-3">
            {usedTypes.map((type) => {
              const colors = getClassColors(type);
              return (
                <div key={type} className="flex items-center gap-1.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
                  <span className="text-xs text-muted-foreground">{typeLabels[type] || type}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="grid shrink-0 border-b border-border" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
          <div className="border-r border-border" />
          {days.map((day, i) => {
            const today = isToday(day);
            return (
              <div
                key={i}
                className={`py-2.5 px-1 text-center border-r border-border last:border-r-0 transition-colors ${today ? "bg-primary/5" : ""}`}
              >
                <div className={`text-[10px] font-semibold uppercase tracking-wide ${today ? "text-primary" : "text-muted-foreground"}`}>
                  {format(day, 'EEE')}
                </div>
                <div className={`text-lg font-bold leading-tight ${today ? "text-primary" : "text-foreground"}`}>
                  {format(day, 'd')}
                </div>
                {today && <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-0.5" />}
              </div>
            );
          })}
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : (
            <div ref={calendarRef} className="relative" style={{ height: calendarHeight, minHeight: calendarHeight }}>
              <div className="absolute inset-0 grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
                <div className="relative border-r border-border">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground/70 font-medium tabular-nums select-none"
                      style={{ top: (hour - CALENDAR_START_HOUR) * HOUR_HEIGHT }}
                    >
                      {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                    </div>
                  ))}
                </div>

                {days.map((day, dayIndex) => {
                  const today = isToday(day);
                  const dayClasses = classesByDay[dayIndex] || [];

                  return (
                    <div
                      key={dayIndex}
                      className={`relative border-r border-border last:border-r-0 ${today ? "bg-primary/[0.02]" : ""}`}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('.calendar-class-block')) return;
                        openCreateForDay(dayIndex);
                      }}
                    >
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="absolute left-0 right-0 border-t border-border/30"
                          style={{ top: (hour - CALENDAR_START_HOUR) * HOUR_HEIGHT }}
                        />
                      ))}

                      {(() => {
                        const items = dayClasses.map((cls: any) => {
                          const start = new Date(cls.startTime);
                          const end = new Date(cls.endTime);
                          const startMin = getHours(start) * 60 + getMinutes(start);
                          const endMin = getHours(end) * 60 + getMinutes(end);
                          return { cls, start, end, startMin, endMin };
                        });

                        const overlapDepth: number[] = new Array(items.length).fill(0);
                        for (let i = 0; i < items.length; i++) {
                          let maxPriorDepth = -1;
                          for (let j = 0; j < i; j++) {
                            if (items[j].endMin > items[i].startMin && items[j].startMin < items[i].endMin) {
                              maxPriorDepth = Math.max(maxPriorDepth, overlapDepth[j]);
                            }
                          }
                          overlapDepth[i] = maxPriorDepth + 1;
                        }

                        const INDENT = 16;
                        const PAD = 3;

                        return items.map(({ cls, start, end, startMin, endMin }, i) => {
                          const topPx = ((startMin / 60) - CALENDAR_START_HOUR) * HOUR_HEIGHT;
                          const heightPx = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 32);
                          const colors = getClassColors(cls.type || "regular");
                          const depth = overlapDepth[i];
                          const isTiny = heightPx < 44;

                          const style: React.CSSProperties = {
                            top: topPx + 1,
                            height: heightPx - 2,
                            left: PAD + depth * INDENT,
                            right: PAD,
                            zIndex: 10 + depth,
                          };

                          const timeStr = `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`;
                          const fullTitle = `${cls.name}\n${timeStr}${cls.coachName ? `\n${cls.coachName}` : ''}\n${cls.enrolled}/${cls.capacity}`;

                          return (
                            <div
                              key={cls.id}
                              title={fullTitle}
                              className={`calendar-class-block absolute rounded-lg border cursor-pointer transition-all hover:brightness-125 hover:!z-30 hover:shadow-xl ${colors.bg} ${colors.border} ${depth > 0 ? 'shadow-md' : ''}`}
                              style={style}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailClassId(cls.id);
                              }}
                            >
                              <div className={`px-2 ${isTiny ? 'py-0.5' : 'py-1'} overflow-hidden h-full flex flex-col ${isTiny ? 'justify-center' : 'justify-start'}`}>
                                <div className={`font-semibold truncate leading-tight ${colors.text} ${isTiny ? 'text-[10px]' : 'text-xs'}`}>
                                  {cls.name}
                                </div>
                                {!isTiny && (
                                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                                    {timeStr}
                                  </div>
                                )}
                                {heightPx >= 64 && (
                                  <div className="flex items-center gap-2 mt-1">
                                    {cls.coachName && (
                                      <span className="text-[10px] text-muted-foreground/80 truncate">{cls.coachName}</span>
                                    )}
                                    <span className="text-[10px] text-muted-foreground/60 ml-auto shrink-0">
                                      {cls.enrolled}/{cls.capacity}
                                    </span>
                                  </div>
                                )}
                                {!isTiny && heightPx < 64 && (
                                  <span className="text-[10px] text-muted-foreground/60 mt-0.5">
                                    {cls.enrolled}/{cls.capacity}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  );
                })}
              </div>

              {showNowLine && nowLineTop > 0 && nowLineTop < calendarHeight && (
                <div
                  className="absolute pointer-events-none z-30"
                  style={{ top: nowLineTop, left: 56, right: 0 }}
                >
                  <div className="relative flex items-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                    <div className="flex-1 h-[2px] bg-red-500/60" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* === ALL DIALOGS (unchanged) === */}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
            <DialogDescription>Schedule a new class for your gym.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateClass} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class-name">Name *</Label>
              <Input id="class-name" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-type">Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="personal_training">Personal Training</SelectItem>
                  <SelectItem value="intro">Intro</SelectItem>
                  <SelectItem value="specialty">Specialty</SelectItem>
                  <SelectItem value="open_gym">Open Gym</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-date">Date *</Label>
              <Input id="class-date" type="date" value={formData.date} onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Repeat on Days</Label>
              <div className="flex items-center gap-1.5">
                {[{ label: "M", day: 0 }, { label: "T", day: 1 }, { label: "W", day: 2 }, { label: "T", day: 3 }, { label: "F", day: 4 }, { label: "S", day: 5 }, { label: "S", day: 6 }].map(({ label, day }) => {
                  const selected = formData.repeatDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, repeatDays: selected ? p.repeatDays.filter(d => d !== day) : [...p.repeatDays, day] }))}
                      className={`h-9 w-9 rounded-lg text-xs font-semibold transition-all ${selected ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/30 text-muted-foreground border border-border hover:bg-muted/50"}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {formData.repeatDays.length > 0
                  ? `Class will be created for the selected date plus ${formData.repeatDays.length} additional day${formData.repeatDays.length > 1 ? "s" : ""} in the same week.`
                  : "Select days to repeat this class across the week."}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <div className="flex items-center gap-2">
                <Select value={formData.startHour} onValueChange={(v) => setFormData(p => ({ ...p, startHour: v }))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(h => <SelectItem key={h} value={String(h)}>{h}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-muted-foreground font-bold">:</span>
                <Select value={formData.startMinute} onValueChange={(v) => setFormData(p => ({ ...p, startMinute: v }))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{["00", "15", "30", "45"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={formData.startAmPm} onValueChange={(v) => setFormData(p => ({ ...p, startAmPm: v }))}>
                  <SelectTrigger className="w-[72px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>End Time *</Label>
              <div className="flex items-center gap-2">
                <Select value={formData.endHour} onValueChange={(v) => setFormData(p => ({ ...p, endHour: v }))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(h => <SelectItem key={h} value={String(h)}>{h}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-muted-foreground font-bold">:</span>
                <Select value={formData.endMinute} onValueChange={(v) => setFormData(p => ({ ...p, endMinute: v }))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{["00", "15", "30", "45"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={formData.endAmPm} onValueChange={(v) => setFormData(p => ({ ...p, endAmPm: v }))}>
                  <SelectTrigger className="w-[72px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity *</Label>
                <Input id="capacity" type="number" min="1" value={formData.capacity} onChange={(e) => setFormData(p => ({ ...p, capacity: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coach-select">Coach</Label>
                <Select value={formData.coachId} onValueChange={(v) => setFormData(p => ({ ...p, coachId: v }))}>
                  <SelectTrigger id="coach-select"><SelectValue placeholder="Select coach" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Coach</SelectItem>
                    {activeStaff.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-desc">Description</Label>
              <Input id="class-desc" value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button type="submit" disabled={createClassMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {createClassMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Class"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={!!detailClassId} onOpenChange={(open) => { if (!open) setDetailClassId(null); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{classDetail?.name || "Class Details"}</SheetTitle>
            <SheetDescription>View class information and roster.</SheetDescription>
          </SheetHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>
          ) : classDetail ? (
            <div className="mt-6 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{classDetail.type}</Badge>
                  <Badge variant={classDetail.status === "scheduled" ? "default" : "secondary"}>{classDetail.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Start</span>
                    <p className="font-medium">{format(new Date(classDetail.startTime), 'MMM d, h:mm a')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">End</span>
                    <p className="font-medium">{format(new Date(classDetail.endTime), 'MMM d, h:mm a')}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Coach</span>
                    <div className="mt-1">
                      <Select value={classDetail.coachId ? String(classDetail.coachId) : "none"} onValueChange={handleAssignCoach} disabled={updateClassMutation.isPending}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Assign Coach" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Coach</SelectItem>
                          {activeStaff.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Capacity</span>
                    <p className="font-medium">{classDetail.enrolled} / {classDetail.capacity}</p>
                  </div>
                </div>
                {classDetail.description && <p className="text-sm text-muted-foreground">{classDetail.description}</p>}
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">Roster</h3>
                  <button onClick={() => setCheckinClassId(classDetail.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                    <UserCheck className="h-3.5 w-3.5" /> Check In
                  </button>
                </div>
                {classDetail.roster?.length ? (
                  <div className="space-y-2">
                    {classDetail.roster.map((att) => (
                      <div key={att.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                        <span className="text-sm font-medium">{att.memberName}</span>
                        <Badge variant={att.status === "present" ? "default" : "secondary"} className="text-xs">{att.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">No members checked in yet.</p>
                )}
              </div>
              <div className="pt-2 border-t border-border">
                <button onClick={() => setDeleteClassId(classDetail.id)} className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg text-sm font-medium transition-colors w-full justify-center">
                  <Trash2 className="h-4 w-4" /> Delete Class
                </button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteClassId} onOpenChange={(open) => { if (!open) setDeleteClassId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this class? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClass} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteClassMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!checkinClassId} onOpenChange={(open) => { if (!open) { setCheckinClassId(null); setMemberSearch(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Check In Member</DialogTitle>
            <DialogDescription>Search and select a member to check in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search members..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {members.length ? members.map((member) => (
                <button key={member.id} onClick={() => handleCheckIn(member.id)} disabled={checkInMutation.isPending} className="flex items-center justify-between w-full p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-white/5 transition-all text-left">
                  <div>
                    <p className="text-sm font-medium">{member.firstName} {member.lastName}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </button>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-6">{memberSearch ? "No members found." : "Type to search members."}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={copyWeekOpen} onOpenChange={(open) => { if (!open) { setCopyWeekOpen(false); setCopyWeekPreviewData(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Copy Last Week</DialogTitle>
            <DialogDescription>Copy classes from the week of {format(previousWeekStart, 'MMM d')} to the week of {format(currentWeekStart, 'MMM d, yyyy')}.</DialogDescription>
          </DialogHeader>
          {previewCopyWeekMutation.isPending ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>
          ) : copyWeekPreviewData ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {copyWeekPreviewData.warnings.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 space-y-1">
                  {copyWeekPreviewData.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-yellow-700 dark:text-yellow-400"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><span>{w}</span></div>
                  ))}
                </div>
              )}
              {copyWeekPreviewData.toCreate.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Classes to create ({copyWeekPreviewData.toCreate.length})</h4>
                  <div className="space-y-1.5">
                    {copyWeekPreviewData.toCreate.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-green-500/5">
                        <div><span className="text-sm font-medium">{item.name}</span><span className="text-xs text-muted-foreground ml-2">{WEEKDAY_NAMES[item.weekday!]} {item.startTime} - {item.endTime}</span></div>
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">New</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {copyWeekPreviewData.toSkip.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Skipped duplicates ({copyWeekPreviewData.toSkip.length})</h4>
                  <div className="space-y-1.5">
                    {copyWeekPreviewData.toSkip.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border opacity-60">
                        <div><span className="text-sm font-medium">{item.name}</span><span className="text-xs text-muted-foreground ml-2">{WEEKDAY_NAMES[item.weekday!]} {item.startTime}</span></div>
                        <Badge variant="secondary" className="text-xs">Exists</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {copyWeekPreviewData.toCreate.length === 0 && copyWeekPreviewData.toSkip.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No classes found in last week to copy.</p>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <button type="button" onClick={() => { setCopyWeekOpen(false); setCopyWeekPreviewData(null); }} className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
            <button type="button" onClick={handleCopyWeekConfirm} disabled={copyWeekMutation.isPending || !copyWeekPreviewData || copyWeekPreviewData.toCreate.length === 0} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {copyWeekMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Copy ${copyWeekPreviewData?.toCreate.length || 0} Classes`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saveTemplateOpen} onOpenChange={(open) => { if (!open) { setSaveTemplateOpen(false); setTemplateName(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Week as Template</DialogTitle>
            <DialogDescription>Save the current week's schedule (week of {format(currentWeekStart, 'MMM d')}) as a reusable template.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTemplate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input id="template-name" placeholder='e.g. "Regular Week", "Summer Schedule"' value={templateName} onChange={(e) => setTemplateName(e.target.value)} required />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => { setSaveTemplateOpen(false); setTemplateName(""); }} className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button type="submit" disabled={createTemplateMutation.isPending || !templateName.trim()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {createTemplateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Template"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={templateManagerOpen} onOpenChange={(open) => { if (!open) { setTemplateManagerOpen(false); setApplyTemplateId(null); setApplyTemplatePreviewData(null); } }}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Schedule Templates</SheetTitle>
            <SheetDescription>Manage and apply saved schedule templates.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {!templates || templates.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="mx-auto w-12 h-12 rounded-xl bg-muted flex items-center justify-center"><LayoutTemplate className="h-6 w-6 text-muted-foreground" /></div>
                <div>
                  <p className="text-sm font-medium text-foreground">No templates yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Save a week's schedule as a template to reuse it later.</p>
                </div>
                <button onClick={() => { setTemplateManagerOpen(false); setSaveTemplateOpen(true); }} disabled={!hasClassesThisWeek} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                  <Save className="h-4 w-4" /> Save Current Week
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((tmpl) => (
                  <div key={tmpl.id} className="p-4 rounded-xl border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">{tmpl.name}</h4>
                        <p className="text-xs text-muted-foreground">{format(new Date(tmpl.createdAt), 'MMM d, yyyy')}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleApplyTemplatePreview(tmpl.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"><Play className="h-3.5 w-3.5" />Apply</button>
                        <button onClick={() => setViewTemplateId(viewTemplateId === tmpl.id ? null : tmpl.id)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors" title="View template contents"><FileText className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { setRenameTemplateId(tmpl.id); setRenameTemplateName(tmpl.name); }} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleteTemplateId(tmpl.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    {viewTemplateId === tmpl.id && viewTemplateDetail && (viewTemplateDetail as any).items && (
                      <div className="border-t border-border pt-3 space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">{((viewTemplateDetail as any).items || []).length} classes in template:</p>
                        {((viewTemplateDetail as any).items || []).map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                            <div><span className="font-medium">{item.className}</span><span className="text-xs text-muted-foreground ml-2">{WEEKDAY_NAMES[item.weekday]} {item.startTime} - {item.endTime}</span></div>
                            <Badge variant="outline" className="text-xs">{item.type}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!applyTemplateId && !!applyTemplatePreviewData} onOpenChange={(open) => { if (!open) { setApplyTemplateId(null); setApplyTemplatePreviewData(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply Template</DialogTitle>
            <DialogDescription>Apply template to the week of {format(currentWeekStart, 'MMM d, yyyy')}.</DialogDescription>
          </DialogHeader>
          {previewApplyMutation.isPending ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>
          ) : applyTemplatePreviewData ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {applyTemplatePreviewData.warnings.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 space-y-1">
                  {applyTemplatePreviewData.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-yellow-700 dark:text-yellow-400"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><span>{w}</span></div>
                  ))}
                </div>
              )}
              {applyTemplatePreviewData.toCreate.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Classes to create ({applyTemplatePreviewData.toCreate.length})</h4>
                  <div className="space-y-1.5">
                    {applyTemplatePreviewData.toCreate.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-green-500/5">
                        <div><span className="text-sm font-medium">{item.name}</span><span className="text-xs text-muted-foreground ml-2">{WEEKDAY_NAMES[item.weekday!]} {item.startTime} - {item.endTime}</span></div>
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">New</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {applyTemplatePreviewData.toSkip.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Skipped duplicates ({applyTemplatePreviewData.toSkip.length})</h4>
                  <div className="space-y-1.5">
                    {applyTemplatePreviewData.toSkip.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border opacity-60">
                        <div><span className="text-sm font-medium">{item.name}</span><span className="text-xs text-muted-foreground ml-2">{WEEKDAY_NAMES[item.weekday!]} {item.startTime}</span></div>
                        <Badge variant="secondary" className="text-xs">Exists</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {applyTemplatePreviewData.toCreate.length === 0 && applyTemplatePreviewData.toSkip.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">This template has no items.</p>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <button type="button" onClick={() => { setApplyTemplateId(null); setApplyTemplatePreviewData(null); }} className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
            <button type="button" onClick={handleApplyTemplateConfirm} disabled={applyTemplateMutation.isPending || !applyTemplatePreviewData || applyTemplatePreviewData.toCreate.length === 0} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {applyTemplateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Apply ${applyTemplatePreviewData?.toCreate.length || 0} Classes`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameTemplateId} onOpenChange={(open) => { if (!open) { setRenameTemplateId(null); setRenameTemplateName(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Template</DialogTitle>
            <DialogDescription>Enter a new name for this template.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameTemplate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-template">Name *</Label>
              <Input id="rename-template" value={renameTemplateName} onChange={(e) => setRenameTemplateName(e.target.value)} required />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => { setRenameTemplateId(null); setRenameTemplateName(""); }} className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button type="submit" disabled={updateTemplateMutation.isPending || !renameTemplateName.trim()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {updateTemplateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rename"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTemplateId} onOpenChange={(open) => { if (!open) setDeleteTemplateId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this template? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteTemplateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
