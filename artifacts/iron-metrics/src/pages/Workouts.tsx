import React from "react";
import { useGym } from "@/store/GymContext";
import { useListWorkouts } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Loader2, Activity, Clock, Users, Dumbbell, Plus } from "lucide-react";

export function Workouts() {
  const { activeGymId } = useGym();

  const { data: workouts, isLoading } = useListWorkouts(activeGymId as number, {
    query: { enabled: !!activeGymId }
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
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20">
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
                <h3 className="text-xl font-bold text-foreground">{workout.name}</h3>
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
    </div>
  );
}
