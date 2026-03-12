import { db } from "./index";
import { gymsTable, gymStaffTable, membersTable, memberNotesTable, timelineEventsTable, leadsTable, classesTable, attendanceTable, membershipPlansTable, subscriptionsTable, invoicesTable, productsTable, salesTable, workoutsTable, workoutResultsTable, announcementsTable, documentsTable, aiTasksTable } from "./schema";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  const existing = await db.select().from(gymsTable).limit(1);
  if (existing.length > 0) {
    console.log("Database already seeded. Skipping.");
    process.exit(0);
  }

  const [gym] = await db.insert(gymsTable).values({
    name: "Iron Athletics CrossFit",
    slug: "iron-athletics",
    email: "info@ironathletics.com",
    phone: "(512) 555-0142",
    address: "1847 Fitness Blvd",
    city: "Austin",
    state: "TX",
    zip: "78701",
    timezone: "America/Chicago",
    ownerId: "demo-owner",
  }).returning();

  console.log(`Created gym: ${gym.name} (ID: ${gym.id})`);

  await db.insert(gymStaffTable).values([
    { gymId: gym.id, userId: "demo-owner", firstName: "Alex", lastName: "Rivera", email: "alex@ironathletics.com", role: "gym_owner", specialties: ["programming", "business"], joinDate: "2022-03-01" },
    { gymId: gym.id, userId: "coach-1", firstName: "Jordan", lastName: "Chen", email: "jordan@ironathletics.com", role: "head_coach", specialties: ["Olympic lifting", "mobility"], joinDate: "2022-06-15" },
    { gymId: gym.id, userId: "coach-2", firstName: "Sam", lastName: "Martinez", email: "sam@ironathletics.com", role: "coach", specialties: ["gymnastics", "endurance"], joinDate: "2023-01-10" },
    { gymId: gym.id, userId: "coach-3", firstName: "Taylor", lastName: "Brooks", email: "taylor@ironathletics.com", role: "coach", specialties: ["powerlifting", "nutrition"], joinDate: "2023-08-01" },
  ]);

  const memberData = [
    { firstName: "Emma", lastName: "Wilson", email: "emma.w@email.com", phone: "(512) 555-1001", status: "active", membershipType: "Unlimited", joinDate: "2024-02-15", tags: ["competitor"], riskScore: "12", riskTier: "healthy", attendanceCount30d: 18 },
    { firstName: "Liam", lastName: "Johnson", email: "liam.j@email.com", phone: "(512) 555-1002", status: "active", membershipType: "Unlimited", joinDate: "2024-03-01", tags: ["morning crew"], riskScore: "8", riskTier: "healthy", attendanceCount30d: 22 },
    { firstName: "Olivia", lastName: "Brown", email: "olivia.b@email.com", phone: "(512) 555-1003", status: "active", membershipType: "3x/Week", joinDate: "2024-04-10", tags: [], riskScore: "45", riskTier: "moderate", attendanceCount30d: 6 },
    { firstName: "Noah", lastName: "Davis", email: "noah.d@email.com", phone: "(512) 555-1004", status: "active", membershipType: "Unlimited", joinDate: "2024-01-05", tags: ["competitor", "board member"], riskScore: "5", riskTier: "healthy", attendanceCount30d: 20 },
    { firstName: "Ava", lastName: "Garcia", email: "ava.g@email.com", phone: "(512) 555-1005", status: "active", membershipType: "3x/Week", joinDate: "2024-05-20", tags: ["newbie"], riskScore: "68", riskTier: "high", attendanceCount30d: 3 },
    { firstName: "Mason", lastName: "Rodriguez", email: "mason.r@email.com", phone: "(512) 555-1006", status: "active", membershipType: "Unlimited", joinDate: "2023-11-01", tags: ["morning crew"], riskScore: "15", riskTier: "low", attendanceCount30d: 16 },
    { firstName: "Sophia", lastName: "Martinez", email: "sophia.m@email.com", phone: "(512) 555-1007", status: "active", membershipType: "Open Gym", joinDate: "2024-06-01", tags: [], riskScore: "82", riskTier: "critical", attendanceCount30d: 1 },
    { firstName: "Logan", lastName: "Anderson", email: "logan.a@email.com", phone: "(512) 555-1008", status: "active", membershipType: "Unlimited", joinDate: "2023-09-15", tags: ["evening crew"], riskScore: "22", riskTier: "low", attendanceCount30d: 14 },
    { firstName: "Isabella", lastName: "Thomas", email: "isabella.t@email.com", phone: "(512) 555-1009", status: "active", membershipType: "3x/Week", joinDate: "2024-07-10", tags: ["newbie"], riskScore: "55", riskTier: "moderate", attendanceCount30d: 5 },
    { firstName: "Ethan", lastName: "Jackson", email: "ethan.j@email.com", phone: "(512) 555-1010", status: "active", membershipType: "Unlimited", joinDate: "2023-07-01", tags: ["competitor"], riskScore: "10", riskTier: "healthy", attendanceCount30d: 19 },
    { firstName: "Mia", lastName: "White", email: "mia.w@email.com", phone: "(512) 555-1011", status: "active", membershipType: "Unlimited", joinDate: "2024-08-05", tags: [], riskScore: "35", riskTier: "moderate", attendanceCount30d: 8 },
    { firstName: "Aiden", lastName: "Harris", email: "aiden.h@email.com", phone: "(512) 555-1012", status: "cancelled", membershipType: "3x/Week", joinDate: "2024-01-20", tags: [], riskScore: "95", riskTier: "critical", attendanceCount30d: 0 },
    { firstName: "Harper", lastName: "Clark", email: "harper.c@email.com", phone: "(512) 555-1013", status: "active", membershipType: "Unlimited", joinDate: "2023-12-01", tags: ["morning crew", "competitor"], riskScore: "7", riskTier: "healthy", attendanceCount30d: 21 },
    { firstName: "James", lastName: "Lewis", email: "james.l@email.com", phone: "(512) 555-1014", status: "hold", membershipType: "Unlimited", joinDate: "2024-02-28", tags: [], riskScore: "60", riskTier: "high", attendanceCount30d: 0 },
    { firstName: "Ella", lastName: "Robinson", email: "ella.r@email.com", phone: "(512) 555-1015", status: "active", membershipType: "3x/Week", joinDate: "2024-09-01", tags: ["newbie"], riskScore: "40", riskTier: "moderate", attendanceCount30d: 7 },
    { firstName: "Benjamin", lastName: "Walker", email: "ben.w@email.com", phone: "(512) 555-1016", status: "active", membershipType: "Open Gym", joinDate: "2024-06-15", tags: [], riskScore: "75", riskTier: "high", attendanceCount30d: 2 },
    { firstName: "Charlotte", lastName: "Hall", email: "charlotte.h@email.com", phone: "(512) 555-1017", status: "active", membershipType: "Unlimited", joinDate: "2023-10-01", tags: ["evening crew"], riskScore: "18", riskTier: "low", attendanceCount30d: 15 },
    { firstName: "Lucas", lastName: "Allen", email: "lucas.a@email.com", phone: "(512) 555-1018", status: "active", membershipType: "Unlimited", joinDate: "2024-04-01", tags: [], riskScore: "28", riskTier: "low", attendanceCount30d: 11 },
    { firstName: "Amelia", lastName: "Young", email: "amelia.y@email.com", phone: "(512) 555-1019", status: "active", membershipType: "3x/Week", joinDate: "2024-10-01", tags: ["newbie"], riskScore: "50", riskTier: "moderate", attendanceCount30d: 4 },
    { firstName: "Alexander", lastName: "King", email: "alex.k@email.com", phone: "(512) 555-1020", status: "cancelled", membershipType: "Unlimited", joinDate: "2023-06-01", tags: [], riskScore: "98", riskTier: "critical", attendanceCount30d: 0 },
  ];

  const members = await db.insert(membersTable).values(
    memberData.map((m) => ({
      gymId: gym.id,
      ...m,
      lastVisitDate: m.attendanceCount30d > 0 ? new Date(Date.now() - Math.floor(Math.random() * 7) * 86400000) : null,
      waiverSigned: true,
    }))
  ).returning();

  console.log(`Created ${members.length} members`);

  const plans = await db.insert(membershipPlansTable).values([
    { gymId: gym.id, name: "Unlimited", description: "Unlimited classes per month with open gym access", price: "165.00", billingInterval: "monthly", isActive: true },
    { gymId: gym.id, name: "3x/Week", description: "Up to 3 classes per week", price: "130.00", billingInterval: "monthly", sessionsPerMonth: 12, isActive: true },
    { gymId: gym.id, name: "Open Gym", description: "Open gym access only, no classes", price: "85.00", billingInterval: "monthly", isActive: true },
    { gymId: gym.id, name: "Drop-In", description: "Single class drop-in", price: "25.00", billingInterval: "monthly", isActive: true },
  ]).returning();

  console.log(`Created ${plans.length} membership plans`);

  for (const member of members) {
    if (member.status === "cancelled") continue;
    const plan = plans.find((p) => p.name === member.membershipType) || plans[0];
    await db.insert(subscriptionsTable).values({
      gymId: gym.id,
      memberId: member.id,
      memberName: `${member.firstName} ${member.lastName}`,
      planId: plan.id,
      planName: plan.name,
      status: member.status === "hold" ? "paused" : "active",
      amount: plan.price,
      failedPayments: 0,
      currentPeriodStart: new Date().toISOString().split("T")[0],
    });
  }

  console.log("Created subscriptions");

  const leads = await db.insert(leadsTable).values([
    { gymId: gym.id, firstName: "Ryan", lastName: "Cooper", email: "ryan.c@email.com", phone: "(512) 555-2001", stage: "new", source: "website" },
    { gymId: gym.id, firstName: "Jessica", lastName: "Perez", email: "jessica.p@email.com", phone: "(512) 555-2002", stage: "contacted", source: "referral" },
    { gymId: gym.id, firstName: "David", lastName: "Murphy", email: "david.m@email.com", phone: "(512) 555-2003", stage: "trial_scheduled", source: "instagram" },
    { gymId: gym.id, firstName: "Ashley", lastName: "Cox", email: "ashley.c@email.com", phone: "(512) 555-2004", stage: "trial_completed", source: "google" },
    { gymId: gym.id, firstName: "Brandon", lastName: "Reed", email: "brandon.r@email.com", phone: "(512) 555-2005", stage: "negotiating", source: "referral" },
    { gymId: gym.id, firstName: "Nicole", lastName: "Hill", email: "nicole.h@email.com", phone: "(512) 555-2006", stage: "new", source: "walk-in" },
    { gymId: gym.id, firstName: "Kevin", lastName: "Torres", email: "kevin.t@email.com", phone: "(512) 555-2007", stage: "contacted", source: "facebook", isStale: true },
    { gymId: gym.id, firstName: "Stephanie", lastName: "Evans", email: "steph.e@email.com", phone: "(512) 555-2008", stage: "lost", source: "website" },
  ]).returning();

  console.log("Created 8 leads");

  const now = new Date();
  const classNames = ["CrossFit WOD", "Olympic Lifting", "Endurance", "Open Gym", "Fundamentals", "Competitor Track"];
  const classInserts = [];
  for (let day = 0; day < 7; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    for (const [i, className] of classNames.entries()) {
      const hours = [6, 7, 9, 12, 16, 17, 18];
      for (const hour of hours.slice(0, 3 + Math.floor(Math.random() * 3))) {
        const start = new Date(date);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start);
        end.setHours(hour + 1);
        classInserts.push({
          gymId: gym.id,
          name: className,
          coachName: ["Jordan Chen", "Sam Martinez", "Taylor Brooks"][Math.floor(Math.random() * 3)],
          startTime: start,
          endTime: end,
          capacity: 20,
          enrolled: Math.floor(Math.random() * 18),
          type: "regular" as const,
          status: "scheduled" as const,
        });
      }
    }
  }

  await db.insert(classesTable).values(classInserts.slice(0, 50));
  console.log("Created classes for the next 7 days");

  const activeMembers = members.filter((m) => m.status === "active");
  const attendanceInserts = [];
  for (let day = 0; day < 14; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    const numCheckins = 15 + Math.floor(Math.random() * 20);
    for (let j = 0; j < numCheckins; j++) {
      const member = activeMembers[Math.floor(Math.random() * activeMembers.length)];
      const checkTime = new Date(date);
      checkTime.setHours(5 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60));
      attendanceInserts.push({
        gymId: gym.id,
        memberId: member.id,
        memberName: `${member.firstName} ${member.lastName}`,
        className: classNames[Math.floor(Math.random() * classNames.length)],
        checkinTime: checkTime,
        status: "present" as const,
      });
    }
  }

  await db.insert(attendanceTable).values(attendanceInserts);
  console.log(`Created ${attendanceInserts.length} attendance records`);

  const workouts = await db.insert(workoutsTable).values([
    { gymId: gym.id, title: "Fran", description: "21-15-9 Thrusters (95/65) & Pull-ups", workoutDate: now.toISOString().split("T")[0], type: "WOD", movements: ["thrusters", "pull-ups"] },
    { gymId: gym.id, title: "Grace", description: "30 Clean & Jerks for time (135/95)", workoutDate: new Date(now.getTime() - 86400000).toISOString().split("T")[0], type: "WOD", movements: ["clean-and-jerk"] },
    { gymId: gym.id, title: "Back Squat 5x5", description: "5 sets of 5 reps, building to heavy", workoutDate: new Date(now.getTime() - 2 * 86400000).toISOString().split("T")[0], type: "strength", movements: ["back-squat"] },
    { gymId: gym.id, title: "Murph", description: "1 mile run, 100 pull-ups, 200 push-ups, 300 squats, 1 mile run", workoutDate: new Date(now.getTime() - 3 * 86400000).toISOString().split("T")[0], type: "hero", movements: ["run", "pull-ups", "push-ups", "air-squats"] },
  ]).returning();

  console.log(`Created ${workouts.length} workouts`);

  await db.insert(productsTable).values([
    { gymId: gym.id, name: "Iron Athletics T-Shirt", price: "35.00", category: "apparel", stockQuantity: 45 },
    { gymId: gym.id, name: "Protein Shake", price: "8.00", category: "nutrition", stockQuantity: 100 },
    { gymId: gym.id, name: "Wrist Wraps", price: "22.00", category: "gear", stockQuantity: 30 },
    { gymId: gym.id, name: "Jump Rope", price: "28.00", category: "gear", stockQuantity: 20 },
    { gymId: gym.id, name: "Gym Hoodie", price: "55.00", category: "apparel", stockQuantity: 25 },
    { gymId: gym.id, name: "Pre-Workout", price: "12.00", category: "nutrition", stockQuantity: 60 },
  ]);

  console.log("Created 6 products");

  await db.insert(announcementsTable).values([
    { gymId: gym.id, title: "Spring Programming Update", content: "New programming cycle starts Monday! We're adding a dedicated Olympic lifting track on Tuesdays and Thursdays. Check the schedule for details.", authorName: "Alex Rivera", audience: "all", isPinned: true },
    { gymId: gym.id, title: "Holiday Hours", content: "The gym will operate on a modified schedule next week. Please check the updated class times in the schedule section.", authorName: "Alex Rivera", audience: "all" },
    { gymId: gym.id, title: "Competitor Series Registration", content: "Registration for the Spring Throwdown is now open! Limited to 30 spots. Sign up at the front desk or reply to this message.", authorName: "Jordan Chen", audience: "competitors" },
  ]);

  console.log("Created announcements");

  await db.insert(documentsTable).values([
    { gymId: gym.id, name: "Liability Waiver", type: "waiver", content: "Standard liability waiver for gym membership.", version: 2, isRequired: true },
    { gymId: gym.id, name: "Member Agreement", type: "agreement", content: "Membership terms and conditions agreement.", version: 1, isRequired: true },
    { gymId: gym.id, name: "Photo/Video Consent", type: "consent", content: "Consent for use of photos and videos for marketing.", version: 1, isRequired: false },
  ]);

  console.log("Created documents");

  const atRiskMembers2 = members.filter(m => (m.riskTier === 'high' || m.riskTier === 'critical') && m.status === 'active');
  const newMembers = members.filter(m => {
    const joinDate = new Date(m.joinDate || '');
    const daysSinceJoin = (Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceJoin < 200 && m.status === 'active';
  });
  const holdMembers = members.filter(m => m.status === 'hold');
  const staleLead = leads.find(l => l.isStale);
  const trialLead = leads.find(l => l.stage === 'trial_completed');

  const arm0 = atRiskMembers2[0] || members[0];
  const arm1 = atRiskMembers2[1] || members[1];
  const arm2 = atRiskMembers2[2] || members[2];
  const nm0 = newMembers[0] || members[3];
  const nm1 = newMembers[1] || members[4];
  const holdMem = holdMembers[0] || members[5];

  await db.insert(aiTasksTable).values([
    { gymId: gym.id, type: "outreach", title: `Re-engage ${arm0.firstName}`, description: `${arm0.firstName} ${arm0.lastName} has only visited ${arm0.attendanceCount30d} time(s) in the last 30 days. Send a personalized check-in email.`, priority: "high", status: "pending", targetId: arm0.id, targetType: "member", aiContent: `Hi ${arm0.firstName},\n\nWe noticed it's been a while since your last visit and wanted to check in. Your progress matters to us!\n\nWould you like to schedule a quick chat about your goals?\n\n[AI-Generated Draft]` },
    { gymId: gym.id, type: "outreach", title: `Win back ${arm1.firstName}`, description: `${arm1.firstName} ${arm1.lastName} shows critical churn risk. Send a win-back offer with a complimentary session.`, priority: "high", status: "pending", targetId: arm1.id, targetType: "member", aiContent: `Hi ${arm1.firstName},\n\nWe've made some exciting changes and added new programming. We'd love to offer you a complimentary drop-in session.\n\nWhat day works best for you?\n\n[AI-Generated Draft]` },
    { gymId: gym.id, type: "outreach", title: `Check in with ${arm2.firstName}`, description: `${arm2.firstName} has been flagged as high risk. A quick personal touchpoint could help retain them.`, priority: "medium", status: "pending", targetId: arm2.id, targetType: "member", aiContent: `Hi ${arm2.firstName},\n\nJust wanted to check in and see how things are going. We'd love to help you get back into a routine that works.\n\nLet us know if there's anything we can do!\n\n[AI-Generated Draft]` },
    { gymId: gym.id, type: "onboarding", title: `Onboarding plan for ${nm0.firstName}`, description: `${nm0.firstName} ${nm0.lastName} joined recently. Create a 30-day onboarding plan with coach check-ins.`, priority: "medium", status: "pending", targetId: nm0.id, targetType: "member", aiContent: `Welcome ${nm0.firstName}!\n\nYour 30-Day Plan:\n- Week 1: Fundamentals classes + gym orientation\n- Week 2: Try 3 different class times\n- Week 3: Coach check-in on goals & scaling\n- Week 4: First benchmark workout\n\n[AI-Generated Draft]` },
    { gymId: gym.id, type: "onboarding", title: `Follow up with ${nm1.firstName}`, description: `${nm1.firstName} is in their first 90 days. Schedule a progress check-in to boost retention.`, priority: "low", status: "pending", targetId: nm1.id, targetType: "member", aiContent: `Hi ${nm1.firstName},\n\nYou're making great progress! Let's schedule a quick 10-minute check-in to review your goals and make sure you're getting the most out of your membership.\n\n[AI-Generated Draft]` },
    { gymId: gym.id, type: "leads", title: `Follow up on stale lead: ${staleLead!.firstName} ${staleLead!.lastName}`, description: `${staleLead!.firstName} ${staleLead!.lastName} was contacted via ${staleLead!.source} but hasn't responded. Send a follow-up message before the lead goes cold.`, priority: "medium", status: "pending", targetId: staleLead!.id, targetType: "lead", aiContent: `Hi ${staleLead!.firstName},\n\nJust following up on our earlier conversation. We'd love to get you in for a free trial class.\n\nNo commitment — just come see if it's a good fit. What day works best?\n\n[AI-Generated Draft]` },
    { gymId: gym.id, type: "leads", title: `Convert trial lead: ${trialLead!.firstName} ${trialLead!.lastName}`, description: `${trialLead!.firstName} ${trialLead!.lastName} completed a trial class. Send a personalized follow-up to convert to membership.`, priority: "high", status: "pending", targetId: trialLead!.id, targetType: "lead", aiContent: `Hi ${trialLead!.firstName},\n\nGreat seeing you at your trial! We'd love to have you join the community. As a trial follow-up, we can offer you a discounted first month.\n\nReady to get started?\n\n[AI-Generated Draft]` },
    { gymId: gym.id, type: "billing", title: `Follow up on hold member: ${holdMem.firstName} ${holdMem.lastName}`, description: `${holdMem.firstName} ${holdMem.lastName} has been on hold. Check if they're ready to reactivate or if there's an issue to resolve.`, priority: "medium", status: "pending", targetId: holdMem.id, targetType: "member", aiContent: `Hi ${holdMem.firstName},\n\nWe noticed your membership is currently on hold. We'd love to have you back!\n\nIs there anything we can help with to make your return easier?\n\n[AI-Generated Draft]` },
    { gymId: gym.id, type: "campaign", title: "Launch spring referral campaign", description: "Design a member referral campaign offering a free month for each successful referral to boost growth.", priority: "low", status: "pending", aiContent: `Spring Referral Program:\n- Members get 1 free month for each referral who signs up\n- New members get 10% off first 3 months\n- Campaign runs April 1-30\n- Promote via email blast + in-gym signage\n\n[AI-Generated Draft]` },
    { gymId: gym.id, type: "retention", title: "Plan member appreciation event", description: "Organize a member appreciation event to strengthen community bonds and reduce churn.", priority: "low", status: "pending", aiContent: `Member Appreciation Day Plan:\n- Date: Last Saturday of the month\n- Partner WOD + BBQ social\n- Awards for consistency, improvement, community spirit\n- Photo ops for social media\n- Budget: ~$300\n\n[AI-Generated Draft]` },
    { gymId: gym.id, type: "analysis", title: "Review weekend class attendance", description: "Analyze weekend attendance trends and recommend scheduling changes", priority: "medium", status: "completed" },
  ]);

  console.log("Created AI tasks");

  for (const member of members.slice(0, 5)) {
    await db.insert(timelineEventsTable).values({
      memberId: member.id,
      gymId: gym.id,
      type: "joined",
      title: "Member joined",
      description: `${member.firstName} ${member.lastName} joined the gym`,
      date: new Date(member.joinDate || now.toISOString()),
    });
  }

  console.log("Created timeline events");
  console.log("✅ Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
