import React, { useState, useMemo } from "react";
import { useGym } from "@/store/GymContext";
import { useListClasses, useCreateClass, useGetClass, useDeleteClass, useCheckInToClass, useUpdateClass, useListMembers, useListStaff, getListClassesQueryKey, getGetClassQueryKey } from "@workspace/api-client-react";
import type { StaffMember, CreateClassBodyType, Member } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday, endOfWeek } from "date-fns";
import { motion } from "framer-motion";
import { Loader2, Plus, Clock, Users, Trash2, Search, UserCheck, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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
  });

  const createClassMutation = useCreateClass();
  const deleteClassMutation = useDeleteClass();
  const checkInMutation = useCheckInToClass();
  const updateClassMutation = useUpdateClass();

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
    setFormData({ name: "", date: "", startHour: "9", startMinute: "00", startAmPm: "AM", endHour: "10", endMinute: "00", endAmPm: "AM", capacity: "", coachId: "none", description: "", type: "regular" });
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

    createClassMutation.mutate(
      {
        gymId: activeGymId,
        data: {
          name: formData.name,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          capacity: parseInt(formData.capacity, 10),
          type: formData.type as CreateClassBodyType,
          description: formData.description || null,
          coachId: formData.coachId && formData.coachId !== "none" ? parseInt(formData.coachId, 10) : null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Class Created", description: `${formData.name} has been scheduled.` });
          queryClient.invalidateQueries({ queryKey: getListClassesQueryKey(activeGymId) });
          setCreateOpen(false);
          resetForm();
        },
        onError: (error: any) => {
          const message = error?.data?.error || error?.message || "Failed to create class.";
          toast({ title: "Error", description: message });
        },
      }
    );
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
        <button
          onClick={openCreateDialog}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 min-h-[44px] w-full sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          <span>New Class</span>
        </button>
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
            )) : (
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
    </div>
  );
}
