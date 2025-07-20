// Comprehensive Evidence Requirements Library
// ISO 14224 compliant equipment classification with detailed evidence requirements

export interface TrendDataRequirement {
  id: string;
  name: string;
  description: string;
  units: string;
  mandatory: boolean;
  samplingFrequency: string;
  typicalRange?: string;
  alertThresholds?: {
    warning: string;
    alarm: string;
  };
}

export interface AttachmentRequirement {
  id: string;
  name: string;
  description: string;
  fileTypes: string[];
  mandatory: boolean;
  maxSizeMB: number;
  validationCriteria?: string;
}

export interface AIPromptTemplate {
  fieldType: 'observed_problem' | 'maintenance_history' | 'operating_conditions' | 'inspection_results' | 'trend_analysis';
  context: string;
  prompt: string;
  examples: string[];
  validation: string;
  followUpQuestions?: string[];
}

export interface FailureMode {
  id: string;
  name: string;
  description: string;
  typicalSymptoms: string[];
  criticalEvidence: string[]; // References to trend/attachment IDs
  diagnosticQuestions: string[];
  commonCauses: string[];
}

export interface EquipmentEvidenceProfile {
  equipmentType: string;
  iso14224Code: string;
  subtypes: string[];
  requiredTrendData: TrendDataRequirement[];
  requiredAttachments: AttachmentRequirement[];
  aiPromptTemplates: AIPromptTemplate[];
  failureModes: FailureMode[];
  smartSuggestions: {
    condition: string;
    suggestion: string;
    additionalEvidence?: string[];
  }[];
  lastUpdated: string;
  updatedBy: string;
  notes?: string;
}

