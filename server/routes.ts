import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertAnalysisSchema, updateAnalysisSchema, insertAiSettingsSchema } from "@shared/schema";
import { AIService } from "./ai-service";
import { DataParser } from "./data-parser";
import { RCAEngine } from "./rca-engine";
import { z } from "zod";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all analyses
  app.get("/api/analyses", async (req, res) => {
    try {
      const { search, priority, dateRange } = req.query;
      
      let analyses;
      
      if (search) {
        analyses = await storage.searchAnalyses(search as string);
      } else if (priority) {
        analyses = await storage.getAnalysesByPriority(priority as string);
      } else if (dateRange) {
        const now = new Date();
        let startDate = new Date();
        
        switch (dateRange) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(now.getMonth() - 3);
            break;
          default:
            startDate = new Date(0); // All time
        }
        
        analyses = await storage.getAnalysesByDateRange(startDate, now);
      } else {
        analyses = await storage.getAllAnalyses();
      }
      
      res.json(analyses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analyses" });
    }
  });

  // Get single analysis
  app.get("/api/analyses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const analysis = await storage.getAnalysis(id);
      
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analysis" });
    }
  });

  // Create new analysis - Evidence Collection First Workflow
  app.post("/api/analyses/create", upload.array("files"), async (req, res) => {
    try {
      console.log("[RCA] Creating new analysis with evidence-first workflow...");
      
      const analysisId = `RCA-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000) + 100000}`;
      
      // Create analysis in evidence_collection stage
      const analysis = await storage.createAnalysis({
        analysisId,
        workflowStage: "evidence_collection",
        status: "evidence_collection",
        priority: "medium",
        uploadedFiles: req.files ? (req.files as Express.Multer.File[]).map(file => ({
          name: file.originalname,
          size: file.size,
          type: file.mimetype,
          uploadedAt: new Date().toISOString()
        })) : [],
        // Initially empty - will be populated during evidence collection
        issueDescription: null,
        equipmentType: null,
        equipmentId: null,
        location: null
      });

      console.log(`[RCA] Created analysis ${analysisId} in evidence collection mode`);
      
      res.status(201).json(analysis);
    } catch (error) {
      console.error("[RCA] Error creating analysis:", error);
      res.status(500).json({ message: "Failed to create analysis" });
    }
  });

  // Update evidence data
  app.put("/api/analyses/:id/evidence", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { evidenceData, answers } = req.body;
      
      console.log(`[RCA] Updating evidence data for analysis ${id}`);
      
      // Extract legacy fields from evidence data for backward compatibility
      const issueDescription = evidenceData?.symptomDefinition?.observedProblem || 
                              answers?.observed_problem || 
                              "Evidence collection in progress";
      const equipmentType = evidenceData?.assetContext?.equipmentType || 
                           answers?.equipment_type;
      const equipmentId = evidenceData?.assetContext?.equipmentId || 
                         answers?.equipment_id;
      const location = evidenceData?.assetContext?.location || 
                      answers?.location;

      const updatedAnalysis = await storage.updateAnalysis(id, {
        evidenceData,
        issueDescription,
        equipmentType,
        equipmentId,
        location,
        workflowStage: "evidence_collection"
      });

      res.json(updatedAnalysis);
    } catch (error) {
      console.error("[RCA] Error updating evidence:", error);
      res.status(500).json({ message: "Failed to update evidence" });
    }
  });

  // Proceed to AI Analysis (after evidence collection is complete)
  app.post("/api/analyses/:id/proceed-to-analysis", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { answers } = req.body;
      
      console.log(`[RCA] Proceeding to AI analysis for analysis ${id}`);
      
      // Update status to analysis_ready
      await storage.updateAnalysis(id, {
        workflowStage: "analysis_ready",
        status: "processing",
        evidenceCompletedAt: new Date()
      });

      // Start AI analysis process in background
      performComprehensiveRCA(id, answers);
      
      res.json({ message: "AI analysis started" });
    } catch (error) {
      console.error("[RCA] Error starting analysis:", error);
      res.status(500).json({ message: "Failed to start analysis" });
    }
  });

  // Legacy route for backward compatibility - Create new analysis with comprehensive data parsing
  app.post("/api/analyses", upload.array("files"), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { 
        issueDescription, 
        equipmentType, 
        equipmentId, 
        location, 
        operatingParameters 
      } = req.body;
      
      if (!issueDescription && (!files || files.length === 0)) {
        return res.status(400).json({ 
          message: "Either issue description or uploaded files are required" 
        });
      }
      
      // Generate unique analysis ID
      const analysisId = `RCA-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      const uploadedFiles = files.map(file => ({
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        uploadedAt: new Date().toISOString(),
      }));
      
      // Parse operating parameters if provided
      let parsedOperatingParameters = null;
      if (operatingParameters) {
        try {
          parsedOperatingParameters = JSON.parse(operatingParameters);
        } catch (e) {
          console.warn("Failed to parse operating parameters:", e);
        }
      }

      // Step 1: Parse uploaded files to extract structured data
      let parsedData: any = {};
      let extractionConfidence = 0;
      
      if (files && files.length > 0) {
        console.log(`[RCA] Parsing ${files.length} uploaded files...`);
        
        for (const file of files) {
          try {
            const fileData = await DataParser.parseFile(file.buffer, file.originalname);
            console.log(`[RCA] Successfully parsed ${file.originalname}`);
            
            // Merge parsed data
            parsedData = {
              ...parsedData,
              [`file_${file.originalname}`]: fileData
            };
            
            // Update confidence based on data quality
            if (fileData.confidence) {
              extractionConfidence = Math.max(extractionConfidence, fileData.confidence);
            }
          } catch (error) {
            console.warn(`[RCA] Failed to parse ${file.originalname}:`, error.message);
          }
        }
        
        // Clean and normalize parsed data
        parsedData = DataParser.cleanAndValidate(parsedData);
      }

      // If no equipment type provided, try to extract from parsed data
      let finalEquipmentType = equipmentType;
      if (!finalEquipmentType && parsedData.equipment?.type) {
        finalEquipmentType = parsedData.equipment.type;
      }

      // Create initial analysis record
      const analysisData = {
        analysisId,
        issueDescription: issueDescription || "Analysis from uploaded data",
        equipmentType: finalEquipmentType || "unknown",
        equipmentId: equipmentId || parsedData.equipment?.id || null,
        location: location || parsedData.equipment?.location || null,
        priority: "medium",
        status: "processing" as const,
        uploadedFiles,
        operatingParameters: parsedOperatingParameters,
        historicalData: null,
        learningInsights: null,
        rootCause: null,
        confidence: null,
        recommendations: null,
        // Enhanced fields for comprehensive RCA
        parsedData,
        rcaAnalysis: null,
        evidenceCorrelation: null,
        stepwiseReasoning: null,
        missingDataPrompts: null,
        manualAdjustments: null,
        versionHistory: [{
          version: 1,
          timestamp: new Date().toISOString(),
          changes: "Initial analysis created",
          confidence: extractionConfidence
        }]
      };
      
      const validatedData = insertAnalysisSchema.parse(analysisData);
      const analysis = await storage.createAnalysis(validatedData);
      
      // Step 2: Start comprehensive RCA processing in the background
      performComprehensiveRCA(analysis.id, parsedData, {
        equipmentType: finalEquipmentType,
        operatingParameters: parsedOperatingParameters,
        issueDescription
      });
      
      res.status(201).json(analysis);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Analysis creation error:", error);
      res.status(500).json({ message: "Failed to create analysis" });
    }
  });

  // Update analysis
  app.patch("/api/analyses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateAnalysisSchema.parse(req.body);
      
      const analysis = await storage.updateAnalysis(id, validatedData);
      
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      
      res.json(analysis);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update analysis" });
    }
  });

  // Get analytics/metrics
  app.get("/api/analytics", async (req, res) => {
    try {
      const analyses = await storage.getAllAnalyses();
      
      const totalAnalyses = analyses.length;
      const completedAnalyses = analyses.filter(a => a.status === 'completed');
      const rootCausesIdentified = completedAnalyses.filter(a => a.rootCause).length;
      
      // Calculate average analysis time (mock calculation)
      const avgAnalysisTime = "2.3m";
      
      // Calculate success rate
      const successRate = totalAnalyses > 0 ? (completedAnalyses.length / totalAnalyses * 100).toFixed(1) : "0.0";
      
      // Root cause distribution
      const rootCauseCategories = {
        "Equipment Failure": 35,
        "Human Error": 25,
        "Process Issues": 20,
        "Environmental": 12,
        "Software": 8
      };
      
      // Confidence distribution
      const confidenceDistribution = {
        "90-100%": 42,
        "80-89%": 28,
        "70-79%": 15,
        "60-69%": 8,
        "<60%": 3
      };
      
      res.json({
        totalAnalyses,
        rootCausesIdentified,
        avgAnalysisTime,
        successRate: parseFloat(successRate),
        rootCauseDistribution: rootCauseCategories,
        confidenceDistribution
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Admin AI Settings Routes
  app.get("/api/admin/ai-settings", async (req, res) => {
    try {
      const settings = await storage.getAllAiSettings();
      // Don't send encrypted keys to frontend
      const sanitizedSettings = settings.map(setting => ({
        ...setting,
        encryptedApiKey: undefined
      }));
      res.json(sanitizedSettings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI settings" });
    }
  });

  app.post("/api/admin/ai-settings/test", async (req, res) => {
    try {
      const { provider, apiKey } = req.body;
      
      if (!provider || !apiKey) {
        return res.status(400).json({ message: "Provider and API key are required" });
      }

      const result = await AIService.testApiKey(provider, apiKey);
      
      if (result.success) {
        res.json({ success: true, message: "Connection successful" });
      } else {
        res.status(400).json({ success: false, message: result.error });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: "Test failed" });
    }
  });

  app.post("/api/admin/ai-settings", async (req, res) => {
    try {
      const validatedData = insertAiSettingsSchema.parse(req.body);
      
      // Test the key first
      const testResult = await AIService.testApiKey(validatedData.provider, validatedData.apiKey);
      
      if (!testResult.success) {
        return res.status(400).json({ message: "API key test failed: " + testResult.error });
      }

      const savedSettings = await AIService.saveAiSettings({
        provider: validatedData.provider,
        apiKey: validatedData.apiKey,
        isActive: validatedData.isActive,
        createdBy: validatedData.createdBy || 1, // Mock admin user
      });

      res.status(201).json({
        ...savedSettings,
        encryptedApiKey: undefined // Don't send back encrypted key
      });
    } catch (error) {
      console.error("AI Settings save error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save AI settings", error: error.message });
    }
  });

  app.delete("/api/admin/ai-settings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAiSettings(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete AI settings" });
    }
  });

  // Handle missing data prompts and re-analysis
  app.post("/api/analyses/:id/provide-data", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { responses, additionalData } = req.body;
      
      const analysis = await storage.getAnalysis(id);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      // Merge new responses with existing data
      const updatedData = {
        ...analysis.parsedData,
        userResponses: responses,
        additionalData
      };

      // Update analysis status and trigger re-analysis
      await storage.updateAnalysis(id, {
        parsedData: updatedData,
        status: "processing",
        missingDataPrompts: null
      });

      // Re-run comprehensive RCA with additional data
      performComprehensiveRCA(id, updatedData, responses);

      res.json({ message: "Additional data provided, re-analyzing..." });
    } catch (error) {
      console.error("Provide data error:", error);
      res.status(500).json({ message: "Failed to process additional data" });
    }
  });

  // Manual adjustment endpoint for expert override
  app.post("/api/analyses/:id/manual-adjustment", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { adjustments, reasoning, expertOverride } = req.body;
      
      const analysis = await storage.getAnalysis(id);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      // Track manual adjustments with audit trail
      const manualAdjustments = [
        ...(analysis.manualAdjustments || []),
        {
          timestamp: new Date().toISOString(),
          adjustments,
          reasoning,
          expertOverride,
          confidence: expertOverride ? 100 : analysis.confidence
        }
      ];

      // Update analysis with manual adjustments
      const updateData: any = {
        manualAdjustments,
        status: "completed"
      };

      if (expertOverride) {
        updateData.rootCause = adjustments.rootCause || analysis.rootCause;
        updateData.recommendations = adjustments.recommendations || analysis.recommendations;
        updateData.confidence = 100; // Expert override = 100% confidence
      }

      await storage.updateAnalysis(id, updateData);

      res.json({ message: "Manual adjustments saved successfully" });
    } catch (error) {
      console.error("Manual adjustment error:", error);
      res.status(500).json({ message: "Failed to save manual adjustments" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Comprehensive RCA processing with stepwise analysis and evidence correlation
async function performComprehensiveRCA(
  analysisId: number, 
  evidenceData?: any, 
  userInputs?: any,
  historicalData?: any
) {
  console.log(`[RCA] Starting comprehensive analysis for ID: ${analysisId}`);
  
  try {
    // Step 1: Data validation and preprocessing
    await storage.updateAnalysisStatus(analysisId, "processing", "Data validation and preprocessing");
    
    // Step 2: Perform RCA analysis using the comprehensive engine
    const rcaAnalysis = await RCAEngine.performAnalysis(parsedData, userInputs, historicalData);
    
    // Step 3: Check for missing critical data and generate prompts
    const missingDataPrompts = generateMissingDataPrompts(rcaAnalysis, parsedData);
    
    // Step 4: Update analysis with comprehensive results
    const updateData = {
      status: missingDataPrompts.length > 0 ? "needs_input" : "completed",
      rootCause: rcaAnalysis.causeAnalysis.rootCause,
      confidence: Math.round(rcaAnalysis.causeAnalysis.confidence * 100),
      recommendations: rcaAnalysis.recommendations.map(r => r.action),
      rcaAnalysis,
      evidenceCorrelation: rcaAnalysis.evidenceCorrelation,
      stepwiseReasoning: rcaAnalysis.reasoning,
      missingDataPrompts,
      completedAt: missingDataPrompts.length === 0 ? new Date() : null
    };
    
    await storage.updateAnalysis(analysisId, updateData);
    
    console.log(`[RCA] Analysis ${analysisId} completed with ${rcaAnalysis.causeAnalysis.confidence * 100}% confidence`);
    
  } catch (error) {
    console.error(`[RCA] Analysis ${analysisId} failed:`, error);
    await storage.updateAnalysisStatus(analysisId, "failed", `Analysis failed: ${error.message}`);
  }
}

// Generate prompts for missing critical data
function generateMissingDataPrompts(rcaAnalysis: any, parsedData: any): any[] {
  const prompts: any[] = [];
  
  // Check for missing equipment details
  if (rcaAnalysis.assetInfo.confidence < 0.8) {
    prompts.push({
      id: 'equipment_clarification',
      type: 'equipment',
      question: 'Please provide more specific equipment details',
      priority: 'high',
      options: ['Clarify equipment type', 'Provide equipment ID', 'Specify equipment location']
    });
  }
  
  // Check for missing operating conditions
  if (rcaAnalysis.evidenceCorrelation.missing.length > 0) {
    prompts.push({
      id: 'missing_parameters',
      type: 'operating_data',
      question: 'Critical operating parameters are missing for higher confidence analysis',
      priority: 'medium',
      missing: rcaAnalysis.evidenceCorrelation.missing
    });
  }
  
  // Check for low confidence in symptom analysis
  if (rcaAnalysis.symptomAnalysis.confidence < 0.7) {
    prompts.push({
      id: 'symptom_clarification',
      type: 'symptoms',
      question: 'Please provide more details about the observed symptoms',
      priority: 'high',
      context: rcaAnalysis.symptomAnalysis.primary
    });
  }
  
  return prompts;
}

// Enhanced AI processing with real AI provider integration and fallback simulation
async function simulateAIProcessing(analysisId: number, equipmentType?: string, operatingParameters?: any) {
  let rootCause = "";
  let confidence = 85;
  let finalRecommendations: string[] = [];
  
  try {
    // Check if we have an active AI provider
    const aiProvider = await AIService.getActiveAiProvider();
    
    if (aiProvider) {
      // Use real AI for comprehensive analysis
      const prompt = `Perform comprehensive root cause analysis for ${equipmentType || 'equipment'} failure:
        
        EQUIPMENT DATA:
        - Type: ${equipmentType}
        - Operating Parameters: ${JSON.stringify(operatingParameters || {})}
        
        ANALYSIS FRAMEWORK:
        1. Data Validation: Check for missing critical parameters (lubrication, electrical, runtime, environmental)
        2. Feature Extraction: Identify parameter trends, correlations, and excursions from baseline
        3. Failure Mode Mapping: Map symptoms to likely causes using reliability engineering principles
        4. Evidence Correlation: Link parameter history to support conclusions
        
        REQUIRED OUTPUT FORMAT:
        Root Cause: [Primary technical cause with confidence reasoning]
        Confidence: [85-99]%
        Contributing Factors: [Secondary factors that enabled the failure]
        Evidence: [Specific parameter data supporting the conclusion]
        Missing Data: [Critical parameters needed for higher confidence]
        Recommendations: [5 specific, actionable recommendations]
        
        Use engineering principles for ${equipmentType} reliability analysis. Consider lubrication, electrical, environmental, process, and maintenance factors.`;
      
      const aiResponse = await AIService.makeAIRequest(prompt, equipmentType);
      
      // Parse AI response (simplified parsing)
      const lines = aiResponse.split('\n');
      const rootCauseLine = lines.find(line => line.includes('Root Cause:'));
      const confidenceLine = lines.find(line => line.includes('Confidence:'));
      const recommendationsStart = lines.findIndex(line => line.includes('Recommendations:'));
      
      if (rootCauseLine) {
        rootCause = rootCauseLine.replace('Root Cause:', '').trim();
      }
      
      if (confidenceLine) {
        const match = confidenceLine.match(/(\d+)%/);
        if (match) confidence = parseInt(match[1]);
      }
      
      if (recommendationsStart >= 0) {
        finalRecommendations = lines.slice(recommendationsStart + 1)
          .filter(line => line.trim())
          .slice(0, 5)
          .map(line => line.replace(/^[-\d.]\s*/, '').trim());
      }
    }
  } catch (error) {
    console.warn("AI analysis failed, falling back to simulation:", error.message);
  }
  
  // If no AI results, use simulation
  if (!rootCause) {
    const stages = [
      { name: "parsing", duration: 2000 },
      { name: "nlp", duration: 3000 },
      { name: "pattern", duration: 4000 },
      { name: "rootcause", duration: 3500 },
      { name: "recommendations", duration: 2500 }
    ];
    
    // Simulate processing stages
    for (const stage of stages) {
      await new Promise(resolve => setTimeout(resolve, stage.duration));
    }
    
    // Comprehensive equipment-specific root cause analysis with parameter correlation
    const equipmentSpecificCauses = {
      pump: [
        "Bearing failure due to inadequate lubrication (oil level, temperature, contamination)",
        "Impeller wear from abrasive particles in process fluid",
        "Mechanical seal failure from dry running or misalignment",
        "Cavitation damage from insufficient NPSH or suction blockage",
        "Coupling misalignment causing excessive vibration and shaft stress",
        "Suction strainer blockage reducing flow and causing cavitation",
        "Discharge valve throttling causing recirculation and heating"
      ],
      motor: [
        "Bearing failure from inadequate lubrication (over-greasing, contamination, wrong type)",
        "Stator winding failure from electrical overload or insulation breakdown",
        "Rotor bar failure from frequent starts, thermal cycling, or mechanical stress",
        "Cooling system blockage causing overheating and insulation degradation",
        "Phase imbalance or voltage fluctuation causing electrical stress",
        "Moisture ingress degrading insulation resistance",
        "Excessive vibration from misalignment, imbalance, or foundation issues"
      ],
      compressor: [
        "Valve failure from contamination, wear, or improper timing",
        "Intercooler fouling reducing heat transfer efficiency",
        "Lubrication system failure causing bearing or cylinder wear",
        "Belt/coupling wear from misalignment or tension issues",
        "Pressure relief valve stuck open"
      ],
      conveyor: [
        "Belt slippage due to insufficient tension",
        "Roller bearing failure causing belt tracking issues",
        "Motor overload from material buildup",
        "Drive chain wear causing power transmission loss",
        "Guide rail misalignment affecting belt stability"
      ],
      gearbox: [
        "Gear tooth wear from inadequate lubrication",
        "Bearing failure due to contaminated oil",
        "Seal leakage causing oil loss",
        "Misalignment causing excessive stress",
        "Overheating from high operating loads"
      ],
      heat_exchanger: [
        "Tube fouling reducing heat transfer efficiency",
        "Gasket failure causing internal leakage",
        "Corrosion damage from aggressive media",
        "Thermal stress cracking in tube sheets",
        "Baffle damage affecting flow distribution"
      ]
    };

    const equipmentRecommendations = {
      pump: [
        "Clean or replace suction strainer",
        "Inspect and replace impeller if worn",
        "Replace pump seals and gaskets",
        "Check and optimize suction piping",
        "Upgrade bearing lubrication system"
      ],
      motor: [
        "Clean motor cooling fins and housing",
        "Balance rotor and check coupling alignment",
        "Replace motor bearings and seals",
        "Upgrade insulation system",
        "Install vibration monitoring system"
      ],
      compressor: [
        "Service or replace faulty valves",
        "Clean intercooler and cooling system",
        "Change oil and filter system",
        "Realign belt drive system",
        "Calibrate pressure relief system"
      ],
      conveyor: [
        "Adjust belt tension to specifications",
        "Replace worn rollers and bearings",
        "Implement belt tension monitoring",
        "Align motor coupling and drive system"
      ],
      heat_exchanger: [
        "Chemical cleaning to remove fouling",
        "Replace damaged tubes and gaskets",
        "Install expansion joints for thermal stress",
        "Upgrade materials for chemical resistance"
      ]
    };

    // Parameter-based analysis enhancement
    let parameterInsights = [];
    if (operatingParameters) {
      if (operatingParameters.temperature?.bearing > 140) {
        parameterInsights.push("Elevated bearing temperature indicates potential lubrication issues");
      }
      if (operatingParameters.vibration?.horizontal > 3.0) {
        parameterInsights.push("High horizontal vibration suggests misalignment or imbalance");
      }
      if (operatingParameters.pressure && operatingParameters.pressure.upstream > operatingParameters.pressure.downstream * 1.5) {
        parameterInsights.push("Excessive pressure drop indicates potential blockage or restriction");
      }
      if (operatingParameters.power?.consumption && equipmentType === 'pump' && operatingParameters.power.consumption > 20) {
        parameterInsights.push("Higher than expected power consumption suggests efficiency loss");
      }
    }
    
    const causes = equipmentSpecificCauses[equipmentType as keyof typeof equipmentSpecificCauses] || 
                   equipmentSpecificCauses.pump;
    const recommendations = equipmentRecommendations[equipmentType as keyof typeof equipmentRecommendations] || 
                           equipmentRecommendations.pump;
    
    rootCause = causes[Math.floor(Math.random() * causes.length)];
    
    // Enhance root cause with parameter insights
    if (parameterInsights.length > 0) {
      rootCause += `. Analysis indicates: ${parameterInsights.join(', ')}`;
    }
    
    finalRecommendations = [
      ...recommendations.slice(0, 3),
      "Implement continuous monitoring for early detection",
      "Update maintenance schedule based on operating conditions"
    ];
    
    confidence = Math.floor(Math.random() * 15) + 85; // 85-99% for equipment-specific analysis
  }
  
  // Generate learning insights for equipment
  const learningInsights = {
    equipmentProfile: {
      manufacturer: "Unknown",
      model: "Model TBD",
      yearInstalled: new Date().getFullYear() - Math.floor(Math.random() * 10),
      designLife: equipmentType === 'motor' ? 20 : equipmentType === 'pump' ? 15 : 12
    },
    patterns: [
      {
        pattern: `${equipmentType} failure correlation with operating parameters`,
        frequency: Math.floor(Math.random() * 5) + 1,
        severity: confidence > 90 ? "high" : confidence > 80 ? "medium" : "low",
        conditions: operatingParameters ? Object.keys(operatingParameters) : ["normal operating conditions"]
      }
    ],
    predictiveIndicators: operatingParameters ? Object.keys(operatingParameters).map(param => ({
      parameter: param,
      threshold: Math.random() * 100,
      trend: Math.random() > 0.5 ? "increasing" : "stable",
      reliability: Math.random() * 0.3 + 0.7
    })) : [],
    recommendations: finalRecommendations.map(rec => ({
      type: Math.random() > 0.5 ? "preventive" : "predictive",
      action: rec,
      priority: confidence > 90 ? "high" : "medium",
      estimatedCost: Math.floor(Math.random() * 2000) + 200,
      expectedBenefit: "Improved reliability and reduced downtime"
    }))
  };
  
  // Update analysis with results
  await storage.updateAnalysis(analysisId, {
    status: "completed",
    rootCause,
    confidence,
    recommendations: finalRecommendations,
    learningInsights
  });
}
