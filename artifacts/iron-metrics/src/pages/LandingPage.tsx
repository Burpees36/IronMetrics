import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, useInView } from "framer-motion";
import {
  BrainCircuit, ShieldCheck, LayoutDashboard, UserX,
  ArrowRight, Check, Menu, X, Zap, BarChart3, Users, ChevronRight,
  CreditCard, Calendar, Target, TrendingUp, Mail, Sun, Moon,
  MessageSquare, Layers, Crown
} from "lucide-react";
import { useTheme } from "@/store/ThemeContext";
import { ForgeOSLogo } from "@/components/brand/ForgeOSLogo";

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
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
  ];

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-lg shadow-black/5 dark:shadow-black/20" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <ForgeOSLogo size="md" />

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setLocation("/login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
            >
              Log In
            </button>
            <button
              onClick={() => setLocation("/login")}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
            >
              Get Started
            </button>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
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
          className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border"
        >
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="block w-full text-left text-sm text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg hover:bg-secondary transition-colors"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-2 border-t border-border space-y-2">
              <button
                onClick={toggleTheme}
                className="flex w-full items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg hover:bg-secondary transition-colors"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>
              <button
                onClick={() => setLocation("/login")}
                className="block w-full text-left text-sm text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg hover:bg-secondary transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => setLocation("/login")}
                className="w-full text-sm font-semibold px-5 py-2.5 rounded-xl bg-primary text-primary-foreground"
              >
                Get Started
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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
            <Zap className="h-4 w-4" />
            AI-Powered Gym Management
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight mb-6"
        >
          Run your gym smarter,
          <br />
          <span className="text-primary">not harder</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
        >
          ForgeOS brings your members, billing, scheduling, and AI-powered insights into one clean platform — so you can spend less time in spreadsheets and more time on the floor.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={() => setLocation("/login")}
            className="group flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg bg-primary text-primary-foreground shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            Get Started Free
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => {
              const el = document.querySelector("#features");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg text-foreground border border-border hover:border-primary/30 hover:bg-secondary transition-all duration-200"
          >
            See Features
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          className="mt-16 sm:mt-20 relative max-w-4xl mx-auto"
        >
          <div className="glass-panel rounded-2xl p-3 sm:p-4">
            <div className="bg-background/80 rounded-xl p-4 sm:p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-muted-foreground font-mono">ForgeOS — Dashboard</span>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4">
                {[
                  { label: "Active Members", value: "342", change: "+12%" },
                  { label: "Retention Rate", value: "94.2%", change: "+3.1%" },
                  { label: "Monthly Revenue", value: "$48.5K", change: "+8.7%" },
                ].map((stat) => (
                  <div key={stat.label} className="glass-panel rounded-lg p-3 sm:p-4">
                    <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-lg sm:text-2xl font-display font-bold">{stat.value}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">{stat.change}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="glass-panel rounded-lg p-3 sm:p-4 h-28 sm:h-32">
                  <p className="text-xs text-muted-foreground mb-2">AI Risk Radar</p>
                  <p className="text-sm text-foreground/90">
                    <span className="text-primary font-medium">3 members</span> showing churn signals — attendance dropped 40% over the past 2 weeks.
                  </p>
                </div>
                <div className="glass-panel rounded-lg p-3 sm:p-4 h-28 sm:h-32">
                  <p className="text-xs text-muted-foreground mb-2">Revenue Trend</p>
                  <div className="flex items-end gap-1 h-16">
                    {[40, 55, 45, 65, 50, 70, 80].map((h, i) => (
                      <div key={i} className="flex-1 bg-primary/30 rounded-t" style={{ height: `${h}%` }}>
                        <div className="w-full bg-primary rounded-t" style={{ height: "60%" }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-2xl -z-10" />
        </motion.div>
      </div>
    </div>
  );
}

function TrustBar() {
  return (
    <Section className="py-16 sm:py-20 border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm text-muted-foreground uppercase tracking-widest mb-8">
          Trusted by forward-thinking gym owners
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-40">
          {["APEX FITNESS", "IRONHOUSE", "PEAK ATHLETICS", "FORGE GYM", "TITAN STRENGTH"].map((name) => (
            <span key={name} className="font-display font-bold text-lg sm:text-xl tracking-wider text-foreground/70">
              {name}
            </span>
          ))}
        </div>
      </div>
    </Section>
  );
}

function PainPoint() {
  return (
    <Section className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-6">
            Managing a gym shouldn't feel like{" "}
            <span className="text-primary">a second job</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-12">
            Between chasing payments, tracking attendance, scheduling classes, and trying to figure out why members are leaving — you barely have time to coach. ForgeOS handles the operations so you can focus on what you're actually good at.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                title: "Members Leaving Quietly",
                description: "By the time you notice attendance dropping, it's already too late. You need to know before they go.",
              },
              {
                title: "Billing is a Nightmare",
                description: "Failed payments, manual follow-ups, and no visibility into who owes what or why revenue dipped.",
              },
              {
                title: "Scattered Tools, Zero Clarity",
                description: "Spreadsheets here, a scheduling app there — your gym data lives everywhere and tells you nothing actionable.",
              },
            ].map((item, i) => (
              <Section key={item.title} delay={i * 0.1} className="glass-panel rounded-2xl p-6 text-left">
                <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                  <X className="h-5 w-5 text-destructive" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </Section>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function Features() {
  const features = [
    {
      icon: BrainCircuit,
      title: "AI Intelligence Hub",
      description: "Spot at-risk members before they cancel. The RSI score and Risk Radar analyze attendance, engagement, and billing patterns to surface who needs attention — and what to do about it.",
    },
    {
      icon: Users,
      title: "Complete Member Management",
      description: "Member profiles, attendance history, billing records, and notes — all in one place. Onboard new members in minutes with the built-in wizard and Stripe-powered payment collection.",
    },
    {
      icon: CreditCard,
      title: "Billing & Payment Recovery",
      description: "Subscriptions, plan upgrades, holds, discount codes, and automatic payment recovery links. Stop chasing failed payments manually — ForgeOS handles it.",
    },
    {
      icon: Calendar,
      title: "Scheduling & Classes",
      description: "Build your weekly schedule, assign coaches, track check-ins, and manage class capacity. Copy an entire week of programming in one click.",
    },
    {
      icon: Target,
      title: "Leads Pipeline",
      description: "Capture leads, track where they came from, and convert them into paying members with a visual pipeline — no CRM add-on required.",
    },
    {
      icon: Mail,
      title: "Gym-Branded Communications",
      description: "Send emails from your own domain, automate re-engagement campaigns, and let the AI Operator draft messages for you — all without leaving the platform.",
    },
  ];

  return (
    <Section id="features" className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
            Everything your gym needs,{" "}
            <span className="text-primary">nothing it doesn't</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            One platform for members, money, scheduling, and AI-powered insights. No duct tape required.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <Section key={feature.title} delay={i * 0.08} className="glass-panel rounded-2xl p-6 sm:p-8 group hover:border-primary/20 transition-colors duration-300">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">{feature.description}</p>
            </Section>
          ))}
        </div>
      </div>
    </Section>
  );
}

function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Set Up Your Gym",
      description: "Create your gym profile, add your membership plans, and connect Stripe for billing. You can be up and running in under 30 minutes.",
      icon: Zap,
    },
    {
      step: "02",
      title: "Manage Day-to-Day",
      description: "Add members, schedule classes, track attendance, and handle billing all from one dashboard — no more switching between apps.",
      icon: Layers,
    },
    {
      step: "03",
      title: "Let the AI Work",
      description: "The Iron Metrics intelligence engine continuously analyzes your data and surfaces what matters: who's at risk of leaving, where revenue is leaking, and what to do next.",
      icon: BrainCircuit,
    },
  ];

  return (
    <Section id="how-it-works" className="py-20 sm:py-28 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
            Up and running in{" "}
            <span className="text-primary">three steps</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No complex onboarding. No six-week implementation project. You're operational by end of day.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <Section key={step.title} delay={i * 0.15} className="relative text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6 mx-auto">
                <step.icon className="h-7 w-7 text-primary" />
              </div>
              <div className="text-xs font-mono text-primary/60 mb-2">{step.step}</div>
              <h3 className="font-display font-semibold text-2xl mb-3">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 -right-4 text-primary/20">
                  <ChevronRight className="h-8 w-8" />
                </div>
              )}
            </Section>
          ))}
        </div>
      </div>
    </Section>
  );
}

