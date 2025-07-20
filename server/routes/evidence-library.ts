// Evidence Library Management API Routes
import { Router } from 'express';
import { 
  EVIDENCE_REQUIREMENTS_LIBRARY, 
  libraryManager, 
  getEquipmentProfile,
  getRequiredTrendsForEquipment,
  getRequiredAttachmentsForEquipment,
  getAIPromptsForField,
  identifyLikelyFailureMode,
  type EquipmentEvidenceProfile,
  type TrendDataRequirement,
  type AttachmentRequirement,
  type AIPromptTemplate
} from '@shared/evidence-requirements-library';

const router = Router();

// Get all equipment types in library
router.get('/equipment-types', (req, res) => {
  try {
    const equipmentTypes = Object.values(EVIDENCE_REQUIREMENTS_LIBRARY).map(profile => ({
      equipmentType: profile.equipmentType,
      iso14224Code: profile.iso14224Code,
      subtypes: profile.subtypes,
      lastUpdated: profile.lastUpdated,
      updatedBy: profile.updatedBy
    }));
    
    res.json({
      success: true,
      equipmentTypes,
      totalCount: equipmentTypes.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve equipment types',
      details: error.message
    });
  }
});

// Get complete profile for specific equipment type
router.get('/equipment/:equipmentType', (req, res) => {
  try {
    const { equipmentType } = req.params;
    const profile = getEquipmentProfile(equipmentType);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: `Equipment type '${equipmentType}' not found in library`
      });
    }
    
    res.json({
      success: true,
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve equipment profile',
      details: error.message
    });
  }
});

// Get required evidence for investigation setup
router.get('/equipment/:equipmentType/requirements', (req, res) => {
  try {
    const { equipmentType } = req.params;
    const { symptoms } = req.query;
    
    const requiredTrends = getRequiredTrendsForEquipment(equipmentType);
    const requiredAttachments = getRequiredAttachmentsForEquipment(equipmentType);
    
    let likelyFailureMode = null;
    if (symptoms) {
      const symptomsList = (symptoms as string).split(',').map(s => s.trim());
      likelyFailureMode = identifyLikelyFailureMode(equipmentType, symptomsList);
    }
    
    res.json({
      success: true,
      equipmentType,
      requiredTrends,
      requiredAttachments,
      likelyFailureMode,
      totalRequiredFields: requiredTrends.length + requiredAttachments.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve evidence requirements',
      details: error.message
    });
  }
});

// Get AI prompts for specific field type
router.get('/equipment/:equipmentType/prompts/:fieldType', (req, res) => {
  try {
    const { equipmentType, fieldType } = req.params;
    const prompt = getAIPromptsForField(equipmentType, fieldType as AIPromptTemplate['fieldType']);
    
    if (!prompt) {
      return res.status(404).json({
        success: false,
        error: `No AI prompt template found for ${equipmentType} - ${fieldType}`
      });
    }
    
    res.json({
      success: true,
      prompt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve AI prompt',
      details: error.message
    });
  }
});

// Administrative routes (require admin authorization)
const requireAdmin = (req: any, res: any, next: any) => {
  // In production, implement proper admin authorization
  const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY || req.user?.role === 'admin';
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Administrative access required'
    });
  }
  next();
};

// Add new equipment profile
router.post('/admin/equipment', requireAdmin, (req, res) => {
  try {
    const { profile, updatedBy } = req.body;
    
    if (!profile || !updatedBy) {
      return res.status(400).json({
        success: false,
        error: 'Profile data and updatedBy field are required'
      });
    }
    
    profile.lastUpdated = new Date().toISOString();
    profile.updatedBy = updatedBy;
    
    libraryManager.addEquipmentProfile(profile);
    
    res.json({
      success: true,
      message: `Equipment profile for ${profile.equipmentType} added successfully`,
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add equipment profile',
      details: error.message
    });
  }
});

