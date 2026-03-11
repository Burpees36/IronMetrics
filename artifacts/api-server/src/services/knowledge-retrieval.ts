import { eq, sql, and, desc, ilike } from "drizzle-orm";
import {
  db,
  knowledgeChunksTable,
  knowledgeDocumentsTable,
  knowledgeSourcesTable,
  recommendationChunkAuditTable,
  TAXONOMY_TAGS,
} from "@workspace/db";

const INTERVENTION_TO_SEARCH: Record<string, { query: string; tags: string[] }> = {
  "New Member Onboarding Touchpoints": { query: "new member onboarding first 90 days retention touchpoints coach check-in", tags: ["onboarding", "retention"] },
  "Member Engagement Check-In System": { query: "re-engage drifting established members quarterly goal review accountability", tags: ["retention", "coaching"] },
  "90-Day Skill Milestone Program": { query: "member milestones skill progression first pull-up Rx WOD emotional investment", tags: ["onboarding", "retention", "coaching"] },
  "Attendance Recovery Sprint": { query: "recover drifting members personal outreach attendance reactivation", tags: ["retention", "coaching"] },
  "Referral Activation Sprint": { query: "member referral program sprint incentives word of mouth growth", tags: ["marketing", "community", "sales"] },
  "Bring-A-Friend System": { query: "bring a friend day guest conversion community workout", tags: ["community", "marketing", "sales"] },
  "Social Proof Engine": { query: "social proof testimonials member stories transformation content marketing", tags: ["marketing", "community"] },
  "Local Partnership Activation": { query: "local business partnerships community outreach corporate rate", tags: ["marketing", "community", "sales"] },
  "Event Activation System": { query: "CrossFit Open Friday Night Lights competition events in-house throwdown", tags: ["community", "retention"] },
  "Monthly Community Event Cadence": { query: "community events social belonging potluck partner workout retention", tags: ["community", "retention"] },
  "Nutrition Challenge Cycle": { query: "nutrition challenge coaching revenue expansion ARM upsell accountability", tags: ["pricing", "coaching", "retention"] },
  "Coaching Consistency Audit": { query: "coaching quality consistency class experience shadow audit trust positive", tags: ["coaching", "leadership"] },
  "Programming & Experience Audit": { query: "programming strength cycle scaling consistency facility standards", tags: ["coaching", "programming", "operations"] },
};

export interface DoctrineGuidance {
  interventionType: string;
  detailAugmentation: string;
  executionStandard: string | null;
  _audit: { chunkIds: number[]; avgConfidence: number };
}

export interface DoctrineGroundingResult {
  guidances: DoctrineGuidance[];
  auditEntries: Array<{ recommendationType: string; chunkId: number; similarity: number }>;
}

async function searchChunksByText(
  query: string,
  tags: string[] = [],
  limit: number = 6,
): Promise<Array<{ id: number; content: string; similarity: number; docTitle: string; docUrl: string; taxonomy: string[] }>> {
  const words = query.split(/\s+/).filter(w => w.length > 2).slice(0, 5);
  if (words.length === 0) return [];

  let results = await db
    .select({
      id: knowledgeChunksTable.id,
      content: knowledgeChunksTable.content,
      taxonomy: knowledgeChunksTable.taxonomy,
      docTitle: knowledgeDocumentsTable.title,
      docUrl: knowledgeDocumentsTable.url,
    })
    .from(knowledgeChunksTable)
    .innerJoin(knowledgeDocumentsTable, eq(knowledgeChunksTable.documentId, knowledgeDocumentsTable.id))
    .where(
      sql`${knowledgeChunksTable.content} ILIKE ${'%' + words[0] + '%'}`,
    )
    .limit(limit);

  return results.map(r => ({
    id: r.id,
    content: r.content,
    similarity: 0.5,
    docTitle: r.docTitle,
    docUrl: r.docUrl,
    taxonomy: (r.taxonomy as string[]) || [],
  }));
}

function extractActionableSentences(chunks: Array<{ content: string }>, maxSentences: number = 3): string[] {
  if (chunks.length === 0) return [];

  const combined = chunks.map(c => c.content).join(" ");
  const sentences = combined.match(/[^.!?]+[.!?]+/g) || [combined];

  const scored = sentences.map(s => {
    const lower = s.toLowerCase().trim();
    let score = 0;
    if (lower.includes("member")) score += 2;
    if (lower.includes("coach")) score += 2;
    if (lower.includes("should") || lower.includes("must") || lower.includes("need")) score += 3;
    if (lower.includes("first") || lower.includes("start") || lower.includes("begin")) score += 2;
    if (lower.includes("week") || lower.includes("day") || lower.includes("month")) score += 1;
    if (lower.length < 20 || lower.length > 300) score -= 2;
    return { sentence: s.trim(), score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .map(s => s.sentence);
}

function buildDetailAugmentation(sentences: string[]): string {
  if (sentences.length === 0) return "";
  return sentences
    .map(s => `• ${s}`)
    .join("\n");
}

function buildExecutionStandard(chunks: Array<{ content: string }>): string | null {
  const actionPhrases = chunks
    .flatMap(c => {
      const sentences = c.content.match(/[^.!?]+[.!?]+/g) || [];
      return sentences.filter(s => {
        const lower = s.toLowerCase();
        return (
          lower.includes("every") ||
          lower.includes("always") ||
          lower.includes("standard") ||
          lower.includes("process") ||
          lower.includes("system")
        );
      });
    })
    .slice(0, 2);

  if (actionPhrases.length === 0) return null;
  return actionPhrases.map(p => p.trim()).join(" ");
}

export async function searchKnowledge(
  query: string,
  tags: string[] = [],
  limit: number = 10,
): Promise<Array<{ content: string; chunkId: number; similarity: number; docTitle: string; docUrl: string; taxonomy: string[] }>> {
  const results = await searchChunksByText(query, tags, limit);
  return results.map(r => ({
    content: r.content,
    chunkId: r.id,
    similarity: r.similarity,
    docTitle: r.docTitle,
    docUrl: r.docUrl,
    taxonomy: r.taxonomy,
  }));
}

export async function getKnowledgeStats() {
  const [sourceCount] = await db.select({ count: sql<number>`count(*)` }).from(knowledgeSourcesTable);
  const [docCount] = await db.select({ count: sql<number>`count(*)` }).from(knowledgeDocumentsTable);
  const [chunkCount] = await db.select({ count: sql<number>`count(*)` }).from(knowledgeChunksTable);

  return {
    sources: Number(sourceCount?.count ?? 0),
    documents: Number(docCount?.count ?? 0),
    chunks: Number(chunkCount?.count ?? 0),
  };
}

export { TAXONOMY_TAGS, INTERVENTION_TO_SEARCH };
