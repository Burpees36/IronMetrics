export const DEFAULT_LEAD_SEQUENCES = [
  {
    name: "New Lead Welcome",
    description: "Automated welcome flow for new leads entering the pipeline",
    type: "new_lead_welcome",
    triggerStage: "new",
    steps: [
      {
        stepOrder: 1,
        channel: "email",
        delayMinutes: 5,
        subject: "Welcome to {{gym_name}}, {{first_name}}!",
        messageContent:
          "Hi {{first_name}},\n\n" +
          "Thanks for reaching out! We're excited that you're interested in training with us.\n\n" +
          "We'd love to get to know you and your goals. The best way to start is with a free No Sweat Intro — a casual, 20-minute sit-down where we:\n\n" +
          "→ Learn about your fitness goals\n" +
          "→ Show you around the gym\n" +
          "→ Put together a plan just for you\n\n" +
          "No workout required, no pressure — just a conversation.\n\n" +
          "Would you like to book a time? Just reply to this email or give us a call!\n\n" +
          "Looking forward to meeting you,\n{{gym_name}}",
      },
      {
        stepOrder: 2,
        channel: "email",
        delayMinutes: 1440,
        subject: "Quick question, {{first_name}}",
        messageContent:
          "Hi {{first_name}},\n\n" +
          "I wanted to follow up on my note yesterday. Have you had a chance to think about booking your No Sweat Intro?\n\n" +
          "People who come in for a quick intro are always glad they did — it's the easiest way to see if we're the right fit.\n\n" +
          "Here are a few times that work this week:\n" +
          "→ [Morning option]\n" +
          "→ [Afternoon option]\n" +
          "→ [Evening option]\n\n" +
          "Just pick one and reply — I'll get you on the calendar!\n\n" +
          "{{gym_name}}",
      },
      {
        stepOrder: 3,
        channel: "sms",
        delayMinutes: 4320,
        subject: null,
        messageContent:
          "Hey {{first_name}}! It's {{gym_name}}. Just checking in — would you like to book a free No Sweat Intro this week? No pressure, just want to make sure you have the chance. Reply YES and I'll send you available times!",
      },
      {
        stepOrder: 4,
        channel: "email",
        delayMinutes: 10080,
        subject: "Still thinking about it, {{first_name}}?",
        messageContent:
          "Hi {{first_name}},\n\n" +
          "I know life gets busy, so I just wanted to send one last note.\n\n" +
          "We'd genuinely love to help you reach your fitness goals. Our No Sweat Intro is completely free, takes about 20 minutes, and there's absolutely no obligation.\n\n" +
          "Whenever you're ready, we're here. Just reply to this email or give us a call — we'd love to meet you.\n\n" +
          "All the best,\n{{gym_name}}",
      },
    ],
  },
  {
    name: "Post-Intro Follow-up",
    description: "Follow up with leads who completed their No Sweat Intro",
    type: "post_intro_followup",
    triggerStage: "scheduled",
    steps: [
      {
        stepOrder: 1,
        channel: "email",
        delayMinutes: 120,
        subject: "Great meeting you, {{first_name}}!",
        messageContent:
          "Hi {{first_name}},\n\n" +
          "It was awesome meeting you today! I really enjoyed learning about your goals.\n\n" +
          "As we discussed, here's your personalized plan to get started. If you have any questions about membership options or programming, don't hesitate to reach out.\n\n" +
          "The hardest part is showing up — and you already did that.\n\n" +
          "Let's get you started!\n\n" +
          "{{gym_name}}",
      },
      {
        stepOrder: 2,
        channel: "sms",
        delayMinutes: 1440,
        subject: null,
        messageContent:
          "Hey {{first_name}}! Hope you're feeling good after your intro yesterday. Any questions about getting started? We're here to help! 💪",
      },
      {
        stepOrder: 3,
        channel: "email",
        delayMinutes: 4320,
        subject: "Ready to take the next step, {{first_name}}?",
        messageContent:
          "Hi {{first_name}},\n\n" +
          "It's been a few days since your intro and I wanted to check in.\n\n" +
          "Starting something new can feel like a big decision, but here's what I know: every single one of our members felt the same way before they started. And now? They can't imagine life without it.\n\n" +
          "We'd love to have you on the team. Ready to jump in?\n\n" +
          "{{gym_name}}",
      },
    ],
  },
  {
    name: "Stale Lead Re-engagement",
    description: "Re-engage leads that have gone quiet after initial contact",
    type: "stale_reengagement",
    triggerStage: "contacted",
    steps: [
      {
        stepOrder: 1,
        channel: "email",
        delayMinutes: 0,
        subject: "Hey {{first_name}}, we haven't forgotten about you",
        messageContent:
          "Hi {{first_name}},\n\n" +
          "We reached out a little while ago and I realized I never heard back. No worries at all — life gets busy!\n\n" +
          "I just wanted to let you know our door is always open. If you're still thinking about getting started with fitness, we'd love to help.\n\n" +
          "Our free No Sweat Intro is still available — 20 minutes, zero pressure, and you'll walk away with a clear picture of how we can help you reach your goals.\n\n" +
          "Interested? Just reply and we'll set it up.\n\n" +
          "{{gym_name}}",
      },
      {
        stepOrder: 2,
        channel: "sms",
        delayMinutes: 2880,
        subject: null,
        messageContent:
          "Hi {{first_name}}, it's {{gym_name}}. We've got some exciting things happening and would love to have you check us out. Want to book a free intro? No pressure!",
      },
      {
        stepOrder: 3,
        channel: "email",
        delayMinutes: 7200,
        subject: "One more thing, {{first_name}}",
        messageContent:
          "Hi {{first_name}},\n\n" +
          "I'll keep this short — I know your inbox is probably full.\n\n" +
          "If the timing isn't right, I totally understand. But if there's something specific holding you back (cost, schedule, not sure where to start), I'd love to help address it.\n\n" +
          "Sometimes all it takes is one conversation to get the ball rolling.\n\n" +
          "Either way, I wish you all the best on your fitness journey.\n\n" +
          "{{gym_name}}",
      },
      {
        stepOrder: 4,
        channel: "email",
        delayMinutes: 14400,
        subject: "This isn't goodbye, {{first_name}}",
        messageContent:
          "Hi {{first_name}},\n\n" +
          "This is my last follow-up, but I want you to know — whenever you're ready, we're here.\n\n" +
          "No expiration date, no pressure. Just a team of people who love helping others reach their goals.\n\n" +
          "We'd love to meet you someday. Until then, take care!\n\n" +
          "Warmly,\n{{gym_name}}",
      },
    ],
  },
];
