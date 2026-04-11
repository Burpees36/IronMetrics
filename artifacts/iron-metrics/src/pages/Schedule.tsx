import React, { useState, useMemo, useRef, useEffect } from "react";
import { useGym } from "@/store/GymContext";
import { useUserRole } from "@/components/programming/useUserRole";
import { useListClasses, useCreateClass, useGetClass, useDeleteClass, useCheckInToClass, useUpdateClass, useListMembers, useListStaff, getListClassesQueryKey, getGetClassQueryKey, usePreviewCopyWeek, useCopyWeek, useListClassTemplates, useCreateClassTemplate, useGetClassTemplate, useDeleteClassTemplate, useUpdateClassTemplate, usePreviewApplyTemplate, useApplyClassTemplate, getListClassTemplatesQueryKey } from "@workspace/api-client-react";
import type { StaffMember, CreateClassBodyType, Member, ClassTemplate, CopyWeekPreviewItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday, endOfWeek, getHours, getMinutes } from "date-fns";
import { Loader2, Plus, Users, Trash2, Search, UserCheck, X, ChevronLeft, ChevronRight, Copy, FileText, MoreHorizontal, Save, Play, Pencil, AlertTriangle, LayoutTemplate, CalendarDays, Filter, BookOpen, UserMinus, Check, XCircle, ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { OccupancyBadge, getClassColors, HOUR_HEIGHT, CALENDAR_START_HOUR, CALENDAR_END_HOUR, TYPE_LABELS, WEEKDAY_NAMES, to24Hour, from24Hour } from "./schedule/helpers";
import { ScheduleDialogs } from "./schedule/ScheduleDialogs";
import { AppointmentsPanel } from "./schedule/AppointmentsPanel";

export function Schedule() {
  const { activeGymId } = useGym();
  const { role, isStaff, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const calendarRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const canManage = role === "gym_owner" || role === "admin";
  const canOperate = canManage || role === "coach" || role === "head_coach" || role === "front_desk";

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
  const [editOpen, setEditOpen] = useState(false);
  const [editClassData, setEditClassData] = useState<any>(null);
  const [detailClassId, setDetailClassId] = useState<number | null>(null);
  const [focusedClassId, setFocusedClassId] = useState<number | null>(null);
  const [deleteClassId, setDeleteClassId] = useState<number | null>(null);
  const [checkinClassId, setCheckinClassId] = useState<number | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [coachFilter, setCoachFilter] = useState<string>("all");
  const [scheduleView, setScheduleView] = useState<"classes" | "appointments">("classes");

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
    memberNotes: "",
    staffNotes: "",
    isBookable: true,
    waitlistEnabled: false,
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    startHour: "9",
    startMinute: "00",
    startAmPm: "AM",
    endHour: "10",
    endMinute: "00",
    endAmPm: "AM",
    capacity: "",
    coachId: "none",
    description: "",
    type: "regular",
    memberNotes: "",
    staffNotes: "",
    isBookable: true,
    waitlistEnabled: false,
  });

  const createClassMutation = useCreateClass();
  const deleteClassMutation = useDeleteClass();
  const checkInMutation = useCheckInToClass();
  const updateClassMutation = useUpdateClass();

  const [copyWeekOpen, setCopyWeekOpen] = useState(false);
  const [copyWeekPreviewData, setCopyWeekPreviewData] = useState<{ toCreate: CopyWeekPreviewItem[]; toSkip: CopyWeekPreviewItem[]; warnings: string[] } | null>(null);

  const [clearWeekOpen, setClearWeekOpen] = useState(false);
  const [clearWeekPending, setClearWeekPending] = useState(false);

  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [applyTemplateId, setApplyTemplateId] = useState<number | null>(null);
  const [applyTemplatePreviewData, setApplyTemplatePreviewData] = useState<{ toCreate: CopyWeekPreviewItem[]; toSkip: CopyWeekPreviewItem[]; warnings: string[] } | null>(null);
  const [applySelectedItems, setApplySelectedItems] = useState<Set<number>>(new Set());
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

  const filteredClasses = useMemo(() => {
    if (!classes) return [];
    return classes.filter((cls: any) => {
      if (typeFilter !== "all" && (cls.type || "regular") !== typeFilter) return false;
      if (coachFilter !== "all") {
        if (coachFilter === "unassigned" && cls.coachId) return false;
        if (coachFilter !== "unassigned" && String(cls.coachId) !== coachFilter) return false;
      }
      return true;
    });
  }, [classes, typeFilter, coachFilter]);

  const classesByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    for (const cls of filteredClasses) {
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
  }, [filteredClasses, days]);

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
    setFormData({ name: "", date: "", startHour: "9", startMinute: "00", startAmPm: "AM", endHour: "10", endMinute: "00", endAmPm: "AM", capacity: "", coachId: "none", description: "", type: "regular", repeatDays: [], memberNotes: "", staffNotes: "", isBookable: true, waitlistEnabled: false });
  }

  function openCreateForDay(dayIndex: number) {
    if (!canManage) return;
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

  function getDateForCalendarDay(calendarDayIndex: number): string {
    return format(days[calendarDayIndex], "yyyy-MM-dd");
  }

  function openEditDialog(cls: any) {
    if (!canManage) return;
    const start = new Date(cls.startTime);
    const end = new Date(cls.endTime);
    const startH = from24Hour(start.getHours());
    const endH = from24Hour(end.getHours());
    setEditClassData(cls);
    setEditFormData({
      name: cls.name || "",
      startHour: startH.hour,
      startMinute: String(start.getMinutes()).padStart(2, '0'),
      startAmPm: startH.amPm,
      endHour: endH.hour,
      endMinute: String(end.getMinutes()).padStart(2, '0'),
      endAmPm: endH.amPm,
      capacity: String(cls.capacity),
      coachId: cls.coachId ? String(cls.coachId) : "none",
      description: cls.description || "",
      type: cls.type || "regular",
      memberNotes: cls.memberNotes || "",
      staffNotes: cls.staffNotes || "",
      isBookable: cls.isBookable !== false,
      waitlistEnabled: cls.waitlistEnabled || false,
    });
    setEditOpen(true);
  }

  function handleEditClass(e: React.FormEvent) {
    e.preventDefault();
    if (!activeGymId || !editClassData) return;
    const startH = to24Hour(editFormData.startHour, editFormData.startAmPm);
    const endH = to24Hour(editFormData.endHour, editFormData.endAmPm);
    const origStart = new Date(editClassData.startTime);
    const dateStr = format(origStart, 'yyyy-MM-dd');
    const startDate = new Date(`${dateStr}T${String(startH).padStart(2, '0')}:${editFormData.startMinute}:00`);
    const endDate = new Date(`${dateStr}T${String(endH).padStart(2, '0')}:${editFormData.endMinute}:00`);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
      toast({ title: "Invalid Time", description: "End time must be after start time." });
      return;
    }
    updateClassMutation.mutate(
      {
        gymId: activeGymId,
        classId: editClassData.id,
        data: {
          name: editFormData.name,
          type: editFormData.type,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          capacity: parseInt(editFormData.capacity, 10),
          coachId: editFormData.coachId !== "none" ? parseInt(editFormData.coachId, 10) : null,
          description: editFormData.description || null,
          memberNotes: editFormData.memberNotes || null,
          staffNotes: editFormData.staffNotes || null,
          isBookable: editFormData.isBookable,
          waitlistEnabled: editFormData.waitlistEnabled,
        } as any,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClassesQueryKey(activeGymId) });
          if (detailClassId) queryClient.invalidateQueries({ queryKey: getGetClassQueryKey(activeGymId, detailClassId) });
          setEditOpen(false);
          setEditClassData(null);
          toast({ title: "Class Updated", description: "Changes saved successfully." });
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || "Failed to update class." });
        },
      }
    );
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
      { gymId: activeGymId, classId: checkinClassId, data: { memberId, status: "present" as const } },
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

  function handleUpdateAttendanceStatus(attendanceId: number, newStatus: string) {
    if (!activeGymId || !detailClassId) return;
    fetch(`/api/gyms/${activeGymId}/classes/${detailClassId}/attendance/${attendanceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
      credentials: "include",
    }).then(async (res) => {
      if (res.ok) {
        toast({ title: "Status Updated" });
        queryClient.invalidateQueries({ queryKey: getGetClassQueryKey(activeGymId, detailClassId!) });
        queryClient.invalidateQueries({ queryKey: getListClassesQueryKey(activeGymId) });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Error", description: data.error || "Failed to update status." });
      }
    });
  }

  function handleDuplicateClass(classId: number) {
    if (!activeGymId) return;
    fetch(`/api/gyms/${activeGymId}/classes/${classId}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      credentials: "include",
    }).then(async (res) => {
      if (res.ok) {
        toast({ title: "Class Duplicated", description: "A copy has been created." });
        queryClient.invalidateQueries({ queryKey: getListClassesQueryKey(activeGymId) });
        setDetailClassId(null);
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Error", description: data.error || "Failed to duplicate class." });
      }
    });
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

  function handleClearWeek() {
    if (!activeGymId) return;
    setClearWeekPending(true);
    fetch(`/api/gyms/${activeGymId}/classes/clear-week`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart: currentWeekStart.toISOString().split("T")[0] }),
      credentials: "include",
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: getListClassesQueryKey(activeGymId) });
        setClearWeekOpen(false);
        toast({ title: "Week Cleared", description: data.message || "All classes removed." });
      } else {
        toast({ title: "Error", description: data.error || "Failed to clear week." });
      }
    }).catch(() => {
      toast({ title: "Error", description: "Network error. Please try again." });
    }).finally(() => {
      setClearWeekPending(false);
    });
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
        onSuccess: (data) => {
          setApplyTemplatePreviewData(data as any);
          const createItems = (data as any).toCreate || [];
          setApplySelectedItems(new Set(createItems.map((_: any, i: number) => i)));
        },
        onError: (error: any) => { toast({ title: "Error", description: error?.data?.error || "Failed to preview." }); },
      }
    );
  }

  function handleApplyTemplateConfirm() {
    if (!activeGymId || !applyTemplateId) return;
    applyTemplateMutation.mutate(
      { gymId: activeGymId, templateId: applyTemplateId, data: { targetWeek: currentWeekStart.toISOString().split("T")[0] } } as any,
      {
        onSuccess: (data: any) => {
          queryClient.invalidateQueries({ queryKey: getListClassesQueryKey(activeGymId) });
          setApplyTemplateId(null);
          setApplyTemplatePreviewData(null);
          setApplySelectedItems(new Set());
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

  const typeLabels = TYPE_LABELS;
  const hasActiveFilters = typeFilter !== "all" || coachFilter !== "all";

  return (
    <div className="h-full flex flex-col gap-3">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button onClick={handlePrevWeek} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" aria-label="Previous week">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={handleNextWeek} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" aria-label="Next week">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground tracking-tight">
              {format(currentWeekStart, 'MMMM yyyy')}
            </h1>
            <p className="text-[11px] text-muted-foreground/60">
              {format(currentWeekStart, 'MMM d')} — {format(addDays(currentWeekStart, 6), 'MMM d')}
            </p>
          </div>
          <button onClick={goToday} className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
            Today
          </button>
          <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5 ml-2">
            <button
              onClick={() => setScheduleView("classes")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${scheduleView === "classes" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Classes
            </button>
            <button
              onClick={() => setScheduleView("appointments")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${scheduleView === "appointments" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Appointments
            </button>
          </div>
        </div>
        {scheduleView === "classes" && <div className="flex items-center gap-2 w-full sm:w-auto">
          {usedTypes.length > 0 && (
            <div className="hidden lg:flex items-center gap-3 mr-3">
              {usedTypes.map((type) => {
                const colors = getClassColors(type);
                return (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${colors.dot}`} />
                    <span className="text-[11px] text-muted-foreground/70">{typeLabels[type] || type}</span>
                  </div>
                );
              })}
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center justify-center gap-2 px-3 py-2 border rounded-xl text-sm transition-colors ${hasActiveFilters ? "border-primary/50 bg-primary/10 text-primary" : "border-border/50 hover:bg-secondary text-muted-foreground hover:text-foreground"}`}>
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filter</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <label className="text-xs font-medium text-muted-foreground">Class Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="px-3 py-2">
                <label className="text-xs font-medium text-muted-foreground">Coach</label>
                <Select value={coachFilter} onValueChange={setCoachFilter}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Coaches</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {activeStaff.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setTypeFilter("all"); setCoachFilter("all"); }}>
                    <X className="h-4 w-4 mr-2" /> Clear Filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-center gap-2 px-3 py-2 border border-border/50 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-xl text-sm transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setClearWeekOpen(true)} disabled={!hasClassesThisWeek} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Week
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {canManage && (
            <button
              onClick={openCreateDialog}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-primary/20 flex-1 sm:flex-initial"
            >
              <Plus className="h-4 w-4" />
              <span>New Class</span>
            </button>
          )}
        </div>}
      </header>

      {scheduleView === "appointments" ? (
        <AppointmentsPanel
          weekOffset={weekOffset}
          currentWeekStart={currentWeekStart}
          canManage={canManage}
          canOperate={canOperate}
        />
      ) : (<>
      <div className="flex-1 bg-card/50 border border-border/40 rounded-2xl overflow-hidden flex flex-col min-h-0 backdrop-blur-sm">
        <div className="grid shrink-0 border-b border-border/40" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
          <div className="border-r border-border/30" />
          {days.map((day, i) => {
            const today = isToday(day);
            return (
              <div
                key={i}
                className={`py-3 px-1 text-center border-r border-border/30 last:border-r-0 transition-colors`}
              >
                <div className={`text-[11px] font-medium tracking-wider ${today ? "text-primary" : "text-muted-foreground/50"}`}>
                  {format(day, 'EEE').toLowerCase()}
                </div>
                <div className={`mt-0.5 inline-flex items-center justify-center ${today ? "h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-base" : "text-lg font-semibold text-foreground/80"}`}>
                  {format(day, 'd')}
                </div>
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
              <div className="absolute inset-0 grid" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
                <div className="relative border-r border-border/30">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="absolute right-3 -translate-y-1/2 text-[10px] text-muted-foreground/40 font-medium tabular-nums select-none"
                      style={{ top: (hour - CALENDAR_START_HOUR) * HOUR_HEIGHT }}
                    >
                      {hour === 0 ? "12 am" : hour < 12 ? `${hour} am` : hour === 12 ? "12 pm" : `${hour - 12} pm`}
                    </div>
                  ))}
                </div>

                {days.map((day, dayIndex) => {
                  const today = isToday(day);
                  const dayClasses = classesByDay[dayIndex] || [];

                  return (
                    <div
                      key={dayIndex}
                      className={`relative border-r border-border/30 last:border-r-0 ${today ? "bg-primary/[0.03]" : ""} ${canManage ? "cursor-pointer" : ""}`}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('.calendar-class-block')) return;
                        setFocusedClassId(null);
                        if (canManage) openCreateForDay(dayIndex);
                      }}
                    >
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="absolute left-0 right-0 border-t border-border/20"
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

                        const PEEK = 20;
                        const PAD = 2;

                        return items.map(({ cls, start, end, startMin, endMin }, i) => {
                          const topPx = ((startMin / 60) - CALENDAR_START_HOUR) * HOUR_HEIGHT;
                          const heightPx = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 34);
                          const colors = getClassColors(cls.type || "regular");
                          const depth = overlapDepth[i];
                          const isTiny = heightPx < 44;
                          const isShort = heightPx >= 44 && heightPx < 72;

                          const isFocused = focusedClassId === cls.id;

                          const style: React.CSSProperties = {
                            top: topPx + 1,
                            height: heightPx - 2,
                            left: PAD + depth * PEEK,
                            right: PAD,
                            zIndex: isFocused ? 50 : 10 + depth,
                            backgroundColor: colors.solidBg,
                          };

                          const timeStr = `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`;
                          const fullTitle = `${cls.name}\n${timeStr}${cls.coachName ? `\n${cls.coachName}` : ''}\n${cls.enrolled}/${cls.capacity}`;

                          return (
                            <div
                              key={cls.id}
                              title={fullTitle}
                              className={`calendar-class-block absolute rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg overflow-hidden group ${isFocused ? 'ring-2 ring-border shadow-xl shadow-black/10 dark:shadow-black/40' : depth > 0 ? 'shadow-md shadow-black/10 dark:shadow-black/30' : ''}`}
                              style={style}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = colors.solidHover; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = colors.solidBg; }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setFocusedClassId(cls.id);
                                setDetailClassId(cls.id);
                              }}
                            >
                              <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full" style={{ backgroundColor: colors.accent }} />
                              <div className={`pl-3 pr-2 ${isTiny ? 'py-1' : 'py-1.5'} overflow-hidden h-full flex flex-col ${isTiny ? 'justify-center' : 'justify-start'}`}>
                                <div className="flex items-center gap-1">
                                  <span className={`font-semibold truncate leading-tight text-white ${isTiny ? 'text-[10px]' : 'text-[11px]'}`}>
                                    {cls.name}
                                  </span>
                                  {!isTiny && <OccupancyBadge enrolled={cls.enrolled} capacity={cls.capacity} waitlistCount={cls.waitlistCount} />}
                                </div>
                                {!isTiny && (
                                  <div className="text-[10px] text-white/70 truncate mt-0.5">
                                    {format(start, 'h:mm')} - {format(end, 'h:mm a')}
                                  </div>
                                )}
                                {!isTiny && !isShort && (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    {cls.coachName && (
                                      <span className="text-[10px] text-white/60 truncate">{cls.coachName}</span>
                                    )}
                                    {!cls.coachId && (
                                      <span className="text-[9px] text-white/30 italic">No coach</span>
                                    )}
                                  </div>
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
                  style={{ top: nowLineTop, left: 52, right: 0 }}
                >
                  <div className="relative flex items-center">
                    <div className="h-3 w-3 rounded-full bg-red-400 -ml-1.5 shadow-[0_0_8px_rgba(248,113,113,0.6)] ring-2 ring-red-400/20" />
                    <div className="flex-1 h-[2px] bg-gradient-to-r from-red-400/70 to-red-400/20" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ScheduleDialogs
        activeGymId={activeGymId}
        canManage={canManage}
        canOperate={canOperate}
        activeStaff={activeStaff}
        createOpen={createOpen}
        setCreateOpen={setCreateOpen}
        formData={formData}
        setFormData={setFormData}
        handleCreateClass={handleCreateClass}
        createClassPending={createClassMutation.isPending}
        editOpen={editOpen}
        setEditOpen={setEditOpen}
        editClassData={editClassData}
        setEditClassData={setEditClassData}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        handleEditClass={handleEditClass}
        updateClassPending={updateClassMutation.isPending}
        detailClassId={detailClassId}
        setDetailClassId={setDetailClassId}
        focusedClassId={focusedClassId}
        setFocusedClassId={setFocusedClassId}
        classDetail={classDetail}
        detailLoading={detailLoading}
        openEditDialog={openEditDialog}
        handleAssignCoach={handleAssignCoach}
        handleUpdateAttendanceStatus={handleUpdateAttendanceStatus}
        handleDuplicateClass={handleDuplicateClass}
        deleteClassId={deleteClassId}
        setDeleteClassId={setDeleteClassId}
        handleDeleteClass={handleDeleteClass}
        deleteClassPending={deleteClassMutation.isPending}
        checkinClassId={checkinClassId}
        setCheckinClassId={setCheckinClassId}
        memberSearch={memberSearch}
        setMemberSearch={setMemberSearch}
        members={members}
        handleCheckIn={handleCheckIn}
        checkInPending={checkInMutation.isPending}
        copyWeekOpen={copyWeekOpen}
        setCopyWeekOpen={setCopyWeekOpen}
        copyWeekPreviewData={copyWeekPreviewData}
        setCopyWeekPreviewData={setCopyWeekPreviewData}
        handleCopyWeekConfirm={handleCopyWeekConfirm}
        previewCopyWeekPending={previewCopyWeekMutation.isPending}
        copyWeekPending={copyWeekMutation.isPending}
        previousWeekStart={previousWeekStart}
        currentWeekStart={currentWeekStart}
        clearWeekOpen={clearWeekOpen}
        setClearWeekOpen={setClearWeekOpen}
        handleClearWeek={handleClearWeek}
        clearWeekPending={clearWeekPending}
        classesCount={classes?.length || 0}
        saveTemplateOpen={saveTemplateOpen}
        setSaveTemplateOpen={setSaveTemplateOpen}
        templateName={templateName}
        setTemplateName={setTemplateName}
        handleSaveTemplate={handleSaveTemplate}
        createTemplatePending={createTemplateMutation.isPending}
        templateManagerOpen={templateManagerOpen}
        setTemplateManagerOpen={setTemplateManagerOpen}
        templates={templates}
        viewTemplateId={viewTemplateId}
        setViewTemplateId={setViewTemplateId}
        viewTemplateDetail={viewTemplateDetail}
        handleApplyTemplatePreview={handleApplyTemplatePreview}
        hasClassesThisWeek={hasClassesThisWeek}
        renameTemplateId={renameTemplateId}
        setRenameTemplateId={setRenameTemplateId}
        renameTemplateName={renameTemplateName}
        setRenameTemplateName={setRenameTemplateName}
        handleRenameTemplate={handleRenameTemplate}
        updateTemplatePending={updateTemplateMutation.isPending}
        deleteTemplateId={deleteTemplateId}
        setDeleteTemplateId={setDeleteTemplateId}
        handleDeleteTemplate={handleDeleteTemplate}
        deleteTemplatePending={deleteTemplateMutation.isPending}
        applyTemplateId={applyTemplateId}
        setApplyTemplateId={setApplyTemplateId}
        applyTemplatePreviewData={applyTemplatePreviewData}
        setApplyTemplatePreviewData={setApplyTemplatePreviewData}
        applySelectedItems={applySelectedItems}
        setApplySelectedItems={setApplySelectedItems}
        handleApplyTemplateConfirm={handleApplyTemplateConfirm}
        previewApplyPending={previewApplyMutation.isPending}
        applyTemplatePending={applyTemplateMutation.isPending}
        days={days}
      />
      </>)}
    </div>
  );
}
