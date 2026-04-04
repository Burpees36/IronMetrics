/**
 * @module schema
 * Barrel file for the database schema layer.
 *
 * The schema is organized into domain-specific modules, each defining
 * its own Drizzle ORM table declarations, Zod insert schemas, and
 * TypeScript types. This file re-exports everything so consumers can
 * import from "@workspace/db" without knowing the internal file structure.
 */
export * from "./auth";
export * from "./gyms";
export * from "./members";
export * from "./leads";
export * from "./classes";
export * from "./class-templates";
export * from "./attendance";
export * from "./billing";
export * from "./retail";
export * from "./workouts";
export * from "./programming";
export * from "./communications";
export * from "./documents";
export * from "./ai";
export * from "./recommendations";
export * from "./knowledge";
export * from "./retention";
export * from "./sync";
export * from "./benchmarks";
export * from "./mrr-snapshots";
