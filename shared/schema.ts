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
  createdBy: integer("created_by"), // Remove foreign key constraint for now
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastTestedAt: timestamp("last_tested_at"),
  testStatus: text("test_status"), // success, failed, pending
});

// ISO 14224 compliant RCA Analysis table
export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  analysisId: text("analysis_id").notNull().unique(),
  
  // Analysis Type - Asset RCA (Fault Tree) or Safety RCA (ECFA)  
  analysisType: text("analysis_type").notNull(), // "asset_rca" | "safety_rca"
  
  // Workflow Management
  workflowStage: text("workflow_stage").notNull().default("evidence_collection"), 
  // evidence_collection -> validation -> ai_processing -> expert_review -> completed
  
  // ISO 14224 Equipment Classification
  equipmentCategory: text("equipment_category"), // rotating, static, electrical, instrumentation, support
  equipmentSubcategory: text("equipment_subcategory"), // pumps, valves, motors, etc.
  equipmentType: text("equipment_type"), // centrifugal_pump, gate_valve, etc.
  equipmentTag: text("equipment_tag").notNull(), // unique equipment identifier
  
  // Location & Asset Hierarchy
  site: text("site"),
  processUnit: text("process_unit"),
  system: text("system"),
  location: text("location"),
  
  // Event Information
  eventDateTime: timestamp("event_datetime"),
  detectedBy: text("detected_by"),
  detectionMethod: text("detection_method"),
  operatingMode: text("operating_mode"), // normal, startup, shutdown, standby
  
  // Evidence Collection (comprehensive structured data)
  evidenceData: jsonb("evidence_data"), // Complete questionnaire responses organized by phases
  requiredEvidenceComplete: boolean("required_evidence_complete").default(false),
  evidenceValidationStatus: text("evidence_validation_status").default("pending"), // pending, validated, incomplete
  
  // Data Ingestion
  uploadedFiles: jsonb("uploaded_files"), // Original file attachments
  parsedData: jsonb("parsed_data"), // NLP extracted data from files
  dataValidationResults: jsonb("data_validation_results"), // Validation flags and issues
  
  // Analysis Results 
  faultTreeAnalysis: jsonb("fault_tree_analysis"), // Fault tree structure and probabilities
  ecfaAnalysis: jsonb("ecfa_analysis"), // Event-Causal Factor Analysis for safety events
  rootCauses: jsonb("root_causes"), // Primary and contributing causes with evidence links
  recommendations: jsonb("recommendations"), // Corrective and preventive actions
  confidenceScore: integer("confidence_score"), // 0-100 overall confidence
  riskRating: text("risk_rating"), // low, medium, high, critical
  
  // Status and Priority
  status: text("status").notNull().default("evidence_collection"),
  priority: text("priority").notNull().default("medium"),
  
  // Regulatory and Compliance
  reportableEvent: boolean("reportable_event").default(false),
  regulatoryRequirements: jsonb("regulatory_requirements"),
  complianceStatus: text("compliance_status"),
  operatingParameters: jsonb("operating_parameters"), // pressure, temperature, flow, etc
  historicalData: jsonb("historical_data"), // past performance and maintenance data
  learningInsights: jsonb("learning_insights"), // ML insights for equipment-specific learning
  
  // Enhanced RCA fields
  rcaAnalysis: jsonb("rca_analysis"), // comprehensive RCA analysis results
  evidenceCorrelation: jsonb("evidence_correlation"), // supporting/contradicting evidence
  stepwiseReasoning: jsonb("stepwise_reasoning"), // AI reasoning process
  missingDataPrompts: jsonb("missing_data_prompts"), // what data is still needed
  manualAdjustments: jsonb("manual_adjustments"), // expert overrides and corrections
  versionHistory: jsonb("version_history"), // analysis version tracking
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  evidenceCompletedAt: timestamp("evidence_completed_at"),
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
  // Basic Parameters
  pressure?: {
    upstream: number;
    downstream: number;
    suction?: number;
    discharge?: number;
    unit: string;
  };
  temperature?: {
    inlet: number;
    outlet: number;
    bearing?: number;
    ambient?: number;
    unit: string;
  };
  flow?: {
    rate: number;
    design_rate?: number;
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
    voltage?: number;
    current?: number;
    power_factor?: number;
    unit: string;
  };
  speed?: {
    rpm: number;
    design_rpm?: number;
  };
  efficiency?: {
    percentage: number;
  };
  
  // Advanced Lubrication Parameters
  lubrication?: {
    oil_level?: string; // "normal" | "low" | "high"
    oil_pressure?: number;
    oil_temperature?: number;
    oil_condition?: {
      particle_ppm?: number;
      water_content?: number;
    };
    grease_frequency?: string;
    grease_type?: string;
  };
  
  // Electrical Parameters
  electrical?: {
    current_amps?: number;
    voltage?: number;
    power_factor?: number;
    insulation_resistance?: number;
  };
  
  // Run Hours & Duty Cycle
  runtime?: {
    hours_since_maintenance?: number;
    start_stop_cycles?: number;
    duty_cycle_percentage?: number;
  };
  
  // Environmental Conditions
  environmental?: {
    ambient_temperature?: number;
    humidity_percentage?: number;
    corrosive_agents?: string[];
    dust_level?: string; // "low" | "medium" | "high"
    external_vibration?: boolean;
  };
  
  // Process-Specific Parameters
  process?: {
    npsh_available?: number;
    npsh_required?: number;
    media_type?: string; // "water" | "oil" | "slurry" | "chemical"
    ph_level?: number;
    solids_content_percentage?: number;
    viscosity?: number;
  };
  
  // Setpoints & Alarms
  setpoints?: {
    design_vs_actual?: Record<string, { design: number; actual: number }>;
    alarm_limits?: Record<string, { low: number; high: number }>;
    excursions?: Array<{
      parameter: string;
      timestamp: string;
      value: number;
      limit: number;
    }>;
  };
}

