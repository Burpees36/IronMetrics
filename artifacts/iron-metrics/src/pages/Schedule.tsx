import React from "react";
import { useGym } from "@/store/GymContext";
import { useListClasses } from "@workspace/api-client-react";
import { format, startOfWeek, addDays } from "date-fns";
import { motion } from "framer-motion";
import { Loader2, Plus, Clock, Users } from "lucide-react";

export function Schedule() {
  const { activeGymId } = useGym();
  
  // Just fetch some classes for demo
  const { data: classes, isLoading } = useListClasses(activeGymId as number, {}, {
    query: { enabled: !!activeGymId }
  });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Schedule</h1>
          <p className="text-muted-foreground mt-1">Manage classes and attendance.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20">
          <Plus className="h-5 w-5" />
          <span>New Class</span>
        </button>
      </header>

      <div className="grid grid-cols-7 gap-4 mb-6 shrink-0">
        {days.map((day, i) => (
          <div key={i} className={`p-3 rounded-2xl text-center border ${
            i === 0 ? "bg-primary/10 border-primary/30" : "bg-card border-border"
          }`}>
            <div className={`text-xs font-semibold uppercase mb-1 ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>
              {format(day, 'EEE')}
            </div>
            <div className={`text-xl font-bold ${i === 0 ? "text-foreground" : "text-foreground"}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm p-6 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {classes?.length ? classes.map((cls, i) => (
              <motion.div 
                key={cls.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-white/5 transition-all cursor-pointer group"
              >
                <div className="w-24 shrink-0">
                  <div className="font-bold text-foreground">{format(new Date(cls.startTime), 'h:mm a')}</div>
                  <div className="text-xs text-muted-foreground">{cls.capacity - cls.enrolled} spots left</div>
                </div>
                
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{cls.name}</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1.5"><Clock className="h-4 w-4"/> 60 min</span>
                    <span className="flex items-center gap-1.5"><Users className="h-4 w-4"/> Coach {cls.coachName || 'TBD'}</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {/* Mock avatars */}
                    {[...Array(Math.min(cls.enrolled, 3))].map((_, j) => (
                      <div key={j} className="h-8 w-8 rounded-full border-2 border-card bg-muted" />
                    ))}
                    {cls.enrolled > 3 && (
                      <div className="h-8 w-8 rounded-full border-2 border-card bg-secondary flex items-center justify-center text-[10px] font-bold">
                        +{cls.enrolled - 3}
                      </div>
                    )}
                  </div>
                  <button className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-medium transition-colors">
                    Check In
                  </button>
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
    </div>
  );
}
