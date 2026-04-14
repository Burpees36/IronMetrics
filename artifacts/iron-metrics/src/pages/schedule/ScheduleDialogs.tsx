import React from "react";
import { format } from "date-fns";
import { Loader2, Search, UserCheck, Trash2, Copy, FileText, Save, Play, Pencil, AlertTriangle, LayoutTemplate, CalendarDays, BookOpen, UserMinus, Check, XCircle, ArrowUpDown, Users, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import type { StaffMember, Member, CopyWeekPreviewItem } from "@workspace/api-client-react";
import { AttendanceStatusBadge, getClassColors, TYPE_LABELS, WEEKDAY_NAMES } from "./helpers";

export interface ScheduleDialogsProps {
  activeGymId: number | null;
  canManage: boolean;
  canOperate: boolean;
  activeStaff: StaffMember[];

  createOpen: boolean;
  setCreateOpen: (v: boolean) => void;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleCreateClass: (e: React.FormEvent) => void;
  createClassPending: boolean;

  editOpen: boolean;
  setEditOpen: (v: boolean) => void;
  editClassData: any;
  setEditClassData: (v: any) => void;
  editFormData: any;
  setEditFormData: React.Dispatch<React.SetStateAction<any>>;
  handleEditClass: (e: React.FormEvent) => void;
  updateClassPending: boolean;

  detailClassId: number | null;
  setDetailClassId: (v: number | null) => void;
  focusedClassId: number | null;
  setFocusedClassId: (v: number | null) => void;
  classDetail: any;
  detailLoading: boolean;
  openEditDialog: (cls: any) => void;
  handleAssignCoach: (coachId: string) => void;
  handleUpdateAttendanceStatus: (attendanceId: number, newStatus: string) => void;
  handleDuplicateClass: (classId: number) => void;

  deleteClassId: number | null;
  setDeleteClassId: (v: number | null) => void;
  handleDeleteClass: () => void;
  deleteClassPending: boolean;

  checkinClassId: number | null;
  setCheckinClassId: (v: number | null) => void;
  memberSearch: string;
  setMemberSearch: (v: string) => void;
  members: Member[];
  handleCheckIn: (memberId: number) => void;
  checkInPending: boolean;

  copyWeekOpen: boolean;
  setCopyWeekOpen: (v: boolean) => void;
  copyWeekPreviewData: { toCreate: CopyWeekPreviewItem[]; toSkip: CopyWeekPreviewItem[]; warnings: string[] } | null;
  setCopyWeekPreviewData: (v: any) => void;
  handleCopyWeekConfirm: () => void;
  previewCopyWeekPending: boolean;
  copyWeekPending: boolean;
  previousWeekStart: Date;
  currentWeekStart: Date;

  clearWeekOpen: boolean;
  setClearWeekOpen: (v: boolean) => void;
  handleClearWeek: () => void;
  clearWeekPending: boolean;
  classesCount: number;

  saveTemplateOpen: boolean;
  setSaveTemplateOpen: (v: boolean) => void;
  templateName: string;
  setTemplateName: (v: string) => void;
  handleSaveTemplate: (e: React.FormEvent) => void;
  createTemplatePending: boolean;

  templateManagerOpen: boolean;
  setTemplateManagerOpen: (v: boolean) => void;
  templates: any[] | undefined;
  viewTemplateId: number | null;
  setViewTemplateId: (v: number | null) => void;
  viewTemplateDetail: any;
  handleApplyTemplatePreview: (templateId: number) => void;
  hasClassesThisWeek: boolean;

  renameTemplateId: number | null;
  setRenameTemplateId: (v: number | null) => void;
  renameTemplateName: string;
  setRenameTemplateName: (v: string) => void;
  handleRenameTemplate: (e: React.FormEvent) => void;
  updateTemplatePending: boolean;

  deleteTemplateId: number | null;
  setDeleteTemplateId: (v: number | null) => void;
  handleDeleteTemplate: () => void;
  deleteTemplatePending: boolean;

  applyTemplateId: number | null;
  setApplyTemplateId: (v: number | null) => void;
  applyTemplatePreviewData: { toCreate: CopyWeekPreviewItem[]; toSkip: CopyWeekPreviewItem[]; warnings: string[] } | null;
  setApplyTemplatePreviewData: (v: any) => void;
  applySelectedItems: Set<number>;
  setApplySelectedItems: (v: Set<number>) => void;
  handleApplyTemplateConfirm: () => void;
  previewApplyPending: boolean;
  applyTemplatePending: boolean;

  days: Date[];
}

export function ScheduleDialogs(props: ScheduleDialogsProps) {
  const {
    activeGymId, canManage, canOperate, activeStaff,
    createOpen, setCreateOpen, formData, setFormData, handleCreateClass, createClassPending,
    editOpen, setEditOpen, editClassData, setEditClassData, editFormData, setEditFormData, handleEditClass, updateClassPending,
    detailClassId, setDetailClassId, focusedClassId, setFocusedClassId, classDetail, detailLoading,
    openEditDialog, handleAssignCoach, handleUpdateAttendanceStatus, handleDuplicateClass,
    deleteClassId, setDeleteClassId, handleDeleteClass, deleteClassPending,
    checkinClassId, setCheckinClassId, memberSearch, setMemberSearch, members, handleCheckIn, checkInPending,
    copyWeekOpen, setCopyWeekOpen, copyWeekPreviewData, setCopyWeekPreviewData,
    handleCopyWeekConfirm, previewCopyWeekPending, copyWeekPending, previousWeekStart, currentWeekStart,
    clearWeekOpen, setClearWeekOpen, handleClearWeek, clearWeekPending, classesCount,
    saveTemplateOpen, setSaveTemplateOpen, templateName, setTemplateName, handleSaveTemplate, createTemplatePending,
    templateManagerOpen, setTemplateManagerOpen, templates, viewTemplateId, setViewTemplateId, viewTemplateDetail,
    handleApplyTemplatePreview, hasClassesThisWeek,
    renameTemplateId, setRenameTemplateId, renameTemplateName, setRenameTemplateName, handleRenameTemplate, updateTemplatePending,
    deleteTemplateId, setDeleteTemplateId, handleDeleteTemplate, deleteTemplatePending,
    applyTemplateId, setApplyTemplateId, applyTemplatePreviewData, setApplyTemplatePreviewData,
    applySelectedItems, setApplySelectedItems, handleApplyTemplateConfirm, previewApplyPending, applyTemplatePending,
    days,
  } = props;

  const typeLabels = TYPE_LABELS;

  return (
    <>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
            <DialogDescription>Schedule a new class for your gym.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateClass} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class-name">Name *</Label>
              <Input id="class-name" value={formData.name} onChange={(e) => setFormData((p: any) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-type">Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData((p: any) => ({ ...p, type: v }))}>
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
              <Input id="class-date" type="date" value={formData.date} onChange={(e) => setFormData((p: any) => ({ ...p, date: e.target.value }))} required />
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
                      onClick={() => setFormData((p: any) => ({ ...p, repeatDays: selected ? p.repeatDays.filter((d: number) => d !== day) : [...p.repeatDays, day] }))}
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
                <Select value={formData.startHour} onValueChange={(v) => setFormData((p: any) => ({ ...p, startHour: v }))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(h => <SelectItem key={h} value={String(h)}>{h}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-muted-foreground font-bold">:</span>
                <Select value={formData.startMinute} onValueChange={(v) => setFormData((p: any) => ({ ...p, startMinute: v }))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{["00", "15", "30", "45"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={formData.startAmPm} onValueChange={(v) => setFormData((p: any) => ({ ...p, startAmPm: v }))}>
                  <SelectTrigger className="w-[72px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>End Time *</Label>
              <div className="flex items-center gap-2">
                <Select value={formData.endHour} onValueChange={(v) => setFormData((p: any) => ({ ...p, endHour: v }))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(h => <SelectItem key={h} value={String(h)}>{h}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-muted-foreground font-bold">:</span>
                <Select value={formData.endMinute} onValueChange={(v) => setFormData((p: any) => ({ ...p, endMinute: v }))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{["00", "15", "30", "45"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={formData.endAmPm} onValueChange={(v) => setFormData((p: any) => ({ ...p, endAmPm: v }))}>
                  <SelectTrigger className="w-[72px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity *</Label>
                <Input id="capacity" type="number" min="1" value={formData.capacity} onChange={(e) => setFormData((p: any) => ({ ...p, capacity: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coach-select">Coach</Label>
                <Select value={formData.coachId} onValueChange={(v) => setFormData((p: any) => ({ ...p, coachId: v }))}>
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
              <Input id="class-desc" value={formData.description} onChange={(e) => setFormData((p: any) => ({ ...p, description: e.target.value }))} />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button type="submit" disabled={createClassPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {createClassPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Class"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              <Input value={editFormData.name} onChange={(e) => setEditFormData((p: any) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={editFormData.type} onValueChange={(v) => setEditFormData((p: any) => ({ ...p, type: v }))}>
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
                <Select value={editFormData.startHour} onValueChange={(v) => setEditFormData((p: any) => ({ ...p, startHour: v }))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(h => <SelectItem key={h} value={String(h)}>{h}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-muted-foreground font-bold">:</span>
                <Select value={editFormData.startMinute} onValueChange={(v) => setEditFormData((p: any) => ({ ...p, startMinute: v }))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{["00", "15", "30", "45"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={editFormData.startAmPm} onValueChange={(v) => setEditFormData((p: any) => ({ ...p, startAmPm: v }))}>
                  <SelectTrigger className="w-[72px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>End Time *</Label>
              <div className="flex items-center gap-2">
                <Select value={editFormData.endHour} onValueChange={(v) => setEditFormData((p: any) => ({ ...p, endHour: v }))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(h => <SelectItem key={h} value={String(h)}>{h}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-muted-foreground font-bold">:</span>
                <Select value={editFormData.endMinute} onValueChange={(v) => setEditFormData((p: any) => ({ ...p, endMinute: v }))}>
                  <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{["00", "15", "30", "45"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={editFormData.endAmPm} onValueChange={(v) => setEditFormData((p: any) => ({ ...p, endAmPm: v }))}>
                  <SelectTrigger className="w-[72px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Capacity *</Label>
                <Input type="number" min="1" value={editFormData.capacity} onChange={(e) => setEditFormData((p: any) => ({ ...p, capacity: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Coach</Label>
                <Select value={editFormData.coachId} onValueChange={(v) => setEditFormData((p: any) => ({ ...p, coachId: v }))}>
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
              <Input value={editFormData.description} onChange={(e) => setEditFormData((p: any) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Member-Visible Notes</Label>
              <Textarea value={editFormData.memberNotes} onChange={(e) => setEditFormData((p: any) => ({ ...p, memberNotes: e.target.value }))} placeholder="Visible to members (e.g., bring a towel, workout preview)" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Staff Notes (internal)</Label>
              <Textarea value={editFormData.staffNotes} onChange={(e) => setEditFormData((p: any) => ({ ...p, staffNotes: e.target.value }))} placeholder="Only visible to staff" rows={2} />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editFormData.isBookable} onChange={(e) => setEditFormData((p: any) => ({ ...p, isBookable: e.target.checked }))} className="rounded border-border" />
                Bookable
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editFormData.waitlistEnabled} onChange={(e) => setEditFormData((p: any) => ({ ...p, waitlistEnabled: e.target.checked }))} className="rounded border-border" />
                Enable Waitlist
              </label>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => { setEditOpen(false); setEditClassData(null); }} className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button type="submit" disabled={updateClassPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {updateClassPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                        <Select value={classDetail.coachId ? String(classDetail.coachId) : "none"} onValueChange={handleAssignCoach} disabled={updateClassPending}>
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

              {canManage && (
                <div className="pt-3 border-t border-border space-y-2">
                  <button onClick={() => openEditDialog(classDetail)} className="flex items-center gap-2 px-4 py-2 hover:bg-secondary rounded-lg text-sm font-medium transition-colors w-full justify-center border border-border">
                    <Pencil className="h-4 w-4" /> Edit Class
                  </button>
                  <button onClick={() => handleDuplicateClass(classDetail.id)} disabled={createClassPending} className="flex items-center gap-2 px-4 py-2 hover:bg-secondary rounded-lg text-sm font-medium transition-colors w-full justify-center border border-border text-muted-foreground disabled:opacity-50">
                    {createClassPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} Duplicate Class
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

      <AlertDialog open={!!deleteClassId} onOpenChange={(open) => { if (!open) setDeleteClassId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this class? This action cannot be undone. All roster entries will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClass} disabled={deleteClassPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteClassPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
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
                <button key={member.id} onClick={() => handleCheckIn(member.id)} disabled={checkInPending} className="flex items-center justify-between w-full p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary transition-all text-left">
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

      <Dialog open={copyWeekOpen} onOpenChange={(open) => { if (!open) { setCopyWeekOpen(false); setCopyWeekPreviewData(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Copy Last Week</DialogTitle>
            <DialogDescription>Copy classes from the week of {format(previousWeekStart, 'MMM d')} to the week of {format(currentWeekStart, 'MMM d, yyyy')}.</DialogDescription>
          </DialogHeader>
          {previewCopyWeekPending ? (
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
            <button type="button" onClick={handleCopyWeekConfirm} disabled={copyWeekPending || !copyWeekPreviewData || copyWeekPreviewData.toCreate.length === 0} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {copyWeekPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Copy ${copyWeekPreviewData?.toCreate.length || 0} Classes`}
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
              <button type="submit" disabled={createTemplatePending || !templateName.trim()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {createTemplatePending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Template"}
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

      <Dialog open={!!applyTemplateId && !!applyTemplatePreviewData} onOpenChange={(open) => { if (!open) { setApplyTemplateId(null); setApplyTemplatePreviewData(null); setApplySelectedItems(new Set()); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply Template</DialogTitle>
            <DialogDescription>Apply template to the week of {format(currentWeekStart, 'MMM d, yyyy')}. Deselect any classes you don't want to create.</DialogDescription>
          </DialogHeader>
          {previewApplyPending ? (
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
            <button type="button" onClick={handleApplyTemplateConfirm} disabled={applyTemplatePending || !applyTemplatePreviewData || applySelectedItems.size === 0} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {applyTemplatePending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Apply ${applySelectedItems.size} Classes`}
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
              <button type="submit" disabled={updateTemplatePending || !renameTemplateName.trim()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {updateTemplatePending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rename"}
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
            <AlertDialogAction onClick={handleDeleteTemplate} disabled={deleteTemplatePending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteTemplatePending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearWeekOpen} onOpenChange={(open) => { if (!open) setClearWeekOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Entire Week</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {classesCount} class{classesCount !== 1 ? "es" : ""} scheduled for the week of {format(currentWeekStart, 'MMM d')} — {format(days[6], 'MMM d, yyyy')}, along with all associated attendance records and roster entries. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearWeekPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearWeek} disabled={clearWeekPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {clearWeekPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Clear Week"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
