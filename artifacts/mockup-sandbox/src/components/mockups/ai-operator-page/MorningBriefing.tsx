import React, { useState } from 'react';
import './_group.css';
import { 
  Target, 
  Mail, 
  Sparkles, 
  Send,
  Settings2,
  Clock,
  Award,
  Users,
  ArrowRight,
  Zap,
  Check,
  CreditCard,
  UserPlus
} from 'lucide-react';

export function MorningBriefing() {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      type: 'outreach',
      priority: 'critical',
      member: 'Sarah Johnson',
      story: "Sarah used to attend the 6AM Metcon class 4x/week. She hasn't been to the gym in 35 days, which is a significant drop-off from her usual routine. Her favorite coach is Marcus.",
      dataPoints: ['35 days absent', '6AM Metcon regular', 'Marcus (Coach)'],
      draft: "Hi Sarah, we missed you at the 6AM class! It's been a few weeks since we saw you crushing Metcon with Coach Marcus. Is everything okay? Let me know if you want to hop on a quick call to adjust your programming.",
      status: 'pending'
    },
    {
      id: 2,
      type: 'outreach',
      priority: 'high-risk',
      member: 'Tom Davies',
      story: "Tom's attendance has dropped from 3x/week to 1x/week over the last month. He usually comes to the 5PM Weightlifting class.",
      dataPoints: ['Attendance down 66%', '5PM Weightlifting'],
      draft: "Hey Tom, noticed we haven't seen you as much at the 5PM weightlifting classes lately. Just checking in to see how everything is going and if you need any help adjusting your routine?",
      status: 'pending'
    },
    {
      id: 3,
      type: 'outreach',
      priority: 'high-risk',
      member: 'Jessica Smith',
      story: "Jessica hasn't booked any classes for the upcoming week, which is unusual for her. She normally plans her schedule 7 days in advance.",
      dataPoints: ['No future bookings', 'Usually books early'],
      draft: "Hi Jessica, I noticed you don't have any classes booked for this week. Wanted to make sure everything is alright and see if you need help getting scheduled!",
      status: 'pending'
    },
    {
      id: 4,
      type: 'billing',
      priority: 'high',
      member: 'Mike Peterson',
      story: "Mike's credit card declined for his Unlimited Membership renewal ($199) yesterday. He has been a member for 2 years and usually pays on time. This is likely an expired card issue.",
      dataPoints: ['$199 past due', '2 years tenure', 'First decline'],
      draft: "Hi Mike, your payment method for the Unlimited Membership was declined yesterday. Could you please update your billing information so your membership doesn't get interrupted? Here is your secure link: [Link]",
      status: 'pending'
    },
    {
      id: 5,
      type: 'lead',
      priority: 'medium',
      member: 'David Chen',
      story: "David dropped in for a free intro class 3 days ago. He hit a PR on his back squat during the session but hasn't signed up for a membership yet.",
      dataPoints: ['Intro class completed', 'Back squat PR', '3 days stale'],
      draft: "David, great job on that back squat PR on Tuesday! We'd love to have you join us full-time. If you sign up by Friday, I can waive the initiation fee. What do you think?",
      status: 'pending'
    }
  ]);

  const [autopilot, setAutopilot] = useState({
    outreach: true,
    billing: true,
    leads: false
  });

  const handleApprove = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: 'approved' } : t));
  };

  const [activeTab, setActiveTab] = useState('feed');

  return (
    <div className="min-h-screen bg-[#fcfdfc] text-slate-900 pb-24 font-sans selection:bg-emerald-100">
      {/* Header / Masthead */}
      <header className="border-b border-emerald-100 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="font-display font-semibold text-2xl tracking-tight text-slate-900">
              The Daily Brief
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium tracking-wide uppercase">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium transition-colors hover:bg-emerald-100">
              <Zap className="w-4 h-4" />
              Autopilot Active
            </button>
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-600 font-display font-medium">
              IM
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        
        {/* Executive Summary Narrative */}
        <section className="mb-16">
          <h2 className="font-display text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            Executive Summary
          </h2>
          <div className="prose prose-slate prose-lg text-slate-600 leading-relaxed">
            <p>
              Good morning. You have <strong>214 active members</strong>, but <strong>68 are currently flagged as at-risk</strong>. 
              Overnight, the AI Operator automatically sent <strong>4 outreach emails</strong> and handled <strong>2 billing reminders</strong>.
            </p>
            <p>
              Your interventions are working. This month alone, automated outreach has saved <strong>12 members</strong>, 
              retaining <strong>$2,400 in monthly recurring revenue</strong> with a success rate of <strong>73%</strong>.
            </p>
            <p>
              Today, there are <strong>5 items</strong> that require your direct review.
            </p>
          </div>
        </section>

        <hr className="border-slate-200 mb-16" />

        {/* Narrative Task Feed */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-600" />
              Requires Attention
            </h2>
            <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full">
              5 Pending
            </span>
          </div>

          <div className="space-y-12">
            {tasks.map((task) => (
              <div key={task.id} className={`group relative transition-opacity duration-300 ${task.status === 'approved' ? 'opacity-50 grayscale' : ''}`}>
                {/* Status Overlay */}
                {task.status === 'approved' && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-emerald-200 flex items-center gap-2 text-emerald-700 font-medium">
                      <Check className="w-5 h-5" />
                      Email Sent
                    </div>
                  </div>
                )}

                {/* Priority / Type Indicator */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-2 h-2 rounded-full ${
                    task.priority === 'critical' ? 'bg-red-500' :
                    task.priority === 'high-risk' || task.priority === 'high' ? 'bg-orange-500' : 'bg-emerald-500'
                  }`} />
                  <span className="text-sm font-semibold tracking-wide uppercase text-slate-500 flex items-center gap-1">
                    {task.type} &middot; {task.priority}
                  </span>
                </div>

                {/* The Story */}
                <div className="mb-6">
                  <h3 className="font-display text-2xl font-semibold text-slate-900 mb-3">
                    {task.member}
                  </h3>
                  <p className="text-lg text-slate-700 leading-relaxed max-w-2xl">
                    {task.story}
                  </p>
                </div>

                {/* AI Draft Box */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                  <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      AI Draft
                    </div>
                    <div className="flex gap-2">
                      {task.dataPoints.map((dp, i) => (
                        <span key={i} className="text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                          {dp}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="font-serif text-slate-700 leading-relaxed whitespace-pre-wrap">
                      "{task.draft}"
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleApprove(task.id)}
                    disabled={task.status === 'approved'}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    Approve & Send
                  </button>
                  <button 
                    disabled={task.status === 'approved'}
                    className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Edit Draft
                  </button>
                  <button 
                    disabled={task.status === 'approved'}
                    className="p-3 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-slate-200 mb-16" />

        {/* Autopilot Status */}
        <section className="mb-16">
          <h2 className="font-display text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-emerald-600" />
            Autopilot Settings
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1 divide-y divide-slate-100">
            <div className="p-4 flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900">Retention Outreach</h4>
                <p className="text-sm text-slate-500 mt-0.5">Automatically contact members showing drop-off patterns.</p>
              </div>
              <button 
                onClick={() => setAutopilot(s => ({...s, outreach: !s.outreach}))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autopilot.outreach ? 'bg-emerald-500' : 'bg-slate-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autopilot.outreach ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900">Billing Recovery</h4>
                <p className="text-sm text-slate-500 mt-0.5">Follow up on failed payments immediately.</p>
              </div>
              <button 
                onClick={() => setAutopilot(s => ({...s, billing: !s.billing}))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autopilot.billing ? 'bg-emerald-500' : 'bg-slate-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autopilot.billing ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900">Lead Follow-ups</h4>
                <p className="text-sm text-slate-500 mt-0.5">Nurture intro class attendees automatically.</p>
              </div>
              <button 
                onClick={() => setAutopilot(s => ({...s, leads: !s.leads}))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autopilot.leads ? 'bg-emerald-500' : 'bg-slate-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autopilot.leads ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Activity History */}
        <section>
          <h2 className="font-display text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            Recent Impact
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <p className="text-slate-900 font-medium">Subscription Reactivated</p>
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 border border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <Zap className="w-3 h-3" /> Auto
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mt-1">John Doe updated his billing method after the automated outreach 2 days ago.</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">+$175 MRR</span>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">Billing</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <Users className="w-4 h-4 text-blue-700" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <p className="text-slate-900 font-medium">Member Returned</p>
                    <span className="text-xs font-semibold text-slate-500 border border-slate-200 bg-white px-2 py-0.5 rounded-full">
                      Sent by You
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mt-1">Emma Wilson checked into the 5PM class, 4 days after receiving a re-engagement email.</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">Saved</span>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">Outreach</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <UserPlus className="w-4 h-4 text-purple-700" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <p className="text-slate-900 font-medium">Lead Converted</p>
                    <span className="text-xs font-semibold text-slate-500 border border-slate-200 bg-white px-2 py-0.5 rounded-full">
                      Sent by You
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mt-1">Alex signed up for an Unlimited Membership after the intro class follow-up.</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">Converted</span>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">Lead</span>
                  </div>
                </div>
              </div>
            </div>
            
            <button className="w-full mt-6 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center justify-center gap-2 border-t border-slate-100">
              View Full History <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}
