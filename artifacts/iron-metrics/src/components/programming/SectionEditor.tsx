import React, { useState } from "react";
import {
  Trash2,
  Flame,
  Dumbbell,
  Timer,
  Wind,
  Target,
  Brain,
  Zap,
  FileText,
  Settings2,
  ArrowUp,
  ArrowDown,
  BarChart3,
  MessageSquare,
  Plus,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

export interface SectionData {
  id: string;
  dbId?: number;
  type: SectionType;
  title: string;
  instructions: string;
  movements: string[];
  timeCap: string;
  stimulus: string;
  scalingNotes: string;
  coachNotes: string;
  memberNotes: string;
  trackResults: boolean;
}

export type SectionType =
  | "warmup"
  | "mobility"
  | "skill"
  | "strength"
  | "conditioning"
  | "accessory"
  | "cooldown"
  | "notes"
  | "custom";

const SECTION_TYPES: { value: SectionType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "warmup", label: "Warm-Up", icon: <Flame className="h-4 w-4" />, color: "text-orange-500" },
  { value: "mobility", label: "Mobility", icon: <Wind className="h-4 w-4" />, color: "text-teal-500" },
  { value: "skill", label: "Skill", icon: <Target className="h-4 w-4" />, color: "text-indigo-500" },
  { value: "strength", label: "Strength", icon: <Dumbbell className="h-4 w-4" />, color: "text-red-500" },
  { value: "conditioning", label: "Conditioning", icon: <Zap className="h-4 w-4" />, color: "text-blue-500" },
  { value: "accessory", label: "Accessory", icon: <Brain className="h-4 w-4" />, color: "text-purple-500" },
  { value: "cooldown", label: "Cool-Down", icon: <Timer className="h-4 w-4" />, color: "text-cyan-500" },
  { value: "notes", label: "Notes", icon: <FileText className="h-4 w-4" />, color: "text-gray-500" },
  { value: "custom", label: "Custom", icon: <Settings2 className="h-4 w-4" />, color: "text-emerald-500" },
];