export interface HistoricalData {
  maintenanceRecords: Array<{
    date: string;
    type: string; // "preventive" | "corrective" | "predictive" | "emergency"
    description: string;
    cost?: number;
    parts_replaced?: string[];
    technician?: string;
    work_order?: string;
  }>;
  performanceMetrics: Array<{
    date: string;
    parameters: OperatingParameters;
    efficiency?: number;
    baseline_deviation?: Record<string, number>;
  }>;
  previousFailures: Array<{
    date: string;
    rootCause: string;
    failure_mode: string;
    resolution: string;
    downtime: number;
    cost?: number;
    lessons_learned?: string;
  }>;
  
  // Enhanced Event Metadata
  eventMetadata?: {
    operator_at_failure?: string;
    shift?: string; // "day" | "night" | "weekend"
    active_alarms?: Array<{
      alarm_name: string;
      timestamp: string;
      severity: "low" | "medium" | "high" | "critical";
    }>;
    sequence_of_events?: Array<{
      timestamp: string;
      event: string;
      parameter_values?: Record<string, number>;
    }>;
  };
  
  // Equipment Specifications
  equipmentSpecs?: {
    manufacturer?: string;
    model?: string;
    serial_number?: string;
    year_installed?: number;
    design_life_years?: number;
    criticality?: "low" | "medium" | "high" | "critical";
    modifications?: Array<{
      date: string;
      description: string;
      reason: string;
    }>;
  };
  
