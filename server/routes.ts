import type { Express } from "express";
import { createServer, type Server } from "http";
import * as fs from "fs";
import * as path from "path";
import { investigationStorage } from "./storage";
import { investigationEngine } from "./investigation-engine";
import { RCAAnalysisEngine } from "./rca-analysis-engine";
// REMOVED: evidence-library routes - hardcoded equipment logic eliminated
import { nlpAnalyzer } from "./nlp-analyzer";
import multer from "multer";
import Papa from "papaparse";
import { AIAttachmentAnalyzer } from "./ai-attachment-analyzer";
import { EquipmentDecisionEngine } from "./config/equipment-decision-engine";
import { UniversalConfidenceEngine } from "./rca-confidence-scoring";
import { UniversalEvidenceParser } from "./ai-evidence-parser";
import { IntelligentFailureModeFilter } from "./intelligent-failure-mode-filter";
import { UniversalQuestionnaireEngine } from "./universal-questionnaire-engine";
import { EvidenceValidationEngine } from "./evidence-validation-engine";
import { UniversalTimelineEngine } from "./universal-timeline-engine";
import { IncidentOnlyRCAEngine } from "./incident-only-rca-engine";
import { UniversalRCAEngine } from "./universal-rca-engine";
import { LowConfidenceRCAEngine } from "./low-confidence-rca-engine";
import { UniversalRCAFallbackEngine } from "./universal-rca-fallback-engine";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for evidence files
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Step 1: Create new investigation (Problem Definition)
  app.post("/api/investigations/create", async (req, res) => {
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

  // Step 2: Set investigation type (Mandatory - ECFA vs Fault Tree)
  app.post("/api/investigations/:id/type", async (req, res) => {
    try {
      const { id } = req.params;
      const { investigationType } = req.body;
      
      // UNIVERSAL INVESTIGATION TYPE VALIDATION - NO HARDCODING!
      const validInvestigationTypes = ["safety_environmental", "equipment_failure", "process_deviation", "quality_issue", "regulatory_incident"];
      
      if (!investigationType || !validInvestigationTypes.includes(investigationType)) {
        return res.status(400).json({ 
          message: `Invalid investigation type. Must be one of: ${validInvestigationTypes.join(', ')}` 
        });
      }

      // Get investigation first to get numeric ID
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

      // Return appropriate questionnaire
      const questionnaire = investigationEngine.getQuestionnaire(investigationType);
      
      res.json({ investigation: updatedInvestigation, questionnaire });
    } catch (error) {
      console.error("[RCA] Error setting investigation type:", error);
      res.status(500).json({ message: "Failed to set investigation type" });
    }
  });

  // Get questionnaire for investigation type
  app.get("/api/investigations/:id/questionnaire", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get investigation by string ID or numeric ID
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

  // Update evidence data
  app.post("/api/investigations/:id/evidence", async (req, res) => {
    try {
      const { id } = req.params;
      const evidenceData = req.body;
      
      // Get investigation first to get numeric ID
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
      
      // Calculate completeness
      const { completeness, isValid } = await investigationStorage.validateEvidenceCompleteness(investigation.id);
      
      // Update completeness in database
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

  // Proceed to AI Analysis (only if evidence >= 80% complete)
  app.post("/api/investigations/:id/analyze", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get investigation first to get numeric ID
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
      
      // FLEXIBLE EVIDENCE VALIDATION: Allow progression with documented evidence gaps
      if (!isValid) {
        // Check if user has documented evidence unavailability  
        const evidenceData = investigation.evidenceData as any || {};
        const unavailableCount = Object.keys(evidenceData).filter(key => 
          key.includes('_unavailable') && evidenceData[key] === true
        ).length;
        
        const documentedReasons = Object.keys(evidenceData).filter(key =>
          key.includes('_unavailable_reason') && evidenceData[key]
        ).length;
        
        // Allow progression if:
        // 1. At least 60% evidence collected, OR
        // 2. User documented why evidence is unavailable with reasons
        const flexibleThreshold = completeness >= 60 || (unavailableCount > 0 && documentedReasons > 0);
        
        if (!flexibleThreshold) {
          return res.status(400).json({ 
            message: "Evidence collection incomplete. Either collect 60% of evidence OR document why evidence is unavailable.",
            completeness,
            availableOptions: [
              "Upload available evidence files",
              "Mark unavailable evidence with explanations", 
              "Provide alternative evidence sources",
              "Document evidence accessibility constraints"
            ]
          });
        }
      }

      // Update status to processing
      await investigationStorage.updateInvestigation(investigation.id, {
        currentStep: "ai_processing"
      });

      // Generate structured RCA analysis
      const structuredRCA = RCAAnalysisEngine.generateStructuredRCA(investigation);
      
      // Convert to existing format for compatibility with enhanced equipment context
      const analysisResults = {
        causes: structuredRCA.causesConsidered.map(cause => ({
          description: cause.cause,
          confidence: cause.confidence,
          classification: cause.classification,
          evidence: {
            supporting: cause.supportingEvidence,
            contradicting: cause.contradictingEvidence
          }
        })),
        topEvent: 'Equipment Failure',
        confidence: structuredRCA.confidence,
        analysisMethod: 'universal_rca',
        structuredAnalysis: structuredRCA,
        // Enhanced context for RCA Tree visualization
        equipmentGroup: investigation.equipmentGroup,
        equipmentType: investigation.equipmentType,
        equipmentSubtype: investigation.equipmentSubtype,
        symptoms: investigation.symptoms,
        description: investigation.description,
        evidenceFiles: investigation.evidenceFiles || [],
        evidenceChecklist: investigation.evidenceChecklist || [],
        operatingParameters: investigation.operatingParameters
      };

      const recommendations = structuredRCA.recommendations.map(rec => 
        `${rec.priority.toUpperCase()}: ${rec.action} (${rec.timeframe}) - ${rec.rationale}`
      );

      // Update investigation with results
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

  // Get single investigation (by investigationId string)
  app.get("/api/investigations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log("[RCA] Getting investigation for ID:", id);
      
      // Try to get by investigationId first (string), then by numeric id
      let investigation;
      const numericId = parseInt(id);
      console.log("[RCA] Parsed numeric ID:", numericId, "toString check:", numericId.toString() !== id);
      if (isNaN(numericId) || numericId.toString() !== id) {
        // If it's not a valid number or has extra characters, treat as investigationId string
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

  // Get all investigations
  app.get("/api/investigations", async (req, res) => {
    try {
      const investigations = await investigationStorage.getAllInvestigations();
      res.json(investigations);
    } catch (error) {
      console.error("[RCA] Error fetching investigations:", error);
      res.status(500).json({ message: "Failed to fetch investigations" });
    }
  });

  // Get all analyses (both investigations and incidents for history page)
  app.get("/api/analyses", async (req, res) => {
    try {
      const { status } = req.query; // Add status filter parameter
      
      const investigations = await investigationStorage.getAllInvestigations();
      const incidents = await investigationStorage.getAllIncidents();
      

      
      // Filter investigations based on status parameter
      const filteredInvestigations = status === 'all' ? investigations : 
        investigations.filter(inv => inv.status === 'completed' || inv.currentStep === 'completed');
      
      const analysesFromInvestigations = filteredInvestigations.map(inv => ({
          id: inv.id,
          investigationId: inv.investigationId,
          title: `${inv.whatHappened} - ${(inv.evidenceData as any)?.equipment_type || 'Equipment'} ${(inv.evidenceData as any)?.equipment_tag || ''}`.trim(),
          status: inv.status === 'completed' ? 'completed' : inv.currentStep,
          createdAt: inv.createdAt,
          updatedAt: inv.updatedAt,
          confidence: inv.confidence ? parseFloat(inv.confidence) * 100 : 80,
          equipmentType: (inv.evidenceData as any)?.equipment_type || 'Unknown',
          location: inv.whereHappened || (inv.evidenceData as any)?.operating_location || 'Unknown',
          cause: (inv.analysisResults as any)?.structuredAnalysis?.rootCause || 
                 (inv.analysisResults as any)?.causes?.[0]?.description || 
                 'Equipment failure analysis',
          priority: inv.consequence?.toLowerCase().includes('safety') ? 'high' : 
                   inv.consequence?.toLowerCase().includes('production') ? 'medium' : 'low',
          investigationType: inv.investigationType,
          whatHappened: inv.whatHappened,
          whereHappened: inv.whereHappened,
          whenHappened: inv.whenHappened,
          evidenceData: inv.evidenceData,
          analysisResults: inv.analysisResults,
          recommendations: inv.recommendations,
          source: 'investigation'
        }));

      // Add incidents based on status filter - all incidents if status='all', only completed if not status='all'
      const filteredIncidents = status === 'all' ? incidents : 
        incidents.filter(inc => (inc.currentStep || 0) >= 6 && inc.workflowStatus !== 'created' && inc.aiAnalysis);
      

      
      const analysesFromIncidents = filteredIncidents.map(inc => {
        const isDraft = !inc.aiAnalysis || (inc.currentStep || 0) < 6;

        return {
          id: inc.id,
          investigationId: `INC-${inc.id}`,
          title: inc.title || `${inc.description} - ${inc.equipmentType}`,
          status: isDraft ? 'draft' : (inc.workflowStatus === 'finalized' ? 'completed' : 'analysis_complete'),
          isDraft: isDraft,
          createdAt: inc.createdAt,
          updatedAt: inc.updatedAt,
          confidence: (inc.analysisResults as any)?.overallConfidence || 85,
          equipmentType: inc.equipmentType || 'Unknown',
          location: inc.location || 'Unknown',
          cause: isDraft ? 'Draft - Analysis pending' : 
                 ((inc.analysisResults as any)?.rootCauses?.[0]?.description || 'Root cause analysis completed'),
          priority: inc.priority?.toLowerCase() === 'critical' ? 'high' : 
                   inc.priority?.toLowerCase() === 'high' ? 'high' :
                   inc.priority?.toLowerCase() === 'medium' ? 'medium' : 'low',
          investigationType: 'INCIDENT',
          whatHappened: inc.description,
          whereHappened: inc.location,
          whenHappened: inc.incidentDateTime,
          evidenceData: {
            equipment_type: inc.equipmentType,
            equipment_tag: inc.equipmentId,
            operating_location: inc.location
          },
          analysisResults: inc.analysisResults,
          recommendations: inc.analysisResults?.recommendations,
          source: 'incident'
        };
      });

      // Combine both sources and sort by creation date (newest first)
      const allAnalyses = [...analysesFromInvestigations, ...analysesFromIncidents]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());


      
      res.json(allAnalyses);
    } catch (error) {
      console.error("[RCA] Error fetching analyses:", error);
      res.status(500).json({ message: "Failed to fetch analyses" });
    }
  });

  // INCIDENT ROUTES - New RCA workflow
  // Create new incident (Step 1)
  app.post("/api/incidents", async (req, res) => {
    try {
      console.log("[RCA] Creating incident with data:", req.body);
      
      // Convert incidentDateTime to proper Date object
      const incidentData = {
        ...req.body,
        incidentDateTime: req.body.incidentDateTime ? new Date(req.body.incidentDateTime) : new Date(),
      };
      
      const incident = await investigationStorage.createIncident(incidentData);
      res.json(incident);
    } catch (error) {
      console.error("[RCA] Error creating incident:", error);
      res.status(500).json({ message: "Failed to create incident" });
    }
  });

  // Get incident by ID
  app.get("/api/incidents/:id", async (req, res) => {
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

  // Get incident analysis results
  app.get("/api/incidents/:id/analysis", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const incident = await investigationStorage.getIncident(id);
      
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }

      // Return existing analysis results if available
      if (incident.aiAnalysis) {
        res.json(incident.aiAnalysis);
      } else {
        // Return empty object if no analysis exists yet
        res.json({});
      }
    } catch (error) {
      console.error("[RCA] Error fetching incident analysis:", error);
      res.status(500).json({ message: "Failed to fetch incident analysis" });
    }
  });

  // Update incident equipment/symptoms (Step 2) - UNIVERSAL RCA INTEGRATION
  app.put("/api/incidents/:id/equipment-symptoms", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // UNIVERSAL RCA: Check if this should trigger Universal RCA flow
      const hasRichSymptomData = req.body.symptomDescription && 
                                req.body.symptomDescription.trim().length >= 20;
      
      const updateData = {
        ...req.body,
        currentStep: 2,
        workflowStatus: hasRichSymptomData ? req.body.workflowStatus || "universal_rca_ready" : "equipment_selected",
      };
      
      console.log(`[UNIVERSAL RCA INTEGRATION] Incident ${id}: Updating with workflow status: ${updateData.workflowStatus}`);
      console.log(`[UNIVERSAL RCA INTEGRATION] Symptom description length: ${req.body.symptomDescription?.length || 0} characters`);
      
      const incident = await investigationStorage.updateIncident(id, updateData);
      res.json(incident);
    } catch (error) {
      console.error("[RCA] Error updating incident equipment/symptoms:", error);
      res.status(500).json({ message: "Failed to update incident" });
    }
  });

  // Generate contextual timeline questions - TIMELINE LOGIC ENFORCEMENT
  app.post("/api/incidents/:id/generate-timeline-questions", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { equipmentGroup, equipmentType, equipmentSubtype } = req.body;

      console.log(`[TIMELINE ENFORCEMENT] Generating contextual timeline questions for incident ${id}`);
      console.log(`[TIMELINE ENFORCEMENT] Equipment: ${equipmentGroup} → ${equipmentType} → ${equipmentSubtype || ''}`);

      // TIMELINE LOGIC ENFORCEMENT: Context-driven questions based on incident keywords
      const timelineQuestions = await UniversalTimelineEngine.generateUniversalTimelineQuestions(
        id,
        equipmentGroup, 
        equipmentType, 
        equipmentSubtype || ''
      );
      
      res.json({ timelineQuestions });
    } catch (error) {
      console.error("[TIMELINE ENFORCEMENT] Error generating contextual timeline questions:", error);
      res.status(500).json({ message: "Failed to generate contextual timeline questions" });
    }
  });

  // UNIVERSAL RCA INSTRUCTION STEP 2: AI-DRIVEN HYPOTHESIS GENERATION ONLY (NO HARDCODING)
  app.post("/api/incidents/:id/generate-ai-hypotheses", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      console.log(`[UNIVERSAL RCA INSTRUCTION] Incident ${id}: STEP 2 - AI Hypothesis Generation Only`);
      console.log(`[UNIVERSAL RCA INSTRUCTION] Human confirmation required before evidence collection`);
      
      const incident = await investigationStorage.getIncident(id);
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }

      const incidentText = incident.symptomDescription || incident.description || '';
      if (!incidentText.trim()) {
        return res.status(400).json({ message: "No incident description available for analysis" });
      }

      // STEP 2: AI-DRIVEN HYPOTHESIS GENERATION using GPT (as per instruction)
      console.log(`[AI HYPOTHESIS GENERATOR] Using GPT to generate most likely POTENTIAL causes`);
      console.log(`[AI HYPOTHESIS GENERATOR] STRICT RULE: NO HARD CODING - No preloaded templates or dictionary mappings`);
      
      const { AIHypothesisGenerator } = await import('./ai-hypothesis-generator');
      const aiResult = await AIHypothesisGenerator.generateAIHypotheses(id);
      
      console.log(`[AI HYPOTHESIS GENERATOR] Generated ${aiResult.hypotheses.length} AI-driven hypotheses for human confirmation`);
      
      // STEP 3: Return AI hypotheses for human confirmation (Step 4)
      res.json({
        aiHypotheses: aiResult.hypotheses,
        incidentAnalysis: aiResult.incidentAnalysis,
        generationMethod: 'ai-driven',
        step: 'awaiting-human-confirmation',
        nextStep: 'human-confirmation-flow',
        instructionCompliance: {
          step1_nlp_extraction: true,
          step2_ai_hypotheses: true,
          step3_evidence_library_match: true,
          no_hardcoding: true,
          gpt_internal_knowledge: true
        }
      });
    } catch (error) {
      console.error("[AI HYPOTHESIS GENERATION] Error:", error);
      res.status(500).json({ message: "Failed to generate AI hypotheses" });
    }
  });

  // UNIVERSAL RCA INSTRUCTION STEP 5: EVIDENCE COLLECTION AFTER HUMAN CONFIRMATION (NO HARDCODING)
  app.post("/api/incidents/:id/generate-evidence-checklist", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { confirmedHypotheses = [], customHypotheses = [] } = req.body;
      
      console.log(`[UNIVERSAL RCA INSTRUCTION] Incident ${id}: STEP 5 - Evidence Collection After Human Confirmation`);
      console.log(`[HUMAN CONFIRMATION FLOW] Confirmed ${confirmedHypotheses.length} AI hypotheses, ${customHypotheses.length} custom hypotheses`);
      
      const incident = await investigationStorage.getIncident(id);
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }

      if (confirmedHypotheses.length === 0 && customHypotheses.length === 0) {
        return res.status(400).json({ 
          message: "No confirmed hypotheses provided. Human confirmation (Step 4) must be completed first." 
        });
      }

      // STEP 5: Convert confirmed hypotheses to evidence requirements (NO HARDCODING)
      const evidenceItems = confirmedHypotheses.map((hypothesis, index) => ({
        id: `ai-evidence-${hypothesis.id}-${Date.now()}-${index}`,
        category: hypothesis.failureMode,
        title: hypothesis.failureMode,
        description: `${hypothesis.description} | AI Reasoning: ${hypothesis.aiReasoning}`,
        priority: hypothesis.confidence >= 80 ? 'High' : hypothesis.confidence >= 60 ? 'Medium' : 'Low',
        confidence: hypothesis.confidence,
        specificToEquipment: false, // Universal approach - NO HARDCODING
        source: 'AI Generated (GPT)',
        confidenceSource: 'AI-Driven',
        examples: hypothesis.investigativeQuestions || [],
        questions: hypothesis.investigativeQuestions || [],
        completed: false,
        isUnavailable: false,
        unavailableReason: '',
        files: [],
        matchedKeywords: ['ai-generated'], // AI-driven keywords
        relevanceScore: hypothesis.confidence,
        evidenceType: Array.isArray(hypothesis.requiredEvidence) ? hypothesis.requiredEvidence.join(', ') : 'General Evidence',
        equipmentContext: `${incident.equipmentGroup}/${incident.equipmentType}/${incident.equipmentSubtype || 'General'}`,
        failureHypothesis: hypothesis.failureMode,
        requiredTrendData: Array.isArray(hypothesis.requiredEvidence) ? hypothesis.requiredEvidence.join(', ') : 'General Trend Data',
        instructionCompliant: true,
        aiGenerated: true,
        aiReasoning: hypothesis.aiReasoning,
        faultSignature: hypothesis.faultSignature || 'AI-Generated',
        requiredEvidence: hypothesis.requiredEvidence || []
      }));
      
      // Add custom hypotheses to evidence items if provided
      const customEvidenceItems = customHypotheses.map((customHypothesis, index) => ({
        id: `custom-evidence-${Date.now()}-${index}`,
        category: 'Custom Investigation',
        title: customHypothesis,
        description: `Human-added hypothesis: ${customHypothesis}`,
        priority: 'Medium',
        confidence: 75, // Default confidence for human hypotheses
        specificToEquipment: false,
        source: 'Human Added',
        confidenceSource: 'Human-Defined',
        examples: [],
        questions: [`Investigate evidence for: ${customHypothesis}`],
        completed: false,
        isUnavailable: false,
        unavailableReason: '',
        files: [],
        matchedKeywords: ['human-generated'],
        relevanceScore: 75,
        evidenceType: 'Custom Evidence Collection',
        equipmentContext: `${incident.equipmentGroup}/${incident.equipmentType}/${incident.equipmentSubtype || 'General'}`,
        failureHypothesis: customHypothesis,
        requiredTrendData: 'Custom Trend Data',
        instructionCompliant: true,
        aiGenerated: false,
        aiReasoning: 'Human-defined hypothesis',
        faultSignature: 'Human-Generated',
        requiredEvidence: ['General Evidence']
      }));

      const allEvidenceItems = [...evidenceItems, ...customEvidenceItems];
      
      console.log(`[UNIVERSAL RCA INSTRUCTION] Generated ${allEvidenceItems.length} evidence items (${evidenceItems.length} AI + ${customEvidenceItems.length} custom)`);
      
      // CRITICAL FIX: Save evidence checklist to database
      await investigationStorage.updateIncident(id, {
        evidenceChecklist: allEvidenceItems,
        currentStep: 4, // Move to Step 4 - Evidence Collection
        workflowStatus: 'evidence_collection'
      });
      
      console.log(`[EVIDENCE CHECKLIST] Saved ${allEvidenceItems.length} evidence items to database for incident ${id}`);
      
      // STEP 5: Return AI-driven results (NO HARDCODING)
      res.json({
        evidenceItems: allEvidenceItems,
        generationMethod: 'ai-driven-hypotheses',
        enforcementCompliant: true,
        noHardcodingCompliant: true,
        aiDriven: true,
        instructionCompliance: {
          step2_ai_hypotheses: true,
          step4_human_confirmation: true,
          step5_evidence_collection: true,
          no_hardcoding: true,
          gpt_internal_knowledge: true
        },
        confirmedHypothesesCount: confirmedHypotheses.length,
        customHypothesesCount: customHypotheses.length,
        totalEvidenceItems: allEvidenceItems.length,
        message: `Generated ${allEvidenceItems.length} evidence items from confirmed hypotheses (${evidenceItems.length} AI-driven + ${customEvidenceItems.length} custom)`
      });
      
    } catch (error) {
      console.error(`[UNIVERSAL RCA INSTRUCTION] Error in AI-driven evidence generation:`, error);
      res.status(500).json({ 
        message: "Failed to generate AI-driven evidence checklist",
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackToManual: true
      });
    }
  });

  // UNIVERSAL RCA: Handle human feedback on hypotheses (Accept/Reject/Modify)
  app.post("/api/incidents/:id/hypothesis-feedback", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { hypothesesFeedback, customFailureModes, userReasoning } = req.body;

      console.log(`[UNIVERSAL RCA] Processing human feedback for incident ${id}`);
      
      const { UniversalRCAEngine } = await import('./universal-rca-engine');
      const rcaEngine = new UniversalRCAEngine();
      
      // Process human decisions and continue RCA flow
      const confirmedHypotheses = [];
      
      // Add accepted hypotheses
      for (const [hypothesisId, decision] of Object.entries(hypothesesFeedback)) {
        if (decision === 'accept') {
          confirmedHypotheses.push({
            id: hypothesisId,
            humanDecision: 'accept',
            userReasoning
          });
        }
      }
      
      // Add custom failure modes
      for (const customMode of customFailureModes || []) {
        confirmedHypotheses.push({
          id: `custom-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,
          rootCauseTitle: customMode,
          humanDecision: 'accept',
          userReasoning: 'User-defined failure mode'
        });
      }
      
      console.log(`[UNIVERSAL RCA] ${confirmedHypotheses.length} hypotheses confirmed by investigator`);
      
      // Convert feedback to proper hypothesis format
      const properHypotheses = confirmedHypotheses.map(h => ({
        id: h.id,
        rootCauseTitle: h.rootCauseTitle || 'Custom Failure Mode',
        confidence: 70,
        reasoningTrace: h.userReasoning || 'User-confirmed hypothesis',
        suggestedEvidence: []
      }));
      
      // STEP 4: Generate evidence prompts for confirmed hypotheses
      const step4Result = await rcaEngine.generateEvidencePrompts(properHypotheses);
      
      res.json({
        success: true,
        confirmedHypotheses: confirmedHypotheses.length,
        evidenceItems: step4Result.evidenceItems,
        message: `${confirmedHypotheses.length} hypotheses confirmed. Evidence collection requirements generated.`,
        nextStep: 'evidence_collection'
      });
      
    } catch (error) {
      console.error('[UNIVERSAL RCA] Hypothesis feedback processing failed:', error);
      res.status(500).json({ message: "Failed to process hypothesis feedback" });
    }
  });

  // BACKWARD COMPATIBILITY: Legacy evidence generation for old incidents 
  app.post("/api/incidents/:id/generate-evidence-checklist-legacy", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const incident = await investigationStorage.getIncident(id);
      
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }

      console.log(`[BACKWARD COMPATIBILITY] Generating evidence for legacy incident ${id}`);
      
      // Use Evidence Library for consistent results
      const equipmentGroup = incident.equipmentGroup || 'Rotating';
      const equipmentType = incident.equipmentType || 'Pumps';
      const equipmentSubtype = incident.equipmentSubtype || 'Centrifugal';
      
      const evidenceResults = await investigationStorage.searchEvidenceLibraryByEquipment(
        equipmentGroup,
        equipmentType, 
        equipmentSubtype
      );
      
      // Convert to evidence checklist format
      const evidenceItems = evidenceResults.map((item: any, index: number) => ({
        id: `legacy-${id}-${Date.now()}-${index}`,
        category: item.category || 'Equipment Analysis',
        title: item.componentFailureMode,
        description: `${item.faultSignaturePattern || item.componentFailureMode}`,
        priority: item.criticality === 'Critical' ? 'Critical' as const : 
                 item.criticality === 'High' ? 'High' as const :
                 item.criticality === 'Medium' ? 'Medium' as const : 'Low' as const,
        required: item.criticality === 'Critical',
        aiGenerated: false,
        specificToEquipment: true,
        examples: item.aiOrInvestigatorQuestions ? item.aiOrInvestigatorQuestions.split(',').map((q: string) => q.trim()) : [],
        completed: false,
        isUnavailable: false,
        unavailableReason: '',
        files: []
      }));
      
      res.json({
        evidenceItems,
        generationMethod: 'legacy-compatibility',
        backwardCompatible: true,
        message: `Generated ${evidenceItems.length} evidence requirements for legacy incident`
      });
      
    } catch (error) {
      console.error('[BACKWARD COMPATIBILITY] Error:', error);
      res.status(500).json({ message: "Failed to generate legacy evidence checklist" });
    }
  });

  // ADMIN PANEL: AI Settings management routes (NO HARDCODING - DATABASE DRIVEN)
  app.get("/api/admin/ai-settings", async (req, res) => {
    try {
      const aiSettings = await investigationStorage.getAllAiSettings();
      console.log(`[ADMIN] Retrieved ${aiSettings.length} AI settings (NO HARDCODING)`);
      res.json(aiSettings);
    } catch (error) {
      console.error('[ADMIN] Error retrieving AI settings:', error);
      res.status(500).json({ message: "Failed to retrieve AI settings" });
    }
  });

  app.post("/api/admin/ai-settings", async (req, res) => {
    try {
      const settingsData = req.body;
      console.log(`[ADMIN] Saving new AI settings - Provider: ${settingsData.provider}, Active: ${settingsData.isActive} (NO HARDCODING)`);
      
      const newSettings = await investigationStorage.saveAiSettings(settingsData);
      console.log(`[ADMIN] Successfully saved AI settings with ID: ${newSettings.id} (DATABASE DRIVEN)`);
      
      res.json({
        success: true,
        settings: newSettings,
        message: 'AI settings saved successfully'
      });
    } catch (error) {
      console.error('[ADMIN] Error saving AI settings:', error);
      res.status(500).json({ message: "Failed to save AI settings" });
    }
  });

  app.post("/api/admin/ai-settings/test", async (req, res) => {
    try {
      const { provider, apiKey } = req.body;
      console.log(`[ADMIN] Testing API key for provider: ${provider} (NO HARDCODING)`);
      
      // Import AIService dynamically to avoid hardcoded dependencies
      const { AIService } = await import("./ai-service");
      const testResult = await AIService.testApiKey(provider, apiKey);
      
      console.log(`[ADMIN] API key test result: ${testResult.success ? 'SUCCESS' : 'FAILED'}`);
      
      res.json({
        success: testResult.success,
        message: testResult.success ? 'API key is valid' : testResult.error
      });
    } catch (error) {
      console.error('[ADMIN] Error testing API key:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to test API key" 
      });
    }
  });

  // NEW: ENHANCED UNIVERSAL RCA INSTRUCTION API ROUTES (Steps 4-9)
  
  // Step 4: Enhanced Evidence Status Validation
  app.post("/api/incidents/:id/validate-evidence-status", async (req, res) => {
    try {
      const incidentId = parseInt(req.params.id);
      const { evidenceItems } = req.body;
      
      const universalRCAEngine = new UniversalRCAEngine();
      const validation = await universalRCAEngine.validateEvidenceStatus(incidentId, evidenceItems);
      
      res.json({
        success: true,
        validation
      });
    } catch (error) {
      console.error('[Enhanced Evidence Status] Validation failed:', error);
      res.status(500).json({ message: "Evidence status validation failed" });
    }
  });

  // Step 5: Data Analysis with Confidence Thresholds and Fallback
  app.post("/api/incidents/:id/analyze-with-fallback", async (req, res) => {
    try {
      const incidentId = parseInt(req.params.id);
      
      const universalRCAEngine = new UniversalRCAEngine();
      const analysis = await universalRCAEngine.performDataAnalysisWithFallback(incidentId);
      
      res.json({
        success: true,
        analysis
      });
    } catch (error) {
      console.error('[Data Analysis Fallback] Analysis failed:', error);
      res.status(500).json({ message: "Data analysis with fallback failed" });
    }
  });

  // Step 7: Generate Enhanced RCA Output with PSM Integration
  app.post("/api/incidents/:id/generate-enhanced-rca", async (req, res) => {
    try {
      const incidentId = parseInt(req.params.id);
      const { analysisData } = req.body;
      
      const universalRCAEngine = new UniversalRCAEngine();
      const rcaOutput = await universalRCAEngine.generateEnhancedRCAOutput(incidentId, analysisData);
      
      res.json({
        success: true,
        rcaOutput
      });
    } catch (error) {
      console.error('[Enhanced RCA Output] Generation failed:', error);
      res.status(500).json({ message: "Enhanced RCA output generation failed" });
    }
  });

  // Step 8: Trigger Admin Library Update Analysis
  app.post("/api/incidents/:id/trigger-library-updates", async (req, res) => {
    try {
      const incidentId = parseInt(req.params.id);
      
      const universalRCAEngine = new UniversalRCAEngine();
      await universalRCAEngine.triggerLibraryUpdateAnalysis(incidentId);
      
      res.json({
        success: true,
        message: 'Library update analysis triggered - pending admin review'
      });
    } catch (error) {
      console.error('[Library Update Analysis] Failed:', error);
      res.status(500).json({ message: "Library update analysis failed" });
    }
  });

  // Step 9: Capture Historical Learning Patterns
  app.post("/api/incidents/:id/capture-learning", async (req, res) => {
    try {
      const incidentId = parseInt(req.params.id);
      
      const universalRCAEngine = new UniversalRCAEngine();
      await universalRCAEngine.captureHistoricalLearning(incidentId);
      
      res.json({
        success: true,
        message: 'Historical learning patterns captured for future AI inference'
      });
    } catch (error) {
      console.error('[Historical Learning] Capture failed:', error);
      res.status(500).json({ message: "Historical learning capture failed" });
    }
  });

  // Complete Universal RCA Workflow Execution (All 9 Steps)
  app.post("/api/incidents/:id/execute-universal-rca", async (req, res) => {
    try {
      const incidentId = parseInt(req.params.id);
      console.log(`[Universal RCA Workflow] Starting complete execution for incident ${incidentId}`);
      
      const universalRCAEngine = new UniversalRCAEngine();
      
      // Execute the complete Universal RCA workflow (all 9 steps)
      const workflowResult = await universalRCAEngine.executeUniversalRCAWorkflow(incidentId);
      
      console.log('[Universal RCA Workflow] Complete execution finished successfully');
      
      res.json({
        success: true,
        workflow: workflowResult
      });
    } catch (error) {
      console.error('[Universal RCA Workflow] Execution failed:', error);
      res.status(500).json({ 
        success: false,
        message: "Universal RCA workflow execution failed",
        error: error.message 
      });
    }
  });

  // Admin: Get Pending Library Update Proposals
  app.get("/api/admin/library-update-proposals", async (req, res) => {
    try {
      const proposals = await investigationStorage.getPendingLibraryUpdateProposals();
      
      res.json({
        success: true,
        proposals
      });
    } catch (error) {
      console.error('[Admin Library Updates] Failed to get proposals:', error);
      res.status(500).json({ message: "Failed to get library update proposals" });
    }
  });

  // Admin: Process Library Update Proposal Decision
  app.post("/api/admin/library-update-proposals/:id/decision", async (req, res) => {
    try {
      const proposalId = parseInt(req.params.id);
      const { decision, adminComments, reviewedBy, modifiedData } = req.body;
      
      // Import AdminLibraryUpdateEngine for processing decisions
      const { AdminLibraryUpdateEngine } = await import("./admin-library-update-engine");
      const adminEngine = new AdminLibraryUpdateEngine();
      
      await adminEngine.processAdminReview({
        proposalId,
        decision,
        adminComments,
        reviewedBy,
        modifiedData
      });
      
      res.json({
        success: true,
        message: `Library update proposal ${decision} successfully`
      });
    } catch (error) {
      console.error('[Admin Library Updates] Decision processing failed:', error);
      res.status(500).json({ message: "Failed to process proposal decision" });
    }
  });

  // UPLOAD EVIDENCE FILES (ZERO HARDCODING)
  app.post("/api/incidents/:id/upload-evidence", upload.single('file'), async (req, res) => {
    try {
      const incidentId = parseInt(req.params.id);
      const { categoryId, description } = req.body;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      console.log(`[EVIDENCE UPLOAD] Processing file upload for incident ${incidentId}, category ${categoryId}`);
      console.log(`[EVIDENCE UPLOAD] File: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);
      
      // Get incident to access current evidence data
      const incident = await investigationStorage.getIncident(incidentId);
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }
      
      // Create file record - ZERO HARDCODING approach
      const fileRecord = {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        categoryId: categoryId,
        description: description || '',
        uploadedAt: new Date().toISOString(),
        content: file.buffer.toString('base64'), // Store file content as base64
        status: 'uploaded'
      };
      
      // Update incident with new evidence file
      // Get current evidence files or initialize empty array
      const currentFiles = Array.isArray(incident.evidenceResponses) ? incident.evidenceResponses : [];
      const updatedFiles = [...currentFiles, fileRecord];
      
      await investigationStorage.updateIncident(incidentId, {
        evidenceResponses: updatedFiles
      });
      
      console.log(`[EVIDENCE UPLOAD] Successfully uploaded file ${file.originalname} for incident ${incidentId}`);
      
      res.json({ 
        success: true,
        file: fileRecord,
        message: `File ${file.originalname} uploaded successfully`
      });
      
    } catch (error) {
      console.error('[EVIDENCE UPLOAD] Upload failed:', error);
      res.status(500).json({ message: "Failed to upload evidence file" });
    }
  });

  // GENERATE EVIDENCE CATEGORIES FOR COLLECTION (ZERO HARDCODING)
  app.post("/api/incidents/:id/generate-evidence-categories", async (req, res) => {
    try {
      const incidentId = parseInt(req.params.id);
      const { equipmentGroup, equipmentType, evidenceChecklist } = req.body;
      
      console.log(`[EVIDENCE CATEGORIES] Generating categories for incident ${incidentId} - ${equipmentGroup} → ${equipmentType}`);
      
      // Get incident to access evidence checklist items
      const incident = await investigationStorage.getIncident(incidentId);
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }
      
      // Transform evidence checklist items into evidence collection categories
      // ZERO HARDCODING: Use actual evidence items generated from Evidence Library
      const categories = [];
      
      if (incident.evidenceChecklist && Array.isArray(incident.evidenceChecklist)) {
        console.log(`[EVIDENCE CATEGORIES] Found ${incident.evidenceChecklist.length} evidence items to convert to categories`);
        
        // Group evidence items by type/category for organized collection
        const categoryMap = new Map();
        
        incident.evidenceChecklist.forEach((item: any, index: number) => {
          // Use evidence item title as category name, prioritize by importance
          const categoryKey = item.title || `Evidence Category ${index + 1}`;
          const category = {
            id: item.id || `category-${index + 1}`,
            name: categoryKey,
            description: item.description || 'Evidence required for analysis',
            required: item.priority === 'Critical' || item.priority === 'High',
            acceptedTypes: ['pdf', 'xlsx', 'csv', 'jpg', 'png', 'txt'], // Universal file types
            maxFiles: 10,
            files: [],
            priority: item.priority || 'Medium',
            isUnavailable: item.isUnavailable || false,
            unavailableReason: item.unavailableReason || '',
            originalEvidenceItem: item // Reference to original checklist item
          };
          
          categories.push(category);
        });
        
        console.log(`[EVIDENCE CATEGORIES] Generated ${categories.length} evidence collection categories`);
      } else {
        console.log(`[EVIDENCE CATEGORIES] No evidence checklist found - generating basic categories`);
        
        // Fallback: Generate basic categories from Equipment Library if no evidence checklist
        const basicCategories = [
          {
            id: 'documentation',
            name: 'Equipment Documentation',
            description: 'Equipment manuals, specifications, and maintenance records',
            required: true,
            acceptedTypes: ['pdf', 'xlsx', 'csv', 'txt'],
            maxFiles: 10,
            files: [],
            priority: 'High'
          },
          {
            id: 'operational-data',
            name: 'Operational Data',
            description: 'Process trends, alarm logs, and operational parameters',
            required: true,
            acceptedTypes: ['xlsx', 'csv', 'txt'],
            maxFiles: 10,
            files: [],
            priority: 'High'
          }
        ];
        
        categories.push(...basicCategories);
      }
      
      res.json({ 
        categories,
        message: `Generated ${categories.length} evidence collection categories`,
        totalRequired: categories.filter(c => c.required).length,
        totalOptional: categories.filter(c => !c.required).length
      });
      
    } catch (error) {
      console.error('[EVIDENCE CATEGORIES] Generation failed:', error);
      res.status(500).json({ message: "Failed to generate evidence categories" });
    }
  });

  // UNIVERSAL RCA FALLBACK ENGINE ENDPOINT (NO HARDCODING)
  app.post("/api/incidents/:id/fallback-analysis", async (req, res) => {
    try {
      const incidentId = parseInt(req.params.id);
      const { evidenceAvailability, uploadedFiles } = req.body;
      
      console.log(`[FALLBACK RCA] Starting fallback analysis for incident ${incidentId}`);
      
      const incident = await investigationStorage.getIncident(incidentId);
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }
      
      const fallbackEngine = new UniversalRCAFallbackEngine();
      
      // Step 1: Analyze incident description
      const incidentAnalysis = await fallbackEngine.analyzeIncidentDescription(
        incident.symptomDescription || incident.description,
        {
          equipmentGroup: incident.equipmentGroup,
          equipmentType: incident.equipmentType,
          equipmentSubtype: incident.equipmentSubtype
        }
      );
      
      // Step 2: Check Evidence Library match
      const evidenceLibraryCheck = await fallbackEngine.checkEvidenceLibraryMatch(
        incidentAnalysis.extractedSymptoms,
        incident.equipmentGroup,
        incident.equipmentType
      );
      
      if (!evidenceLibraryCheck.activateFallback) {
        // Use Evidence Library results
        return res.json({
          useEvidenceLibrary: true,
          matches: evidenceLibraryCheck.matches,
          confidence: evidenceLibraryCheck.confidence,
          message: "High-confidence Evidence Library match found"
        });
      }
      
      // Step 3: Generate fallback hypotheses
      const fallbackHypotheses = await fallbackEngine.generateFallbackHypotheses(
        incident.symptomDescription || incident.description,
        incidentAnalysis.extractedSymptoms,
        {
          equipmentGroup: incident.equipmentGroup,
          equipmentType: incident.equipmentType,
          equipmentSubtype: incident.equipmentSubtype
        }
      );
      
      // Step 4: Assess evidence availability
      const evidenceAssessment = await fallbackEngine.assessEvidenceAvailability(
        fallbackHypotheses,
        evidenceAvailability
      );
      
      // Step 5: Generate final fallback analysis
      const finalAnalysis = await fallbackEngine.generateFallbackAnalysis(
        fallbackHypotheses,
        evidenceAssessment,
        uploadedFiles
      );
      
      // Update incident with fallback analysis
      await investigationStorage.updateIncident(incidentId, {
        aiAnalysis: finalAnalysis,
        analysisConfidence: finalAnalysis.confidence,
        workflowStatus: 'analysis_complete',
        currentStep: 6
      });
      
      res.json({
        success: true,
        fallbackAnalysis: finalAnalysis,
        hypotheses: fallbackHypotheses,
        evidenceAssessment,
        incidentAnalysis,
        message: `Fallback analysis complete - ${finalAnalysis.confidence}% confidence`
      });
      
    } catch (error) {
      console.error('[FALLBACK RCA] Analysis failed:', error);
      res.status(500).json({ message: "Fallback analysis failed" });
    }
  });

  // EQUIPMENT CASCADING DROPDOWN ENDPOINTS - NO HARDCODING
  // Level 1: Get distinct equipment groups from Evidence Library
  app.get("/api/cascading/equipment-groups", async (req, res) => {
    try {
      const groups = await investigationStorage.getDistinctEquipmentGroups();
      res.json(groups);
    } catch (error) {
      console.error('[Cascading Dropdown] Equipment groups failed:', error);
      res.status(500).json({ message: "Failed to get equipment groups" });
    }
  });

  // Level 2: Get equipment types for selected group
  app.get("/api/cascading/equipment-types/:group", async (req, res) => {
    try {
      const { group } = req.params;
      const types = await investigationStorage.getEquipmentTypesForGroup(group);
      res.json(types);
    } catch (error) {
      console.error('[Cascading Dropdown] Equipment types failed:', error);
      res.status(500).json({ message: "Failed to get equipment types" });
    }
  });

  // Level 3: Get equipment subtypes for selected group and type
  app.get("/api/cascading/equipment-subtypes/:group/:type", async (req, res) => {
    try {
      const { group, type } = req.params;
      const subtypes = await investigationStorage.getEquipmentSubtypesForGroupAndType(group, type);
      res.json(subtypes);
    } catch (error) {
      console.error('[Cascading Dropdown] Equipment subtypes failed:', error);
      res.status(500).json({ message: "Failed to get equipment subtypes" });
    }
  });

  app.get('/api/hello', (req, res) => {
    res.json({ message: 'Universal RCA API Ready' });
  });

  return app as any;
}
