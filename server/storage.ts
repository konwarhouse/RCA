import { analyses, type Analysis, type InsertAnalysis, type UpdateAnalysis, type FileInfo } from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private analyses: Map<number, Analysis>;
  private currentAnalysisId: number;

  constructor() {
    this.analyses = new Map();
    this.currentAnalysisId = 1;
    
    // Add some sample data for demonstration
    this.seedData();
  }

  private seedData() {
    const sampleAnalyses: Omit<Analysis, 'id'>[] = [
      {
        analysisId: "RCA-2024-001",
        issueDescription: "Equipment Overheating - Pump Station A",
        rootCause: "Blocked air intake filters causing inadequate ventilation and subsequent thermal buildup",
        confidence: 96,
        priority: "high",
        status: "completed",
        recommendations: [
          "Immediate filter replacement and cleaning schedule revision",
          "Install automated filter monitoring system",
          "Implement weekly thermal inspections"
        ],
        uploadedFiles: [
          { name: "pump_station_logs.csv", size: 2048, type: "text/csv", uploadedAt: new Date().toISOString() }
        ],
        createdAt: new Date("2024-01-15T14:30:00Z"),
        completedAt: new Date("2024-01-15T14:32:30Z"),
      },
      {
        analysisId: "RCA-2024-002",
        issueDescription: "Recurring Electrical Faults - Building B",
        rootCause: "Moisture ingress due to damaged weather sealing on outdoor electrical panels",
        confidence: 87,
        priority: "medium",
        status: "completed",
        recommendations: [
          "Replace damaged weather sealing on all outdoor panels",
          "Apply protective coating to internal components",
          "Install humidity monitoring systems"
        ],
        uploadedFiles: [
          { name: "electrical_fault_reports.pdf", size: 5120, type: "application/pdf", uploadedAt: new Date().toISOString() }
        ],
        createdAt: new Date("2024-01-15T11:15:00Z"),
        completedAt: new Date("2024-01-15T11:18:45Z"),
      },
      {
        analysisId: "RCA-2024-003",
        issueDescription: "Vibration Anomalies - Conveyor System 3",
        rootCause: "Worn bearing assemblies in drive motor causing increased vibration and noise levels",
        confidence: 92,
        priority: "low",
        status: "completed",
        recommendations: [
          "Schedule bearing replacement during next maintenance window",
          "Implement vibration monitoring sensors",
          "Adjust lubrication schedule for optimal performance"
        ],
        uploadedFiles: [
          { name: "vibration_data.json", size: 1536, type: "application/json", uploadedAt: new Date().toISOString() }
        ],
        createdAt: new Date("2024-01-14T16:45:00Z"),
        completedAt: new Date("2024-01-14T16:47:20Z"),
      }
    ];

    sampleAnalyses.forEach(analysis => {
      const id = this.currentAnalysisId++;
      this.analyses.set(id, { ...analysis, id });
    });
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const id = this.currentAnalysisId++;
    const analysis: Analysis = {
      ...insertAnalysis,
      id,
      createdAt: new Date(),
      completedAt: null,
    };
    this.analyses.set(id, analysis);
    return analysis;
  }

  async getAnalysis(id: number): Promise<Analysis | undefined> {
    return this.analyses.get(id);
  }

  async getAnalysisByAnalysisId(analysisId: string): Promise<Analysis | undefined> {
    return Array.from(this.analyses.values()).find(
      (analysis) => analysis.analysisId === analysisId,
    );
  }

  async updateAnalysis(id: number, updates: UpdateAnalysis): Promise<Analysis | undefined> {
    const analysis = this.analyses.get(id);
    if (!analysis) return undefined;

    const updatedAnalysis = { ...analysis, ...updates };
    if (updates.status === 'completed' && !analysis.completedAt) {
      updatedAnalysis.completedAt = new Date();
    }
    
    this.analyses.set(id, updatedAnalysis);
    return updatedAnalysis;
  }

  async getAllAnalyses(): Promise<Analysis[]> {
    return Array.from(this.analyses.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async searchAnalyses(query: string): Promise<Analysis[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.analyses.values()).filter(
      (analysis) =>
        analysis.issueDescription.toLowerCase().includes(lowercaseQuery) ||
        analysis.rootCause?.toLowerCase().includes(lowercaseQuery) ||
        analysis.analysisId.toLowerCase().includes(lowercaseQuery)
    );
  }

  async getAnalysesByPriority(priority: string): Promise<Analysis[]> {
    return Array.from(this.analyses.values()).filter(
      (analysis) => analysis.priority === priority
    );
  }

  async getAnalysesByDateRange(startDate: Date, endDate: Date): Promise<Analysis[]> {
    return Array.from(this.analyses.values()).filter(
      (analysis) =>
        new Date(analysis.createdAt) >= startDate &&
        new Date(analysis.createdAt) <= endDate
    );
  }
}

export const storage = new MemStorage();
