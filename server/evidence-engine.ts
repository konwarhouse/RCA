import { EvidenceData, QuestionDefinition } from "@shared/schema";

/**
 * Evidence Collection Engine - Manages the question-driven evidence gathering process
 * This is the core of the new workflow that collects structured evidence before AI analysis
 */
export class EvidenceEngine {
  
  /**
   * Phase 1: Asset Context Questions (Always asked first)
   */
  private static readonly PHASE_1_QUESTIONS: QuestionDefinition[] = [
    {
      id: "equipment_type",
      phase: "assetContext",
      text: "What is the equipment type?",
      type: "select",
      options: ["valve", "pump", "motor", "compressor", "conveyor", "fan", "heat_exchanger", "turbine", "gearbox", "bearing", "reactor", "vessel", "other"],
      required: true
    },
    {
      id: "equipment_subtype", 
      phase: "assetContext",
      text: "What is the specific subtype or model?",
      type: "text",
      required: false
    },
    {
      id: "main_function",
      phase: "assetContext", 
      text: "What is the equipment's main function/service?",
      type: "text",
      required: false
    },
    {
      id: "location",
      phase: "assetContext",
      text: "Where is the equipment located? (site, plant area, line number, asset ID)",
      type: "text", 
      required: true
    },
    {
      id: "in_service_since",
      phase: "assetContext",
      text: "When was this equipment put in service?",
      type: "date",
      required: false
    },
    {
      id: "total_run_hours",
      phase: "assetContext", 
      text: "Total run hours (if known)",
      type: "number",
      required: false
    }
  ];

  /**
   * Phase 2: Symptom Definition Questions
   */
  private static readonly PHASE_2_QUESTIONS: QuestionDefinition[] = [
    {
      id: "observed_problem",
      phase: "symptomDefinition",
      text: "What is the observed problem/symptom?",
      type: "select",
      options: ["leak", "noise", "high vibration", "low output", "failure to start", "trip", "overheating", "excessive wear", "contamination", "other"],
      required: true
    },
    {
      id: "symptom_location",
      phase: "symptomDefinition", 
      text: "Where is the symptom observed? (specific location)",
      type: "text",
      required: false
    },
    {
      id: "first_noticed",
      phase: "symptomDefinition",
      text: "When was the problem first noticed?",
      type: "date",
      required: false
    },
    {
      id: "operating_state_when_noticed",
      phase: "symptomDefinition",
      text: "Operating state when problem was noticed",
      type: "select", 
      options: ["during operation", "startup", "shutdown", "after maintenance", "unknown"],
      required: false
    },
    {
      id: "problem_pattern",
      phase: "symptomDefinition",
      text: "Is the problem constant, intermittent, or recurring?",
      type: "select",
      options: ["constant", "intermittent", "recurring", "one-time event"],
      required: false
    },
    {
      id: "alarms_activated",
      phase: "symptomDefinition",
      text: "Were any alarms or interlocks activated?",
      type: "text",
      required: false
    }
  ];

  /**
   * Phase 3: Operating Conditions Questions
   */
  private static readonly PHASE_3_QUESTIONS: QuestionDefinition[] = [
    {
      id: "current_flow_rate",
      phase: "operatingConditions",
      text: "Current flow rate (if applicable)",
      type: "number",
      required: false
    },
    {
      id: "current_pressure_upstream", 
      phase: "operatingConditions",
      text: "Current upstream pressure (if applicable)",
      type: "number",
      required: false
    },
    {
      id: "current_pressure_downstream",
      phase: "operatingConditions", 
      text: "Current downstream pressure (if applicable)",
      type: "number",
      required: false
    },
    {
      id: "current_temperature_inlet",
      phase: "operatingConditions",
      text: "Current inlet temperature (if applicable)",
      type: "number", 
      required: false
    },
    {
      id: "current_temperature_outlet",
      phase: "operatingConditions",
      text: "Current outlet temperature (if applicable)",
      type: "number",
      required: false
    },
    {
      id: "current_vibration_level",
      phase: "operatingConditions", 
      text: "Current vibration level (if applicable)",
      type: "number",
      required: false
    },
    {
      id: "current_speed",
      phase: "operatingConditions",
      text: "Current operating speed (RPM, if applicable)",
      type: "number",
      required: false
    },
    {
      id: "recent_process_changes",
      phase: "operatingConditions",
      text: "Have any process or control conditions changed recently?",
      type: "text",
      required: false
    }
  ];

