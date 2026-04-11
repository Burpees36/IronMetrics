import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, useInView } from "framer-motion";
import {
  Check, Flame, Heart, Users, Shield, ArrowRight, Menu, X
} from "lucide-react";
import { ForgeOSLogo } from "@/components/brand/ForgeOSLogo";

const BASE = import.meta.env.BASE_URL;

function Section({ children, className = "", delay = 0, id }: { children: React.ReactNode; className?: string; delay?: number; id?: string }) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Philosophy", href: "#philosophy" },
    { label: "Solution", href: "#solution" },
    { label: "Our Story", href: "#founder" },
    { label: "Pricing", href: "#pricing" },
  ];

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#faf9f7]/80 backdrop-blur-xl border-b border-orange-100/50 shadow-sm" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <ForgeOSLogo size="md" />

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="text-sm font-medium text-slate-600 hover:text-orange-600 transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => setLocation("/login")}
              className="text-sm font-medium text-slate-600 hover:text-orange-600 transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => setLocation("/login")}
              className="text-sm font-semibold px-6 py-2.5 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-sm"
            >
              Join the Movement
            </button>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-[#faf9f7]/95 backdrop-blur-xl border-b border-orange-100/50"
        >
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="block w-full text-left text-sm text-slate-600 hover:text-orange-600 py-2 px-3 rounded-lg hover:bg-orange-50 transition-colors"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-2 border-t border-orange-100 space-y-2">
              <button
                onClick={() => setLocation("/login")}
                className="block w-full text-left text-sm text-slate-600 hover:text-orange-600 py-2 px-3 rounded-lg hover:bg-orange-50 transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => setLocation("/login")}
                className="w-full text-sm font-semibold px-5 py-2.5 rounded-full bg-orange-500 text-white hover:bg-orange-600"
              >
                Join the Movement
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  );
}

