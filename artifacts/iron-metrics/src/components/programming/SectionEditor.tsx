import React, { useState } from "react";
import {
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SectionData {
  id: string;
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
  const [expanded, setExpanded] = useState(true);
  const [movementInput, setMovementInput] = useState("");
  const typeInfo = getSectionTypeInfo(section.type);

  const update = (partial: Partial<SectionData>) => {
    onChange({ ...section, ...partial });
  };

  const addMovement = () => {
    const trimmed = movementInput.trim();
    if (trimmed && !section.movements.includes(trimmed)) {
      update({ movements: [...section.movements, trimmed] });
      setMovementInput("");
    }
  };

  const removeMovement = (idx: number) => {
    update({ movements: section.movements.filter((_, i) => i !== idx) });
  };

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div
        className="flex items-center gap-2 px-4 py-3 bg-muted/50 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
        <div className={`${typeInfo.color}`}>{typeInfo.icon}</div>
        <span className="text-sm font-semibold text-foreground flex-1 truncate">
          {section.title || typeInfo.label}
        </span>
        {section.trackResults && (
          <BarChart3 className="h-3.5 w-3.5 text-primary shrink-0" />
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={index === 0}
            className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent disabled:opacity-30 transition-colors"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={index === totalSections - 1}
            className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent disabled:opacity-30 transition-colors"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Section Type</Label>
              <Select
                value={section.type}
                onValueChange={(v) => {
                  const newType = v as SectionType;
                  const info = getSectionTypeInfo(newType);
                  update({
                    type: newType,
                    title: section.title === typeInfo.label ? info.label : section.title,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <span className={t.color}>{t.icon}</span>
                        <span>{t.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input
                value={section.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Section title"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Instructions</Label>
            <textarea
              value={section.instructions}
              onChange={(e) => update({ instructions: e.target.value })}
              placeholder="Describe the workout, rounds, reps, etc."
              className="flex min-h-[100px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Movements</Label>
            <div className="flex gap-2">
              <Input
                value={movementInput}
                onChange={(e) => setMovementInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMovement();
                  }
                }}
                placeholder="Add a movement and press Enter"
              />
              <button
                onClick={addMovement}
                className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {section.movements.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {section.movements.map((mov, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                  >
                    {mov}
                    <button
                      onClick={() => removeMovement(i)}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Time Cap (minutes)</Label>
              <Input
                type="number"
                value={section.timeCap}
                onChange={(e) => update({ timeCap: e.target.value })}
                placeholder="e.g. 20"
                min="0"
              />
            </div>
            <div className="flex items-end gap-3 pb-0.5">
              <div className="flex items-center gap-2">
                <Switch
                  checked={section.trackResults}
                  onCheckedChange={(checked) => update({ trackResults: checked })}
                />
                <Label className="text-xs cursor-pointer">Track Results</Label>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Intended Stimulus</Label>
            <Input
              value={section.stimulus}
              onChange={(e) => update({ stimulus: e.target.value })}
              placeholder="e.g. Fast and light, stay moving for the full time"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Scaling Notes</Label>
            <textarea
              value={section.scalingNotes}
              onChange={(e) => update({ scalingNotes: e.target.value })}
              placeholder="Scaling options for different athlete levels"
              className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Coach Notes (staff only)</Label>
              <textarea
                value={section.coachNotes}
                onChange={(e) => update({ coachNotes: e.target.value })}
                placeholder="Internal notes for coaches"
                className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Member Notes (visible to members)</Label>
              <textarea
                value={section.memberNotes}
                onChange={(e) => update({ memberNotes: e.target.value })}
                placeholder="Notes visible to members"
                className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              />
            </div>
          </div>
        </div>
      )}
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