  /**
   * Phase 4: Maintenance and Event History Questions
   */
  private static readonly PHASE_4_QUESTIONS: QuestionDefinition[] = [
    {
      id: "last_maintenance_date",
      phase: "maintenanceHistory", 
      text: "When was the last maintenance performed?",
      type: "date",
      required: false
    },
    {
      id: "last_maintenance_type",
      phase: "maintenanceHistory",
      text: "Type of last maintenance",
      type: "select",
      options: ["preventive", "corrective", "overhaul", "inspection", "unknown"],
      required: false
    },
    {
      id: "recent_parts_replaced",
      phase: "maintenanceHistory",
      text: "What parts/components were recently replaced or adjusted?",
      type: "text", 
      required: false
    },
    {
      id: "recent_work_performed",
      phase: "maintenanceHistory",
      text: "Was there any recent work, installation, or modifications?",
      type: "text",
      required: false
    },
    {
      id: "similar_problems_history", 
      phase: "maintenanceHistory",
      text: "Is there a history of similar problems/failures on this equipment?",
      type: "text",
      required: false
    },
    {
      id: "recent_process_upsets",
      phase: "maintenanceHistory",
      text: "Have any process upsets or abnormal events occurred recently?",
      type: "text",
      required: false
    }
  ];

  /**
   * Phase 5: Human/Operational Factors Questions
   */
  private static readonly PHASE_5_QUESTIONS: QuestionDefinition[] = [
    {
      id: "operator_at_failure",
      phase: "humanFactors",
      text: "Who was operating the equipment when the issue occurred?",
      type: "text",
      required: false
    },
    {
      id: "operator_experience",
      phase: "humanFactors", 
      text: "Operator experience level",
      type: "select",
      options: ["experienced", "new", "in training", "unknown"],
      required: false
    },
    {
      id: "known_operator_errors",
      phase: "humanFactors",
      text: "Were there any known operator errors or deviations from SOP?",
      type: "text",
      required: false
    }
  ];

  /**
   * Phase 6: Design, Installation & External Factors Questions
   */
  private static readonly PHASE_6_QUESTIONS: QuestionDefinition[] = [
    {
      id: "equipment_modifications",
      phase: "designFactors",
      text: "Has the equipment been modified, upgraded, or relocated?",
      type: "text",
      required: false
    },
    {
      id: "installation_compliance",
      phase: "designFactors",
      text: "Is the equipment installed according to manufacturer specifications?",
      type: "select",
      options: ["yes", "no", "unknown"],
      required: false
    },
    {
      id: "external_factors",
      phase: "designFactors", 
      text: "Any external factors that could have contributed? (weather, vibration, construction, etc.)",
      type: "text",
      required: false
    }
  ];

  /**
   * Phase 7: Evidence & Data Collection Questions
   */
  private static readonly PHASE_7_QUESTIONS: QuestionDefinition[] = [
    {
      id: "inspection_reports_available",
      phase: "additionalEvidence",
      text: "Are there any inspection reports available?",
      type: "boolean",
      required: false
    },
    {
      id: "photos_available",
      phase: "additionalEvidence",
      text: "Are photos or videos available?", 
      type: "boolean",
      required: false
    },
    {
      id: "test_results_available",
      phase: "additionalEvidence",
      text: "Are there relevant test results available?",
      type: "boolean",
      required: false
    },
    {
      id: "trend_data_available",
      phase: "additionalEvidence",
      text: "Are there relevant trends or time series plots for critical parameters?",
      type: "boolean",
      required: false
    },
    {
      id: "other_observations",
      phase: "additionalEvidence",
      text: "Anything else observed or suspected that might be relevant?",
      type: "text",
      required: false
    }
  ];

