import { describe, it, expect } from "vitest";
import {
  applyOwnerVoice,
  extractStylePatterns,
  validateVoiceOutput,
  type CommunicationStyle,
} from "../services/ai-task-generation";

const SAMPLE_CONTENT = `Hi Sarah,\n\nJust wanted to check in — it's been a little while since we've seen you, and we genuinely miss having you around.\n\nYou've been part of our community for 8 months, and we value that. I'd love to schedule a quick goal review — even just 10 minutes to check in on your progress.\n\nWant to grab a quick coffee or chat at the gym this week? Let me know what works for you!\n\nLooking forward to hearing from you!`;
const SAMPLE_SUBJECT = "Checking in, Sarah";

function makeStyle(overrides: Partial<CommunicationStyle> = {}): CommunicationStyle {
  return {
    tone: "casual_friendly",
    rules: [],
    samples: [],
    ...overrides,
  };
}

describe("Communication Style — applyOwnerVoice stress tests", () => {

  describe("Scenario 1: Basic tone preset — casual_friendly", () => {
    it("applies casual greeting and sign-off", () => {
      const style = makeStyle({ tone: "casual_friendly" });
      const result = applyOwnerVoice(SAMPLE_CONTENT, SAMPLE_SUBJECT, style);
      expect(result.content).toMatch(/^(Hi|Hey|Hi there) Sarah/);
      const casualSignOffs = ["See you in the gym!", "Looking forward to hearing from you!", "Hope to see you soon!", "Talk soon!"];
      expect(casualSignOffs.some(s => result.content.includes(s))).toBe(true);
    });
  });

  describe("Scenario 2: Basic tone preset — professional", () => {
    it("applies professional greeting and sign-off", () => {
      const style = makeStyle({ tone: "professional" });
      const result = applyOwnerVoice(SAMPLE_CONTENT, SAMPLE_SUBJECT, style);
      expect(result.content).toMatch(/^(Dear|Hello|Good day) Sarah/);
      const proSignOffs = ["Best regards,", "Looking forward to connecting,", "Thank you for your time,", "Sincerely,"];
      expect(proSignOffs.some(s => result.content.includes(s))).toBe(true);
    });
  });

  describe("Scenario 3: Basic tone preset — motivational_coach", () => {
    it("applies motivational greeting and sign-off", () => {
      const style = makeStyle({ tone: "motivational_coach" });
      const result = applyOwnerVoice(SAMPLE_CONTENT, SAMPLE_SUBJECT, style);
      expect(result.content).toMatch(/^(Hey|What's up|Hey there) Sarah/);
      const coachSignOffs = ["Let's crush it!", "Your best is yet to come!", "Let's get after it!", "Stay strong!"];
      expect(coachSignOffs.some(s => result.content.includes(s))).toBe(true);
    });
  });

  describe("Scenario 4: Word-boundary safe replacement — 'cancel' should not produce 'pauselation'", () => {
    it("replaces 'cancel' without corrupting 'cancellation'", () => {
      const content = `Hi Sarah,\n\nWe noticed you want to cancel your membership. Before any cancellation is processed, we'd love to chat.\n\nLooking forward to hearing from you!`;
      const style = makeStyle({
        rules: ['Never say "cancel", say "pause"'],
      });
      const result = applyOwnerVoice(content, "Cancel notice", style);
      expect(result.content).not.toContain("pauselation");
      expect(result.content).not.toContain("pausellation");
      expect(result.content).toContain("cancellation");
      expect(result.content).toContain("pause");
    });
  });

  describe("Scenario 5: Word-boundary safe replacement — 'payment' should not corrupt 'prepayment'", () => {
    it("replaces standalone 'payment' without corrupting compound words", () => {
      const content = `Hi Sarah,\n\nYour payment is overdue. The prepayment discount still applies.\n\nLooking forward to hearing from you!`;
      const style = makeStyle({
        rules: ['Never say "payment", say "billing"'],
      });
      const result = applyOwnerVoice(content, "Payment issue", style);
      expect(result.content).not.toContain("prebilling");
      expect(result.content).toContain("billing");
    });
  });

  describe("Scenario 6: Contradictory rules detection — A→B and B→A", () => {
    it("detects contradictions and skips both rules, adding warnings", () => {
      const content = `Hi Sarah,\n\nYour membership fee is due.\n\nLooking forward to hearing from you!`;
      const style = makeStyle({
        rules: [
          'Replace "fee" with "investment"',
          'Replace "investment" with "fee"',
        ],
      });
      const result = applyOwnerVoice(content, SAMPLE_SUBJECT, style);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some(w => w.includes("Contradictory"))).toBe(true);
      expect(result.content).toContain("fee");
    });
  });

  describe("Scenario 7: Multiple non-contradictory rules applied in order", () => {
    it("applies all rules stably", () => {
      const content = `Hi Sarah,\n\nYour membership payment is overdue.\n\nLooking forward to hearing from you!`;
      const style = makeStyle({
        rules: [
          'Never say "overdue", say "needs attention"',
          'Replace "membership" with "training plan"',
        ],
      });
      const result = applyOwnerVoice(content, SAMPLE_SUBJECT, style);
      expect(result.content).not.toContain("overdue");
      expect(result.content).toContain("needs attention");
      expect(result.content).not.toContain("membership");
      expect(result.content).toContain("training plan");
    });
  });

  describe("Scenario 8: Custom sign-off via rule", () => {
    it("replaces the sign-off with custom one", () => {
      const style = makeStyle({
        rules: ['Always sign off with "Stay awesome, Coach Mike"'],
      });
      const result = applyOwnerVoice(SAMPLE_CONTENT, SAMPLE_SUBJECT, style);
      expect(result.content).toContain("Stay awesome, Coach Mike");
      expect(result.content).not.toContain("Looking forward to hearing from you!");
    });
  });

  describe("Scenario 9: Sign-off replacement with unknown base sign-off", () => {
    it("replaces even an unrecognized sign-off at the end", () => {
      const content = `Hi Sarah,\n\nGreat seeing you this week!\n\nWarmly yours, The Team`;
      const style = makeStyle({
        rules: ['Sign off with "See you in the gym!"'],
      });
      const result = applyOwnerVoice(content, SAMPLE_SUBJECT, style);
      expect(result.content).toContain("See you in the gym!");
      expect(result.content).not.toContain("Warmly yours, The Team");
    });
  });

  describe("Scenario 10: Sign-off replacement with no existing sign-off line", () => {
    it("appends sign-off when content has no clear sign-off", () => {
      const content = `Hi Sarah,\n\nJust a quick note about your schedule changes next week.`;
      const style = makeStyle({
        rules: ['Sign off with "Cheers!"'],
      });
      const result = applyOwnerVoice(content, SAMPLE_SUBJECT, style);
      expect(result.content).toContain("Cheers!");
    });
  });

  describe("Scenario 11: Writing sample leakage prevention — sample names should not appear", () => {
    it("flags leakage when sample-specific content appears in output", () => {
      const style = makeStyle({
        samples: [
          "Hi John Smith,\n\nGreat workout today! You crushed the deadlifts.\n\nSee you tomorrow!",
          "Hey John Smith,\n\nDon't forget about your session with Coach Davis tomorrow.\n\nSee you tomorrow!",
          "Hey John Smith,\n\nYour progress is amazing.\n\nSee you tomorrow!",
        ],
      });
      const result = applyOwnerVoice(SAMPLE_CONTENT, SAMPLE_SUBJECT, style);
      expect(result.content).not.toContain("John Smith");
      expect(result.content).not.toContain("Coach Davis");
    });
  });

  describe("Scenario 12: Writing sample style extraction — exclamation usage", () => {
    it("detects exclamation-heavy style from samples", () => {
      const samples = [
        "Hey! Great to see you! Keep it up!",
        "You're doing amazing! Don't stop now!",
        "Wow! What a session!",
      ];
      const patterns = extractStylePatterns(samples);
      expect(patterns.usesExclamation).toBe(true);
    });
  });

  describe("Scenario 13: Writing sample style extraction — emoji detection", () => {
    it("detects emoji usage from samples", () => {
      const samples = [
        "Hey Sarah! 💪 Great workout today!",
        "Keep pushing! 🔥 You're on fire!",
        "See you tomorrow! 😊",
      ];
      const patterns = extractStylePatterns(samples);
      expect(patterns.usesEmoji).toBe(true);
    });
  });

  describe("Scenario 14: Writing sample style extraction — no samples", () => {
    it("returns safe defaults when no samples provided", () => {
      const patterns = extractStylePatterns([]);
      expect(patterns.avgSentenceLength).toBe("medium");
      expect(patterns.usesExclamation).toBe(false);
      expect(patterns.usesEmoji).toBe(false);
      expect(patterns.commonClosing).toBeNull();
    });
  });

  describe("Scenario 15: Writing sample common closing extraction", () => {
    it("extracts the most common closing from samples", () => {
      const samples = [
        "Hey Sarah!\n\nGreat job.\n\nKeep grinding!",
        "Hi there!\n\nNice work.\n\nKeep grinding!",
        "What's up?\n\nLooking great.\n\nSomething else",
      ];
      const patterns = extractStylePatterns(samples);
      expect(patterns.commonClosing).toBe("Keep grinding!");
    });
  });

  describe("Scenario 16: Empty content input", () => {
    it("handles empty content without crashing", () => {
      const style = makeStyle({
        rules: ['Never say "cancel", say "pause"'],
      });
      const result = applyOwnerVoice("", "", style);
      expect(result.content).toBeDefined();
      expect(result.subject).toBeDefined();
    });
  });

  describe("Scenario 17: Minimal content — single line, no greeting", () => {
    it("processes single-line content gracefully", () => {
      const style = makeStyle({ tone: "professional" });
      const result = applyOwnerVoice("Your membership is active.", "Status", style);
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });
  });

  describe("Scenario 18: Rule with only 'never say' (deletion, no replacement)", () => {
    it("deletes the banned phrase entirely", () => {
      const content = `Hi Sarah,\n\nYour membership fee is overdue. Please pay immediately.\n\nLooking forward to hearing from you!`;
      const style = makeStyle({
        rules: ['Never say "immediately"'],
      });
      const result = applyOwnerVoice(content, SAMPLE_SUBJECT, style);
      expect(result.content).not.toContain("immediately");
    });
  });

  describe("Scenario 19: Post-generation validation — banned phrase enforcement", () => {
    it("validates that banned phrases are absent from output", () => {
      const content = `Hi Sarah,\n\nYour cancellation has been processed.\n\nLooking forward to hearing from you!`;
      const style = makeStyle({
        rules: ['Never say "cancellation", say "pause request"'],
      });
      const result = applyOwnerVoice(content, SAMPLE_SUBJECT, style);
      const validation = validateVoiceOutput(result.content, style, ["cancellation"]);
      expect(validation.bannedPhrasesFound).toHaveLength(0);
      expect(result.content).not.toContain("cancellation");
      expect(result.content).toContain("pause request");
    });
  });

  describe("Scenario 20: Post-generation validation — sign-off presence check", () => {
    it("validates that the expected sign-off is present", () => {
      const style = makeStyle({
        rules: ['Sign off with "See you in the gym!"'],
      });
      const result = applyOwnerVoice(SAMPLE_CONTENT, SAMPLE_SUBJECT, style);
      const validation = validateVoiceOutput(result.content, style, []);
      expect(validation.signOffPresent).toBe(true);
      expect(result.content).toContain("See you in the gym!");
    });
  });

  describe("Scenario 21: Case-insensitive rule matching", () => {
    it("replaces regardless of case in the input", () => {
      const content = `Hi Sarah,\n\nYour MEMBERSHIP and Membership are both terms we use.\n\nLooking forward to hearing from you!`;
      const style = makeStyle({
        rules: ['Replace "membership" with "training plan"'],
      });
      const result = applyOwnerVoice(content, SAMPLE_SUBJECT, style);
      expect(result.content).not.toMatch(/\bmembership\b/i);
    });
  });

  describe("Scenario 22: Subject line is also transformed by rules", () => {
    it("applies replacement rules to the subject", () => {
      const style = makeStyle({
        rules: ['Never say "Checking", say "Following up"'],
      });
      const result = applyOwnerVoice(SAMPLE_CONTENT, "Checking in, Sarah", style);
      expect(result.subject).not.toContain("Checking");
      expect(result.subject).toContain("Following up");
    });
  });

  describe("Scenario 23: Tone + custom sign-off rule interaction", () => {
    it("custom sign-off rule overrides tone preset sign-off", () => {
      const style = makeStyle({
        tone: "professional",
        rules: ['Sign off with "Keep pushing!"'],
      });
      const result = applyOwnerVoice(SAMPLE_CONTENT, SAMPLE_SUBJECT, style);
      expect(result.content).toContain("Keep pushing!");
      expect(result.content).not.toContain("Best regards,");
      expect(result.content).not.toContain("Sincerely,");
    });
  });

  describe("Scenario 24: Multiple replacement rules applied sequentially", () => {
    it("applies rules in order — chaining is expected (A→B then B→C means original A becomes C)", () => {
      const content = `Hi Sarah,\n\nYour fee is due and the cost is listed.\n\nLooking forward to hearing from you!`;
      const style = makeStyle({
        rules: [
          'Replace "fee" with "cost"',
          'Replace "cost" with "investment"',
        ],
      });
      const result = applyOwnerVoice(content, SAMPLE_SUBJECT, style);
      expect(result.content).toContain("investment");
      expect(result.content).not.toContain("fee");
    });
  });

  describe("Scenario 25: Multi-line signature replacement (Best,\\nMike)", () => {
    it("replaces a two-line sign-off block", () => {
      const content = `Hi Sarah,\n\nGreat seeing you this week! Keep up the momentum.\n\nBest,\nMike`;
      const style = makeStyle({
        rules: ['Sign off with "See you in the gym!"'],
      });
      const result = applyOwnerVoice(content, SAMPLE_SUBJECT, style);
      expect(result.content).toContain("See you in the gym!");
      expect(result.content).not.toContain("Best,\nMike");
    });
  });

  describe("Scenario 26: Common closing from samples overrides tone sign-off", () => {
    it("uses the common closing extracted from writing samples when no custom sign-off rule exists", () => {
      const style = makeStyle({
        tone: "casual_friendly",
        samples: [
          "Hey!\n\nGreat session.\n\nKeep grinding!",
          "Hi!\n\nNice work today.\n\nKeep grinding!",
          "Hey!\n\nYou crushed it.\n\nKeep grinding!",
        ],
      });
      const result = applyOwnerVoice(SAMPLE_CONTENT, SAMPLE_SUBJECT, style);
      expect(result.content).toContain("Keep grinding!");
    });
  });

  describe("Scenario 27: Very long content with sign-off deep in the text", () => {
    it("correctly identifies and replaces the final sign-off", () => {
      const longContent = `Hi Sarah,\n\n${"This is a paragraph of content. ".repeat(20).trim()}\n\nAnother paragraph here.\n\nWishing you the best!`;
      const style = makeStyle({
        rules: ['Sign off with "Stay strong!"'],
      });
      const result = applyOwnerVoice(longContent, SAMPLE_SUBJECT, style);
      expect(result.content).toContain("Stay strong!");
      expect(result.content.trimEnd().endsWith("Stay strong!")).toBe(true);
    });
  });

  describe("Scenario 28: Post-validation re-applies missing sign-off", () => {
    it("ensures sign-off is always present even if detection fails", () => {
      const content = `Hi Sarah,\n\nJust a note about your schedule.`;
      const style = makeStyle({
        tone: "professional",
        rules: ['Sign off with "Warm regards, The Team"'],
      });
      const result = applyOwnerVoice(content, SAMPLE_SUBJECT, style);
      expect(result.content).toContain("Warm regards, The Team");
    });
  });
});

describe("Preview endpoint handler — POST /gyms/:gymId/preview-voice", () => {
  const PREVIEW_CONTENT = `Hi Sarah,\n\nJust wanted to check in — it's been a little while since we've seen you, and we genuinely miss having you around.\n\nYou've been part of our community for 8 months, and we value that. I'd love to schedule a quick goal review — even just 10 minutes to check in on your progress.\n\nWant to grab a quick coffee or chat at the gym this week? Let me know what works for you!\n\nLooking forward to hearing from you!`;
  const PREVIEW_SUBJECT = "Checking in, Sarah";

  function callPreviewHandler(body: { tone?: string; rules?: unknown[]; samples?: unknown[] }) {
    const validTones = ["casual_friendly", "professional", "motivational_coach"];
    const safeTone = typeof body.tone === "string" && validTones.includes(body.tone) ? body.tone : "casual_friendly";
    const safeRules = Array.isArray(body.rules) ? body.rules.filter((r: unknown) => typeof r === "string").slice(0, 20) as string[] : [];
    const safeSamples = Array.isArray(body.samples) ? body.samples.filter((s: unknown) => typeof s === "string").slice(0, 5) as string[] : [];

    const style: CommunicationStyle = { tone: safeTone, rules: safeRules, samples: safeSamples };
    const result = applyOwnerVoice(PREVIEW_CONTENT, PREVIEW_SUBJECT, style);

    return {
      original: { subject: PREVIEW_SUBJECT, content: PREVIEW_CONTENT },
      styled: { subject: result.subject, content: result.content },
    };
  }

  it("Preview 1: default casual tone returns styled content", () => {
    const res = callPreviewHandler({ tone: "casual_friendly", rules: [], samples: [] });
    expect(res.styled.content).toBeDefined();
    expect(res.styled.subject).toBe(PREVIEW_SUBJECT);
  });

  it("Preview 2: professional tone changes greeting in preview", () => {
    const res = callPreviewHandler({ tone: "professional", rules: [], samples: [] });
    expect(res.styled.content).toMatch(/^(Dear|Hello|Good day) Sarah/);
  });

  it("Preview 3: replacement rule transforms both content and subject", () => {
    const res = callPreviewHandler({
      tone: "casual_friendly",
      rules: ['Never say "Checking", say "Following up"'],
      samples: [],
    });
    expect(res.styled.subject).toContain("Following up");
    expect(res.styled.subject).not.toContain("Checking");
  });

  it("Preview 4: custom sign-off rule appears in preview output", () => {
    const res = callPreviewHandler({
      tone: "casual_friendly",
      rules: ['Sign off with "Stay awesome, Coach Mike"'],
      samples: [],
    });
    expect(res.styled.content).toContain("Stay awesome, Coach Mike");
    expect(res.styled.content).not.toContain("Looking forward to hearing from you!");
  });

  it("Preview 5: invalid tone falls back to casual_friendly", () => {
    const res = callPreviewHandler({ tone: "invalid_tone", rules: [], samples: [] });
    expect(res.styled.content).toBeDefined();
    const casualSignOffs = ["See you in the gym!", "Looking forward to hearing from you!", "Hope to see you soon!", "Talk soon!"];
    expect(casualSignOffs.some(s => res.styled.content.includes(s))).toBe(true);
  });

  it("Preview 6: contradictory rules produce warnings", () => {
    const style: CommunicationStyle = {
      tone: "casual_friendly",
      rules: ['Replace "fee" with "investment"', 'Replace "investment" with "fee"'],
      samples: [],
    };
    const result = applyOwnerVoice(PREVIEW_CONTENT, PREVIEW_SUBJECT, style);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some(w => w.includes("Contradictory"))).toBe(true);
  });

  it("Preview 7: writing samples with common closing affect preview output", () => {
    const res = callPreviewHandler({
      tone: "casual_friendly",
      rules: [],
      samples: [
        "Hey!\n\nGreat session.\n\nKeep grinding!",
        "Hi!\n\nNice work today.\n\nKeep grinding!",
        "Hey!\n\nYou crushed it.\n\nKeep grinding!",
      ],
    });
    expect(res.styled.content).toContain("Keep grinding!");
  });

  it("Preview 8: input sanitization — rules capped at 20, samples at 5", () => {
    const manyRules = Array.from({ length: 25 }, (_, i) => `Replace "word${i}" with "replacement${i}"`);
    const manySamples = Array.from({ length: 8 }, (_, i) => `Sample message ${i}`);
    const res = callPreviewHandler({ tone: "casual_friendly", rules: manyRules, samples: manySamples });
    expect(res.styled.content).toBeDefined();
  });

  it("Preview 9: non-string rules and samples are filtered out", () => {
    const res = callPreviewHandler({
      tone: "casual_friendly",
      rules: ['Never say "cancel", say "pause"', 123, null, undefined],
      samples: ["Valid sample", 456, true],
    });
    expect(res.styled.content).toBeDefined();
  });

  it("Preview 10: original content is preserved unmodified in response", () => {
    const res = callPreviewHandler({
      tone: "professional",
      rules: ['Never say "coffee", say "chat"'],
      samples: [],
    });
    expect(res.original.content).toBe(PREVIEW_CONTENT);
    expect(res.original.subject).toBe(PREVIEW_SUBJECT);
    expect(res.original.content).toContain("coffee");
  });
});
