import React, { useState } from "react";
import { useGym } from "@/store/GymContext";
import { useListWorkouts, useCreateWorkout, getListWorkoutsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Activity, Clock, Users, Dumbbell, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Workouts() {
  const { activeGymId } = useGym();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: workouts, isLoading } = useListWorkouts(activeGymId as number, undefined, {
    query: { enabled: !!activeGymId }
  });

  const createWorkoutMutation = useCreateWorkout();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "amrap",
    description: "",
    movements: "",
    workoutDate: new Date().toISOString().split("T")[0],
  });

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a gym to view workouts.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const handleCreate = () => {
    if (!form.title) return;
    const movements = form.movements.split(",").map(m => m.trim()).filter(Boolean);
    createWorkoutMutation.mutate(
      {
        gymId: activeGymId,
        data: {
          title: form.title,
          type: form.type,
          description: form.description || undefined,
          movements: movements.length > 0 ? movements : undefined,
          workoutDate: form.workoutDate,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWorkoutsQueryKey(activeGymId) });
          toast({ title: "Workout created", description: `${form.title} has been added.` });
          setCreateOpen(false);
          setForm({ title: "", type: "amrap", description: "", movements: "", workoutDate: new Date().toISOString().split("T")[0] });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to create workout." });
        }
      }
    );
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">Workouts</h1>
          </div>
          <p className="text-muted-foreground mt-1">Today's whiteboard and workout programming.</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20"
        >
          <Plus className="h-5 w-5" />
          <span>New Workout</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {workouts?.map((workout: any, i: number) => (
          <motion.div
            key={workout.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-primary/40 transition-colors"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-foreground">{workout.title}</h3>
                <p className="text-sm text-muted-foreground capitalize mt-0.5">{workout.type} • {workout.difficulty || "All Levels"}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                workout.type === 'amrap' ? 'bg-blue-500/10 text-blue-500' :
                workout.type === 'for_time' ? 'bg-orange-500/10 text-orange-500' :
                workout.type === 'emom' ? 'bg-purple-500/10 text-purple-500' :
                'bg-primary/10 text-primary'
              }`}>
                {workout.type?.replace('_', ' ') || 'WOD'}
              </span>
            </div>

            {workout.description && (
              <p className="text-sm text-muted-foreground mb-4 whitespace-pre-line">{workout.description}</p>
            )}

            {workout.movements && workout.movements.length > 0 && (
              <div className="space-y-2 mb-4">
                {workout.movements.map((mov: string, j: number) => (
                  <div key={j} className="flex items-center gap-2 text-sm text-foreground/80">
                    <Dumbbell className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{mov}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 pt-4 border-t border-border text-xs text-muted-foreground">
              {workout.timeCap && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {workout.timeCap} min cap
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {workout.resultCount ?? 0} results logged
              </span>
            </div>
          </motion.div>
        ))}
        {(!workouts || workouts.length === 0) && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            No workouts programmed yet.
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Workout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Workout name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amrap">AMRAP</SelectItem>
                    <SelectItem value="for_time">For Time</SelectItem>
                    <SelectItem value="emom">EMOM</SelectItem>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.workoutDate} onChange={(e) => setForm({ ...form, workoutDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Workout description..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <Label>Movements (comma-separated)</Label>
              <Input value={form.movements} onChange={(e) => setForm({ ...form, movements: e.target.value })} placeholder="e.g. Deadlifts, Pull-ups, Box Jumps" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setCreateOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={createWorkoutMutation.isPending || !form.title}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {createWorkoutMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Workout
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
