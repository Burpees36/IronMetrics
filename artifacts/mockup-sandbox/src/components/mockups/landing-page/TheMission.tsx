import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Check, ArrowRight, Menu, Activity, Users, Zap, BarChart3, ChevronRight } from "lucide-react";

export function TheMission() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-900 font-sans selection:bg-orange-200">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Outfit:wght@300;400;500;600;700&display=swap');
        .font-editorial { font-family: 'Fraunces', serif; }
        .font-sans { font-family: 'Outfit', sans-serif; }
      `}} />

      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-stone-200/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-8 h-8 text-orange-500 fill-orange-500" />
            <span className="text-xl font-bold tracking-tight text-stone-900">
              FORGE<span className="text-orange-500">OS</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#philosophy" className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">Philosophy</a>
            <a href="#features" className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">How It Works</a>
            <a href="#about" className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">The Story</a>
            <a href="#pricing" className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-4">
            <a href="#" className="hidden md:block text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">Sign In</a>
            <Button className="bg-stone-900 hover:bg-stone-800 text-white rounded-full px-6">
              Join the Mission
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[90vh] min-h-[600px] flex items-center justify-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/__mockup/images/landing/hero-mission.png" 
            alt="Atmospheric gym environment" 
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-stone-900/60 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#FDFBF7] via-transparent to-transparent opacity-90"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center mt-20">
          <Badge className="bg-orange-500/20 text-orange-100 hover:bg-orange-500/30 border-orange-500/30 mb-8 px-4 py-1 text-sm tracking-wider uppercase font-medium backdrop-blur-sm">
            More Than Software
          </Badge>
          <h1 className="font-editorial text-5xl md:text-7xl lg:text-8xl font-medium text-white mb-8 leading-[1.1] tracking-tight">
            The world is sick.<br />
            <span className="text-orange-400 italic">We're building the cure.</span>
          </h1>
          <p className="text-xl md:text-2xl text-stone-200 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            CrossFit gyms are on the front lines of global health. We build the intelligence platform that ensures they never lose a battle.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8 h-14 text-lg w-full sm:w-auto">
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-full px-8 h-14 text-lg w-full sm:w-auto backdrop-blur-sm">
              Read the Manifesto
            </Button>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section id="philosophy" className="py-24 md:py-32 bg-[#FDFBF7]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-editorial text-4xl md:text-5xl lg:text-6xl text-stone-900 mb-12 leading-tight">
            We believe the modern gym is <br/>the last sanctuary for <span className="italic text-stone-500">real transformation.</span>
          </h2>
          <div className="w-16 h-1 bg-orange-500 mx-auto mb-12"></div>
          <p className="text-xl md:text-2xl text-stone-600 leading-relaxed font-light">
            People are drowning in screens, junk food, and stress. The fitness industry responded with mirrors and treadmills. You responded with heavy barbells and hard truths. We're here to make sure your gym doesn't just survive—it becomes the anchor your community needs.
          </p>
        </div>
      </section>

      {/* How We Make It Happen (Features) */}
      <section id="features" className="py-24 bg-stone-900 text-stone-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -top-[50%] -left-[10%] w-[70%] h-[100%] rounded-full bg-orange-600/30 blur-[120px]"></div>
          <div className="absolute top-[50%] -right-[10%] w-[50%] h-[80%] rounded-full bg-emerald-600/20 blur-[100px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="mb-20 md:flex items-end justify-between border-b border-stone-800 pb-8">
            <div className="max-w-2xl">
              <h2 className="font-editorial text-4xl md:text-5xl mb-6">How we make it happen.</h2>
              <p className="text-xl text-stone-400 font-light">
                Philosophy without execution is just poetry. ForgeOS provides the tactical tools to run a world-class operation.
              </p>
            </div>
            <Button variant="link" className="text-orange-400 hover:text-orange-300 hidden md:flex items-center gap-2 text-lg px-0">
              Explore all features <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                icon: Activity,
                title: "Predictive Intelligence",
                desc: "We analyze attendance and performance patterns to tell you who's at risk of churning before they even realize it themselves."
              },
              {
                icon: Users,
                title: "Community Management",
                desc: "Turn a roster of members into a deeply connected tribe. Automated milestones, personalized check-ins, and seamless communication."
              },
              {
                icon: Zap,
                title: "Frictionless Billing",
                desc: "Never let a failed payment disrupt a relationship. Automated recovery, intelligent pricing tiers, and seamless point-of-sale."
              }
            ].map((feature, i) => (
              <div key={i} className="group cursor-default">
                <div className="w-14 h-14 bg-stone-800 rounded-2xl flex items-center justify-center mb-8 text-orange-500 group-hover:bg-orange-500 group-hover:text-stone-900 transition-colors duration-300">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="font-editorial text-2xl mb-4">{feature.title}</h3>
                <p className="text-stone-400 leading-relaxed group-hover:text-stone-300 transition-colors">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Story / About Us */}
      <section id="about" className="py-32 bg-[#FDFBF7] border-b border-stone-200/60">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div>
              <h2 className="font-editorial text-4xl md:text-5xl lg:text-6xl mb-8 leading-tight text-stone-900">
                The Mom Test.
              </h2>
              <div className="space-y-6 text-lg text-stone-600 font-light leading-relaxed">
                <p>
                  "I see a sick world—people addicted to quick fixes, sedentary lifestyles, and hollow promises. I want to break that cycle, and I know exactly what it takes because CrossFit has been my anchor."
                </p>
                <p>
                  "The times I've shown up as the best version of myself in life are the times I've been consistent in the gym. But what turns people off is that it's hard. And it IS hard. But the challenges you overcome bear the sweetest fruit."
                </p>
                <p>
                  "The community is the soul of any real gym. It's where you find lifelong friendships, confidence, and growth—all while getting stronger. That's what we're protecting."
                </p>
                <p className="font-medium text-stone-900 text-xl italic mt-8 border-l-4 border-orange-500 pl-6 py-2">
                  "My goal is simple: I want to make a product so damn good that it elevates every gym that uses it. I want to make gyms good enough that I would feel comfortable sending my own mom there."
                </p>
              </div>
              <div className="mt-12 flex items-center gap-4">
                <div className="w-16 h-16 bg-stone-200 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-stone-300 flex items-center justify-center text-stone-500 font-bold text-xl">JD</div>
                </div>
                <div>
                  <div className="font-bold text-stone-900">John Doe</div>
                  <div className="text-stone-500 text-sm">Founder, ForgeOS</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/5] bg-stone-200 rounded-2xl overflow-hidden shadow-2xl relative z-10">
                <div className="absolute inset-0 bg-stone-800/10 mix-blend-multiply z-10"></div>
                <img 
                  src="/__mockup/images/landing/hero-mission.png" 
                  alt="Founder in gym" 
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                />
              </div>
              <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-orange-100 rounded-full -z-10 blur-3xl opacity-70"></div>
              <div className="absolute -top-8 -right-8 w-64 h-64 bg-emerald-50 rounded-full -z-10 blur-3xl opacity-70"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-stone-100">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="font-editorial text-4xl md:text-5xl text-center mb-16 text-stone-900">
            Gyms fulfilling the mission.
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-white border-0 shadow-sm rounded-2xl p-8 hover:shadow-md transition-shadow">
              <div className="flex gap-1 text-orange-500 mb-6">
                {[1,2,3,4,5].map(star => <svg key={star} className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
              </div>
              <p className="text-xl text-stone-700 font-editorial italic mb-8 leading-relaxed">
                "ForgeOS didn't just organize my billing. It gave me my time back. Now I spend my hours coaching athletes and changing lives, instead of chasing failed payments on a spreadsheet."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-stone-200 rounded-full flex items-center justify-center font-bold text-stone-500">SB</div>
                <div>
                  <div className="font-bold text-stone-900">Sarah Jenkins</div>
                  <div className="text-stone-500 text-sm">Owner, Ironclad Athletics</div>
                </div>
              </div>
            </Card>
            <Card className="bg-white border-0 shadow-sm rounded-2xl p-8 hover:shadow-md transition-shadow">
              <div className="flex gap-1 text-orange-500 mb-6">
                {[1,2,3,4,5].map(star => <svg key={star} className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
              </div>
              <p className="text-xl text-stone-700 font-editorial italic mb-8 leading-relaxed">
                "The predictive churn feature is magic. We've saved 15 memberships this quarter alone just by reaching out when ForgeOS told us someone was slipping away."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-stone-200 rounded-full flex items-center justify-center font-bold text-stone-500">MR</div>
                <div>
                  <div className="font-bold text-stone-900">Marcus Reed</div>
                  <div className="text-stone-500 text-sm">Head Coach, Apex Barbell</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 bg-[#FDFBF7]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="font-editorial text-4xl md:text-5xl mb-6 text-stone-900">Simple, transparent pricing.</h2>
            <p className="text-xl text-stone-500 font-light">Invest in your gym's operating system. No hidden fees, no per-member penalties.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Tier 1 */}
            <Card className="bg-white border-stone-200 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col">
              <CardHeader className="p-8 pb-6">
                <CardTitle className="font-editorial text-2xl mb-2 text-stone-900">Insights</CardTitle>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-stone-900">$99</span>
                  <span className="text-stone-500">/mo</span>
                </div>
                <CardDescription className="text-stone-600 text-base">Perfect for growing gyms looking to stabilize operations.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0 flex-1">
                <ul className="space-y-4">
                  {['Member Management', 'Basic Billing', 'Class Scheduling', 'Wodify Sync'].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-stone-600">
                      <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="p-8 pt-0">
                <Button className="w-full bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-xl h-12 text-lg">
                  Start with Insights
                </Button>
              </CardFooter>
            </Card>

            {/* Tier 2 */}
            <Card className="bg-stone-900 border-stone-800 text-white rounded-3xl shadow-xl transform md:-translate-y-4 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-orange-600"></div>
              <div className="absolute top-6 right-6">
                <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-0 font-medium px-3 py-1">Most Popular</Badge>
              </div>
              <CardHeader className="p-8 pb-6">
                <CardTitle className="font-editorial text-2xl mb-2 text-white">Growth</CardTitle>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-5xl font-bold text-white">$199</span>
                  <span className="text-stone-400">/mo</span>
                </div>
                <CardDescription className="text-stone-300 text-base">The complete operating system for scaling your community.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0 flex-1">
                <ul className="space-y-4">
                  {['Everything in Insights', 'Predictive AI Churn Risk', 'Automated Lead Nurturing', 'Advanced Reporting', 'Priority Support'].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-stone-300">
                      <Check className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="p-8 pt-0">
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-12 text-lg">
                  Start with Growth
                </Button>
              </CardFooter>
            </Card>

            {/* Tier 3 */}
            <Card className="bg-white border-stone-200 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col">
              <CardHeader className="p-8 pb-6">
                <CardTitle className="font-editorial text-2xl mb-2 text-stone-900">Pro</CardTitle>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-stone-900">$299</span>
                  <span className="text-stone-500">/mo</span>
                </div>
                <CardDescription className="text-stone-600 text-base">For established operations demanding full automation.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0 flex-1">
                <ul className="space-y-4">
                  {['Everything in Growth', 'Custom Branded App', 'Multi-location Support', 'Dedicated Success Manager', 'Custom API Access'].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-stone-600">
                      <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="p-8 pt-0">
                <Button className="w-full bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-xl h-12 text-lg">
                  Start with Pro
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-stone-900 text-center px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute top-[20%] left-[30%] w-[40%] h-[60%] rounded-full bg-orange-500/40 blur-[120px]"></div>
        </div>
        <div className="max-w-3xl mx-auto relative z-10">
          <Flame className="w-16 h-16 text-orange-500 mx-auto mb-8" />
          <h2 className="font-editorial text-5xl md:text-6xl text-white mb-8">Join the resistance.</h2>
          <p className="text-xl text-stone-300 mb-12 font-light">
            Build a gym that changes lives. We'll handle the rest.
          </p>
          <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-10 h-16 text-xl">
            Start Your Free Trial
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 py-12 border-t border-stone-900 text-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-stone-600" />
            <span className="font-bold tracking-tight text-stone-500">
              FORGE<span className="text-stone-600">OS</span>
            </span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
          <div>
            © {new Date().getFullYear()} ForgeOS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