  // Trend Analysis Data
  trendData?: Array<{
    parameter: string;
    trend: "increasing" | "decreasing" | "stable" | "erratic";
    rate_of_change?: number;
    confidence?: number;
    baseline_value?: number;
    current_value?: number;
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

// Evidence Collection Schema for Question-Driven RCA
export interface EvidenceData {
  // Phase 1: Asset Context
  assetContext: {
    equipmentType: string; // valve, pump, motor, compressor, conveyor, fan, other
    subtype?: string; // ball valve, centrifugal pump, induction motor, etc.
    mainFunction?: string; // process water transfer, slurry control, air supply
    location: string; // site, plant area, line number, asset ID
    assetAge?: {
      inServiceSince?: string;
      totalRunHours?: number;
      dutyCycle?: string;
    };
  };

  // Phase 2: Symptom Definition
  symptomDefinition: {
    observedProblem: string; // leak, noise, high vibration, low output, failure to start, etc.
    symptomLocation?: string; // stem, seat, body, bearing, casing, wiring, etc.
    firstNoticed?: {
      dateTime?: string;
      operatingState?: string; // operation, startup, shutdown, after maintenance
    };
    problemPattern?: string; // constant, intermittent, recurring
    frequency?: string;
    alarmsActivated?: Array<{
      alarmName: string;
      timestamp?: string;
      details?: string;
    }>;
  };

  // Phase 3: Operating Conditions
  operatingConditions: {
    currentParameters: {
      flow?: { rate?: number; unit?: string };
      pressure?: { upstream?: number; downstream?: number; unit?: string };
      temperature?: { inlet?: number; outlet?: number; bearing?: number; ambient?: number; unit?: string };
      speed?: { rpm?: number };
      power?: { consumption?: number; voltage?: number; current?: number; unit?: string };
      vibration?: { axial?: number; vertical?: number; horizontal?: number; unit?: string };
      lubrication?: {
        oilLevel?: string;
        oilQuality?: string;
        lastChange?: string;
      };
      environmental?: {
        humidity?: number;
        dustLevel?: string;
        corrosiveAgents?: string[];
        ambientTemp?: number;
      };
    };
    recentChanges?: {
      processChanges?: string[];
      setpointChanges?: string[];
      productChanges?: string[];
      environmentalChanges?: string[];
    };
  };

  // Phase 4: Maintenance and Event History
  maintenanceHistory: {
    lastMaintenance?: {
      date?: string;
      type?: string; // PM, CM, overhaul, inspection
      description?: string;
    };
    recentWork?: {
      partsReplaced?: string[];
      adjustmentsMade?: string[];
      installations?: string[];
      modifications?: string[];
    };
    similarProblems?: Array<{
      description: string;
      dateOccurred?: string;
      actionsTaken?: string[];
      wasEffective?: boolean;
    }>;
    processUpsets?: Array<{
      description: string;
      dateOccurred?: string;
      impact?: string;
    }>;
  };

  // Phase 5: Human/Operational Factors
  humanFactors: {
    operatorAtTime?: {
      operatorId?: string;
      shift?: string;
      experienceLevel?: string; // experienced, new, training
    };
    operationalErrors?: {
      knownErrors?: string[];
      sopDeviations?: string[];
      unusualActions?: string[];
    };
  };

  // Phase 6: Design, Installation & External Factors
  designFactors: {
    modifications?: Array<{
      description: string;
      date?: string;
      reason?: string;
    }>;
    installationCompliance?: boolean;
    manufacturerSpecs?: boolean;
    externalFactors?: {
      weather?: string[];
      adjacentEquipment?: string[];
      construction?: string[];
      other?: string[];
    };
  };

  // Phase 7: Evidence & Data Collection
  additionalEvidence: {
    inspectionReports?: Array<{
      type: string;
      date?: string;
      findings: string;
      fileAttached?: boolean;
    }>;
    photos?: boolean;
    videos?: boolean;
    testResults?: Array<{
      testType: string;
      results: string;
      date?: string;
    }>;
    trendData?: Array<{
      parameter: string;
      trend: string;
      timeframe: string;
    }>;
    otherObservations?: string;
  };

  // Phase 8: Dynamic/Conditional Follow-ups
  equipmentSpecific?: {
    // Valve-specific
    valve?: {
      actuatorType?: string; // manual, electric, pneumatic, hydraulic
      leakLocation?: string; // seat, stem, body
      cyclingFrequency?: string;
    };
    // Pump-specific
    pump?: {
      pumpType?: string; // centrifugal, reciprocating, screw, diaphragm
      cavitationSigns?: boolean;
      sealLeakage?: boolean;
      suctionCondition?: string;
      dischargeCondition?: string;
    };
    // Motor/Electrical-specific
    electrical?: {
      overcurrentTrip?: boolean;
      insulationBreakdown?: boolean;
      hotSpots?: boolean;
      arcingSigns?: boolean;
    };
  };

  // Completeness tracking
  completedPhases: string[]; // Array of completed phase names
  requiredFollowUps: string[]; // Array of required follow-up questions based on responses
}

// Analysis workflow stages
export const WORKFLOW_STAGES = [
  'evidence_collection',
  'analysis_ready', 
  'ai_processing',
  'completed',
  'failed'
] as const;

export type WorkflowStage = typeof WORKFLOW_STAGES[number];

// Question definitions for the evidence collection process
export interface QuestionDefinition {
  id: string;
  phase: string;
  text: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'date' | 'boolean';
  options?: string[];
  required: boolean;
  dependsOn?: {
    questionId: string;
    value: string | string[];
  };
  equipmentSpecific?: string[]; // Equipment types this question applies to
}
