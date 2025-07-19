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
        equipmentType: "pump",
        equipmentId: "PUMP-A001",
        location: "Building A - Level 2",
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
        operatingParameters: {
          pressure: { upstream: 45.2, downstream: 42.8, unit: "PSI" },
          temperature: { inlet: 68, outlet: 89, bearing: 145, unit: "°F" },
          flow: { rate: 450, unit: "GPM" },
          vibration: { horizontal: 2.3, vertical: 1.8, axial: 0.9, unit: "mm/s" },
          power: { consumption: 15.4, unit: "kW" },
          speed: { rpm: 1750 }
        },
        historicalData: {
          maintenanceRecords: [
            { date: "2024-01-01", type: "Preventive", description: "Bearing lubrication", cost: 150 },
            { date: "2023-12-15", type: "Corrective", description: "Seal replacement", cost: 800 }
          ],
          performanceMetrics: [],
          previousFailures: [
            { date: "2023-11-20", rootCause: "Seal failure", resolution: "Seal replacement", downtime: 4 }
          ]
        },
        learningInsights: {
          equipmentProfile: { manufacturer: "Grundfos", model: "CR32-4", yearInstalled: 2020, designLife: 15 },
          patterns: [
            { pattern: "High temperature correlation with filter blockage", frequency: 3, severity: "high", conditions: ["summer months", "high load"] }
          ],
          predictiveIndicators: [
            { parameter: "bearing_temperature", threshold: 140, trend: "increasing", reliability: 0.85 }
          ],
          recommendations: [
            { type: "preventive", action: "Monthly filter inspection", priority: "high", estimatedCost: 200, expectedBenefit: "Prevent overheating incidents" }
          ]
        },
        createdAt: new Date("2024-01-15T14:30:00Z"),
        completedAt: new Date("2024-01-15T14:32:30Z"),
      },
      {
        analysisId: "RCA-2024-002",
        issueDescription: "Recurring Electrical Faults - Building B",
        equipmentType: "motor",
        equipmentId: "MOT-B045",
        location: "Building B - Production Floor",
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
        operatingParameters: {
          power: { consumption: 22.8, unit: "kW" },
          speed: { rpm: 1440 },
          temperature: { inlet: 72, outlet: 95, bearing: 125, unit: "°F" },
          vibration: { horizontal: 1.2, vertical: 0.8, axial: 0.5, unit: "mm/s" }
        },
        historicalData: {
          maintenanceRecords: [
            { date: "2023-12-20", type: "Corrective", description: "Panel seal repair", cost: 450 }
          ],
          performanceMetrics: [],
          previousFailures: [
            { date: "2023-10-15", rootCause: "Moisture ingress", resolution: "Temporary sealing", downtime: 2 }
          ]
        },
        learningInsights: {
          equipmentProfile: { manufacturer: "ABB", model: "M3BP315", yearInstalled: 2019, designLife: 20 },
          patterns: [
            { pattern: "Fault frequency increases during rainy season", frequency: 4, severity: "medium", conditions: ["high humidity", "outdoor exposure"] }
          ],
          predictiveIndicators: [
            { parameter: "insulation_resistance", threshold: 1.0, trend: "decreasing", reliability: 0.78 }
          ],
          recommendations: [
            { type: "preventive", action: "Quarterly weatherproofing inspection", priority: "medium", estimatedCost: 300, expectedBenefit: "Reduce electrical faults by 80%" }
          ]
        },
        createdAt: new Date("2024-01-15T11:15:00Z"),
        completedAt: new Date("2024-01-15T11:18:45Z"),
      },
      {
        analysisId: "RCA-2024-003",
        issueDescription: "Vibration Anomalies - Conveyor System 3",
        equipmentType: "conveyor",
        equipmentId: "CONV-C003",
        location: "Warehouse - Section C",
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
        operatingParameters: {
          speed: { rpm: 850 },
          vibration: { horizontal: 4.2, vertical: 3.8, axial: 2.1, unit: "mm/s" },
          power: { consumption: 8.5, unit: "kW" },
          temperature: { bearing: 105, unit: "°F" }
        },
        historicalData: {
          maintenanceRecords: [
            { date: "2023-11-30", type: "Preventive", description: "Belt tension adjustment", cost: 120 },
            { date: "2023-08-15", type: "Corrective", description: "Roller replacement", cost: 350 }
          ],
          performanceMetrics: [],
          previousFailures: [
            { date: "2023-07-20", rootCause: "Belt misalignment", resolution: "Belt realignment", downtime: 1 }
          ]
        },
        learningInsights: {
          equipmentProfile: { manufacturer: "Dorner", model: "2200 Series", yearInstalled: 2018, designLife: 12 },
          patterns: [
            { pattern: "Vibration increases with bearing wear", frequency: 2, severity: "low", conditions: ["high load periods", "dust accumulation"] }
          ],
          predictiveIndicators: [
            { parameter: "bearing_vibration", threshold: 3.5, trend: "increasing", reliability: 0.92 }
          ],
          recommendations: [
            { type: "predictive", action: "Install continuous vibration monitoring", priority: "medium", estimatedCost: 1200, expectedBenefit: "Early detection of bearing issues" }
          ]
        },
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