// Main Evidence Requirements Library
export const EVIDENCE_REQUIREMENTS_LIBRARY: Record<string, EquipmentEvidenceProfile> = {
  'pumps_centrifugal': {
    equipmentType: 'Pumps',
    iso14224Code: 'PU-001',
    subtypes: ['Centrifugal', 'End Suction', 'Between Bearings', 'Vertical Turbine'],
    requiredTrendData: [
      {
        id: 'vibration_overall',
        name: 'Overall Vibration',
        description: 'RMS vibration velocity at pump and motor bearings',
        units: 'mm/s',
        mandatory: true,
        samplingFrequency: '1 Hz continuous',
        typicalRange: '1.8-7.1 mm/s',
        alertThresholds: {
          warning: '7.1 mm/s',
          alarm: '11.2 mm/s'
        }
      },
      {
        id: 'vibration_spectrum',
        name: 'Vibration Spectrum Analysis',
        description: 'FFT analysis showing 1X, 2X, 3X running speed and bearing frequencies',
        units: 'mm/s at frequency',
        mandatory: true,
        samplingFrequency: 'Weekly or on condition',
        typicalRange: 'Varies by frequency'
      },
      {
        id: 'discharge_pressure',
        name: 'Discharge Pressure',
        description: 'Pump discharge pressure trend',
        units: 'bar(g)',
        mandatory: true,
        samplingFrequency: '10 seconds',
        typicalRange: 'Per design specification'
      },
      {
        id: 'suction_pressure',
        name: 'Suction Pressure',
        description: 'Pump suction pressure for NPSH calculation',
        units: 'bar(g)',
        mandatory: true,
        samplingFrequency: '10 seconds',
        typicalRange: 'Above vapor pressure + NPSH required'
      },
      {
        id: 'flow_rate',
        name: 'Flow Rate',
        description: 'Actual pump flow rate',
        units: 'm³/h',
        mandatory: true,
        samplingFrequency: '10 seconds',
        typicalRange: '70-110% of BEP'
      },
      {
        id: 'bearing_temperature',
        name: 'Bearing Temperature',
        description: 'Drive end and non-drive end bearing temperatures',
        units: '°C',
        mandatory: true,
        samplingFrequency: '1 minute',
        typicalRange: 'Ambient + 40°C max',
        alertThresholds: {
          warning: '85°C',
          alarm: '95°C'
        }
      },
      {
        id: 'motor_current',
        name: 'Motor Current',
        description: 'Three-phase motor current consumption',
        units: 'A',
        mandatory: true,
        samplingFrequency: '10 seconds',
        typicalRange: '80-105% of FLA'
      },
      {
        id: 'seal_pot_level',
        name: 'Seal Pot Level',
        description: 'Mechanical seal support system fluid level',
        units: '%',
        mandatory: false,
        samplingFrequency: '1 minute',
        typicalRange: '40-80%'
      }
    ],
    requiredAttachments: [
      {
        id: 'vibration_analysis_report',
        name: 'Vibration Analysis Report',
        description: 'Detailed spectrum analysis with bearing fault frequencies',
        fileTypes: ['pdf', 'xlsx', 'csv'],
        mandatory: true,
        maxSizeMB: 25,
        validationCriteria: 'Must include time waveform, spectrum, and trend data'
      },
      {
        id: 'dcs_trend_screenshot',
        name: 'DCS Trend Screenshot',
        description: 'Process control system trends showing pressure, flow, temperature',
        fileTypes: ['png', 'jpg', 'pdf'],
        mandatory: true,
        maxSizeMB: 10,
        validationCriteria: 'Must show 24-48 hours of data including failure event'
      },
      {
        id: 'pump_inspection_photos',
        name: 'Pump Inspection Photos',
        description: 'Visual documentation of pump condition, seal, coupling, alignment',
        fileTypes: ['jpg', 'png'],
        mandatory: true,
        maxSizeMB: 50,
        validationCriteria: 'Clear, well-lit photos of critical components'
      },
      {
        id: 'maintenance_work_order',
        name: 'Maintenance Work Order',
        description: 'Recent maintenance history with parts used and procedures',
        fileTypes: ['pdf', 'xlsx', 'docx'],
        mandatory: true,
        maxSizeMB: 15,
        validationCriteria: 'Must include dates, parts list, and work performed'
      },
      {
        id: 'seal_replacement_record',
        name: 'Seal Replacement Record',
        description: 'Documentation of seal installation with torque values and alignment',
        fileTypes: ['pdf', 'xlsx'],
        mandatory: false,
        maxSizeMB: 10,
        validationCriteria: 'Include part numbers, installation procedure, test results'
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: 'observed_problem',
        context: 'For centrifugal pump failures, specific technical details are critical for accurate diagnosis',
        prompt: 'Describe the pump failure with precise technical details: What type of leak (mechanical seal, packing, casing)? Vibration amplitude and frequency? Temperature readings? Flow and pressure values? Include timeline of symptom development.',
        examples: [
          'Mechanical seal leaking 2 L/min clear water, overall vibration 8.5 mm/s (normal 2.1), DE bearing temperature 85°C (normal 65°C), grinding noise from bearing area, started gradually over 3 hours',
          'Pump cavitation noise, suction pressure dropped to 0.8 bar (normal 1.2), discharge pressure fluctuating ±0.5 bar, flow reduced from 180 to 140 m³/h'
        ],
        validation: 'Response must include quantified measurements, not just descriptions',
        followUpQuestions: [
          'What was the exact leak rate and fluid appearance?',
          'What were the vibration readings at pump and motor bearings?',
          'Did you notice any changes in operating parameters before the failure?'
        ]
      },
      {
        fieldType: 'maintenance_history',
        context: 'Recent maintenance work often contributes to pump failures',
        prompt: 'Document all maintenance performed in the last 6 months. Include: parts replaced (OEM vs aftermarket), who performed the work, installation procedures followed, torque specifications used, post-work testing, any deviations from standard procedures.',
        examples: [
          'Mechanical seal replaced 2025-07-15 by ABC Contractors, OEM Flowserve Type 28 seal PN 123456, installed per API 682 procedure, torque 25 Nm per specification, post-installation alignment verified 0.002" TIR, test run 4 hours at design flow 180 m³/h with no leakage',
          'Bearing replacement 2025-06-20, OEM SKF 6309 bearings, proper heating to 80°C, shaft clearance verified, grease quantity per manual, vibration baseline established'
        ],
        validation: 'Must include specific dates, part numbers, procedures, and verification steps',
        followUpQuestions: [
          'Were OEM parts used or aftermarket equivalents?',
          'Was the installation procedure documented and followed?',
          'What post-installation testing was performed?'
        ]
      },
      {
        fieldType: 'operating_conditions',
        context: 'Operating parameters at time of failure reveal root causes',
        prompt: 'Provide actual operating conditions during failure: suction pressure, discharge pressure, flow rate, fluid temperature, NPSH available vs required, system resistance curve position, any process upsets or changes.',
        examples: [
          'Flow 165 m³/h (design 180), suction pressure 1.1 bar (design 1.5), discharge 8.2 bar (design 8.5), fluid temperature 68°C (design 65°C), NPSH available 3.2m (required 2.8m)',
          'Operating at minimum flow 120 m³/h due to process demand, recirculation valve 40% open, fluid temperature stable 65°C, no recent process changes'
        ],
        validation: 'Must include actual numerical values and comparison to design conditions'
      }
    ],
    failureModes: [
      {
        id: 'mechanical_seal_failure',
        name: 'Mechanical Seal Failure',
        description: 'Failure of primary or secondary seal elements',
        typicalSymptoms: ['Visible leakage', 'Seal chamber pressure loss', 'High seal face temperature', 'Abnormal noise'],
        criticalEvidence: ['seal_inspection_photos', 'operating_conditions', 'maintenance_work_order'],
        diagnosticQuestions: [
          'Was the seal recently replaced or maintained?',
          'What is the condition of the seal faces and O-rings?',
          'Are there signs of dry running or contamination?',
          'Was proper installation procedure followed?'
        ],
        commonCauses: ['Dry running', 'Contamination', 'Improper installation', 'Process upset', 'Thermal shock']
      },
      {
        id: 'bearing_failure',
        name: 'Bearing Failure',
        description: 'Rolling element or journal bearing degradation',
        typicalSymptoms: ['High vibration', 'Temperature increase', 'Unusual noise', 'Metal particles in lubricant'],
        criticalEvidence: ['vibration_analysis_report', 'bearing_temperature', 'pump_inspection_photos'],
        diagnosticQuestions: [
          'What are the vibration levels and frequencies?',
          'Are bearing temperatures elevated?',
          'Is there evidence of lubrication issues?',
          'When was the last alignment check?'
        ],
        commonCauses: ['Misalignment', 'Lubrication failure', 'Contamination', 'Fatigue', 'Improper installation']
      },
      {
        id: 'cavitation',
        name: 'Cavitation',
        description: 'Formation and collapse of vapor bubbles due to insufficient NPSH',
        typicalSymptoms: ['Crackling noise', 'Vibration', 'Performance loss', 'Impeller erosion'],
        criticalEvidence: ['suction_pressure', 'flow_rate', 'pump_inspection_photos'],
        diagnosticQuestions: [
          'What is the NPSH available vs required?',
          'Is there evidence of impeller erosion?',
          'Have suction conditions changed?',
          'Are there signs of vapor formation?'
        ],
        commonCauses: ['Insufficient NPSH', 'Suction line restrictions', 'High fluid temperature', 'System design issues']
      }
    ],
    smartSuggestions: [
      {
        condition: 'vibration_high AND seal_leak',
        suggestion: 'High vibration combined with seal leakage typically indicates misalignment or bearing wear causing shaft deflection. Check alignment measurements and bearing condition immediately.',
        additionalEvidence: ['alignment_data', 'bearing_condition_assessment']
      },
      {
        condition: 'recent_maintenance AND current_failure',
        suggestion: 'Failure shortly after maintenance suggests installation issues. Verify procedures were followed, correct parts used, and proper torque applied.',
        additionalEvidence: ['installation_procedure_checklist', 'part_verification_photos']
      },
      {
        condition: 'pressure_drop AND performance_loss',
        suggestion: 'Pressure drop with performance loss indicates internal wear or blockage. Inspect impeller for erosion, corrosion, or foreign object damage.',
        additionalEvidence: ['impeller_inspection_photos', 'internal_clearance_measurements']
      }
    ],
    lastUpdated: '2025-01-20',
    updatedBy: 'RCA System Admin',
    notes: 'Based on API 610 standards and field experience database'
  },

  'compressors_reciprocating': {
    equipmentType: 'Compressors',
    iso14224Code: 'CO-002',
    subtypes: ['Single Acting', 'Double Acting', 'Multi-stage'],
    requiredTrendData: [
      {
        id: 'suction_pressure',
        name: 'Suction Pressure',
        description: 'Compressor inlet pressure for all stages',
        units: 'bar(g)',
        mandatory: true,
        samplingFrequency: '5 seconds',
        typicalRange: 'Per process design'
      },
      {
        id: 'discharge_pressure',
        name: 'Discharge Pressure',
        description: 'Compressor outlet pressure for all stages',
        units: 'bar(g)',
        mandatory: true,
        samplingFrequency: '5 seconds',
        typicalRange: 'Per compression ratio'
      },
      {
        id: 'cylinder_temperature',
        name: 'Cylinder Temperature',
        description: 'Individual cylinder head temperatures',
        units: '°C',
        mandatory: true,
        samplingFrequency: '30 seconds',
        typicalRange: 'Discharge temp < 180°C',
        alertThresholds: {
          warning: '150°C',
          alarm: '175°C'
        }
      },
      {
        id: 'vibration_overall',
        name: 'Overall Vibration',
        description: 'Compressor frame vibration',
        units: 'mm/s',
        mandatory: true,
        samplingFrequency: '1 Hz continuous',
        typicalRange: '4.5-11.2 mm/s'
      }
    ],
    requiredAttachments: [
      {
        id: 'pressure_trends',
        name: 'Pressure Trend Charts',
        description: 'Suction and discharge pressure trends showing pulsations and valve behavior',
        fileTypes: ['csv', 'xlsx', 'png'],
        mandatory: true,
        maxSizeMB: 20
      },
      {
        id: 'trip_log',
        name: 'Compressor Trip Log',
        description: 'Control system trip and alarm history',
        fileTypes: ['pdf', 'csv', 'xlsx'],
        mandatory: true,
        maxSizeMB: 15
      },
      {
        id: 'valve_inspection',
        name: 'Valve Inspection Report',
        description: 'Condition assessment of suction and discharge valves',
        fileTypes: ['pdf', 'jpg', 'png'],
        mandatory: true,
        maxSizeMB: 30
      }
    ],
    aiPromptTemplates: [
      {
        fieldType: 'observed_problem',
        context: 'Reciprocating compressor failures often relate to valve condition and capacity loss',
        prompt: 'Describe compressor symptoms with specific measurements: capacity loss percentage, temperature readings by cylinder, pressure fluctuations, vibration levels, unusual noises. Include timeline of performance degradation.',
        examples: [
          'Capacity loss 25% from design, cylinder #2 temperature 165°C (others 135°C), suction pressure pulsations ±0.3 bar, discharge valve noise audible, started over 2 weeks',
          'High vibration 15 mm/s (normal 6), temperature spike cylinder #1 to 180°C, pressure ratio dropped from 3.2 to 2.8, metallic noise from valve area'
        ],
        validation: 'Must include quantified performance loss and temperature differentials'
      }
    ],
    failureModes: [
      {
        id: 'valve_failure',
        name: 'Compressor Valve Failure',
        description: 'Failure of suction or discharge valve plates, springs, or seats',
        typicalSymptoms: ['Capacity loss', 'Temperature rise', 'Pressure fluctuation', 'Unusual noise'],
        criticalEvidence: ['pressure_trends', 'cylinder_temperature', 'valve_inspection'],
        diagnosticQuestions: [
          'Which cylinders show elevated temperatures?',
          'Are pressure pulsations excessive?',
          'What is the extent of capacity loss?',
          'When were valves last serviced?'
        ],
        commonCauses: ['Valve plate fatigue', 'Spring failure', 'Contamination', 'Thermal stress', 'Inadequate maintenance']
      }
    ],
    smartSuggestions: [
      {
        condition: 'temperature_spike AND capacity_loss',
        suggestion: 'Temperature spike with capacity loss indicates valve leakage. Check valve condition and seating for affected cylinder.',
        additionalEvidence: ['valve_disassembly_photos', 'seat_condition_assessment']
      }
    ],
    lastUpdated: '2025-01-20',
    updatedBy: 'RCA System Admin'
  }
};

