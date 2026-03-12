import React, { useState, useMemo } from "react";
import { useGym } from "@/store/GymContext";
import { useListAiTasks, useGenerateOwnerBrief, useUpdateAiTask, useGenerateAiTasks, useGetDashboardStats, getListAiTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Bot, Sparkles, Send, CheckCircle2, Clock, Loader2,
  FileText, X, Filter, Users, CreditCard, UserPlus,
  Target, Megaphone, BarChart3, Edit2, RefreshCw,
} from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  outreach: { label: "Outreach", icon: Send, color: "bg-blue-500/10 text-blue-500" },
  onboarding: { label: "Onboarding", icon: UserPlus, color: "bg-emerald-500/10 text-emerald-500" },
  billing: { label: "Billing", icon: CreditCard, color: "bg-amber-500/10 text-amber-500" },
  retention: { label: "Retention", icon: Users, color: "bg-purple-500/10 text-purple-500" },
  leads: { label: "Leads", icon: Target, color: "bg-cyan-500/10 text-cyan-500" },
  campaign: { label: "Campaign", icon: Megaphone, color: "bg-pink-500/10 text-pink-500" },
  analysis: { label: "Analysis", icon: BarChart3, color: "bg-orange-500/10 text-orange-500" },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || { label: type, icon: FileText, color: "bg-secondary text-secondary-foreground" };
}

