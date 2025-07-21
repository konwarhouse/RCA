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
  date,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Evidence Library table for comprehensive RCA templates
export const evidenceLibrary = pgTable("evidence_library", {
  id: serial("id").primaryKey(),
  equipmentGroup: varchar("equipment_group").notNull(), // Rotating, Static, Electrical, etc.
  equipmentType: varchar("equipment_type").notNull(), // Pumps, Compressors, Turbines, etc.
  subtype: varchar("subtype"), // Centrifugal, Reciprocating, etc.
  componentFailureMode: varchar("component_failure_mode").notNull(), // Seal Leak, Bearing Failure, etc.
  equipmentCode: varchar("equipment_code").notNull().unique(), // PMP-CEN-001, etc.
  failureCode: varchar("failure_code").notNull(), // F-001, etc.
  riskRanking: varchar("risk_ranking").notNull(), // High, Medium, Low
  requiredTrendData: text("required_trend_data"), // Vibration, Seal Pot Level, etc.
  aiQuestions: text("ai_questions"), // When did leak start? etc.
  attachmentsRequired: text("attachments_required"), // Vibration plot, leak photo, etc.
  rootCauseLogic: text("root_cause_logic"), // Root: Seal aged/damaged, etc.
  isActive: boolean("is_active").default(true),
  lastUpdated: timestamp("last_updated").defaultNow(),
  updatedBy: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  notes: text("notes"),
});

export const insertEvidenceLibrarySchema = createInsertSchema(evidenceLibrary).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export type InsertEvidenceLibrary = z.infer<typeof insertEvidenceLibrarySchema>;
export type EvidenceLibrary = typeof evidenceLibrary.$inferSelect;

// RCA Investigations table - supports both ECFA and Fault Tree Analysis
export const investigations = pgTable("investigations", {
  id: serial("id").primaryKey(),
  investigationId: varchar("investigation_id").unique().notNull(),
  
  // Mandatory Investigation Type Selection
  investigationType: varchar("investigation_type"), // 'safety_environmental' or 'equipment_failure'
  
  // Step 1: Problem Definition (Always Required)
  whatHappened: text("what_happened"),
  whereHappened: varchar("where_happened"),
  whenHappened: timestamp("when_happened"),
  consequence: text("consequence"),
  detectedBy: varchar("detected_by"),
  
  // Workflow Management
  currentStep: varchar("current_step").default("problem_definition"), // problem_definition, investigation_type, evidence_collection, analysis_ready, ai_processing, completed
  
  // Evidence Collection Data (All 8 Sections for Fault Tree + ECFA sections)
  evidenceData: jsonb("evidence_data"), // Structured storage for all questionnaire responses
  evidenceCompleteness: decimal("evidence_completeness", { precision: 5, scale: 2 }).default("0.00"),
  evidenceValidated: boolean("evidence_validated").default(false),
  
  // Analysis Results
  analysisResults: jsonb("analysis_results"), // Fault tree diagram or ECFA chart
  rootCauses: jsonb("root_causes"),
  contributingFactors: jsonb("contributing_factors"),
  recommendations: jsonb("recommendations"),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  
  // File Attachments
  uploadedFiles: jsonb("uploaded_files"),
  supportingDocuments: jsonb("supporting_documents"),
  
  // Status and Workflow
  status: varchar("status").default("active"), // active, completed, archived
  
  // Audit Trail
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by"),
  auditTrail: jsonb("audit_trail"),
});

// AI Settings for secure key management
export const aiSettings = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  provider: varchar("provider").notNull(), // openai, anthropic, etc.
  apiKey: text("api_key").notNull(), // encrypted
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInvestigationSchema = createInsertSchema(investigations);
export type InsertInvestigation = z.infer<typeof insertInvestigationSchema>;
export type Investigation = typeof investigations.$inferSelect;

export const insertAiSettingsSchema = createInsertSchema(aiSettings);
export type InsertAiSettings = z.infer<typeof insertAiSettingsSchema>;
export type AiSettings = typeof aiSettings.$inferSelect;

// ISO 14224 Equipment Taxonomy  
export const ISO14224_EQUIPMENT_TYPES = {
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
} as const;

// Export for backward compatibility
export const EQUIPMENT_TYPES = ISO14224_EQUIPMENT_TYPES;

// Equipment-specific parameter definitions
export const EQUIPMENT_PARAMETERS = {
  pumps: [
    { key: "suction_pressure", label: "Suction Pressure", unit: "bar", type: "number" },
    { key: "discharge_pressure", label: "Discharge Pressure", unit: "bar", type: "number" },
    { key: "flow_rate", label: "Flow Rate", unit: "m³/h", type: "number" },
    { key: "vibration_level", label: "Vibration Level", unit: "mm/s", type: "number" },
    { key: "temperature", label: "Temperature", unit: "°C", type: "number" },
    { key: "seal_condition", label: "Seal Condition", type: "select", options: ["Good", "Slight Leak", "Major Leak", "Failed"] },
    { key: "noise_level", label: "Noise Level", type: "select", options: ["Normal", "Slight Increase", "Loud", "Very Loud"] }
  ],
  motors: [
    { key: "current", label: "Current", unit: "A", type: "number" },
    { key: "voltage", label: "Voltage", unit: "V", type: "number" },
    { key: "temperature", label: "Temperature", unit: "°C", type: "number" },
    { key: "vibration", label: "Vibration", unit: "mm/s", type: "number" },
    { key: "load", label: "Load", unit: "%", type: "number" },
    { key: "insulation_resistance", label: "Insulation Resistance", unit: "MΩ", type: "number" }
  ],
  valves: [
    { key: "position", label: "Valve Position", unit: "%", type: "number" },
    { key: "actuator_pressure", label: "Actuator Pressure", unit: "bar", type: "number" },
    { key: "seat_leakage", label: "Seat Leakage", type: "select", options: ["None", "Slight", "Moderate", "Severe"] },
    { key: "packing_leakage", label: "Packing Leakage", type: "select", options: ["None", "Slight", "Moderate", "Severe"] },
    { key: "response_time", label: "Response Time", unit: "s", type: "number" }
  ]
} as const;

// Fault Tree Analysis Templates
export const FAULT_TREE_TEMPLATES = {
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
} as const;

// ECFA Framework Components
export const ECFA_COMPONENTS = {
  event_types: [
    "Personal Injury", "Environmental Release", "Fire/Explosion", "Property Damage", 
    "Process Safety Event", "Security Incident", "Near Miss"
  ],
  barrier_types: [
    "Prevention Barrier", "Protection Barrier", "Mitigation Barrier", 
    "Emergency Response Barrier", "Recovery Barrier"
  ],
  cause_categories: [
    "Human Factors", "Equipment/Technical", "Organizational", 
    "External Factors", "Latent Conditions"
  ]
} as const;