function Hero() {
  const [, setLocation] = useLocation();

  return (
    <section className="pt-32 pb-20 md:pt-40 md:pb-32 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="space-y-8 max-w-xl"
          >
            <span className="inline-flex items-center bg-orange-100/50 text-orange-700 border border-orange-200 px-4 py-1.5 rounded-full text-sm font-medium">
              For the gym owners who care
            </span>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
              Behind every great gym is a <span className="text-orange-500">community</span> worth fighting for.
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed font-medium">
              You didn't open a gym to stare at spreadsheets. You opened it to change lives. ForgeOS gives you back the time to focus on what actually matters: your people.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => setLocation("/login")}
                className="group flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-lg bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all"
              >
                Start your journey
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => {
                  const el = document.querySelector("#solution");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-8 py-4 rounded-full font-semibold text-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all"
              >
                See how it works
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-200/40 to-rose-200/40 rounded-[2.5rem] transform rotate-3 scale-105" />
            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white bg-white">
              <div className="p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                    <div className="w-3 h-3 rounded-full bg-green-400/60" />
                  </div>
                  <span className="text-xs text-slate-400 font-mono">ForgeOS — Dashboard</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Active Members", value: "342", change: "+12%" },
                    { label: "Retention Rate", value: "94.2%", change: "+3.1%" },
                    { label: "Monthly Revenue", value: "$48.5K", change: "+8.7%" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-[#faf9f7] rounded-xl p-3 sm:p-4 border border-slate-100">
                      <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                      <p className="text-lg sm:text-2xl font-bold text-slate-900">{stat.value}</p>
                      <p className="text-xs text-green-600 font-medium">{stat.change}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#faf9f7] rounded-xl p-3 sm:p-4 h-28 sm:h-32 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-2">AI Risk Radar</p>
                    <p className="text-sm text-slate-700">
                      <span className="text-orange-600 font-medium">3 members</span> showing churn signals — attendance dropped 40% over 2 weeks.
                    </p>
                  </div>
                  <div className="bg-[#faf9f7] rounded-xl p-3 sm:p-4 h-28 sm:h-32 border border-slate-100">
                    <p className="text-xs text-slate-500 mb-2">Revenue Trend</p>
                    <div className="flex items-end gap-1 h-16">
                      {[40, 55, 45, 65, 50, 70, 80].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%` }}>
                          <div className="w-full h-full bg-gradient-to-t from-orange-500 to-orange-300 rounded-t" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-4 border border-slate-100">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-200 to-rose-200 border-2 border-white flex items-center justify-center text-xs font-bold text-orange-700">
                    {String.fromCharCode(64 + i)}
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
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Philosophy() {
  return (
    <Section id="philosophy" className="py-24 bg-white px-4">
      <div className="max-w-4xl mx-auto text-center space-y-16">
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
          <Section delay={0} className="p-8 rounded-3xl bg-[#faf9f7] space-y-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Welcoming</h3>
            <p className="text-slate-600 leading-relaxed">
              Every person who walks in is greeted by name. Nobody feels like a stranger for long.
            </p>
          </Section>
          <Section delay={0.1} className="p-8 rounded-3xl bg-[#faf9f7] space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Transformative</h3>
            <p className="text-slate-600 leading-relaxed">
              It's where people discover they are capable of more than they ever thought possible.
            </p>
          </Section>
          <Section delay={0.2} className="p-8 rounded-3xl bg-[#faf9f7] space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Uplifting</h3>
            <p className="text-slate-600 leading-relaxed">
              A sanctuary where members build each other up, leaving the stress of the outside world behind.
            </p>
          </Section>
        </div>
      </div>
    </Section>
  );
}

function ProblemSection() {
  return (
    <Section className="py-24 px-4 bg-slate-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/0 via-slate-800/30 to-slate-900/0 pointer-events-none" />
      <div className="max-w-5xl mx-auto relative z-10 text-center space-y-12">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
          But running a gym pulls you away from the very community you built.
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
          {["Chasing failed payments", "Manually tracking attendance", "Answering endless emails", "Juggling 5 different apps"].map((problem, i) => (
            <Section key={problem} delay={i * 0.1} className="bg-slate-800/50 backdrop-blur border border-slate-700/50 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-slate-300 font-medium">{problem}</span>
            </Section>
          ))}
        </div>
      </div>
    </Section>
  );
}

function SolutionSection() {
  return (
    <Section id="solution" className="py-24 md:py-32 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-6 mb-20">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            Get back to what matters.
          </h2>
          <p className="text-xl text-slate-600">
            ForgeOS quietly handles the operations so you can focus on building relationships.
          </p>
        </div>

        <div className="space-y-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <Section delay={0} className="order-2 md:order-1 space-y-6">
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
            </Section>
            <Section delay={0.15} className="order-1 md:order-2 bg-white rounded-3xl p-6 shadow-xl border border-slate-100 transform md:rotate-2">
              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-200 to-rose-200 flex items-center justify-center text-sm font-bold text-orange-700">MJ</div>
                  <div>
                    <div className="font-bold text-slate-900">Marcus Johnson</div>
                    <div className="text-sm text-slate-500">Joined 2 years ago</div>
                  </div>
                  <span className="ml-auto bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">In class today</span>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 flex gap-3 text-orange-800 text-sm font-medium">
                  <Flame className="w-5 h-5 shrink-0" />
                  Marcus just hit his 200th class milestone! Make sure to congratulate him today.
                </div>
              </div>
            </Section>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <Section delay={0} className="bg-slate-900 rounded-3xl p-8 md:p-10 shadow-xl transform md:-rotate-1 text-white">
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-6 border-b border-slate-800">
                  <div className="font-bold text-lg">Failed Payments</div>
                  <span className="bg-rose-500/20 text-rose-300 text-xs font-medium px-2.5 py-1 rounded-full">3 this week</span>
                </div>
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-slate-800 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700" />
                        <div className="h-4 w-24 bg-slate-700 rounded" />
                      </div>
                      <div className="text-xs text-slate-400">Automated retry scheduled</div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
            <Section delay={0.15} className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-sm font-bold tracking-wide uppercase">
                Frictionless Operations
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-slate-900">Never have an awkward conversation about money again.</h3>
              <p className="text-lg text-slate-600 leading-relaxed">
                We handle the uncomfortable stuff gracefully. Failed payments are retried intelligently, and friendly, automated follow-ups are sent so you don't have to be the bad guy.
              </p>
              <button
                onClick={() => {
                  const el = document.querySelector("#pricing");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-orange-600 font-semibold text-lg hover:text-orange-700 transition-colors inline-flex items-center gap-2"
              >
                Explore billing features <ArrowRight className="w-5 h-5" />
              </button>
            </Section>
          </div>
        </div>
      </div>
    </Section>
  );
}

function FounderSection() {
  return (
    <Section id="founder" className="py-24 bg-[#f3f0ea] px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-[3rem] p-8 md:p-16 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4" />

          <div className="grid md:grid-cols-[1fr_2fr] gap-12 relative z-10">
            <div className="space-y-6">
              <div className="w-32 h-32 md:w-full md:aspect-square rounded-2xl overflow-hidden bg-slate-200">
                <img src={`${BASE}images/landing/founder-hunter.jpg`} alt="Hunter Brashears, Founder of ForgeOS" className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="font-bold text-xl text-slate-900">Hunter Brashears</h4>
                <p className="text-orange-600 font-medium">Founder, ForgeOS</p>
              </div>
            </div>

            <div className="space-y-6 text-lg text-slate-700 leading-relaxed">
              <h3 className="text-3xl font-bold text-slate-900 mb-8">Why ForgeOS Exists</h3>

              <p>
                I found CrossFit in 2015 when my dad introduced me to it, and not long after, I started coaching. That's where everything changed for me. Coaching CrossFit gave me an opportunity to see what people are truly capable of. I've seen confidence built, lives changed, and people become something they didn't think they could be. That's what I love most about it.
              </p>
              <p>
                Over time, I started to realize something though. The impact of a coach is powerful, but the impact of a great gym is exponential. When a gym is run well, when the systems are strong and the experience is right, every single member inside it benefits.
              </p>
              <p>
                That realization is what led me to build ForgeOS.
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
    </Section>
  );
}

function Pricing() {
  const [, setLocation] = useLocation();

  return (
    <Section id="pricing" className="py-24 bg-white px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900">Simple, honest pricing.</h2>
          <p className="text-xl text-slate-600">Grow your community without outgrowing your budget.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          <Section delay={0} className="bg-[#faf9f7] rounded-3xl p-8 border border-slate-200 flex flex-col">
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
            <button
              onClick={() => setLocation("/login")}
              className="w-full py-3 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition-colors"
            >
              Start with Insights
            </button>
          </Section>

          <Section delay={0.1} className="bg-slate-900 rounded-3xl p-8 border border-slate-800 flex flex-col relative transform md:-translate-y-4 shadow-2xl">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="bg-orange-500 text-white border-none px-4 py-1 text-sm uppercase tracking-wider font-bold rounded-full">
                Most Popular
              </span>
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
            <button
              onClick={() => setLocation("/login")}
              className="w-full py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors"
            >
              Start with Growth
            </button>
          </Section>

          <Section delay={0.2} className="bg-[#faf9f7] rounded-3xl p-8 border border-slate-200 flex flex-col">
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
            <button
              onClick={() => setLocation("/login")}
              className="w-full py-3 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition-colors"
            >
              Start with Pro
            </button>
          </Section>
        </div>
      </div>
    </Section>
  );
}

function CTASection() {
  const [, setLocation] = useLocation();

  return (
    <Section className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-rose-600" />
      <div className="max-w-4xl mx-auto relative z-10 text-center text-white space-y-8 py-12">
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          Build a gym they'll never want to leave.
        </h2>
        <p className="text-xl md:text-2xl text-orange-100 font-medium max-w-2xl mx-auto">
          Join the movement of gym owners who are putting community first.
        </p>
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => setLocation("/login")}
            className="px-10 py-4 rounded-full bg-white text-orange-600 hover:bg-slate-50 text-xl font-bold shadow-xl transition-colors"
          >
            Get Started Today
          </button>
          <p className="text-sm text-orange-200 mt-4 sm:mt-0 sm:ml-4">No credit card required. 14-day free trial.</p>
        </div>
      </div>
    </Section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
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
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-slate-900 selection:bg-orange-200">
      <Navbar />
      <Hero />
      <Philosophy />
      <ProblemSection />
      <SolutionSection />
      <FounderSection />
      <Pricing />
      <CTASection />
      <Footer />
    </div>
  );
}
