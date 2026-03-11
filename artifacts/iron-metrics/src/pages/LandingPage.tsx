import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, useInView } from "framer-motion";
import {
  Dumbbell, BrainCircuit, ShieldCheck, LayoutDashboard, UserX,
  ArrowRight, Check, Menu, X, Zap, BarChart3, Users, ChevronRight,
  Github, Twitter, Linkedin, Mail
} from "lucide-react";

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
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/80 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-foreground">
              IRON<span className="text-primary">METRICS</span>
            </span>
          </div>

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
              onClick={() => setLocation("/login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
            >
              Log In
            </button>
            <button
              onClick={() => setLocation("/login")}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(251,191,36,0.2)] hover:shadow-[0_0_30px_rgba(251,191,36,0.4)]"
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
          className="md:hidden bg-background/95 backdrop-blur-xl border-b border-white/5"
        >
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="block w-full text-left text-sm text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <button
                onClick={() => setLocation("/login")}
                className="block w-full text-left text-sm text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
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
            AI-Powered Gym Intelligence
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight mb-6"
        >
          The metrics your gym
          <br />
          <span className="text-primary">actually needs</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
        >
          Stop drowning in cluttered dashboards. Iron Metrics surfaces the insights that drive retention,
          revenue, and growth — clean, fast, and powered by AI.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={() => setLocation("/login")}
            className="group flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg bg-primary text-primary-foreground shadow-[0_0_30px_rgba(251,191,36,0.3)] hover:shadow-[0_0_50px_rgba(251,191,36,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            Get Started Free
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => {
              const el = document.querySelector("#features");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg text-foreground border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-200"
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
            <div className="bg-background/80 rounded-xl p-4 sm:p-6 border border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-muted-foreground font-mono">Iron Metrics Dashboard</span>
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
                    <p className="text-xs text-green-400">{stat.change}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="glass-panel rounded-lg p-3 sm:p-4 h-28 sm:h-32">
                  <p className="text-xs text-muted-foreground mb-2">AI Insight</p>
                  <p className="text-sm text-foreground/90">
                    <span className="text-primary font-medium">3 members</span> showing at-risk patterns.
                    Engagement dropped 40% in the last 2 weeks.
                  </p>
                </div>
                <div className="glass-panel rounded-lg p-3 sm:p-4 h-28 sm:h-32">
                  <p className="text-xs text-muted-foreground mb-2">Weekly Trend</p>
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
    <Section className="py-16 sm:py-20 border-y border-white/5">
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
            Your gym software is{" "}
            <span className="text-primary">hiding your data</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-12">
            Most gym management platforms bury critical metrics under layers of menus, confusing reports,
            and outdated interfaces. You shouldn't need a data science degree to understand how your business is doing.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                title: "Cluttered Dashboards",
                description: "Dozens of tabs, endless clicks, and still no clear picture of what matters.",
              },
              {
                title: "No Predictive Insights",
                description: "You only find out a member churned after they've already left.",
              },
              {
                title: "Data Without Action",
                description: "Reports that tell you what happened, but never what to do next.",
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
      title: "AI-Powered Insights",
      description: "Machine learning analyzes member behavior patterns to surface actionable insights you'd never find manually.",
    },
    {
      icon: UserX,
      title: "At-Risk Member Alerts",
      description: "Know which members are likely to churn before they do. Get proactive recommendations to re-engage them.",
    },
    {
      icon: LayoutDashboard,
      title: "Clean, Modern Dashboard",
      description: "Every metric that matters — front and center. No clutter, no hunting. Just the data you need at a glance.",
    },
    {
      icon: ShieldCheck,
      title: "Retention Intelligence",
      description: "Track cohort retention, engagement trends, and lifetime value with beautiful visualizations built for gym owners.",
    },
  ];

  return (
    <Section id="features" className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
            Built for gyms that{" "}
            <span className="text-primary">care about growth</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Four powerful capabilities that transform how you understand and grow your gym.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <Section key={feature.title} delay={i * 0.1} className="glass-panel rounded-2xl p-6 sm:p-8 group hover:border-primary/20 transition-colors duration-300">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
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
      title: "Connect",
      description: "Link your gym management system in minutes. We import your member data securely and start analyzing immediately.",
      icon: Zap,
    },
    {
      step: "02",
      title: "Analyze",
      description: "Our AI engine processes your data to uncover retention patterns, revenue trends, and at-risk members.",
      icon: BarChart3,
    },
    {
      step: "03",
      title: "Act",
      description: "Receive clear, actionable recommendations. Re-engage at-risk members, optimize pricing, and grow your gym.",
      icon: Users,
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
            Get started in{" "}
            <span className="text-primary">three simple steps</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No complex setup. No training required. See results from day one.
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
      name: "Starter",
      price: "$49",
      description: "For single-location gyms getting started with data-driven decisions.",
      features: [
        "Up to 200 members",
        "Core dashboard & analytics",
        "Member retention tracking",
        "Email support",
        "Monthly reports",
      ],
      cta: "Start Free Trial",
      highlighted: false,
    },
    {
      name: "Pro",
      price: "$99",
      description: "For growing gyms that need AI-powered insights and predictive analytics.",
      features: [
        "Up to 1,000 members",
        "AI-powered insights",
        "At-risk member alerts",
        "Revenue forecasting",
        "Priority support",
        "Weekly AI reports",
      ],
      cta: "Start Free Trial",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For multi-location operators and franchise groups needing full customization.",
      features: [
        "Unlimited members",
        "Multi-location support",
        "Custom integrations",
        "Dedicated account manager",
        "SLA & uptime guarantee",
        "Custom AI models",
      ],
      cta: "Request Demo",
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
            Start free for 14 days. No credit card required. Upgrade as your gym grows.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <Section
              key={plan.name}
              delay={i * 0.1}
              className={`rounded-2xl p-6 sm:p-8 flex flex-col ${
                plan.highlighted
                  ? "glass-panel border-primary/30 relative"
                  : "glass-panel"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                  Most Popular
                </div>
              )}
              <h3 className="font-display font-bold text-xl mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-4xl font-display font-bold">{plan.price}</span>
                {plan.price !== "Custom" && <span className="text-muted-foreground">/month</span>}
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
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(251,191,36,0.2)] hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] hover:-translate-y-0.5"
                    : "border border-white/10 text-foreground hover:bg-white/5 hover:border-white/20"
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

function ClosingCTA() {
  const [, setLocation] = useLocation();

  return (
    <Section className="py-20 sm:py-28 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[150px]" />
      </div>
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-6">
          Ready to see what you've{" "}
          <span className="text-primary">been missing?</span>
        </h2>
        <p className="text-lg text-muted-foreground mb-10">
          Join gym owners who've switched to smarter analytics. Start your free trial today — no credit card required.
        </p>
        <button
          onClick={() => setLocation("/login")}
          className="group inline-flex items-center gap-2 px-10 py-4 rounded-xl font-semibold text-lg bg-primary text-primary-foreground shadow-[0_0_30px_rgba(251,191,36,0.3)] hover:shadow-[0_0_50px_rgba(251,191,36,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
        >
          Get Started Free
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </Section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30">
                <Dumbbell className="h-4 w-4 text-primary" />
              </div>
              <span className="font-display font-bold text-lg tracking-tight">
                IRON<span className="text-primary">METRICS</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              The intelligence engine for modern gyms. AI-powered analytics that drive retention and growth.
            </p>
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground mb-4">Product</h4>
            <ul className="space-y-2">
              {["Features", "Pricing", "Integrations", "Changelog"].map((item) => (
                <li key={item}>
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground mb-4">Company</h4>
            <ul className="space-y-2">
              {["About", "Blog", "Careers", "Contact"].map((item) => (
                <li key={item}>
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((item) => (
                <li key={item}>
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-white/5 gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Iron Metrics. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {[Twitter, Linkedin, Github, Mail].map((Icon, i) => (
              <span key={i} className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
                <Icon className="h-4 w-4" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      <Hero />
      <TrustBar />
      <PainPoint />
      <Features />
      <HowItWorks />
      <Pricing />
      <ClosingCTA />
      <Footer />
    </div>
  );
}
