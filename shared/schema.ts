import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  analysisId: text("analysis_id").notNull().unique(),
  issueDescription: text("issue_description").notNull(),
  rootCause: text("root_cause"),
  confidence: integer("confidence"), // percentage 0-100
  priority: text("priority").notNull(), // high, medium, low
  status: text("status").notNull().default("processing"), // processing, completed, failed
  recommendations: jsonb("recommendations"), // array of recommendation strings
  uploadedFiles: jsonb("uploaded_files"), // array of file info
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type UpdateAnalysis = z.infer<typeof updateAnalysisSchema>;

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
