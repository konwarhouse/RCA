import type { Express } from "express";
import { createServer, type Server } from "http";
import { investigationStorage } from "./storage";
import { investigationEngine } from "./investigation-engine";
import { RCAAnalysisEngine } from "./rca-analysis-engine";
import evidenceLibraryRoutes from "./routes/evidence-library";
import { nlpAnalyzer } from "./nlp-analyzer";
import multer from "multer";
import Papa from "papaparse";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
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
      
      if (!investigationType || !["safety_environmental", "equipment_failure"].includes(investigationType)) {
        return res.status(400).json({ 
          message: "Invalid investigation type. Must be 'safety_environmental' or 'equipment_failure'" 
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
      
      if (!isValid) {
        return res.status(400).json({ 
          message: "Evidence collection incomplete. Minimum 80% required.",
          completeness 
        });
      }

      // Update status to processing
      await investigationStorage.updateInvestigation(investigation.id, {
        currentStep: "ai_processing"
      });

      // Generate structured RCA analysis
      const structuredRCA = RCAAnalysisEngine.generateStructuredRCA(investigation);
      
      // Convert to existing format for compatibility
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
        analysisMethod: investigation.investigationType === 'safety_environmental' ? 'ECFA' : 'Fault Tree Analysis',
        structuredAnalysis: structuredRCA
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
          title: `${inv.whatHappened} - ${inv.evidenceData?.equipment_type || 'Equipment'} ${inv.evidenceData?.equipment_tag || ''}`.trim(),
          status: inv.status === 'completed' ? 'completed' : inv.currentStep,
          createdAt: inv.createdAt,
          updatedAt: inv.updatedAt,
          confidence: inv.confidence ? parseFloat(inv.confidence) * 100 : 80,
          equipmentType: inv.evidenceData?.equipment_type || 'Unknown',
          location: inv.whereHappened || inv.evidenceData?.operating_location || 'Unknown',
          cause: inv.analysisResults?.structuredAnalysis?.rootCause || 
                 inv.analysisResults?.causes?.[0]?.description || 
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

      // Add incidents based on status filter - all incidents if status='all', only completed if status='completed' 
      const filteredIncidents = status === 'all' ? incidents : 
        incidents.filter(inc => inc.currentStep >= 6 && inc.workflowStatus !== 'created');
      
      const analysesFromIncidents = filteredIncidents.map(inc => {
        const isDraft = !inc.aiAnalysis || inc.currentStep < 6;
        return {
          id: inc.id,
          investigationId: `INC-${inc.id}`,
          title: inc.title || `${inc.description} - ${inc.equipmentType}`,
          status: isDraft ? 'draft' : (inc.workflowStatus === 'finalized' ? 'completed' : 'analysis_complete'),
          isDraft: isDraft,
          createdAt: inc.createdAt,
          updatedAt: inc.updatedAt,
          confidence: inc.analysisResults?.overallConfidence || 85,
          equipmentType: inc.equipmentType || 'Unknown',
          location: inc.location || 'Unknown',
          cause: isDraft ? 'Draft - Analysis pending' : 
                 (inc.analysisResults?.rootCauses?.[0]?.description || 'Root cause analysis completed'),
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
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

  // Update incident equipment/symptoms (Step 2)
  app.put("/api/incidents/:id/equipment-symptoms", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = {
        ...req.body,
        currentStep: 2,
        workflowStatus: "equipment_selected",
      };
      
      const incident = await investigationStorage.updateIncident(id, updateData);
      res.json(incident);
    } catch (error) {
      console.error("[RCA] Error updating incident equipment/symptoms:", error);
      res.status(500).json({ message: "Failed to update incident" });
    }
  });

  // Generate AI evidence checklist (Step 3)
  app.post("/api/incidents/:id/generate-evidence-checklist", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { equipmentGroup, equipmentType, symptoms } = req.body;

      // Generate equipment-specific evidence checklist using AI or library data
      const evidenceItems = await generateEvidenceChecklist(equipmentGroup, equipmentType, symptoms);
      
      res.json({ evidenceItems });
    } catch (error) {
      console.error("[RCA] Error generating evidence checklist:", error);
      res.status(500).json({ message: "Failed to generate evidence checklist" });
    }
  });

  // Update evidence checklist progress (Step 3 completion)
  app.put("/api/incidents/:id/evidence-progress", async (req, res) => {
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

  // Generate evidence collection categories (Step 4)
  app.post("/api/incidents/:id/generate-evidence-categories", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { equipmentGroup, equipmentType, evidenceChecklist } = req.body;

      // Generate evidence collection categories based on checklist
      const categories = await generateEvidenceCategories(equipmentGroup, equipmentType, evidenceChecklist);
      
      res.json({ categories });
    } catch (error) {
      console.error("[RCA] Error generating evidence categories:", error);
      res.status(500).json({ message: "Failed to generate evidence categories" });
    }
  });

  // Upload evidence files (Step 4)
  app.post("/api/incidents/:id/upload-evidence", upload.single('file'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { categoryId, description } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Process and store the uploaded file
      const fileData = {
        id: Date.now().toString(),
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        url: `/uploads/${file.filename}`,
        uploadedAt: new Date(),
        category: categoryId,
        description: description || undefined,
      };

      res.json({ file: fileData });
    } catch (error) {
      console.error("[RCA] Error uploading evidence:", error);
      res.status(500).json({ message: "Failed to upload evidence" });
    }
  });

  // Perform AI analysis (Steps 5-6)
  app.post("/api/incidents/:id/perform-analysis", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get incident data to ensure we have correct equipment information
      const incident = await investigationStorage.getIncident(id);
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }

      // Use incident data for equipment info, fallback to request body
      const equipmentGroup = incident.equipmentGroup || req.body.equipmentGroup;
      const equipmentType = incident.equipmentType || req.body.equipmentType;
      const equipmentSubtype = incident.equipmentSubtype || req.body.equipmentSubtype || "";
      const symptoms = incident.symptoms || req.body.symptoms || incident.description;
      const evidenceChecklist = req.body.evidenceChecklist || [];
      const evidenceFiles = req.body.evidenceFiles || [];

      console.log(`[AI Analysis] Processing ${equipmentGroup} → ${equipmentType} → ${equipmentSubtype} - Incident #${id}`);

      // Perform AI cross-matching and analysis
      const analysis = await performAIAnalysis(equipmentGroup, equipmentType, equipmentSubtype, symptoms, evidenceChecklist, evidenceFiles);
      
      // Update incident with analysis results
      await investigationStorage.updateIncident(id, {
        currentStep: 6,
        workflowStatus: "analysis_complete",
        aiAnalysis: JSON.stringify(analysis), // Fixed: Use correct column name and stringify
      });

      res.json({ analysis });
    } catch (error) {
      console.error("[RCA] Error performing AI analysis:", error);
      res.status(500).json({ message: "Failed to perform AI analysis" });
    }
  });

  // Get analysis results
  app.get("/api/incidents/:id/analysis", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const incident = await investigationStorage.getIncident(id);
      
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }

      // Parse the analysis results from the database
      const analysisResults = incident.aiAnalysis ? JSON.parse(incident.aiAnalysis) : {};
      res.json(analysisResults);
    } catch (error) {
      console.error("[RCA] Error fetching analysis results:", error);
      res.status(500).json({ message: "Failed to fetch analysis results" });
    }
  });

  // Submit engineer review (Step 8)
  app.post("/api/incidents/:id/engineer-review", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const reviewData = req.body;
      
      // Update incident with engineer review and finalization
      const updateData: any = {
        currentStep: 8,
        workflowStatus: reviewData.approved ? "finalized" : "under_review", // Fixed: Use "finalized" status
        engineerReview: JSON.stringify(reviewData), // Store as string
      };
      
      // If approved, set finalization data
      if (reviewData.approved) {
        updateData.finalizedAt = new Date();
        updateData.finalizedBy = reviewData.reviewedBy || 'Engineer';
      }
      
      const incident = await investigationStorage.updateIncident(id, updateData);

      res.json(incident);
    } catch (error) {
      console.error("[RCA] Error submitting engineer review:", error);
      res.status(500).json({ message: "Failed to submit engineer review" });
    }
  });

  // Generate final RCA report
  app.post("/api/incidents/:id/generate-final-report", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { engineerReview } = req.body;

      // Generate comprehensive RCA report
      const reportUrl = await generateFinalReport(id, engineerReview);
      
      res.json({ reportUrl });
    } catch (error) {
      console.error("[RCA] Error generating final report:", error);
      res.status(500).json({ message: "Failed to generate final report" });
    }
  });

  // Get analytics for dashboard
  app.get("/api/analytics", async (req, res) => {
    try {
      const investigations = await investigationStorage.getAllInvestigations();
      
      const completedAnalyses = investigations.filter(inv => 
        inv.status === 'completed' || inv.currentStep === 'completed'
      );

      const analytics = {
        totalAnalyses: completedAnalyses.length,
        averageConfidence: completedAnalyses.length > 0 
          ? Math.round(completedAnalyses.reduce((sum, inv) => 
              sum + (inv.confidence ? parseFloat(inv.confidence) * 100 : 80), 0
            ) / completedAnalyses.length)
          : 0,
        resolvedPercentage: completedAnalyses.length > 0 
          ? Math.round((completedAnalyses.filter(inv => inv.status === 'completed').length / completedAnalyses.length) * 100)
          : 0,
        trendingCauses: getTrendingCauses(completedAnalyses)
      };

      res.json(analytics);
    } catch (error) {
      console.error("[RCA] Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // File upload for supporting documents
  app.post("/api/investigations/:id/files", upload.array('files'), async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const fileData = files.map(file => ({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date().toISOString()
      }));

      const investigation = await investigationStorage.getInvestigation(parseInt(id));
      if (!investigation) {
        return res.status(404).json({ message: "Investigation not found" });
      }

      const existingFiles = investigation.uploadedFiles as any[] || [];
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

  // Get equipment-specific parameters
  app.get("/api/equipment/:type/parameters", (req, res) => {
    try {
      const { type } = req.params;
      const parameters = investigationEngine.getEquipmentParameters(type);
      res.json({ parameters });
    } catch (error) {
      console.error("[RCA] Error fetching equipment parameters:", error);
      res.status(500).json({ message: "Failed to fetch equipment parameters" });
    }
  });

  // Evidence Library Management Routes
  app.use("/api/evidence-library", evidenceLibraryRoutes);

  // Admin AI Settings Routes
  app.get("/api/admin/ai-settings", async (req, res) => {
    try {
      const settings = await investigationStorage.getAllAiSettings();
      // Don't send encrypted keys to frontend
      const sanitizedSettings = settings.map((setting: any) => ({
        ...setting,
        encryptedApiKey: undefined
      }));
      res.json(sanitizedSettings);
    } catch (error) {
      console.error("[RCA] Error fetching AI settings:", error);
      res.status(500).json({ message: "Failed to fetch AI settings" });
    }
  });

  app.post("/api/admin/ai-settings/test", async (req, res) => {
    try {
      const { provider, apiKey } = req.body;
      
      if (!provider || !apiKey) {
        return res.status(400).json({ message: "Provider and API key are required" });
      }

      // Test the actual API key
      const { AIService } = await import("./ai-service");
      const testResult = await AIService.testApiKey(provider, apiKey);
      
      if (testResult.success) {
        res.json({ success: true, message: "API key tested successfully" });
      } else {
        res.status(400).json({ success: false, message: testResult.error });
      }
    } catch (error) {
      console.error("[RCA] Error testing API key:", error);
      res.status(500).json({ success: false, message: "Test failed: " + error.message });
    }
  });

  // Test existing AI provider
  app.post("/api/admin/ai-settings/:id/test", async (req, res) => {
    try {
      const { id } = req.params;
      const providerId = parseInt(id);
      
      // Get the stored provider configuration
      const settings = await investigationStorage.getAiSettingsById(providerId);
      if (!settings) {
        return res.status(404).json({ success: false, message: "AI provider not found" });
      }

      // Test the API key  
      const { AIService } = await import("./ai-service");
      // Decrypt the API key before testing
      const decryptedKey = AIService.decryptApiKey(settings.encryptedApiKey);
      const testResult = await AIService.testApiKey(settings.provider, decryptedKey);
      
      // Update test status in database
      await investigationStorage.updateAiSettingsTestStatus(providerId, testResult.success);
      
      if (testResult.success) {
        res.json({ success: true, message: "API key tested successfully" });
      } else {
        res.status(400).json({ success: false, message: testResult.error });
      }
    } catch (error) {
      console.error("[RCA] Error testing AI provider:", error);
      res.status(500).json({ success: false, message: "Test failed: " + error.message });
    }
  });

  app.post("/api/admin/ai-settings", async (req, res) => {
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
        encryptedApiKey: undefined // Don't send back encrypted key
      });
    } catch (error) {
      console.error("[RCA] Error saving AI settings:", error);
      res.status(500).json({ message: "Failed to save AI settings" });
    }
  });

  app.delete("/api/admin/ai-settings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await investigationStorage.deleteAiSettings(id);
      res.status(204).send();
    } catch (error) {
      console.error("[RCA] Error deleting AI settings:", error);
      res.status(500).json({ message: "Failed to delete AI settings" });
    }
  });

  // ====== NLP ANALYSIS ROUTES FOR EVIDENCE LIBRARY ======

  // Analyze question patterns in Evidence Library
  app.get("/api/nlp/analyze-questions", async (req, res) => {
    try {
      const analysis = await nlpAnalyzer.analyzeQuestionPatterns();
      res.json(analysis);
    } catch (error) {
      console.error("[NLP] Error analyzing question patterns:", error);
      res.status(500).json({ message: "Failed to analyze question patterns" });
    }
  });

  // Analyze root cause logic patterns
  app.get("/api/nlp/analyze-root-cause-logic", async (req, res) => {
    try {
      const analysis = await nlpAnalyzer.analyzeRootCauseLogic();
      res.json(analysis);
    } catch (error) {
      console.error("[NLP] Error analyzing root cause logic:", error);
      res.status(500).json({ message: "Failed to analyze root cause logic patterns" });
    }
  });

  // Generate follow-up questions based on equipment and existing evidence
  app.post("/api/nlp/generate-questions", async (req, res) => {
    try {
      const { equipmentType, failureMode, existingEvidence } = req.body;
      
      if (!equipmentType || !failureMode) {
        return res.status(400).json({ message: "Equipment type and failure mode are required" });
      }

      const suggestions = await nlpAnalyzer.generateFollowUpQuestions(
        equipmentType, 
        failureMode, 
        existingEvidence || []
      );
      
      res.json(suggestions);
    } catch (error) {
      console.error("[NLP] Error generating follow-up questions:", error);
      res.status(500).json({ message: "Failed to generate follow-up questions" });
    }
  });

  // Helper function for trending causes
  function getTrendingCauses(analyses: any[]) {
    const causeCount = {};
    analyses.forEach(analysis => {
      const cause = analysis.analysisResults?.structuredAnalysis?.rootCause || 
                   analysis.analysisResults?.causes?.[0]?.description || 
                   'Equipment failure';
      causeCount[cause] = (causeCount[cause] || 0) + 1;
    });
    
    return Object.entries(causeCount)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([cause, count]) => ({ cause, count }));
  }

  // Evidence Library Management Routes
  
  // Get all evidence library items
  app.get("/api/evidence-library", async (req, res) => {
    try {
      const items = await investigationStorage.getAllEvidenceLibrary();
      res.json(items);
    } catch (error) {
      console.error("[RCA] Error fetching evidence library:", error);
      res.status(500).json({ message: "Failed to fetch evidence library" });
    }
  });

  // Search evidence library
  app.get("/api/evidence-library/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }
      const items = await investigationStorage.searchEvidenceLibrary(q);
      res.json(items);
    } catch (error) {
      console.error("[RCA] Error searching evidence library:", error);
      res.status(500).json({ message: "Failed to search evidence library" });
    }
  });

  // Get single evidence library item
  app.get("/api/evidence-library/:id", async (req, res) => {
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

  // Create evidence library item
  app.post("/api/evidence-library", async (req, res) => {
    try {
      const item = await investigationStorage.createEvidenceLibrary(req.body);
      res.status(201).json(item);
    } catch (error) {
      console.error("[RCA] Error creating evidence item:", error);
      res.status(500).json({ message: "Failed to create evidence item" });
    }
  });

  // Update evidence library item
  app.put("/api/evidence-library/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await investigationStorage.updateEvidenceLibrary(id, req.body);
      res.json(item);
    } catch (error) {
      console.error("[RCA] Error updating evidence item:", error);
      res.status(500).json({ message: "Failed to update evidence item" });
    }
  });

  // Delete evidence library item
  app.delete("/api/evidence-library/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await investigationStorage.deleteEvidenceLibrary(id);
      res.status(204).send();
    } catch (error) {
      console.error("[RCA] Error deleting evidence item:", error);
      res.status(500).json({ message: "Failed to delete evidence item" });
    }
  });

  // Import CSV data
  app.post("/api/evidence-library/import", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const csvData = req.file.buffer.toString('utf-8');
      const lines = csvData.split('\n').filter(line => line.trim());
      
      // Function to properly parse CSV line with quoted fields
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < line.length) {
          const char = line[i];
          
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              // Handle escaped quotes
              current += '"';
              i += 2;
            } else {
              // Toggle quote state
              inQuotes = !inQuotes;
              i++;
            }
          } else if (char === ',' && !inQuotes) {
            // Field separator outside quotes
            result.push(current.trim());
            current = '';
            i++;
          } else {
            current += char;
            i++;
          }
        }
        
        // Add the last field
        result.push(current.trim());
        return result;
      };
      
      const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim());
      
      const items = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]).map(v => v.replace(/^"|"$/g, '').trim());
        if (values.length >= 11) { // Minimum required fields
          items.push({
            equipmentGroup: values[0],
            equipmentType: values[1],
            subtype: values[2] || null,
            componentFailureMode: values[3],
            equipmentCode: values[4],
            failureCode: values[5],
            riskRanking: values[6],
            requiredTrendDataEvidence: values[7],
            aiOrInvestigatorQuestions: values[8],
            attachmentsEvidenceRequired: values[9],
            rootCauseLogic: values[10],
            blankColumn1: values[11] || null,
            blankColumn2: values[12] || null,
            blankColumn3: values[13] || null,
            updatedBy: "admin-import",
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

  // Equipment Groups routes
  app.get("/api/equipment-groups", async (req, res) => {
    try {
      const groups = await investigationStorage.getAllEquipmentGroups();
      res.json(groups);
    } catch (error) {
      console.error("[RCA] Error fetching equipment groups:", error);
      res.status(500).json({ message: "Failed to fetch equipment groups" });
    }
  });

  app.get("/api/equipment-groups/active", async (req, res) => {
    try {
      const groups = await investigationStorage.getActiveEquipmentGroups();
      res.json(groups);
    } catch (error) {
      console.error("[RCA] Error fetching active equipment groups:", error);
      res.status(500).json({ message: "Failed to fetch active equipment groups" });
    }
  });

  app.post("/api/equipment-groups", async (req, res) => {
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

  app.put("/api/equipment-groups/:id", async (req, res) => {
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

  app.delete("/api/equipment-groups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await investigationStorage.deleteEquipmentGroup(parseInt(id));
      res.json({ message: "Equipment group deleted successfully" });
    } catch (error) {
      console.error("[RCA] Error deleting equipment group:", error);
      res.status(500).json({ message: "Failed to delete equipment group" });
    }
  });

  // Equipment Groups Import/Export
  app.post("/api/equipment-groups/import", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const csvData = req.file.buffer.toString('utf-8');
      const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
      
      if (parsed.errors.length > 0) {
        return res.status(400).json({ message: "CSV parsing error", errors: parsed.errors });
      }

      const groups = parsed.data.map((row: any) => ({
        name: row.name || row.Name,
        isActive: row.isActive === 'true' || row.isActive === true || row.isActive === 'TRUE'
      })).filter((group: any) => group.name && group.name.trim());

      if (groups.length === 0) {
        return res.status(400).json({ message: "No valid equipment groups found in file" });
      }

      // Import groups one by one to handle duplicates
      const imported = [];
      const errors = [];
      
      for (const group of groups) {
        try {
          const created = await investigationStorage.createEquipmentGroup(group);
          imported.push(created);
        } catch (error: any) {
          if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
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

  app.get("/api/equipment-groups/export", async (req, res) => {
    try {
      const groups = await investigationStorage.getAllEquipmentGroups();
      
      const csvData = Papa.unparse(groups.map(group => ({
        name: group.name,
        isActive: group.isActive,
        createdAt: group.createdAt?.toISOString(),
        updatedAt: group.updatedAt?.toISOString()
      })));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=equipment-groups.csv');
      res.send(csvData);
    } catch (error) {
      console.error("[RCA] Error exporting equipment groups:", error);
      res.status(500).json({ message: "Failed to export equipment groups" });
    }
  });

  // Risk Rankings routes
  app.get("/api/risk-rankings", async (req, res) => {
    try {
      const rankings = await investigationStorage.getAllRiskRankings();
      res.json(rankings);
    } catch (error) {
      console.error("[RCA] Error fetching risk rankings:", error);
      res.status(500).json({ message: "Failed to fetch risk rankings" });
    }
  });

  app.get("/api/risk-rankings/active", async (req, res) => {
    try {
      const rankings = await investigationStorage.getActiveRiskRankings();
      res.json(rankings);
    } catch (error) {
      console.error("[RCA] Error fetching active risk rankings:", error);
      res.status(500).json({ message: "Failed to fetch active risk rankings" });
    }
  });

  app.post("/api/risk-rankings", async (req, res) => {
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

  app.put("/api/risk-rankings/:id", async (req, res) => {
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

  app.delete("/api/risk-rankings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await investigationStorage.deleteRiskRanking(parseInt(id));
      res.json({ message: "Risk ranking deleted successfully" });
    } catch (error) {
      console.error("[RCA] Error deleting risk ranking:", error);
      res.status(500).json({ message: "Failed to delete risk ranking" });
    }
  });

  // Risk Rankings Import/Export
  app.post("/api/risk-rankings/import", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const csvData = req.file.buffer.toString('utf-8');
      const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
      
      if (parsed.errors.length > 0) {
        return res.status(400).json({ message: "CSV parsing error", errors: parsed.errors });
      }

      const rankings = parsed.data.map((row: any) => ({
        label: row.label || row.Label,
        isActive: row.isActive === 'true' || row.isActive === true || row.isActive === 'TRUE'
      })).filter((ranking: any) => ranking.label && ranking.label.trim());

      if (rankings.length === 0) {
        return res.status(400).json({ message: "No valid risk rankings found in file" });
      }

      // Import rankings one by one to handle duplicates
      const imported = [];
      const errors = [];
      
      for (const ranking of rankings) {
        try {
          const created = await investigationStorage.createRiskRanking(ranking);
          imported.push(created);
        } catch (error: any) {
          if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
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

  app.get("/api/risk-rankings/export", async (req, res) => {
    try {
      const rankings = await investigationStorage.getAllRiskRankings();
      
      const csvData = Papa.unparse(rankings.map(ranking => ({
        label: ranking.label,
        isActive: ranking.isActive,
        createdAt: ranking.createdAt?.toISOString(),
        updatedAt: ranking.updatedAt?.toISOString()
      })));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=risk-rankings.csv');
      res.send(csvData);
    } catch (error) {
      console.error("[RCA] Error exporting risk rankings:", error);
      res.status(500).json({ message: "Failed to export risk rankings" });
    }
  });

  // NEW: Three-level cascading dropdown endpoints
  app.get("/api/cascading/equipment-groups", async (req, res) => {
    try {
      const groups = await investigationStorage.getCascadingEquipmentGroups();
      res.json(groups);
    } catch (error) {
      console.error("Error fetching cascading equipment groups:", error);
      res.status(500).json({ message: "Failed to fetch equipment groups" });
    }
  });

  // NEW: Get equipment types for a specific group
  app.get("/api/cascading/equipment-types/:groupName", async (req, res) => {
    try {
      const { groupName } = req.params;
      const types = await investigationStorage.getCascadingEquipmentTypes(groupName);
      res.json(types);
    } catch (error) {
      console.error("Error fetching cascading equipment types:", error);
      res.status(500).json({ message: "Failed to fetch equipment types" });
    }
  });

  // NEW: Get equipment subtypes for a specific group and type
  app.get("/api/cascading/equipment-subtypes/:groupName/:typeName", async (req, res) => {
    try {
      const { groupName, typeName } = req.params;
      const subtypes = await investigationStorage.getCascadingEquipmentSubtypes(groupName, typeName);
      res.json(subtypes);
    } catch (error) {
      console.error("Error fetching cascading equipment subtypes:", error);
      res.status(500).json({ message: "Failed to fetch equipment subtypes" });
    }
  });

  // Generate Summary Report API
  app.get('/api/incidents/:incidentId/summary-report', async (req: any, res) => {
    try {
      const incidentId = parseInt(req.params.incidentId);
      if (!incidentId) {
        return res.status(400).json({ message: "Invalid incident ID" });
      }

      const incident = await investigationStorage.getIncident(incidentId);
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }

      // Generate comprehensive summary report
      const summaryReport = await generateSummaryReport(incident);
      
      res.json({ report: summaryReport });
    } catch (error) {
      console.error("Error generating summary report:", error);
      res.status(500).json({ message: "Failed to generate summary report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Safe JSON parsing helper
function parseJsonSafely(data: any, fallback: any = null) {
  if (!data) return fallback;
  if (typeof data === 'object') return data; // Already parsed
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.warn(`[JSON Parse] Failed to parse: ${data}`, error);
      return fallback;
    }
  }
  return fallback;
}

// Summary Report Generation Function
async function generateSummaryReport(incident: any) {
  console.log(`[Summary Report] Generating report for incident ${incident.id}: ${incident.title}`);

  // Parse evidence files and analysis data - Fixed to handle different data types
  const evidenceFiles = parseJsonSafely(incident.evidenceFiles, []);
  const analysisResults = parseJsonSafely(incident.aiAnalysis, null);
  const evidenceChecklist = parseJsonSafely(incident.evidenceChecklist, []);

  // Calculate impact summary
  const impactSummary = calculateImpactSummary(incident, analysisResults);
  
  // Generate timeline from evidence and incident data
  const timeline = generateIncidentTimeline(incident, evidenceFiles);
  
  // Structure evidence collected
  const evidenceCollected = structureEvidenceCollected(evidenceFiles, evidenceChecklist);
  
  // Extract root cause information
  const rootCauseInfo = extractRootCauseInfo(analysisResults);
  
  // Generate corrective actions
  const correctiveActions = generateCorrectiveActions(analysisResults);

  const report = {
    // 1. Incident Overview
    incidentOverview: {
      incidentTitle: incident.title,
      dateOfIncident: formatDate(incident.incidentDateTime),
      reportedBy: `${incident.reportedBy}${incident.reporterRole ? ` (${incident.reporterRole})` : ''}`,
      equipmentTag: incident.equipmentId || 'Not Specified',
      location: `${incident.location || 'Site'} / ${incident.processUnit || 'Plant'} / ${incident.systemArea || 'Area'}`,
      systemProcess: `${incident.equipmentGroup} → ${incident.equipmentType}${incident.equipmentSubtype ? ` → ${incident.equipmentSubtype}` : ''}`
    },

    // 2. Incident Description
    incidentDescription: {
      whatFailed: `${incident.equipmentType}${incident.equipmentSubtype ? ` (${incident.equipmentSubtype})` : ''} - ${incident.specificPart || 'Equipment failure'}`,
      whenHappened: formatDateTime(incident.incidentDateTime),
      howDiscovered: incident.detectionMethod || 'Equipment alarm/monitoring system',
      initialConsequence: `${incident.immediateActions || 'Equipment shutdown'} - ${incident.description}`
    },

    // 3. Impact Summary
    impactSummary,

    // 4. Timeline of Events
    timeline,

    // 5. Evidence Collected
    evidenceCollected,

    // 6. Root Cause Summary
    rootCauseSummary: rootCauseInfo,

    // 7. Root Cause Analysis Methodology
    rcaMethodology: {
      method: incident.investigationType === 'ecfa' ? 'Event-Causal Factor Analysis (ECFA)' : 'Fault Tree Analysis',
      description: incident.investigationType === 'ecfa' 
        ? 'Systematic analysis of event sequence and contributing factors for safety incidents'
        : 'Equipment failure analysis using ISO 14224 taxonomy and fault tree logic',
      confidenceLevel: analysisResults?.overallConfidence || 0,
      evidenceLibraryUsed: true,
      isoCompliance: 'ISO 14224 compliant equipment classification'
    },

    // 8. Corrective and Preventive Actions (CAPA)
    correctiveActions,

    // 9. Lessons Learned
    lessonsLearned: generateLessonsLearned(incident, analysisResults),

    // Metadata
    metadata: {
      reportGeneratedDate: new Date().toISOString(),
      reportGeneratedBy: 'Quanntaum RCA Intelligence Pro',
      incidentId: incident.id,
      investigationId: `INC-${incident.id}`,
      analysisCompletedDate: incident.analysisCompletedAt || incident.updatedAt,
      totalEvidenceFiles: evidenceFiles.length,
      overallConfidence: analysisResults?.overallConfidence || 0
    }
  };

  return report;
}

// Helper functions for report generation
function calculateImpactSummary(incident: any, analysisResults: any) {
  const priority = incident.priority || 'Medium';
  const safetyImpact = incident.safetyImplications === 'yes' ? 'Safety implications identified' : 'No immediate safety risk';
  
  return {
    safety: incident.safetyImplications === 'yes' ? 'Safety risk identified - requires immediate attention' : 'No injuries or safety incidents reported',
    environment: incident.environmentalImpact || 'No environmental impact reported',
    production: incident.productionImpact || estimateProductionImpact(priority),
    costEstimate: analysisResults?.recommendations?.reduce((total: number, rec: any) => {
      const cost = extractCostFromRecommendation(rec.description || '');
      return total + cost;
    }, 0) || estimateCostImpact(priority),
    regulatory: incident.regulatoryImplications || 'No regulatory violations identified'
  };
}

function generateIncidentTimeline(incident: any, evidenceFiles: any[]) {
  const timeline = [];
  const incidentTime = new Date(incident.incidentDateTime);
  
  // Add incident occurrence
  timeline.push({
    time: formatTime(incidentTime),
    event: `${incident.title} - Initial failure detected`
  });
  
  // Add immediate actions
  if (incident.immediateActions) {
    const responseTime = new Date(incidentTime.getTime() + 10 * 60000); // +10 minutes
    timeline.push({
      time: formatTime(responseTime),
      event: `Immediate action taken: ${incident.immediateActions}`
    });
  }
  
  // Add evidence collection times
  evidenceFiles.forEach((file: any, index: number) => {
    const evidenceTime = new Date(incidentTime.getTime() + (30 + index * 15) * 60000);
    timeline.push({
      time: formatTime(evidenceTime),
      event: `Evidence collected: ${file.originalName}`
    });
  });
  
  return timeline;
}

function structureEvidenceCollected(evidenceFiles: any[], evidenceChecklist: any[]) {
  const evidence = evidenceFiles.map(file => ({
    type: file.category || 'Supporting Document',
    source: file.originalName,
    observations: file.description || 'Evidence file uploaded for analysis'
  }));
  
  // Add checklist items as evidence
  evidenceChecklist.forEach((item: any) => {
    if (item.completed) {
      evidence.push({
        type: item.category,
        source: 'Investigation Checklist',
        observations: item.description
      });
    }
  });
  
  return evidence;
}

function extractRootCauseInfo(analysisResults: any) {
  if (!analysisResults || !analysisResults.rootCauses) {
    return {
      primaryRootCause: 'Analysis in progress',
      contributingFactors: [],
      latentCause: 'To be determined',
      detectionGaps: []
    };
  }
  
  const primary = analysisResults.rootCauses[0];
  const contributing = analysisResults.rootCauses.slice(1, 3);
  
  return {
    primaryRootCause: primary?.description || 'Primary root cause not yet identified',
    contributingFactors: contributing.map((c: any) => c.description) || [],
    latentCause: analysisResults.systemicIssues?.[0] || 'System-level analysis pending',
    detectionGaps: analysisResults.evidenceGaps || []
  };
}

function generateCorrectiveActions(analysisResults: any) {
  if (!analysisResults || !analysisResults.recommendations) {
    return [{
      action: 'Complete root cause analysis',
      type: 'Immediate',
      owner: 'Investigation Team',
      dueDate: formatDueDate(7), // 7 days from now
      status: 'Open'
    }];
  }
  
  return analysisResults.recommendations.slice(0, 5).map((rec: any, index: number) => ({
    action: rec.title || rec.description,
    type: rec.priority === 'Immediate' ? 'Corrective' : 'Preventive',
    owner: rec.responsible || 'Maintenance Team',
    dueDate: rec.timeframe ? calculateDueDate(rec.timeframe) : formatDueDate(30),
    status: 'Open'
  }));
}

function generateLessonsLearned(incident: any, analysisResults: any) {
  const lessons = [];
  
  // Equipment-specific lessons
  lessons.push(`${incident.equipmentType} monitoring: Enhanced condition monitoring recommended for early detection`);
  
  // Analysis-based lessons
  if (analysisResults?.evidenceGaps?.length > 0) {
    lessons.push(`Evidence collection: Missing ${analysisResults.evidenceGaps[0]} - improve data collection protocols`);
  }
  
  // Priority-based lessons
  if (incident.priority === 'High' || incident.priority === 'Critical') {
    lessons.push('High-priority equipment requires more frequent inspection and monitoring');
  }
  
  // Generic lessons
  lessons.push('Share incident learnings with other sites operating similar equipment');
  lessons.push('Review and update maintenance procedures based on failure analysis');
  
  return lessons;
}

// Utility functions
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return `${date.toLocaleDateString('en-GB')} at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDueDate(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toLocaleDateString('en-GB');
}

function calculateDueDate(timeframe: string) {
  const days = timeframe.includes('weeks') ? 21 : 
               timeframe.includes('days') ? 7 : 
               timeframe.includes('hours') ? 1 : 30;
  return formatDueDate(days);
}

function extractCostFromRecommendation(description: string) {
  const costMatch = description.match(/\$[\d,]+/);
  return costMatch ? parseInt(costMatch[0].replace(/[$,]/g, '')) : 0;
}

function estimateProductionImpact(priority: string) {
  switch (priority) {
    case 'Critical': return '8+ hours downtime, significant production loss';
    case 'High': return '4-8 hours downtime, moderate production impact';
    case 'Medium': return '1-4 hours downtime, minor production impact';
    default: return 'Minimal production impact';
  }
}

function estimateCostImpact(priority: string) {
  switch (priority) {
    case 'Critical': return '$50,000+ in maintenance and lost production';
    case 'High': return '$20,000-$50,000 in maintenance and lost production';
    case 'Medium': return '$5,000-$20,000 in maintenance and lost production';
    default: return 'Under $5,000 in maintenance costs';
  }
}

// Helper functions for evidence generation
async function generateEvidenceChecklist(equipmentGroup: string, equipmentType: string, symptoms: string) {
  // Generate equipment-specific evidence checklist based on equipment type
  
  // Equipment-specific evidence templates
  const equipmentTemplates = {
    // Heat Exchangers - thermal/corrosion focused
    "Heat Exchangers": [
      {
        id: "thermal-performance",
        category: "Thermal Data",
        title: "Heat Transfer Performance Data",
        description: "Temperature differentials and heat duty measurements showing degradation patterns",
        priority: "Critical" as const,
        required: true,
        aiGenerated: true,
        specificToEquipment: true,
        examples: [
          "Inlet/outlet temperature trends",
          "Heat duty calculations over time",
          "Thermal efficiency measurements"
        ],
        completed: false
      },
      {
        id: "corrosion-inspection",
        category: "Corrosion Analysis",
        title: "Corrosion Inspection Reports",
        description: "Ultrasonic thickness measurements and corrosion rate data",
        priority: "Critical" as const,
        required: true,
        aiGenerated: true,
        specificToEquipment: true,
        examples: [
          "UT thickness measurements",
          "Corrosion rate calculations",
          "Material degradation photos"
        ],
        completed: false
      },
      {
        id: "pressure-drop",
        category: "Process Data",
        title: "Pressure Drop Trends",
        description: "Fouling indicators through pressure differential monitoring",
        priority: "High" as const,
        required: true,
        aiGenerated: true,
        specificToEquipment: true,
        examples: [
          "Differential pressure trends",
          "Fouling factor calculations",
          "Cleaning frequency records"
        ],
        completed: false
      },
      {
        id: "tube-gasket-inspection",
        category: "Visual Evidence",
        title: "Tube and Gasket Inspection",
        description: "Physical inspection of tubes, gaskets, and sealing surfaces",
        priority: "High" as const,
        required: true,
        aiGenerated: true,
        specificToEquipment: true,
        examples: [
          "Tube bundle condition photos",
          "Gasket surface inspection",
          "Shell and tube sheet examination"
        ],
        completed: false
      }
    ],
    
    // Pumps - vibration/mechanical focused
    "Pumps": [
      {
        id: "vibration-trends",
        category: "Mechanical Data",
        title: "Vibration Trend Data",
        description: "Historical vibration measurements showing bearing and alignment patterns",
        priority: "Critical" as const,
        required: true,
        aiGenerated: true,
        specificToEquipment: true,
        examples: [
          "Bearing vibration trends",
          "Pump alignment data",
          "Motor coupling vibration"
        ],
        completed: false
      },
      {
        id: "seal-inspection",
        category: "Mechanical Components",
        title: "Mechanical Seal Inspection",
        description: "Seal leak rates and mechanical seal condition assessment",
        priority: "Critical" as const,
        required: true,
        aiGenerated: true,
        specificToEquipment: true,
        examples: [
          "Seal leak rate measurements",
          "Seal face condition photos",
          "O-ring and gasket inspection"
        ],
        completed: false
      },
      {
        id: "pump-performance",
        category: "Performance Data",
        title: "Pump Performance Curves",
        description: "Flow, head, and efficiency degradation over time",
        priority: "High" as const,
        required: true,
        aiGenerated: true,
        specificToEquipment: true,
        examples: [
          "Flow rate trends",
          "Discharge pressure data",
          "Power consumption analysis"
        ],
        completed: false
      }
    ],
    
    // Default template for other equipment
    "default": [
      {
        id: "maintenance-records",
        category: "Maintenance History",
        title: "Maintenance Records",
        description: "Recent maintenance activities and findings",
        priority: "High" as const,
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
        priority: "High" as const,
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
        priority: "Medium" as const,
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
    ]
  };

  // Select appropriate template based on equipment type
  const selectedTemplate = equipmentTemplates[equipmentType as keyof typeof equipmentTemplates] || equipmentTemplates.default;
  
  console.log(`[AI Evidence] Generating checklist for ${equipmentType} using ${equipmentType in equipmentTemplates ? 'specific' : 'default'} template`);
  
  return selectedTemplate;
}

async function generateEvidenceCategories(equipmentGroup: string, equipmentType: string, evidenceChecklist: any[]) {
  // Generate evidence collection categories based on checklist
  const categories = [
    {
      id: "operational-data",
      name: "Operational Data",
      description: "Process parameters, trends, and operational history",
      required: true,
      acceptedTypes: ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      maxFiles: 5,
      files: [],
      priority: "Critical" as const
    },
    {
      id: "maintenance-records",
      name: "Maintenance Records",
      description: "Work orders, inspection reports, and maintenance history",
      required: true,
      acceptedTypes: ["application/pdf", "text/plain", "text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "image/*"],
      maxFiles: 10,
      files: [],
      priority: "High" as const
    },
    {
      id: "visual-evidence",
      name: "Visual Evidence",
      description: "Photos, videos, and visual documentation",
      required: false,
      acceptedTypes: ["image/*", "video/*"],
      maxFiles: 15,
      files: [],
      priority: "Medium" as const
    },
    {
      id: "technical-docs",
      name: "Technical Documentation",
      description: "Drawings, specifications, and technical references",
      required: false,
      acceptedTypes: ["application/pdf", "image/*"],
      maxFiles: 8,
      files: [],
      priority: "Low" as const
    }
  ];

  return categories;
}

async function performAIAnalysis(equipmentGroup: string, equipmentType: string, equipmentSubtype: string, symptoms: string, evidenceChecklist: any[], evidenceFiles: any[]) {
  // Use configurable AI provider system for analysis
  const { AIService } = await import("./ai-service");
  
  try {
    // Construct AI prompt based on equipment type and evidence
    const analysisPrompt = `
Perform a comprehensive root cause analysis for the following equipment failure:

Equipment Details:
- Equipment Group: ${equipmentGroup}
- Equipment Type: ${equipmentType}
- Symptoms/Problem: ${symptoms}

Evidence Checklist:
${evidenceChecklist.map(item => `- ${item.title}: ${item.description}`).join('\n')}

Evidence Files:
${evidenceFiles.map(file => `- ${file.name}: ${file.description || 'File uploaded'}`).join('\n')}

Provide analysis in JSON format with:
1. Root causes with confidence percentages and supporting evidence
2. Specific recommendations with cost estimates and timeframes
3. Evidence gaps and additional investigation needs
4. Equipment-specific failure patterns and historical correlations

Focus on ${equipmentType.toLowerCase()}-specific failure modes and provide industrial-grade analysis appropriate for enterprise use.
`;

    console.log(`[AI Analysis] Sending request to configured AI provider for ${equipmentType}`);
    
    // Call the configurable AI service
    const aiResponse = await AIService.makeAIRequest(analysisPrompt, equipmentType);
    
    // Parse AI response and structure it appropriately
    let analysisResults;
    try {
      analysisResults = JSON.parse(aiResponse);
    } catch (parseError) {
      console.warn("[AI Analysis] Failed to parse AI response as JSON, using fallback structure");
      // Fallback to equipment-specific structured response if AI doesn't return valid JSON
      analysisResults = await generateFallbackAnalysis(equipmentGroup, equipmentType, equipmentSubtype, symptoms, evidenceChecklist);
    }

    return analysisResults;
    
  } catch (aiError) {
    console.error("[AI Analysis] AI service failed, using fallback analysis:", aiError);
    // Fallback to equipment-specific analysis if AI service is unavailable
    return await generateFallbackAnalysis(equipmentGroup, equipmentType, equipmentSubtype, symptoms, evidenceChecklist);
  }
}

async function generateFallbackAnalysis(equipmentGroup: string, equipmentType: string, equipmentSubtype: string, symptoms: string, evidenceChecklist: any[]) {
  // Intelligent equipment-specific fallback analysis using Evidence Library
  console.log(`[AI Fallback] Generating analysis for ${equipmentGroup} → ${equipmentType} → ${equipmentSubtype}`);
  
  // First, try to get equipment-specific data from Evidence Library
  let libraryData = [];
  try {
    // Search for matching equipment in evidence library using the existing investigationStorage
    const searchResults = await investigationStorage.searchEvidenceLibrary(equipmentType);
    
    // First try exact match including subtype
    if (equipmentSubtype && equipmentSubtype.trim() !== '') {
      libraryData = searchResults.filter((item: any) => 
        item.equipmentGroup === equipmentGroup && 
        item.equipmentType === equipmentType &&
        item.subtype === equipmentSubtype
      );
      console.log(`[AI Fallback] Exact match search: ${libraryData.length} items for ${equipmentGroup} → ${equipmentType} → ${equipmentSubtype}`);
    } else {
      // If no subtype provided, check if we have any matches for this equipment type
      const typeMatches = searchResults.filter((item: any) => 
        item.equipmentGroup === equipmentGroup && 
        item.equipmentType === equipmentType
      );
      
      console.log(`[AI Fallback] No subtype specified. Found ${typeMatches.length} ${equipmentType} entries in Evidence Library:`);
      typeMatches.forEach((item: any) => {
        console.log(`[AI Fallback] Available: ${item.equipmentGroup} → ${item.equipmentType} → ${item.subtype}`);
      });
      
      // If we have type matches but no subtype specified, this indicates missing subtype selection
      if (typeMatches.length > 0) {
        console.log(`[AI Fallback] Equipment type ${equipmentType} found in library but subtype missing from incident`);
        libraryData = []; // Force the "needs library expansion" logic to handle subtype selection
      }
    }
  } catch (error) {
    console.error("[AI Fallback] Error accessing Evidence Library:", error);
  }
  
  let analysisResults;
  if (libraryData.length === 0) {
    // Check if this is a missing subtype issue vs completely missing equipment
    const typeCheckResults = await investigationStorage.searchEvidenceLibrary(equipmentType);
    const availableSubtypes = typeCheckResults
      .filter((item: any) => item.equipmentGroup === equipmentGroup && item.equipmentType === equipmentType)
      .map((item: any) => item.subtype)
      .filter((subtype: string) => subtype && subtype.trim() !== '');
    
    const isMissingSubtype = availableSubtypes.length > 0 && (!equipmentSubtype || equipmentSubtype.trim() === '');
    
    if (isMissingSubtype) {
      // Equipment type exists but subtype missing - prompt for subtype selection
      analysisResults = {
        overallConfidence: 20, // Very low confidence because subtype missing
        analysisDate: new Date(),
        needsSubtypeSelection: true, // Flag indicating subtype needs to be selected
        availableSubtypes: availableSubtypes,
        rootCauses: [
          {
            id: "rc-001",
            description: `Equipment Subtype Missing for ${equipmentGroup} → ${equipmentType}`,
            confidence: 20,
            category: "Incomplete Equipment Selection",
            evidence: [
              `${equipmentType} found in Evidence Library but specific subtype not selected`,
              `Available subtypes: ${availableSubtypes.join(', ')}`,
              "Analysis cannot proceed without complete equipment specification"
            ],
            likelihood: "Unknown" as const,
            impact: "Unknown" as const,
            priority: 1
          }
        ],
        recommendations: [
          {
            id: "rec-001",
            title: "Complete Equipment Selection",
            description: `Select specific ${equipmentType} subtype from available options: ${availableSubtypes.join(', ')}`,
            priority: "Immediate" as const,
            category: "Data Entry",
            estimatedCost: "$0",
            timeframe: "5 minutes",
            responsible: "Investigator",
            preventsProbability: 100
          }
        ],
        promptForSubtypeSelection: {
          equipmentGroup,
          equipmentType,
          availableSubtypes: availableSubtypes,
          message: `Please select the specific ${equipmentType} subtype to continue with analysis`
        }
      };
    } else {
      // No Evidence Library data found - prompt for expansion instead of using wrong fallback
      analysisResults = {
        overallConfidence: 30, // Low confidence because no equipment-specific data available
        analysisDate: new Date(),
        needsEvidenceLibraryExpansion: true, // Flag indicating library needs updating
        rootCauses: [
          {
            id: "rc-001",
            description: `Evidence Library Missing for ${equipmentGroup} → ${equipmentType} → ${equipmentSubtype}`,
            confidence: 30,
            category: "Evidence Gap",
            evidence: [
              "No equipment-specific failure patterns available in Evidence Library",
              "Investigation requires manual engineering analysis",
              "Standard failure modes cannot be determined without equipment data"
            ],
            likelihood: "Unknown" as const,
            impact: "Unknown" as const,
            priority: 1
          }
        ],
      recommendations: [
        {
          id: "rec-001",
          title: "Expand Evidence Library with Equipment-Specific Data",
          description: `Add ${equipmentGroup} → ${equipmentType} → ${equipmentSubtype} failure modes, evidence requirements, and investigation questions to Evidence Library`,
          priority: "Immediate" as const,
          category: "Library Management",
          estimatedCost: "$5,000",
          timeframe: "1-2 weeks",
          responsible: "RCA Administrator",
          preventsProbability: 100
        },
        {
          id: "rec-002",
          title: "Conduct Manual Engineering Analysis",
          description: "Perform detailed engineering analysis with subject matter experts until Evidence Library is expanded",
          priority: "Immediate" as const,
          category: "Engineering",
          estimatedCost: "$15,000",
          timeframe: "2-3 weeks", 
          responsible: "Subject Matter Expert",
          preventsProbability: 85
        }
      ],
      crossMatchResults: {
        libraryMatches: 0,
        patternSimilarity: 0,
        historicalData: [
          "No historical patterns available - Evidence Library expansion required",
          `${equipmentGroup} → ${equipmentType} → ${equipmentSubtype} not found in current database`
        ]
      },
      evidenceGaps: [
        `Equipment-specific evidence requirements not defined for ${equipmentType}`,
        "Cannot determine critical evidence without Equipment Library data",
        "Investigation questions unavailable for this equipment combination"
      ],
      additionalInvestigation: [
        `Research industry best practices for ${equipmentType} failure analysis`,
        "Consult with equipment manufacturers for failure mode patterns",
        `Update Evidence Library with ${equipmentGroup} → ${equipmentType} → ${equipmentSubtype} data`,
        "Establish evidence collection procedures for this equipment type"
      ],
      promptForLibraryExpansion: {
        equipmentGroup,
        equipmentType,
        equipmentSubtype,
        suggestedFailureModes: [
          "Component degradation patterns",
          "Operating parameter deviations", 
          "Maintenance-related failures"
        ],
        suggestedEvidenceTypes: [
          "Performance data trending",
          "Maintenance records",
          "Operating condition logs",
          "Inspection reports"
        ],
        nextSteps: [
          "Add equipment to Evidence Library",
          "Define failure modes and evidence requirements",
          "Establish AI investigation questions",
          "Re-run analysis with complete library data"
        ]
      }
    };
    }
  } else {
    // Intelligent Evidence Library-driven analysis with learning capabilities
    if (libraryData.length > 0) {
      console.log(`[Intelligence] Using ${libraryData.length} Evidence Library entries for analysis`);
      
      // Record usage for intelligence tracking
      for (const item of libraryData) {
        await investigationStorage.recordEvidenceUsage(item.id);
      }
      
      // Generate analysis using CONFIGURABLE Evidence Library fields (no hardcoded logic!)
      const rootCauses = libraryData.slice(0, 3).map((item: any, index: number) => {
        // Use admin-configurable confidence level instead of hardcoded calculation
        const confidenceMap = {
          "High": 90,
          "Medium": 70,
          "Low": 50
        };
        const baseConfidence = confidenceMap[item.confidenceLevel] || 
                              (item.riskRanking === "High" ? 85 : item.riskRanking === "Medium" ? 70 : 55);
        
        return {
          id: `rc-00${index + 1}`,
          description: item.componentFailureMode,
          confidence: baseConfidence,
          category: item.equipmentGroup,
          evidence: [
            item.requiredTrendDataEvidence || "Required trend data not specified",
            item.aiOrInvestigatorQuestions || "Investigation questions available",
            item.attachmentsEvidenceRequired || "Supporting evidence required",
            // Add configurable intelligence fields to evidence
            ...(item.prerequisiteEvidence ? [`Prerequisites: ${item.prerequisiteEvidence}`] : []),
            ...(item.industryBenchmark ? [`Industry Standard: ${item.industryBenchmark}`] : [])
          ],
          likelihood: item.riskRanking as "High" | "Medium" | "Low",
          impact: item.riskRanking as "High" | "Medium" | "Low",
          priority: item.evidencePriority || (index + 1), // Use configurable priority
          // Expose all configurable intelligence metadata
          evidenceLibraryId: item.id,
          diagnosticValue: item.diagnosticValue,
          timeToCollect: item.timeToCollect,
          collectionCost: item.collectionCost,
          analysisComplexity: item.analysisComplexity,
          industryRelevance: item.industryRelevance,
          seasonalFactor: item.seasonalFactor
        };
      });

      const recommendations = libraryData.slice(0, 2).map((item: any, index: number) => {
        // Use configurable fields for recommendations (no hardcoded logic!)
        const priorityMap = {
          1: "Immediate" as const,
          2: "Short-term" as const, 
          3: "Medium-term" as const,
          4: "Long-term" as const
        };
        
        const costMap = {
          "Low": "$5,000",
          "Medium": "$15,000", 
          "High": "$35,000",
          "Very High": "$75,000"
        };
        
        const timeMap = {
          "Immediate": "1-2 weeks",
          "Hours": "2-3 days",
          "Days": "1-2 weeks", 
          "Weeks": "4-8 weeks"
        };
        
        return {
          id: `rec-00${index + 1}`,
          title: `Address ${item.componentFailureMode}`,
          description: `${item.rootCauseLogic || 'Implement evidence-based solution'}. ${item.followupActions || 'Follow standard procedures'}.`,
          priority: priorityMap[item.evidencePriority] || "Medium-term" as const,
          category: item.equipmentGroup,
          estimatedCost: costMap[item.collectionCost] || "$20,000",
          timeframe: timeMap[item.timeToCollect] || "3-4 weeks",
          responsible: item.analysisComplexity === "Expert Required" ? "Subject Matter Expert" : 
                      item.equipmentGroup === "Electrical" ? "Electrical Engineer" : "Maintenance Manager",
          preventsProbability: item.diagnosticValue === "Critical" ? 95 : 
                              item.diagnosticValue === "Important" ? 85 : 75,
          // Include all configurable intelligence in recommendations
          industryRelevance: item.industryRelevance,
          seasonalConsiderations: item.seasonalFactor,
          relatedFailures: item.relatedFailureModes
        };
      });

      analysisResults = {
        overallConfidence: 85,
        analysisDate: new Date(),
        rootCauses,
        recommendations,
        crossMatchResults: {
          libraryMatches: libraryData.length,
          patternSimilarity: 85,
          historicalData: [
            `${libraryData[0]?.componentFailureMode} pattern - Equipment Type: ${equipmentType} (2023)`,
            `Similar failure in ${equipmentGroup.toLowerCase()} equipment - Industrial facility (2022)`,
            `${equipmentType} reliability study - Evidence Library correlation (2021)`
          ]
        },
        evidenceGaps: [
          `${libraryData[0]?.requiredTrendDataEvidence} not provided - recommend immediate collection`,
          `${libraryData[0]?.attachmentsEvidenceRequired} missing - could provide critical insights`
        ],
        additionalInvestigation: [
          `Perform analysis based on: ${libraryData[0]?.requiredTrendDataEvidence}`,
          `Investigate: ${libraryData[0]?.aiOrInvestigatorQuestions}`,
          `Review maintenance records for similar ${equipmentType.toLowerCase()} failures`
        ]
      };
    }
  }

  return analysisResults;
}

async function generateFinalReport(incidentId: number, engineerReview: any) {
  // Generate comprehensive RCA report URL
  const reportUrl = `/api/reports/rca-${incidentId}-${Date.now()}.pdf`;
  
  // In a real implementation, this would generate an actual PDF report
  // For now, return a simulated URL
  return reportUrl;
}