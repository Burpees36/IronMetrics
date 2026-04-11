import React, { useState, useMemo } from "react";
import { useGym } from "@/store/GymContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  useListAppointmentTypes,
  useCreateAppointmentType,
  useUpdateAppointmentType,
  useDeleteAppointmentType,
  useListCoachAvailability,
  useCreateCoachAvailability,
  useDeleteCoachAvailability,
  useListAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
  useListStaff,
  useListMembers,
  useListLeads,
  getListAppointmentTypesQueryKey,
  getListCoachAvailabilityQueryKey,
  getListAppointmentsQueryKey,
} from "@workspace/api-client-react";
import type { AppointmentType, Appointment as AppointmentData, CoachAvailabilitySlot } from "@workspace/api-client-react";
import { format, startOfWeek, addDays, endOfWeek, addWeeks, subWeeks, isSameDay, isToday, getHours, getMinutes } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Settings, Clock, User, Calendar, Trash2, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { HOUR_HEIGHT, CALENDAR_START_HOUR, CALENDAR_END_HOUR } from "./helpers";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const APPOINTMENT_STATUS_COLORS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "bg-sky-500/15 text-sky-500 border-sky-500/30" },
  completed: { label: "Completed", cls: "bg-green-500/15 text-green-500 border-green-500/30" },
  cancelled: { label: "Cancelled", cls: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30" },
  no_show: { label: "No Show", cls: "bg-red-500/15 text-red-500 border-red-500/30" },
};

interface AppointmentsPanelProps {
  weekOffset: number;
  currentWeekStart: Date;
  canManage: boolean;
  canOperate: boolean;
}

