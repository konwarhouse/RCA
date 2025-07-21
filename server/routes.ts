import type { Express } from "express";
import { createServer, type Server } from "http";
import { investigationStorage } from "./storage";
import { investigationEngine } from "./investigation-engine";
import { RCAAnalysisEngine } from "./rca-analysis-engine";
import evidenceLibraryRoutes from "./routes/evidence-library";
import multer from "multer";

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

  // Get all analyses (alias for investigations for history page)
  app.get("/api/analyses", async (req, res) => {
    try {
      const investigations = await investigationStorage.getAllInvestigations();
      
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
          recommendations: inv.recommendations
        }));

      res.json(completedAnalyses);
    } catch (error) {
      console.error("[RCA] Error fetching analyses:", error);
      res.status(500).json({ message: "Failed to fetch analyses" });
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

  const httpServer = createServer(app);
  return httpServer;
}