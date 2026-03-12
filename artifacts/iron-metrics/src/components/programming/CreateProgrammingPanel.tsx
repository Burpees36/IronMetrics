import React, { useState, useCallback, useEffect } from "react";
import { X, Plus, Loader2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SectionEditor,
  SectionTypePicker,
  SectionData,
  SectionType,
  createEmptySection,
} from "./SectionEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CreateProgrammingPanelProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ProgrammingDayData) => void;
  isSaving: boolean;
  initialDate: string;
  initialData?: ProgrammingDayData | null;
}

export interface ProgrammingDayData {
  date: string;
  title: string;
  status: "draft" | "published";
  sections: SectionData[];
}

export function CreateProgrammingPanel({
  open,
  onClose,
  onSave,
  isSaving,
  initialDate,
  initialData,
}: CreateProgrammingPanelProps) {
  const [date, setDate] = useState(initialData?.date || initialDate);
  const [title, setTitle] = useState(initialData?.title || "");
  const [status, setStatus] = useState<"draft" | "published">(
    initialData?.status || "draft"
  );
  const [sections, setSections] = useState<SectionData[]>(
    initialData?.sections || []
  );
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setDate(initialData?.date || initialDate);
      setTitle(initialData?.title || "");
      setStatus(initialData?.status || "draft");
      setSections(initialData?.sections || []);
      setShowTypePicker(false);
      setErrors({});
    }
  }, [open, initialData, initialDate]);

  const hasChanges =
    title !== (initialData?.title || "") ||
    sections.length !== (initialData?.sections?.length || 0) ||
    date !== (initialData?.date || initialDate);

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardDialog(true);
    } else {
      onClose();
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!date) {
      newErrors.date = "Date is required";
    }
    if (sections.length === 0) {
      newErrors.sections = "Add at least one section";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (publishStatus: "draft" | "published") => {
    if (!validate()) return;
    onSave({
      date,
      title: title.trim(),
      status: publishStatus,
      sections,
    });
  };

  const addSection = useCallback((type: SectionType) => {
    setSections((prev) => [...prev, createEmptySection(type)]);
    setShowTypePicker(false);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.sections;
      return next;
    });
  }, []);

  const updateSection = useCallback((index: number, section: SectionData) => {
    setSections((prev) => prev.map((s, i) => (i === index ? section : s)));
  }, []);

  const removeSection = useCallback((index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveSection = useCallback((index: number, direction: -1 | 1) => {
    setSections((prev) => {
      const next = [...prev];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= next.length) return prev;
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-background border-l border-border z-50 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {initialData ? "Edit Programming" : "Create Programming Day"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Build the day's workout programming with sections
                </p>
              </div>
              <button
                onClick={handleClose}
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.date;
                        return next;
                      });
                    }}
                  />
                  {errors.date && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {errors.date}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.title;
                        return next;
                      });
                    }}
                    placeholder="e.g. Monday Programming, Test Week Day 1"
                  />
                  {errors.title && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {errors.title}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold">Sections</Label>
                    <p className="text-xs text-muted-foreground">
                      Add workout sections in order
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTypePicker(!showTypePicker)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Section
                  </button>
                </div>

                {errors.sections && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.sections}
                  </p>
                )}

                <AnimatePresence>
                  {showTypePicker && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 border border-dashed border-border rounded-xl bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-3">
                          Choose a section type:
                        </p>
                        <SectionTypePicker onSelect={addSection} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-3">
                  {sections.map((section, i) => (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      layout
                    >
                      <SectionEditor
                        section={section}
                        index={i}
                        totalSections={sections.length}
                        onChange={(s) => updateSection(i, s)}
                        onRemove={() => removeSection(i)}
                        onMoveUp={() => moveSection(i, -1)}
                        onMoveDown={() => moveSection(i, 1)}
                      />
                    </motion.div>
                  ))}
                </div>

                {sections.length === 0 && !showTypePicker && (
                  <div className="text-center py-12 border border-dashed border-border rounded-xl">
                    <div className="h-12 w-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      No sections yet
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click "Add Section" to start building
                    </p>
                    <button
                      onClick={() => setShowTypePicker(true)}
                      className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Add First Section
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSave("draft")}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {isSaving && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Save as Draft
                </button>
                <button
                  onClick={() => handleSave("published")}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {isSaving && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Publish
                </button>
              </div>
            </div>
          </motion.div>

          <AlertDialog
            open={showDiscardDialog}
            onOpenChange={setShowDiscardDialog}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Discard changes?</AlertDialogTitle>
                <AlertDialogDescription>
                  You have unsaved changes. Are you sure you want to discard
                  them?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Editing</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onClose}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Discard
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </AnimatePresence>
  );
}
