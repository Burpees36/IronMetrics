import React, { useState, useEffect } from "react";
import {
  useGetProgrammingPreferences,
  useUpdateProgrammingPreferences,
  getGetProgrammingPreferencesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Save, Plus, X, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  gymId: number;
}

const METHODOLOGIES = [
  { value: "crossfit", label: "CrossFit" },
  { value: "strength-bias", label: "Strength-Biased" },
  { value: "hybrid", label: "Hybrid (Strength + Conditioning)" },
  { value: "functional-fitness", label: "Functional Fitness" },
  { value: "bootcamp", label: "Bootcamp / HIIT" },
  { value: "olympic-lifting", label: "Olympic Lifting Focus" },
  { value: "powerlifting", label: "Powerlifting Focus" },
];

const SECTION_TYPES = [
  { value: "warmup", label: "Warm-up" },
  { value: "strength", label: "Strength" },
  { value: "conditioning", label: "Conditioning / WOD" },
  { value: "skill", label: "Skill Work" },
  { value: "cooldown", label: "Cool-down" },
  { value: "accessory", label: "Accessory" },
  { value: "custom", label: "Custom" },
];

const COMMON_EQUIPMENT = [
  "Barbell", "Dumbbells", "Kettlebells", "Pull-up Bar", "Rings",
  "Rower", "Assault Bike", "Ski Erg", "Jump Rope", "Box",
  "Medicine Ball", "Wall Ball", "Resistance Bands", "Parallettes",
  "GHD Machine", "Sled", "Rope", "Sandbag", "Plate",
  "Bench", "Rack", "Cable Machine", "Trap Bar",
];

