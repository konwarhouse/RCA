/**
 * UNIVERSAL PROTOCOL STANDARD COMPLIANCE HEADER
 * Direct Database Client - Emergency bypass for Vite middleware issues
 * NO HARDCODING: All database operations schema-driven
 * PURPOSE: Provide direct database access when API layer fails
 */

import { db } from "../../../server/db";
import { evidenceLibrary } from "../../../shared/schema";
import { eq } from "drizzle-orm";

export interface EvidenceLibraryItem {
  id: number;
  equipmentGroup: string;
  equipmentType: string;
  subtype?: string;
  componentFailureMode: string;
  equipmentCode: string;
  failureCode: string;
  riskRanking: string;
  requiredTrendDataEvidence: string;
  aiOrInvestigatorQuestions: string;
  attachmentsEvidenceRequired: string;
  rootCauseLogic: string;
  confidenceLevel?: string;
  diagnosticValue?: string;
  industryRelevance?: string;
  evidencePriority?: number;
}

export class DirectDatabaseClient {
  static async getAllEvidenceLibrary(): Promise<EvidenceLibraryItem[]> {
    try {
      console.log("[Direct DB] Bypassing API - connecting directly to database");
      
      const results = await db
        .select()
        .from(evidenceLibrary)
        .where(eq(evidenceLibrary.isActive, true))
        .orderBy(evidenceLibrary.equipmentGroup, evidenceLibrary.equipmentType);
      
      console.log(`[Direct DB] Successfully retrieved ${results.length} evidence library items`);
      
      return results.map(item => ({
        id: item.id,
        equipmentGroup: item.equipmentGroup,
        equipmentType: item.equipmentType,
        subtype: item.subtype || undefined,
        componentFailureMode: item.componentFailureMode,
        equipmentCode: item.equipmentCode,
        failureCode: item.failureCode,
        riskRanking: item.riskRanking,
        requiredTrendDataEvidence: item.requiredTrendDataEvidence,
        aiOrInvestigatorQuestions: item.aiOrInvestigatorQuestions,
        attachmentsEvidenceRequired: item.attachmentsEvidenceRequired,
        rootCauseLogic: item.rootCauseLogic,
        confidenceLevel: item.confidenceLevel || undefined,
        diagnosticValue: item.diagnosticValue || undefined,
        industryRelevance: item.industryRelevance || undefined,
        evidencePriority: item.evidencePriority || undefined,
      }));
      
    } catch (error) {
      console.error("[Direct DB] Database connection failed:", error);
      throw new Error(`Direct database access failed: ${error.message}`);
    }
  }
}