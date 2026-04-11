import React, { useState, useEffect } from "react";
import { useGetGym, useUpdateGym, getGetGymQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Save, Plus, X, Eye, MessageSquare, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TONE_PRESETS = [
  {
    value: "casual_friendly",
    label: "Casual & Friendly",
    description: "Warm and direct, like texting someone you know. Contractions, short sentences, no fluff.",
    example: "Hey Sarah — haven't seen you in a bit. Everything good? We've got a solid class Thursday if you want to jump back in.",
  },
  {
    value: "professional",
    label: "Professional",
    description: "Clear and respectful. Gets to the point without being cold.",
    example: "Hi Sarah, I noticed it's been a while since your last visit. I'd like to set up a quick check-in — no pressure, just want to make sure we're helping you reach your goals.",
  },
  {
    value: "motivational_coach",
    label: "Motivational Coach",
    description: "High energy, action-oriented. Pushes members to show up and put in the work.",
    example: "Sarah — you've been putting in work. Don't let it slip now. Class is at 6am Thursday. Be there.",
  },
] as const;

const RULE_SUGGESTIONS = [
  'Never say "cancellation", say "pause"',
  'Always sign off with "See you in the gym!"',
  'Never say "payment failed", say "billing issue"',
  'Replace "membership" with "training"',
  'Never say "overdue", say "needs your attention"',
];

interface Props {
  gymId: number;
}

export function CommunicationStyleSettings({ gymId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: gym, isLoading } = useGetGym(gymId, { query: { enabled: !!gymId } });
  const updateGymMutation = useUpdateGym();

  const [tone, setTone] = useState("casual_friendly");
  const [rules, setRules] = useState<string[]>([]);
  const [newRule, setNewRule] = useState("");
  const [samples, setSamples] = useState<string[]>([]);
  const [newSample, setNewSample] = useState("");
  const [dirty, setDirty] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<{ original: { subject: string; content: string }; styled: { subject: string; content: string } } | null>(null);

  useEffect(() => {
    if (gym) {
      setTone((gym as any).communicationStyleTone || "casual_friendly");
      setRules((gym as any).communicationStyleRules || []);
      setSamples((gym as any).communicationStyleSamples || []);
      setDirty(false);
    }
  }, [gym]);

  const handleSave = () => {
    updateGymMutation.mutate(
      { gymId, data: { communicationStyleTone: tone, communicationStyleRules: rules, communicationStyleSamples: samples } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGymQueryKey(gymId) });
          setDirty(false);
          toast({ title: "Saved", description: "Communication style updated." });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.data?.error || "Failed to save.", variant: "destructive" });
        },
      }
    );
  };

  const addRule = () => {
    const trimmed = newRule.trim();
    if (!trimmed || rules.includes(trimmed)) return;
    setRules([...rules, trimmed]);
    setNewRule("");
    setDirty(true);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
    setDirty(true);
  };

  const addSuggestion = (suggestion: string) => {
    if (rules.includes(suggestion)) return;
    setRules([...rules, suggestion]);
    setDirty(true);
  };

  const addSample = () => {
    const trimmed = newSample.trim();
    if (!trimmed) return;
    if (samples.length >= 5) {
      toast({ title: "Limit reached", description: "You can add up to 5 sample messages.", variant: "destructive" });
      return;
    }
    setSamples([...samples, trimmed]);
    setNewSample("");
    setDirty(true);
  };

  const removeSample = (index: number) => {
    setSamples(samples.filter((_, i) => i !== index));
    setDirty(true);
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const baseUrl = import.meta.env.BASE_URL || "/";
      const res = await fetch(`${baseUrl}api/gyms/${gymId}/preview-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tone, rules, samples }),
      });
      if (!res.ok) throw new Error("Preview failed");
      const data = await res.json();
      setPreview(data);
    } catch {
      toast({ title: "Error", description: "Could not generate preview.", variant: "destructive" });
    } finally {
      setPreviewLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl"
          >
            <span className="text-sm text-amber-800 dark:text-amber-200 font-medium">You have unsaved changes</span>
            <button
              onClick={handleSave}
              disabled={updateGymMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {updateGymMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Tone Preset
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Choose a default communication style for all automated messages.</p>
        </div>

        <div className="grid gap-3">
          {TONE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => { setTone(preset.value); setDirty(true); }}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                tone === preset.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30 bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-foreground">{preset.label}</span>
                {tone === preset.value && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Active</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">{preset.description}</p>
              <p className="text-sm italic text-muted-foreground/80 bg-muted/50 p-2 rounded-lg">"{preset.example}"</p>
            </button>
          ))}
        </div>
      </section>

      <hr className="border-border" />

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Custom Rules
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Define word replacements and sign-off preferences. These rules are applied to every automated message.
          </p>
        </div>

        <div className="space-y-3">
          {rules.map((rule, i) => (
            <div key={i} className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl">
              <span className="flex-1 text-sm text-foreground">{rule}</span>
              <button onClick={() => removeRule(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            <Input
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRule()}
              placeholder='e.g. Never say "cancellation", say "taking a break"'
              className="flex-1"
            />
            <button
              onClick={addRule}
              disabled={!newRule.trim()}
              className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Quick suggestions:</p>
            <div className="flex flex-wrap gap-1.5">
              {RULE_SUGGESTIONS.filter((s) => !rules.includes(s)).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => addSuggestion(suggestion)}
                  className="text-xs px-2.5 py-1 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition-colors"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <hr className="border-border" />

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Writing Samples
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Paste 3-5 messages you've actually written to members. This helps the system match your personal style.
          </p>
        </div>

        <div className="space-y-3">
          {samples.map((sample, i) => (
            <div key={i} className="relative p-3 bg-muted/50 rounded-xl">
              <button
                onClick={() => removeSample(i)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-sm text-foreground whitespace-pre-wrap pr-6">{sample}</p>
              <span className="text-xs text-muted-foreground mt-1 block">Sample {i + 1}</span>
            </div>
          ))}

          {samples.length < 5 && (
            <div className="space-y-2">
              <Textarea
                value={newSample}
                onChange={(e) => setNewSample(e.target.value)}
                placeholder="Paste a message you've written to a member..."
                rows={3}
              />
              <button
                onClick={addSample}
                disabled={!newSample.trim()}
                className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Sample ({samples.length}/5)
              </button>
            </div>
          )}
        </div>
      </section>

      <hr className="border-border" />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Preview
            </h3>
            <p className="text-sm text-muted-foreground mt-1">See how a sample message looks with your current style applied.</p>
          </div>
          <button
            onClick={handlePreview}
            disabled={previewLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:bg-secondary/80 disabled:opacity-50"
          >
            {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            Generate Preview
          </button>
        </div>

        {preview && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-xl border border-border">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Before (Default)</span>
              <p className="text-xs font-medium text-muted-foreground mb-1">Subject: {preview.original.subject}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{preview.original.content}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
              <span className="text-xs font-medium text-primary uppercase tracking-wide mb-2 block">After (Your Voice)</span>
              <p className="text-xs font-medium text-primary/80 mb-1">Subject: {preview.styled.subject}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{preview.styled.content}</p>
            </div>
          </div>
        )}
      </section>

      <div className="pt-4">
        <button
          onClick={handleSave}
          disabled={updateGymMutation.isPending || !dirty}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {updateGymMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Communication Style
        </button>
      </div>
    </div>
  );
}
