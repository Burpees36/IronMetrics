import React, { useState, useEffect } from "react";
import { Loader2, CalendarDays, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { StepCard } from "./StepCard";
import { apiFetch } from "./types";
import type { StepProps } from "./types";

export function ScheduleStep({ gymId, onComplete, onSkip, onBack, isComplete }: StepProps) {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const { toast } = useToast();

  const getNextWeekday = (dayOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + ((dayOffset - d.getDay() + 7) % 7 || 7));
    return d;
  };

  const [form, setForm] = useState({
    name: "CrossFit WOD", type: "crossfit",
    startHour: "09", startMin: "00",
    duration: "60", capacity: "20", coachId: "",
    dayOfWeek: "1",
  });

  const fetchData = async () => {
    try {
      const now = new Date();
      const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const [classData, staffData] = await Promise.all([
        apiFetch(`/api/gyms/${gymId}/classes?startDate=${now.toISOString()}&endDate=${twoWeeks.toISOString()}`),
        apiFetch(`/api/gyms/${gymId}/staff`),
      ]);
      setClasses(classData);
      setStaff(staffData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [gymId]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({ title: "Class name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const day = getNextWeekday(parseInt(form.dayOfWeek));
      day.setHours(parseInt(form.startHour), parseInt(form.startMin), 0, 0);
      const endTime = new Date(day.getTime() + parseInt(form.duration) * 60000);

      await apiFetch(`/api/gyms/${gymId}/classes`, {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          startTime: day.toISOString(),
          endTime: endTime.toISOString(),
          capacity: parseInt(form.capacity),
          coachId: form.coachId ? parseInt(form.coachId) : undefined,
        }),
      });
      toast({ title: "Class created" });
      setShowForm(false);
      await fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>;

  return (
    <StepCard title="Your First Schedule" description="Create a few classes so your members have something to sign up for." onSkip={onSkip} onBack={onBack}>
      {classes.length > 0 && (
        <div className="space-y-3 mb-6">
          {classes.slice(0, 5).map((c) => (
            <div key={c.id} className="flex items-center justify-between bg-background/50 rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(c.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at{" "}
                    {new Date(c.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{c.enrolled}/{c.capacity} spots</p>
                {c.coachName && <p className="text-xs text-muted-foreground">{c.coachName}</p>}
              </div>
            </div>
          ))}
          {classes.length > 5 && (
            <p className="text-sm text-muted-foreground text-center">...and {classes.length - 5} more</p>
          )}
        </div>
      )}

      {classes.length === 0 && !showForm && (
        <div className="text-center py-8 bg-background/30 rounded-xl border border-dashed border-border mb-4">
          <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No upcoming classes yet. Let's schedule your first one.</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Class
          </Button>
        </div>
      )}

      {showForm && (
        <div className="bg-background/30 rounded-xl p-5 border border-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Class Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="CrossFit WOD" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="crossfit">CrossFit</SelectItem>
                  <SelectItem value="open_gym">Open Gym</SelectItem>
                  <SelectItem value="specialty">Specialty</SelectItem>
                  <SelectItem value="foundations">Foundations</SelectItem>
                  <SelectItem value="competition">Competition</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Day</Label>
              <Select value={form.dayOfWeek} onValueChange={(v) => setForm({ ...form, dayOfWeek: v })}>
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
                <div className="flex gap-1">
                  <Select value={form.startHour} onValueChange={(v) => setForm({ ...form, startHour: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                        <SelectItem key={h} value={h}>{parseInt(h) > 12 ? `${parseInt(h) - 12} PM` : parseInt(h) === 0 ? "12 AM" : parseInt(h) === 12 ? "12 PM" : `${parseInt(h)} AM`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={form.startMin} onValueChange={(v) => setForm({ ...form, startMin: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="00">:00</SelectItem>
                      <SelectItem value="15">:15</SelectItem>
                      <SelectItem value="30">:30</SelectItem>
                      <SelectItem value="45">:45</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Duration</Label>
                <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Capacity</Label>
              <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="20" />
            </div>
            {staff.length > 0 && (
              <div>
                <Label>Coach</Label>
                <Select value={form.coachId} onValueChange={(v) => setForm({ ...form, coachId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select coach" /></SelectTrigger>
                  <SelectContent>
                    {staff.filter(s => ["coach", "gym_owner", "admin"].includes(s.role)).map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Class
            </Button>
          </div>
        </div>
      )}

      {classes.length > 0 && !showForm && (
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Another
          </Button>
          <Button onClick={onComplete}>
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </StepCard>
  );
}
