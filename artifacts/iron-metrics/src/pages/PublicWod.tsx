import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { Loader2, Dumbbell, ChevronLeft, ChevronRight, Zap, FileText } from "lucide-react";
import { getSectionTypeInfo, type SectionType } from "@/components/programming/SectionEditor";

const API_BASE = import.meta.env.VITE_API_URL || "";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function sectionTypeToUiType(sectionType: string): SectionType {
  const map: Record<string, SectionType> = {
    warmup: "warmup",
    strength: "strength",
    conditioning: "conditioning",
    skill: "skill",
    cooldown: "cooldown",
    wod: "conditioning",
    accessory: "accessory",
    custom: "custom",
  };
  return map[sectionType] ?? "conditioning";
}

interface GymInfo {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string | null;
  description?: string | null;
}

interface ProgrammingSection {
  id: number;
  dayId: number;
  orderIndex: number;
  sectionType: string;
  title: string;
  instructions: string | null;
  duration: string | null;
  timeCap: string | null;
  intendedStimulus: string | null;
  movements: string[];
  scalingNotes: string | null;
  memberNotes: string | null;
  resultTrackingEnabled: boolean;
}

interface ProgrammingDay {
  id: number;
  gymId: number;
  date: string;
  title: string;
  status: string;
  publicNotes: string | null;
  track: string | null;
  sections: ProgrammingSection[];
}

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function SectionCard({ section, index, total }: { section: ProgrammingSection; index: number; total: number }) {
  const uiType = sectionTypeToUiType(section.sectionType);
  const typeInfo = getSectionTypeInfo(uiType);
  const letter = LETTERS[index] || String(index + 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="space-y-1"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="h-6 w-6 rounded-lg flex items-center justify-center bg-primary/10 text-primary text-xs font-bold shrink-0">
          {letter}
        </span>
        <span className={`${typeInfo.color} shrink-0`}>{typeInfo.icon}</span>
        <h3 className="text-sm font-bold text-foreground">{section.title}</h3>
      </div>

      {section.instructions && (
        <div className="pl-8 mb-2">
          <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
            {section.instructions}
          </p>
        </div>
      )}

      {section.memberNotes && (
        <div className="pl-8 mb-2">
          <p className="text-xs text-primary/80 italic">{section.memberNotes}</p>
        </div>
      )}

      {section.scalingNotes && (
        <div className="pl-8 mb-2">
          <p className="text-xs text-muted-foreground">Scaling: {section.scalingNotes}</p>
        </div>
      )}

      {section.timeCap && (
        <div className="pl-8 mb-2">
          <p className="text-xs text-amber-500">⏱ {section.timeCap}</p>
        </div>
      )}

      {index < total - 1 && (
        <div className="border-b border-border/50 my-3 ml-8" />
      )}
    </motion.div>
  );
}

export function PublicWod() {
  const params = useParams<{ gymSlug: string }>();
  const gymSlug = params.gymSlug;

  const [gymInfo, setGymInfo] = useState<GymInfo | null>(null);
  const [days, setDays] = useState<ProgrammingDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get("date");
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const parsed = new Date(dateParam + "T00:00:00");
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  const selectedDateStr = useMemo(() => toDateString(selectedDate), [selectedDate]);

  useEffect(() => {
    if (!gymSlug) return;

    const fetchGymInfo = async () => {
      try {
        const infoRes = await fetch(`${API_BASE}/api/public/wod/${gymSlug}/info`);
        if (!infoRes.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const info = await infoRes.json();
        setGymInfo(info);
        setLoading(false);
      } catch {
        setNotFound(true);
        setLoading(false);
      }
    };

    fetchGymInfo();
  }, [gymSlug]);

  useEffect(() => {
    if (!gymSlug || notFound || loading) return;

    const fetchProgramming = async () => {
      try {
        const start = new Date(selectedDate);
        start.setDate(start.getDate() - 7);
        const end = new Date(selectedDate);
        end.setDate(end.getDate() + 7);

        const progRes = await fetch(
          `${API_BASE}/api/public/wod/${gymSlug}/programming?startDate=${toDateString(start)}&endDate=${toDateString(end)}`
        );
        if (progRes.ok) {
          const progData = await progRes.json();
          setDays(progData);
        }
      } catch {
      }
    };

    fetchProgramming();
  }, [gymSlug, notFound, loading, selectedDateStr]);

  const todayStr = selectedDateStr;
  const todayDay = useMemo(() => days.find((d) => d.date === todayStr) || null, [days, todayStr]);

  const isToday = useMemo(() => {
    const today = new Date();
    return (
      selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getDate() === today.getDate()
    );
  }, [selectedDate]);

  const navigate = (direction: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + direction);
    setSelectedDate(d);
  };

  const goToToday = () => setSelectedDate(new Date());

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center" data-testid="gym-not-found">
          <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground">Gym Not Found</h1>
          <p className="text-muted-foreground mt-2">
            This gym link doesn't seem to be active.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="text-center mb-6">
          {gymInfo?.logoUrl ? (
            <img
              src={gymInfo.logoUrl}
              alt={gymInfo.name}
              className="h-14 w-auto mx-auto mb-3 rounded-lg"
            />
          ) : (
            <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Dumbbell className="h-7 w-7 text-primary" />
            </div>
          )}
          <h1 className="text-xl font-bold text-foreground" data-testid="gym-name">
            {gymInfo?.name}
          </h1>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">
                {isToday ? "Today's Workout" : "Workout"}
              </h2>
              <p className="text-xs text-muted-foreground" data-testid="selected-date">
                {new Date(todayStr + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate(-1)}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors"
                data-testid="nav-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {!isToday && (
                <button
                  onClick={goToToday}
                  className="px-2.5 h-8 text-xs font-medium rounded-lg border border-border hover:bg-accent transition-colors"
                  data-testid="nav-today"
                >
                  Today
                </button>
              )}
              <button
                onClick={() => navigate(1)}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors"
                data-testid="nav-next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {todayDay ? (
            <div className="bg-card border border-border rounded-2xl p-5" data-testid="workout-card">
              {todayDay.publicNotes && (
                <p className="text-sm text-muted-foreground mb-4 italic">
                  {todayDay.publicNotes}
                </p>
              )}
              {todayDay.sections.map((section, i) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  index={i}
                  total={todayDay.sections.length}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-border rounded-2xl" data-testid="empty-state">
              <div className="h-12 w-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No workout posted for this day
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Check back later for updates
              </p>
            </div>
          )}
        </div>

        <div className="text-center mt-8 text-xs text-muted-foreground opacity-60">
          Powered by ForgeOS
        </div>
      </div>
    </div>
  );
}
