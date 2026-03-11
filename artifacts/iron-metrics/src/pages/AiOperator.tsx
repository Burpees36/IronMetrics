import React, { useState } from "react";
import { useGym } from "@/store/GymContext";
import { useListAiTasks, useGenerateOwnerBrief, useGenerateMemberOutreach, useGetDashboardStats } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Bot, Sparkles, Send, CheckCircle2, Clock, Loader2, FileText, ChevronRight } from "lucide-react";

export function AiOperator() {
  const { activeGymId } = useGym();
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  
  const { data: tasks, isLoading: tasksLoading } = useListAiTasks(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  const { data: stats } = useGetDashboardStats(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  const generateBrief = useGenerateOwnerBrief({
    mutation: {
      onMutate: () => setIsGeneratingBrief(true),
      onSettled: () => setIsGeneratingBrief(false),
    }
  });

  const taskCount = tasks?.length ?? 0;
  const activeMembers = stats?.activeMembers ?? 0;
  const atRiskMembers = stats?.atRiskMembers ?? 0;
  const outreachTasks = tasks?.filter((t: any) => t.type === 'outreach').length ?? 0;
  const otherTasks = taskCount - outreachTasks;

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
          
          <button 
            onClick={() => generateBrief.mutate({ gymId: activeGymId as number })}
            disabled={isGeneratingBrief}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-card border border-border hover:border-primary/50 text-foreground rounded-xl font-medium transition-all shadow-sm disabled:opacity-50 min-h-[44px] w-full sm:w-auto"
          >
            {isGeneratingBrief ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Sparkles className="h-5 w-5 text-primary" />}
            <span>Generate Owner Brief</span>
          </button>
        </div>
      </header>

      <div className="bg-gradient-to-r from-primary/10 via-background to-background border border-primary/20 rounded-2xl p-4 md:p-6 relative overflow-hidden shrink-0">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">Automated Retention Workflows Active</h2>
          <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
            The Intelligence Engine is currently monitoring <strong className="text-foreground">{activeMembers} active members</strong>.
            {atRiskMembers > 0 && <> It has flagged <strong className="text-foreground">{atRiskMembers} at-risk member{atRiskMembers !== 1 ? 's' : ''}</strong> for intervention.</>}
            {taskCount > 0 && <> There {taskCount === 1 ? 'is' : 'are'} <strong className="text-foreground">{taskCount} pending task{taskCount !== 1 ? 's' : ''}</strong> awaiting your review.</>}
            {taskCount === 0 && <> All AI-generated tasks have been reviewed.</>}
          </p>
        </div>
        <Bot className="absolute -right-4 -bottom-4 h-24 md:h-32 w-24 md:w-32 text-primary/10" />
      </div>

      <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 md:p-4 border-b border-border bg-muted/30 flex justify-between items-center shrink-0">
          <h3 className="font-semibold text-foreground text-sm md:text-base">Pending Approvals</h3>
          <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs font-bold">{taskCount} Task{taskCount !== 1 ? 's' : ''}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar space-y-3 md:space-y-4">
          {tasksLoading ? (
             <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>
          ) : tasks?.length ? tasks.map((task: any, i: number) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 md:p-5 rounded-xl border border-border bg-background hover:border-primary/40 transition-colors group"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                    task.type === 'outreach' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {task.type === 'outreach' ? <Send className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-foreground text-sm md:text-base">{task.title}</h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" /> {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Recently'}
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider self-start shrink-0 ${
                  task.priority === 'high' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground'
                }`}>
                  {task.priority} Priority
                </span>
              </div>
              
              <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                {task.description}
              </p>

              {task.aiContent && (
                <div className="mb-3 md:mb-4 p-3 md:p-4 rounded-lg bg-white/5 border border-white/10 text-xs md:text-sm font-mono text-foreground/80 relative">
                  <div className="absolute -top-3 left-4 bg-background px-2 text-[10px] text-primary uppercase font-bold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Draft Content
                  </div>
                  "{task.aiContent}"
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[44px] order-2 sm:order-1">
                  Edit
                </button>
                <button className="flex items-center justify-center gap-2 px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium shadow-md shadow-primary/20 transition-all min-h-[44px] order-1 sm:order-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Approve & Execute
                </button>
              </div>
            </motion.div>
          )) : (
            <div className="text-center py-16 flex flex-col items-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Inbox Zero</h3>
              <p className="text-muted-foreground text-sm mt-1">All AI tasks have been handled.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