export function ProgrammingSettings({ gymId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: prefs, isLoading } = useGetProgrammingPreferences(gymId, {
    query: { enabled: !!gymId },
  });
  const updateMutation = useUpdateProgrammingPreferences();

  const [form, setForm] = useState({
    methodology: "crossfit",
    structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
    equipment: [] as string[],
    constraints: "",
    defaultTimeDomains: {
      warmup: "10-15 min",
      strength: "15-20 min",
      conditioning: "8-20 min",
      cooldown: "5-10 min",
    } as Record<string, string>,
    autoPublishEnabled: false,
    autoPublishTime: "20:00",
    autoPublishLeadDays: 1,
  });
  const [dirty, setDirty] = useState(false);
  const [newEquipment, setNewEquipment] = useState("");

  useEffect(() => {
    if (prefs) {
      setForm({
        methodology: prefs.methodology || "crossfit",
        structureTemplate: (prefs.structureTemplate as string[]) || [
          "warmup", "strength", "conditioning", "cooldown",
        ],
        equipment: (prefs.equipment as string[]) || [],
        constraints: prefs.constraints || "",
        defaultTimeDomains: (prefs.defaultTimeDomains as Record<string, string>) || {},
        autoPublishEnabled: prefs.autoPublishEnabled ?? false,
        autoPublishTime: prefs.autoPublishTime || "20:00",
        autoPublishLeadDays: prefs.autoPublishLeadDays ?? 1,
      });
      setDirty(false);
    }
  }, [prefs]);

  const handleSave = () => {
    updateMutation.mutate(
      {
        gymId,
        data: {
          methodology: form.methodology,
          structureTemplate: form.structureTemplate,
          equipment: form.equipment,
          constraints: form.constraints || null,
          defaultTimeDomains: form.defaultTimeDomains,
          autoPublishEnabled: form.autoPublishEnabled,
          autoPublishTime: form.autoPublishTime,
          autoPublishLeadDays: form.autoPublishLeadDays,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetProgrammingPreferencesQueryKey(gymId),
          });
          toast({ title: "Programming Preferences Saved" });
          setDirty(false);
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error?.data?.error || "Failed to save preferences",
            variant: "destructive",
          });
        },
      }
    );
  };

  const addStructureSection = (type: string) => {
    setForm((p) => ({
      ...p,
      structureTemplate: [...p.structureTemplate, type],
    }));
    setDirty(true);
  };

  const removeStructureSection = (idx: number) => {
    setForm((p) => ({
      ...p,
      structureTemplate: p.structureTemplate.filter((_, i) => i !== idx),
    }));
    setDirty(true);
  };

  const toggleEquipment = (item: string) => {
    setForm((p) => {
      const has = p.equipment.includes(item);
      return {
        ...p,
        equipment: has
          ? p.equipment.filter((e) => e !== item)
          : [...p.equipment, item],
      };
    });
    setDirty(true);
  };

  const addCustomEquipment = () => {
    if (!newEquipment.trim()) return;
    if (!form.equipment.includes(newEquipment.trim())) {
      setForm((p) => ({
        ...p,
        equipment: [...p.equipment, newEquipment.trim()],
      }));
      setDirty(true);
    }
    setNewEquipment("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Methodology</h3>
        <p className="text-sm text-muted-foreground">
          Select your gym's programming methodology. This guides the AI when generating workouts.
        </p>
        <Select
          value={form.methodology}
          onValueChange={(v) => {
            setForm((p) => ({ ...p, methodology: v }));
            setDirty(true);
          }}
        >
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METHODOLOGIES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          Workout Structure Template
        </h3>
        <p className="text-sm text-muted-foreground">
          Define the default structure for each day's programming. Sections will be generated in this order.
        </p>
        <div className="flex flex-wrap gap-2">
          {form.structureTemplate.map((section, idx) => (
            <div
              key={`${section}-${idx}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium"
            >
              <span>
                {SECTION_TYPES.find((s) => s.value === section)?.label || section}
              </span>
              <button
                onClick={() => removeStructureSection(idx)}
                className="hover:bg-primary/20 rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <Select onValueChange={addStructureSection}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Add section..." />
          </SelectTrigger>
          <SelectContent>
            {SECTION_TYPES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          Available Equipment
        </h3>
        <p className="text-sm text-muted-foreground">
          Select equipment available at your gym. The AI will only program movements using this equipment.
        </p>
        <div className="flex flex-wrap gap-2">
          {COMMON_EQUIPMENT.map((item) => {
            const selected = form.equipment.includes(item);
            return (
              <button
                key={item}
                onClick={() => toggleEquipment(item)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  selected
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-secondary text-muted-foreground border-transparent hover:border-border"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 max-w-sm">
          <Input
            value={newEquipment}
            onChange={(e) => setNewEquipment(e.target.value)}
            placeholder="Add custom equipment..."
            onKeyDown={(e) => e.key === "Enter" && addCustomEquipment()}
          />
          <button
            onClick={addCustomEquipment}
            className="px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {form.equipment
          .filter((e) => !COMMON_EQUIPMENT.includes(e))
          .map((item) => (
            <div
              key={item}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium mr-2"
            >
              <span>{item}</span>
              <button
                onClick={() => toggleEquipment(item)}
                className="hover:bg-primary/20 rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          Constraints & Notes
        </h3>
        <p className="text-sm text-muted-foreground">
          Add any specific constraints or preferences for programming (e.g., "No overhead work on Mondays", "Include gymnastics at least 3x/week").
        </p>
        <Textarea
          value={form.constraints}
          onChange={(e) => {
            setForm((p) => ({ ...p, constraints: e.target.value }));
            setDirty(true);
          }}
          placeholder="Enter any programming constraints or notes..."
          rows={4}
          className="max-w-lg"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Auto-Publish Schedule
        </h3>
        <p className="text-sm text-muted-foreground">
          Automatically publish draft programming at a scheduled time.
        </p>
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.autoPublishEnabled}
              onChange={(e) => {
                setForm((p) => ({
                  ...p,
                  autoPublishEnabled: e.target.checked,
                }));
                setDirty(true);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
          </label>
          <span className="text-sm font-medium text-foreground">
            {form.autoPublishEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>

        {form.autoPublishEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md pl-4 border-l-2 border-primary/20">
            <div className="space-y-2">
              <Label>Publish Time</Label>
              <Input
                type="time"
                value={form.autoPublishTime}
                onChange={(e) => {
                  setForm((p) => ({ ...p, autoPublishTime: e.target.value }));
                  setDirty(true);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Time to auto-publish drafts
              </p>
            </div>
            <div className="space-y-2">
              <Label>Days Ahead</Label>
              <Select
                value={String(form.autoPublishLeadDays)}
                onValueChange={(v) => {
                  setForm((p) => ({
                    ...p,
                    autoPublishLeadDays: parseInt(v),
                  }));
                  setDirty(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Same day</SelectItem>
                  <SelectItem value="1">1 day before</SelectItem>
                  <SelectItem value="2">2 days before</SelectItem>
                  <SelectItem value="3">3 days before</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Publish programming this many days in advance
              </p>
            </div>
          </div>
        )}
      </div>

      {dirty && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 pt-4 border-t border-border"
        >
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Preferences
          </button>
          <button
            onClick={() => {
              if (prefs) {
                setForm({
                  methodology: prefs.methodology || "crossfit",
                  structureTemplate: (prefs.structureTemplate as string[]) || [],
                  equipment: (prefs.equipment as string[]) || [],
                  constraints: prefs.constraints || "",
                  defaultTimeDomains:
                    (prefs.defaultTimeDomains as Record<string, string>) || {},
                  autoPublishEnabled: prefs.autoPublishEnabled ?? false,
                  autoPublishTime: prefs.autoPublishTime || "20:00",
                  autoPublishLeadDays: prefs.autoPublishLeadDays ?? 1,
                });
              }
              setDirty(false);
            }}
            className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Discard
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
