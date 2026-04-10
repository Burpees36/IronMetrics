import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Flame, Heart, Users, Shield, ArrowRight } from "lucide-react";

export function TheCommunity() {
  return (
    <div className="min-h-screen bg-[#faf9f7] font-sans text-slate-900 selection:bg-orange-200">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#faf9f7]/80 backdrop-blur-md border-b border-orange-100/50 transition-all">
        <div className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 shadow-sm">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">
              FORGE<span className="text-orange-500">OS</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-600">
            <a href="#philosophy" className="hover:text-orange-600 transition-colors">Philosophy</a>
            <a href="#solution" className="hover:text-orange-600 transition-colors">Solution</a>
            <a href="#founder" className="hover:text-orange-600 transition-colors">Our Story</a>
            <a href="#pricing" className="hover:text-orange-600 transition-colors">Pricing</a>
          </div>
          
          <div className="flex items-center gap-4">
            <a href="#" className="hidden md:block text-sm font-medium text-slate-600 hover:text-orange-600 transition-colors">Sign in</a>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 shadow-sm">
              Join the Movement
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="space-y-8 max-w-xl">
              <Badge variant="outline" className="bg-orange-100/50 text-orange-700 border-orange-200 px-4 py-1.5 rounded-full text-sm font-medium">
                For the gym owners who care
              </Badge>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                Behind every great gym is a <span className="text-orange-500">community</span> worth fighting for.
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed font-medium">
                You didn't open a gym to stare at spreadsheets. You opened it to change lives. 
                ForgeOS gives you back the time to focus on what actually matters: your people.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8 h-14 text-lg shadow-lg shadow-orange-500/20">
                  Start your journey
                </Button>
                <Button size="lg" variant="outline" className="rounded-full px-8 h-14 text-lg border-slate-200 text-slate-700 hover:bg-slate-50">
                  See how it works
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-200/40 to-rose-200/40 rounded-[2.5rem] transform rotate-3 scale-105 transition-transform duration-500 hover:rotate-6"></div>
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl aspect-[4/3] lg:aspect-[3/4] xl:aspect-[4/3] border-4 border-white">
                <img 
                  src="/__mockup/images/landing/hero-community.png" 
                  alt="A diverse, happy community at a CrossFit gym, high-fiving and smiling after a workout" 
                  className="object-cover w-full h-full"
                />
              </div>
              
              {/* Floating element */}
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-4 border border-slate-100">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="Member" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <div className="text-sm font-medium">
                  <div className="text-slate-900">Sarah, Mike & 142 others</div>
                  <div className="text-green-600 flex items-center gap-1">
                    <Heart className="w-3 h-3 fill-current" /> Active members
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section id="philosophy" className="py-24 bg-white px-4">
        <div className="container mx-auto max-w-4xl text-center space-y-16">
          <div className="space-y-6">
            <Heart className="w-12 h-12 text-orange-500 mx-auto opacity-80" />
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
              What makes a gym truly great?
            </h2>
            <p className="text-xl md:text-2xl text-slate-600 leading-relaxed max-w-3xl mx-auto font-medium">
              It's not the equipment. It's not the programming. It's the feeling of walking through those doors and knowing you belong.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 text-left">
            <div className="p-8 rounded-3xl bg-[#faf9f7] space-y-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Welcoming</h3>
              <p className="text-slate-600 leading-relaxed">
                Every person who walks in is greeted by name. Nobody feels like a stranger for long.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-[#faf9f7] space-y-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Transformative</h3>
              <p className="text-slate-600 leading-relaxed">
                It's where people discover they are capable of more than they ever thought possible.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-[#faf9f7] space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Uplifting</h3>
              <p className="text-slate-600 leading-relaxed">
                A sanctuary where members build each other up, leaving the stress of the outside world behind.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-24 px-4 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
        <div className="container mx-auto max-w-5xl relative z-10 text-center space-y-12">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
            But running a gym pulls you away from the very community you built.
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {["Chasing failed payments", "Manually tracking attendance", "Answering endless emails", "Juggling 5 different apps"].map((problem, i) => (
              <div key={i} className="bg-slate-800/50 backdrop-blur border border-slate-700/50 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                <span className="text-slate-300 font-medium">{problem}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution/Features Section */}
      <section id="solution" className="py-24 md:py-32 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center max-w-3xl mx-auto space-y-6 mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
              Get back to what matters.
            </h2>
            <p className="text-xl text-slate-600">
              ForgeOS quietly handles the operations so you can focus on building relationships.
            </p>
          </div>

          <div className="space-y-24">
            {/* Feature 1 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-bold tracking-wide uppercase">
                  Relationship Building
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-slate-900">Know your members, not just their billing status.</h3>
                <p className="text-lg text-slate-600 leading-relaxed">
                  ForgeOS surfaces the human insights you need. It tells you who hasn't been in for a week, whose birthday is coming up, and who hit a PR yesterday.
                </p>
                <ul className="space-y-4 pt-4">
                  {[
                    "Automated milestone celebrations",
                    "Attendance drop-off alerts",
                    "Rich member profiles with personal notes"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-1 bg-green-100 text-green-600 rounded-full p-1">
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="text-slate-700 font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1 md:order-2 bg-white rounded-3xl p-6 shadow-xl border border-slate-100 transform md:rotate-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                    <img src="https://i.pravatar.cc/150?img=32" alt="Avatar" className="w-12 h-12 rounded-full" />
                    <div>
                      <div className="font-bold text-slate-900">Marcus Johnson</div>
                      <div className="text-sm text-slate-500">Joined 2 years ago</div>
                    </div>
                    <Badge className="ml-auto bg-green-100 text-green-700 hover:bg-green-100">In class today</Badge>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4 flex gap-3 text-orange-800 text-sm font-medium">
                    <Flame className="w-5 h-5 shrink-0" />
                    Marcus just hit his 200th class milestone! Make sure to congratulate him today.
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="bg-slate-900 rounded-3xl p-8 md:p-10 shadow-xl transform md:-rotate-1 text-white">
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-6 border-b border-slate-800">
                    <div className="font-bold text-lg">Failed Payments</div>
                    <Badge variant="secondary" className="bg-rose-500/20 text-rose-300 border-none">3 this week</Badge>
                  </div>
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="bg-slate-800 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-700"></div>
                          <div className="h-4 w-24 bg-slate-700 rounded"></div>
                        </div>
                        <div className="text-xs text-slate-400">Automated retry scheduled</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-sm font-bold tracking-wide uppercase">
                  Frictionless Operations
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-slate-900">Never have an awkward conversation about money again.</h3>
                <p className="text-lg text-slate-600 leading-relaxed">
                  We handle the uncomfortable stuff gracefully. Failed payments are retried intelligently, and friendly, automated follow-ups are sent so you don't have to be the bad guy.
                </p>
                <Button variant="link" className="text-orange-600 p-0 h-auto text-lg font-semibold hover:text-orange-700">
                  Explore billing features <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us / Founder Section */}
      <section id="founder" className="py-24 bg-[#f3f0ea] px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="bg-white rounded-[3rem] p-8 md:p-16 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4"></div>
            
            <div className="grid md:grid-cols-[1fr_2fr] gap-12 relative z-10">
              <div className="space-y-6">
                <div className="w-32 h-32 md:w-full md:aspect-square rounded-2xl overflow-hidden bg-slate-200">
                  <img src="/__mockup/images/landing/founder-hunter.png" alt="Hunter Brashears, Founder of ForgeOS" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-slate-900">Hunter Brashears</h4>
                  <p className="text-orange-600 font-medium">Founder, ForgeOS</p>
                </div>
              </div>
              
              <div className="space-y-6 text-lg text-slate-700 leading-relaxed">
                <h3 className="text-3xl font-bold text-slate-900 mb-8">Why ForgeOS Exists</h3>
                
                <p>
                  I realized that if you want to make a bigger impact, you can't just coach one class at a time. You have to make the gyms themselves better. Because when a gym improves, every single member inside it benefits.
                </p>
                <p>
                  ForgeOS is a system designed to help gym owners understand who is at risk of leaving, where revenue is being lost, what actions actually move the needle — and most importantly, what to do next.
                </p>
                <p>
                  This isn't about software. It's about raising the standard of gyms. It's about creating places where someone could walk in for the first time, nervous and unsure, and feel like they belong.
                </p>
                <p className="font-semibold text-slate-900">
                  Make gyms better. Because better gyms create better people. And better people create a better world.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-white px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900">Simple, honest pricing.</h2>
            <p className="text-xl text-slate-600">Grow your community without outgrowing your budget.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {/* Insights Tier */}
            <div className="bg-[#faf9f7] rounded-3xl p-8 border border-slate-200 flex flex-col">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Insights</h3>
                <p className="text-slate-600 text-sm h-10">Perfect for new gyms focusing on building their core community.</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">$99</span>
                  <span className="text-slate-500 font-medium">/mo</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {["Member Management", "Basic Insights", "Class Scheduling", "Payment Processing"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700">
                    <Check className="w-5 h-5 text-orange-500 shrink-0" /> {feature}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full rounded-full h-12 border-slate-300 text-slate-700 hover:bg-slate-100">
                Start with Insights
              </Button>
            </div>

            {/* Growth Tier */}
            <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 flex flex-col relative transform md:-translate-y-4 shadow-2xl">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <Badge className="bg-orange-500 hover:bg-orange-500 text-white border-none px-4 py-1 text-sm uppercase tracking-wider font-bold">
                  Most Popular
                </Badge>
              </div>
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Growth</h3>
                <p className="text-slate-400 text-sm h-10">For thriving gyms ready to deepen their member relationships.</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$199</span>
                  <span className="text-slate-400 font-medium">/mo</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {[
                  "Everything in Insights",
                  "Automated Milestone Alerts",
                  "Advanced Retention Tools",
                  "Automated Billing Recovery",
                  "Priority Support"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <Check className="w-5 h-5 text-orange-500 shrink-0" /> {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full rounded-full h-12 bg-orange-500 hover:bg-orange-600 text-white border-none">
                Start with Growth
              </Button>
            </div>

            {/* Pro Tier */}
            <div className="bg-[#faf9f7] rounded-3xl p-8 border border-slate-200 flex flex-col">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Pro</h3>
                <p className="text-slate-600 text-sm h-10">For established gyms operating at the highest level.</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">$299</span>
                  <span className="text-slate-500 font-medium">/mo</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {["Everything in Growth", "Custom App Branding", "Multi-location Support", "API Access", "Dedicated Success Manager"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700">
                    <Check className="w-5 h-5 text-orange-500 shrink-0" /> {feature}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full rounded-full h-12 border-slate-300 text-slate-700 hover:bg-slate-100">
                Start with Pro
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-rose-600"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
        <div className="container mx-auto max-w-4xl relative z-10 text-center text-white space-y-8 py-12">
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Build a gym they'll never want to leave.
          </h2>
          <p className="text-xl md:text-2xl text-orange-100 font-medium max-w-2xl mx-auto">
            Join the movement of gym owners who are putting community first.
          </p>
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-white text-orange-600 hover:bg-slate-50 rounded-full px-10 h-16 text-xl font-bold shadow-xl">
              Get Started Today
            </Button>
            <p className="text-sm text-orange-200 mt-4 sm:mt-0 sm:ml-4">No credit card required. 14-day free trial.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-bold text-lg text-white">
              FORGE<span className="text-orange-500">OS</span>
            </span>
          </div>
          <div className="text-sm">
            © {new Date().getFullYear()} ForgeOS. Built for the community.
          </div>
        </div>
      </footer>
    </div>
  );
}
