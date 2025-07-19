import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // user, admin
});

export const aiSettings = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(), // openai, gemini, anthropic
  encryptedApiKey: text("encrypted_api_key").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastTestedAt: timestamp("last_tested_at"),
  testStatus: text("test_status"), // success, failed, pending
});

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  analysisId: text("analysis_id").notNull().unique(),
  issueDescription: text("issue_description").notNull(),
  equipmentType: text("equipment_type").notNull(), // pump, motor, compressor, heat_exchanger, etc
  equipmentId: text("equipment_id"), // unique equipment identifier
  location: text("location"), // physical location of equipment
  rootCause: text("root_cause"),
  confidence: integer("confidence"), // percentage 0-100
  priority: text("priority").notNull(), // high, medium, low
  status: text("status").notNull().default("processing"), // processing, completed, failed
  recommendations: jsonb("recommendations"), // array of recommendation strings
  uploadedFiles: jsonb("uploaded_files"), // array of file info
  operatingParameters: jsonb("operating_parameters"), // pressure, temperature, flow, etc
  historicalData: jsonb("historical_data"), // past performance and maintenance data
  learningInsights: jsonb("learning_insights"), // ML insights for equipment-specific learning
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const updateAnalysisSchema = insertAnalysisSchema.partial();

export const insertAiSettingsSchema = createInsertSchema(aiSettings).omit({
  id: true,
  createdAt: true,
  lastTestedAt: true,
  encryptedApiKey: true,
}).extend({
  apiKey: z.string().min(1, "API key is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type UpdateAnalysis = z.infer<typeof updateAnalysisSchema>;
export type AiSettings = typeof aiSettings.$inferSelect;
export type InsertAiSettings = z.infer<typeof insertAiSettingsSchema>;

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface ProcessingStage {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
}

export interface OperatingParameters {
  pressure?: {
    upstream: number;
    downstream: number;
    unit: string;
  };
  temperature?: {
    inlet: number;
    outlet: number;
    bearing?: number;
    unit: string;
  };
  flow?: {
    rate: number;
    unit: string;
  };
  vibration?: {
    horizontal: number;
    vertical: number;
    axial: number;
    unit: string;
  };
  power?: {
    consumption: number;
    unit: string;
  };
  speed?: {
    rpm: number;
  };
  efficiency?: {
    percentage: number;
  };
}

export interface HistoricalData {
  maintenanceRecords: Array<{
    date: string;
    type: string;
    description: string;
    cost?: number;
  }>;
  performanceMetrics: Array<{
    date: string;
    parameters: OperatingParameters;
    efficiency?: number;
  }>;
  previousFailures: Array<{
    date: string;
    rootCause: string;
    resolution: string;
    downtime: number;
  }>;
}

export interface LearningInsights {
  equipmentProfile: {
    manufacturer: string;
    model: string;
    yearInstalled: number;
    designLife: number;
  };
  patterns: Array<{
    pattern: string;
    frequency: number;
    severity: 'low' | 'medium' | 'high';
    conditions: string[];
  }>;
  predictiveIndicators: Array<{
    parameter: string;
    threshold: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    reliability: number;
  }>;
  recommendations: Array<{
    type: 'preventive' | 'corrective' | 'predictive';
    action: string;
    priority: 'low' | 'medium' | 'high';
    estimatedCost?: number;
    expectedBenefit: string;
  }>;
}

export const EQUIPMENT_TYPES = [
  'pump',
  'motor', 
  'compressor',
  'heat_exchanger',
  'valve',
  'turbine',
  'gearbox',
  'bearing',
  'conveyor',
  'reactor',
  'vessel',
  'other'
] as const;

export type EquipmentType = typeof EQUIPMENT_TYPES[number];
