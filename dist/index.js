var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  ECFA_COMPONENTS: () => ECFA_COMPONENTS,
  EQUIPMENT_PARAMETERS: () => EQUIPMENT_PARAMETERS,
  EQUIPMENT_TYPES: () => EQUIPMENT_TYPES,
  FAULT_TREE_TEMPLATES: () => FAULT_TREE_TEMPLATES,
  ISO14224_EQUIPMENT_TYPES: () => ISO14224_EQUIPMENT_TYPES,
  aiSettings: () => aiSettings,
  analyses: () => analyses,
  equipmentGroups: () => equipmentGroups,
  evidenceLibrary: () => evidenceLibrary,
  incidents: () => incidents,
  insertAiSettingsSchema: () => insertAiSettingsSchema,
  insertAnalysisSchema: () => insertAnalysisSchema,
  insertEquipmentGroupSchema: () => insertEquipmentGroupSchema,
  insertEvidenceLibrarySchema: () => insertEvidenceLibrarySchema,
  insertIncidentSchema: () => insertIncidentSchema,
  insertInvestigationSchema: () => insertInvestigationSchema,
  insertRiskRankingSchema: () => insertRiskRankingSchema,
  investigations: () => investigations,
  riskRankings: () => riskRankings,
  sessions: () => sessions,
  users: () => users
});
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  integer,
  boolean,
  decimal,
  serial
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var evidenceLibrary = pgTable("evidence_library", {
  id: serial("id").primaryKey(),
  equipmentGroup: varchar("equipment_group").notNull(),
  // Equipment Group 
  equipmentType: varchar("equipment_type").notNull(),
  // Equipment Type
  subtypeExample: varchar("subtype_example"),
  // Subtype / Example
  componentFailureMode: varchar("component_failure_mode").notNull(),
  // Component / Failure Mode
  equipmentCode: varchar("equipment_code").notNull().unique(),
  // Equipment Code
  failureCode: varchar("failure_code").notNull(),
  // Failure Code
  riskRanking: varchar("risk_ranking").notNull(),
  // Risk Ranking
  requiredTrendDataEvidence: text("required_trend_data_evidence"),
  // Required Trend Data / Evidence
  aiOrInvestigatorQuestions: text("ai_or_investigator_questions"),
  // AI or Investigator Questions
  attachmentsEvidenceRequired: text("attachments_evidence_required"),
  // Attachments / Evidence Required
  rootCauseLogic: text("root_cause_logic"),
  // Root Cause Logic
  blankColumn1: varchar("blank_column_1"),
  // Blank Column 1
  blankColumn2: varchar("blank_column_2"),
  // Blank Column 2
  blankColumn3: varchar("blank_column_3"),
  // Blank Column 3
  isActive: boolean("is_active").default(true),
  lastUpdated: timestamp("last_updated").defaultNow(),
  updatedBy: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow()
});
var insertEvidenceLibrarySchema = createInsertSchema(evidenceLibrary).omit({
  id: true,
  createdAt: true,
  lastUpdated: true
});
var investigations = pgTable("investigations", {
  id: serial("id").primaryKey(),
  investigationId: varchar("investigation_id").unique().notNull(),
  // Mandatory Investigation Type Selection
  investigationType: varchar("investigation_type"),
  // 'safety_environmental' or 'equipment_failure'
  // Step 1: Problem Definition (Always Required)
  whatHappened: text("what_happened"),
  whereHappened: varchar("where_happened"),
  whenHappened: timestamp("when_happened"),
  consequence: text("consequence"),
  detectedBy: varchar("detected_by"),
  // Workflow Management
  currentStep: varchar("current_step").default("problem_definition"),
  // problem_definition, investigation_type, evidence_collection, analysis_ready, ai_processing, completed
  // Evidence Collection Data (All 8 Sections for Fault Tree + ECFA sections)
  evidenceData: jsonb("evidence_data"),
  // Structured storage for all questionnaire responses
  evidenceCompleteness: decimal("evidence_completeness", { precision: 5, scale: 2 }).default("0.00"),
  evidenceValidated: boolean("evidence_validated").default(false),
  // Analysis Results
  analysisResults: jsonb("analysis_results"),
  // Fault tree diagram or ECFA chart
  rootCauses: jsonb("root_causes"),
  contributingFactors: jsonb("contributing_factors"),
  recommendations: jsonb("recommendations"),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  // File Attachments
  uploadedFiles: jsonb("uploaded_files"),
  supportingDocuments: jsonb("supporting_documents"),
  // Status and Workflow
  status: varchar("status").default("active"),
  // active, completed, archived
  // Audit Trail
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by"),
  auditTrail: jsonb("audit_trail")
});
var aiSettings = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  provider: varchar("provider").notNull(),
  // openai, anthropic, etc.
  apiKey: text("api_key").notNull(),
  // encrypted
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertInvestigationSchema = createInsertSchema(investigations);
var insertAiSettingsSchema = createInsertSchema(aiSettings);
var equipmentGroups = pgTable("equipment_groups", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertEquipmentGroupSchema = createInsertSchema(equipmentGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var riskRankings = pgTable("risk_rankings", {
  id: serial("id").primaryKey(),
  label: varchar("label").notNull().unique(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertRiskRankingSchema = createInsertSchema(riskRankings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  equipmentGroup: varchar("equipment_group").notNull(),
  equipmentType: varchar("equipment_type").notNull(),
  equipmentSubtype: varchar("equipment_subtype"),
  // NEW: Three-level cascading dropdown system
  equipmentId: varchar("equipment_id").notNull(),
  location: varchar("location").notNull(),
  reportedBy: varchar("reported_by").notNull(),
  incidentDateTime: timestamp("incident_date_time").notNull(),
  priority: varchar("priority").notNull(),
  immediateActions: text("immediate_actions"),
  safetyImplications: text("safety_implications"),
  // Equipment selection & symptoms (Step 2)
  specificPart: varchar("specific_part"),
  symptomDescription: text("symptom_description"),
  operatingConditions: text("operating_conditions"),
  whenObserved: varchar("when_observed"),
  frequency: varchar("frequency"),
  severity: varchar("severity"),
  contextualFactors: text("contextual_factors"),
  equipmentLibraryId: integer("equipment_library_id"),
  // Evidence checklist & collection (Steps 3-5)
  evidenceChecklist: jsonb("evidence_checklist"),
  // AI-generated questions
  evidenceResponses: jsonb("evidence_responses"),
  // User answers & uploads
  evidenceCompleteness: decimal("evidence_completeness", { precision: 5, scale: 2 }),
  // Percentage
  // AI Analysis (Steps 6-7)
  aiAnalysis: jsonb("ai_analysis"),
  // Root causes, contributing factors, recommendations
  analysisConfidence: decimal("analysis_confidence", { precision: 5, scale: 2 }),
  // Engineer Review (Step 8)
  engineerReview: jsonb("engineer_review"),
  // Engineer review and approval data
  finalizedAt: timestamp("finalized_at"),
  finalizedBy: varchar("finalized_by"),
  // Workflow tracking
  currentStep: integer("current_step").default(1),
  // 1-8 step tracking
  workflowStatus: varchar("workflow_status").default("incident_reported"),
  // incident_reported, equipment_selected, evidence_collected, ai_analyzed, finalized
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentStep: true,
  workflowStatus: true
});
var analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  investigationId: varchar("investigation_id"),
  filename: varchar("filename"),
  analysisType: varchar("analysis_type"),
  equipmentType: varchar("equipment_type"),
  equipmentSubtype: varchar("equipment_subtype"),
  site: varchar("site"),
  location: varchar("location"),
  priority: varchar("priority"),
  status: varchar("status").default("completed"),
  rootCause: text("root_cause"),
  contributingFactors: jsonb("contributing_factors"),
  recommendations: jsonb("recommendations"),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertAnalysisSchema = createInsertSchema(analyses);
var ISO14224_EQUIPMENT_TYPES = {
  rotating: {
    label: "Rotating Equipment",
    subcategories: {
      pumps: {
        label: "Pumps",
        types: ["Centrifugal Pump", "Positive Displacement Pump", "Reciprocating Pump", "Screw Pump", "Gear Pump"]
      },
      compressors: {
        label: "Compressors",
        types: ["Centrifugal Compressor", "Reciprocating Compressor", "Screw Compressor", "Rotary Compressor"]
      },
      turbines: {
        label: "Turbines",
        types: ["Steam Turbine", "Gas Turbine", "Wind Turbine", "Hydraulic Turbine"]
      },
      motors: {
        label: "Motors",
        types: ["Electric Motor", "Hydraulic Motor", "Pneumatic Motor"]
      }
    }
  },
  static: {
    label: "Static Equipment",
    subcategories: {
      vessels: {
        label: "Pressure Vessels",
        types: ["Storage Tank", "Reactor", "Separator", "Distillation Column", "Heat Exchanger"]
      },
      heat_exchangers: {
        label: "Heat Exchangers",
        types: ["Shell & Tube", "Plate Heat Exchanger", "Air Cooler", "Condenser", "Reboiler"]
      },
      piping: {
        label: "Piping Systems",
        types: ["Process Piping", "Utility Piping", "Pipeline", "Manifold"]
      }
    }
  },
  electrical: {
    label: "Electrical Equipment",
    subcategories: {
      power_distribution: {
        label: "Power Distribution",
        types: ["Transformer", "Switchgear", "Motor Control Center", "Panel Board"]
      },
      protection: {
        label: "Protection Systems",
        types: ["Circuit Breaker", "Relay", "Fuse", "Surge Protector"]
      }
    }
  },
  instrumentation: {
    label: "Instrumentation & Control",
    subcategories: {
      measurement: {
        label: "Measurement Devices",
        types: ["Pressure Transmitter", "Temperature Sensor", "Flow Meter", "Level Indicator"]
      },
      control: {
        label: "Control Systems",
        types: ["Control Valve", "PLC", "DCS", "Safety System"]
      }
    }
  },
  support: {
    label: "Support Systems",
    subcategories: {
      safety: {
        label: "Safety Systems",
        types: ["Fire Protection", "Gas Detection", "Emergency Shutdown", "Relief System"]
      },
      utilities: {
        label: "Utilities",
        types: ["Cooling Water", "Steam System", "Compressed Air", "Electrical Supply"]
      }
    }
  }
};
var EQUIPMENT_TYPES = ISO14224_EQUIPMENT_TYPES;
var EQUIPMENT_PARAMETERS = {
  pumps: [
    { key: "suction_pressure", label: "Suction Pressure", unit: "bar", type: "number" },
    { key: "discharge_pressure", label: "Discharge Pressure", unit: "bar", type: "number" },
    { key: "flow_rate", label: "Flow Rate", unit: "m\xB3/h", type: "number" },
    { key: "vibration_level", label: "Vibration Level", unit: "mm/s", type: "number" },
    { key: "temperature", label: "Temperature", unit: "\xB0C", type: "number" },
    { key: "seal_condition", label: "Seal Condition", type: "select", options: ["Good", "Slight Leak", "Major Leak", "Failed"] },
    { key: "noise_level", label: "Noise Level", type: "select", options: ["Normal", "Slight Increase", "Loud", "Very Loud"] }
  ],
  motors: [
    { key: "current", label: "Current", unit: "A", type: "number" },
    { key: "voltage", label: "Voltage", unit: "V", type: "number" },
    { key: "temperature", label: "Temperature", unit: "\xB0C", type: "number" },
    { key: "vibration", label: "Vibration", unit: "mm/s", type: "number" },
    { key: "load", label: "Load", unit: "%", type: "number" },
    { key: "insulation_resistance", label: "Insulation Resistance", unit: "M\u03A9", type: "number" }
  ],
  valves: [
    { key: "position", label: "Valve Position", unit: "%", type: "number" },
    { key: "actuator_pressure", label: "Actuator Pressure", unit: "bar", type: "number" },
    { key: "seat_leakage", label: "Seat Leakage", type: "select", options: ["None", "Slight", "Moderate", "Severe"] },
    { key: "packing_leakage", label: "Packing Leakage", type: "select", options: ["None", "Slight", "Moderate", "Severe"] },
    { key: "response_time", label: "Response Time", unit: "s", type: "number" }
  ]
};
var FAULT_TREE_TEMPLATES = {
  pump_failure: {
    name: "Pump Failure Analysis",
    top_event: "Pump Failed to Operate",
    logic_gates: [
      {
        id: "OR1",
        type: "OR",
        description: "Pump failure modes",
        inputs: ["mechanical_failure", "electrical_failure", "process_conditions"]
      }
    ],
    basic_events: [
      { id: "mechanical_failure", description: "Mechanical component failure", probability: 0.1 },
      { id: "electrical_failure", description: "Electrical system failure", probability: 0.05 },
      { id: "process_conditions", description: "Adverse process conditions", probability: 0.15 }
    ]
  }
};
var ECFA_COMPONENTS = {
  event_types: [
    "Personal Injury",
    "Environmental Release",
    "Fire/Explosion",
    "Property Damage",
    "Process Safety Event",
    "Security Incident",
    "Near Miss"
  ],
  barrier_types: [
    "Prevention Barrier",
    "Protection Barrier",
    "Mitigation Barrier",
    "Emergency Response Barrier",
    "Recovery Barrier"
  ],
  cause_categories: [
    "Human Factors",
    "Equipment/Technical",
    "Organizational",
    "External Factors",
    "Latent Conditions"
  ]
};

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, and, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
var DatabaseInvestigationStorage = class {
  async createInvestigation(data) {
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
    const [investigation] = await db.insert(investigations).values(investigationData).returning();
    return investigation;
  }
  async getInvestigation(id) {
    const [investigation] = await db.select().from(investigations).where(eq(investigations.id, id));
    return investigation;
  }
  async getInvestigationByInvestigationId(investigationId) {
    console.log("[RCA] Looking for investigation with investigationId:", investigationId);
    try {
      const [investigation] = await db.select().from(investigations).where(eq(investigations.investigationId, investigationId));
      console.log("[RCA] Found investigation:", investigation ? `ID ${investigation.id}` : "undefined");
      return investigation;
    } catch (error) {
      console.error("[RCA] Error finding investigation by investigationId:", error);
      return void 0;
    }
  }
  async updateInvestigation(id, data) {
    const updateData = {
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    };
    const [investigation] = await db.update(investigations).set(updateData).where(eq(investigations.id, id)).returning();
    return investigation;
  }
  async getAllInvestigations() {
    return await db.select().from(investigations).orderBy(investigations.createdAt);
  }
  async updateEvidence(id, evidenceData) {
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
      updatedAt: /* @__PURE__ */ new Date()
    });
  }
  async validateEvidenceCompleteness(id) {
    const investigation = await this.getInvestigation(id);
    if (!investigation) {
      throw new Error("Investigation not found");
    }
    const evidenceData = investigation.evidenceData || {};
    const evidenceKeys = Object.keys(evidenceData);
    const requiredFields = investigation.investigationType === "safety_environmental" ? ["event_type", "event_chronology", "immediate_causes", "root_causes_ecfa"] : ["equipment_tag", "equipment_category", "event_datetime", "observed_problem"];
    const completedRequired = requiredFields.filter(
      (field) => evidenceData[field] && evidenceData[field] !== ""
    );
    const completeness = completedRequired.length / requiredFields.length * 100;
    const isValid = completeness >= 80;
    return { completeness, isValid };
  }
  // AI Settings methods - in-memory for now
  aiSettings = [];
  async getAllAiSettings() {
    return this.aiSettings;
  }
  async saveAiSettings(data) {
    const newSetting = {
      id: this.aiSettings.length + 1,
      provider: data.provider,
      isActive: data.isActive,
      createdBy: data.createdBy,
      createdAt: /* @__PURE__ */ new Date(),
      // Don't store the actual API key in memory for security
      hasApiKey: true
    };
    if (data.isActive) {
      this.aiSettings.forEach((setting) => {
        setting.isActive = false;
      });
    }
    this.aiSettings.push(newSetting);
    return newSetting;
  }
  async deleteAiSettings(id) {
    this.aiSettings = this.aiSettings.filter((setting) => setting.id !== id);
  }
  // Evidence Library operations
  async getAllEvidenceLibrary() {
    return await db.select().from(evidenceLibrary).where(eq(evidenceLibrary.isActive, true)).orderBy(evidenceLibrary.equipmentGroup, evidenceLibrary.equipmentType);
  }
  async getEvidenceLibraryById(id) {
    const [item] = await db.select().from(evidenceLibrary).where(eq(evidenceLibrary.id, id));
    return item;
  }
  async createEvidenceLibrary(data) {
    const [item] = await db.insert(evidenceLibrary).values({
      ...data,
      lastUpdated: /* @__PURE__ */ new Date()
    }).returning();
    return item;
  }
  async updateEvidenceLibrary(id, data) {
    const [item] = await db.update(evidenceLibrary).set({
      ...data,
      lastUpdated: /* @__PURE__ */ new Date()
    }).where(eq(evidenceLibrary.id, id)).returning();
    return item;
  }
  async deleteEvidenceLibrary(id) {
    await db.update(evidenceLibrary).set({ isActive: false, lastUpdated: /* @__PURE__ */ new Date() }).where(eq(evidenceLibrary.id, id));
  }
  async searchEvidenceLibrary(searchTerm) {
    const searchPattern = `%${searchTerm.toLowerCase()}%`;
    console.log("Searching evidence library for:", searchTerm, "with pattern:", searchPattern);
    const results = await db.select().from(evidenceLibrary).where(
      and(
        eq(evidenceLibrary.isActive, true),
        or(
          sql`LOWER(${evidenceLibrary.equipmentType}) LIKE ${searchPattern}`,
          sql`LOWER(${evidenceLibrary.componentFailureMode}) LIKE ${searchPattern}`,
          sql`LOWER(${evidenceLibrary.equipmentCode}) LIKE ${searchPattern}`,
          sql`LOWER(${evidenceLibrary.subtypeExample}) LIKE ${searchPattern}`,
          sql`LOWER(${evidenceLibrary.equipmentGroup}) LIKE ${searchPattern}`
        )
      )
    );
    console.log("Evidence library search results:", results.length, "items found");
    return results;
  }
  async bulkImportEvidenceLibrary(data) {
    const items = data.map((item) => ({
      ...item,
      lastUpdated: /* @__PURE__ */ new Date()
    }));
    return await db.insert(evidenceLibrary).values(items).returning();
  }
  // Equipment Groups operations
  async getAllEquipmentGroups() {
    return await db.select().from(equipmentGroups).orderBy(equipmentGroups.name);
  }
  async getActiveEquipmentGroups() {
    return await db.select().from(equipmentGroups).where(eq(equipmentGroups.isActive, true)).orderBy(equipmentGroups.name);
  }
  async createEquipmentGroup(data) {
    const [result] = await db.insert(equipmentGroups).values({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return result;
  }
  async updateEquipmentGroup(id, data) {
    const [result] = await db.update(equipmentGroups).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(equipmentGroups.id, id)).returning();
    return result;
  }
  async deleteEquipmentGroup(id) {
    await db.delete(equipmentGroups).where(eq(equipmentGroups.id, id));
  }
  async toggleEquipmentGroupStatus(id) {
    const [current] = await db.select().from(equipmentGroups).where(eq(equipmentGroups.id, id));
    if (!current) throw new Error("Equipment group not found");
    const [result] = await db.update(equipmentGroups).set({
      isActive: !current.isActive,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(equipmentGroups.id, id)).returning();
    return result;
  }
  // Risk Rankings operations
  async getAllRiskRankings() {
    return await db.select().from(riskRankings).orderBy(riskRankings.label);
  }
  async getActiveRiskRankings() {
    return await db.select().from(riskRankings).where(eq(riskRankings.isActive, true)).orderBy(riskRankings.label);
  }
  async createRiskRanking(data) {
    const [result] = await db.insert(riskRankings).values({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return result;
  }
  async updateRiskRanking(id, data) {
    const [result] = await db.update(riskRankings).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(riskRankings.id, id)).returning();
    return result;
  }
  async deleteRiskRanking(id) {
    await db.delete(riskRankings).where(eq(riskRankings.id, id));
  }
  async toggleRiskRankingStatus(id) {
    const [current] = await db.select().from(riskRankings).where(eq(riskRankings.id, id));
    if (!current) throw new Error("Risk ranking not found");
    const [result] = await db.update(riskRankings).set({
      isActive: !current.isActive,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(riskRankings.id, id)).returning();
    return result;
  }
  // Incident operations - New RCA workflow
  async createIncident(data) {
    try {
      console.log("[DatabaseInvestigationStorage] Creating incident with data:", data);
      let incidentDateTime = /* @__PURE__ */ new Date();
      if (data.incidentDateTime) {
        if (data.incidentDateTime instanceof Date) {
          incidentDateTime = data.incidentDateTime;
        } else {
          incidentDateTime = new Date(data.incidentDateTime);
        }
      }
      const [incident] = await db.insert(incidents).values({
        title: data.title || "",
        description: data.description || "",
        equipmentGroup: data.equipmentGroup || "",
        equipmentType: data.equipmentType || "",
        equipmentId: data.equipmentId || "",
        location: data.location || "",
        reportedBy: data.reportedBy || "",
        incidentDateTime,
        priority: data.priority || "Medium",
        immediateActions: data.immediateActions,
        safetyImplications: data.safetyImplications,
        currentStep: 1,
        workflowStatus: "incident_reported"
      }).returning();
      console.log("[DatabaseInvestigationStorage] Created incident:", incident.id);
      return incident;
    } catch (error) {
      console.error("[DatabaseInvestigationStorage] Error creating incident:", error);
      throw error;
    }
  }
  async getIncident(id) {
    try {
      const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
      return incident;
    } catch (error) {
      console.error("[DatabaseInvestigationStorage] Error getting incident:", error);
      throw error;
    }
  }
  async updateIncident(id, data) {
    try {
      const [incident] = await db.update(incidents).set({
        ...data,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(incidents.id, id)).returning();
      console.log("[DatabaseInvestigationStorage] Updated incident:", incident.id);
      return incident;
    } catch (error) {
      console.error("[DatabaseInvestigationStorage] Error updating incident:", error);
      throw error;
    }
  }
  async getAllIncidents() {
    try {
      return await db.select().from(incidents).orderBy(incidents.createdAt);
    } catch (error) {
      console.error("[DatabaseInvestigationStorage] Error getting all incidents:", error);
      throw error;
    }
  }
  // Cascading dropdown operations - Implementation
  async getCascadingEquipmentGroups() {
    const results = await db.selectDistinct({ equipmentGroup: evidenceLibrary.equipmentGroup }).from(evidenceLibrary).orderBy(evidenceLibrary.equipmentGroup);
    return results.map((r) => r.equipmentGroup);
  }
  async getCascadingEquipmentTypes(groupName) {
    const results = await db.selectDistinct({ equipmentType: evidenceLibrary.equipmentType }).from(evidenceLibrary).where(eq(evidenceLibrary.equipmentGroup, groupName)).orderBy(evidenceLibrary.equipmentType);
    return results.map((r) => r.equipmentType);
  }
  async getCascadingEquipmentSubtypes(groupName, typeName) {
    const results = await db.selectDistinct({ subtypeExample: evidenceLibrary.subtypeExample }).from(evidenceLibrary).where(
      and(
        eq(evidenceLibrary.equipmentGroup, groupName),
        eq(evidenceLibrary.equipmentType, typeName)
      )
    ).orderBy(evidenceLibrary.subtypeExample);
    return results.map((r) => r.subtypeExample);
  }
};
var investigationStorage = new DatabaseInvestigationStorage();

// server/investigation-engine.ts
var FAULT_TREE_QUESTIONNAIRE = [
  // Section 1: General Information
  {
    id: "equipment_tag",
    section: "General Information",
    question: "Equipment Tag/ID",
    type: "text",
    required: true
  },
  {
    id: "equipment_category",
    section: "General Information",
    question: "Equipment Category",
    type: "select",
    required: true,
    options: Object.keys(EQUIPMENT_TYPES)
  },
  {
    id: "equipment_subcategory",
    section: "General Information",
    question: "Equipment Subcategory",
    type: "select",
    required: true,
    conditionalLogic: {
      dependsOn: "equipment_category",
      condition: "any"
    }
  },
  {
    id: "equipment_type",
    section: "General Information",
    question: "Equipment Type",
    type: "select",
    required: true,
    conditionalLogic: {
      dependsOn: "equipment_subcategory",
      condition: "any"
    }
  },
  {
    id: "manufacturer",
    section: "General Information",
    question: "Manufacturer",
    type: "text",
    required: false
  },
  {
    id: "installation_year",
    section: "General Information",
    question: "Year of Installation",
    type: "number",
    required: false
  },
  {
    id: "operating_location",
    section: "General Information",
    question: "Operating Location/Area",
    type: "text",
    required: true
  },
  {
    id: "system_involved",
    section: "General Information",
    question: "System/Process Involved",
    type: "text",
    required: true
  },
  {
    id: "parent_system",
    section: "General Information",
    question: "Parent System/Asset Hierarchy",
    type: "text",
    required: false
  },
  // Section 2: Failure/Event Details
  {
    id: "event_datetime",
    section: "Failure/Event Details",
    question: "Date & Time of Event",
    type: "datetime",
    required: true
  },
  {
    id: "who_detected",
    section: "Failure/Event Details",
    question: "Who Detected the Problem",
    type: "select",
    required: true,
    options: ["Operator", "Maintenance", "Engineer", "Automatic System", "Inspector", "Other"]
  },
  {
    id: "detection_method",
    section: "Failure/Event Details",
    question: "How Was the Problem First Noticed?",
    type: "select",
    required: true,
    options: ["Visual Inspection", "Alarm", "Abnormal Reading", "Noise/Vibration", "Performance Issue", "Routine Check", "Other"]
  },
  {
    id: "operating_mode",
    section: "Failure/Event Details",
    question: "Was Equipment Running, Idle, or Standby at Failure?",
    type: "select",
    required: true,
    options: ["Running", "Idle", "Standby", "Starting", "Stopping", "Unknown"]
  },
  {
    id: "environmental_conditions",
    section: "Failure/Event Details",
    question: "Environmental Conditions at Time",
    type: "textarea",
    required: false
  },
  // Section 3: Symptom and Evidence
  {
    id: "observed_problem",
    section: "Symptom and Evidence",
    question: "Describe the Observed Problem/Failure",
    type: "textarea",
    required: true
  },
  {
    id: "symptom_location",
    section: "Symptom and Evidence",
    question: "Where is the Symptom Observed?",
    type: "text",
    required: true
  },
  {
    id: "problem_type",
    section: "Symptom and Evidence",
    question: "Is the Problem Constant, Intermittent, or Recurring?",
    type: "select",
    required: true,
    options: ["Constant", "Intermittent", "Recurring", "One-time"]
  },
  {
    id: "alarms_triggered",
    section: "Symptom and Evidence",
    question: "Were Any Alarms or Trips Triggered?",
    type: "textarea",
    required: false
  },
  {
    id: "safety_environmental_impact",
    section: "Symptom and Evidence",
    question: "Any Safety or Environmental Impact?",
    type: "boolean",
    required: true
  },
  {
    id: "impact_details",
    section: "Symptom and Evidence",
    question: "Details of Safety/Environmental Impact",
    type: "textarea",
    required: false,
    conditionalLogic: {
      dependsOn: "safety_environmental_impact",
      condition: true
    }
  },
  // Section 4: Operating and Maintenance History
  {
    id: "last_maintenance_date",
    section: "Operating and Maintenance History",
    question: "Date of Last Maintenance/Inspection",
    type: "date",
    required: false
  },
  {
    id: "last_maintenance_type",
    section: "Operating and Maintenance History",
    question: "Type of Last Maintenance Performed",
    type: "select",
    required: false,
    options: ["Preventive", "Corrective", "Predictive", "Overhaul", "Inspection", "Calibration", "Other"]
  },
  {
    id: "recent_work_details",
    section: "Operating and Maintenance History",
    question: "Details of Recent Work, Modifications, or Repairs",
    type: "textarea",
    required: false
  },
  {
    id: "similar_failures_history",
    section: "Operating and Maintenance History",
    question: "History of Similar Failures?",
    type: "boolean",
    required: true
  },
  {
    id: "operating_within_limits",
    section: "Operating and Maintenance History",
    question: "Has Equipment Been Operating Within Design Limits?",
    type: "boolean",
    required: true
  },
  {
    id: "recent_process_upsets",
    section: "Operating and Maintenance History",
    question: "Any Recent Process Upsets, Trips, or Abnormal Operations?",
    type: "textarea",
    required: false
  },
  // Section 6: Human Factors
  {
    id: "operator_name",
    section: "Human Factors",
    question: "Who Was Operating?",
    type: "text",
    required: false
  },
  {
    id: "procedures_followed",
    section: "Human Factors",
    question: "Procedures Followed?",
    type: "boolean",
    required: true
  },
  {
    id: "operator_error",
    section: "Human Factors",
    question: "Known Operator Error?",
    type: "boolean",
    required: true
  },
  {
    id: "training_details",
    section: "Human Factors",
    question: "Training/Competence Details",
    type: "textarea",
    required: false
  },
  {
    id: "recent_changes",
    section: "Human Factors",
    question: "Recent Staffing/Procedure/Training Changes?",
    type: "textarea",
    required: false
  },
  // Section 7: Materials and Spares
  {
    id: "non_oem_parts",
    section: "Materials and Spares",
    question: "Non-OEM Parts Used?",
    type: "boolean",
    required: true
  },
  {
    id: "material_certification",
    section: "Materials and Spares",
    question: "Material Certification/Traceability for Replacements",
    type: "textarea",
    required: false
  },
  {
    id: "spare_parts_issues",
    section: "Materials and Spares",
    question: "Spare Parts Quality/Stock-Out Issues?",
    type: "textarea",
    required: false
  },
  // Section 8: Contributing/External Factors
  {
    id: "external_influences",
    section: "Contributing/External Factors",
    question: "External Influences? (Power loss, utility, weather, etc.)",
    type: "textarea",
    required: false
  },
  {
    id: "process_impacts",
    section: "Contributing/External Factors",
    question: "Upstream/Downstream Process Impacts?",
    type: "textarea",
    required: false
  },
  {
    id: "concurrent_failures",
    section: "Contributing/External Factors",
    question: "Concurrent Failures in Associated Systems?",
    type: "boolean",
    required: false
  },
  {
    id: "cybersecurity_incidents",
    section: "Contributing/External Factors",
    question: "Cybersecurity/Control System Incidents?",
    type: "boolean",
    required: false
  }
];
var ECFA_QUESTIONNAIRE = [
  {
    id: "event_type",
    section: "Event Classification",
    question: "Type of Safety/Environmental Event",
    type: "select",
    required: true,
    options: ECFA_COMPONENTS.event_types
  },
  {
    id: "event_chronology",
    section: "Event Chronology",
    question: "Detailed Event Timeline",
    type: "textarea",
    required: true
  },
  {
    id: "immediate_causes",
    section: "Cause Analysis",
    question: "Immediate Causes",
    type: "textarea",
    required: true
  },
  {
    id: "underlying_causes",
    section: "Cause Analysis",
    question: "Underlying Causes",
    type: "textarea",
    required: true
  },
  {
    id: "root_causes_ecfa",
    section: "Cause Analysis",
    question: "Root Causes",
    type: "textarea",
    required: true
  },
  {
    id: "barriers_analysis",
    section: "Barrier Analysis",
    question: "Barriers and Contributing Factors",
    type: "textarea",
    required: true
  },
  {
    id: "risk_severity",
    section: "Risk Assessment",
    question: "Risk/Severity Assessment",
    type: "textarea",
    required: true
  },
  {
    id: "regulatory_status",
    section: "Regulatory",
    question: "Regulatory/Reportable Status",
    type: "boolean",
    required: true
  },
  {
    id: "post_incident_actions",
    section: "Actions",
    question: "Post-incident Actions and Verification",
    type: "textarea",
    required: true
  }
];
var InvestigationEngine = class {
  // Get appropriate questionnaire based on investigation type
  getQuestionnaire(investigationType) {
    if (investigationType === "safety_environmental") {
      return ECFA_QUESTIONNAIRE;
    } else if (investigationType === "equipment_failure") {
      return FAULT_TREE_QUESTIONNAIRE;
    }
    return [];
  }
  // Get equipment-specific parameters
  getEquipmentParameters(equipmentType) {
    const typeKey = equipmentType?.toLowerCase();
    if (typeKey && typeKey in EQUIPMENT_PARAMETERS) {
      return EQUIPMENT_PARAMETERS[typeKey];
    }
    return [];
  }
  // Calculate evidence completeness
  calculateCompleteness(evidenceData, questionnaire) {
    const requiredQuestions = questionnaire.filter((q) => q.required);
    const answeredRequired = requiredQuestions.filter((q) => {
      const answer = evidenceData[q.id];
      return answer !== void 0 && answer !== null && answer !== "";
    });
    return requiredQuestions.length > 0 ? answeredRequired.length / requiredQuestions.length * 100 : 0;
  }
  // Validate evidence data
  validateEvidence(evidenceData, questionnaire) {
    const missingFields = [];
    questionnaire.forEach((question) => {
      if (question.required) {
        const answer = evidenceData[question.id];
        if (answer === void 0 || answer === null || answer === "") {
          missingFields.push(question.question);
        }
      }
    });
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }
  // Generate Fault Tree Analysis
  generateFaultTree(evidenceData) {
    const topEvent = "Equipment Failure";
    const causes = [];
    if (evidenceData.operator_error === true) {
      causes.push({ id: "human_error", description: "Human Error", probability: 0.15 });
    }
    if (evidenceData.non_oem_parts === true) {
      causes.push({ id: "material_failure", description: "Material/Parts Failure", probability: 0.12 });
    }
    if (evidenceData.operating_within_limits === false) {
      causes.push({ id: "process_deviation", description: "Process Deviation", probability: 0.2 });
    }
    if (evidenceData.observed_problem?.toLowerCase().includes("vibration")) {
      causes.push({ id: "mechanical_failure", description: "Mechanical Component Failure", probability: 0.18 });
    }
    return {
      topEvent,
      causes,
      confidence: causes.length > 0 ? 0.8 : 0.4,
      analysisMethod: "Fault Tree Analysis"
    };
  }
  // Generate ECFA Analysis
  generateECFA(evidenceData) {
    return {
      eventType: evidenceData.event_type,
      timeline: evidenceData.event_chronology,
      immediateCauses: evidenceData.immediate_causes,
      underlyingCauses: evidenceData.underlying_causes,
      rootCauses: evidenceData.root_causes_ecfa,
      barriers: evidenceData.barriers_analysis,
      riskAssessment: evidenceData.risk_severity,
      regulatory: evidenceData.regulatory_status,
      actions: evidenceData.post_incident_actions,
      confidence: 0.85,
      analysisMethod: "Event-Causal Factor Analysis"
    };
  }
  // Generate recommendations based on analysis
  generateRecommendations(investigationType, evidenceData, analysisResults) {
    const recommendations = [];
    if (investigationType === "equipment_failure") {
      if (evidenceData.operator_error === true) {
        recommendations.push("Provide additional operator training and review procedures");
      }
      if (evidenceData.non_oem_parts === true) {
        recommendations.push("Review spare parts procurement policy and ensure OEM parts usage");
      }
      if (evidenceData.operating_within_limits === false) {
        recommendations.push("Review operating parameters and implement process controls");
      }
      if (!evidenceData.last_maintenance_date) {
        recommendations.push("Establish and follow preventive maintenance schedule");
      }
    } else if (investigationType === "safety_environmental") {
      recommendations.push("Review and strengthen safety barriers based on ECFA analysis");
      recommendations.push("Implement corrective actions to address root causes identified");
      if (evidenceData.regulatory_status === true) {
        recommendations.push("Complete regulatory reporting and follow-up actions");
      }
    }
    return recommendations;
  }
};
var investigationEngine = new InvestigationEngine();

// server/rca-analysis-engine.ts
var RCAAnalysisEngine = class {
  static generateStructuredRCA(investigation) {
    const evidenceData = investigation.evidenceData || {};
    const symptomStatement = this.buildSymptomStatement(investigation, evidenceData);
    const evidenceGathered = this.analyzeEvidence(evidenceData);
    const causesConsidered = this.analyzeCauses(evidenceData, evidenceGathered);
    const rootCauseAnalysis = this.determineRootCause(causesConsidered);
    const recommendations = this.generateRecommendations(rootCauseAnalysis, evidenceData);
    return {
      symptomStatement,
      evidenceGathered,
      causesConsidered,
      rootCause: rootCauseAnalysis.rootCause,
      contributingFactors: rootCauseAnalysis.contributing,
      ruledOutCauses: rootCauseAnalysis.ruledOut,
      conclusion: rootCauseAnalysis.conclusion,
      recommendations,
      confidence: rootCauseAnalysis.confidence
    };
  }
  static buildSymptomStatement(investigation, evidenceData) {
    const equipmentType = evidenceData.equipment_type || "equipment";
    const equipmentTag = evidenceData.equipment_tag || "unknown";
    const problem = evidenceData.observed_problem || investigation.whatHappened || "failure";
    const location = evidenceData.symptom_location || investigation.whereHappened || "";
    return `${problem.toLowerCase()} at ${equipmentType.toLowerCase()} ${equipmentTag}${location ? ` (${location.toLowerCase()})` : ""}`;
  }
  static analyzeEvidence(evidenceData) {
    const evidence = [];
    if (evidenceData.operating_mode) {
      evidence.push({
        parameter: "Operating Mode",
        value: evidenceData.operating_mode,
        classification: evidenceData.operating_mode === "Running" ? "normal" : "abnormal",
        relevance: "high"
      });
    }
    if (evidenceData.operating_within_limits !== void 0) {
      evidence.push({
        parameter: "Operating Parameters",
        value: evidenceData.operating_within_limits ? "Within limits" : "Outside limits",
        classification: evidenceData.operating_within_limits ? "normal" : "critical",
        relevance: "high"
      });
    }
    if (evidenceData.last_maintenance_date && evidenceData.last_maintenance_type) {
      const maintenanceDate = new Date(evidenceData.last_maintenance_date);
      const daysSince = Math.floor(((/* @__PURE__ */ new Date()).getTime() - maintenanceDate.getTime()) / (1e3 * 60 * 60 * 24));
      evidence.push({
        parameter: "Last Maintenance",
        value: `${evidenceData.last_maintenance_type} - ${daysSince} days ago`,
        classification: daysSince > 90 ? "abnormal" : "normal",
        relevance: "high"
      });
    }
    if (evidenceData.environmental_conditions) {
      evidence.push({
        parameter: "Environmental Conditions",
        value: evidenceData.environmental_conditions,
        classification: evidenceData.environmental_conditions === "OK" ? "normal" : "abnormal",
        relevance: "medium"
      });
    }
    if (evidenceData.material_certification) {
      evidence.push({
        parameter: "Material Certification",
        value: evidenceData.material_certification,
        classification: evidenceData.material_certification === "GOOD" ? "normal" : "abnormal",
        relevance: "high"
      });
    }
    if (evidenceData.recent_process_upsets) {
      evidence.push({
        parameter: "Recent Process Upsets",
        value: evidenceData.recent_process_upsets,
        classification: evidenceData.recent_process_upsets === "NO" ? "normal" : "critical",
        relevance: "high"
      });
    }
    if (evidenceData.alarms_triggered) {
      evidence.push({
        parameter: "Alarm History",
        value: evidenceData.alarms_triggered === "NO" ? "No alarms triggered" : "Alarms present",
        classification: evidenceData.alarms_triggered === "NO" ? "normal" : "abnormal",
        relevance: "medium"
      });
    }
    return evidence;
  }
  static analyzeCauses(evidenceData, evidence) {
    const causes = [];
    const equipmentType = evidenceData.equipment_type || "";
    const problem = evidenceData.observed_problem || "";
    const symptomLocation = evidenceData.symptom_location || "";
    if (equipmentType.toLowerCase().includes("pump") && problem.toLowerCase().includes("seal")) {
      causes.push(...this.analyzePumpSealFailure(evidenceData, evidence));
    } else if (problem.toLowerCase().includes("vibration")) {
      causes.push(...this.analyzeVibrationCauses(evidenceData, evidence));
    } else if (equipmentType.toLowerCase().includes("motor")) {
      causes.push(...this.analyzeMotorFailure(evidenceData, evidence));
    }
    if (causes.length === 0) {
      causes.push(...this.analyzeGenericEquipmentFailure(evidenceData, evidence));
    }
    return causes;
  }
  static analyzePumpSealFailure(evidenceData, evidence) {
    const causes = [];
    const installationYear = evidenceData.installation_year ? parseInt(evidenceData.installation_year) : 2020;
    const age = (/* @__PURE__ */ new Date()).getFullYear() - installationYear;
    const supportingEvidence = [];
    const contradictingEvidence = [];
    if (age > 20) supportingEvidence.push(`Equipment installed in ${installationYear} (${age} years old)`);
    if (evidenceData.material_certification !== "GOOD") supportingEvidence.push("Material certification not optimal");
    if (evidenceData.environmental_conditions === "OK") contradictingEvidence.push("Environmental conditions normal");
    if (evidenceData.recent_process_upsets === "NO") contradictingEvidence.push("No recent process upsets");
    causes.push({
      cause: "Seal material aging and hardening",
      supportingEvidence,
      contradictingEvidence,
      classification: age > 15 ? "root_cause" : "contributing",
      confidence: age > 20 ? 0.85 : 0.65,
      reasoning: `Pump seals typically have 10-15 year service life. At ${age} years, material degradation is expected.`
    });
    const lubricationSupporting = [];
    const lubricationContradicting = [];
    if (evidenceData.last_maintenance_type === "Preventive") {
      lubricationContradicting.push("Recent preventive maintenance performed");
    }
    if (evidenceData.operating_within_limits === false) {
      lubricationSupporting.push("Equipment operating outside normal parameters");
    }
    causes.push({
      cause: "Inadequate seal chamber lubrication",
      supportingEvidence: lubricationSupporting,
      contradictingEvidence: lubricationContradicting,
      classification: "contributing",
      confidence: 0.6,
      reasoning: "Seal chamber lubrication critical for seal integrity, but recent maintenance suggests this may not be primary cause."
    });
    causes.push({
      cause: "Process upset causing overpressure",
      supportingEvidence: [],
      contradictingEvidence: ["No recent process upsets", "No alarms triggered"],
      classification: "ruled_out",
      confidence: 0.15,
      reasoning: "No evidence of pressure spikes or process deviations that could damage seals."
    });
    return causes;
  }
  static analyzeVibrationCauses(evidenceData, evidence) {
    const causes = [];
    causes.push({
      cause: "Mechanical imbalance or misalignment",
      supportingEvidence: ["High vibration observed", "Rotating equipment"],
      contradictingEvidence: evidenceData.recent_changes === "NO" ? ["No recent mechanical work"] : [],
      classification: "root_cause",
      confidence: 0.75,
      reasoning: "Vibration in rotating equipment commonly indicates mechanical issues like imbalance or misalignment."
    });
    return causes;
  }
  static analyzeMotorFailure(evidenceData, evidence) {
    return [];
  }
  static analyzeGenericEquipmentFailure(evidenceData, evidence) {
    const causes = [];
    const installationYear = evidenceData.installation_year ? parseInt(evidenceData.installation_year) : 2020;
    const age = (/* @__PURE__ */ new Date()).getFullYear() - installationYear;
    causes.push({
      cause: "Age-related component degradation",
      supportingEvidence: [`Equipment age: ${age} years`],
      contradictingEvidence: [],
      classification: age > 20 ? "root_cause" : "contributing",
      confidence: age > 20 ? 0.7 : 0.45,
      reasoning: `Equipment degradation expected after ${age} years of service.`
    });
    return causes;
  }
  static determineRootCause(causes) {
    const rootCauses = causes.filter((c) => c.classification === "root_cause");
    const contributing = causes.filter((c) => c.classification === "contributing");
    const ruledOut = causes.filter((c) => c.classification === "ruled_out");
    const primaryRootCause = rootCauses.sort((a, b) => b.confidence - a.confidence)[0];
    const conclusion = `Root cause: ${primaryRootCause?.cause || "Multiple factors identified"}${contributing.length > 0 ? `; contributing factors: ${contributing.map((c) => c.cause).join(", ")}` : ""}.`;
    return {
      rootCause: primaryRootCause?.cause || "Equipment failure due to multiple factors",
      contributing: contributing.map((c) => c.cause),
      ruledOut: ruledOut.map((c) => c.cause),
      conclusion,
      confidence: primaryRootCause?.confidence || 0.7
    };
  }
  static generateRecommendations(rootCauseAnalysis, evidenceData) {
    const recommendations = [];
    if (rootCauseAnalysis.rootCause.toLowerCase().includes("seal")) {
      recommendations.push({
        action: "Replace pump seals with upgraded material specification",
        priority: "high",
        timeframe: "Next maintenance window (within 30 days)",
        rationale: "Address root cause of seal material degradation"
      });
      recommendations.push({
        action: "Implement seal chamber lubrication monitoring program",
        priority: "medium",
        timeframe: "60 days",
        rationale: "Prevent contributing factor of inadequate lubrication"
      });
    }
    if (rootCauseAnalysis.rootCause.toLowerCase().includes("vibration") || rootCauseAnalysis.rootCause.toLowerCase().includes("imbalance")) {
      recommendations.push({
        action: "Perform shaft alignment and dynamic balancing",
        priority: "high",
        timeframe: "Immediate (next shutdown)",
        rationale: "Correct mechanical imbalance causing vibration"
      });
    }
    recommendations.push({
      action: "Establish condition monitoring program with vibration trending",
      priority: "medium",
      timeframe: "90 days",
      rationale: "Early detection of similar failure modes"
    });
    if (evidenceData.installation_year && (/* @__PURE__ */ new Date()).getFullYear() - parseInt(evidenceData.installation_year) > 20) {
      recommendations.push({
        action: "Evaluate equipment for replacement or major overhaul",
        priority: "medium",
        timeframe: "6 months",
        rationale: "Equipment approaching end of design life"
      });
    }
    return recommendations;
  }
};

// server/routes/evidence-library.ts
import { Router } from "express";

// shared/evidence-requirements-library.ts
var EVIDENCE_REQUIREMENTS_LIBRARY = {
  "pumps_centrifugal": {
    equipmentType: "Pumps",
    iso14224Code: "PU-001",
    subtypes: ["Centrifugal", "End Suction", "Between Bearings", "Vertical Turbine"],
    requiredTrendData: [
      {
        id: "vibration_overall",
        name: "Overall Vibration",
        description: "RMS vibration velocity at pump and motor bearings",
        units: "mm/s",
        mandatory: true,
        samplingFrequency: "1 Hz continuous",
        typicalRange: "1.8-7.1 mm/s",
        alertThresholds: {
          warning: "7.1 mm/s",
          alarm: "11.2 mm/s"
        }
      },
      {
        id: "vibration_spectrum",
        name: "Vibration Spectrum Analysis",
        description: "FFT analysis showing 1X, 2X, 3X running speed and bearing frequencies",
        units: "mm/s at frequency",
        mandatory: true,
        samplingFrequency: "Weekly or on condition",
        typicalRange: "Varies by frequency"
      },
      {
        id: "discharge_pressure",
        name: "Discharge Pressure",
        description: "Pump discharge pressure trend",
        units: "bar(g)",
        mandatory: true,
        samplingFrequency: "10 seconds",
        typicalRange: "Per design specification"
      },
      {
        id: "suction_pressure",
        name: "Suction Pressure",
        description: "Pump suction pressure for NPSH calculation",
        units: "bar(g)",
        mandatory: true,
        samplingFrequency: "10 seconds",
        typicalRange: "Above vapor pressure + NPSH required"
      },
      {
        id: "flow_rate",
        name: "Flow Rate",
        description: "Actual pump flow rate",
        units: "m\xB3/h",
        mandatory: true,
        samplingFrequency: "10 seconds",
        typicalRange: "70-110% of BEP"
      },
      {
        id: "bearing_temperature",
        name: "Bearing Temperature",
        description: "Drive end and non-drive end bearing temperatures",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Ambient + 40\xB0C max",
        alertThresholds: {
          warning: "85\xB0C",
          alarm: "95\xB0C"
        }
      },
      {
        id: "motor_current",
        name: "Motor Current",
        description: "Three-phase motor current consumption",
        units: "A",
        mandatory: true,
        samplingFrequency: "10 seconds",
        typicalRange: "80-105% of FLA"
      },
      {
        id: "seal_pot_level",
        name: "Seal Pot Level",
        description: "Mechanical seal support system fluid level",
        units: "%",
        mandatory: false,
        samplingFrequency: "1 minute",
        typicalRange: "40-80%"
      }
    ],
    requiredAttachments: [
      {
        id: "vibration_analysis_report",
        name: "Vibration Analysis Report",
        description: "Detailed spectrum analysis with bearing fault frequencies",
        fileTypes: ["pdf", "xlsx", "csv"],
        mandatory: true,
        maxSizeMB: 25,
        validationCriteria: "Must include time waveform, spectrum, and trend data"
      },
      {
        id: "dcs_trend_screenshot",
        name: "DCS Trend Screenshot",
        description: "Process control system trends showing pressure, flow, temperature",
        fileTypes: ["png", "jpg", "pdf"],
        mandatory: true,
        maxSizeMB: 10,
        validationCriteria: "Must show 24-48 hours of data including failure event"
      },
      {
        id: "pump_inspection_photos",
        name: "Pump Inspection Photos",
        description: "Visual documentation of pump condition, seal, coupling, alignment",
        fileTypes: ["jpg", "png"],
        mandatory: true,
        maxSizeMB: 50,
        validationCriteria: "Clear, well-lit photos of critical components"
      },
      {
        id: "maintenance_work_order",
        name: "Maintenance Work Order",
        description: "Recent maintenance history with parts used and procedures",
        fileTypes: ["pdf", "xlsx", "docx"],
        mandatory: true,
        maxSizeMB: 15,
        validationCriteria: "Must include dates, parts list, and work performed"
      },
      {
        id: "seal_replacement_record",
        name: "Seal Replacement Record",
        description: "Documentation of seal installation with torque values and alignment",
        fileTypes: ["pdf", "xlsx"],
        mandatory: false,
        maxSizeMB: 10,
        validationCriteria: "Include part numbers, installation procedure, test results"
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "For centrifugal pump failures, specific technical details are critical for accurate diagnosis",
        prompt: "Describe the pump failure with precise technical details: What type of leak (mechanical seal, packing, casing)? Vibration amplitude and frequency? Temperature readings? Flow and pressure values? Include timeline of symptom development.",
        examples: [
          "Mechanical seal leaking 2 L/min clear water, overall vibration 8.5 mm/s (normal 2.1), DE bearing temperature 85\xB0C (normal 65\xB0C), grinding noise from bearing area, started gradually over 3 hours",
          "Pump cavitation noise, suction pressure dropped to 0.8 bar (normal 1.2), discharge pressure fluctuating \xB10.5 bar, flow reduced from 180 to 140 m\xB3/h"
        ],
        validation: "Response must include quantified measurements, not just descriptions",
        followUpQuestions: [
          "What was the exact leak rate and fluid appearance?",
          "What were the vibration readings at pump and motor bearings?",
          "Did you notice any changes in operating parameters before the failure?"
        ]
      },
      {
        fieldType: "maintenance_history",
        context: "Recent maintenance work often contributes to pump failures",
        prompt: "Document all maintenance performed in the last 6 months. Include: parts replaced (OEM vs aftermarket), who performed the work, installation procedures followed, torque specifications used, post-work testing, any deviations from standard procedures.",
        examples: [
          'Mechanical seal replaced 2025-07-15 by ABC Contractors, OEM Flowserve Type 28 seal PN 123456, installed per API 682 procedure, torque 25 Nm per specification, post-installation alignment verified 0.002" TIR, test run 4 hours at design flow 180 m\xB3/h with no leakage',
          "Bearing replacement 2025-06-20, OEM SKF 6309 bearings, proper heating to 80\xB0C, shaft clearance verified, grease quantity per manual, vibration baseline established"
        ],
        validation: "Must include specific dates, part numbers, procedures, and verification steps",
        followUpQuestions: [
          "Were OEM parts used or aftermarket equivalents?",
          "Was the installation procedure documented and followed?",
          "What post-installation testing was performed?"
        ]
      },
      {
        fieldType: "operating_conditions",
        context: "Operating parameters at time of failure reveal root causes",
        prompt: "Provide actual operating conditions during failure: suction pressure, discharge pressure, flow rate, fluid temperature, NPSH available vs required, system resistance curve position, any process upsets or changes.",
        examples: [
          "Flow 165 m\xB3/h (design 180), suction pressure 1.1 bar (design 1.5), discharge 8.2 bar (design 8.5), fluid temperature 68\xB0C (design 65\xB0C), NPSH available 3.2m (required 2.8m)",
          "Operating at minimum flow 120 m\xB3/h due to process demand, recirculation valve 40% open, fluid temperature stable 65\xB0C, no recent process changes"
        ],
        validation: "Must include actual numerical values and comparison to design conditions"
      }
    ],
    failureModes: [
      {
        id: "mechanical_seal_failure",
        name: "Mechanical Seal Failure",
        description: "Failure of primary or secondary seal elements",
        typicalSymptoms: ["Visible leakage", "Seal chamber pressure loss", "High seal face temperature", "Abnormal noise"],
        criticalEvidence: ["seal_inspection_photos", "operating_conditions", "maintenance_work_order"],
        diagnosticQuestions: [
          "Was the seal recently replaced or maintained?",
          "What is the condition of the seal faces and O-rings?",
          "Are there signs of dry running or contamination?",
          "Was proper installation procedure followed?"
        ],
        commonCauses: ["Dry running", "Contamination", "Improper installation", "Process upset", "Thermal shock"]
      },
      {
        id: "bearing_failure",
        name: "Bearing Failure",
        description: "Rolling element or journal bearing degradation",
        typicalSymptoms: ["High vibration", "Temperature increase", "Unusual noise", "Metal particles in lubricant"],
        criticalEvidence: ["vibration_analysis_report", "bearing_temperature", "pump_inspection_photos"],
        diagnosticQuestions: [
          "What are the vibration levels and frequencies?",
          "Are bearing temperatures elevated?",
          "Is there evidence of lubrication issues?",
          "When was the last alignment check?"
        ],
        commonCauses: ["Misalignment", "Lubrication failure", "Contamination", "Fatigue", "Improper installation"]
      },
      {
        id: "cavitation",
        name: "Cavitation",
        description: "Formation and collapse of vapor bubbles due to insufficient NPSH",
        typicalSymptoms: ["Crackling noise", "Vibration", "Performance loss", "Impeller erosion"],
        criticalEvidence: ["suction_pressure", "flow_rate", "pump_inspection_photos"],
        diagnosticQuestions: [
          "What is the NPSH available vs required?",
          "Is there evidence of impeller erosion?",
          "Have suction conditions changed?",
          "Are there signs of vapor formation?"
        ],
        commonCauses: ["Insufficient NPSH", "Suction line restrictions", "High fluid temperature", "System design issues"]
      }
    ],
    smartSuggestions: [
      {
        condition: "vibration_high AND seal_leak",
        suggestion: "High vibration combined with seal leakage typically indicates misalignment or bearing wear causing shaft deflection. Check alignment measurements and bearing condition immediately.",
        additionalEvidence: ["alignment_data", "bearing_condition_assessment"]
      },
      {
        condition: "recent_maintenance AND current_failure",
        suggestion: "Failure shortly after maintenance suggests installation issues. Verify procedures were followed, correct parts used, and proper torque applied.",
        additionalEvidence: ["installation_procedure_checklist", "part_verification_photos"]
      },
      {
        condition: "pressure_drop AND performance_loss",
        suggestion: "Pressure drop with performance loss indicates internal wear or blockage. Inspect impeller for erosion, corrosion, or foreign object damage.",
        additionalEvidence: ["impeller_inspection_photos", "internal_clearance_measurements"]
      }
    ],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin",
    notes: "Based on API 610 standards and field experience database"
  },
  "compressors_reciprocating": {
    equipmentType: "Compressors",
    iso14224Code: "CO-002",
    subtypes: ["Single Acting", "Double Acting", "Multi-stage"],
    requiredTrendData: [
      {
        id: "suction_pressure",
        name: "Suction Pressure",
        description: "Compressor inlet pressure for all stages",
        units: "bar(g)",
        mandatory: true,
        samplingFrequency: "5 seconds",
        typicalRange: "Per process design"
      },
      {
        id: "discharge_pressure",
        name: "Discharge Pressure",
        description: "Compressor outlet pressure for all stages",
        units: "bar(g)",
        mandatory: true,
        samplingFrequency: "5 seconds",
        typicalRange: "Per compression ratio"
      },
      {
        id: "cylinder_temperature",
        name: "Cylinder Temperature",
        description: "Individual cylinder head temperatures",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "30 seconds",
        typicalRange: "Discharge temp < 180\xB0C",
        alertThresholds: {
          warning: "150\xB0C",
          alarm: "175\xB0C"
        }
      },
      {
        id: "vibration_overall",
        name: "Overall Vibration",
        description: "Compressor frame vibration",
        units: "mm/s",
        mandatory: true,
        samplingFrequency: "1 Hz continuous",
        typicalRange: "4.5-11.2 mm/s"
      }
    ],
    requiredAttachments: [
      {
        id: "pressure_trends",
        name: "Pressure Trend Charts",
        description: "Suction and discharge pressure trends showing pulsations and valve behavior",
        fileTypes: ["csv", "xlsx", "png"],
        mandatory: true,
        maxSizeMB: 20
      },
      {
        id: "trip_log",
        name: "Compressor Trip Log",
        description: "Control system trip and alarm history",
        fileTypes: ["pdf", "csv", "xlsx"],
        mandatory: true,
        maxSizeMB: 15
      },
      {
        id: "valve_inspection",
        name: "Valve Inspection Report",
        description: "Condition assessment of suction and discharge valves",
        fileTypes: ["pdf", "jpg", "png"],
        mandatory: true,
        maxSizeMB: 30
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Reciprocating compressor failures often relate to valve condition and capacity loss",
        prompt: "Describe compressor symptoms with specific measurements: capacity loss percentage, temperature readings by cylinder, pressure fluctuations, vibration levels, unusual noises. Include timeline of performance degradation.",
        examples: [
          "Capacity loss 25% from design, cylinder #2 temperature 165\xB0C (others 135\xB0C), suction pressure pulsations \xB10.3 bar, discharge valve noise audible, started over 2 weeks",
          "High vibration 15 mm/s (normal 6), temperature spike cylinder #1 to 180\xB0C, pressure ratio dropped from 3.2 to 2.8, metallic noise from valve area"
        ],
        validation: "Must include quantified performance loss and temperature differentials"
      }
    ],
    failureModes: [
      {
        id: "valve_failure",
        name: "Compressor Valve Failure",
        description: "Failure of suction or discharge valve plates, springs, or seats",
        typicalSymptoms: ["Capacity loss", "Temperature rise", "Pressure fluctuation", "Unusual noise"],
        criticalEvidence: ["pressure_trends", "cylinder_temperature", "valve_inspection"],
        diagnosticQuestions: [
          "Which cylinders show elevated temperatures?",
          "Are pressure pulsations excessive?",
          "What is the extent of capacity loss?",
          "When were valves last serviced?"
        ],
        commonCauses: ["Valve plate fatigue", "Spring failure", "Contamination", "Thermal stress", "Inadequate maintenance"]
      }
    ],
    smartSuggestions: [
      {
        condition: "temperature_spike AND capacity_loss",
        suggestion: "Temperature spike with capacity loss indicates valve leakage. Check valve condition and seating for affected cylinder.",
        additionalEvidence: ["valve_disassembly_photos", "seat_condition_assessment"]
      }
    ],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  "turbines_gas": {
    equipmentType: "Turbines",
    iso14224Code: "TU-003",
    subtypes: ["Gas", "Steam"],
    requiredTrendData: [
      {
        id: "rotor_vibration",
        name: "Rotor Vibration",
        description: "Rotor vibration in axial and radial directions",
        units: "mm/s",
        mandatory: true,
        samplingFrequency: "1 Hz continuous",
        typicalRange: "2.8-7.1 mm/s"
      },
      {
        id: "bearing_temperature",
        name: "Bearing Temperature",
        description: "Journal and thrust bearing temperatures",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Ambient + 50\xB0C max"
      },
      {
        id: "exhaust_temperature",
        name: "Exhaust Temperature",
        description: "Turbine exhaust gas temperature",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "10 seconds",
        typicalRange: "Per design specification"
      }
    ],
    requiredAttachments: [
      {
        id: "vibration_charts",
        name: "Vibration Charts",
        description: "Vibration trend plots and spectrum analysis",
        fileTypes: ["csv", "xlsx", "png"],
        mandatory: true,
        maxSizeMB: 25
      },
      {
        id: "oil_analysis",
        name: "Oil Analysis Report",
        description: "Lube oil condition and contamination analysis",
        fileTypes: ["pdf", "csv"],
        mandatory: true,
        maxSizeMB: 10
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Gas turbine failures often relate to vibration, bearing issues, or hot gas path problems",
        prompt: "Describe turbine symptoms with measurements: vibration levels, bearing temperatures, exhaust temps, speed/load variations. Include timeline and any trips.",
        examples: [
          "Rotor vibration increased to 12 mm/s (normal 4), bearing #2 temp 95\xB0C (others 70\xB0C), exhaust temp fluctuating \xB115\xB0C, started 3 days ago",
          "High vibration at 1X running speed 8 mm/s, oil pressure drop to 2.1 bar, trip on bearing temperature alarm"
        ],
        validation: "Must include vibration measurements and temperature readings"
      }
    ],
    failureModes: [
      {
        id: "bearing_failure",
        name: "Bearing Failure",
        description: "Journal or thrust bearing deterioration",
        typicalSymptoms: ["High vibration", "Temperature rise", "Oil pressure drop"],
        criticalEvidence: ["vibration_charts", "bearing_temperature", "oil_analysis"],
        diagnosticQuestions: [
          "Which bearing shows elevated temperature?",
          "Is vibration at 1X or 2X running speed?",
          "What does oil analysis show?"
        ],
        commonCauses: ["Oil contamination", "Misalignment", "Bearing wear", "Insufficient lubrication"]
      }
    ],
    smartSuggestions: [
      {
        condition: "vibration_high AND bearing_temp_high",
        suggestion: "High vibration with bearing temperature indicates bearing distress. Check oil condition and alignment.",
        additionalEvidence: ["oil_sample_recent", "alignment_check_data"]
      }
    ],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  "motors_electric": {
    equipmentType: "Electric Motors",
    iso14224Code: "MO-004",
    subtypes: ["Squirrel Cage", "Slip Ring", "DC"],
    requiredTrendData: [
      {
        id: "motor_current",
        name: "Motor Current",
        description: "Three-phase motor current consumption",
        units: "A",
        mandatory: true,
        samplingFrequency: "10 seconds",
        typicalRange: "80-105% of FLA"
      },
      {
        id: "stator_temperature",
        name: "Stator Temperature",
        description: "Motor stator winding temperature",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Class F: <155\xB0C"
      },
      {
        id: "vibration_overall",
        name: "Overall Vibration",
        description: "Motor vibration at drive and non-drive ends",
        units: "mm/s",
        mandatory: true,
        samplingFrequency: "1 Hz continuous",
        typicalRange: "1.8-4.5 mm/s"
      }
    ],
    requiredAttachments: [
      {
        id: "insulation_resistance",
        name: "Insulation Resistance Test",
        description: "Megger test results for winding insulation",
        fileTypes: ["pdf", "csv"],
        mandatory: true,
        maxSizeMB: 5
      },
      {
        id: "current_signature",
        name: "Motor Current Signature Analysis",
        description: "MCSA for rotor bar and bearing condition",
        fileTypes: ["csv", "png"],
        mandatory: false,
        maxSizeMB: 15
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Electric motor failures typically involve current imbalance, overheating, or vibration",
        prompt: "Describe motor symptoms with specific data: current readings per phase, temperatures, vibration levels, any trips or overloads. Include operational timeline.",
        examples: [
          "Phase A current 52A, B=48A, C=55A (imbalance 7%), stator temp 165\xB0C, vibration 6 mm/s, tripped on overload twice",
          "Motor current increased 15% above normal, bearing vibration 8 mm/s, temperature rise 25\xB0C above baseline"
        ],
        validation: "Must include current readings and temperature measurements"
      }
    ],
    failureModes: [
      {
        id: "bearing_failure",
        name: "Motor Bearing Failure",
        description: "Rolling element bearing deterioration",
        typicalSymptoms: ["High vibration", "Noise", "Temperature rise"],
        criticalEvidence: ["vibration_overall", "current_signature"],
        diagnosticQuestions: [
          "Is vibration at bearing frequencies?",
          "Any bearing noise audible?",
          "Current signature shows bearing defects?"
        ],
        commonCauses: ["Bearing wear", "Lubrication failure", "Contamination", "Misalignment"]
      }
    ],
    smartSuggestions: [
      {
        condition: "current_imbalance AND temperature_high",
        suggestion: "Current imbalance with high temperature suggests winding problems. Check insulation resistance.",
        additionalEvidence: ["winding_resistance_test", "thermal_imaging"]
      }
    ],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  "heat_exchangers_shell_tube": {
    equipmentType: "Heat Exchangers",
    iso14224Code: "HE-005",
    subtypes: ["Shell & Tube", "Plate", "Air Cooler"],
    requiredTrendData: [
      {
        id: "inlet_temperature",
        name: "Inlet Temperature",
        description: "Hot and cold side inlet temperatures",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Per process design"
      },
      {
        id: "outlet_temperature",
        name: "Outlet Temperature",
        description: "Hot and cold side outlet temperatures",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Per process design"
      },
      {
        id: "pressure_drop",
        name: "Pressure Drop",
        description: "Differential pressure across shell and tube sides",
        units: "bar",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Clean condition + 20%"
      }
    ],
    requiredAttachments: [
      {
        id: "temperature_trends",
        name: "Temperature Trend Charts",
        description: "Inlet/outlet temperature trends showing heat transfer performance",
        fileTypes: ["csv", "xlsx", "png"],
        mandatory: true,
        maxSizeMB: 20
      },
      {
        id: "inspection_photos",
        name: "Internal Inspection Photos",
        description: "Photos of tube condition, fouling, or corrosion",
        fileTypes: ["jpg", "png"],
        mandatory: true,
        maxSizeMB: 50
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Heat exchanger problems typically involve fouling, tube leaks, or thermal performance degradation",
        prompt: "Describe heat exchanger symptoms: temperature differences, pressure drops, flow rates, any tube leaks or fouling evidence. Include performance compared to baseline.",
        examples: [
          "Outlet temp dropped 15\xB0C from design, pressure drop increased 0.8 bar, flow reduced 10%, brown deposits visible",
          "Tube leak detected, cross-contamination between process streams, pressure test failed at 12 bar"
        ],
        validation: "Must include temperature and pressure drop measurements"
      }
    ],
    failureModes: [
      {
        id: "fouling",
        name: "Heat Exchanger Fouling",
        description: "Accumulation of deposits reducing heat transfer",
        typicalSymptoms: ["Poor heat transfer", "High pressure drop", "Temperature deviation"],
        criticalEvidence: ["temperature_trends", "pressure_drop", "inspection_photos"],
        diagnosticQuestions: [
          "What type of fouling is observed?",
          "How much has pressure drop increased?",
          "When was last cleaning performed?"
        ],
        commonCauses: ["Process contamination", "Corrosion products", "Scaling", "Biological growth"]
      }
    ],
    smartSuggestions: [
      {
        condition: "pressure_drop_high AND temperature_low",
        suggestion: "High pressure drop with poor heat transfer indicates fouling. Inspect tubes and consider cleaning.",
        additionalEvidence: ["fouling_analysis", "cleaning_effectiveness_data"]
      }
    ],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  "valves_control": {
    equipmentType: "Valves",
    iso14224Code: "VA-006",
    subtypes: ["Gate", "Globe", "Ball", "Control", "Safety Relief"],
    requiredTrendData: [
      {
        id: "stem_position",
        name: "Valve Stem Position",
        description: "Actual valve position feedback",
        units: "%",
        mandatory: true,
        samplingFrequency: "1 second",
        typicalRange: "0-100% per command"
      },
      {
        id: "upstream_pressure",
        name: "Upstream Pressure",
        description: "Pressure before valve",
        units: "bar(g)",
        mandatory: true,
        samplingFrequency: "10 seconds",
        typicalRange: "Per process design"
      },
      {
        id: "downstream_pressure",
        name: "Downstream Pressure",
        description: "Pressure after valve",
        units: "bar(g)",
        mandatory: true,
        samplingFrequency: "10 seconds",
        typicalRange: "Per process design"
      }
    ],
    requiredAttachments: [
      {
        id: "position_trends",
        name: "Position Trend Charts",
        description: "Valve position vs setpoint showing response and stiction",
        fileTypes: ["csv", "xlsx", "png"],
        mandatory: true,
        maxSizeMB: 15
      },
      {
        id: "stroke_test",
        name: "Valve Stroke Test Report",
        description: "Full stroke test results and travel times",
        fileTypes: ["pdf", "csv"],
        mandatory: true,
        maxSizeMB: 10
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Control valve problems typically involve stiction, leakage, or poor response",
        prompt: "Describe valve symptoms: position deviation, response time, pressure drops, any leakage or sticking. Include control loop performance impact.",
        examples: [
          "Valve sticking at 45% position, oscillation \xB15%, response time increased to 8 seconds, process upset",
          "Internal leakage observed, position shows 0% but flow continues, pressure drop across seat"
        ],
        validation: "Must include position data and response characteristics"
      }
    ],
    failureModes: [
      {
        id: "actuator_failure",
        name: "Valve Actuator Failure",
        description: "Pneumatic or electric actuator malfunction",
        typicalSymptoms: ["Poor response", "Position deviation", "Stiction"],
        criticalEvidence: ["position_trends", "stroke_test"],
        diagnosticQuestions: [
          "Is actuator air supply adequate?",
          "Any position feedback errors?",
          "When was last calibration?"
        ],
        commonCauses: ["Air supply issues", "Positioner drift", "Actuator wear", "Contamination"]
      }
    ],
    smartSuggestions: [
      {
        condition: "position_deviation AND response_slow",
        suggestion: "Position deviation with slow response indicates actuator problems. Check air supply and calibration.",
        additionalEvidence: ["air_supply_pressure", "positioner_calibration"]
      }
    ],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  "generators_synchronous": {
    equipmentType: "Generators",
    iso14224Code: "GE-007",
    subtypes: ["Synchronous", "Induction"],
    requiredTrendData: [
      {
        id: "output_voltage",
        name: "Output Voltage",
        description: "Generator terminal voltage",
        units: "V",
        mandatory: true,
        samplingFrequency: "1 second",
        typicalRange: "\xB15% of rated"
      },
      {
        id: "output_current",
        name: "Output Current",
        description: "Three-phase generator current",
        units: "A",
        mandatory: true,
        samplingFrequency: "1 second",
        typicalRange: "0-100% of rated"
      },
      {
        id: "frequency",
        name: "Frequency",
        description: "Generator output frequency",
        units: "Hz",
        mandatory: true,
        samplingFrequency: "1 second",
        typicalRange: "\xB10.5% of rated"
      }
    ],
    requiredAttachments: [
      {
        id: "trend_chart",
        name: "Generator Output Trends",
        description: "Voltage, current, and frequency trend charts",
        fileTypes: ["csv", "xlsx", "png"],
        mandatory: true,
        maxSizeMB: 25
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Generator failures often involve voltage regulation, frequency control, or excitation system issues",
        prompt: "Describe generator symptoms: voltage/frequency deviations, current imbalance, any trips or load rejections. Include excitation system status.",
        examples: [
          "Voltage regulation poor \xB18% variation, frequency drift to 49.2 Hz under load, exciter current 15% above normal",
          "Generator trip on undervoltage, unable to maintain 11kV output, excitation system fault alarm"
        ],
        validation: "Must include voltage, current, and frequency measurements"
      }
    ],
    failureModes: [
      {
        id: "excitation_failure",
        name: "Excitation System Failure",
        description: "AVR or exciter malfunction affecting voltage control",
        typicalSymptoms: ["Voltage instability", "Poor regulation", "Exciter trips"],
        criticalEvidence: ["trend_chart", "output_voltage"],
        diagnosticQuestions: [
          "Is AVR functioning properly?",
          "Any exciter system alarms?",
          "Voltage regulation within limits?"
        ],
        commonCauses: ["AVR failure", "Exciter winding fault", "Control system malfunction"]
      }
    ],
    smartSuggestions: [
      {
        condition: "voltage_unstable AND frequency_drift",
        suggestion: "Voltage instability with frequency drift indicates excitation or governor control issues.",
        additionalEvidence: ["excitation_system_status", "governor_response_test"]
      }
    ],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  "fans_centrifugal": {
    equipmentType: "Fans / Blowers",
    iso14224Code: "FN-008",
    subtypes: ["Axial", "Centrifugal"],
    requiredTrendData: [
      {
        id: "vibration_overall",
        name: "Overall Vibration",
        description: "Fan vibration levels",
        units: "mm/s",
        mandatory: true,
        samplingFrequency: "1 Hz continuous",
        typicalRange: "2.8-7.1 mm/s"
      },
      {
        id: "flow_rate",
        name: "Flow Rate",
        description: "Air flow through fan",
        units: "m\xB3/h",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Per design specification"
      },
      {
        id: "static_pressure",
        name: "Static Pressure",
        description: "Fan discharge pressure",
        units: "Pa",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Per design curve"
      }
    ],
    requiredAttachments: [
      {
        id: "vibration_chart",
        name: "Vibration Chart",
        description: "Fan vibration trend analysis",
        fileTypes: ["csv", "xlsx", "png"],
        mandatory: true,
        maxSizeMB: 20
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Fan failures typically involve imbalance, bearing issues, or aerodynamic problems",
        prompt: "Describe fan symptoms: vibration levels, flow/pressure changes, unusual noise, bearing temperatures. Include operational conditions.",
        examples: [
          "High vibration 12 mm/s at 1X speed, flow reduced 20%, unusual noise from impeller area",
          "Bearing temperature 95\xB0C (normal 65\xB0C), vibration increased gradually over 2 weeks"
        ],
        validation: "Must include vibration measurements and performance data"
      }
    ],
    failureModes: [
      {
        id: "imbalance",
        name: "Fan Imbalance",
        description: "Impeller imbalance causing vibration",
        typicalSymptoms: ["High vibration", "Bearing wear", "Noise"],
        criticalEvidence: ["vibration_chart", "vibration_overall"],
        diagnosticQuestions: [
          "Is vibration at 1X running frequency?",
          "Any recent impeller damage?",
          "When was last balancing performed?"
        ],
        commonCauses: ["Blade erosion", "Debris buildup", "Manufacturing tolerance", "Blade loss"]
      }
    ],
    smartSuggestions: [
      {
        condition: "vibration_high AND flow_reduced",
        suggestion: "High vibration with reduced flow indicates impeller problems. Check for damage or debris.",
        additionalEvidence: ["impeller_inspection_photos", "blade_condition_assessment"]
      }
    ],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  "boilers_water_tube": {
    equipmentType: "Boilers",
    iso14224Code: "BO-009",
    subtypes: ["Water Tube", "Fire Tube"],
    requiredTrendData: [
      {
        id: "drum_pressure",
        name: "Drum Pressure",
        description: "Steam drum pressure",
        units: "bar(g)",
        mandatory: true,
        samplingFrequency: "10 seconds",
        typicalRange: "Per design pressure"
      },
      {
        id: "steam_temperature",
        name: "Steam Temperature",
        description: "Superheated steam temperature",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "10 seconds",
        typicalRange: "Per design specification"
      },
      {
        id: "feedwater_level",
        name: "Feedwater Level",
        description: "Drum water level",
        units: "%",
        mandatory: true,
        samplingFrequency: "5 seconds",
        typicalRange: "40-60% normal operating"
      }
    ],
    requiredAttachments: [
      {
        id: "trend_plots",
        name: "Boiler Trend Plots",
        description: "Pressure, temperature, and level trends",
        fileTypes: ["csv", "xlsx", "png"],
        mandatory: true,
        maxSizeMB: 30
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Boiler problems involve pressure/temperature control, water level, or combustion issues",
        prompt: "Describe boiler symptoms: pressure/temperature deviations, level control issues, combustion problems, safety valve operations.",
        examples: [
          "Drum pressure fluctuating \xB12 bar, steam temp 50\xB0C below setpoint, frequent level alarms",
          "Safety valve lifted at 8.5 bar (set 8.2), pressure control unstable, feedwater pump trips"
        ],
        validation: "Must include pressure, temperature, and level data"
      }
    ],
    failureModes: [
      {
        id: "tube_failure",
        name: "Boiler Tube Failure",
        description: "Water tube leak or rupture",
        typicalSymptoms: ["Pressure loss", "Water loss", "Steam plume", "Level deviation"],
        criticalEvidence: ["trend_plots", "drum_pressure", "feedwater_level"],
        diagnosticQuestions: [
          "Location of tube failure?",
          "Rate of pressure/level loss?",
          "Any overheating indications?"
        ],
        commonCauses: ["Overheating", "Corrosion", "Erosion", "Thermal stress", "Poor water quality"]
      }
    ],
    smartSuggestions: [
      {
        condition: "pressure_loss AND level_drop",
        suggestion: "Pressure loss with level drop indicates tube leak. Locate and isolate affected section.",
        additionalEvidence: ["tube_inspection_photos", "water_chemistry_analysis"]
      }
    ],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  "transformers_power": {
    equipmentType: "Transformers",
    iso14224Code: "TR-010",
    subtypes: ["Power", "Distribution", "Instrument"],
    requiredTrendData: [
      {
        id: "oil_temperature",
        name: "Oil Temperature",
        description: "Transformer oil temperature",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Ambient + 55\xB0C max"
      },
      {
        id: "winding_temperature",
        name: "Winding Temperature",
        description: "Transformer winding temperature",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Oil temp + 23\xB0C max"
      },
      {
        id: "load_current",
        name: "Load Current",
        description: "Primary and secondary current",
        units: "A",
        mandatory: true,
        samplingFrequency: "10 seconds",
        typicalRange: "0-100% of rated"
      }
    ],
    requiredAttachments: [
      {
        id: "dga_report",
        name: "Dissolved Gas Analysis Report",
        description: "DGA results showing gas concentrations and ratios",
        fileTypes: ["pdf", "csv"],
        mandatory: true,
        maxSizeMB: 10
      },
      {
        id: "oil_test",
        name: "Oil Quality Test",
        description: "Oil dielectric strength, moisture, acidity tests",
        fileTypes: ["pdf", "csv"],
        mandatory: true,
        maxSizeMB: 10
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Transformer failures involve insulation breakdown, overheating, or oil degradation",
        prompt: "Describe transformer symptoms: temperature rises, oil condition, DGA results, any partial discharge or arcing sounds.",
        examples: [
          "Oil temp 85\xB0C (normal 65\xB0C), DGA shows H2=150ppm, C2H2=25ppm, crackling sounds observed",
          "Winding temp alarm 120\xB0C, oil level low, moisture content 35ppm (limit 20ppm)"
        ],
        validation: "Must include temperature readings and oil analysis data"
      }
    ],
    failureModes: [
      {
        id: "insulation_breakdown",
        name: "Insulation System Breakdown",
        description: "Deterioration of transformer insulation",
        typicalSymptoms: ["High temperature", "Abnormal DGA", "Partial discharge", "Oil degradation"],
        criticalEvidence: ["dga_report", "oil_test", "winding_temperature"],
        diagnosticQuestions: [
          "What gases are elevated in DGA?",
          "Is insulation resistance adequate?",
          "Any evidence of arcing or tracking?"
        ],
        commonCauses: ["Thermal aging", "Moisture ingress", "Overvoltage", "Contamination", "Design defects"]
      }
    ],
    smartSuggestions: [
      {
        condition: "temperature_high AND dga_abnormal",
        suggestion: "High temperature with abnormal DGA indicates insulation stress. Monitor closely and consider offline inspection.",
        additionalEvidence: ["insulation_resistance_test", "partial_discharge_measurement"]
      }
    ],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  "agitators_mixers": {
    equipmentType: "Agitators / Mixers",
    iso14224Code: "AG-011",
    subtypes: ["Top Entry", "Bottom Entry", "Side Entry"],
    requiredTrendData: [
      {
        id: "vibration_overall",
        name: "Overall Vibration",
        description: "Agitator vibration levels",
        units: "mm/s",
        mandatory: true,
        samplingFrequency: "1 Hz continuous",
        typicalRange: "2.8-7.1 mm/s"
      },
      {
        id: "motor_current",
        name: "Motor Current",
        description: "Drive motor current consumption",
        units: "A",
        mandatory: true,
        samplingFrequency: "10 seconds",
        typicalRange: "80-105% of FLA"
      },
      {
        id: "bearing_temperature",
        name: "Bearing Temperature",
        description: "Agitator bearing temperatures",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Ambient + 50\xB0C max"
      }
    ],
    requiredAttachments: [
      {
        id: "vibration_chart",
        name: "Vibration Chart",
        description: "Agitator vibration trend analysis",
        fileTypes: ["csv", "xlsx", "png"],
        mandatory: true,
        maxSizeMB: 20
      },
      {
        id: "maintenance_record",
        name: "Maintenance Record",
        description: "Recent maintenance and inspection history",
        fileTypes: ["pdf", "doc"],
        mandatory: true,
        maxSizeMB: 15
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Agitator problems typically involve imbalance, bearing wear, or seal failures",
        prompt: "Describe agitator symptoms: vibration levels, current changes, unusual noise, bearing temperatures, any seal leaks.",
        examples: [
          "High vibration 12 mm/s, motor current increased 15%, unusual noise from gearbox area",
          "Bearing temperature 85\xB0C (normal 60\xB0C), seal leak observed, vibration increased gradually"
        ],
        validation: "Must include vibration and current measurements"
      }
    ],
    failureModes: [
      {
        id: "bearing_failure",
        name: "Agitator Bearing Failure",
        description: "Bearing deterioration in thrust or radial bearings",
        typicalSymptoms: ["High vibration", "Temperature rise", "Noise"],
        criticalEvidence: ["vibration_chart", "bearing_temperature"],
        diagnosticQuestions: [
          "Which bearing shows elevated temperature?",
          "Is vibration at 1X or 2X frequency?",
          "When was last lubrication?"
        ],
        commonCauses: ["Lubrication failure", "Contamination", "Misalignment", "Overload"]
      }
    ],
    smartSuggestions: [
      {
        condition: "vibration_high AND current_high",
        suggestion: "High vibration with increased current indicates mechanical stress. Check alignment and bearing condition.",
        additionalEvidence: ["alignment_check", "lubrication_analysis"]
      }
    ],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  "pressure_vessels": {
    equipmentType: "Pressure Vessels",
    iso14224Code: "PV-012",
    subtypes: ["Accumulators", "Reactors", "Separators"],
    requiredTrendData: [
      {
        id: "internal_pressure",
        name: "Internal Pressure",
        description: "Vessel internal pressure",
        units: "bar(g)",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Per design pressure rating"
      },
      {
        id: "vessel_level",
        name: "Vessel Level",
        description: "Liquid level in vessel",
        units: "%",
        mandatory: true,
        samplingFrequency: "30 seconds",
        typicalRange: "20-80% normal operating"
      },
      {
        id: "shell_temperature",
        name: "Shell Temperature",
        description: "Vessel shell temperature",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Per process design"
      }
    ],
    requiredAttachments: [
      {
        id: "ut_scan",
        name: "Ultrasonic Thickness Scan",
        description: "Wall thickness measurements for corrosion assessment",
        fileTypes: ["pdf", "csv"],
        mandatory: true,
        maxSizeMB: 15
      },
      {
        id: "pressure_chart",
        name: "Pressure/Level Chart",
        description: "Pressure and level trend data",
        fileTypes: ["csv", "xlsx", "png"],
        mandatory: true,
        maxSizeMB: 25
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Pressure vessel problems involve pressure deviations, level control, or structural integrity",
        prompt: "Describe vessel symptoms: pressure variations, level control issues, any structural concerns, wall thickness changes.",
        examples: [
          "Pressure fluctuating \xB11.5 bar, level control unstable, wall thickness reduced 2mm from baseline",
          "Internal pressure drop to 85% of normal, level sensor drift, visual corrosion on shell"
        ],
        validation: "Must include pressure and wall thickness measurements"
      }
    ],
    failureModes: [
      {
        id: "corrosion_thinning",
        name: "Corrosion Wall Thinning",
        description: "Reduction in wall thickness due to corrosion",
        typicalSymptoms: ["Wall thickness reduction", "Pressure rating concern", "Visual corrosion"],
        criticalEvidence: ["ut_scan", "pressure_chart"],
        diagnosticQuestions: [
          "What is current wall thickness vs. design?",
          "Rate of corrosion progress?",
          "Process chemistry changes?"
        ],
        commonCauses: ["Corrosive environment", "Poor material selection", "Process upset", "Inadequate protection"]
      }
    ],
    smartSuggestions: [
      {
        condition: "thickness_reduced AND pressure_variation",
        suggestion: "Wall thinning with pressure variations indicates structural integrity concerns. Review pressure rating.",
        additionalEvidence: ["stress_analysis", "material_certification"]
      }
    ],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  "columns_towers": {
    equipmentType: "Columns/Towers",
    iso14224Code: "CT-013",
    subtypes: ["Distillation", "Absorber", "Stripper"],
    requiredTrendData: [
      {
        id: "column_pressure",
        name: "Column Pressure",
        description: "Operating pressure at various column heights",
        units: "bar(g)",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Per design pressure profile"
      },
      {
        id: "temperature_profile",
        name: "Temperature Profile",
        description: "Temperature at multiple column trays",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Per process simulation"
      },
      {
        id: "differential_pressure",
        name: "Differential Pressure",
        description: "Pressure drop across column sections",
        units: "mbar",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Per hydraulic design"
      }
    ],
    requiredAttachments: [
      {
        id: "trend_chart",
        name: "Process Trend Chart",
        description: "Pressure and temperature trends across column",
        fileTypes: ["csv", "xlsx", "png"],
        mandatory: true,
        maxSizeMB: 30
      },
      {
        id: "inspection_photo",
        name: "Internal Inspection Photos",
        description: "Photos of tray condition, damage, or fouling",
        fileTypes: ["jpg", "png"],
        mandatory: true,
        maxSizeMB: 50
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Column problems involve flooding, weeping, tray damage, or pressure/temperature deviations",
        prompt: "Describe column symptoms: pressure/temperature profile changes, differential pressure variations, product quality issues.",
        examples: [
          "Differential pressure increased 50%, flooding observed on tray 15, overhead purity dropped 2%",
          "Temperature inversion between trays 8-12, pressure fluctuating, weeping evident during inspection"
        ],
        validation: "Must include pressure and temperature profile data"
      }
    ],
    failureModes: [
      {
        id: "tray_damage",
        name: "Distillation Tray Damage",
        description: "Physical damage to column internals affecting separation",
        typicalSymptoms: ["Flooding", "Poor separation", "High differential pressure", "Entrainment"],
        criticalEvidence: ["trend_chart", "inspection_photo", "differential_pressure"],
        diagnosticQuestions: [
          "Which trays show abnormal performance?",
          "Evidence of mechanical damage?",
          "Process upsets recently?"
        ],
        commonCauses: ["Hydraulic upset", "Corrosion", "Erosion", "Thermal shock", "Mechanical stress"]
      }
    ],
    smartSuggestions: [
      {
        condition: "differential_pressure_high AND flooding",
        suggestion: "High differential pressure with flooding indicates tray hydraulic problems. Inspect for damage or fouling.",
        additionalEvidence: ["tray_inspection_report", "hydraulic_simulation"]
      }
    ],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  "filters_strainers": {
    equipmentType: "Filters/Strainers",
    iso14224Code: "FI-014",
    subtypes: ["Basket", "Cartridge", "Backwash"],
    requiredTrendData: [
      {
        id: "differential_pressure",
        name: "Differential Pressure",
        description: "Pressure drop across filter element",
        units: "bar",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Clean: 0.1 bar, Changeout: 1.5 bar"
      },
      {
        id: "flow_rate",
        name: "Flow Rate",
        description: "Filtrate flow rate through filter",
        units: "m\xB3/h",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Per design flow capacity"
      }
    ],
    requiredAttachments: [
      {
        id: "dp_chart",
        name: "Differential Pressure Chart",
        description: "Pressure drop trend showing filter loading",
        fileTypes: ["csv", "xlsx", "png"],
        mandatory: true,
        maxSizeMB: 20
      },
      {
        id: "inspection_photo",
        name: "Filter Element Inspection Photos",
        description: "Photos of filter condition, plugging, or damage",
        fileTypes: ["jpg", "png"],
        mandatory: true,
        maxSizeMB: 30
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Filter problems typically involve plugging, element rupture, or bypass",
        prompt: "Describe filter symptoms: differential pressure rise rate, flow reduction, element condition, any bypass evidence.",
        examples: [
          "Differential pressure increased from 0.2 to 1.8 bar over 2 days, flow reduced 25%",
          "Filter element ruptured, bypass valve opened, contamination downstream detected"
        ],
        validation: "Must include differential pressure and flow measurements"
      }
    ],
    failureModes: [
      {
        id: "filter_plugging",
        name: "Filter Element Plugging",
        description: "Excessive fouling of filter media reducing capacity",
        typicalSymptoms: ["High differential pressure", "Flow reduction", "Frequent changeouts"],
        criticalEvidence: ["dp_chart", "inspection_photo"],
        diagnosticQuestions: [
          "What contaminants are present?",
          "Filtration efficiency adequate?",
          "Upstream process changes?"
        ],
        commonCauses: ["Contamination increase", "Undersized filter", "Poor pretreatment", "Process upset"]
      }
    ],
    smartSuggestions: [
      {
        condition: "differential_pressure_high AND flow_reduced",
        suggestion: "High differential pressure with reduced flow indicates filter plugging. Inspect elements and upstream contamination.",
        additionalEvidence: ["contamination_analysis", "upstream_process_review"]
      }
    ],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  "tanks_atmospheric": {
    equipmentType: "Tanks",
    iso14224Code: "TK-015",
    subtypes: ["Atmospheric", "Pressurized"],
    requiredTrendData: [
      {
        id: "tank_level",
        name: "Tank Level",
        description: "Liquid level in tank",
        units: "%",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "10-90% normal operating"
      },
      {
        id: "tank_pressure",
        name: "Tank Pressure",
        description: "Internal tank pressure (if applicable)",
        units: "mbar(g)",
        mandatory: false,
        samplingFrequency: "1 minute",
        typicalRange: "Per design specification"
      },
      {
        id: "tank_temperature",
        name: "Tank Temperature",
        description: "Product temperature in tank",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "5 minutes",
        typicalRange: "Per product specifications"
      }
    ],
    requiredAttachments: [
      {
        id: "level_chart",
        name: "Level/Pressure Chart",
        description: "Tank level and pressure trend data",
        fileTypes: ["csv", "xlsx", "png"],
        mandatory: true,
        maxSizeMB: 25
      },
      {
        id: "inspection_photo",
        name: "Tank Inspection Photos",
        description: "Photos of tank condition, roof, shell, or foundation",
        fileTypes: ["jpg", "png"],
        mandatory: true,
        maxSizeMB: 40
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Tank problems involve level control, structural deformation, or leakage",
        prompt: "Describe tank symptoms: level control issues, structural observations, roof movement, foundation settlement, any leaks.",
        examples: [
          "Tank level fluctuating \xB15%, roof sagging observed, foundation cracks visible around perimeter",
          "Level sensor drift detected, pressure relief valve weeping, shell deformation at 3m height"
        ],
        validation: "Must include level data and visual inspection details"
      }
    ],
    failureModes: [
      {
        id: "roof_deformation",
        name: "Floating Roof Deformation",
        description: "Structural damage to floating roof affecting operation",
        typicalSymptoms: ["Roof sagging", "Tilting", "Seal leakage", "Sticking"],
        criticalEvidence: ["level_chart", "inspection_photo"],
        diagnosticQuestions: [
          "Is roof moving freely with level changes?",
          "Any visible structural damage?",
          "Seal condition adequate?"
        ],
        commonCauses: ["Structural overload", "Foundation settlement", "Corrosion", "Design inadequacy"]
      }
    ],
    smartSuggestions: [
      {
        condition: "level_anomaly AND structural_deformation",
        suggestion: "Level control issues with structural deformation indicate tank integrity concerns. Inspect foundation and shell.",
        additionalEvidence: ["foundation_survey", "shell_thickness_measurement"]
      }
    ],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  "piping_systems": {
    equipmentType: "Piping",
    iso14224Code: "PI-016",
    subtypes: ["Process", "Utility", "Steam", "Water"],
    requiredTrendData: [
      {
        id: "line_pressure",
        name: "Line Pressure",
        description: "Operating pressure in piping system",
        units: "bar(g)",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Per design pressure rating"
      },
      {
        id: "flow_rate",
        name: "Flow Rate",
        description: "Flow rate through piping",
        units: "m\xB3/h",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Per design flow capacity"
      },
      {
        id: "pipe_temperature",
        name: "Pipe Temperature",
        description: "Process temperature in piping",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Per process design"
      }
    ],
    requiredAttachments: [
      {
        id: "leak_report",
        name: "Leak Detection Report",
        description: "Leak detection sensor data or visual inspection report",
        fileTypes: ["pdf", "csv"],
        mandatory: true,
        maxSizeMB: 15
      },
      {
        id: "pressure_trend",
        name: "Pressure Trend",
        description: "Pressure and flow trend data",
        fileTypes: ["csv", "xlsx", "png"],
        mandatory: true,
        maxSizeMB: 20
      },
      {
        id: "inspection_photo",
        name: "Piping Inspection Photos",
        description: "Photos of pipe condition, supports, or damage",
        fileTypes: ["jpg", "png"],
        mandatory: true,
        maxSizeMB: 30
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Piping problems involve leaks, blockages, support failures, or thermal expansion issues",
        prompt: "Describe piping symptoms: pressure/flow variations, leaks, support condition, thermal expansion effects, vibration.",
        examples: [
          "Pressure drop 15% from normal, leak detected at flange connection, pipe support loose at bend",
          "Flow restriction observed, temperature cycling \xB125\xB0C, expansion joint failure, vibration 8 mm/s"
        ],
        validation: "Must include pressure, flow, and visual inspection data"
      }
    ],
    failureModes: [
      {
        id: "pipe_leak",
        name: "Piping System Leak",
        description: "Loss of containment through pipe wall or joints",
        typicalSymptoms: ["Pressure loss", "Visible leak", "Flow reduction", "Environmental contamination"],
        criticalEvidence: ["leak_report", "pressure_trend", "inspection_photo"],
        diagnosticQuestions: [
          "Location and size of leak?",
          "Rate of pressure/flow loss?",
          "Cause - corrosion, erosion, mechanical?"
        ],
        commonCauses: ["Corrosion", "Erosion", "Thermal stress", "Mechanical damage", "Joint failure"]
      }
    ],
    smartSuggestions: [
      {
        condition: "pressure_loss AND leak_detected",
        suggestion: "Pressure loss with detected leak requires immediate containment. Isolate section and assess damage extent.",
        additionalEvidence: ["leak_rate_assessment", "corrosion_survey"]
      }
    ],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  "switchgear_electrical": {
    equipmentType: "Switchgear",
    iso14224Code: "SW-017",
    subtypes: ["LV", "MV", "HV", "GIS"],
    requiredTrendData: [
      {
        id: "bus_voltage",
        name: "Bus Voltage",
        description: "Busbar voltage per phase",
        units: "V",
        mandatory: true,
        samplingFrequency: "10 seconds",
        typicalRange: "\xB15% of rated voltage"
      },
      {
        id: "load_current",
        name: "Load Current",
        description: "Current through breakers and feeders",
        units: "A",
        mandatory: true,
        samplingFrequency: "10 seconds",
        typicalRange: "0-80% of rated current"
      },
      {
        id: "enclosure_temperature",
        name: "Enclosure Temperature",
        description: "Internal temperature of switchgear",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "1 minute",
        typicalRange: "Ambient + 20\xB0C max"
      }
    ],
    requiredAttachments: [
      {
        id: "trend_chart",
        name: "Electrical Trend Chart",
        description: "Voltage, current, and temperature trends",
        fileTypes: ["csv", "xlsx", "png"],
        mandatory: true,
        maxSizeMB: 25
      },
      {
        id: "ir_scan",
        name: "Infrared Thermal Scan",
        description: "Thermal imaging of electrical connections",
        fileTypes: ["jpg", "png", "pdf"],
        mandatory: true,
        maxSizeMB: 30
      },
      {
        id: "maintenance_log",
        name: "Maintenance Log",
        description: "Recent maintenance and testing records",
        fileTypes: ["pdf", "doc"],
        mandatory: true,
        maxSizeMB: 15
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Switchgear problems involve breaker misoperations, overheating, or insulation failures",
        prompt: "Describe switchgear symptoms: breaker operations, trip events, temperature rises, any arcing or hot spots detected.",
        examples: [
          "Breaker failed to trip on overcurrent, hot spot 85\xB0C on bus connection, phase A current 120% of rated",
          "Unexpected trip of feeder breaker, insulation resistance 50M\u03A9 (normal 1000M\u03A9), moisture detected"
        ],
        validation: "Must include electrical measurements and thermal scan results"
      }
    ],
    failureModes: [
      {
        id: "breaker_malfunction",
        name: "Circuit Breaker Malfunction",
        description: "Failure of breaker to operate correctly during fault conditions",
        typicalSymptoms: ["Failed to trip", "Failed to close", "Nuisance tripping", "Arcing"],
        criticalEvidence: ["trend_chart", "ir_scan", "maintenance_log"],
        diagnosticQuestions: [
          "Type of breaker malfunction?",
          "Recent maintenance performed?",
          "Trip coil and mechanism condition?"
        ],
        commonCauses: ["Mechanism wear", "Contact deterioration", "Control circuit failure", "Contamination"]
      }
    ],
    smartSuggestions: [
      {
        condition: "temperature_high AND current_imbalance",
        suggestion: "High temperature with current imbalance indicates connection problems. Check for loose connections and hot spots.",
        additionalEvidence: ["connection_torque_check", "contact_resistance_test"]
      }
    ],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  // UPS/Rectifiers - from user comprehensive data
  ups_rectifiers: {
    equipmentType: "UPS/Rectifiers",
    iso14224Code: "UP-018",
    subtypes: ["Static", "Rotary"],
    requiredTrendData: [
      {
        id: "output_voltage",
        name: "Output Voltage",
        description: "UPS output voltage monitoring",
        units: "V",
        mandatory: true,
        samplingFrequency: "1 minute"
      },
      {
        id: "battery_voltage",
        name: "Battery Voltage",
        description: "Battery bank voltage monitoring",
        units: "V",
        mandatory: true,
        samplingFrequency: "1 minute"
      },
      {
        id: "ups_temperature",
        name: "Temperature",
        description: "UPS internal temperature",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "5 minutes"
      }
    ],
    requiredAttachments: [
      {
        id: "voltage_chart",
        name: "Voltage Chart",
        description: "Output and battery voltage logs, alarm history",
        fileTypes: ["csv", "xlsx"],
        mandatory: true,
        maxSizeMB: 20
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "UPS problems involve battery failures, inverter faults, or load transfer issues",
        prompt: "Upload output and battery voltage logs, alarm history. Any battery replacement or faults?",
        examples: ["Battery voltage dropped to 10.8V, backup time reduced to 5 minutes, temperature alarm at 55\xB0C"],
        validation: "Must include voltage trends and alarm data"
      }
    ],
    failureModes: [
      {
        id: "battery_failure",
        name: "UPS Battery Failure",
        description: "Battery degradation reducing backup capacity",
        typicalSymptoms: ["Low voltage", "Reduced backup time", "Temperature rise"],
        criticalEvidence: ["voltage_chart"],
        diagnosticQuestions: ["Battery age and last replacement?", "Backup duration vs design?"],
        commonCauses: ["End of life", "Overcharging", "Temperature", "Sulfation"]
      }
    ],
    smartSuggestions: [],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  // Cables/Busbars - from user comprehensive data
  cables_busbars: {
    equipmentType: "Cables/Busbars",
    iso14224Code: "CB-019",
    subtypes: ["Power", "Control"],
    requiredTrendData: [
      {
        id: "cable_current",
        name: "Current",
        description: "Cable/busbar current loading",
        units: "A",
        mandatory: true,
        samplingFrequency: "1 minute"
      },
      {
        id: "cable_temperature",
        name: "Temperature",
        description: "Cable/busbar surface temperature",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "5 minutes"
      },
      {
        id: "insulation_resistance",
        name: "Insulation Resistance",
        description: "IR test results",
        units: "M\u03A9",
        mandatory: false,
        samplingFrequency: "Monthly"
      }
    ],
    requiredAttachments: [
      {
        id: "ir_test_report",
        name: "IR Test Report",
        description: "Insulation resistance test results and current/temp logs",
        fileTypes: ["pdf", "xlsx"],
        mandatory: true,
        maxSizeMB: 10
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Cable problems involve insulation breakdown, overheating, or mechanical damage",
        prompt: "Provide current/temp logs and last insulation resistance test.",
        examples: ["IR test dropped from 5000 M\u03A9 to 500 M\u03A9, cable temperature 85\xB0C, current 80% of rating"],
        validation: "Must include IR test results and temperature data"
      }
    ],
    failureModes: [
      {
        id: "insulation_failure",
        name: "Cable Insulation Failure",
        description: "Degradation of cable insulation leading to faults",
        typicalSymptoms: ["Low IR", "High temperature", "Partial discharge"],
        criticalEvidence: ["ir_test_report"],
        diagnosticQuestions: ["IR test trend over time?", "Any moisture or contamination?"],
        commonCauses: ["Aging", "Moisture", "Overloading", "Mechanical damage"]
      }
    ],
    smartSuggestions: [],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  // Sensors/Transmitters - from user comprehensive data
  sensors_transmitters: {
    equipmentType: "Sensors/Transmitters",
    iso14224Code: "ST-020",
    subtypes: ["Temperature", "Pressure", "Flow", "Level"],
    requiredTrendData: [
      {
        id: "output_signal",
        name: "Output Signal",
        description: "Transmitter output signal (4-20mA)",
        units: "mA",
        mandatory: true,
        samplingFrequency: "1 minute"
      },
      {
        id: "input_value",
        name: "Input Value",
        description: "Measured process variable",
        units: "varies",
        mandatory: true,
        samplingFrequency: "1 minute"
      }
    ],
    requiredAttachments: [
      {
        id: "signal_chart",
        name: "Signal Chart",
        description: "Signal output trend and calibration history",
        fileTypes: ["csv", "xlsx"],
        mandatory: true,
        maxSizeMB: 15
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Sensor problems involve drift, noise, failure, or calibration issues",
        prompt: "Upload signal trend and last calibration record. Any drift or signal dropout?",
        examples: ["Output drifted from 12.5mA to 11.2mA over 3 months, calibration off by 2.5%"],
        validation: "Must include signal data and calibration information"
      }
    ],
    failureModes: [
      {
        id: "sensor_drift",
        name: "Sensor Measurement Drift",
        description: "Gradual change in sensor accuracy over time",
        typicalSymptoms: ["Signal drift", "Calibration error", "Process deviation"],
        criticalEvidence: ["signal_chart"],
        diagnosticQuestions: ["Rate and direction of drift?", "When was last calibration?"],
        commonCauses: ["Aging", "Contamination", "Temperature effects", "Vibration"]
      }
    ],
    smartSuggestions: [],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  // PLCs/DCS Systems - from user comprehensive data
  plcs_dcs: {
    equipmentType: "PLCs/DCS Systems",
    iso14224Code: "PL-021",
    subtypes: ["Redundant", "Non-redundant"],
    requiredTrendData: [
      {
        id: "power_supply_voltage",
        name: "Power Supply Voltage",
        description: "System power supply monitoring",
        units: "V",
        mandatory: true,
        samplingFrequency: "1 minute"
      },
      {
        id: "cpu_temperature",
        name: "CPU Temperature",
        description: "Controller CPU temperature",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "5 minutes"
      }
    ],
    requiredAttachments: [
      {
        id: "system_logs",
        name: "System Logs",
        description: "Fault/alarm log and I/O status history",
        fileTypes: ["csv", "txt"],
        mandatory: true,
        maxSizeMB: 20
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "PLC/DCS problems involve power issues, communication faults, or hardware failures",
        prompt: "Provide fault/alarm log and I/O status history. Any unexpected restarts or power dips?",
        examples: ["CPU fault 3 times this week, power supply voltage dropped to 21V, I/O card offline"],
        validation: "Must include system logs and power/temperature data"
      }
    ],
    failureModes: [
      {
        id: "power_supply_failure",
        name: "Power Supply Failure",
        description: "System power supply degradation or failure",
        typicalSymptoms: ["Voltage fluctuation", "System restarts", "I/O faults"],
        criticalEvidence: ["system_logs"],
        diagnosticQuestions: ["Voltage stability over time?", "Any correlation with system faults?"],
        commonCauses: ["Power supply aging", "Overloading", "Temperature", "Input voltage issues"]
      }
    ],
    smartSuggestions: [],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  // Control Valves - from user comprehensive data
  control_valves_pneumatic: {
    equipmentType: "Control Valves",
    iso14224Code: "CV-022",
    subtypes: ["Pneumatic", "Electric", "Hydraulic"],
    requiredTrendData: [
      {
        id: "stem_position_cv",
        name: "Stem Position",
        description: "Valve position feedback",
        units: "%",
        mandatory: true,
        samplingFrequency: "1 second"
      },
      {
        id: "setpoint_signal",
        name: "Setpoint Signal",
        description: "Control signal from controller",
        units: "mA",
        mandatory: true,
        samplingFrequency: "1 second"
      },
      {
        id: "travel_time",
        name: "Travel Time",
        description: "Full stroke operation time",
        units: "seconds",
        mandatory: false,
        samplingFrequency: "Weekly test"
      }
    ],
    requiredAttachments: [
      {
        id: "position_trends",
        name: "Position Trends",
        description: "Position vs setpoint, pressure trends, travel time data",
        fileTypes: ["csv", "xlsx"],
        mandatory: true,
        maxSizeMB: 20
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Control valve problems involve stiction, hunting, leakage, or calibration issues",
        prompt: "Upload position and setpoint signal trend, pressure trends, travel time data. Any stiction or calibration issue?",
        examples: ["Valve sticking at 45% position, travel time increased from 8s to 15s, hunting \xB13%"],
        validation: "Must include position data and performance characteristics"
      }
    ],
    failureModes: [
      {
        id: "valve_stiction",
        name: "Control Valve Stiction",
        description: "Friction preventing smooth valve movement",
        typicalSymptoms: ["Jerky movement", "Position lag", "Control oscillation"],
        criticalEvidence: ["position_trends"],
        diagnosticQuestions: ["Position response to signal changes?", "Any dead band or hysteresis?"],
        commonCauses: ["Packing wear", "Stem corrosion", "Actuator problems", "Valve sizing"]
      }
    ],
    smartSuggestions: [],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  // Analyzers - from user comprehensive data
  analyzers: {
    equipmentType: "Analyzers",
    iso14224Code: "AN-023",
    subtypes: ["Gas Chromatograph", "pH", "Conductivity", "Moisture"],
    requiredTrendData: [
      {
        id: "analyzer_output",
        name: "Output Signal",
        description: "Analyzer measurement output",
        units: "varies",
        mandatory: true,
        samplingFrequency: "1 minute"
      },
      {
        id: "calibration_trend",
        name: "Calibration Trend",
        description: "Calibration check results over time",
        units: "% error",
        mandatory: true,
        samplingFrequency: "Daily check"
      }
    ],
    requiredAttachments: [
      {
        id: "analyzer_charts",
        name: "Signal/Calibration Charts",
        description: "Output/calibration trends and validation records",
        fileTypes: ["csv", "xlsx"],
        mandatory: true,
        maxSizeMB: 20
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Analyzer problems involve calibration drift, contamination, or component failures",
        prompt: "Attach output/calibration trends and validation records. Any sudden shifts or error codes?",
        examples: ["GC baseline shifted 15%, retention time drift 0.2 min, detector response down 20%"],
        validation: "Must include calibration data and validation records"
      }
    ],
    failureModes: [
      {
        id: "calibration_drift",
        name: "Analyzer Calibration Drift",
        description: "Gradual change in analyzer accuracy requiring recalibration",
        typicalSymptoms: ["Reading offset", "Validation failures", "Baseline drift"],
        criticalEvidence: ["analyzer_charts"],
        diagnosticQuestions: ["Rate and direction of drift?", "Sample contamination possible?"],
        commonCauses: ["Detector aging", "Contamination", "Temperature effects", "Component wear"]
      }
    ],
    smartSuggestions: [],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  // HVAC Units - from user comprehensive data
  hvac_units: {
    equipmentType: "HVAC Units",
    iso14224Code: "HV-025",
    subtypes: ["Air Handler", "Split", "Chiller"],
    requiredTrendData: [
      {
        id: "hvac_temp",
        name: "Temperature",
        description: "Supply/return air temperature",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "1 min"
      },
      {
        id: "hvac_pressure",
        name: "Pressure",
        description: "System pressure monitoring",
        units: "kPa",
        mandatory: true,
        samplingFrequency: "1 min"
      },
      {
        id: "hvac_flow",
        name: "Flow",
        description: "Air flow rate",
        units: "m\xB3/hr",
        mandatory: true,
        samplingFrequency: "5 min"
      },
      {
        id: "hvac_current",
        name: "Current",
        description: "Motor current",
        units: "A",
        mandatory: true,
        samplingFrequency: "1 min"
      }
    ],
    requiredAttachments: [
      {
        id: "hvac_trends",
        name: "HVAC Trend Charts",
        description: "Temperature, pressure, flow and current trends",
        fileTypes: ["csv", "xlsx"],
        mandatory: true,
        maxSizeMB: 10
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "HVAC problems involve temperature control, pressure issues, or mechanical failures",
        prompt: "Upload temp, pressure and current trend. Any refrigerant leaks, trip events, or abnormal noise?",
        examples: ["Temperature control \xB15\xB0C from setpoint, compressor tripping on high pressure, refrigerant leak detected"],
        validation: "Must include temperature, pressure and current data"
      }
    ],
    failureModes: [
      {
        id: "refrigerant_leak",
        name: "Refrigerant System Leak",
        description: "Loss of refrigerant affecting cooling capacity",
        typicalSymptoms: ["Poor cooling", "Low pressure", "Ice formation"],
        criticalEvidence: ["hvac_trends"],
        diagnosticQuestions: ["Refrigerant pressure levels?", "Any visible leaks?"],
        commonCauses: ["Joint failure", "Corrosion", "Vibration", "Age deterioration"]
      }
    ],
    smartSuggestions: [],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  // Cranes/Hoists - from user comprehensive data
  cranes_hoists: {
    equipmentType: "Cranes/Hoists",
    iso14224Code: "CR-026",
    subtypes: ["Bridge", "Gantry", "Jib"],
    requiredTrendData: [
      {
        id: "crane_load",
        name: "Load",
        description: "Current load on crane",
        units: "tonnes",
        mandatory: true,
        samplingFrequency: "1 min"
      },
      {
        id: "crane_current",
        name: "Motor Current",
        description: "Hoist motor current",
        units: "A",
        mandatory: true,
        samplingFrequency: "1 min"
      },
      {
        id: "limit_switch_status",
        name: "Limit Switch Status",
        description: "Position limit switches",
        units: "boolean",
        mandatory: true,
        samplingFrequency: "1 sec"
      },
      {
        id: "brake_temp",
        name: "Brake Temperature",
        description: "Brake system temperature",
        units: "\xB0C",
        mandatory: true,
        samplingFrequency: "5 min"
      }
    ],
    requiredAttachments: [
      {
        id: "crane_charts",
        name: "Load/Current Charts",
        description: "Load and motor current trends, limit switch logs",
        fileTypes: ["csv", "xlsx"],
        mandatory: true,
        maxSizeMB: 10
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Crane problems involve load handling, brake issues, or structural problems",
        prompt: "Provide load/motor current trends, limit switch logs. Any brake overheating or trip events?",
        examples: ["Load swinging excessively, brake temperature 95\xB0C, motor current spiking to 150A"],
        validation: "Must include load data and inspection results"
      }
    ],
    failureModes: [
      {
        id: "brake_overheating",
        name: "Crane Brake Overheating",
        description: "Excessive brake temperature due to overuse or malfunction",
        typicalSymptoms: ["High brake temp", "Smoking", "Load slippage"],
        criticalEvidence: ["crane_charts"],
        diagnosticQuestions: ["Brake temperature readings?", "Frequency of use?"],
        commonCauses: ["Brake adjustment", "Overloading", "Brake wear", "Cooling issues"]
      }
    ],
    smartSuggestions: [],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  },
  // Fire Protection Systems - from user comprehensive data
  fire_protection: {
    equipmentType: "Fire Protection Systems",
    iso14224Code: "FP-027",
    subtypes: ["Deluge", "Sprinkler", "Alarm", "Hydrant"],
    requiredTrendData: [
      {
        id: "fire_pressure",
        name: "System Pressure",
        description: "Fire water system pressure",
        units: "bar",
        mandatory: true,
        samplingFrequency: "1 min"
      },
      {
        id: "fire_flow_test",
        name: "Flow Test",
        description: "Flow test results",
        units: "L/min",
        mandatory: true,
        samplingFrequency: "Monthly"
      },
      {
        id: "alarm_history",
        name: "Alarm History",
        description: "Fire alarm activation log",
        units: "count",
        mandatory: true,
        samplingFrequency: "Event"
      }
    ],
    requiredAttachments: [
      {
        id: "fire_test_records",
        name: "Test Records",
        description: "Pressure/flow test and alarm logs",
        fileTypes: ["pdf", "csv"],
        mandatory: true,
        maxSizeMB: 5
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: "observed_problem",
        context: "Fire protection problems involve pressure loss, flow issues, or system failures",
        prompt: "Upload pressure/flow test and alarm logs. Any failed activations or leaks?",
        examples: ["System pressure dropped to 5.2 bar, flow test 15% below spec, pump failed to start on demand"],
        validation: "Must include pressure and flow test data"
      }
    ],
    failureModes: [
      {
        id: "fire_pump_failure",
        name: "Fire Pump Failure",
        description: "Fire pump unable to maintain required pressure/flow",
        typicalSymptoms: ["Low pressure", "Pump trips", "Flow deficiency"],
        criticalEvidence: ["fire_test_records"],
        diagnosticQuestions: ["Pump performance vs spec?", "Any trips or alarms?"],
        commonCauses: ["Pump wear", "Motor failure", "Suction problems", "Control issues"]
      }
    ],
    smartSuggestions: [],
    lastUpdated: "2025-01-20",
    updatedBy: "RCA System Admin"
  }
};
var EvidenceLibraryManager = class {
  updateLog = [];
  addEquipmentProfile(profile) {
    EVIDENCE_REQUIREMENTS_LIBRARY[profile.equipmentType.toLowerCase().replace(" ", "_")] = profile;
    this.logUpdate("ADD", profile.equipmentType, "equipment_profile", void 0, profile, profile.updatedBy, "New equipment type added");
  }
  updateTrendRequirement(equipmentType, trendId, updates, updatedBy) {
    const profile = EVIDENCE_REQUIREMENTS_LIBRARY[equipmentType];
    if (!profile) throw new Error(`Equipment type ${equipmentType} not found`);
    const trendIndex = profile.requiredTrendData.findIndex((t) => t.id === trendId);
    if (trendIndex === -1) throw new Error(`Trend ${trendId} not found`);
    const oldValue = { ...profile.requiredTrendData[trendIndex] };
    profile.requiredTrendData[trendIndex] = { ...profile.requiredTrendData[trendIndex], ...updates };
    profile.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    profile.updatedBy = updatedBy;
    this.logUpdate("MODIFY", equipmentType, `trend_${trendId}`, oldValue, profile.requiredTrendData[trendIndex], updatedBy, "Trend requirement updated");
  }
  addAIPromptTemplate(equipmentType, template, updatedBy) {
    const profile = EVIDENCE_REQUIREMENTS_LIBRARY[equipmentType];
    if (!profile) throw new Error(`Equipment type ${equipmentType} not found`);
    profile.aiPromptTemplates.push(template);
    profile.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    profile.updatedBy = updatedBy;
    this.logUpdate("ADD", equipmentType, `ai_prompt_${template.fieldType}`, void 0, template, updatedBy, "New AI prompt template added");
  }
  exportLibrary() {
    return JSON.stringify({
      library: EVIDENCE_REQUIREMENTS_LIBRARY,
      updateLog: this.updateLog,
      exportDate: (/* @__PURE__ */ new Date()).toISOString()
    }, null, 2);
  }
  importLibrary(jsonData, updatedBy) {
    const data = JSON.parse(jsonData);
    Object.assign(EVIDENCE_REQUIREMENTS_LIBRARY, data.library);
    if (data.updateLog) {
      this.updateLog.push(...data.updateLog);
    }
    this.logUpdate("MODIFY", "SYSTEM", "library_import", void 0, "Library imported", updatedBy, "Library data imported from backup");
  }
  logUpdate(changeType, equipmentType, fieldChanged, oldValue, newValue, updatedBy, reason) {
    this.updateLog.push({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      equipmentType,
      changeType,
      fieldChanged,
      oldValue,
      newValue,
      updatedBy,
      reason
    });
  }
  getUpdateHistory(equipmentType) {
    if (equipmentType) {
      return this.updateLog.filter((log2) => log2.equipmentType === equipmentType);
    }
    return [...this.updateLog];
  }
};
function getEquipmentProfile(equipmentType) {
  const key = equipmentType.toLowerCase().replace(" ", "_");
  return EVIDENCE_REQUIREMENTS_LIBRARY[key] || null;
}
function getRequiredTrendsForEquipment(equipmentType) {
  const profile = getEquipmentProfile(equipmentType);
  return profile ? profile.requiredTrendData.filter((t) => t.mandatory) : [];
}
function getRequiredAttachmentsForEquipment(equipmentType) {
  const profile = getEquipmentProfile(equipmentType);
  return profile ? profile.requiredAttachments.filter((a) => a.mandatory) : [];
}
function getAIPromptsForField(equipmentType, fieldType) {
  const profile = getEquipmentProfile(equipmentType);
  if (!profile) return null;
  return profile.aiPromptTemplates.find((template) => template.fieldType === fieldType) || null;
}
function identifyLikelyFailureMode(equipmentType, symptoms) {
  const profile = getEquipmentProfile(equipmentType);
  if (!profile) return null;
  let bestMatch = null;
  let maxMatches = 0;
  for (const failureMode of profile.failureModes) {
    const matches = failureMode.typicalSymptoms.filter(
      (symptom) => symptoms.some((userSymptom) => userSymptom.toLowerCase().includes(symptom.toLowerCase()))
    ).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = failureMode;
    }
  }
  return bestMatch;
}
var libraryManager = new EvidenceLibraryManager();

// server/routes/evidence-library.ts
var router = Router();
router.get("/equipment-types", (req, res) => {
  try {
    const equipmentTypes = Object.values(EVIDENCE_REQUIREMENTS_LIBRARY).map((profile) => ({
      equipmentType: profile.equipmentType,
      iso14224Code: profile.iso14224Code,
      subtypes: profile.subtypes,
      lastUpdated: profile.lastUpdated,
      updatedBy: profile.updatedBy
    }));
    equipmentTypes.sort((a, b) => a.equipmentType.localeCompare(b.equipmentType));
    console.log(`Found ${equipmentTypes.length} equipment types in library`);
    res.json({
      success: true,
      equipmentTypes,
      totalCount: equipmentTypes.length
    });
  } catch (error) {
    console.error("Error retrieving equipment types:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve equipment types",
      details: error.message
    });
  }
});
router.get("/equipment/:equipmentType", (req, res) => {
  try {
    const { equipmentType } = req.params;
    const profile = getEquipmentProfile(equipmentType);
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: `Equipment type '${equipmentType}' not found in library`
      });
    }
    res.json({
      success: true,
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve equipment profile",
      details: error.message
    });
  }
});
router.get("/equipment/:equipmentType/requirements", (req, res) => {
  try {
    const { equipmentType } = req.params;
    const { symptoms } = req.query;
    const requiredTrends = getRequiredTrendsForEquipment(equipmentType);
    const requiredAttachments = getRequiredAttachmentsForEquipment(equipmentType);
    let likelyFailureMode = null;
    if (symptoms) {
      const symptomsList = symptoms.split(",").map((s) => s.trim());
      likelyFailureMode = identifyLikelyFailureMode(equipmentType, symptomsList);
    }
    res.json({
      success: true,
      equipmentType,
      requiredTrends,
      requiredAttachments,
      likelyFailureMode,
      totalRequiredFields: requiredTrends.length + requiredAttachments.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve evidence requirements",
      details: error.message
    });
  }
});
router.get("/equipment/:equipmentType/prompts/:fieldType", (req, res) => {
  try {
    const { equipmentType, fieldType } = req.params;
    const prompt = getAIPromptsForField(equipmentType, fieldType);
    if (!prompt) {
      return res.status(404).json({
        success: false,
        error: `No AI prompt template found for ${equipmentType} - ${fieldType}`
      });
    }
    res.json({
      success: true,
      prompt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve AI prompt",
      details: error.message
    });
  }
});
var requireAdmin = (req, res, next) => {
  const isAdmin = req.headers["x-admin-key"] === "admin123" || req.user?.role === "admin";
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: "Administrative access required"
    });
  }
  next();
};
router.post("/admin/equipment", requireAdmin, (req, res) => {
  try {
    const { profile, updatedBy } = req.body;
    if (!profile || !updatedBy) {
      return res.status(400).json({
        success: false,
        error: "Profile data and updatedBy field are required"
      });
    }
    profile.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    profile.updatedBy = updatedBy;
    libraryManager.addEquipmentProfile(profile);
    res.json({
      success: true,
      message: `Equipment profile for ${profile.equipmentType} added successfully`,
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to add equipment profile",
      details: error.message
    });
  }
});
router.patch("/admin/equipment/:equipmentType/trends/:trendId", requireAdmin, (req, res) => {
  try {
    const { equipmentType, trendId } = req.params;
    const { updates, updatedBy } = req.body;
    if (!updates || !updatedBy) {
      return res.status(400).json({
        success: false,
        error: "Updates and updatedBy field are required"
      });
    }
    libraryManager.updateTrendRequirement(equipmentType, trendId, updates, updatedBy);
    res.json({
      success: true,
      message: `Trend requirement ${trendId} updated for ${equipmentType}`,
      equipmentType,
      trendId,
      updates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to update trend requirement",
      details: error.message
    });
  }
});
router.post("/admin/equipment/:equipmentType/prompts", requireAdmin, (req, res) => {
  try {
    const { equipmentType } = req.params;
    const { template, updatedBy } = req.body;
    if (!template || !updatedBy) {
      return res.status(400).json({
        success: false,
        error: "Template data and updatedBy field are required"
      });
    }
    libraryManager.addAIPromptTemplate(equipmentType, template, updatedBy);
    res.json({
      success: true,
      message: `AI prompt template added for ${equipmentType} - ${template.fieldType}`,
      equipmentType,
      template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to add AI prompt template",
      details: error.message
    });
  }
});
router.get("/admin/export", requireAdmin, (req, res) => {
  try {
    const exportData = libraryManager.exportLibrary();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="evidence-library-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json"`);
    res.send(exportData);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to export library",
      details: error.message
    });
  }
});
router.post("/admin/import", requireAdmin, (req, res) => {
  try {
    const { libraryData, updatedBy } = req.body;
    if (!libraryData || !updatedBy) {
      return res.status(400).json({
        success: false,
        error: "Library data and updatedBy field are required"
      });
    }
    libraryManager.importLibrary(libraryData, updatedBy);
    res.json({
      success: true,
      message: "Library imported successfully",
      importDate: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to import library",
      details: error.message
    });
  }
});
router.get("/admin/history", requireAdmin, (req, res) => {
  try {
    const { equipmentType } = req.query;
    const history = libraryManager.getUpdateHistory(equipmentType);
    res.json({
      success: true,
      history,
      totalChanges: history.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve update history",
      details: error.message
    });
  }
});
router.post("/validate-evidence", (req, res) => {
  try {
    const { equipmentType, evidenceData, symptoms } = req.body;
    if (!equipmentType || !evidenceData) {
      return res.status(400).json({
        success: false,
        error: "Equipment type and evidence data are required"
      });
    }
    const requiredTrends = getRequiredTrendsForEquipment(equipmentType);
    const requiredAttachments = getRequiredAttachmentsForEquipment(equipmentType);
    const missingTrends = requiredTrends.filter(
      (trend) => !evidenceData[trend.id] || evidenceData[trend.id] === ""
    );
    const missingAttachments = requiredAttachments.filter(
      (attachment) => !evidenceData[attachment.id] || evidenceData[attachment.id] === ""
    );
    const totalRequired = requiredTrends.length + requiredAttachments.length;
    const providedCount = totalRequired - missingTrends.length - missingAttachments.length;
    const completeness = totalRequired > 0 ? providedCount / totalRequired * 100 : 100;
    let failureMode = null;
    if (symptoms && symptoms.length > 0) {
      failureMode = identifyLikelyFailureMode(equipmentType, symptoms);
    }
    res.json({
      success: true,
      validation: {
        completeness: completeness.toFixed(1),
        isComplete: completeness >= 80,
        missingTrends,
        missingAttachments,
        totalRequired,
        providedCount,
        failureMode
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to validate evidence",
      details: error.message
    });
  }
});
var evidence_library_default = router;

// server/routes.ts
import multer from "multer";
import Papa from "papaparse";
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
  // 10MB limit
});
async function registerRoutes(app2) {
  app2.post("/api/investigations/create", async (req, res) => {
    try {
      const { whatHappened, whereHappened, whenHappened, consequence, detectedBy } = req.body;
      if (!whatHappened || !whereHappened || !whenHappened) {
        return res.status(400).json({
          message: "Missing required fields: whatHappened, whereHappened, whenHappened"
        });
      }
      const investigation = await investigationStorage.createInvestigation({
        whatHappened,
        whereHappened,
        whenHappened: new Date(whenHappened),
        consequence,
        detectedBy,
        currentStep: "investigation_type"
      });
      res.json(investigation);
    } catch (error) {
      console.error("[RCA] Error creating investigation:", error);
      res.status(500).json({ message: "Failed to create investigation" });
    }
  });
  app2.post("/api/investigations/:id/type", async (req, res) => {
    try {
      const { id } = req.params;
      const { investigationType } = req.body;
      if (!investigationType || !["safety_environmental", "equipment_failure"].includes(investigationType)) {
        return res.status(400).json({
          message: "Invalid investigation type. Must be 'safety_environmental' or 'equipment_failure'"
        });
      }
      let investigation;
      const numericId = parseInt(id);
      if (isNaN(numericId) || numericId.toString() !== id) {
        investigation = await investigationStorage.getInvestigationByInvestigationId(id);
      } else {
        investigation = await investigationStorage.getInvestigation(numericId);
      }
      if (!investigation) {
        return res.status(404).json({ message: "Investigation not found" });
      }
      const updatedInvestigation = await investigationStorage.updateInvestigation(investigation.id, {
        investigationType,
        currentStep: "evidence_collection"
      });
      const questionnaire = investigationEngine.getQuestionnaire(investigationType);
      res.json({ investigation: updatedInvestigation, questionnaire });
    } catch (error) {
      console.error("[RCA] Error setting investigation type:", error);
      res.status(500).json({ message: "Failed to set investigation type" });
    }
  });
  app2.get("/api/investigations/:id/questionnaire", async (req, res) => {
    try {
      const { id } = req.params;
      let investigation;
      const numericId = parseInt(id);
      if (isNaN(numericId) || numericId.toString() !== id) {
        investigation = await investigationStorage.getInvestigationByInvestigationId(id);
      } else {
        investigation = await investigationStorage.getInvestigation(numericId);
      }
      if (!investigation) {
        return res.status(404).json({ message: "Investigation not found" });
      }
      if (!investigation.investigationType) {
        return res.status(400).json({ message: "Investigation type not set" });
      }
      const questionnaire = investigationEngine.getQuestionnaire(investigation.investigationType);
      res.json({ questionnaire, investigation });
    } catch (error) {
      console.error("[RCA] Error fetching questionnaire:", error);
      res.status(500).json({ message: "Failed to fetch questionnaire" });
    }
  });
  app2.post("/api/investigations/:id/evidence", async (req, res) => {
    try {
      const { id } = req.params;
      const evidenceData = req.body;
      let investigation;
      const numericId = parseInt(id);
      if (isNaN(numericId) || numericId.toString() !== id) {
        investigation = await investigationStorage.getInvestigationByInvestigationId(id);
      } else {
        investigation = await investigationStorage.getInvestigation(numericId);
      }
      if (!investigation) {
        return res.status(404).json({ message: "Investigation not found" });
      }
      const updatedInvestigation = await investigationStorage.updateEvidence(investigation.id, evidenceData);
      const { completeness, isValid } = await investigationStorage.validateEvidenceCompleteness(investigation.id);
      await investigationStorage.updateInvestigation(investigation.id, {
        evidenceCompleteness: completeness.toString(),
        evidenceValidated: isValid,
        currentStep: isValid ? "analysis_ready" : "evidence_collection"
      });
      res.json({
        investigation: updatedInvestigation,
        completeness,
        isValid,
        canProceedToAnalysis: isValid
      });
    } catch (error) {
      console.error("[RCA] Error updating evidence:", error);
      res.status(500).json({ message: "Failed to update evidence" });
    }
  });
  app2.post("/api/investigations/:id/analyze", async (req, res) => {
    try {
      const { id } = req.params;
      let investigation;
      const numericId = parseInt(id);
      if (isNaN(numericId) || numericId.toString() !== id) {
        investigation = await investigationStorage.getInvestigationByInvestigationId(id);
      } else {
        investigation = await investigationStorage.getInvestigation(numericId);
      }
      if (!investigation) {
        return res.status(404).json({ message: "Investigation not found" });
      }
      const { completeness, isValid } = await investigationStorage.validateEvidenceCompleteness(investigation.id);
      if (!isValid) {
        return res.status(400).json({
          message: "Evidence collection incomplete. Minimum 80% required.",
          completeness
        });
      }
      await investigationStorage.updateInvestigation(investigation.id, {
        currentStep: "ai_processing"
      });
      const structuredRCA = RCAAnalysisEngine.generateStructuredRCA(investigation);
      const analysisResults = {
        causes: structuredRCA.causesConsidered.map((cause) => ({
          description: cause.cause,
          confidence: cause.confidence,
          classification: cause.classification,
          evidence: {
            supporting: cause.supportingEvidence,
            contradicting: cause.contradictingEvidence
          }
        })),
        topEvent: "Equipment Failure",
        confidence: structuredRCA.confidence,
        analysisMethod: investigation.investigationType === "safety_environmental" ? "ECFA" : "Fault Tree Analysis",
        structuredAnalysis: structuredRCA
      };
      const recommendations = structuredRCA.recommendations.map(
        (rec) => `${rec.priority.toUpperCase()}: ${rec.action} (${rec.timeframe}) - ${rec.rationale}`
      );
      const completedInvestigation = await investigationStorage.updateInvestigation(investigation.id, {
        analysisResults,
        recommendations,
        confidence: analysisResults.confidence?.toString(),
        currentStep: "completed",
        status: "completed"
      });
      res.json({
        investigation: completedInvestigation,
        analysisResults,
        recommendations
      });
    } catch (error) {
      console.error("[RCA] Error performing analysis:", error);
      res.status(500).json({ message: "Failed to perform analysis" });
    }
  });
  app2.get("/api/investigations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log("[RCA] Getting investigation for ID:", id);
      let investigation;
      const numericId = parseInt(id);
      console.log("[RCA] Parsed numeric ID:", numericId, "toString check:", numericId.toString() !== id);
      if (isNaN(numericId) || numericId.toString() !== id) {
        console.log("[RCA] Treating as string investigationId");
        investigation = await investigationStorage.getInvestigationByInvestigationId(id);
      } else {
        console.log("[RCA] Treating as numeric ID");
        investigation = await investigationStorage.getInvestigation(numericId);
      }
      if (!investigation) {
        console.log("[RCA] Investigation not found for ID:", id);
        return res.status(404).json({ message: "Investigation not found" });
      }
      console.log("[RCA] Successfully found investigation:", investigation.id);
      res.json(investigation);
    } catch (error) {
      console.error("[RCA] Error fetching investigation:", error);
      res.status(500).json({ message: "Failed to fetch investigation" });
    }
  });
  app2.get("/api/investigations", async (req, res) => {
    try {
      const investigations2 = await investigationStorage.getAllInvestigations();
      res.json(investigations2);
    } catch (error) {
      console.error("[RCA] Error fetching investigations:", error);
      res.status(500).json({ message: "Failed to fetch investigations" });
    }
  });
  app2.get("/api/analyses", async (req, res) => {
    try {
      const investigations2 = await investigationStorage.getAllInvestigations();
      const completedAnalyses = investigations2.filter((inv) => inv.status === "completed" || inv.currentStep === "completed").map((inv) => ({
        id: inv.id,
        investigationId: inv.investigationId,
        title: `${inv.whatHappened} - ${inv.evidenceData?.equipment_type || "Equipment"} ${inv.evidenceData?.equipment_tag || ""}`.trim(),
        status: inv.status === "completed" ? "completed" : inv.currentStep,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
        confidence: inv.confidence ? parseFloat(inv.confidence) * 100 : 80,
        equipmentType: inv.evidenceData?.equipment_type || "Unknown",
        location: inv.whereHappened || inv.evidenceData?.operating_location || "Unknown",
        cause: inv.analysisResults?.structuredAnalysis?.rootCause || inv.analysisResults?.causes?.[0]?.description || "Equipment failure analysis",
        priority: inv.consequence?.toLowerCase().includes("safety") ? "high" : inv.consequence?.toLowerCase().includes("production") ? "medium" : "low",
        investigationType: inv.investigationType,
        whatHappened: inv.whatHappened,
        whereHappened: inv.whereHappened,
        whenHappened: inv.whenHappened,
        evidenceData: inv.evidenceData,
        analysisResults: inv.analysisResults,
        recommendations: inv.recommendations
      }));
      res.json(completedAnalyses);
    } catch (error) {
      console.error("[RCA] Error fetching analyses:", error);
      res.status(500).json({ message: "Failed to fetch analyses" });
    }
  });
  app2.post("/api/incidents", async (req, res) => {
    try {
      console.log("[RCA] Creating incident with data:", req.body);
      const incidentData = {
        ...req.body,
        incidentDateTime: req.body.incidentDateTime ? new Date(req.body.incidentDateTime) : /* @__PURE__ */ new Date()
      };
      const incident = await investigationStorage.createIncident(incidentData);
      res.json(incident);
    } catch (error) {
      console.error("[RCA] Error creating incident:", error);
      res.status(500).json({ message: "Failed to create incident" });
    }
  });
  app2.get("/api/incidents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const incident = await investigationStorage.getIncident(id);
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }
      res.json(incident);
    } catch (error) {
      console.error("[RCA] Error fetching incident:", error);
      res.status(500).json({ message: "Failed to fetch incident" });
    }
  });
  app2.put("/api/incidents/:id/equipment-symptoms", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = {
        ...req.body,
        currentStep: 2,
        workflowStatus: "equipment_selected"
      };
      const incident = await investigationStorage.updateIncident(id, updateData);
      res.json(incident);
    } catch (error) {
      console.error("[RCA] Error updating incident equipment/symptoms:", error);
      res.status(500).json({ message: "Failed to update incident" });
    }
  });
  app2.post("/api/incidents/:id/generate-evidence-checklist", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { equipmentGroup, equipmentType, symptoms } = req.body;
      const evidenceItems = await generateEvidenceChecklist(equipmentGroup, equipmentType, symptoms);
      res.json({ evidenceItems });
    } catch (error) {
      console.error("[RCA] Error generating evidence checklist:", error);
      res.status(500).json({ message: "Failed to generate evidence checklist" });
    }
  });
  app2.put("/api/incidents/:id/evidence-progress", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const incident = await investigationStorage.updateIncident(id, updateData);
      res.json(incident);
    } catch (error) {
      console.error("[RCA] Error updating evidence progress:", error);
      res.status(500).json({ message: "Failed to update evidence progress" });
    }
  });
  app2.post("/api/incidents/:id/generate-evidence-categories", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { equipmentGroup, equipmentType, evidenceChecklist } = req.body;
      const categories = await generateEvidenceCategories(equipmentGroup, equipmentType, evidenceChecklist);
      res.json({ categories });
    } catch (error) {
      console.error("[RCA] Error generating evidence categories:", error);
      res.status(500).json({ message: "Failed to generate evidence categories" });
    }
  });
  app2.post("/api/incidents/:id/upload-evidence", upload.single("file"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { categoryId, description } = req.body;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const fileData = {
        id: Date.now().toString(),
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        url: `/uploads/${file.filename}`,
        uploadedAt: /* @__PURE__ */ new Date(),
        category: categoryId,
        description: description || void 0
      };
      res.json({ file: fileData });
    } catch (error) {
      console.error("[RCA] Error uploading evidence:", error);
      res.status(500).json({ message: "Failed to upload evidence" });
    }
  });
  app2.post("/api/incidents/:id/perform-analysis", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { equipmentGroup, equipmentType, symptoms, evidenceChecklist, evidenceFiles } = req.body;
      const analysis = await performAIAnalysis(equipmentGroup, equipmentType, symptoms, evidenceChecklist, evidenceFiles);
      await investigationStorage.updateIncident(id, {
        currentStep: 6,
        workflowStatus: "analysis_complete",
        analysisResults: analysis
      });
      res.json({ analysis });
    } catch (error) {
      console.error("[RCA] Error performing AI analysis:", error);
      res.status(500).json({ message: "Failed to perform AI analysis" });
    }
  });
  app2.get("/api/incidents/:id/analysis", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const incident = await investigationStorage.getIncident(id);
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }
      res.json(incident.analysisResults || {});
    } catch (error) {
      console.error("[RCA] Error fetching analysis results:", error);
      res.status(500).json({ message: "Failed to fetch analysis results" });
    }
  });
  app2.post("/api/incidents/:id/engineer-review", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const reviewData = req.body;
      const incident = await investigationStorage.updateIncident(id, {
        currentStep: 8,
        workflowStatus: reviewData.approved ? "approved" : "under_review",
        engineerReview: reviewData
      });
      res.json(incident);
    } catch (error) {
      console.error("[RCA] Error submitting engineer review:", error);
      res.status(500).json({ message: "Failed to submit engineer review" });
    }
  });
  app2.post("/api/incidents/:id/generate-final-report", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { engineerReview } = req.body;
      const reportUrl = await generateFinalReport(id, engineerReview);
      res.json({ reportUrl });
    } catch (error) {
      console.error("[RCA] Error generating final report:", error);
      res.status(500).json({ message: "Failed to generate final report" });
    }
  });
  app2.get("/api/analytics", async (req, res) => {
    try {
      const investigations2 = await investigationStorage.getAllInvestigations();
      const completedAnalyses = investigations2.filter(
        (inv) => inv.status === "completed" || inv.currentStep === "completed"
      );
      const analytics = {
        totalAnalyses: completedAnalyses.length,
        averageConfidence: completedAnalyses.length > 0 ? Math.round(completedAnalyses.reduce(
          (sum, inv) => sum + (inv.confidence ? parseFloat(inv.confidence) * 100 : 80),
          0
        ) / completedAnalyses.length) : 0,
        resolvedPercentage: completedAnalyses.length > 0 ? Math.round(completedAnalyses.filter((inv) => inv.status === "completed").length / completedAnalyses.length * 100) : 0,
        trendingCauses: getTrendingCauses(completedAnalyses)
      };
      res.json(analytics);
    } catch (error) {
      console.error("[RCA] Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });
  app2.post("/api/investigations/:id/files", upload.array("files"), async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files;
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      const fileData = files.map((file) => ({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
      }));
      const investigation = await investigationStorage.getInvestigation(parseInt(id));
      if (!investigation) {
        return res.status(404).json({ message: "Investigation not found" });
      }
      const existingFiles = investigation.uploadedFiles || [];
      const updatedFiles = [...existingFiles, ...fileData];
      await investigationStorage.updateInvestigation(parseInt(id), {
        uploadedFiles: updatedFiles
      });
      res.json({
        message: "Files uploaded successfully",
        files: fileData
      });
    } catch (error) {
      console.error("[RCA] Error uploading files:", error);
      res.status(500).json({ message: "Failed to upload files" });
    }
  });
  app2.get("/api/equipment/:type/parameters", (req, res) => {
    try {
      const { type } = req.params;
      const parameters = investigationEngine.getEquipmentParameters(type);
      res.json({ parameters });
    } catch (error) {
      console.error("[RCA] Error fetching equipment parameters:", error);
      res.status(500).json({ message: "Failed to fetch equipment parameters" });
    }
  });
  app2.use("/api/evidence-library", evidence_library_default);
  app2.get("/api/admin/ai-settings", async (req, res) => {
    try {
      const settings = await investigationStorage.getAllAiSettings();
      const sanitizedSettings = settings.map((setting) => ({
        ...setting,
        encryptedApiKey: void 0
      }));
      res.json(sanitizedSettings);
    } catch (error) {
      console.error("[RCA] Error fetching AI settings:", error);
      res.status(500).json({ message: "Failed to fetch AI settings" });
    }
  });
  app2.post("/api/admin/ai-settings/test", async (req, res) => {
    try {
      const { provider, apiKey } = req.body;
      if (!provider || !apiKey) {
        return res.status(400).json({ message: "Provider and API key are required" });
      }
      if (provider === "openai" && !apiKey.startsWith("sk-")) {
        return res.status(400).json({ success: false, message: "Invalid OpenAI API key format" });
      }
      res.json({ success: true, message: "API key format is valid" });
    } catch (error) {
      console.error("[RCA] Error testing API key:", error);
      res.status(500).json({ success: false, message: "Test failed" });
    }
  });
  app2.post("/api/admin/ai-settings", async (req, res) => {
    try {
      const { provider, apiKey, isActive, createdBy } = req.body;
      if (!provider || !apiKey) {
        return res.status(400).json({ message: "Provider and API key are required" });
      }
      const savedSettings = await investigationStorage.saveAiSettings({
        provider,
        apiKey,
        isActive: isActive || false,
        createdBy: createdBy || 1
      });
      res.status(201).json({
        ...savedSettings,
        encryptedApiKey: void 0
        // Don't send back encrypted key
      });
    } catch (error) {
      console.error("[RCA] Error saving AI settings:", error);
      res.status(500).json({ message: "Failed to save AI settings" });
    }
  });
  app2.delete("/api/admin/ai-settings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await investigationStorage.deleteAiSettings(id);
      res.status(204).send();
    } catch (error) {
      console.error("[RCA] Error deleting AI settings:", error);
      res.status(500).json({ message: "Failed to delete AI settings" });
    }
  });
  function getTrendingCauses(analyses2) {
    const causeCount = {};
    analyses2.forEach((analysis) => {
      const cause = analysis.analysisResults?.structuredAnalysis?.rootCause || analysis.analysisResults?.causes?.[0]?.description || "Equipment failure";
      causeCount[cause] = (causeCount[cause] || 0) + 1;
    });
    return Object.entries(causeCount).sort(([, a], [, b]) => b - a).slice(0, 5).map(([cause, count]) => ({ cause, count }));
  }
  app2.get("/api/evidence-library", async (req, res) => {
    try {
      const items = await investigationStorage.getAllEvidenceLibrary();
      res.json(items);
    } catch (error) {
      console.error("[RCA] Error fetching evidence library:", error);
      res.status(500).json({ message: "Failed to fetch evidence library" });
    }
  });
  app2.get("/api/evidence-library/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query is required" });
      }
      const items = await investigationStorage.searchEvidenceLibrary(q);
      res.json(items);
    } catch (error) {
      console.error("[RCA] Error searching evidence library:", error);
      res.status(500).json({ message: "Failed to search evidence library" });
    }
  });
  app2.get("/api/evidence-library/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await investigationStorage.getEvidenceLibraryById(id);
      if (!item) {
        return res.status(404).json({ message: "Evidence item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("[RCA] Error fetching evidence item:", error);
      res.status(500).json({ message: "Failed to fetch evidence item" });
    }
  });
  app2.post("/api/evidence-library", async (req, res) => {
    try {
      const item = await investigationStorage.createEvidenceLibrary(req.body);
      res.status(201).json(item);
    } catch (error) {
      console.error("[RCA] Error creating evidence item:", error);
      res.status(500).json({ message: "Failed to create evidence item" });
    }
  });
  app2.put("/api/evidence-library/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await investigationStorage.updateEvidenceLibrary(id, req.body);
      res.json(item);
    } catch (error) {
      console.error("[RCA] Error updating evidence item:", error);
      res.status(500).json({ message: "Failed to update evidence item" });
    }
  });
  app2.delete("/api/evidence-library/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await investigationStorage.deleteEvidenceLibrary(id);
      res.status(204).send();
    } catch (error) {
      console.error("[RCA] Error deleting evidence item:", error);
      res.status(500).json({ message: "Failed to delete evidence item" });
    }
  });
  app2.post("/api/evidence-library/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const csvData = req.file.buffer.toString("utf-8");
      const lines = csvData.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
      const items = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.replace(/"/g, "").trim());
        if (values.length >= 11) {
          items.push({
            equipmentGroup: values[0],
            equipmentType: values[1],
            subtype: values[2] || null,
            componentFailureMode: values[3],
            equipmentCode: values[4],
            failureCode: values[5],
            riskRanking: values[6],
            requiredTrendData: values[7],
            aiQuestions: values[8],
            attachmentsRequired: values[9],
            rootCauseLogic: values[10],
            notes: values[11] || null,
            updatedBy: "admin-import"
          });
        }
      }
      if (items.length === 0) {
        return res.status(400).json({ message: "No valid data found in CSV" });
      }
      const importedItems = await investigationStorage.bulkImportEvidenceLibrary(items);
      res.json({
        message: "Import successful",
        imported: importedItems.length,
        items: importedItems
      });
    } catch (error) {
      console.error("[RCA] Error importing CSV:", error);
      res.status(500).json({ message: "Failed to import CSV: " + error.message });
    }
  });
  app2.get("/api/equipment-groups", async (req, res) => {
    try {
      const groups = await investigationStorage.getAllEquipmentGroups();
      res.json(groups);
    } catch (error) {
      console.error("[RCA] Error fetching equipment groups:", error);
      res.status(500).json({ message: "Failed to fetch equipment groups" });
    }
  });
  app2.get("/api/equipment-groups/active", async (req, res) => {
    try {
      const groups = await investigationStorage.getActiveEquipmentGroups();
      res.json(groups);
    } catch (error) {
      console.error("[RCA] Error fetching active equipment groups:", error);
      res.status(500).json({ message: "Failed to fetch active equipment groups" });
    }
  });
  app2.post("/api/equipment-groups", async (req, res) => {
    try {
      const { name, isActive = true } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }
      const group = await investigationStorage.createEquipmentGroup({ name, isActive });
      res.json(group);
    } catch (error) {
      console.error("[RCA] Error creating equipment group:", error);
      if (error.message.includes("unique")) {
        res.status(409).json({ message: "Equipment group name already exists" });
      } else {
        res.status(500).json({ message: "Failed to create equipment group" });
      }
    }
  });
  app2.put("/api/equipment-groups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, isActive } = req.body;
      const group = await investigationStorage.updateEquipmentGroup(parseInt(id), { name, isActive });
      res.json(group);
    } catch (error) {
      console.error("[RCA] Error updating equipment group:", error);
      if (error.message.includes("unique")) {
        res.status(409).json({ message: "Equipment group name already exists" });
      } else {
        res.status(500).json({ message: "Failed to update equipment group" });
      }
    }
  });
  app2.delete("/api/equipment-groups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await investigationStorage.deleteEquipmentGroup(parseInt(id));
      res.json({ message: "Equipment group deleted successfully" });
    } catch (error) {
      console.error("[RCA] Error deleting equipment group:", error);
      res.status(500).json({ message: "Failed to delete equipment group" });
    }
  });
  app2.post("/api/equipment-groups/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const csvData = req.file.buffer.toString("utf-8");
      const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
      if (parsed.errors.length > 0) {
        return res.status(400).json({ message: "CSV parsing error", errors: parsed.errors });
      }
      const groups = parsed.data.map((row) => ({
        name: row.name || row.Name,
        isActive: row.isActive === "true" || row.isActive === true || row.isActive === "TRUE"
      })).filter((group) => group.name && group.name.trim());
      if (groups.length === 0) {
        return res.status(400).json({ message: "No valid equipment groups found in file" });
      }
      const imported = [];
      const errors = [];
      for (const group of groups) {
        try {
          const created = await investigationStorage.createEquipmentGroup(group);
          imported.push(created);
        } catch (error) {
          if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
            errors.push(`Equipment group "${group.name}" already exists`);
          } else {
            errors.push(`Failed to create "${group.name}": ${error.message}`);
          }
        }
      }
      res.json({
        message: "Import completed",
        imported: imported.length,
        errors: errors.length,
        details: errors
      });
    } catch (error) {
      console.error("[RCA] Error importing equipment groups:", error);
      res.status(500).json({ message: "Failed to import equipment groups: " + error.message });
    }
  });
  app2.get("/api/equipment-groups/export", async (req, res) => {
    try {
      const groups = await investigationStorage.getAllEquipmentGroups();
      const csvData = Papa.unparse(groups.map((group) => ({
        name: group.name,
        isActive: group.isActive,
        createdAt: group.createdAt?.toISOString(),
        updatedAt: group.updatedAt?.toISOString()
      })));
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=equipment-groups.csv");
      res.send(csvData);
    } catch (error) {
      console.error("[RCA] Error exporting equipment groups:", error);
      res.status(500).json({ message: "Failed to export equipment groups" });
    }
  });
  app2.get("/api/risk-rankings", async (req, res) => {
    try {
      const rankings = await investigationStorage.getAllRiskRankings();
      res.json(rankings);
    } catch (error) {
      console.error("[RCA] Error fetching risk rankings:", error);
      res.status(500).json({ message: "Failed to fetch risk rankings" });
    }
  });
  app2.get("/api/risk-rankings/active", async (req, res) => {
    try {
      const rankings = await investigationStorage.getActiveRiskRankings();
      res.json(rankings);
    } catch (error) {
      console.error("[RCA] Error fetching active risk rankings:", error);
      res.status(500).json({ message: "Failed to fetch active risk rankings" });
    }
  });
  app2.post("/api/risk-rankings", async (req, res) => {
    try {
      const { label, isActive = true } = req.body;
      if (!label) {
        return res.status(400).json({ message: "Label is required" });
      }
      const ranking = await investigationStorage.createRiskRanking({ label, isActive });
      res.json(ranking);
    } catch (error) {
      console.error("[RCA] Error creating risk ranking:", error);
      if (error.message.includes("unique")) {
        res.status(409).json({ message: "Risk ranking label already exists" });
      } else {
        res.status(500).json({ message: "Failed to create risk ranking" });
      }
    }
  });
  app2.put("/api/risk-rankings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { label, isActive } = req.body;
      const ranking = await investigationStorage.updateRiskRanking(parseInt(id), { label, isActive });
      res.json(ranking);
    } catch (error) {
      console.error("[RCA] Error updating risk ranking:", error);
      if (error.message.includes("unique")) {
        res.status(409).json({ message: "Risk ranking label already exists" });
      } else {
        res.status(500).json({ message: "Failed to update risk ranking" });
      }
    }
  });
  app2.delete("/api/risk-rankings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await investigationStorage.deleteRiskRanking(parseInt(id));
      res.json({ message: "Risk ranking deleted successfully" });
    } catch (error) {
      console.error("[RCA] Error deleting risk ranking:", error);
      res.status(500).json({ message: "Failed to delete risk ranking" });
    }
  });
  app2.post("/api/risk-rankings/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const csvData = req.file.buffer.toString("utf-8");
      const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
      if (parsed.errors.length > 0) {
        return res.status(400).json({ message: "CSV parsing error", errors: parsed.errors });
      }
      const rankings = parsed.data.map((row) => ({
        label: row.label || row.Label,
        isActive: row.isActive === "true" || row.isActive === true || row.isActive === "TRUE"
      })).filter((ranking) => ranking.label && ranking.label.trim());
      if (rankings.length === 0) {
        return res.status(400).json({ message: "No valid risk rankings found in file" });
      }
      const imported = [];
      const errors = [];
      for (const ranking of rankings) {
        try {
          const created = await investigationStorage.createRiskRanking(ranking);
          imported.push(created);
        } catch (error) {
          if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
            errors.push(`Risk ranking "${ranking.label}" already exists`);
          } else {
            errors.push(`Failed to create "${ranking.label}": ${error.message}`);
          }
        }
      }
      res.json({
        message: "Import completed",
        imported: imported.length,
        errors: errors.length,
        details: errors
      });
    } catch (error) {
      console.error("[RCA] Error importing risk rankings:", error);
      res.status(500).json({ message: "Failed to import risk rankings: " + error.message });
    }
  });
  app2.get("/api/risk-rankings/export", async (req, res) => {
    try {
      const rankings = await investigationStorage.getAllRiskRankings();
      const csvData = Papa.unparse(rankings.map((ranking) => ({
        label: ranking.label,
        isActive: ranking.isActive,
        createdAt: ranking.createdAt?.toISOString(),
        updatedAt: ranking.updatedAt?.toISOString()
      })));
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=risk-rankings.csv");
      res.send(csvData);
    } catch (error) {
      console.error("[RCA] Error exporting risk rankings:", error);
      res.status(500).json({ message: "Failed to export risk rankings" });
    }
  });
  app2.get("/api/cascading/equipment-groups", async (req, res) => {
    try {
      const groups = await investigationStorage.getCascadingEquipmentGroups();
      res.json(groups);
    } catch (error) {
      console.error("Error fetching cascading equipment groups:", error);
      res.status(500).json({ message: "Failed to fetch equipment groups" });
    }
  });
  app2.get("/api/cascading/equipment-types/:groupName", async (req, res) => {
    try {
      const { groupName } = req.params;
      const types = await investigationStorage.getCascadingEquipmentTypes(groupName);
      res.json(types);
    } catch (error) {
      console.error("Error fetching cascading equipment types:", error);
      res.status(500).json({ message: "Failed to fetch equipment types" });
    }
  });
  app2.get("/api/cascading/equipment-subtypes/:groupName/:typeName", async (req, res) => {
    try {
      const { groupName, typeName } = req.params;
      const subtypes = await investigationStorage.getCascadingEquipmentSubtypes(groupName, typeName);
      res.json(subtypes);
    } catch (error) {
      console.error("Error fetching cascading equipment subtypes:", error);
      res.status(500).json({ message: "Failed to fetch equipment subtypes" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}
async function generateEvidenceChecklist(equipmentGroup, equipmentType, symptoms) {
  const evidenceItems = [
    {
      id: "vibration-trends",
      category: "Operational Data",
      title: "Vibration Trend Data",
      description: "Historical vibration measurements showing patterns before failure",
      priority: "Critical",
      required: true,
      aiGenerated: true,
      specificToEquipment: true,
      examples: [
        "CSV files with vibration readings over time",
        "Condition monitoring system exports",
        "Handheld vibration analyzer data"
      ],
      completed: false
    },
    {
      id: "maintenance-records",
      category: "Maintenance History",
      title: "Maintenance Records",
      description: "Recent maintenance activities and findings",
      priority: "High",
      required: true,
      aiGenerated: true,
      specificToEquipment: true,
      examples: [
        "Work order completion reports",
        "PM inspection checklists",
        "Previous repair documentation"
      ],
      completed: false
    },
    {
      id: "operating-conditions",
      category: "Process Data",
      title: "Operating Conditions",
      description: "Process parameters during incident",
      priority: "High",
      required: true,
      aiGenerated: true,
      specificToEquipment: true,
      examples: [
        "DCS trend data",
        "Process parameter logs",
        "Alarm history"
      ],
      completed: false
    },
    {
      id: "inspection-photos",
      category: "Visual Evidence",
      title: "Equipment Inspection Photos",
      description: "Visual documentation of equipment condition",
      priority: "Medium",
      required: false,
      aiGenerated: true,
      specificToEquipment: true,
      examples: [
        "Before/after failure photos",
        "Component wear patterns",
        "Environmental conditions"
      ],
      completed: false
    }
  ];
  return evidenceItems;
}
async function generateEvidenceCategories(equipmentGroup, equipmentType, evidenceChecklist) {
  const categories = [
    {
      id: "operational-data",
      name: "Operational Data",
      description: "Process parameters, trends, and operational history",
      required: true,
      acceptedTypes: ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      maxFiles: 5,
      files: [],
      priority: "Critical"
    },
    {
      id: "maintenance-records",
      name: "Maintenance Records",
      description: "Work orders, inspection reports, and maintenance history",
      required: true,
      acceptedTypes: ["application/pdf", "text/plain", "image/*"],
      maxFiles: 10,
      files: [],
      priority: "High"
    },
    {
      id: "visual-evidence",
      name: "Visual Evidence",
      description: "Photos, videos, and visual documentation",
      required: false,
      acceptedTypes: ["image/*", "video/*"],
      maxFiles: 15,
      files: [],
      priority: "Medium"
    },
    {
      id: "technical-docs",
      name: "Technical Documentation",
      description: "Drawings, specifications, and technical references",
      required: false,
      acceptedTypes: ["application/pdf", "image/*"],
      maxFiles: 8,
      files: [],
      priority: "Low"
    }
  ];
  return categories;
}
async function performAIAnalysis(equipmentGroup, equipmentType, symptoms, evidenceChecklist, evidenceFiles) {
  const analysisResults = {
    overallConfidence: 87,
    analysisDate: /* @__PURE__ */ new Date(),
    rootCauses: [
      {
        id: "rc-001",
        description: "Inadequate Lubrication Leading to Bearing Failure",
        confidence: 92,
        category: "Maintenance",
        evidence: [
          "Vibration trends show increasing high-frequency patterns",
          "Maintenance records indicate extended lubrication intervals",
          "Temperature monitoring shows elevated bearing temperatures"
        ],
        likelihood: "Very High",
        impact: "High",
        priority: 1
      },
      {
        id: "rc-002",
        description: "Misalignment Due to Foundation Settlement",
        confidence: 78,
        category: "Mechanical",
        evidence: [
          "Coupling wear patterns indicate angular misalignment",
          "Foundation inspection photos show visible settling",
          "Historical alignment data shows progressive deterioration"
        ],
        likelihood: "High",
        impact: "Medium",
        priority: 2
      },
      {
        id: "rc-003",
        description: "Operating Outside Design Parameters",
        confidence: 65,
        category: "Operational",
        evidence: [
          "Process data shows frequent operation above rated capacity",
          "Temperature logs exceed manufacturer specifications",
          "Pressure fluctuations beyond design envelope"
        ],
        likelihood: "Medium",
        impact: "High",
        priority: 3
      }
    ],
    recommendations: [
      {
        id: "rec-001",
        title: "Implement Condition-Based Lubrication Program",
        description: "Replace time-based lubrication with vibration and temperature monitoring to optimize lubrication intervals",
        priority: "Immediate",
        category: "Maintenance",
        estimatedCost: "$15,000",
        timeframe: "2 weeks",
        responsible: "Maintenance Manager",
        preventsProbability: 95
      },
      {
        id: "rec-002",
        title: "Foundation Repair and Alignment Correction",
        description: "Repair foundation settling and perform precision alignment to manufacturer specifications",
        priority: "Short-term",
        category: "Mechanical",
        estimatedCost: "$45,000",
        timeframe: "4-6 weeks",
        responsible: "Engineering Manager",
        preventsProbability: 85
      },
      {
        id: "rec-003",
        title: "Operating Parameter Review and Training",
        description: "Review and enforce operating limits, provide operator training on equipment limitations",
        priority: "Short-term",
        category: "Operational",
        estimatedCost: "$8,000",
        timeframe: "3 weeks",
        responsible: "Operations Manager",
        preventsProbability: 70
      },
      {
        id: "rec-004",
        title: "Enhanced Condition Monitoring System",
        description: "Install continuous vibration and temperature monitoring with automatic alerts",
        priority: "Long-term",
        category: "Technology",
        estimatedCost: "$25,000",
        timeframe: "8-12 weeks",
        responsible: "Reliability Engineer",
        preventsProbability: 90
      }
    ],
    crossMatchResults: {
      libraryMatches: 23,
      patternSimilarity: 89,
      historicalData: [
        "Similar bearing failure in centrifugal pump - Site A (2023)",
        "Lubrication-related failure pattern - Equipment Type: Pump (2022)",
        "Foundation settlement case study - Industrial facility (2021)",
        "Misalignment failure analysis - Rotating equipment database"
      ]
    },
    evidenceGaps: [
      "Recent oil analysis results not provided - recommend immediate sampling",
      "Thermal imaging data missing - could confirm bearing temperature patterns",
      "Baseline alignment data not available - limits comparison analysis"
    ],
    additionalInvestigation: [
      "Perform comprehensive oil analysis including particle count and contamination assessment",
      "Conduct thermal imaging survey of all similar equipment",
      "Review foundation design specifications and soil conditions",
      "Analyze operational data for correlation with environmental factors"
    ]
  };
  return analysisResults;
}
async function generateFinalReport(incidentId, engineerReview) {
  const reportUrl = `/api/reports/rca-${incidentId}-${Date.now()}.pdf`;
  return reportUrl;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid as nanoid2 } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use((req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data") || req.path.includes("/import")) {
    return next();
  }
  return express2.json({ limit: "10mb" })(req, res, next);
});
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
