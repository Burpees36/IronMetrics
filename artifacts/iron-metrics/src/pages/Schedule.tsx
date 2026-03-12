import React, { useState, useMemo } from "react";
import { useGym } from "@/store/GymContext";
import { useListClasses, useCreateClass, useGetClass, useDeleteClass, useCheckInToClass, useUpdateClass, useListMembers, useListStaff, getListClassesQueryKey, getGetClassQueryKey, usePreviewCopyWeek, useCopyWeek, useListClassTemplates, useCreateClassTemplate, useGetClassTemplate, useDeleteClassTemplate, useUpdateClassTemplate, usePreviewApplyTemplate, useApplyClassTemplate, getListClassTemplatesQueryKey } from "@workspace/api-client-react";
import type { StaffMember, CreateClassBodyType, Member, ClassTemplate, CopyWeekPreviewItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday, endOfWeek } from "date-fns";
import { motion } from "framer-motion";
import { Loader2, Plus, Clock, Users, Trash2, Search, UserCheck, X, ChevronLeft, ChevronRight, Copy, FileText, MoreHorizontal, Save, Play, Pencil, AlertTriangle, CalendarPlus, LayoutTemplate } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function Schedule() {
  const { activeGymId } = useGym();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [weekOffset, setWeekOffset] = useState(0);
  const currentWeekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return weekOffset === 0 ? base : addWeeks(base, weekOffset);
  }, [weekOffset]);
  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i)), [currentWeekStart]);

  const todayInWeek = days.findIndex((d) => isToday(d));
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayInWeek >= 0 ? todayInWeek : 0);

  const selectedDate = days[selectedDayIndex];

  const weekEnd = useMemo(() => endOfWeek(currentWeekStart, { weekStartsOn: 1 }), [currentWeekStart]);
  const classParams = useMemo(() => ({
    startDate: currentWeekStart.toISOString(),
    endDate: weekEnd.toISOString(),
  }), [currentWeekStart, weekEnd]);

  const { data: classes, isLoading } = useListClasses(activeGymId as number, classParams, {
    query: { enabled: !!activeGymId }
  });

  const filteredClasses = useMemo(() => {
    if (!classes) return [];
    return classes.filter((cls) => {
      const clsDate = new Date(cls.startTime);
      return isSameDay(clsDate, selectedDate);
    });
  }, [classes, selectedDate]);

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

  function handleCopyWeekPreview() {
    if (!activeGymId) return;
    previewCopyWeekMutation.mutate(
      { gymId: activeGymId, data: { sourceWeek: previousWeekStart.toISOString().split("T")[0], targetWeek: currentWeekStart.toISOString().split("T")[0] } },
      {
        onSuccess: (data) => {
          setCopyWeekPreviewData(data as any);
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || "Failed to preview copy." });
        },
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
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || "Failed to copy week." });
        },
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
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || "Failed to save template." });
        },
      }
    );
  }

  function handleApplyTemplatePreview(templateId: number) {
    if (!activeGymId) return;
    setApplyTemplateId(templateId);
    previewApplyMutation.mutate(
      { gymId: activeGymId, templateId, data: { targetWeek: currentWeekStart.toISOString().split("T")[0] } },
      {
        onSuccess: (data) => {
          setApplyTemplatePreviewData(data as any);
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || "Failed to preview." });
        },
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
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || "Failed to apply template." });
        },
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
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || "Failed to rename." });
        },
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
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || "Failed to delete." });
        },
      }
    );
  }

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

  function resetForm() {
    setFormData({ name: "", date: "", startHour: "9", startMinute: "00", startAmPm: "AM", endHour: "10", endMinute: "00", endAmPm: "AM", capacity: "", coachId: "none", description: "", type: "regular", repeatDays: [] });
  }

  function openCreateDialog() {
    resetForm();
    setFormData(p => ({ ...p, date: format(selectedDate, 'yyyy-MM-dd') }));
    setCreateOpen(true);
  }

  function to24Hour(hour: string, amPm: string): number {
    let h = parseInt(hour, 10);
    if (amPm === "AM" && h === 12) h = 0;
    if (amPm === "PM" && h !== 12) h += 12;
    return h;
  }

  function getDateForDayOfWeek(baseDate: string, dayIndex: number): string {
    const base = new Date(baseDate + "T00:00:00");
    const baseDay = base.getDay();
    const diff = dayIndex - baseDay;
    const target = new Date(base);
    target.setDate(target.getDate() + diff);
    return format(target, "yyyy-MM-dd");
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
      for (const dayIdx of formData.repeatDays) {
        const dateStr = getDateForDayOfWeek(formData.date, dayIdx);
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
              if (total === 1) {
                toast({ title: "Class Created", description: `${formData.name} has been scheduled.` });
              } else {
                toast({ title: "Classes Created", description: `${formData.name} scheduled for ${created} day${created > 1 ? "s" : ""}.` });
              }
            }
          },
          onError: (error: any) => {
            failed++;
            if (created + failed === total) {
              queryClient.invalidateQueries({ queryKey: getListClassesQueryKey(activeGymId!) });
              if (created > 0) {
                setCreateOpen(false);
                resetForm();
                toast({ title: "Partially Created", description: `${created} of ${total} classes created. Some failed.` });
              } else {
                const message = error?.data?.error || error?.message || "Failed to create class.";
                toast({ title: "Error", description: message });
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
          const message = error?.data?.error || error?.message || "Failed to delete class.";
          toast({ title: "Error", description: message });
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
          if (detailClassId) {
            queryClient.invalidateQueries({ queryKey: getGetClassQueryKey(activeGymId, detailClassId) });
          }
          setCheckinClassId(null);
          setMemberSearch("");
        },
        onError: (error: any) => {
          const message = error?.data?.error || error?.message || "Failed to check in member.";
          toast({ title: "Error", description: message });
        },
      }
    );
  }

  function handleAssignCoach(coachId: string) {
    if (!activeGymId || !detailClassId) return;

    const newCoachId = coachId === "none" ? null : parseInt(coachId, 10);

    updateClassMutation.mutate(
      {
        gymId: activeGymId,
        classId: detailClassId,
        data: { coachId: newCoachId },
      },
      {
        onSuccess: () => {
          toast({ title: "Coach Updated", description: "Coach assignment has been updated." });
          queryClient.invalidateQueries({ queryKey: getListClassesQueryKey(activeGymId) });
          queryClient.invalidateQueries({ queryKey: getGetClassQueryKey(activeGymId, detailClassId) });
        },
        onError: (error: any) => {
          const message = error?.data?.error || error?.message || "Failed to update coach.";
          toast({ title: "Error", description: message });
        },
      }
    );
  }

  function handlePrevWeek() {
    const newOffset = weekOffset - 1;
    setWeekOffset(newOffset);
    if (newOffset === 0) {
      const base = startOfWeek(new Date(), { weekStartsOn: 1 });
      const newDays = Array.from({ length: 7 }).map((_, i) => addDays(base, i));
      const idx = newDays.findIndex((d) => isToday(d));
      setSelectedDayIndex(idx >= 0 ? idx : 0);
    } else {
      setSelectedDayIndex(0);
    }
  }

  function handleNextWeek() {
    const newOffset = weekOffset + 1;
    setWeekOffset(newOffset);
    if (newOffset === 0) {
      const base = startOfWeek(new Date(), { weekStartsOn: 1 });
      const newDays = Array.from({ length: 7 }).map((_, i) => addDays(base, i));
      const idx = newDays.findIndex((d) => isToday(d));
      setSelectedDayIndex(idx >= 0 ? idx : 0);
    } else {
      setSelectedDayIndex(0);
    }
  }

  return (
    <div className="space-y-4 md:space-y-6 h-full flex flex-col">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Schedule</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Manage classes and attendance.</p>
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
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 min-h-[44px] flex-1 sm:flex-initial sm:w-auto"
          >
            <Plus className="h-5 w-5" />
            <span>New Class</span>
          </button>
        </div>
      </header>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handlePrevWeek}
          className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-2 md:grid md:grid-cols-7 md:gap-4 flex-1 mb-0 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          {days.map((day, i) => {
            const isSelected = i === selectedDayIndex;
            const isDayToday = isToday(day);
            return (
              <button
                key={i}
                onClick={() => setSelectedDayIndex(i)}
                className={`p-2.5 md:p-3 rounded-2xl text-center border shrink-0 min-w-[56px] md:min-w-0 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary/10 border-primary/30 ring-2 ring-primary/20"
                    : isDayToday
                      ? "bg-primary/5 border-primary/20"
                      : "bg-card border-border hover:border-primary/30"
                }`}
              >
                <div className={`text-[10px] md:text-xs font-semibold uppercase mb-0.5 md:mb-1 ${isSelected ? "text-primary" : isDayToday ? "text-primary/70" : "text-muted-foreground"}`}>
                  {format(day, 'EEE')}
                </div>
                <div className={`text-lg md:text-xl font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                  {format(day, 'd')}
                </div>
                {isDayToday && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />
                )}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleNextWeek}
          className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors"
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="text-sm text-muted-foreground shrink-0">
        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
      </div>

      <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm p-4 md:p-6 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {filteredClasses.length ? filteredClasses.map((cls, i) => (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setDetailClassId(cls.id)}
                className="flex flex-col gap-3 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-white/5 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base md:text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{cls.name}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm text-muted-foreground mt-1">
                      <span className="font-bold text-foreground">{format(new Date(cls.startTime), 'h:mm a')}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5"/> 60 min</span>
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5"/> {cls.coachName || 'TBD'}</span>
                      <span className="text-xs">{cls.capacity - cls.enrolled} spots left</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    <div className="hidden sm:flex -space-x-2">
                      {[...Array(Math.min(cls.enrolled, 3))].map((_, j) => (
                        <div key={j} className="h-8 w-8 rounded-full border-2 border-card bg-muted" />
                      ))}
                      {cls.enrolled > 3 && (
                        <div className="h-8 w-8 rounded-full border-2 border-card bg-secondary flex items-center justify-center text-[10px] font-bold">
                          +{cls.enrolled - 3}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCheckinClassId(cls.id); }}
                      className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-medium transition-colors min-h-[44px]"
                    >
                      Check In
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteClassId(cls.id); }}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )) : !isLoading && !hasClassesThisWeek ? (
              <div className="text-center py-16 space-y-6">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <CalendarPlus className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">No classes this week</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Get started by creating a class, copying last week's schedule, or applying a saved template.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={openCreateDialog}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors min-h-[44px]"
                  >
                    <Plus className="h-4 w-4" />
                    Create Class
                  </button>
                  <button
                    onClick={handleCopyWeekPreview}
                    className="flex items-center gap-2 px-4 py-2.5 border border-border hover:bg-secondary rounded-xl font-medium transition-colors min-h-[44px] text-foreground"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Last Week
                  </button>
                  {templates && templates.length > 0 && (
                    <button
                      onClick={() => setTemplateManagerOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 border border-border hover:bg-secondary rounded-xl font-medium transition-colors min-h-[44px] text-foreground"
                    >
                      <LayoutTemplate className="h-4 w-4" />
                      Apply Template
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No classes scheduled for this day.
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                {[
                  { label: "S", day: 0 },
                  { label: "M", day: 1 },
                  { label: "T", day: 2 },
                  { label: "W", day: 3 },
                  { label: "T", day: 4 },
                  { label: "F", day: 5 },
                  { label: "S", day: 6 },
                ].map(({ label, day }) => {
                  const selected = formData.repeatDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        setFormData(p => ({
                          ...p,
                          repeatDays: selected
                            ? p.repeatDays.filter(d => d !== day)
                            : [...p.repeatDays, day],
                        }));
                      }}
                      className={`h-9 w-9 rounded-lg text-xs font-semibold transition-all ${
                        selected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/30 text-muted-foreground border border-border hover:bg-muted/50"
                      }`}
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
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                      <SelectItem key={h} value={String(h)}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground font-bold">:</span>
                <Select value={formData.startMinute} onValueChange={(v) => setFormData(p => ({ ...p, startMinute: v }))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["00", "15", "30", "45"].map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={formData.startAmPm} onValueChange={(v) => setFormData(p => ({ ...p, startAmPm: v }))}>
                  <SelectTrigger className="w-[72px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>End Time *</Label>
              <div className="flex items-center gap-2">
                <Select value={formData.endHour} onValueChange={(v) => setFormData(p => ({ ...p, endHour: v }))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                      <SelectItem key={h} value={String(h)}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground font-bold">:</span>
                <Select value={formData.endMinute} onValueChange={(v) => setFormData(p => ({ ...p, endMinute: v }))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["00", "15", "30", "45"].map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={formData.endAmPm} onValueChange={(v) => setFormData(p => ({ ...p, endAmPm: v }))}>
                  <SelectTrigger className="w-[72px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
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
                  <SelectTrigger id="coach-select">
                    <SelectValue placeholder="Select coach" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Coach</SelectItem>
                    {activeStaff.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.firstName} {s.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-desc">Description</Label>
              <Input id="class-desc" value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
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
                      <Select
                        value={classDetail.coachId ? String(classDetail.coachId) : "none"}
                        onValueChange={handleAssignCoach}
                        disabled={updateClassMutation.isPending}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Assign Coach" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Coach</SelectItem>
                          {activeStaff.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.firstName} {s.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Capacity</span>
                    <p className="font-medium">{classDetail.enrolled} / {classDetail.capacity}</p>
                  </div>
                </div>
                {classDetail.description && (
                  <p className="text-sm text-muted-foreground">{classDetail.description}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">Roster</h3>
                  <button
                    onClick={() => { setCheckinClassId(classDetail.id); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Check In
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
                <button
                  onClick={() => { setDeleteClassId(classDetail.id); }}
                  className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg text-sm font-medium transition-colors w-full justify-center"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Class
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
            <AlertDialogDescription>
              Are you sure you want to delete this class? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClass}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
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
              <Input
                placeholder="Search members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {members.length ? members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleCheckIn(member.id)}
                  disabled={checkInMutation.isPending}
                  className="flex items-center justify-between w-full p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-white/5 transition-all text-left"
                >
                  <div>
                    <p className="text-sm font-medium">{member.firstName} {member.lastName}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </button>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {memberSearch ? "No members found." : "Type to search members."}
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={copyWeekOpen} onOpenChange={(open) => { if (!open) { setCopyWeekOpen(false); setCopyWeekPreviewData(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Copy Last Week</DialogTitle>
            <DialogDescription>
              Copy classes from the week of {format(previousWeekStart, 'MMM d')} to the week of {format(currentWeekStart, 'MMM d, yyyy')}.
            </DialogDescription>
          </DialogHeader>
          {previewCopyWeekMutation.isPending ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : copyWeekPreviewData ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {copyWeekPreviewData.warnings.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 space-y-1">
                  {copyWeekPreviewData.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-yellow-700 dark:text-yellow-400">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
              {copyWeekPreviewData.toCreate.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Classes to create ({copyWeekPreviewData.toCreate.length})</h4>
                  <div className="space-y-1.5">
                    {copyWeekPreviewData.toCreate.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-green-500/5">
                        <div>
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{WEEKDAY_NAMES[item.weekday!]} {item.startTime} - {item.endTime}</span>
                        </div>
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
                        <div>
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{WEEKDAY_NAMES[item.weekday!]} {item.startTime}</span>
                        </div>
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
            <button type="button" onClick={() => { setCopyWeekOpen(false); setCopyWeekPreviewData(null); }} className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCopyWeekConfirm}
              disabled={copyWeekMutation.isPending || !copyWeekPreviewData || copyWeekPreviewData.toCreate.length === 0}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
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
              <Input
                id="template-name"
                placeholder='e.g. "Regular Week", "Summer Schedule"'
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => { setSaveTemplateOpen(false); setTemplateName(""); }} className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
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
                <div className="mx-auto w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <LayoutTemplate className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">No templates yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Save a week's schedule as a template to reuse it later.</p>
                </div>
                <button
                  onClick={() => { setTemplateManagerOpen(false); setSaveTemplateOpen(true); }}
                  disabled={!hasClassesThisWeek}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  Save Current Week
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
                        <button
                          onClick={() => handleApplyTemplatePreview(tmpl.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Apply
                        </button>
                        <button
                          onClick={() => setViewTemplateId(viewTemplateId === tmpl.id ? null : tmpl.id)}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                          title="View template contents"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { setRenameTemplateId(tmpl.id); setRenameTemplateName(tmpl.name); }}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTemplateId(tmpl.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {viewTemplateId === tmpl.id && viewTemplateDetail && (viewTemplateDetail as any).items && (
                      <div className="border-t border-border pt-3 space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">{((viewTemplateDetail as any).items || []).length} classes in template:</p>
                        {((viewTemplateDetail as any).items || []).map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                            <div>
                              <span className="font-medium">{item.className}</span>
                              <span className="text-xs text-muted-foreground ml-2">{WEEKDAY_NAMES[item.weekday]} {item.startTime} - {item.endTime}</span>
                            </div>
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
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : applyTemplatePreviewData ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {applyTemplatePreviewData.warnings.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 space-y-1">
                  {applyTemplatePreviewData.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-yellow-700 dark:text-yellow-400">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
              {applyTemplatePreviewData.toCreate.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Classes to create ({applyTemplatePreviewData.toCreate.length})</h4>
                  <div className="space-y-1.5">
                    {applyTemplatePreviewData.toCreate.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-green-500/5">
                        <div>
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{WEEKDAY_NAMES[item.weekday!]} {item.startTime} - {item.endTime}</span>
                        </div>
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
                        <div>
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{WEEKDAY_NAMES[item.weekday!]} {item.startTime}</span>
                        </div>
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
            <button type="button" onClick={() => { setApplyTemplateId(null); setApplyTemplatePreviewData(null); }} className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyTemplateConfirm}
              disabled={applyTemplateMutation.isPending || !applyTemplatePreviewData || applyTemplatePreviewData.toCreate.length === 0}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
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
              <button type="button" onClick={() => { setRenameTemplateId(null); setRenameTemplateName(""); }} className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
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
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTemplateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
