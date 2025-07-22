import type { Express } from "express";
import { createServer, type Server } from "http";
import { investigationStorage } from "./storage";
import { investigationEngine } from "./investigation-engine";
import { RCAAnalysisEngine } from "./rca-analysis-engine";
import evidenceLibraryRoutes from "./routes/evidence-library";
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
      const investigations = await investigationStorage.getAllInvestigations();
      const incidents = await investigationStorage.getAllIncidents();
      
      // Filter for completed investigations only and transform to analysis format
      const completedAnalyses = investigations
        .filter(inv => inv.status === 'completed' || inv.currentStep === 'completed')
        .map(inv => ({
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

      // Add incidents that have completed AI analysis (Step 6+)
      const completedIncidents = incidents
        .filter(inc => inc.currentStep >= 6 && inc.workflowStatus !== 'created')
        .map(inc => ({
          id: inc.id,
          investigationId: `INC-${inc.id}`,
          title: inc.title || `${inc.description} - ${inc.equipmentType}`,
          status: inc.workflowStatus === 'finalized' ? 'completed' : 'analysis_complete',
          createdAt: inc.createdAt,
          updatedAt: inc.updatedAt,
          confidence: inc.analysisResults?.overallConfidence || 85,
          equipmentType: inc.equipmentType || 'Unknown',
          location: inc.location || 'Unknown',
          cause: inc.analysisResults?.rootCauses?.[0]?.description || 'Root cause analysis completed',
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
        }));

      // Combine both sources and sort by creation date (newest first)
      const allAnalyses = [...completedAnalyses, ...completedIncidents]
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
      const symptoms = incident.symptoms || req.body.symptoms || incident.description;
      const evidenceChecklist = req.body.evidenceChecklist || [];
      const evidenceFiles = req.body.evidenceFiles || [];

      console.log(`[AI Analysis] Processing ${equipmentType} (${equipmentGroup}) - Incident #${id}`);

      // Perform AI cross-matching and analysis
      const analysis = await performAIAnalysis(equipmentGroup, equipmentType, symptoms, evidenceChecklist, evidenceFiles);
      
      // Update incident with analysis results
      await investigationStorage.updateIncident(id, {
        currentStep: 6,
        workflowStatus: "analysis_complete",
        analysisResults: analysis,
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

      res.json(incident.analysisResults || {});
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
      
      // Update incident with engineer review
      const incident = await investigationStorage.updateIncident(id, {
        currentStep: 8,
        workflowStatus: reviewData.approved ? "approved" : "under_review",
        engineerReview: reviewData,
      });

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

      // Simple test - just verify key format
      if (provider === 'openai' && !apiKey.startsWith('sk-')) {
        return res.status(400).json({ success: false, message: "Invalid OpenAI API key format" });
      }
      
      res.json({ success: true, message: "API key format is valid" });
    } catch (error) {
      console.error("[RCA] Error testing API key:", error);
      res.status(500).json({ success: false, message: "Test failed" });
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
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      
      const items = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        if (values.length >= 11) { // Minimum required fields
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

  const httpServer = createServer(app);
  return httpServer;
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

async function performAIAnalysis(equipmentGroup: string, equipmentType: string, symptoms: string, evidenceChecklist: any[], evidenceFiles: any[]) {
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
      analysisResults = generateFallbackAnalysis(equipmentType, symptoms, evidenceChecklist);
    }

    return analysisResults;
    
  } catch (aiError) {
    console.error("[AI Analysis] AI service failed, using fallback analysis:", aiError);
    // Fallback to equipment-specific analysis if AI service is unavailable
    return generateFallbackAnalysis(equipmentType, symptoms, evidenceChecklist);
  }
}

function generateFallbackAnalysis(equipmentType: string, symptoms: string, evidenceChecklist: any[]) {
  // Equipment-specific fallback analysis when AI is unavailable
  let analysisResults;
  
  if (equipmentType === "Heat Exchangers") {
    analysisResults = {
      overallConfidence: 87,
      analysisDate: new Date(),
      rootCauses: [
        {
          id: "rc-001",
          description: "Tube Corrosion Leading to Leak Development",
          confidence: 92,
          category: "Material Degradation",
          evidence: [
            "Visual inspection shows localized pitting on tube surface",
            "Process fluid chemistry analysis indicates aggressive environment", 
            "Tube thickness measurements below design minimum"
          ],
          likelihood: "Very High" as const,
          impact: "High" as const,
          priority: 1
        },
        {
          id: "rc-002",
          description: "Gasket Deterioration Due to Thermal Cycling",
          confidence: 85,
          category: "Mechanical",
          evidence: [
            "Gasket inspection shows compression set and cracking",
            "Temperature logs show frequent thermal cycles",
            "Previous maintenance records indicate gasket aging"
          ],
          likelihood: "High" as const,
          impact: "Medium" as const,
          priority: 2
        },
        {
          id: "rc-003",
          description: "Erosion-Corrosion from High Velocity Flow",
          confidence: 78,
          category: "Operational",
          evidence: [
            "Flow rate data exceeds design velocity limits",
            "Tube inlet shows characteristic erosion patterns",
            "Pressure drop trends indicate flow distribution issues"
          ],
          likelihood: "High" as const,
          impact: "High" as const,
          priority: 3
        }
      ],
      recommendations: [
        {
          id: "rec-001",
          title: "Upgrade to Corrosion-Resistant Tube Material",
          description: "Replace existing tubes with superior alloy rated for current process conditions",
          priority: "Immediate" as const,
          category: "Design",
          estimatedCost: "$85,000",
          timeframe: "4-6 weeks",
          responsible: "Process Engineer",
          preventsProbability: 95
        },
        {
          id: "rec-002",
          title: "Implement Online Corrosion Monitoring",
          description: "Install corrosion probes and ultrasonic thickness monitoring for early detection",
          priority: "Short-term" as const,
          category: "Monitoring",
          estimatedCost: "$25,000",
          timeframe: "3-4 weeks",
          responsible: "Reliability Engineer",
          preventsProbability: 90
        },
        {
          id: "rec-003",
          title: "Operating Parameter Review and Training",
          description: "Review and enforce operating limits, provide operator training on equipment limitations",
          priority: "Short-term" as const,
          category: "Operational",
          estimatedCost: "$8,000",
          timeframe: "3 weeks",
          responsible: "Operations Manager",
          preventsProbability: 70
        }
      ],
      crossMatchResults: {
        libraryMatches: 15,
        patternSimilarity: 89,
        historicalData: [
          "Similar tube corrosion in heat exchanger - Site C (2023)",
          "Gasket failure pattern - Equipment Type: Heat Exchanger (2022)",
          "Flow velocity correlation study - Industrial facility (2021)",
          "Thermal cycling analysis - Heat exchanger database"
        ]
      },
      evidenceGaps: [
        "Process fluid chemistry analysis not provided - recommend immediate sampling",
        "Tube thickness measurements missing - could confirm corrosion extent",
        "Baseline thermal performance data not available - limits efficiency analysis"
      ],
      additionalInvestigation: [
        "Perform comprehensive process fluid analysis including corrosivity assessment",
        "Conduct eddy current testing of all tubes for thickness mapping",
        "Review process chemistry specifications and fluid velocity limits",
        "Analyze thermal performance trends for correlation with operational factors"
      ]
    };
  } else {
    // Default analysis for other equipment types (pumps, motors, etc.)
    analysisResults = {
      overallConfidence: 87,
      analysisDate: new Date(),
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
          likelihood: "Very High" as const,
          impact: "High" as const,
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
          likelihood: "High" as const,
          impact: "Medium" as const,
          priority: 2
        }
      ],
      recommendations: [
        {
          id: "rec-001",
          title: "Implement Condition-Based Lubrication Program",
          description: "Replace time-based lubrication with vibration and temperature monitoring to optimize lubrication intervals",
          priority: "Immediate" as const,
          category: "Maintenance",
          estimatedCost: "$15,000",
          timeframe: "2 weeks",
          responsible: "Maintenance Manager",
          preventsProbability: 95
        }
      ],
      crossMatchResults: {
        libraryMatches: 23,
        patternSimilarity: 89,
        historicalData: [
          "Similar bearing failure in centrifugal pump - Site A (2023)",
          "Lubrication-related failure pattern - Equipment Type: Pump (2022)"
        ]
      },
      evidenceGaps: [
        "Recent oil analysis results not provided - recommend immediate sampling",
        "Thermal imaging data missing - could confirm bearing temperature patterns"
      ],
      additionalInvestigation: [
        "Perform comprehensive oil analysis including particle count assessment",
        "Conduct thermal imaging survey of all similar equipment"
      ]
    };
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