export function AppointmentsPanel({ weekOffset, currentWeekStart, canManage, canOperate }: AppointmentsPanelProps) {
  const { activeGymId } = useGym();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"calendar" | "types" | "availability">("calendar");
  const [bookOpen, setBookOpen] = useState(false);
  const [detailAppt, setDetailAppt] = useState<AppointmentData | null>(null);
  const [deleteApptId, setDeleteApptId] = useState<number | null>(null);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [availDialogOpen, setAvailDialogOpen] = useState(false);
  const [deleteTypeId, setDeleteTypeId] = useState<number | null>(null);
  const [deleteAvailId, setDeleteAvailId] = useState<number | null>(null);
  const [memberSearch, setMemberSearch] = useState("");

  const weekEnd = useMemo(() => endOfWeek(currentWeekStart, { weekStartsOn: 1 }), [currentWeekStart]);
  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i)), [currentWeekStart]);

  const { data: appointmentTypes } = useListAppointmentTypes(activeGymId as number, {
    query: { enabled: !!activeGymId },
  });

  const { data: availability } = useListCoachAvailability(activeGymId as number, {}, {
    query: { enabled: !!activeGymId },
  });

  const { data: appointments, isLoading: appointmentsLoading } = useListAppointments(
    activeGymId as number,
    { startDate: currentWeekStart.toISOString(), endDate: weekEnd.toISOString() },
    { query: { enabled: !!activeGymId } }
  );

  const { data: staffList } = useListStaff(activeGymId as number, {
    query: { enabled: !!activeGymId },
  });
  const activeStaff = useMemo(() => (staffList || []).filter((s: any) => s.isActive), [staffList]);

  const { data: membersData } = useListMembers(
    activeGymId as number,
    { search: memberSearch || undefined, limit: 20 },
    { query: { enabled: !!activeGymId && bookOpen } }
  );

  const { data: leadsData } = useListLeads(
    activeGymId as number,
    { search: memberSearch || undefined },
    { query: { enabled: !!activeGymId && bookOpen } }
  );

  const createTypeMutation = useCreateAppointmentType();
  const updateTypeMutation = useUpdateAppointmentType();
  const deleteTypeMutation = useDeleteAppointmentType();
  const createAvailMutation = useCreateCoachAvailability();
  const deleteAvailMutation = useDeleteCoachAvailability();
  const createApptMutation = useCreateAppointment();
  const updateApptMutation = useUpdateAppointment();
  const deleteApptMutation = useDeleteAppointment();

  const [typeForm, setTypeForm] = useState({ name: "", description: "", durationMinutes: "30", color: "#6366f1", isFree: false, price: "" });
  const [availForm, setAvailForm] = useState({ coachId: "", dayOfWeek: "1", startTime: "09:00", endTime: "17:00" });
  const [bookForm, setBookForm] = useState({ appointmentTypeId: "", coachId: "", date: "", time: "09:00", memberId: "", leadId: "", notes: "", bookingFor: "member" as "member" | "lead" });

  const appointmentsByDay = useMemo(() => {
    const map: Record<number, AppointmentData[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    if (!appointments) return map;
    for (const appt of appointments) {
      const apptDate = new Date(appt.startTime);
      for (let i = 0; i < 7; i++) {
        if (isSameDay(apptDate, days[i])) {
          map[i].push(appt);
          break;
        }
      }
    }
    for (let i = 0; i < 7; i++) {
      map[i].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }
    return map;
  }, [appointments, days]);

  function invalidateAll() {
    if (!activeGymId) return;
    queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey(activeGymId) });
    queryClient.invalidateQueries({ queryKey: getListAppointmentTypesQueryKey(activeGymId) });
    queryClient.invalidateQueries({ queryKey: getListCoachAvailabilityQueryKey(activeGymId) });
  }

  function handleCreateType(e: React.FormEvent) {
    e.preventDefault();
    if (!activeGymId || !typeForm.name.trim()) return;
    createTypeMutation.mutate(
      {
        gymId: activeGymId,
        data: {
          name: typeForm.name.trim(),
          description: typeForm.description || null,
          durationMinutes: parseInt(typeForm.durationMinutes, 10) || 30,
          color: typeForm.color,
          isFree: typeForm.isFree,
          price: typeForm.price ? parseInt(typeForm.price, 10) : null,
        },
      },
      {
        onSuccess: () => {
          invalidateAll();
          setTypeDialogOpen(false);
          setTypeForm({ name: "", description: "", durationMinutes: "30", color: "#6366f1", isFree: false, price: "" });
          toast({ title: "Appointment Type Created" });
        },
        onError: (err: any) => toast({ title: "Error", description: err?.data?.error || "Failed to create" }),
      }
    );
  }

  function handleDeleteType() {
    if (!activeGymId || !deleteTypeId) return;
    deleteTypeMutation.mutate(
      { gymId: activeGymId, typeId: deleteTypeId },
      {
        onSuccess: () => { invalidateAll(); setDeleteTypeId(null); toast({ title: "Appointment Type Deleted" }); },
        onError: (err: any) => toast({ title: "Error", description: err?.data?.error || "Failed to delete" }),
      }
    );
  }

  function handleCreateAvailability(e: React.FormEvent) {
    e.preventDefault();
    if (!activeGymId || !availForm.coachId) return;
    createAvailMutation.mutate(
      {
        gymId: activeGymId,
        data: {
          coachId: parseInt(availForm.coachId, 10),
          dayOfWeek: parseInt(availForm.dayOfWeek, 10),
          startTime: availForm.startTime,
          endTime: availForm.endTime,
        },
      },
      {
        onSuccess: () => {
          invalidateAll();
          setAvailDialogOpen(false);
          setAvailForm({ coachId: "", dayOfWeek: "1", startTime: "09:00", endTime: "17:00" });
          toast({ title: "Availability Slot Added" });
        },
        onError: (err: any) => toast({ title: "Error", description: err?.data?.error || "Failed to add" }),
      }
    );
  }

  function handleDeleteAvailability() {
    if (!activeGymId || !deleteAvailId) return;
    deleteAvailMutation.mutate(
      { gymId: activeGymId, slotId: deleteAvailId },
      {
        onSuccess: () => { invalidateAll(); setDeleteAvailId(null); toast({ title: "Availability Slot Deleted" }); },
        onError: (err: any) => toast({ title: "Error", description: err?.data?.error || "Failed to delete" }),
      }
    );
  }

  function handleBookAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!activeGymId || !bookForm.appointmentTypeId || !bookForm.coachId || !bookForm.date || !bookForm.time) return;
    const startTime = new Date(`${bookForm.date}T${bookForm.time}:00`);
    createApptMutation.mutate(
      {
        gymId: activeGymId,
        data: {
          appointmentTypeId: parseInt(bookForm.appointmentTypeId, 10),
          coachId: parseInt(bookForm.coachId, 10),
          startTime: startTime.toISOString(),
          memberId: bookForm.bookingFor === "member" && bookForm.memberId ? parseInt(bookForm.memberId, 10) : null,
          leadId: bookForm.bookingFor === "lead" && bookForm.leadId ? parseInt(bookForm.leadId, 10) : null,
          notes: bookForm.notes || null,
        },
      },
      {
        onSuccess: () => {
          invalidateAll();
          setBookOpen(false);
          setBookForm({ appointmentTypeId: "", coachId: "", date: "", time: "09:00", memberId: "", leadId: "", notes: "", bookingFor: "member" });
          setMemberSearch("");
          toast({ title: "Appointment Booked" });
        },
        onError: (err: any) => toast({ title: "Error", description: err?.data?.error || "Failed to book" }),
      }
    );
  }

  function handleUpdateApptStatus(appointmentId: number, status: string) {
    if (!activeGymId) return;
    updateApptMutation.mutate(
      { gymId: activeGymId, appointmentId, data: { status: status as any } },
      {
        onSuccess: () => {
          invalidateAll();
          setDetailAppt(null);
          toast({ title: "Status Updated" });
        },
        onError: (err: any) => toast({ title: "Error", description: err?.data?.error || "Failed to update" }),
      }
    );
  }

  function handleDeleteAppt() {
    if (!activeGymId || !deleteApptId) return;
    deleteApptMutation.mutate(
      { gymId: activeGymId, appointmentId: deleteApptId },
      {
        onSuccess: () => {
          invalidateAll();
          setDeleteApptId(null);
          setDetailAppt(null);
          toast({ title: "Appointment Deleted" });
        },
        onError: (err: any) => toast({ title: "Error", description: err?.data?.error || "Failed to delete" }),
      }
    );
  }

  function getTypeName(typeId: number): string {
    return appointmentTypes?.find((t) => t.id === typeId)?.name || "Appointment";
  }

  function getTypeColor(typeId: number): string {
    return appointmentTypes?.find((t) => t.id === typeId)?.color || "#6366f1";
  }

  const totalHours = CALENDAR_END_HOUR - CALENDAR_START_HOUR;
  const calendarHeight = totalHours * HOUR_HEIGHT;
  const hours = Array.from({ length: totalHours }, (_, i) => CALENDAR_START_HOUR + i);

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5">
          {[
            { key: "calendar" as const, label: "Calendar" },
            { key: "types" as const, label: "Types" },
            { key: "availability" as const, label: "Availability" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "calendar" && (
            <button
              onClick={() => {
                setBookForm((f) => ({
                  ...f,
                  date: format(days[0], "yyyy-MM-dd"),
                }));
                setBookOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-primary/20"
            >
              <Plus className="h-4 w-4" />
              <span>Book Appointment</span>
            </button>
          )}
          {activeTab === "types" && canManage && (
            <button
              onClick={() => setTypeDialogOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-primary/20"
            >
              <Plus className="h-4 w-4" />
              <span>New Type</span>
            </button>
          )}
          {activeTab === "availability" && canManage && (
            <button
              onClick={() => setAvailDialogOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-primary/20"
            >
              <Plus className="h-4 w-4" />
              <span>Add Slot</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === "calendar" && (
        <div className="flex-1 bg-card/50 border border-border/40 rounded-2xl overflow-hidden flex flex-col min-h-0 backdrop-blur-sm">
          <div className="grid shrink-0 border-b border-border/40" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
            <div className="border-r border-border/30" />
            {days.map((day, i) => {
              const today = isToday(day);
              return (
                <div key={i} className="py-3 px-1 text-center border-r border-border/30 last:border-r-0">
                  <div className={`text-[11px] font-medium tracking-wider ${today ? "text-primary" : "text-muted-foreground/50"}`}>
                    {format(day, "EEE").toLowerCase()}
                  </div>
                  <div className={`mt-0.5 inline-flex items-center justify-center ${today ? "h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-base" : "text-lg font-semibold text-foreground/80"}`}>
                    {format(day, "d")}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {appointmentsLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : (
              <div className="relative" style={{ height: calendarHeight, minHeight: calendarHeight }}>
                <div className="absolute inset-0 grid" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
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
                    const dayAppts = appointmentsByDay[dayIndex] || [];
                    return (
                      <div key={dayIndex} className={`relative border-r border-border/30 last:border-r-0 ${today ? "bg-primary/[0.03]" : ""}`}>
                        {hours.map((hour) => (
                          <div key={hour} className="absolute left-0 right-0 border-t border-border/20" style={{ top: (hour - CALENDAR_START_HOUR) * HOUR_HEIGHT }} />
                        ))}
                        {dayAppts.map((appt) => {
                          const start = new Date(appt.startTime);
                          const end = new Date(appt.endTime);
                          const startMin = getHours(start) * 60 + getMinutes(start);
                          const endMin = getHours(end) * 60 + getMinutes(end);
                          const topPx = ((startMin / 60) - CALENDAR_START_HOUR) * HOUR_HEIGHT;
                          const heightPx = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 34);
                          const color = getTypeColor(appt.appointmentTypeId);
                          const isTiny = heightPx < 44;

                          return (
                            <div
                              key={appt.id}
                              className="absolute left-1 right-1 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg overflow-hidden border-l-[3px]"
                              style={{
                                top: topPx + 1,
                                height: heightPx - 2,
                                backgroundColor: `${color}20`,
                                borderLeftColor: color,
                                zIndex: 10,
                              }}
                              onClick={() => setDetailAppt(appt)}
                            >
                              <div className={`px-2 ${isTiny ? "py-0.5" : "py-1.5"} overflow-hidden h-full flex flex-col justify-center`}>
                                <span className={`font-semibold truncate leading-tight ${isTiny ? "text-[10px]" : "text-[11px]"}`} style={{ color }}>
                                  {getTypeName(appt.appointmentTypeId)}
                                </span>
                                {!isTiny && (
                                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                                    {appt.memberName || appt.leadName || "Unassigned"} · {appt.coachName}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "types" && (
        <div className="flex-1 overflow-y-auto">
          {!appointmentTypes || appointmentTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Settings className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No appointment types configured yet.</p>
              {canManage && (
                <button onClick={() => setTypeDialogOpen(true)} className="text-sm text-primary hover:text-primary/80">
                  Create your first type
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {appointmentTypes.map((type) => (
                <div key={type.id} className="bg-card border border-border/40 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: type.color }} />
                      <span className="font-semibold text-sm">{type.name}</span>
                    </div>
                    {canManage && (
                      <button onClick={() => setDeleteTypeId(type.id)} className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {type.description && <p className="text-xs text-muted-foreground">{type.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{type.durationMinutes} min</span>
                    <span>{type.isFree ? "Free" : type.price ? `$${type.price}` : "—"}</span>
                    <Badge variant={type.isActive ? "default" : "secondary"} className="text-[10px]">{type.isActive ? "Active" : "Inactive"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "availability" && (
        <div className="flex-1 overflow-y-auto">
          {!availability || availability.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Calendar className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No coach availability set up yet.</p>
              {canManage && (
                <button onClick={() => setAvailDialogOpen(true)} className="text-sm text-primary hover:text-primary/80">
                  Add availability
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {activeStaff.map((coach: any) => {
                const coachSlots = (availability || []).filter((s) => s.coachId === coach.id);
                if (coachSlots.length === 0) return null;
                return (
                  <div key={coach.id} className="bg-card border border-border/40 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">{coach.firstName} {coach.lastName}</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {coachSlots.map((slot) => (
                        <div key={slot.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                          <div className="text-xs">
                            <span className="font-medium">{DAY_NAMES[slot.dayOfWeek]}</span>
                            <span className="text-muted-foreground ml-2">{slot.startTime} – {slot.endTime}</span>
                          </div>
                          {canManage && (
                            <button onClick={() => setDeleteAvailId(slot.id)} className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Appointment Type</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateType} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={typeForm.name} onChange={(e) => setTypeForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. No Sweat Intro" required />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={typeForm.description} onChange={(e) => setTypeForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duration (minutes)</Label>
                <Input type="number" value={typeForm.durationMinutes} onChange={(e) => setTypeForm((f) => ({ ...f, durationMinutes: e.target.value }))} min="5" max="480" />
              </div>
              <div>
                <Label>Color</Label>
                <Input type="color" value={typeForm.color} onChange={(e) => setTypeForm((f) => ({ ...f, color: e.target.value }))} className="h-10" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={typeForm.isFree} onChange={(e) => setTypeForm((f) => ({ ...f, isFree: e.target.checked }))} className="rounded" />
                Free
              </label>
              {!typeForm.isFree && (
                <div className="flex-1">
                  <Input type="number" value={typeForm.price} onChange={(e) => setTypeForm((f) => ({ ...f, price: e.target.value }))} placeholder="Price ($)" min="0" />
                </div>
              )}
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setTypeDialogOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button type="submit" disabled={createTypeMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {createTypeMutation.isPending ? "Creating..." : "Create"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={availDialogOpen} onOpenChange={setAvailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Availability Slot</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAvailability} className="space-y-4">
            <div>
              <Label>Coach</Label>
              <Select value={availForm.coachId} onValueChange={(v) => setAvailForm((f) => ({ ...f, coachId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select coach" /></SelectTrigger>
                <SelectContent>
                  {activeStaff.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Day of Week</Label>
              <Select value={availForm.dayOfWeek} onValueChange={(v) => setAvailForm((f) => ({ ...f, dayOfWeek: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((name, i) => (
                    <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={availForm.startTime} onChange={(e) => setAvailForm((f) => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={availForm.endTime} onChange={(e) => setAvailForm((f) => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setAvailDialogOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button type="submit" disabled={createAvailMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {createAvailMutation.isPending ? "Adding..." : "Add Slot"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={bookOpen} onOpenChange={setBookOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBookAppointment} className="space-y-4">
            <div>
              <Label>Appointment Type</Label>
              <Select value={bookForm.appointmentTypeId} onValueChange={(v) => setBookForm((f) => ({ ...f, appointmentTypeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {(appointmentTypes || []).filter((t) => t.isActive).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name} ({t.durationMinutes} min)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Coach</Label>
              <Select value={bookForm.coachId} onValueChange={(v) => setBookForm((f) => ({ ...f, coachId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select coach" /></SelectTrigger>
                <SelectContent>
                  {activeStaff.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={bookForm.date} onChange={(e) => setBookForm((f) => ({ ...f, date: e.target.value }))} required />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={bookForm.time} onChange={(e) => setBookForm((f) => ({ ...f, time: e.target.value }))} required />
              </div>
            </div>
            <div>
              <Label>Booking For</Label>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setBookForm((f) => ({ ...f, bookingFor: "member", leadId: "" }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${bookForm.bookingFor === "member" ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground"}`}
                >Member</button>
                <button type="button" onClick={() => setBookForm((f) => ({ ...f, bookingFor: "lead", memberId: "" }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${bookForm.bookingFor === "lead" ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground"}`}
                >Lead</button>
              </div>
            </div>
            <div>
              <Label>{bookForm.bookingFor === "member" ? "Member" : "Lead"}</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={`Search ${bookForm.bookingFor}s...`}
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              {memberSearch && (
                <div className="mt-1 max-h-32 overflow-y-auto border border-border rounded-lg bg-background">
                  {bookForm.bookingFor === "member" ? (
                    (membersData?.members || []).map((m: any) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => { setBookForm((f) => ({ ...f, memberId: String(m.id) })); setMemberSearch(`${m.firstName} ${m.lastName}`); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                      >
                        {m.firstName} {m.lastName} <span className="text-muted-foreground text-xs">({m.email})</span>
                      </button>
                    ))
                  ) : (
                    (leadsData || []).map((l: any) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => { setBookForm((f) => ({ ...f, leadId: String(l.id) })); setMemberSearch(`${l.firstName} ${l.lastName}`); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                      >
                        {l.firstName} {l.lastName} <span className="text-muted-foreground text-xs">({l.email})</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={bookForm.notes} onChange={(e) => setBookForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" rows={2} />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setBookOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button type="submit" disabled={createApptMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {createApptMutation.isPending ? "Booking..." : "Book Appointment"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={!!detailAppt} onOpenChange={(o) => { if (!o) setDetailAppt(null); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {detailAppt && (
            <>
              <SheetHeader>
                <SheetTitle>{getTypeName(detailAppt.appointmentTypeId)}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-2">
                  {(() => {
                    const sc = APPOINTMENT_STATUS_COLORS[detailAppt.status] || APPOINTMENT_STATUS_COLORS.scheduled;
                    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sc.cls}`}>{sc.label}</span>;
                  })()}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span>{format(new Date(detailAppt.startTime), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span>{format(new Date(detailAppt.startTime), "h:mm a")} – {format(new Date(detailAppt.endTime), "h:mm a")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coach</span>
                    <span>{detailAppt.coachName || "—"}</span>
                  </div>
                  {detailAppt.memberName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member</span>
                      <span>{detailAppt.memberName}</span>
                    </div>
                  )}
                  {detailAppt.leadName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lead</span>
                      <span>{detailAppt.leadName}</span>
                    </div>
                  )}
                  {detailAppt.notes && (
                    <div>
                      <span className="text-muted-foreground block mb-1">Notes</span>
                      <p className="text-foreground bg-muted/30 rounded-lg px-3 py-2 text-xs">{detailAppt.notes}</p>
                    </div>
                  )}
                </div>
                {canOperate && detailAppt.status === "scheduled" && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <button onClick={() => handleUpdateApptStatus(detailAppt.id, "completed")} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/15 text-green-500 hover:bg-green-500/25 transition-colors">
                      Mark Completed
                    </button>
                    <button onClick={() => handleUpdateApptStatus(detailAppt.id, "no_show")} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-500 hover:bg-red-500/25 transition-colors">
                      No Show
                    </button>
                    <button onClick={() => handleUpdateApptStatus(detailAppt.id, "cancelled")} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-500/15 text-zinc-500 hover:bg-zinc-500/25 transition-colors">
                      Cancel
                    </button>
                  </div>
                )}
                {canManage && (
                  <button
                    onClick={() => setDeleteApptId(detailAppt.id)}
                    className="w-full mt-2 px-3 py-2 rounded-lg text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
                  >
                    Delete Appointment
                  </button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTypeId} onOpenChange={(o) => { if (!o) setDeleteTypeId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment Type?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this appointment type.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteType} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteAvailId} onOpenChange={(o) => { if (!o) setDeleteAvailId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Availability Slot?</AlertDialogTitle>
            <AlertDialogDescription>This will remove this availability slot.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAvailability} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteApptId} onOpenChange={(o) => { if (!o) setDeleteApptId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this appointment.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAppt} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
