import { describe, it, expect } from "vitest";
import { isStaffRole, stripCoachNotes, stripCoachNotesFromDay, type ProgrammingRole } from "../middlewares/programmingRbac";

describe("isStaffRole", () => {
  it("owner is staff", () => expect(isStaffRole("owner")).toBe(true));
  it("admin is staff", () => expect(isStaffRole("admin")).toBe(true));
  it("coach is staff", () => expect(isStaffRole("coach")).toBe(true));
  it("front_desk is not staff", () => expect(isStaffRole("front_desk")).toBe(false));
  it("member is not staff", () => expect(isStaffRole("member")).toBe(false));
});

describe("stripCoachNotes", () => {
  const dataWithNotes = { id: 1, name: "WOD A", coachNotes: "Scale for beginners" };

  it("preserves coachNotes for owner", () => {
    const result = stripCoachNotes(dataWithNotes, "owner");
    expect(result.coachNotes).toBe("Scale for beginners");
  });

  it("preserves coachNotes for admin", () => {
    const result = stripCoachNotes(dataWithNotes, "admin");
    expect(result.coachNotes).toBe("Scale for beginners");
  });

  it("preserves coachNotes for coach", () => {
    const result = stripCoachNotes(dataWithNotes, "coach");
    expect(result.coachNotes).toBe("Scale for beginners");
  });

  it("strips coachNotes for front_desk", () => {
    const result = stripCoachNotes(dataWithNotes, "front_desk");
    expect(result.coachNotes).toBeUndefined();
    expect(result.id).toBe(1);
    expect(result.name).toBe("WOD A");
  });

  it("strips coachNotes for member", () => {
    const result = stripCoachNotes(dataWithNotes, "member");
    expect(result.coachNotes).toBeUndefined();
  });

  it("handles object without coachNotes", () => {
    const data = { id: 1, name: "WOD B" };
    const result = stripCoachNotes(data, "member");
    expect(result.id).toBe(1);
    expect(result.name).toBe("WOD B");
  });
});

describe("stripCoachNotesFromDay", () => {
  it("preserves everything for staff roles", () => {
    const day = {
      coachNotes: "Top notes",
      sections: [{ name: "A", coachNotes: "Section notes" }],
    };
    const result = stripCoachNotesFromDay(day, "owner");
    expect(result.coachNotes).toBe("Top notes");
    expect(result.sections[0].coachNotes).toBe("Section notes");
  });

  it("strips top-level and section coachNotes for member", () => {
    const day = {
      coachNotes: "Top notes",
      name: "Monday",
      sections: [
        { name: "Strength", coachNotes: "Spot heavy lifts" },
        { name: "Metcon", coachNotes: "Push pace" },
      ],
    };
    const result = stripCoachNotesFromDay(day, "member");
    expect(result.coachNotes).toBeUndefined();
    expect(result.name).toBe("Monday");
    expect(result.sections[0].coachNotes).toBeUndefined();
    expect(result.sections[0].name).toBe("Strength");
    expect(result.sections[1].coachNotes).toBeUndefined();
  });

  it("handles day without sections", () => {
    const day = { coachNotes: "Notes", name: "Tuesday" };
    const result = stripCoachNotesFromDay(day, "front_desk");
    expect(result.coachNotes).toBeUndefined();
    expect(result.name).toBe("Tuesday");
  });

  it("handles empty sections array", () => {
    const day = { coachNotes: "Notes", sections: [] };
    const result = stripCoachNotesFromDay(day, "member");
    expect(result.sections).toEqual([]);
  });
});
