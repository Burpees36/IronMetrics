import { db } from "./index";
import { eq, and } from "drizzle-orm";
import { workoutsTable } from "./schema/workouts";
import { programmingDaysTable, programmingSectionsTable } from "./schema/programming";

async function migrateWorkoutsToProgramming() {
  console.log("Starting migration: workouts -> programming_days + programming_sections");

  const workouts = await db.select().from(workoutsTable);
  console.log(`Found ${workouts.length} workouts to check`);

  let migrated = 0;
  let skipped = 0;

  for (const workout of workouts) {
    const [existingDay] = await db
      .select()
      .from(programmingDaysTable)
      .where(
        and(
          eq(programmingDaysTable.gymId, workout.gymId),
          eq(programmingDaysTable.date, workout.workoutDate),
          eq(programmingDaysTable.title, workout.title)
        )
      );

    if (existingDay) {
      console.log(`Skipped workout ${workout.id}: "${workout.title}" (already migrated as day ${existingDay.id})`);
      skipped++;
      continue;
    }

    const typeToSectionType: Record<string, string> = {
      WOD: "wod",
      Strength: "strength",
      Conditioning: "conditioning",
      Warmup: "warmup",
      Cooldown: "cooldown",
      Skill: "skill",
      Accessory: "accessory",
    };

    const [day] = await db
      .insert(programmingDaysTable)
      .values({
        gymId: workout.gymId,
        date: workout.workoutDate,
        title: workout.title,
        status: "published",
        publicNotes: workout.description,
        coachNotes: null,
        track: "default",
        createdBy: null,
        updatedBy: null,
      })
      .returning();

    await db.insert(programmingSectionsTable).values({
      dayId: day.id,
      orderIndex: 0,
      sectionType: (typeToSectionType[workout.type] || "wod") as any,
      title: workout.title,
      instructions: workout.description,
      duration: null,
      timeCap: null,
      intendedStimulus: null,
      movements: workout.movements,
      scalingNotes: null,
      coachNotes: null,
      memberNotes: null,
      resultTrackingEnabled: true,
    });

    console.log(`Migrated workout ${workout.id}: "${workout.title}" -> programming day ${day.id}`);
    migrated++;
  }

  console.log(`Migration complete! Migrated: ${migrated}, Skipped: ${skipped}`);
}

migrateWorkoutsToProgramming()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
