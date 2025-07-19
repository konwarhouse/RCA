import { analyses, users, aiSettings, type Analysis, type InsertAnalysis, type UpdateAnalysis, type User, type InsertUser, type AiSettings, type InsertAiSettings } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, ilike, or } from "drizzle-orm";

export interface IStorage {
  // Analysis methods
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getAnalysis(id: number): Promise<Analysis | undefined>;
  getAnalysisByAnalysisId(analysisId: string): Promise<Analysis | undefined>;
  updateAnalysis(id: number, updates: UpdateAnalysis): Promise<Analysis | undefined>;
  getAllAnalyses(): Promise<Analysis[]>;
  searchAnalyses(query: string): Promise<Analysis[]>;
  getAnalysesByPriority(priority: string): Promise<Analysis[]>;
  getAnalysesByDateRange(startDate: Date, endDate: Date): Promise<Analysis[]>;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  
  // AI Settings methods
  createAiSettings(settings: Omit<InsertAiSettings, 'apiKey'> & { encryptedApiKey: string; testStatus: string }): Promise<AiSettings>;
  getAllAiSettings(): Promise<AiSettings[]>;
  getActiveAiSettings(): Promise<AiSettings | undefined>;
  deactivateAllAiSettings(): Promise<void>;
  deleteAiSettings(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const [analysis] = await db
      .insert(analyses)
      .values({
        ...insertAnalysis,
        createdAt: new Date(),
        completedAt: null,
      })
      .returning();
    return analysis;
  }

  async getAnalysis(id: number): Promise<Analysis | undefined> {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id));
    return analysis || undefined;
  }

  async getAnalysisByAnalysisId(analysisId: string): Promise<Analysis | undefined> {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.analysisId, analysisId));
    return analysis || undefined;
  }

  async updateAnalysis(id: number, updates: UpdateAnalysis): Promise<Analysis | undefined> {
    const updateData = { ...updates };
    if (updates.status === 'completed') {
      updateData.completedAt = new Date();
    }
    
    const [analysis] = await db
      .update(analyses)
      .set(updateData)
      .where(eq(analyses.id, id))
      .returning();
    return analysis || undefined;
  }

  async getAllAnalyses(): Promise<Analysis[]> {
    return await db.select().from(analyses).orderBy(desc(analyses.createdAt));
  }

  async searchAnalyses(query: string): Promise<Analysis[]> {
    const lowercaseQuery = `%${query.toLowerCase()}%`;
    return await db.select().from(analyses).where(
      or(
        ilike(analyses.issueDescription, lowercaseQuery),
        ilike(analyses.rootCause, lowercaseQuery),
        ilike(analyses.analysisId, lowercaseQuery),
        ilike(analyses.equipmentType, lowercaseQuery),
        ilike(analyses.equipmentId, lowercaseQuery)
      )
    ).orderBy(desc(analyses.createdAt));
  }

  async getAnalysesByPriority(priority: string): Promise<Analysis[]> {
    return await db.select().from(analyses).where(eq(analyses.priority, priority)).orderBy(desc(analyses.createdAt));
  }

  async getAnalysesByDateRange(startDate: Date, endDate: Date): Promise<Analysis[]> {
    return await db.select().from(analyses).where(
      and(
        gte(analyses.createdAt, startDate),
        lte(analyses.createdAt, endDate)
      )
    ).orderBy(desc(analyses.createdAt));
  }

  // AI Settings methods
  async createAiSettings(settings: {
    provider: string;
    encryptedApiKey: string;
    isActive: boolean;
    createdBy: number;
    testStatus: string;
  }): Promise<AiSettings> {
    const [aiSetting] = await db
      .insert(aiSettings)
      .values(settings)
      .returning();
    return aiSetting;
  }

  async getAllAiSettings(): Promise<AiSettings[]> {
    return await db.select().from(aiSettings).orderBy(desc(aiSettings.createdAt));
  }

  async getActiveAiSettings(): Promise<AiSettings | undefined> {
    const [setting] = await db.select().from(aiSettings).where(eq(aiSettings.isActive, true));
    return setting || undefined;
  }

  async deactivateAllAiSettings(): Promise<void> {
    await db.update(aiSettings).set({ isActive: false });
  }

  async deleteAiSettings(id: number): Promise<void> {
    await db.delete(aiSettings).where(eq(aiSettings.id, id));
  }
}

export const storage = new DatabaseStorage();
