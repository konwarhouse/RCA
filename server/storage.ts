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
import { eq, like, and, or } from "drizzle-orm";
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
  bulkImportEvidenceLibrary(data: InsertEvidenceLibrary[]): Promise<EvidenceLibrary[]>;
  
  // AI Settings operations
  getAllAiSettings(): Promise<any[]>;
  saveAiSettings(data: any): Promise<any>;
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
    return this.aiSettings;
  }

  async saveAiSettings(data: any): Promise<any> {
    const newSetting = {
      id: this.aiSettings.length + 1,
      provider: data.provider,
      isActive: data.isActive,
      createdBy: data.createdBy,
      createdAt: new Date(),
      // Don't store the actual API key in memory for security
      hasApiKey: true
    };
    
    // Remove other active settings if this one is active
    if (data.isActive) {
      this.aiSettings.forEach(setting => {
        setting.isActive = false;
      });
    }
    
    this.aiSettings.push(newSetting);
    return newSetting;
  }

  async deleteAiSettings(id: number): Promise<void> {
    this.aiSettings = this.aiSettings.filter(setting => setting.id !== id);
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
    return await db
      .select()
      .from(evidenceLibrary)
      .where(
        and(
          eq(evidenceLibrary.isActive, true),
          or(
            like(evidenceLibrary.equipmentType, searchPattern),
            like(evidenceLibrary.componentFailureMode, searchPattern),
            like(evidenceLibrary.equipmentCode, searchPattern),
            like(evidenceLibrary.subtypeExample, searchPattern)
          )
        )
      );
  }

  async bulkImportEvidenceLibrary(data: InsertEvidenceLibrary[]): Promise<EvidenceLibrary[]> {
    const items = data.map(item => ({
      ...item,
      lastUpdated: new Date(),
    }));
    
    return await db
      .insert(evidenceLibrary)
      .values(items)
      .returning();
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
}

export const investigationStorage = new DatabaseInvestigationStorage();