export function getSectionTypeInfo(type: SectionType) {
  return SECTION_TYPES.find((t) => t.value === type) || SECTION_TYPES[SECTION_TYPES.length - 1];
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function createEmptySection(type: SectionType = "conditioning"): SectionData {
  const typeInfo = getSectionTypeInfo(type);
  return {
    id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    title: typeInfo.label,
    instructions: "",
    movements: [],
    timeCap: "",
    stimulus: "",
    scalingNotes: "",
    coachNotes: "",
    memberNotes: "",
    trackResults: type === "conditioning" || type === "strength",
  };
}

function getPlaceholderForType(type: SectionType): string {
  switch (type) {
    case "warmup":
      return "3 Rounds:\n  400m Row\n  10 PVC Pass-throughs\n  10 Air Squats";
    case "strength":
      return "Back Squat\n5 x 3 @ 75-80%\nRest 2:00 between sets";
    case "conditioning":
      return "For Time (15 min cap):\n  21-15-9\n  Thrusters (95/65)\n  Pull-ups";
    case "cooldown":
      return "3:00 walk\n1:00 each side couch stretch\n1:00 pigeon pose";
    case "skill":
      return "EMOM x 10:\n  3 Muscle-up transitions\n  or 5 Kipping pull-ups";
    case "accessory":
      return "3 Sets:\n  12 GHD Hip Extensions\n  15 Banded Pull-aparts\n  20 Ab-mat Sit-ups";
    case "mobility":
      return "2:00 Foam roll quads\n1:00/side Banded shoulder stretch\n10 Cat-cows";
    case "notes":
      return "Today is a deload day. Focus on movement quality over intensity.";
    case "custom":
      return "Describe this section...";
    default:
      return "Describe the workout...";
  }
}

interface SectionEditorProps {
  section: SectionData;
  index: number;
  totalSections: number;
  onChange: (section: SectionData) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function SectionEditor({
  section,
  index,
  totalSections,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: SectionEditorProps) {
  const [showCoachNotes, setShowCoachNotes] = useState(!!section.coachNotes);
  const typeInfo = getSectionTypeInfo(section.type);
  const letter = LETTERS[index] || String(index + 1);

  const update = (partial: Partial<SectionData>) => {
    onChange({ ...section, ...partial });
  };

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden group">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="h-7 w-7 rounded-lg flex items-center justify-center bg-primary/10 text-primary text-xs font-bold shrink-0">
            {letter}
          </span>
          <span className={`${typeInfo.color} shrink-0`}>{typeInfo.icon}</span>
          <input
            value={section.title}
            onChange={(e) => update({ title: e.target.value })}
            className="text-sm font-semibold text-foreground bg-transparent border-none outline-none flex-1 min-w-0 placeholder:text-muted-foreground"
            placeholder={typeInfo.label}
          />
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <div className="flex items-center gap-1.5 mr-2" title="Track results">
            <Switch
              checked={section.trackResults}
              onCheckedChange={(checked) => update({ trackResults: checked })}
              className="scale-75"
            />
            <BarChart3 className={`h-3.5 w-3.5 ${section.trackResults ? "text-primary" : "text-muted-foreground/50"}`} />
          </div>
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent disabled:opacity-20 transition-colors"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === totalSections - 1}
            className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent disabled:opacity-20 transition-colors"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onRemove}
            className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <textarea
          value={section.instructions}
          onChange={(e) => update({ instructions: e.target.value })}
          placeholder={getPlaceholderForType(section.type)}
          rows={4}
          className="w-full rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 resize-y leading-relaxed font-mono"
        />

        {!showCoachNotes ? (
          <button
            onClick={() => setShowCoachNotes(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageSquare className="h-3 w-3" />
            Add coach notes
          </button>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Coach Notes (staff only)
              </span>
              <button
                onClick={() => {
                  setShowCoachNotes(false);
                  update({ coachNotes: "" });
                }}
                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
              >
                Remove
              </button>
            </div>
            <textarea
              value={section.coachNotes}
              onChange={(e) => update({ coachNotes: e.target.value })}
              placeholder="Internal notes for coaches..."
              rows={2}
              className="w-full rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-y"
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface SectionTypePickerProps {
  onSelect: (type: SectionType) => void;
}

export function SectionTypePicker({ onSelect }: SectionTypePickerProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
      {SECTION_TYPES.map((t) => (
        <button
          key={t.value}
          onClick={() => onSelect(t.value)}
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-center group"
        >
          <span className={`${t.color} group-hover:scale-110 transition-transform`}>
            {t.icon}
          </span>
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            {t.label}
          </span>
        </button>
      ))}
    </div>
  );
}

const QUICK_ADD_TYPES: { type: SectionType; label: string; icon: React.ReactNode }[] = [
  { type: "warmup", label: "Warm-Up", icon: <Flame className="h-3.5 w-3.5" /> },
  { type: "strength", label: "Strength", icon: <Dumbbell className="h-3.5 w-3.5" /> },
  { type: "conditioning", label: "Conditioning", icon: <Zap className="h-3.5 w-3.5" /> },
  { type: "cooldown", label: "Cool-Down", icon: <Timer className="h-3.5 w-3.5" /> },
];

interface QuickAddBarProps {
  onAdd: (type: SectionType) => void;
  onShowAll: () => void;
}

export function QuickAddBar({ onAdd, onShowAll }: QuickAddBarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {QUICK_ADD_TYPES.map((t) => (
        <button
          key={t.type}
          onClick={() => onAdd(t.type)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
        >
          <Plus className="h-3 w-3" />
          {t.label}
        </button>
      ))}
      <button
        onClick={onShowAll}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
      >
        <Settings2 className="h-3 w-3" />
        More...
      </button>
    </div>
  );
}
