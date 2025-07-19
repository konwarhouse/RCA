import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertAnalysisSchema, updateAnalysisSchema } from "@shared/schema";
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

  // Create new analysis with file upload
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
      
      if (!issueDescription || !equipmentType) {
        return res.status(400).json({ 
          message: "Issue description and equipment type are required" 
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
      
      const analysisData = {
        analysisId,
        issueDescription,
        equipmentType,
        equipmentId: equipmentId || null,
        location: location || null,
        priority: "medium",
        status: "processing" as const,
        uploadedFiles,
        operatingParameters: parsedOperatingParameters,
        historicalData: null,
        learningInsights: null,
        rootCause: null,
        confidence: null,
        recommendations: null,
      };
      
      const validatedData = insertAnalysisSchema.parse(analysisData);
      const analysis = await storage.createAnalysis(validatedData);
      
      // Start AI processing simulation in the background
      simulateAIProcessing(analysis.id, equipmentType, parsedOperatingParameters);
      
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

  const httpServer = createServer(app);
  return httpServer;
}

// Simulate AI processing with realistic delays and equipment-specific analysis
async function simulateAIProcessing(analysisId: number, equipmentType?: string, operatingParameters?: any) {
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
  
  // Equipment-specific root cause analysis
  const equipmentSpecificCauses = {
    pump: [
      "Blocked suction strainer reducing flow capacity",
      "Impeller wear causing efficiency degradation",
      "Seal failure leading to fluid leakage",
      "Cavitation due to insufficient NPSH",
      "Bearing wear from improper lubrication"
    ],
    motor: [
      "Overheating due to blocked ventilation",
      "Bearing failure from excessive vibration",
      "Insulation breakdown from moisture ingress",
      "Rotor imbalance causing vibration",
      "Stator winding deterioration"
    ],
    compressor: [
      "Valve malfunction affecting compression efficiency",
      "Intercooler fouling reducing heat transfer",
      "Oil contamination in compression chamber",
      "Belt misalignment causing power loss",
      "Pressure relief valve stuck open"
    ],
    conveyor: [
      "Belt tracking issues causing misalignment",
      "Worn drive rollers reducing grip",
      "Bearing failure in roller assemblies",
      "Chain elongation affecting timing",
      "Motor coupling misalignment"
    ],
    heat_exchanger: [
      "Fouling reducing heat transfer efficiency",
      "Tube erosion from high velocity flow",
      "Gasket failure causing internal leakage",
      "Thermal expansion stress cracking",
      "Corrosion from chemical incompatibility"
    ]
  };

  const equipmentRecommendations = {
    pump: [
      "Replace suction strainer and implement filtration",
      "Schedule impeller inspection and replacement",
      "Install continuous vibration monitoring",
      "Verify and improve NPSH conditions"
    ],
    motor: [
      "Clean ventilation passages and install temperature monitoring",
      "Balance rotor and align coupling",
      "Improve moisture protection and insulation",
      "Implement predictive maintenance program"
    ],
    compressor: [
      "Service and calibrate all valves",
      "Clean intercooler and improve cooling",
      "Change oil and install filtration system",
      "Realign belt drive system"
    ],
    conveyor: [
      "Adjust belt tracking and install guides",
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
  
  let rootCause = causes[Math.floor(Math.random() * causes.length)];
  
  // Enhance root cause with parameter insights
  if (parameterInsights.length > 0) {
    rootCause += `. Analysis indicates: ${parameterInsights.join(', ')}`;
  }
  
  const finalRecommendations = [
    ...recommendations.slice(0, 3),
    "Implement continuous monitoring for early detection",
    "Update maintenance schedule based on operating conditions"
  ];
  
  const confidence = Math.floor(Math.random() * 15) + 85; // 85-99% for equipment-specific analysis
  
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
        conditions: parameterInsights.length > 0 ? parameterInsights : ["normal operating conditions"]
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
