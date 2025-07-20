import { investigations, type Investigation, type InsertInvestigation } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
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
  
  // AI Settings operations
  getAllAiSettings(): Promise<any[]>;
  saveAiSettings(data: any): Promise<any>;
  deleteAiSettings(id: number): Promise<void>;
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
    const [investigation] = await db
      .select()
      .from(investigations)
      .where(eq(investigations.investigationId, investigationId));
    
    console.log("[RCA] Found investigation:", investigation);
    return investigation;
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
}

export const investigationStorage = new DatabaseInvestigationStorage();