  /**
   * Equipment-specific conditional questions (Phase 8)
   */
  private static readonly EQUIPMENT_SPECIFIC_QUESTIONS: Record<string, QuestionDefinition[]> = {
    valve: [
      {
        id: "valve_actuator_type",
        phase: "equipmentSpecific",
        text: "What type of actuator?",
        type: "select",
        options: ["manual", "electric", "pneumatic", "hydraulic"],
        required: false,
        equipmentSpecific: ["valve"]
      },
      {
        id: "valve_leak_location",
        phase: "equipmentSpecific", 
        text: "Where is the leak located?",
        type: "select",
        options: ["seat", "stem", "body", "bonnet", "unknown"],
        required: false,
        equipmentSpecific: ["valve"],
        dependsOn: { questionId: "observed_problem", value: "leak" }
      },
      {
        id: "valve_cycling_frequency",
        phase: "equipmentSpecific",
        text: "Was the valve cycled frequently before the failure?",
        type: "select",
        options: ["yes", "no", "unknown"],
        required: false,
        equipmentSpecific: ["valve"]
      }
    ],
    pump: [
      {
        id: "pump_type",
        phase: "equipmentSpecific",
        text: "What type of pump?",
        type: "select",
        options: ["centrifugal", "reciprocating", "screw", "diaphragm", "other"],
        required: false,
        equipmentSpecific: ["pump"]
      },
      {
        id: "pump_cavitation_signs",
        phase: "equipmentSpecific",
        text: "Were there signs of cavitation?",
        type: "boolean",
        required: false,
        equipmentSpecific: ["pump"]
      },
      {
        id: "pump_seal_leakage",
        phase: "equipmentSpecific",
        text: "Any signs of seal leakage?",
        type: "boolean", 
        required: false,
        equipmentSpecific: ["pump"]
      },
      {
        id: "pump_suction_condition",
        phase: "equipmentSpecific",
        text: "What was the suction condition?",
        type: "text",
        required: false,
        equipmentSpecific: ["pump"]
      }
    ],
    motor: [
      {
        id: "motor_overcurrent_trip",
        phase: "equipmentSpecific",
        text: "Was there an overcurrent/trip event?",
        type: "boolean",
        required: false,
        equipmentSpecific: ["motor"]
      },
      {
        id: "motor_insulation_signs",
        phase: "equipmentSpecific",
        text: "Any signs of insulation breakdown, hot spots, or arcing?",
        type: "text",
        required: false,
        equipmentSpecific: ["motor"]
      }
    ]
  };

  /**
   * Get all base questions (phases 1-7) that apply to any equipment
   */
  static getAllBaseQuestions(): QuestionDefinition[] {
    return [
      ...this.PHASE_1_QUESTIONS,
      ...this.PHASE_2_QUESTIONS, 
      ...this.PHASE_3_QUESTIONS,
      ...this.PHASE_4_QUESTIONS,
      ...this.PHASE_5_QUESTIONS,
      ...this.PHASE_6_QUESTIONS,
      ...this.PHASE_7_QUESTIONS
    ];
  }

  /**
   * Get equipment-specific follow-up questions based on equipment type and existing answers
   */
  static getEquipmentSpecificQuestions(equipmentType: string, existingAnswers: Record<string, any>): QuestionDefinition[] {
    const equipmentQuestions = this.EQUIPMENT_SPECIFIC_QUESTIONS[equipmentType] || [];
    
    return equipmentQuestions.filter(question => {
      // Check if question has dependencies
      if (question.dependsOn) {
        const dependentAnswer = existingAnswers[question.dependsOn.questionId];
        const requiredValue = question.dependsOn.value;
        
        if (Array.isArray(requiredValue)) {
          return requiredValue.includes(dependentAnswer);
        }
        return dependentAnswer === requiredValue;
      }
      
      return true;
    });
  }

  /**
   * Validate that required evidence has been collected
   */
  static validateEvidenceCompleteness(evidenceData: Partial<EvidenceData>): {
    isComplete: boolean;
    missingRequired: string[];
    canProceedToAnalysis: boolean;
  } {
    const missingRequired: string[] = [];

    // Check required fields from Phase 1 (Asset Context)
    if (!evidenceData.assetContext?.equipmentType) {
      missingRequired.push("Equipment Type");
    }
    if (!evidenceData.assetContext?.location) {
      missingRequired.push("Equipment Location");
    }

    // Check required fields from Phase 2 (Symptom Definition)
    if (!evidenceData.symptomDefinition?.observedProblem) {
      missingRequired.push("Observed Problem/Symptom");
    }

    const isComplete = missingRequired.length === 0;
    
    // Can proceed to analysis if we have the minimum required information
    const canProceedToAnalysis = evidenceData.assetContext?.equipmentType && 
                                evidenceData.assetContext?.location &&
                                evidenceData.symptomDefinition?.observedProblem;

    return {
      isComplete,
      missingRequired,
      canProceedToAnalysis: !!canProceedToAnalysis
    };
  }