function Pricing() {
  const [, setLocation] = useLocation();

  const plans = [
    {
      name: "Insights",
      icon: BarChart3,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-400/10",
      price: "$99",
      description: "AI-powered intelligence layered on top of your existing gym operations.",
      features: [
        "Dashboard & financial analytics",
        "AI Intelligence Hub (RSI, Risk Radar)",
        "AI Operator — ask questions about your gym",
        "Billing management & payment recovery",
        "Retention analytics",
        "Resources & recommendation engine",
        "Full settings & configuration",
      ],
      cta: "Get Started",
      highlighted: false,
    },
    {
      name: "Growth",
      icon: TrendingUp,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      price: "$199",
      description: "A complete gym management platform. Members, leads, scheduling, and more.",
      features: [
        "Everything in Insights",
        "Member management & onboarding",
        "Leads pipeline & conversion",
        "Class scheduling & check-ins",
        "Workouts & programming hub",
        "Attendance tracking",
        "Staff management & permissions",
      ],
      cta: "Get Started",
      highlighted: true,
    },
    {
      name: "Pro",
      icon: Crown,
      iconColor: "text-violet-400",
      iconBg: "bg-violet-400/10",
      price: "$299",
      description: "AI automation and advanced analytics for gyms serious about growth.",
      features: [
        "Everything in Growth",
        "AI-powered email automation",
        "Gym-branded email sending",
        "Advanced cohort analytics",
        "Revenue forecasting",
        "Class templates & copy-week scheduling",
      ],
      cta: "Get Started",
      highlighted: false,
    },
  ];

  return (
    <Section id="pricing" className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
            Simple, transparent{" "}
            <span className="text-primary">pricing</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start with the intelligence layer and expand as you need. Every plan includes the core platform — no hidden fees.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <Section
              key={plan.name}
              delay={i * 0.1}
              className={`rounded-2xl p-6 sm:p-8 flex flex-col relative ${
                plan.highlighted
                  ? "glass-panel border-primary/30"
                  : "glass-panel"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full whitespace-nowrap">
                  Most Popular
                </div>
              )}
              <div className={`h-10 w-10 ${plan.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                <plan.icon className={`h-5 w-5 ${plan.iconColor}`} />
              </div>
              <h3 className="font-display font-bold text-xl mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-4xl font-display font-bold">{plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setLocation("/login")}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    : "border border-border hover:border-primary/30 hover:bg-secondary text-foreground"
                }`}
              >
                {plan.cta}
              </button>
            </Section>
          ))}
        </div>
      </div>
    </Section>
  );
}

function Testimonials() {
  const testimonials = [
    {
      quote: "I used to spend Sunday afternoons digging through reports trying to figure out who was at risk. ForgeOS just tells me. It's the first tool that actually saves me time.",
      name: "Marcus D.",
      role: "Owner, Apex CrossFit",
    },
    {
      quote: "The billing recovery alone paid for the subscription in the first month. We had no idea how many failed payments were just slipping through.",
      name: "Jamie R.",
      role: "Head Coach & Co-owner",
    },
    {
      quote: "Having leads, members, scheduling, and analytics all in one place changed how we operate. Our staff actually uses it, which is more than I can say for our old software.",
      name: "Sarah K.",
      role: "General Manager, Peak Athletics",
    },
  ];

  return (
    <Section className="py-20 sm:py-28 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[100px]" />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
            Gym owners who made the{" "}
            <span className="text-primary">switch</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <Section key={t.name} delay={i * 0.1} className="glass-panel rounded-2xl p-6 sm:p-8 flex flex-col">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-4 w-4 rounded-sm bg-primary/80" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-6">"{t.quote}"</p>
              <div>
                <p className="font-semibold text-foreground text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </Section>
          ))}
        </div>
      </div>
    </Section>
  );
}

function CTA() {
  const [, setLocation] = useLocation();

  return (
    <Section className="py-20 sm:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="glass-panel rounded-3xl p-10 sm:p-16 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/10 rounded-full blur-[100px]" />
          </div>
          <div className="relative z-10">
            <div className="flex justify-center mb-6">
              <ForgeOSLogo size="xl" variant="icon" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
              Ready to take control of your gym?
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              Join gym owners who've replaced the guesswork with real data, real automation, and a platform that actually works.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setLocation("/login")}
                className="group flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg bg-primary text-primary-foreground shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                Start for Free
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => {
                  const el = document.querySelector("#pricing");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-8 py-4 rounded-xl font-semibold text-lg text-foreground border border-border hover:border-primary/30 hover:bg-secondary transition-all duration-200"
              >
                View Pricing
              </button>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function Footer() {
  const [, setLocation] = useLocation();

  return (
    <footer className="border-t border-border py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <ForgeOSLogo size="sm" />
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => setLocation("/login")} className="hover:text-foreground transition-colors">Log In</button>
            <button onClick={() => {
              const el = document.querySelector("#pricing");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }} className="hover:text-foreground transition-colors">Pricing</button>
            <button onClick={() => {
              const el = document.querySelector("#features");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }} className="hover:text-foreground transition-colors">Features</button>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} ForgeOS. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <TrustBar />
      <PainPoint />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}
