import React, { useState, useMemo, useRef, useEffect } from "react";
import { useGym } from "@/store/GymContext";
import { useUserRole } from "@/components/programming/useUserRole";
import { useListClasses, useCreateClass, useGetClass, useDeleteClass, useCheckInToClass, useUpdateClass, useListMembers, useListStaff, getListClassesQueryKey, getGetClassQueryKey, usePreviewCopyWeek, useCopyWeek, useListClassTemplates, useCreateClassTemplate, useGetClassTemplate, useDeleteClassTemplate, useUpdateClassTemplate, usePreviewApplyTemplate, useApplyClassTemplate, getListClassTemplatesQueryKey } from "@workspace/api-client-react";
import type { StaffMember, CreateClassBodyType, Member, ClassTemplate, CopyWeekPreviewItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday, endOfWeek, getHours, getMinutes } from "date-fns";
import { Loader2, Plus, Users, Trash2, Search, UserCheck, X, ChevronLeft, ChevronRight, Copy, FileText, MoreHorizontal, Save, Play, Pencil, AlertTriangle, LayoutTemplate, CalendarDays, Filter, BookOpen, UserMinus, Check, XCircle, ArrowUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

const CLASS_TYPE_COLORS: Record<string, { solidBg: string; solidHover: string; accent: string; dot: string }> = {
  regular: { solidBg: "#1e5a8a", solidHover: "#22679e", accent: "#38bdf8", dot: "bg-sky-400" },
  personal_training: { solidBg: "#7a2481", solidHover: "#8e2b96", accent: "#e879f9", dot: "bg-fuchsia-400" },
  intro: { solidBg: "#3d6b1e", solidHover: "#477c24", accent: "#a3e635", dot: "bg-lime-400" },
  specialty: { solidBg: "#8a4a12", solidHover: "#9e5515", accent: "#fb923c", dot: "bg-orange-400" },
  open_gym: { solidBg: "#1a5e5e", solidHover: "#1f6e6e", accent: "#2dd4bf", dot: "bg-teal-400" },
};

function getClassColors(type: string) {
  return CLASS_TYPE_COLORS[type] || CLASS_TYPE_COLORS.regular;
}

const HOUR_HEIGHT = 64;
const CALENDAR_START_HOUR = 5;
const CALENDAR_END_HOUR = 22;

function OccupancyBadge({ enrolled, capacity, waitlistCount }: { enrolled: number; capacity: number; waitlistCount?: number }) {
  const pct = capacity > 0 ? (enrolled / capacity) * 100 : 0;
  const isFull = enrolled >= capacity;
  const hasWaitlist = (waitlistCount || 0) > 0;

  if (hasWaitlist) return <span className="text-[9px] font-bold text-orange-400 bg-orange-400/15 px-1.5 py-0.5 rounded-full">WAITLIST</span>;
  if (isFull) return <span className="text-[9px] font-bold text-red-400 bg-red-400/15 px-1.5 py-0.5 rounded-full">FULL</span>;
  if (pct >= 80) return <span className="text-[9px] font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full">{enrolled}/{capacity}</span>;
  return <span className="text-[9px] text-white/50 tabular-nums">{enrolled}/{capacity}</span>;
}

function AttendanceStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    reserved: { label: "Reserved", cls: "bg-sky-400/15 text-sky-400 border-sky-400/30" },
    checked_in: { label: "Checked In", cls: "bg-green-400/15 text-green-400 border-green-400/30" },
    present: { label: "Present", cls: "bg-green-400/15 text-green-400 border-green-400/30" },
    no_show: { label: "No Show", cls: "bg-red-400/15 text-red-400 border-red-400/30" },
    cancelled: { label: "Cancelled", cls: "bg-zinc-400/15 text-zinc-400 border-zinc-400/30" },
    waitlisted: { label: "Waitlisted", cls: "bg-orange-400/15 text-orange-400 border-orange-400/30" },
  };
  const c = config[status] || config.reserved;
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${c.cls}`}>{c.label}</span>;
}

export function Schedule() {
  const { activeGymId } = useGym();
  const { role, isStaff, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const calendarRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const canManage = role === "gym_owner" || role === "admin" || role === "owner";
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

  function to24Hour(hour: string, amPm: string): number {
    let h = parseInt(hour, 10);
    if (amPm === "AM" && h === 12) h = 0;
    if (amPm === "PM" && h !== 12) h += 12;
    return h;
  }

  function from24Hour(h: number): { hour: string; amPm: string } {
    if (h === 0) return { hour: "12", amPm: "AM" };
    if (h < 12) return { hour: String(h), amPm: "AM" };
    if (h === 12) return { hour: "12", amPm: "PM" };
    return { hour: String(h - 12), amPm: "PM" };
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

  const typeLabels: Record<string, string> = {
    regular: "Regular",
    personal_training: "Personal Training",
    intro: "Intro",
    specialty: "Specialty",
    open_gym: "Open Gym",
  };

  const hasActiveFilters = typeFilter !== "all" || coachFilter !== "all";

  return (
    <div className="h-full flex flex-col gap-3">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button onClick={handlePrevWeek} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors" aria-label="Previous week">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={handleNextWeek} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors" aria-label="Next week">
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
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
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
              <button className={`flex items-center justify-center gap-2 px-3 py-2 border rounded-xl text-sm transition-colors ${hasActiveFilters ? "border-primary/50 bg-primary/10 text-primary" : "border-border/50 hover:bg-white/5 text-muted-foreground hover:text-foreground"}`}>
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
                <button className="flex items-center justify-center gap-2 px-3 py-2 border border-border/50 hover:bg-white/5 text-muted-foreground hover:text-foreground rounded-xl text-sm transition-colors">
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
        </div>
      </header>

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
                          const isFull = cls.enrolled >= cls.capacity;

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
                              className={`calendar-class-block absolute rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg overflow-hidden group ${isFocused ? 'ring-2 ring-white/40 shadow-xl shadow-black/40' : depth > 0 ? 'shadow-md shadow-black/30' : ''}`}
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

      {/* ===== CREATE CLASS DIALOG ===== */}
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

      {/* ===== EDIT CLASS DIALOG ===== */}
      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) { setEditOpen(false); setEditClassData(null); } }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>
              {editClassData && (editClassData.enrolled > 0)
                ? `${editClassData.enrolled} member${editClassData.enrolled > 1 ? "s" : ""} currently enrolled. Changes may affect them.`
                : "Update class details."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditClass} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={editFormData.name} onChange={(e) => setEditFormData(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={editFormData.type} onValueChange={(v) => setEditFormData(p => ({ ...p, type: v }))}>
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
              <Label>Start Time *</Label>
              <div className="flex items-center gap-2">
                <Select value={editFormData.startHour} onValueChange={(v) => setEditFormData(p => ({ ...p, startHour: v }))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(h => <SelectItem key={h} value={String(h)}>{h}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-muted-foreground font-bold">:</span>
                <Select value={editFormData.startMinute} onValueChange={(v) => setEditFormData(p => ({ ...p, startMinute: v }))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{["00", "15", "30", "45"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={editFormData.startAmPm} onValueChange={(v) => setEditFormData(p => ({ ...p, startAmPm: v }))}>
                  <SelectTrigger className="w-[72px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>End Time *</Label>
              <div className="flex items-center gap-2">
                <Select value={editFormData.endHour} onValueChange={(v) => setEditFormData(p => ({ ...p, endHour: v }))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(h => <SelectItem key={h} value={String(h)}>{h}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-muted-foreground font-bold">:</span>
                <Select value={editFormData.endMinute} onValueChange={(v) => setEditFormData(p => ({ ...p, endMinute: v }))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{["00", "15", "30", "45"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={editFormData.endAmPm} onValueChange={(v) => setEditFormData(p => ({ ...p, endAmPm: v }))}>
                  <SelectTrigger className="w-[72px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Capacity *</Label>
                <Input type="number" min="1" value={editFormData.capacity} onChange={(e) => setEditFormData(p => ({ ...p, capacity: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Coach</Label>
                <Select value={editFormData.coachId} onValueChange={(v) => setEditFormData(p => ({ ...p, coachId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select coach" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Coach</SelectItem>
                    {activeStaff.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={editFormData.description} onChange={(e) => setEditFormData(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Member-Visible Notes</Label>
              <Textarea value={editFormData.memberNotes} onChange={(e) => setEditFormData(p => ({ ...p, memberNotes: e.target.value }))} placeholder="Visible to members (e.g., bring a towel, workout preview)" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Staff Notes (internal)</Label>
              <Textarea value={editFormData.staffNotes} onChange={(e) => setEditFormData(p => ({ ...p, staffNotes: e.target.value }))} placeholder="Only visible to staff" rows={2} />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editFormData.isBookable} onChange={(e) => setEditFormData(p => ({ ...p, isBookable: e.target.checked }))} className="rounded border-border" />
                Bookable
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editFormData.waitlistEnabled} onChange={(e) => setEditFormData(p => ({ ...p, waitlistEnabled: e.target.checked }))} className="rounded border-border" />
                Enable Waitlist
              </label>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => { setEditOpen(false); setEditClassData(null); }} className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button type="submit" disabled={updateClassMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {updateClassMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== CLASS DETAIL SHEET ===== */}
      <Sheet open={!!detailClassId} onOpenChange={(open) => { if (!open) { setDetailClassId(null); setFocusedClassId(null); } }}>
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
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{typeLabels[classDetail.type] || classDetail.type}</Badge>
                  <Badge variant={classDetail.status === "scheduled" ? "default" : "secondary"}>{classDetail.status}</Badge>
                  {classDetail.enrolled >= classDetail.capacity && <Badge variant="destructive">Full</Badge>}
                  {(classDetail as any).waitlistCount > 0 && <Badge variant="outline" className="border-orange-400/50 text-orange-400">{(classDetail as any).waitlistCount} waitlisted</Badge>}
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
                  {canManage ? (
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
                  ) : (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Coach</span>
                      <p className="font-medium">{classDetail.coachName || "No coach assigned"}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Capacity</span>
                    <p className="font-medium">{classDetail.enrolled} / {classDetail.capacity}</p>
                  </div>
                </div>
                {classDetail.description && <p className="text-sm text-muted-foreground">{classDetail.description}</p>}
                {(classDetail as any).memberNotes && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-xs font-medium text-primary mb-1">Notes</p>
                    <p className="text-sm text-foreground">{(classDetail as any).memberNotes}</p>
                  </div>
                )}
                {canManage && (classDetail as any).staffNotes && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Staff Notes (internal)</p>
                    <p className="text-sm text-foreground">{(classDetail as any).staffNotes}</p>
                  </div>
                )}
              </div>

              {/* Roster */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">Roster</h3>
                  {canOperate && (
                    <button onClick={() => setCheckinClassId(classDetail.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                      <UserCheck className="h-3.5 w-3.5" /> Check In
                    </button>
                  )}
                </div>
                {classDetail.roster?.length ? (
                  <div className="space-y-2">
                    {classDetail.roster.map((att: any) => (
                      <div key={att.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{att.memberName}</span>
                          <AttendanceStatusBadge status={att.status} />
                        </div>
                        {canOperate && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded hover:bg-muted/50 text-muted-foreground"><ArrowUpDown className="h-3.5 w-3.5" /></button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {att.status !== "checked_in" && att.status !== "present" && (
                                <DropdownMenuItem onClick={() => handleUpdateAttendanceStatus(att.id, "checked_in")}>
                                  <Check className="h-3.5 w-3.5 mr-2 text-green-400" /> Check In
                                </DropdownMenuItem>
                              )}
                              {att.status !== "no_show" && (
                                <DropdownMenuItem onClick={() => handleUpdateAttendanceStatus(att.id, "no_show")}>
                                  <XCircle className="h-3.5 w-3.5 mr-2 text-red-400" /> No Show
                                </DropdownMenuItem>
                              )}
                              {att.status !== "cancelled" && (
                                <DropdownMenuItem onClick={() => handleUpdateAttendanceStatus(att.id, "cancelled")}>
                                  <UserMinus className="h-3.5 w-3.5 mr-2 text-zinc-400" /> Cancel
                                </DropdownMenuItem>
                              )}
                              {att.status === "waitlisted" && (
                                <DropdownMenuItem onClick={() => handleUpdateAttendanceStatus(att.id, "reserved")}>
                                  <BookOpen className="h-3.5 w-3.5 mr-2 text-sky-400" /> Move to Reserved
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-border/50 rounded-xl">
                    <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No members yet.</p>
                    {canOperate && <p className="text-xs text-muted-foreground/60 mt-1">Use the Check In button to add members.</p>}
                  </div>
                )}
              </div>

              {/* Actions */}
              {canManage && (
                <div className="pt-3 border-t border-border space-y-2">
                  <button onClick={() => openEditDialog(classDetail)} className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors w-full justify-center border border-border">
                    <Pencil className="h-4 w-4" /> Edit Class
                  </button>
                  <button onClick={() => handleDuplicateClass(classDetail.id)} className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors w-full justify-center border border-border text-muted-foreground">
                    <Copy className="h-4 w-4" /> Duplicate Class
                  </button>
                  <button onClick={() => setDeleteClassId(classDetail.id)} className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg text-sm font-medium transition-colors w-full justify-center">
                    <Trash2 className="h-4 w-4" /> Delete Class
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ===== DELETE CLASS CONFIRM ===== */}
      <AlertDialog open={!!deleteClassId} onOpenChange={(open) => { if (!open) setDeleteClassId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this class? This action cannot be undone. All roster entries will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClass} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteClassMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== CHECK IN MEMBER DIALOG ===== */}
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
                <div className="text-center py-8">
                  <Search className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{memberSearch ? "No members found." : "Type to search members."}</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== COPY WEEK DIALOG ===== */}
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
                <div className="text-center py-8">
                  <CalendarDays className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No classes found in last week to copy.</p>
                </div>
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

      {/* ===== SAVE TEMPLATE DIALOG ===== */}
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

      {/* ===== TEMPLATE MANAGER SHEET ===== */}
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
                {templates.map((tmpl: any) => (
                  <div key={tmpl.id} className="p-4 rounded-xl border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">{tmpl.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{format(new Date(tmpl.createdAt), 'MMM d, yyyy')}</span>
                          {tmpl.totalClasses > 0 && <span className="text-xs text-muted-foreground/60">{tmpl.totalClasses} classes</span>}
                          {tmpl.usedCount > 0 && <span className="text-xs text-muted-foreground/60">Used {tmpl.usedCount}x</span>}
                        </div>
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
                        {(() => {
                          const items = [...((viewTemplateDetail as any).items || [])].sort((a: any, b: any) => {
                            if (a.weekday !== b.weekday) return a.weekday - b.weekday;
                            if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
                            return a.className.localeCompare(b.className);
                          });
                          let lastDay = -1;
                          return items.map((item: any, i: number) => {
                            const showDayHeader = item.weekday !== lastDay;
                            lastDay = item.weekday;
                            return (
                              <React.Fragment key={i}>
                                {showDayHeader && (
                                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pt-2 first:pt-0">{WEEKDAY_NAMES[item.weekday]}</div>
                                )}
                                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                                  <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${getClassColors(item.type).dot}`} />
                                    <span className="font-medium">{item.className}</span>
                                    <span className="text-xs text-muted-foreground">{item.startTime} - {item.endTime}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {item.coachName && <span className="text-xs text-muted-foreground/60">{item.coachName}</span>}
                                    <span className="text-xs text-muted-foreground/40">{item.capacity}p</span>
                                  </div>
                                </div>
                              </React.Fragment>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ===== APPLY TEMPLATE PREVIEW DIALOG ===== */}
      <Dialog open={!!applyTemplateId && !!applyTemplatePreviewData} onOpenChange={(open) => { if (!open) { setApplyTemplateId(null); setApplyTemplatePreviewData(null); setApplySelectedItems(new Set()); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply Template</DialogTitle>
            <DialogDescription>Apply template to the week of {format(currentWeekStart, 'MMM d, yyyy')}. Deselect any classes you don't want to create.</DialogDescription>
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
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-foreground">Classes to create ({applySelectedItems.size} of {applyTemplatePreviewData.toCreate.length} selected)</h4>
                    <button
                      type="button"
                      onClick={() => {
                        if (applySelectedItems.size === applyTemplatePreviewData.toCreate.length) {
                          setApplySelectedItems(new Set());
                        } else {
                          setApplySelectedItems(new Set(applyTemplatePreviewData.toCreate.map((_, i) => i)));
                        }
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      {applySelectedItems.size === applyTemplatePreviewData.toCreate.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {(() => {
                      const sorted = applyTemplatePreviewData.toCreate.map((item, origIdx) => ({ item, origIdx })).sort((a, b) => {
                        if ((a.item.weekday || 0) !== (b.item.weekday || 0)) return (a.item.weekday || 0) - (b.item.weekday || 0);
                        return (a.item.startTime || "").localeCompare(b.item.startTime || "");
                      });
                      let lastDay = -1;
                      return sorted.map(({ item, origIdx }) => {
                        const showDayHeader = (item.weekday || 0) !== lastDay;
                        lastDay = item.weekday || 0;
                        const isSelected = applySelectedItems.has(origIdx);
                        return (
                          <React.Fragment key={origIdx}>
                            {showDayHeader && (
                              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pt-2 first:pt-0">{WEEKDAY_NAMES[item.weekday || 0]}</div>
                            )}
                            <label className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${isSelected ? "border-primary/40 bg-green-500/5" : "border-border opacity-50"}`}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  const next = new Set(applySelectedItems);
                                  if (isSelected) next.delete(origIdx); else next.add(origIdx);
                                  setApplySelectedItems(next);
                                }}
                                className="rounded border-border"
                              />
                              <div className="flex-1 flex items-center justify-between">
                                <div><span className="text-sm font-medium">{item.name}</span><span className="text-xs text-muted-foreground ml-2">{item.startTime} - {item.endTime}</span></div>
                                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">New</Badge>
                              </div>
                            </label>
                          </React.Fragment>
                        );
                      });
                    })()}
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
                <div className="text-center py-8">
                  <LayoutTemplate className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">This template has no items.</p>
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <button type="button" onClick={() => { setApplyTemplateId(null); setApplyTemplatePreviewData(null); setApplySelectedItems(new Set()); }} className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
            <button type="button" onClick={handleApplyTemplateConfirm} disabled={applyTemplateMutation.isPending || !applyTemplatePreviewData || applySelectedItems.size === 0} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {applyTemplateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Apply ${applySelectedItems.size} Classes`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== RENAME TEMPLATE ===== */}
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

      {/* ===== DELETE TEMPLATE CONFIRM ===== */}
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