export function AiOperator() {
  const { activeGymId } = useGym();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [briefContent, setBriefContent] = useState<string | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [editTask, setEditTask] = useState<any | null>(null);
  const [editContent, setEditContent] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const { data: tasks, isLoading: tasksLoading, isError: tasksError } = useListAiTasks(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  const { data: stats } = useGetDashboardStats(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  const generateBrief = useGenerateOwnerBrief({
    mutation: {
      onMutate: () => setIsGeneratingBrief(true),
      onSuccess: (data: any) => {
        setBriefContent(data.content);
        setBriefOpen(true);
        toast({ title: "Owner Brief Generated", description: "Your weekly brief is ready to review." });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to generate brief. Please try again.", variant: "destructive" });
      },
      onSettled: () => setIsGeneratingBrief(false),
    }
  });

  const queryKey = getListAiTasksQueryKey(activeGymId as number);

  const updateTask = useUpdateAiTask({
    mutation: {
      onMutate: async ({ taskId, data }) => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData(queryKey);
        queryClient.setQueryData(queryKey, (old: any[] | undefined) => {
          if (!old) return old;
          if (data.status === 'dismissed' || data.status === 'approved') {
            return old.filter((t: any) => t.id !== taskId);
          }
          return old.map((t: any) => t.id === taskId ? { ...t, ...data } : t);
        });
        return { previous };
      },
      onError: (_err: any, _vars: any, context: any) => {
        if (context?.previous) {
          queryClient.setQueryData(queryKey, context.previous);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    }
  });

  const generateTasksMutation = useGenerateAiTasks({
    mutation: {
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({ queryKey });
        toast({ title: "Tasks Generated", description: `${data.created} new task${data.created !== 1 ? 's' : ''} created from gym data.` });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to generate tasks.", variant: "destructive" });
      },
    }
  });

  const pendingTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t: any) => t.status === 'pending');
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (!activeFilter) return pendingTasks;
    return pendingTasks.filter((t: any) => t.type === activeFilter);
  }, [pendingTasks, activeFilter]);

  const typeCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    pendingTasks.forEach((t: any) => {
      map[t.type] = (map[t.type] || 0) + 1;
    });
    return map;
  }, [pendingTasks]);

  const availableTypes = Object.keys(typeCountMap).sort();

  const activeMembers = stats?.activeMembers ?? 0;
  const atRiskMembers = stats?.atRiskMembers ?? 0;
  const pendingCount = pendingTasks.length;

  function handleApprove(task: any) {
    updateTask.mutate(
      { gymId: activeGymId as number, taskId: task.id, data: { status: "approved" as const } },
      {
        onSuccess: () => {
          toast({ title: "Task Approved", description: `"${task.title}" has been approved and queued for execution.` });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to approve task.", variant: "destructive" });
        },
      }
    );
  }

  function handleDismiss(task: any) {
    updateTask.mutate(
      { gymId: activeGymId as number, taskId: task.id, data: { status: "dismissed" as const } },
      {
        onSuccess: () => {
          toast({ title: "Task Dismissed", description: `"${task.title}" has been dismissed.` });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to dismiss task.", variant: "destructive" });
        },
      }
    );
  }

  function openEditModal(task: any) {
    setEditTask(task);
    setEditContent(task.aiContent || "");
  }

  function handleSaveEdit() {
    if (!editTask) return;
    updateTask.mutate(
      { gymId: activeGymId as number, taskId: editTask.id, data: { aiContent: editContent } },
      {
        onSuccess: () => {
          toast({ title: "Draft Updated", description: "Content has been saved." });
          setEditTask(null);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
        },
      }
    );
  }

  function handleEditAndApprove() {
    if (!editTask) return;
    updateTask.mutate(
      { gymId: activeGymId as number, taskId: editTask.id, data: { aiContent: editContent, status: "approved" as const } },
      {
        onSuccess: () => {
          toast({ title: "Task Approved", description: `"${editTask.title}" updated and approved.` });
          setEditTask(null);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to approve task.", variant: "destructive" });
        },
      }
    );
  }

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a gym to continue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 h-full flex flex-col">
      <header className="flex flex-col gap-3 md:gap-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">AI Operator</h1>
            </div>
            <p className="text-sm md:text-base text-muted-foreground">Your autonomous gym management assistant.</p>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => generateTasksMutation.mutate({ gymId: activeGymId as number })}
              disabled={generateTasksMutation.isPending}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-border hover:border-primary/50 text-foreground rounded-xl font-medium transition-all shadow-sm disabled:opacity-50 min-h-[44px] flex-1 sm:flex-initial"
            >
              {generateTasksMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <RefreshCw className="h-5 w-5 text-primary" />}
              <span>Scan & Generate</span>
            </button>
            <button 
              onClick={() => generateBrief.mutate({ gymId: activeGymId as number })}
              disabled={isGeneratingBrief}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-border hover:border-primary/50 text-foreground rounded-xl font-medium transition-all shadow-sm disabled:opacity-50 min-h-[44px] flex-1 sm:flex-initial"
            >
              {isGeneratingBrief ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Sparkles className="h-5 w-5 text-primary" />}
              <span>Owner Brief</span>
            </button>
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-r from-primary/10 via-background to-background border border-primary/20 rounded-2xl p-4 md:p-6 relative overflow-hidden shrink-0">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">Automated Retention Workflows Active</h2>
          <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
            The Intelligence Engine is currently monitoring <strong className="text-foreground">{activeMembers} active members</strong>.
            {atRiskMembers > 0 && <> It has flagged <strong className="text-foreground">{atRiskMembers} at-risk member{atRiskMembers !== 1 ? 's' : ''}</strong> for intervention.</>}
            {pendingCount > 0 && <> There {pendingCount === 1 ? 'is' : 'are'} <strong className="text-foreground">{pendingCount} pending task{pendingCount !== 1 ? 's' : ''}</strong> awaiting your review.</>}
            {pendingCount === 0 && <> All AI-generated tasks have been reviewed.</>}
          </p>
        </div>
        <Bot className="absolute -right-4 -bottom-4 h-24 md:h-32 w-24 md:w-32 text-primary/10" />
      </div>

      <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 md:p-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-foreground text-sm md:text-base">Pending Approvals</h3>
            <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs font-bold">{filteredTasks.length} Task{filteredTasks.length !== 1 ? 's' : ''}</span>
          </div>
          {availableTypes.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveFilter(null)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeFilter === null
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Filter className="h-3 w-3" />
                All ({pendingCount})
              </button>
              {availableTypes.map(type => {
                const config = getTypeConfig(type);
                const TypeIcon = config.icon;
                return (
                  <button
                    key={type}
                    onClick={() => setActiveFilter(activeFilter === type ? null : type)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeFilter === type
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <TypeIcon className="h-3 w-3" />
                    {config.label} ({typeCountMap[type]})
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar space-y-3 md:space-y-4">
          {tasksLoading ? (
             <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>
          ) : tasksError ? (
            <div className="text-center py-16 flex flex-col items-center">
              <X className="h-12 w-12 text-destructive/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Failed to load tasks</h3>
              <p className="text-muted-foreground text-sm mt-1">Please try refreshing the page.</p>
            </div>
          ) : filteredTasks.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {filteredTasks.map((task: any, i: number) => {
                const config = getTypeConfig(task.type);
                const TypeIcon = config.icon;
                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                    transition={{ delay: i * 0.05 }}
                    className="p-4 md:p-5 rounded-xl border border-border bg-background hover:border-primary/40 transition-colors group"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-foreground text-sm md:text-base">{task.title}</h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" /> {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Recently'}
                            <span className="mx-1">·</span>
                            <span className="capitalize">{config.label}</span>
                          </p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider self-start shrink-0 ${
                        task.priority === 'high' ? 'bg-destructive/10 text-destructive' : task.priority === 'low' ? 'bg-muted text-muted-foreground' : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {task.priority} Priority
                      </span>
                    </div>
                    
                    <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                      {task.description}
                    </p>

                    {task.aiContent && (
                      <div className="mb-3 md:mb-4 p-3 md:p-4 rounded-lg bg-white/5 border border-white/10 text-xs md:text-sm font-mono text-foreground/80 relative whitespace-pre-wrap">
                        <div className="absolute -top-3 left-4 bg-background px-2 text-[10px] text-primary uppercase font-bold flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Draft Content
                        </div>
                        {task.aiContent}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                      <button
                        onClick={() => handleDismiss(task)}
                        disabled={updateTask.isPending}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors min-h-[44px] order-3 sm:order-1"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => openEditModal(task)}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 rounded-lg transition-colors min-h-[44px] order-2"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleApprove(task)}
                        disabled={updateTask.isPending}
                        className="flex items-center justify-center gap-2 px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium shadow-md shadow-primary/20 transition-all min-h-[44px] order-1 sm:order-3 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve & Execute
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <div className="text-center py-16 flex flex-col items-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Inbox Zero</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {activeFilter ? `No pending ${getTypeConfig(activeFilter).label.toLowerCase()} tasks.` : 'All AI tasks have been handled.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!editTask} onOpenChange={(open) => { if (!open) setEditTask(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Draft Content</DialogTitle>
            <DialogDescription>{editTask?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              onClick={() => setEditTask(null)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={updateTask.isPending}
              className="px-4 py-2 text-sm font-medium border border-border hover:border-primary/40 rounded-lg transition-colors disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={handleEditAndApprove}
              disabled={updateTask.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium shadow-md shadow-primary/20 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Save & Approve
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={briefOpen} onOpenChange={setBriefOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Owner Brief
            </DialogTitle>
            <DialogDescription>AI-generated weekly strategic overview</DialogDescription>
          </DialogHeader>
          {briefContent && (
            <div className="prose prose-sm prose-invert max-w-none">
              {briefContent.split('\n').map((line, i) => {
                if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-foreground mt-4 mb-2">{line.replace('## ', '')}</h2>;
                if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-foreground mt-3 mb-1">{line.replace('### ', '')}</h3>;
                if (line.startsWith('- **')) {
                  const match = line.match(/^- \*\*(.+?)\*\*(.*)$/);
                  if (match) return <p key={i} className="text-sm text-muted-foreground ml-4 my-0.5"><strong className="text-foreground">{match[1]}</strong>{match[2]}</p>;
                }
                if (line.startsWith('- ')) return <p key={i} className="text-sm text-muted-foreground ml-4 my-0.5">{line.replace('- ', '• ')}</p>;
                if (line.match(/^\d+\./)) {
                  const match = line.match(/^(\d+\.)\s*\*\*(.+?)\*\*:\s*(.*)$/);
                  if (match) return <p key={i} className="text-sm text-muted-foreground ml-4 my-0.5">{match[1]} <strong className="text-foreground">{match[2]}</strong>: {match[3]}</p>;
                  return <p key={i} className="text-sm text-muted-foreground ml-4 my-0.5">{line}</p>;
                }
                if (line.startsWith('[')) return <p key={i} className="text-xs text-primary/60 mt-4 italic">{line}</p>;
                if (line.trim() === '') return <div key={i} className="h-2" />;
                return <p key={i} className="text-sm text-muted-foreground my-0.5">{line}</p>;
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
