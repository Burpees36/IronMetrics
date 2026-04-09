import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Flame, ArrowRight, TrendingUp, BarChart3, Clock, DollarSign, Activity, Users, Quote } from "lucide-react";
import { Link } from "wouter";

// Brand Logo Component
const ForgeOSLogo = () => (
  <div className="flex items-center gap-2">
    <div className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
      <Flame className="w-5 h-5 text-white" />
    </div>
    <span className="text-xl font-extrabold tracking-tight text-slate-900">
      FORGE<span className="text-orange-500">OS</span>
    </span>
  </div>
);

export function TheProof() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <ForgeOSLogo />
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Features</a>
              <a href="#about" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">About</a>
              <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="hidden md:flex font-medium">Log in</Button>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm">
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold mb-6 border border-emerald-100">
              <TrendingUp className="w-4 h-4" />
              <span>Proven Results</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.1]">
              Gyms using ForgeOS retain <span className="text-emerald-600">23% more members</span>.
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Stop guessing what works. ForgeOS is the only gym management platform driven by hard data, designed to measurably increase retention and recover lost revenue.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-14 px-8 text-lg bg-slate-900 hover:bg-slate-800 text-white shadow-lg w-full sm:w-auto">
                See The Platform
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <p className="text-sm text-slate-500 font-medium">No credit card required for 14-day trial.</p>
            </div>
          </div>

          <div className="mt-20 relative mx-auto max-w-5xl">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 h-full pointer-events-none" />
            <div className="rounded-2xl border border-slate-200/60 bg-white shadow-2xl p-2 shadow-slate-200/50">
              <img 
                src="/__mockup/images/landing/hero-proof.png" 
                alt="ForgeOS Dashboard showing positive retention metrics" 
                className="w-full rounded-xl border border-slate-100"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-slate-900 py-16 relative z-20 -mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-800">
            <div className="px-4 py-4 md:py-0">
              <div className="text-4xl md:text-5xl font-black text-white mb-2">150k+</div>
              <div className="text-slate-400 font-medium text-lg">Active Members Managed</div>
            </div>
            <div className="px-4 py-4 md:py-0">
              <div className="text-4xl md:text-5xl font-black text-emerald-400 mb-2">$4.2M</div>
              <div className="text-slate-400 font-medium text-lg">Failed Payments Recovered</div>
            </div>
            <div className="px-4 py-4 md:py-0">
              <div className="text-4xl md:text-5xl font-black text-white mb-2">18%</div>
              <div className="text-slate-400 font-medium text-lg">Average Retention Lift</div>
            </div>
          </div>
        </div>
      </section>

      {/* Before / After Section */}
      <section className="py-24 bg-slate-50" id="comparison">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">The Cost of Blind Operations</h2>
            <p className="text-lg text-slate-600">Running a gym on gut feeling leaves money on the table. Here is what happens when you switch to data-driven operations.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Before */}
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-400"></div>
              <CardContent className="p-8 md:p-10">
                <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <span className="text-red-500 bg-red-50 px-3 py-1 rounded-md text-sm">Without ForgeOS</span>
                </h3>
                <ul className="space-y-6">
                  <li className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-lg">Reactive Retention</h4>
                      <p className="text-slate-600 mt-1">You only know a member is unhappy when they email you to cancel.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-lg">Leaking Revenue</h4>
                      <p className="text-slate-600 mt-1">Failed cards pile up. Chasing them down takes hours of awkward texts.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-lg">Scattered Systems</h4>
                      <p className="text-slate-600 mt-1">Using 4 different apps to handle billing, programming, messaging, and waivers.</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* After */}
            <Card className="border-emerald-200 shadow-xl bg-white overflow-hidden relative ring-1 ring-emerald-500/10">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
              <CardContent className="p-8 md:p-10">
                <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md text-sm">With ForgeOS</span>
                </h3>
                <ul className="space-y-6">
                  <li className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center mt-1">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-lg">Predictive Retention</h4>
                      <p className="text-slate-600 mt-1">AI identifies at-risk members 30 days before they churn so you can intervene.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center mt-1">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-lg">Automated Recovery</h4>
                      <p className="text-slate-600 mt-1">Failed payments are automatically chased and updated, recovering 65% on autopilot.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center mt-1">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-lg">Unified Operations</h4>
                      <p className="text-slate-600 mt-1">Everything in one place. One bill, one system, one source of truth for your business.</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ROI Features Section */}
      <section className="py-24 bg-white" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">Features Built for ROI</h2>
            <p className="text-xl text-slate-600">Every feature in ForgeOS is designed to either make you money, save you money, or buy back your time.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:border-slate-300 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center mb-6">
                <Activity className="w-6 h-6 text-slate-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">AI Retention Brain</h3>
              <p className="text-slate-600 mb-6">Our Iron Metrics AI analyzes attendance, performance, and billing to flag churn risk with 89% accuracy.</p>
              <div className="pt-4 border-t border-slate-200">
                <div className="text-sm font-semibold text-emerald-600 mb-1">MEASURABLE OUTCOME</div>
                <div className="text-slate-900 font-medium">Save 3+ members/month</div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:border-slate-300 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center mb-6">
                <DollarSign className="w-6 h-6 text-slate-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Smart Billing Recovery</h3>
              <p className="text-slate-600 mb-6">Automated SMS and email cadences specifically timed to recover failed cards without annoying members.</p>
              <div className="pt-4 border-t border-slate-200">
                <div className="text-sm font-semibold text-emerald-600 mb-1">MEASURABLE OUTCOME</div>
                <div className="text-slate-900 font-medium">Recover $800+/month</div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:border-slate-300 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center mb-6">
                <Clock className="w-6 h-6 text-slate-700" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Autopilot Workflows</h3>
              <p className="text-slate-600 mb-6">Set up custom triggers for lead follow-ups, milestone celebrations, and absence check-ins.</p>
              <div className="pt-4 border-t border-slate-200">
                <div className="text-sm font-semibold text-emerald-600 mb-1">MEASURABLE OUTCOME</div>
                <div className="text-slate-900 font-medium">Save 10+ hours/week</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials / Social Proof */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Don't take our word for it.</h2>
            <p className="text-xl text-slate-400">Look at the numbers our gyms are putting up.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8">
                <Quote className="w-8 h-8 text-emerald-400 mb-6 opacity-50" />
                <p className="text-xl text-slate-200 leading-relaxed mb-8">
                  "Since switching to ForgeOS, the AI retention alerts have been a game changer. We caught 12 members who were quietly slipping away last quarter and saved their memberships. The software pays for itself tenfold."
                </p>
                <div className="flex items-center gap-4 pt-6 border-t border-slate-700">
                  <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold">
                    MD
                  </div>
                  <div>
                    <div className="font-bold text-white">Marcus Davis</div>
                    <div className="text-slate-400 text-sm">Owner, Ironclad Athletics</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-emerald-400 font-bold text-lg">+$1,800/mo</div>
                    <div className="text-slate-400 text-xs font-medium">Retained Revenue</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8">
                <Quote className="w-8 h-8 text-emerald-400 mb-6 opacity-50" />
                <p className="text-xl text-slate-200 leading-relaxed mb-8">
                  "I used to spend every Sunday morning chasing down failed credit cards. ForgeOS's recovery system handles 80% of it automatically now. I literally got my weekends back, and our cash flow is more predictable."
                </p>
                <div className="flex items-center gap-4 pt-6 border-t border-slate-700">
                  <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold">
                    SJ
                  </div>
                  <div>
                    <div className="font-bold text-white">Sarah Jenkins</div>
                    <div className="text-slate-400 text-sm">Owner, Apex Fitness</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-emerald-400 font-bold text-lg">12 hrs</div>
                    <div className="text-slate-400 text-xs font-medium">Saved per week</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About Us (Credibility) */}
      <section className="py-24 bg-white" id="about">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Built by gym owners, for gym owners.</h2>
              <div className="space-y-6 text-lg text-slate-600">
                <p>
                  ForgeOS wasn't built by a tech conglomerate looking for a new market. It was built out of frustration.
                </p>
                <p>
                  Coming from the CrossFit world, our founders were exhausted by software that was clunky, expensive, and didn't actually help run the business. We built Iron Metrics (our AI brain) specifically because existing tools don't tell you what matters.
                </p>
                <p>
                  <strong>The Mom Test:</strong> We hold ourselves to a simple quality bar. Is this software good enough that I'd send my own mother to a gym using it? If the answer is no, we don't ship it.
                </p>
                <p className="font-medium text-slate-900 border-l-4 border-emerald-500 pl-4 py-1">
                  Our mission is simple: Elevate every gym that uses our platform. Because when gyms succeed, communities thrive.
                </p>
              </div>
            </div>
            <div className="bg-slate-100 rounded-3xl p-8 aspect-square flex flex-col items-center justify-center text-center">
              <ForgeOSLogo />
              <p className="mt-8 text-slate-500 font-medium max-w-xs">Dedicated to building the operating system for the world's best functional fitness facilities.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-slate-50" id="pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">Pays for itself in month one.</h2>
            <p className="text-xl text-slate-600">Simple, transparent pricing. If ForgeOS saves just one membership or recovers two failed payments, you've made your money back.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
            {/* Insights */}
            <Card className="bg-white border-slate-200">
              <CardContent className="p-8">
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Insights</h3>
                  <p className="text-slate-500 text-sm h-10">Perfect for new gyms getting their systems dialed in.</p>
                  <div className="mt-6 flex items-baseline">
                    <span className="text-5xl font-black text-slate-900">$99</span>
                    <span className="text-slate-500 ml-2 font-medium">/mo</span>
                  </div>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-slate-700">Member Management</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-slate-700">Class Scheduling</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-slate-700">Basic Billing</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-slate-700">Standard Reports</span>
                  </li>
                </ul>
                <Button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold" variant="outline">
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>

            {/* Growth (Most Popular) */}
            <Card className="bg-slate-900 border-slate-800 text-white relative transform md:-translate-y-4 shadow-2xl">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-emerald-400 to-emerald-600 text-white px-4 py-1 rounded-full text-sm font-bold tracking-wide">
                MOST POPULAR
              </div>
              <CardContent className="p-8">
                <div className="mb-8 mt-2">
                  <h3 className="text-xl font-bold text-white mb-2">Growth</h3>
                  <p className="text-slate-400 text-sm h-10">Everything you need to run and scale a profitable gym.</p>
                  <div className="mt-6 flex items-baseline">
                    <span className="text-5xl font-black text-white">$199</span>
                    <span className="text-slate-400 ml-2 font-medium">/mo</span>
                  </div>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-200">Everything in Insights</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-200 font-medium">Iron Metrics AI Brain</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-200 font-medium">Smart Billing Recovery</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-200 font-medium">Predictive Retention</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-200">Automated Workflows</span>
                  </li>
                </ul>
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold border-0 h-12 text-lg shadow-lg shadow-emerald-500/20">
                  Start Free Trial
                </Button>
                <p className="text-center text-slate-400 text-xs mt-4">Pays for itself by saving ~1.5 members</p>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="bg-white border-slate-200">
              <CardContent className="p-8">
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Pro</h3>
                  <p className="text-slate-500 text-sm h-10">Advanced tools for multi-location or high-volume facilities.</p>
                  <div className="mt-6 flex items-baseline">
                    <span className="text-5xl font-black text-slate-900">$299</span>
                    <span className="text-slate-500 ml-2 font-medium">/mo</span>
                  </div>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-slate-700">Everything in Growth</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-slate-700">Custom Branded App</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-slate-700">Advanced API Access</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-slate-700">Priority Support</span>
                  </li>
                </ul>
                <Button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold" variant="outline">
                  Contact Sales
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-emerald-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">
            Ready to run your gym on hard data?
          </h2>
          <p className="text-xl text-emerald-50 mb-10 max-w-2xl mx-auto">
            Join the hundreds of owners who have stopped guessing and started growing. Setup takes less than 10 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-16 px-10 text-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl w-full sm:w-auto font-bold rounded-xl">
              Start Your 14-Day Free Trial
            </Button>
          </div>
          <p className="mt-6 text-emerald-100 font-medium">Cancel anytime. No credit card required to start.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 grayscale">
              <ForgeOSLogo />
            </div>
            <div className="text-slate-500 text-sm font-medium">
              © {new Date().getFullYear()} ForgeOS. All rights reserved.
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Terms</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Privacy</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
