import type { Express } from "express";
import { createServer, type Server } from "http";
import { investigationStorage } from "./storage";
import { investigationEngine } from "./investigation-engine";
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

      // Generate analysis based on investigation type
      let analysisResults;
      let recommendations;

      if (investigation.investigationType === 'safety_environmental') {
        analysisResults = investigationEngine.generateECFA(investigation.evidenceData);
      } else {
        analysisResults = investigationEngine.generateFaultTree(investigation.evidenceData);
      }

      recommendations = investigationEngine.generateRecommendations(
        investigation.investigationType!,
        investigation.evidenceData,
        analysisResults
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

  const httpServer = createServer(app);
  return httpServer;
}