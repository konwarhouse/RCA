import { 
  investigations, 
  type Investigation, 
  type InsertInvestigation,
  evidenceLibrary,
  type EvidenceLibrary,
  type InsertEvidenceLibrary,
  equipmentGroups,
  type EquipmentGroup,
  type InsertEquipmentGroup,
  riskRankings,
  type RiskRanking,
  type InsertRiskRanking,
  aiSettings,
  type AiSettings,
  type InsertAiSettings,
  incidents,
  type Incident,
  type InsertIncident,
} from "@shared/schema";
import { db } from "./db";
import { eq, like, and, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

// Storage interface for investigations
export interface IInvestigationStorage {
  // Investigation operations
  createInvestigation(data: Partial<InsertInvestigation>): Promise<Investigation>;
  getInvestigation(id: number): Promise<Investigation | undefined>;
  getInvestigationByInvestigationId(investigationId: string): Promise<Investigation | undefined>;
  updateInvestigation(id: number, data: Partial<Investigation>): Promise<Investigation>;
  getAllInvestigations(): Promise<Investigation[]>;
  
  // Evidence operations
  updateEvidence(id: number, evidenceData: any): Promise<Investigation>;
  validateEvidenceCompleteness(id: number): Promise<{ completeness: number, isValid: boolean }>;
  
  // Evidence Library operations
  getAllEvidenceLibrary(): Promise<EvidenceLibrary[]>;
  getEvidenceLibraryById(id: number): Promise<EvidenceLibrary | undefined>;
  createEvidenceLibrary(data: InsertEvidenceLibrary): Promise<EvidenceLibrary>;
  updateEvidenceLibrary(id: number, data: Partial<EvidenceLibrary>): Promise<EvidenceLibrary>;
  deleteEvidenceLibrary(id: number): Promise<void>;
  searchEvidenceLibrary(searchTerm: string): Promise<EvidenceLibrary[]>;
  searchEvidenceLibraryByEquipment(equipmentGroup: string, equipmentType: string, equipmentSubtype: string): Promise<EvidenceLibrary[]>;
  bulkImportEvidenceLibrary(data: InsertEvidenceLibrary[]): Promise<EvidenceLibrary[]>;
  bulkUpsertEvidenceLibrary(data: InsertEvidenceLibrary[]): Promise<EvidenceLibrary[]>;
  
  // AI Settings operations
  getAllAiSettings(): Promise<any[]>;
  getAiSettingsById(id: number): Promise<any>;
  getActiveAiSettings(): Promise<any>;
  saveAiSettings(data: any): Promise<any>;
  updateAiSettingsTestStatus(id: number, success: boolean): Promise<void>;
  deleteAiSettings(id: number): Promise<void>;
  
  // Equipment Groups operations
  getAllEquipmentGroups(): Promise<EquipmentGroup[]>;
  getActiveEquipmentGroups(): Promise<EquipmentGroup[]>;
  createEquipmentGroup(data: InsertEquipmentGroup): Promise<EquipmentGroup>;
  updateEquipmentGroup(id: number, data: Partial<EquipmentGroup>): Promise<EquipmentGroup>;
  deleteEquipmentGroup(id: number): Promise<void>;
  toggleEquipmentGroupStatus(id: number): Promise<EquipmentGroup>;
  
  // Risk Rankings operations
  getAllRiskRankings(): Promise<RiskRanking[]>;
  getActiveRiskRankings(): Promise<RiskRanking[]>;
  createRiskRanking(data: InsertRiskRanking): Promise<RiskRanking>;
  updateRiskRanking(id: number, data: Partial<RiskRanking>): Promise<RiskRanking>;
  deleteRiskRanking(id: number): Promise<void>;
  toggleRiskRankingStatus(id: number): Promise<RiskRanking>;
  
  // Incident operations - New RCA workflow
  createIncident(data: Partial<InsertIncident>): Promise<Incident>;
  getIncident(id: number): Promise<Incident | undefined>;
  updateIncident(id: number, data: Partial<Incident>): Promise<Incident>;
  getAllIncidents(): Promise<Incident[]>;
  
  // Evidence file operations - MANDATORY VALIDATION ENFORCEMENT
  getEvidenceFiles(incidentId: number): Promise<Array<{
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: Date;
    category?: string;
    description?: string;
  }>>;
  
  // Cascading dropdown operations
  getCascadingEquipmentGroups(): Promise<string[]>;
  getCascadingEquipmentTypes(groupName: string): Promise<string[]>;
  getCascadingEquipmentSubtypes(groupName: string, typeName: string): Promise<string[]>;
}

export class DatabaseInvestigationStorage implements IInvestigationStorage {
  
  async createInvestigation(data: Partial<InsertInvestigation>): Promise<Investigation> {
    const investigationData = {
      investigationId: nanoid(),
      currentStep: "problem_definition",
      status: "active",
      evidenceCompleteness: "0.00",
      evidenceValidated: false,
      evidenceData: {},
      auditTrail: [],
      ...data
    };

    const [investigation] = await db
      .insert(investigations)
      .values(investigationData)
      .returning();
    
    return investigation;
  }

  async getInvestigation(id: number): Promise<Investigation | undefined> {
    const [investigation] = await db
      .select()
      .from(investigations)
      .where(eq(investigations.id, id));
    
    return investigation;
  }

  async getInvestigationByInvestigationId(investigationId: string): Promise<Investigation | undefined> {
    console.log("[RCA] Looking for investigation with investigationId:", investigationId);
    try {
      const [investigation] = await db
        .select()
        .from(investigations)
        .where(eq(investigations.investigationId, investigationId));
      
      console.log("[RCA] Found investigation:", investigation ? `ID ${investigation.id}` : 'undefined');
      return investigation;
    } catch (error) {
      console.error("[RCA] Error finding investigation by investigationId:", error);
      return undefined;
    }
  }

  async updateInvestigation(id: number, data: Partial<Investigation>): Promise<Investigation> {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };

    const [investigation] = await db
      .update(investigations)
      .set(updateData)
      .where(eq(investigations.id, id))
      .returning();
    
    return investigation;
  }

  async getAllInvestigations(): Promise<Investigation[]> {
    return await db
      .select()
      .from(investigations)
      .orderBy(investigations.createdAt);
  }

  async updateEvidence(id: number, evidenceData: any): Promise<Investigation> {
    const investigation = await this.getInvestigation(id);
    if (!investigation) {
      throw new Error("Investigation not found");
    }

    const updatedEvidenceData = {
      ...investigation.evidenceData,
      ...evidenceData
    };

    return await this.updateInvestigation(id, {
      evidenceData: updatedEvidenceData,
      updatedAt: new Date()
    });
  }

  async validateEvidenceCompleteness(id: number): Promise<{ completeness: number, isValid: boolean }> {
    const investigation = await this.getInvestigation(id);
    if (!investigation) {
      throw new Error("Investigation not found");
    }

    // Calculate completeness based on investigation type
    // This is a simplified calculation - in real implementation, 
    // would use InvestigationEngine to validate against questionnaire
    const evidenceData = investigation.evidenceData as any || {};
    const evidenceKeys = Object.keys(evidenceData);
    
    // Minimum required fields based on investigation type
    const requiredFields = investigation.investigationType === 'safety_environmental' 
      ? ['event_type', 'event_chronology', 'immediate_causes', 'root_causes_ecfa']
      : ['equipment_tag', 'equipment_category', 'event_datetime', 'observed_problem'];
    
    const completedRequired = requiredFields.filter(field => 
      evidenceData[field] && evidenceData[field] !== ''
    );
    
    const completeness = (completedRequired.length / requiredFields.length) * 100;
    const isValid = completeness >= 80; // 80% minimum as per specs

    return { completeness, isValid };
  }

  // AI Settings methods - in-memory for now
  private aiSettings: any[] = [];

  async getAllAiSettings(): Promise<any[]> {
    try {
      const settings = await db.select().from(aiSettings).orderBy(aiSettings.createdAt);
      return settings.map(setting => ({
        id: setting.id,
        provider: setting.provider,
        isActive: setting.isActive,
        createdBy: setting.createdBy,
        createdAt: setting.createdAt,
        hasApiKey: true,
        testStatus: setting.testStatus || 'not_tested',
        lastTestedAt: setting.lastTestedAt
      }));
    } catch (error) {
      console.error("[DatabaseInvestigationStorage] Error getting AI settings:", error);
      return [];
    }
  }

  async saveAiSettings(data: any): Promise<any> {
    try {
      // Encrypt the API key using AIService
      const { AIService } = await import("./ai-service");
      const encryptedKey = (AIService as any).encryptApiKey(data.apiKey);
      
      // Deactivate other settings if this one is active
      if (data.isActive) {
        await db
          .update(aiSettings)
          .set({ isActive: false })
          .where(eq(aiSettings.isActive, true));
      }
      
      // Insert new setting
      const [newSetting] = await db
        .insert(aiSettings)
        .values({
          provider: data.provider,
          encryptedApiKey: encryptedKey,
          isActive: data.isActive,
          createdBy: data.createdBy,
          testStatus: 'not_tested'
        })
        .returning();
      
      return {
        id: newSetting.id,
        provider: newSetting.provider,
        isActive: newSetting.isActive,
        createdBy: newSetting.createdBy,
        createdAt: newSetting.createdAt,
        hasApiKey: true
      };
    } catch (error) {
      console.error("[DatabaseInvestigationStorage] Error saving AI settings:", error);
      throw error;
    }
  }

  async getAiSettingsById(id: number): Promise<any> {
    try {
      const [setting] = await db.select().from(aiSettings).where(eq(aiSettings.id, id));
      if (!setting) return null;
      
      return {
        id: setting.id,
        provider: setting.provider,
        encryptedApiKey: setting.encryptedApiKey,
        isActive: setting.isActive,
        createdBy: setting.createdBy,
        createdAt: setting.createdAt,
        testStatus: setting.testStatus || 'not_tested',
        lastTestedAt: setting.lastTestedAt
      };
    } catch (error) {
      console.error("[DatabaseInvestigationStorage] Error getting AI settings by ID:", error);
      return null;
    }
  }

  async updateAiSettingsTestStatus(id: number, success: boolean): Promise<void> {
    try {
      await db
        .update(aiSettings)
        .set({ 
          testStatus: success ? 'success' : 'failed',
          lastTestedAt: new Date()
        })
        .where(eq(aiSettings.id, id));
    } catch (error) {
      console.error("[DatabaseInvestigationStorage] Error updating AI settings test status:", error);
      throw error;
    }
  }

  async getActiveAiSettings(): Promise<any> {
    try {
      const [activeSetting] = await db.select().from(aiSettings)
        .where(eq(aiSettings.isActive, true))
        .orderBy(aiSettings.createdAt)
        .limit(1);
      
      return activeSetting || null;
    } catch (error) {
      console.error("[DatabaseInvestigationStorage] Error getting active AI settings:", error);
      return null;
    }
  }

  async deleteAiSettings(id: number): Promise<void> {
    try {
      await db.delete(aiSettings).where(eq(aiSettings.id, id));
    } catch (error) {
      console.error("[DatabaseInvestigationStorage] Error deleting AI settings:", error);
      throw error;
    }
  }

  // Evidence Library operations
  async getAllEvidenceLibrary(): Promise<EvidenceLibrary[]> {
    return await db
      .select()
      .from(evidenceLibrary)
      .where(eq(evidenceLibrary.isActive, true))
      .orderBy(evidenceLibrary.equipmentGroup, evidenceLibrary.equipmentType);
  }

  async getEvidenceLibraryById(id: number): Promise<EvidenceLibrary | undefined> {
    const [item] = await db
      .select()
      .from(evidenceLibrary)
      .where(eq(evidenceLibrary.id, id));
    return item;
  }

  async createEvidenceLibrary(data: InsertEvidenceLibrary): Promise<EvidenceLibrary> {
    const [item] = await db
      .insert(evidenceLibrary)
      .values({
        ...data,
        lastUpdated: new Date(),
      })
      .returning();
    return item;
  }

  async updateEvidenceLibrary(id: number, data: Partial<EvidenceLibrary>): Promise<EvidenceLibrary> {
    const [item] = await db
      .update(evidenceLibrary)
      .set({
        ...data,
        lastUpdated: new Date(),
      })
      .where(eq(evidenceLibrary.id, id))
      .returning();
    return item;
  }

  async deleteEvidenceLibrary(id: number): Promise<void> {
    await db
      .update(evidenceLibrary)
      .set({ isActive: false, lastUpdated: new Date() })
      .where(eq(evidenceLibrary.id, id));
  }

  async searchEvidenceLibrary(searchTerm: string): Promise<EvidenceLibrary[]> {
    const searchPattern = `%${searchTerm.toLowerCase()}%`;
    console.log('Searching evidence library for:', searchTerm, 'with pattern:', searchPattern);
    
    const results = await db
      .select()
      .from(evidenceLibrary)
      .where(
        and(
          eq(evidenceLibrary.isActive, true),
          or(
            sql`LOWER(${evidenceLibrary.equipmentType}) LIKE ${searchPattern}`,
            sql`LOWER(${evidenceLibrary.componentFailureMode}) LIKE ${searchPattern}`,
            sql`LOWER(${evidenceLibrary.equipmentCode}) LIKE ${searchPattern}`,
            sql`LOWER(${evidenceLibrary.subtype}) LIKE ${searchPattern}`,
            sql`LOWER(${evidenceLibrary.equipmentGroup}) LIKE ${searchPattern}`
          )
        )
      )
      // Simple ordering for now (configurable intelligence ready for schema update)
      .orderBy(evidenceLibrary.equipmentGroup, evidenceLibrary.equipmentType);
    
    console.log('Evidence library search results:', results.length, 'items found');
    return results;
  }

  async searchEvidenceLibraryByEquipment(equipmentGroup: string, equipmentType: string, equipmentSubtype: string): Promise<EvidenceLibrary[]> {
    console.log(`[Storage] Searching evidence library for exact match: ${equipmentGroup} -> ${equipmentType} -> ${equipmentSubtype}`);
    
    const results = await db
      .select()
      .from(evidenceLibrary)
      .where(
        and(
          eq(evidenceLibrary.isActive, true),
          eq(evidenceLibrary.equipmentGroup, equipmentGroup),
          eq(evidenceLibrary.equipmentType, equipmentType),
          eq(evidenceLibrary.subtype, equipmentSubtype)
        )
      )
      .orderBy(evidenceLibrary.diagnosticValue, evidenceLibrary.evidencePriority);
    
    console.log(`[Storage] Found ${results.length} exact equipment matches for ${equipmentSubtype} ${equipmentType}`);
    return results;
  }

  // Configurable intelligence tracking - all admin-configurable via Evidence Library fields
  async recordEvidenceUsage(evidenceLibraryId: number): Promise<void> {
    try {
      console.log(`[Configurable Intelligence] Recording usage for Evidence Library item ${evidenceLibraryId}`);
      // Simply update last updated - intelligence is now managed through admin-configurable fields
      await db
        .update(evidenceLibrary)
        .set({
          lastUpdated: new Date()
        })
        .where(eq(evidenceLibrary.id, evidenceLibraryId));
    } catch (error) {
      console.error("[Configurable Intelligence] Error recording evidence usage:", error);
    }
  }

  async recordSuccessfulAnalysis(evidenceLibraryId: number, analysisTimeMinutes: number): Promise<void> {
    try {
      console.log(`[Intelligence] Recording successful analysis for Evidence Library item ${evidenceLibraryId}`);
      
      // Get current values
      const [currentItem] = await db
        .select({
          usageCount: evidenceLibrary.usageCount,
          successCount: evidenceLibrary.successCount,
          averageAnalysisTime: evidenceLibrary.averageAnalysisTime
        })
        .from(evidenceLibrary)
        .where(eq(evidenceLibrary.id, evidenceLibraryId));

      if (currentItem) {
        const newSuccessCount = (currentItem.successCount || 0) + 1;
        const newUsageCount = currentItem.usageCount || 1;
        const newSuccessRate = (newSuccessCount / newUsageCount) * 100;
        
        // Calculate new average analysis time
        const currentAvgTime = currentItem.averageAnalysisTime || 0;
        const newAvgTime = currentAvgTime > 0 
          ? Math.round((currentAvgTime + analysisTimeMinutes) / 2)
          : analysisTimeMinutes;

        await db
          .update(evidenceLibrary)
          .set({
            successCount: newSuccessCount,
            successRate: newSuccessRate.toFixed(2),
            averageAnalysisTime: newAvgTime,
            // Increase confidence based on success
            confidenceScore: sql`LEAST(100, COALESCE(${evidenceLibrary.confidenceScore}, 50) + 2)`,
            lastUpdated: new Date()
          })
          .where(eq(evidenceLibrary.id, evidenceLibraryId));

        console.log(`[Intelligence] Updated success rate to ${newSuccessRate.toFixed(2)}% for evidence item ${evidenceLibraryId}`);
      }
    } catch (error) {
      console.error("[Intelligence] Error recording successful analysis:", error);
    }
  }

  async updateEvidenceEffectiveness(evidenceLibraryId: number, effectivenessData: any): Promise<void> {
    try {
      console.log(`[Intelligence] Updating evidence effectiveness for item ${evidenceLibraryId}`);
      await db
        .update(evidenceLibrary)
        .set({
          evidenceEffectiveness: effectivenessData,
          lastUpdated: new Date()
        })
        .where(eq(evidenceLibrary.id, evidenceLibraryId));
    } catch (error) {
      console.error("[Intelligence] Error updating evidence effectiveness:", error);
    }
  }

  async getIntelligentEvidenceRecommendations(equipmentGroup: string, equipmentType: string, subtype?: string): Promise<EvidenceLibrary[]> {
    try {
      console.log(`[Intelligence] Getting smart recommendations for ${equipmentGroup} → ${equipmentType} → ${subtype}`);
      
      const results = await db
        .select()
        .from(evidenceLibrary)
        .where(
          and(
            eq(evidenceLibrary.isActive, true),
            eq(evidenceLibrary.equipmentGroup, equipmentGroup),
            eq(evidenceLibrary.equipmentType, equipmentType),
            subtype ? eq(evidenceLibrary.subtype, subtype) : sql`1=1`
          )
        )
        // INTELLIGENT RANKING: Best evidence first
        .orderBy(
          sql`COALESCE(${evidenceLibrary.successRate}, 0) DESC`,
          sql`COALESCE(${evidenceLibrary.confidenceScore}, 50) DESC`,
          sql`COALESCE(${evidenceLibrary.usageCount}, 0) DESC`
        )
        .limit(10);

      console.log(`[Intelligence] Found ${results.length} intelligent recommendations`);
      return results;
    } catch (error) {
      console.error("[Intelligence] Error getting intelligent recommendations:", error);
      return [];
    }
  }

  async bulkImportEvidenceLibrary(data: InsertEvidenceLibrary[]): Promise<EvidenceLibrary[]> {
    const items = data.map(item => ({
      ...item,
      lastUpdated: new Date(),
    }));
    
    try {
      // Clear existing data first (bulk import typically replaces all data)
      console.log('[RCA] Clearing existing evidence library data...');
      await db.delete(evidenceLibrary);
      
      // Check for duplicate equipment codes in the import data
      const equipmentCodes = items.map(item => item.equipmentCode);
      const duplicates = equipmentCodes.filter((code, index) => equipmentCodes.indexOf(code) !== index);
      
      if (duplicates.length > 0) {
        console.error('[RCA] Duplicate equipment codes found in import data:', duplicates);
        throw new Error(`Duplicate equipment codes found in CSV: ${duplicates.join(', ')}`);
      }
      
      // Insert new data in batches to avoid memory issues
      console.log(`[RCA] Inserting ${items.length} new evidence library items...`);
      const batchSize = 50;
      const results: EvidenceLibrary[] = [];
      
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await db
          .insert(evidenceLibrary)
          .values(batch)
          .returning();
        results.push(...batchResults);
        console.log(`[RCA] Imported batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(items.length/batchSize)}`);
      }
      
      console.log(`[RCA] Successfully imported ${results.length} evidence library items`);
      return results;
    } catch (error) {
      console.error('[RCA] Error in bulkImportEvidenceLibrary:', error);
      throw error;
    }
  }

  async bulkUpsertEvidenceLibrary(data: InsertEvidenceLibrary[]): Promise<EvidenceLibrary[]> {
    try {
      console.log(`[Storage] Bulk upserting ${data.length} evidence library items based on Equipment Code`);
      
      const results: EvidenceLibrary[] = [];
      
      for (const item of data) {
        if (!item.equipmentCode) {
          console.warn(`[Storage] Skipping item without Equipment Code: ${item.componentFailureMode}`);
          continue;
        }
        
        // Check if record exists by Equipment Code (UNIQUE KEY)
        const [existing] = await db
          .select()
          .from(evidenceLibrary)
          .where(eq(evidenceLibrary.equipmentCode, item.equipmentCode))
          .limit(1);
        
        if (existing) {
          // UPDATE existing record
          console.log(`[Storage] Updating existing record with Equipment Code: ${item.equipmentCode}`);
          const [updated] = await db
            .update(evidenceLibrary)
            .set({
              ...item,
              updatedAt: new Date(),
              lastUpdated: new Date(),
              updatedBy: item.updatedBy || "admin-import"
            })
            .where(eq(evidenceLibrary.equipmentCode, item.equipmentCode))
            .returning();
          results.push(updated);
        } else {
          // INSERT new record
          console.log(`[Storage] Inserting new record with Equipment Code: ${item.equipmentCode}`);
          const [inserted] = await db
            .insert(evidenceLibrary)
            .values({
              ...item,
              lastUpdated: new Date(),
              updatedAt: new Date()
            })
            .returning();
          results.push(inserted);
        }
      }
      
      console.log(`[Storage] Successfully upserted ${results.length} evidence library items`);
      return results;
    } catch (error) {
      console.error('[RCA] Error in bulkUpsertEvidenceLibrary:', error);
      throw error;
    }
  }

  // Equipment Groups operations
  async getAllEquipmentGroups(): Promise<EquipmentGroup[]> {
    return await db.select().from(equipmentGroups).orderBy(equipmentGroups.name);
  }

  async getActiveEquipmentGroups(): Promise<EquipmentGroup[]> {
    return await db.select()
      .from(equipmentGroups)
      .where(eq(equipmentGroups.isActive, true))
      .orderBy(equipmentGroups.name);
  }

  async createEquipmentGroup(data: InsertEquipmentGroup): Promise<EquipmentGroup> {
    const [result] = await db
      .insert(equipmentGroups)
      .values({
        ...data,
        updatedAt: new Date(),
      })
      .returning();
    return result;
  }

  async updateEquipmentGroup(id: number, data: Partial<EquipmentGroup>): Promise<EquipmentGroup> {
    const [result] = await db
      .update(equipmentGroups)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(equipmentGroups.id, id))
      .returning();
    return result;
  }

  async deleteEquipmentGroup(id: number): Promise<void> {
    await db.delete(equipmentGroups).where(eq(equipmentGroups.id, id));
  }

  async toggleEquipmentGroupStatus(id: number): Promise<EquipmentGroup> {
    const [current] = await db.select().from(equipmentGroups).where(eq(equipmentGroups.id, id));
    if (!current) throw new Error("Equipment group not found");
    
    const [result] = await db
      .update(equipmentGroups)
      .set({
        isActive: !current.isActive,
        updatedAt: new Date(),
      })
      .where(eq(equipmentGroups.id, id))
      .returning();
    return result;
  }

  // Risk Rankings operations
  async getAllRiskRankings(): Promise<RiskRanking[]> {
    return await db.select().from(riskRankings).orderBy(riskRankings.label);
  }

  async getActiveRiskRankings(): Promise<RiskRanking[]> {
    return await db.select()
      .from(riskRankings)
      .where(eq(riskRankings.isActive, true))
      .orderBy(riskRankings.label);
  }

  async createRiskRanking(data: InsertRiskRanking): Promise<RiskRanking> {
    const [result] = await db
      .insert(riskRankings)
      .values({
        ...data,
        updatedAt: new Date(),
      })
      .returning();
    return result;
  }

  async updateRiskRanking(id: number, data: Partial<RiskRanking>): Promise<RiskRanking> {
    const [result] = await db
      .update(riskRankings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(riskRankings.id, id))
      .returning();
    return result;
  }

  async deleteRiskRanking(id: number): Promise<void> {
    await db.delete(riskRankings).where(eq(riskRankings.id, id));
  }

  async toggleRiskRankingStatus(id: number): Promise<RiskRanking> {
    const [current] = await db.select().from(riskRankings).where(eq(riskRankings.id, id));
    if (!current) throw new Error("Risk ranking not found");
    
    const [result] = await db
      .update(riskRankings)
      .set({
        isActive: !current.isActive,
        updatedAt: new Date(),
      })
      .where(eq(riskRankings.id, id))
      .returning();
    return result;
  }

  // Incident operations - New RCA workflow
  async createIncident(data: any): Promise<Incident> {
    try {
      console.log("[DatabaseInvestigationStorage] Creating incident with data:", data);
      
      // Ensure incidentDateTime is a proper Date object
      let incidentDateTime = new Date();
      if (data.incidentDateTime) {
        if (data.incidentDateTime instanceof Date) {
          incidentDateTime = data.incidentDateTime;
        } else {
          incidentDateTime = new Date(data.incidentDateTime);
        }
      }
      
      const [incident] = await db
        .insert(incidents)
        .values({
          title: data.title || '',
          description: data.description || '',
          equipmentGroup: data.equipmentGroup || '',
          equipmentType: data.equipmentType || '',
          equipmentSubtype: data.equipmentSubtype || null, // FIXED: equipmentSubtype now properly saved to database
          equipmentId: data.equipmentId || '',
          location: data.location || '',
          reportedBy: data.reportedBy || '',
          incidentDateTime: incidentDateTime,
          priority: data.priority || 'Medium',
          immediateActions: data.immediateActions,
          safetyImplications: data.safetyImplications,
          currentStep: 1,
          workflowStatus: "incident_reported",
        })
        .returning();
      
      console.log("[DatabaseInvestigationStorage] Created incident:", incident.id);
      return incident;
    } catch (error) {
      console.error("[DatabaseInvestigationStorage] Error creating incident:", error);
      throw error;
    }
  }

  async getIncident(id: number): Promise<Incident | undefined> {
    try {
      const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
      return incident;
    } catch (error) {
      console.error("[DatabaseInvestigationStorage] Error getting incident:", error);
      throw error;
    }
  }

  async updateIncident(id: number, data: Partial<Incident>): Promise<Incident> {
    try {
      const [incident] = await db
        .update(incidents)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(incidents.id, id))
        .returning();
      
      console.log("[DatabaseInvestigationStorage] Updated incident:", incident.id);
      return incident;
    } catch (error) {
      console.error("[DatabaseInvestigationStorage] Error updating incident:", error);
      throw error;
    }
  }

  async getAllIncidents(): Promise<Incident[]> {
    try {
      return await db.select().from(incidents).orderBy(incidents.createdAt);
    } catch (error) {
      console.error("[DatabaseInvestigationStorage] Error getting all incidents:", error);
      throw error;
    }
  }

  // Cascading dropdown operations - Implementation
  async getCascadingEquipmentGroups(): Promise<string[]> {
    const results = await db
      .selectDistinct({ equipmentGroup: evidenceLibrary.equipmentGroup })
      .from(evidenceLibrary)
      .orderBy(evidenceLibrary.equipmentGroup);
    
    return results.map(r => r.equipmentGroup);
  }

  async getCascadingEquipmentTypes(groupName: string): Promise<string[]> {
    const results = await db
      .selectDistinct({ equipmentType: evidenceLibrary.equipmentType })
      .from(evidenceLibrary)
      .where(eq(evidenceLibrary.equipmentGroup, groupName))
      .orderBy(evidenceLibrary.equipmentType);
    
    return results.map(r => r.equipmentType);
  }

  async getCascadingEquipmentSubtypes(groupName: string, typeName: string): Promise<string[]> {
    try {
      // Use raw SQL to avoid Drizzle ORM issues with DISTINCT
      const results = await db.execute(
        sql`SELECT DISTINCT subtype FROM evidence_library 
            WHERE equipment_group = ${groupName} 
            AND equipment_type = ${typeName}
            AND subtype IS NOT NULL 
            AND subtype != ''
            ORDER BY subtype`
      );
      
      return results.rows.map((row: any) => row.subtype).filter(Boolean);
    } catch (error) {
      console.error("[DatabaseInvestigationStorage] Error getting equipment subtypes:", error);
      return [];
    }
  }

  // Equipment-specific evidence library search - EXACT MATCH ONLY
  async searchEvidenceLibraryByEquipment(
    equipmentGroup: string, 
    equipmentType: string, 
    equipmentSubtype: string
  ): Promise<EvidenceLibrary[]> {
    try {
      console.log(`[Storage] Searching for EXACT equipment match: ${equipmentGroup} -> ${equipmentType} -> ${equipmentSubtype}`);
      
      let query = db
        .select()
        .from(evidenceLibrary)
        .where(
          and(
            eq(evidenceLibrary.isActive, true),
            eq(evidenceLibrary.equipmentGroup, equipmentGroup),
            eq(evidenceLibrary.equipmentType, equipmentType)
          )
        );

      // Add subtype filter if provided
      if (equipmentSubtype && equipmentSubtype.trim() !== '') {
        query = query.where(
          and(
            eq(evidenceLibrary.isActive, true),
            eq(evidenceLibrary.equipmentGroup, equipmentGroup),
            eq(evidenceLibrary.equipmentType, equipmentType),
            eq(evidenceLibrary.subtype, equipmentSubtype)
          )
        );
      }

      const results = await query.orderBy(evidenceLibrary.componentFailureMode);
      
      console.log(`[Storage] Found ${results.length} exact equipment matches for ${equipmentSubtype || equipmentType} ${equipmentType}`);
      return results;
    } catch (error) {
      console.error("[DatabaseInvestigationStorage] Error searching evidence library by equipment:", error);
      throw error;
    }
  }

  // AI Settings operations
  async getAiSettingsById(id: number): Promise<any> {
    try {
      const [settings] = await db.select().from(aiSettings).where(eq(aiSettings.id, id));
      return settings;
    } catch (error) {
      console.error("[DatabaseInvestigationStorage] Error getting AI settings:", error);
      throw error;
    }
  }

  async updateAiSettingsTestStatus(id: number, testSuccess: boolean): Promise<void> {
    try {
      await db
        .update(aiSettings)
        .set({
          testStatus: testSuccess ? 'tested' : 'failed',
          lastTestedAt: new Date()
        })
        .where(eq(aiSettings.id, id));
    } catch (error) {
      console.error("[DatabaseInvestigationStorage] Error updating AI settings test status:", error);
      throw error;
    }
  }

  // MANDATORY EVIDENCE VALIDATION ENFORCEMENT - Evidence file operations
  async getEvidenceFiles(incidentId: number): Promise<Array<{
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: Date;
    category?: string;
    description?: string;
  }>> {
    try {
      console.log(`[Evidence Files] Retrieving evidence files for incident ${incidentId}`);
      
      // Get incident to check if it has evidence files stored
      const incident = await this.getIncident(incidentId);
      
      if (!incident) {
        console.log(`[Evidence Files] Incident ${incidentId} not found`);
        return [];
      }
      
      // Check if incident has evidence data stored
      const evidenceFiles = incident.evidenceFiles || [];
      const evidenceCategories = incident.evidenceCategories || {};
      
      console.log(`[Evidence Files] Found ${evidenceFiles.length} evidence files in incident data`);
      console.log(`[Evidence Files] Evidence categories available: ${Object.keys(evidenceCategories).length}`);
      
      // Convert stored evidence files to expected format
      const formattedFiles = evidenceFiles.map((file: any) => ({
        id: file.id || Date.now().toString(),
        fileName: file.name || file.fileName || 'Unknown File',
        fileSize: file.size || file.fileSize || 0,
        mimeType: file.type || file.mimeType || 'application/octet-stream',
        uploadedAt: file.uploadedAt ? new Date(file.uploadedAt) : new Date(),
        category: file.category,
        description: file.description
      }));
      
      // Also check evidence categories for file references
      const categoryFiles: any[] = [];
      for (const [categoryId, categoryData] of Object.entries(evidenceCategories)) {
        if (typeof categoryData === 'object' && categoryData !== null) {
          const category = categoryData as any;
          if (category.files && Array.isArray(category.files)) {
            category.files.forEach((file: any) => {
              categoryFiles.push({
                id: file.id || Date.now().toString(),
                fileName: file.fileName || file.name || 'Category File',
                fileSize: file.fileSize || file.size || 0,
                mimeType: file.mimeType || file.type || 'application/octet-stream',
                uploadedAt: file.uploadedAt ? new Date(file.uploadedAt) : new Date(),
                category: categoryId,
                description: file.description
              });
            });
          }
        }
      }
      
      const allFiles = [...formattedFiles, ...categoryFiles];
      
      console.log(`[Evidence Files] Total evidence files found: ${allFiles.length}`);
      return allFiles;
      
    } catch (error) {
      console.error('[Evidence Files] Error retrieving evidence files:', error);
      return [];
    }
  }
}

export const investigationStorage = new DatabaseInvestigationStorage();