// Administrative functions for library management
export interface LibraryUpdateLog {
  timestamp: string;
  equipmentType: string;
  changeType: 'ADD' | 'MODIFY' | 'DELETE' | 'DEPRECATE';
  fieldChanged: string;
  oldValue?: any;
  newValue?: any;
  updatedBy: string;
  reason: string;
}

export class EvidenceLibraryManager {
  private updateLog: LibraryUpdateLog[] = [];

  addEquipmentProfile(profile: EquipmentEvidenceProfile): void {
    EVIDENCE_REQUIREMENTS_LIBRARY[profile.equipmentType.toLowerCase().replace(' ', '_')] = profile;
    this.logUpdate('ADD', profile.equipmentType, 'equipment_profile', undefined, profile, profile.updatedBy, 'New equipment type added');
  }

  updateTrendRequirement(equipmentType: string, trendId: string, updates: Partial<TrendDataRequirement>, updatedBy: string): void {
    const profile = EVIDENCE_REQUIREMENTS_LIBRARY[equipmentType];
    if (!profile) throw new Error(`Equipment type ${equipmentType} not found`);

    const trendIndex = profile.requiredTrendData.findIndex(t => t.id === trendId);
    if (trendIndex === -1) throw new Error(`Trend ${trendId} not found`);

    const oldValue = { ...profile.requiredTrendData[trendIndex] };
    profile.requiredTrendData[trendIndex] = { ...profile.requiredTrendData[trendIndex], ...updates };
    profile.lastUpdated = new Date().toISOString();
    profile.updatedBy = updatedBy;

    this.logUpdate('MODIFY', equipmentType, `trend_${trendId}`, oldValue, profile.requiredTrendData[trendIndex], updatedBy, 'Trend requirement updated');
  }