// Update trend requirement
router.patch('/admin/equipment/:equipmentType/trends/:trendId', requireAdmin, (req, res) => {
  try {
    const { equipmentType, trendId } = req.params;
    const { updates, updatedBy } = req.body;
    
    if (!updates || !updatedBy) {
      return res.status(400).json({
        success: false,
        error: 'Updates and updatedBy field are required'
      });
    }
    
    libraryManager.updateTrendRequirement(equipmentType, trendId, updates, updatedBy);
    
    res.json({
      success: true,
      message: `Trend requirement ${trendId} updated for ${equipmentType}`,
      equipmentType,
      trendId,
      updates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update trend requirement',
      details: error.message
    });
  }
});

// Add AI prompt template
router.post('/admin/equipment/:equipmentType/prompts', requireAdmin, (req, res) => {
  try {
    const { equipmentType } = req.params;
    const { template, updatedBy } = req.body;
    
    if (!template || !updatedBy) {
      return res.status(400).json({
        success: false,
        error: 'Template data and updatedBy field are required'
      });
    }
    
    libraryManager.addAIPromptTemplate(equipmentType, template, updatedBy);
    
    res.json({
      success: true,
      message: `AI prompt template added for ${equipmentType} - ${template.fieldType}`,
      equipmentType,
      template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add AI prompt template',
      details: error.message
    });
  }
});

// Export library
router.get('/admin/export', requireAdmin, (req, res) => {
  try {
    const exportData = libraryManager.exportLibrary();
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="evidence-library-${new Date().toISOString().split('T')[0]}.json"`);
    res.send(exportData);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to export library',
      details: error.message
    });
  }
});

// Import library
router.post('/admin/import', requireAdmin, (req, res) => {
  try {
    const { libraryData, updatedBy } = req.body;
    
    if (!libraryData || !updatedBy) {
      return res.status(400).json({
        success: false,
        error: 'Library data and updatedBy field are required'
      });
    }
    
    libraryManager.importLibrary(libraryData, updatedBy);
    
    res.json({
      success: true,
      message: 'Library imported successfully',
      importDate: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to import library',
      details: error.message
    });
  }
});

// Get update history
router.get('/admin/history', requireAdmin, (req, res) => {
  try {
    const { equipmentType } = req.query;
    const history = libraryManager.getUpdateHistory(equipmentType as string);
    
    res.json({
      success: true,
      history,
      totalChanges: history.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve update history',
      details: error.message
    });
  }
});

// Validate evidence completeness for investigation
router.post('/validate-evidence', (req, res) => {
  try {
    const { equipmentType, evidenceData, symptoms } = req.body;
    
    if (!equipmentType || !evidenceData) {
      return res.status(400).json({
        success: false,
        error: 'Equipment type and evidence data are required'
      });
    }
    
    const requiredTrends = getRequiredTrendsForEquipment(equipmentType);
    const requiredAttachments = getRequiredAttachmentsForEquipment(equipmentType);
    
    // Check which required evidence is missing
    const missingTrends = requiredTrends.filter(trend => 
      !evidenceData[trend.id] || evidenceData[trend.id] === ''
    );
    
    const missingAttachments = requiredAttachments.filter(attachment => 
      !evidenceData[attachment.id] || evidenceData[attachment.id] === ''
    );
    
    // Calculate completeness percentage
    const totalRequired = requiredTrends.length + requiredAttachments.length;
    const providedCount = totalRequired - missingTrends.length - missingAttachments.length;
    const completeness = totalRequired > 0 ? (providedCount / totalRequired) * 100 : 100;
    
    // Identify likely failure mode if symptoms provided
    let failureMode = null;
    if (symptoms && symptoms.length > 0) {
      failureMode = identifyLikelyFailureMode(equipmentType, symptoms);
    }
    
    res.json({
      success: true,
      validation: {
        completeness: completeness.toFixed(1),
        isComplete: completeness >= 80,
        missingTrends,
        missingAttachments,
        totalRequired,
        providedCount,
        failureMode
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to validate evidence',
      details: error.message
    });
  }
});

export default router;