  /**
   * Structure questionnaire answers into EvidenceData format
   */
  static structureEvidenceData(answers: Record<string, any>): EvidenceData {
    return {
      assetContext: {
        equipmentType: answers.equipment_type || "",
        subtype: answers.equipment_subtype,
        mainFunction: answers.main_function,
        location: answers.location || "",
        assetAge: {
          inServiceSince: answers.in_service_since,
          totalRunHours: answers.total_run_hours
        }
      },
      symptomDefinition: {
        observedProblem: answers.observed_problem || "",
        symptomLocation: answers.symptom_location,
        firstNoticed: {
          dateTime: answers.first_noticed,
          operatingState: answers.operating_state_when_noticed
        },
        problemPattern: answers.problem_pattern,
        alarmsActivated: answers.alarms_activated ? [{ alarmName: answers.alarms_activated }] : []
      },
      operatingConditions: {
        currentParameters: {
          flow: answers.current_flow_rate ? { rate: answers.current_flow_rate } : undefined,
          pressure: {
            upstream: answers.current_pressure_upstream,
            downstream: answers.current_pressure_downstream
          },
          temperature: {
            inlet: answers.current_temperature_inlet,
            outlet: answers.current_temperature_outlet
          },
          speed: answers.current_speed ? { rpm: answers.current_speed } : undefined,
          vibration: answers.current_vibration_level ? { 
            horizontal: answers.current_vibration_level 
          } : undefined
        },
        recentChanges: {
          processChanges: answers.recent_process_changes ? [answers.recent_process_changes] : []
        }
      },
      maintenanceHistory: {
        lastMaintenance: {
          date: answers.last_maintenance_date,
          type: answers.last_maintenance_type
        },
        recentWork: {
          partsReplaced: answers.recent_parts_replaced ? [answers.recent_parts_replaced] : [],
          installations: answers.recent_work_performed ? [answers.recent_work_performed] : []
        },
        similarProblems: answers.similar_problems_history ? [{
          description: answers.similar_problems_history
        }] : [],
        processUpsets: answers.recent_process_upsets ? [{
          description: answers.recent_process_upsets
        }] : []
      },
      humanFactors: {
        operatorAtTime: {
          operatorId: answers.operator_at_failure,
          experienceLevel: answers.operator_experience
        },
        operationalErrors: {
          knownErrors: answers.known_operator_errors ? [answers.known_operator_errors] : []
        }
      },
      designFactors: {
        modifications: answers.equipment_modifications ? [{
          description: answers.equipment_modifications
        }] : [],
        installationCompliance: answers.installation_compliance === "yes",
        externalFactors: {
          other: answers.external_factors ? [answers.external_factors] : []
        }
      },
      additionalEvidence: {
        inspectionReports: answers.inspection_reports_available ? [{ type: "Available", findings: "Referenced" }] : [],
        photos: answers.photos_available,
        testResults: answers.test_results_available ? [{ testType: "Available", results: "Referenced" }] : [],
        trendData: answers.trend_data_available ? [{ parameter: "Available", trend: "Referenced", timeframe: "Historical" }] : [],
        otherObservations: answers.other_observations
      },
      equipmentSpecific: this.structureEquipmentSpecific(answers),
      completedPhases: ["assetContext", "symptomDefinition", "operatingConditions", "maintenanceHistory", "humanFactors", "designFactors", "additionalEvidence"],
      requiredFollowUps: []
    };
  }

  /**
   * Structure equipment-specific data based on answers
   */
  private static structureEquipmentSpecific(answers: Record<string, any>): EvidenceData['equipmentSpecific'] {
    const equipmentType = answers.equipment_type;
    
    switch (equipmentType) {
      case 'valve':
        return {
          valve: {
            actuatorType: answers.valve_actuator_type,
            leakLocation: answers.valve_leak_location,
            cyclingFrequency: answers.valve_cycling_frequency
          }
        };
      case 'pump':
        return {
          pump: {
            pumpType: answers.pump_type,
            cavitationSigns: answers.pump_cavitation_signs,
            sealLeakage: answers.pump_seal_leakage,
            suctionCondition: answers.pump_suction_condition
          }
        };
      case 'motor':
        return {
          electrical: {
            overcurrentTrip: answers.motor_overcurrent_trip,
            insulationBreakdown: !!answers.motor_insulation_signs,
            hotSpots: answers.motor_insulation_signs?.includes('hot spots'),
            arcingSigns: answers.motor_insulation_signs?.includes('arcing')
          }
        };
      default:
        return undefined;
    }
  }

  /**
   * Generate a summary of collected evidence for review
   */
  static generateEvidenceSummary(evidenceData: EvidenceData): string {
    const summary = [];
    
    summary.push(`Equipment: ${evidenceData.assetContext.equipmentType}`);
    if (evidenceData.assetContext.subtype) {
      summary.push(`Type: ${evidenceData.assetContext.subtype}`);
    }
    summary.push(`Location: ${evidenceData.assetContext.location}`);
    summary.push(`Problem: ${evidenceData.symptomDefinition.observedProblem}`);
    
    if (evidenceData.symptomDefinition.symptomLocation) {
      summary.push(`Location: ${evidenceData.symptomDefinition.symptomLocation}`);
    }
    
    if (evidenceData.maintenanceHistory.lastMaintenance?.date) {
      summary.push(`Last Maintenance: ${evidenceData.maintenanceHistory.lastMaintenance.date}`);
    }

    return summary.join(' | ');
  }
}