  addAIPromptTemplate(equipmentType: string, template: AIPromptTemplate, updatedBy: string): void {
    const profile = EVIDENCE_REQUIREMENTS_LIBRARY[equipmentType];
    if (!profile) throw new Error(`Equipment type ${equipmentType} not found`);

    profile.aiPromptTemplates.push(template);
    profile.lastUpdated = new Date().toISOString();
    profile.updatedBy = updatedBy;

    this.logUpdate('ADD', equipmentType, `ai_prompt_${template.fieldType}`, undefined, template, updatedBy, 'New AI prompt template added');
  }

  exportLibrary(): string {
    return JSON.stringify({
      library: EVIDENCE_REQUIREMENTS_LIBRARY,
      updateLog: this.updateLog,
      exportDate: new Date().toISOString()
    }, null, 2);
  }

  importLibrary(jsonData: string, updatedBy: string): void {
    const data = JSON.parse(jsonData);
    Object.assign(EVIDENCE_REQUIREMENTS_LIBRARY, data.library);
    if (data.updateLog) {
      this.updateLog.push(...data.updateLog);
    }
    this.logUpdate('MODIFY', 'SYSTEM', 'library_import', undefined, 'Library imported', updatedBy, 'Library data imported from backup');
  }

  private logUpdate(changeType: LibraryUpdateLog['changeType'], equipmentType: string, fieldChanged: string, oldValue: any, newValue: any, updatedBy: string, reason: string): void {
    this.updateLog.push({
      timestamp: new Date().toISOString(),
      equipmentType,
      changeType,
      fieldChanged,
      oldValue,
      newValue,
      updatedBy,
      reason
    });
  }

