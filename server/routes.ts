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
      const { issueDescription } = req.body;
      
      if (!issueDescription) {
        return res.status(400).json({ message: "Issue description is required" });
      }
      
      // Generate unique analysis ID
      const analysisId = `RCA-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      const uploadedFiles = files.map(file => ({
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        uploadedAt: new Date().toISOString(),
      }));
      
      const analysisData = {
        analysisId,
        issueDescription,
        priority: "medium",
        status: "processing" as const,
        uploadedFiles,
        rootCause: null,
        confidence: null,
        recommendations: null,
      };
      
      const validatedData = insertAnalysisSchema.parse(analysisData);
      const analysis = await storage.createAnalysis(validatedData);
      
      // Start AI processing simulation in the background
      simulateAIProcessing(analysis.id);
      
      res.status(201).json(analysis);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
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

// Simulate AI processing with realistic delays
async function simulateAIProcessing(analysisId: number) {
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
  
  // Generate mock results
  const mockRootCauses = [
    "Blocked air intake filters causing inadequate ventilation",
    "Moisture ingress due to damaged weather sealing",
    "Worn bearing assemblies in drive motor",
    "Faulty temperature sensors causing system malfunction",
    "Damaged fiber optic cables affecting connectivity"
  ];
  
  const mockRecommendations = [
    [
      "Immediate component replacement and cleaning schedule revision",
      "Install automated monitoring system",
      "Implement weekly inspection protocol"
    ],
    [
      "Replace damaged sealing components",
      "Apply protective coating to internal parts",
      "Install environmental monitoring sensors"
    ],
    [
      "Schedule component replacement during maintenance window",
      "Implement predictive monitoring sensors",
      "Adjust maintenance schedule for optimal performance"
    ]
  ];
  
  const rootCause = mockRootCauses[Math.floor(Math.random() * mockRootCauses.length)];
  const recommendations = mockRecommendations[Math.floor(Math.random() * mockRecommendations.length)];
  const confidence = Math.floor(Math.random() * 20) + 80; // 80-99%
  
  // Update analysis with results
  await storage.updateAnalysis(analysisId, {
    status: "completed",
    rootCause,
    confidence,
    recommendations
  });
}