  getUpdateHistory(equipmentType?: string): LibraryUpdateLog[] {
    if (equipmentType) {
      return this.updateLog.filter(log => log.equipmentType === equipmentType);
    }
    return [...this.updateLog];
  }
}

// Helper functions for RCA system integration
export function getEquipmentProfile(equipmentType: string): EquipmentEvidenceProfile | null {
  const key = equipmentType.toLowerCase().replace(' ', '_');
  return EVIDENCE_REQUIREMENTS_LIBRARY[key] || null;
}

export function getRequiredTrendsForEquipment(equipmentType: string): TrendDataRequirement[] {
  const profile = getEquipmentProfile(equipmentType);
  return profile ? profile.requiredTrendData.filter(t => t.mandatory) : [];
}

export function getRequiredAttachmentsForEquipment(equipmentType: string): AttachmentRequirement[] {
  const profile = getEquipmentProfile(equipmentType);
  return profile ? profile.requiredAttachments.filter(a => a.mandatory) : [];
}

export function getAIPromptsForField(equipmentType: string, fieldType: AIPromptTemplate['fieldType']): AIPromptTemplate | null {
  const profile = getEquipmentProfile(equipmentType);
  if (!profile) return null;
  
  return profile.aiPromptTemplates.find(template => template.fieldType === fieldType) || null;
}

export function identifyLikelyFailureMode(equipmentType: string, symptoms: string[]): FailureMode | null {
  const profile = getEquipmentProfile(equipmentType);
  if (!profile) return null;

  // Find failure mode with most matching symptoms
  let bestMatch: FailureMode | null = null;
  let maxMatches = 0;

  for (const failureMode of profile.failureModes) {
    const matches = failureMode.typicalSymptoms.filter(symptom => 
      symptoms.some(userSymptom => userSymptom.toLowerCase().includes(symptom.toLowerCase()))
    ).length;

    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = failureMode;
    }
  }

  return bestMatch;
}

export function getSmartSuggestionsForCondition(equipmentType: string, conditions: Record<string, boolean>): string[] {
  const profile = getEquipmentProfile(equipmentType);
  if (!profile) return [];

  return profile.smartSuggestions
    .filter(suggestion => evaluateCondition(suggestion.condition, conditions))
    .map(suggestion => suggestion.suggestion);
}

function evaluateCondition(condition: string, values: Record<string, boolean>): boolean {
  // Simple condition evaluator - can be enhanced for complex logic
  const tokens = condition.split(/\s+(AND|OR)\s+/);
  let result = values[tokens[0]] || false;
  
  for (let i = 1; i < tokens.length; i += 2) {
    const operator = tokens[i];
    const variable = tokens[i + 1];
    const value = values[variable] || false;
    
    if (operator === 'AND') {
      result = result && value;
    } else if (operator === 'OR') {
      result = result || value;
    }
  }
  
  return result;
}

// Initialize library manager
export const libraryManager = new EvidenceLibraryManager();