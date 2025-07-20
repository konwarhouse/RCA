import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bot, 
  MessageCircle, 
  Lightbulb, 
  CheckCircle, 
  ArrowRight,
  HelpCircle,
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Send,
  AlertTriangle
} from "lucide-react";

interface IntelligentAIAssistantProps {
  currentQuestion: any;
  currentValue: any;
  evidenceData: any;
  onSuggestion: (value: string) => void;
  onFieldComplete: () => void;
  completedSections?: string[];
  investigationType?: string;
}

interface AISuggestion {
  type: 'example' | 'context' | 'next_step' | 'validation' | 'improvement' | 'contradiction' | 'best_practice';
  message: string;
  value?: string;
  action?: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  message: string;
  timestamp: Date;
}

export default function IntelligentAIAssistant({ 
  currentQuestion, 
  currentValue, 
  evidenceData,
  onSuggestion,
  onFieldComplete,
  completedSections = [],
  investigationType = 'equipment_failure'
}: IntelligentAIAssistantProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [conversationMode, setConversationMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sectionSummary, setSectionSummary] = useState('');
  const [contradictoryEvidence, setContradictoryEvidence] = useState<string[]>([]);

  useEffect(() => {
    if (currentQuestion) {
      generateIntelligentSuggestions();
      checkForContradictions();
    }
  }, [currentQuestion, currentValue, evidenceData]);

  useEffect(() => {
    if (completedSections.length > 0) {
      generateSectionSummary();
    }
  }, [completedSections]);

  const generateIntelligentSuggestions = () => {
    setIsTyping(true);
    
    setTimeout(() => {
      const newSuggestions: AISuggestion[] = [];
      
      // Context-aware suggestions based on question type and content
      generateContextualSuggestions(newSuggestions);
      
      // Equipment-specific guidance
      generateEquipmentSpecificGuidance(newSuggestions);
      
      // Value validation and improvement suggestions
      if (currentValue) {
        generateValueValidation(newSuggestions);
      }
      
      // Dynamic follow-ups based on contradictory evidence
      generateContradictionPrompts(newSuggestions);
      
      // Best practice references
      generateBestPracticeReferences(newSuggestions);
      
      // Next steps suggestions
      generateNextStepSuggestions(newSuggestions);
      
      setSuggestions(newSuggestions);
      setIsTyping(false);
    }, 800);
  };

  const checkForContradictions = () => {
    const contradictions: string[] = [];
    
    // Check for logical contradictions in evidence
    if (evidenceData.external_influences === 'NO' && evidenceData.event_datetime) {
      const eventDate = new Date(evidenceData.event_datetime);
      const hour = eventDate.getHours();
      // Power issues often happen during peak hours
      if (hour >= 16 && hour <= 20 && evidenceData.equipment_type?.includes('Pump')) {
        contradictions.push('power_contradiction');
      }
    }

    if (evidenceData.operator_error === false && evidenceData.procedures_followed === false) {
      contradictions.push('procedure_contradiction');
    }

    if (evidenceData.recent_changes === 'NO' && evidenceData.last_maintenance_date) {
      const maintenanceDate = new Date(evidenceData.last_maintenance_date);
      const now = new Date();
      const daysDiff = (now.getTime() - maintenanceDate.getTime()) / (1000 * 3600 * 24);
      if (daysDiff < 7) {
        contradictions.push('recent_work_contradiction');
      }
    }

    setContradictoryEvidence(contradictions);
  };

  const generateContextualSuggestions = (suggestions: AISuggestion[]) => {
    const questionId = currentQuestion.id;
    const equipmentType = evidenceData.equipment_type || '';
    const observedProblem = evidenceData.observed_problem?.toLowerCase() || '';
    
    switch (questionId) {
      case 'equipment_tag':
        suggestions.push({
          type: 'context',
          message: 'Equipment tags link to maintenance records, previous failures, and asset specifications. Use the exact tag from the nameplate.',
        });
        if (!currentValue) {
          if (equipmentType.includes('Pump')) {
            suggestions.push({
              type: 'example',
              message: 'For pumps, look for: "P-101", "PMP-001A", "271P01". Check the nameplate near the motor coupling or on the pump casing.',
              value: '271P01'
            });
          } else {
            suggestions.push({
              type: 'example',
              message: 'Look for: "CV-201", "HX-101", "T-301". Check equipment nameplate, P&ID drawings, or asset database.',
              value: 'EQ-001'
            });
          }
        }
        break;
        
      case 'observed_problem':
        if (equipmentType.includes('Pump')) {
          suggestions.push({
            type: 'context',
            message: 'For pump failures, describe physical signs, sounds, and measurements. Be specific about what changed from normal operation.',
          });
          if (!currentValue || currentValue.length < 20) {
            suggestions.push({
              type: 'example',
              message: 'Example: "Seal leaking clear fluid, high vibration at 2X running speed, temperature increased from 65°C to 85°C, grinding noise from bearing area."',
              value: 'Seal leaking clear fluid, high vibration detected, temperature elevated above normal'
            });
          }
          if (observedProblem.includes('seal')) {
            suggestions.push({
              type: 'next_step',
              message: 'For seal issues, also note: leak rate, fluid color/clarity, seal face condition, if any debris was present, and temperature at seal area.',
            });
          }
          if (observedProblem.includes('vibration')) {
            suggestions.push({
              type: 'next_step',
              message: 'For vibration, specify: frequency (1X, 2X running speed), amplitude, location (motor/pump), and if it was axial/radial.',
            });
          }
        } else {
          suggestions.push({
            type: 'context',
            message: 'Describe the sequence of events: what you first noticed, how it progressed, final state. Include measurements if available.',
          });
          suggestions.push({
            type: 'example',
            message: 'Example: "Started with unusual noise at 0800, vibration increased gradually, temperature rose to 95°C, unit tripped on high temperature at 0845."',
            value: 'Equipment exhibited unusual behavior, parameters outside normal range'
          });
        }
        break;

      case 'seal_condition':
        if (equipmentType.includes('Pump')) {
          suggestions.push({
            type: 'context',
            message: 'Describe the physical state of the seal. Look for scoring, swelling, discoloration, and lubricant condition.',
          });
          suggestions.push({
            type: 'example',
            message: 'Example: "Seal appeared visually intact, light scoring present, slight discoloration on inner lip, no active leakage, lubricant level normal and clean."',
            value: 'Seal visually inspected, light scoring observed, lubricant level normal'
          });
          suggestions.push({
            type: 'next_step',
            message: 'Also check: Was seal OEM or aftermarket? Installation date? Any signs of dry running? Flush fluid condition?',
          });
        }
        break;

      case 'bearing_condition':
        suggestions.push({
          type: 'context',
          message: 'Assess bearing condition through vibration analysis, temperature, noise, and visual inspection if accessible.',
        });
        suggestions.push({
          type: 'example',
          message: 'Example: "Vibration 8.5 mm/s (alarm at 7.1), temperature 78°C (normal 55°C), rough rotation, grease contaminated with metallic particles."',
          value: 'Vibration elevated, temperature increased, grease condition degraded'
        });
        break;

      case 'alignment_status':
        suggestions.push({
          type: 'context',
          message: 'Document alignment measurements or visual indicators. Misalignment causes vibration, bearing wear, and coupling damage.',
        });
        suggestions.push({
          type: 'example',
          message: 'Example: "Last aligned 6 months ago, dial indicator readings within 0.002", no visible coupling wear, foundation appears stable."',
          value: 'Alignment checked within acceptable limits, no visible coupling damage'
        });
        break;

      case 'maintenance_history':
        suggestions.push({
          type: 'context',
          message: 'List recent work: parts replaced, who performed it, any deviations from procedure, post-work testing.',
        });
        if (equipmentType.includes('Pump')) {
          suggestions.push({
            type: 'example',
            message: 'Example: "Seal replaced 3 weeks ago by contractor, OEM parts used, alignment checked, test run normal for 2 hours, no issues noted."',
            value: 'Recent seal replacement, OEM parts, proper installation verified'
          });
        }
        break;

      case 'operating_conditions':
        if (equipmentType.includes('Pump')) {
          suggestions.push({
            type: 'context',
            message: 'Document flow, pressure, temperature, and process conditions at time of failure.',
          });
          suggestions.push({
            type: 'example',
            message: 'Example: "Flow 180 m³/h (design 200), suction pressure 2.1 bar, discharge 8.5 bar, fluid temperature 65°C, clear water service."',
            value: 'Flow rate within design, pressure normal, temperature elevated'
          });
        }
        break;
        
      case 'external_influences':
        if (currentValue === 'NO' && evidenceData.event_datetime) {
          const eventDate = new Date(evidenceData.event_datetime);
          const hour = eventDate.getHours();
          if (hour >= 16 && hour <= 20) {
            suggestions.push({
              type: 'contradiction',
              message: 'Failure during peak power hours (4-8 PM). Check: voltage dips, power quality issues, electrical disturbances, or grid instability.',
            });
          }
        }
        suggestions.push({
          type: 'context',
          message: 'Consider: weather conditions, power quality, construction nearby, process upsets, or other equipment failures.',
        });
        break;

      case 'installation_details':
        suggestions.push({
          type: 'context',
          message: 'Document foundation condition, piping stress, support adequacy, and installation quality.',
        });
        suggestions.push({
          type: 'example',
          message: 'Example: "Concrete foundation intact, no cracks, piping properly supported, no visible stress, grout condition good."',
          value: 'Foundation stable, piping properly supported, no installation defects'
        });
        break;
    }
  };

  const generateEquipmentSpecificGuidance = (suggestions: AISuggestion[]) => {
    const equipmentType = evidenceData.equipment_type || '';
    const problemDescription = evidenceData.observed_problem?.toLowerCase() || '';
    const questionId = currentQuestion.id;
    
    if (equipmentType.includes('Centrifugal Pump')) {
      // Vibration-specific guidance
      if (problemDescription.includes('vibration')) {
        if (questionId === 'bearing_condition') {
          suggestions.push({
            type: 'context',
            message: 'Pump vibration usually indicates bearing wear. Check: vibration spectrum (1X, 2X, 3X speed), temperature, and grease condition.',
          });
        }
        if (questionId === 'alignment_status') {
          suggestions.push({
            type: 'context',
            message: 'Misalignment causes vibration at 2X running speed. Check coupling condition and last alignment date.',
          });
        }
        if (questionId === 'installation_details') {
          suggestions.push({
            type: 'context',
            message: 'Soft foot or foundation issues cause random vibration. Check foundation bolts and grouting.',
          });
        }
      }
      
      // Seal-specific guidance
      if (problemDescription.includes('seal')) {
        if (questionId === 'operating_conditions') {
          suggestions.push({
            type: 'context',
            message: 'Seal failures link to operating conditions. Check: suction pressure (cavitation), fluid temperature, and contamination.',
          });
        }
        if (questionId === 'maintenance_history') {
          suggestions.push({
            type: 'context',
            message: 'Recent seal work often causes failures. Was installation per procedure? OEM parts? Proper torque? Clean environment?',
          });
        }
        if (questionId === 'external_influences') {
          suggestions.push({
            type: 'context',
            message: 'External factors affecting seals: process upset, temperature spike, contamination, power disruption causing sudden stop.',
          });
        }
      }

      // Flow/Performance issues
      if (problemDescription.includes('flow') || problemDescription.includes('pressure')) {
        if (questionId === 'operating_conditions') {
          suggestions.push({
            type: 'context',
            message: 'For flow/pressure issues, document: actual vs design flow, suction/discharge pressures, NPSH available vs required.',
          });
        }
        if (questionId === 'impeller_condition') {
          suggestions.push({
            type: 'context',
            message: 'Performance loss indicates impeller wear, damage, or blockage. Check for erosion, corrosion, or foreign objects.',
          });
        }
      }

      // Temperature-related
      if (problemDescription.includes('temperature') || problemDescription.includes('hot')) {
        if (questionId === 'bearing_condition') {
          suggestions.push({
            type: 'context',
            message: 'High temperature usually means bearing failure. Check lubrication level, contamination, and bearing clearances.',
          });
        }
        if (questionId === 'seal_condition') {
          suggestions.push({
            type: 'context',
            message: 'Heat damages seals. Look for thermal distortion, hardening, cracking, and inadequate cooling/flushing.',
          });
        }
      }
    }

    // General equipment guidance for other types
    if (equipmentType.includes('Motor')) {
      if (questionId === 'electrical_condition') {
        suggestions.push({
          type: 'context',
          message: 'Check motor parameters: current balance, insulation resistance, winding temperature, and power quality.',
        });
      }
    }

    if (equipmentType.includes('Valve')) {
      if (questionId === 'actuator_condition') {
        suggestions.push({
          type: 'context',
          message: 'For valve issues, check actuator: air supply pressure, positioner calibration, stem packing, and travel limits.',
        });
      }
    }
  };

  const generateContradictionPrompts = (suggestions: AISuggestion[]) => {
    contradictoryEvidence.forEach(contradiction => {
      switch (contradiction) {
        case 'power_contradiction':
          if (currentQuestion.id === 'external_influences') {
            suggestions.push({
              type: 'contradiction',
              message: 'Records suggest this failure occurred during peak power demand. Are you sure there were no utility issues or power disturbances?',
            });
          }
          break;
          
        case 'procedure_contradiction':
          if (currentQuestion.id === 'operator_error' || currentQuestion.id === 'procedures_followed') {
            suggestions.push({
              type: 'contradiction',
              message: 'Contradiction detected: procedures not followed but no operator error marked. Please clarify what actually happened.',
            });
          }
          break;
          
        case 'recent_work_contradiction':
          if (currentQuestion.id === 'recent_changes') {
            suggestions.push({
              type: 'contradiction',
              message: 'Maintenance was performed less than a week ago, but marked as "no recent changes." Should this recent work be considered?',
            });
          }
          break;
      }
    });
  };

  const generateBestPracticeReferences = (suggestions: AISuggestion[]) => {
    const equipmentType = evidenceData.equipment_type;
    const problemType = evidenceData.observed_problem?.toLowerCase() || '';

    if (equipmentType?.includes('Centrifugal Pump')) {
      if (problemType.includes('seal')) {
        suggestions.push({
          type: 'best_practice',
          message: '📊 Best Practice Insight: 78% of pump seal failures in our database were caused by dry running or contamination. Check suction conditions and fluid cleanliness.',
        });
      }
      
      if (problemType.includes('vibration')) {
        suggestions.push({
          type: 'best_practice',
          message: '📊 Historical Data: 65% of pump vibration cases trace back to misalignment or bearing wear. Verify last alignment check and bearing condition.',
        });
      }
      
      if (currentQuestion.id === 'last_maintenance_date' && problemType.includes('seal')) {
        suggestions.push({
          type: 'best_practice',
          message: '📊 Pattern Recognition: Seal failures within 30 days of maintenance often indicate installation issues or incorrect parts. Was the seal properly installed?',
        });
      }
    }

    if (evidenceData.operating_mode === 'Running' && evidenceData.installation_year) {
      const installYear = parseInt(evidenceData.installation_year);
      const currentYear = new Date().getFullYear();
      const age = currentYear - installYear;
      
      if (age > 15) {
        suggestions.push({
          type: 'best_practice',
          message: `📊 Age Factor: Equipment is ${age} years old. 85% of failures in equipment over 15 years are age-related. Consider component deterioration in analysis.`,
        });
      }
    }
  };

  const generateValueValidation = (suggestions: AISuggestion[]) => {
    const questionId = currentQuestion.id;
    const value = currentValue;
    const equipmentType = evidenceData.equipment_type || '';
    
    switch (questionId) {
      case 'equipment_tag':
        if (typeof value === 'string' && value.length < 3) {
          suggestions.push({
            type: 'validation',
            message: 'Equipment tag seems short. Most plant tags are 4-10 characters. Check nameplate for complete tag.',
          });
        }
        break;
        
      case 'observed_problem':
        if (typeof value === 'string') {
          if (value.length < 30) {
            if (equipmentType.includes('Pump')) {
              suggestions.push({
                type: 'improvement',
                message: 'Add specifics: What type of leak? Where exactly? How much vibration? What sounds? Temperature readings?',
              });
            } else {
              suggestions.push({
                type: 'improvement',
                message: 'Include: exact symptoms, measurements, timeline, progression, and final state.',
              });
            }
          }
          if (value.toLowerCase().includes('failed') && !value.toLowerCase().includes('how')) {
            suggestions.push({
              type: 'improvement',
              message: 'Describe the failure mode: seized, leaked, cracked, worn, overheated? This reveals the root cause path.',
            });
          }
          if (value.toLowerCase().includes('seal') && !value.toLowerCase().includes('leak')) {
            suggestions.push({
              type: 'improvement',
              message: 'For seal issues, specify: leak rate, fluid type, location of leak, any noise or temperature change.',
            });
          }
          if (value.toLowerCase().includes('vibration') && !value.includes('mm/s') && !value.includes('frequency')) {
            suggestions.push({
              type: 'improvement',
              message: 'Quantify vibration: magnitude (mm/s), frequency (1X, 2X speed), location, and direction (axial/radial).',
            });
          }
        }
        break;

      case 'seal_condition':
        if (typeof value === 'string') {
          if (value.toLowerCase() === 'fine' || value.toLowerCase() === 'ok') {
            suggestions.push({
              type: 'validation',
              message: 'If seal was "fine," how do you explain the seal leaking? Please inspect more closely and describe actual condition.',
            });
          }
          if (!value.includes('visual') && !value.includes('inspect')) {
            suggestions.push({
              type: 'improvement',
              message: 'Specify inspection method: visual only, or with measurements? Were seal faces accessible?',
            });
          }
        }
        break;

      case 'maintenance_history':
        if (typeof value === 'string') {
          if (!value.includes('when') && !value.includes('date')) {
            suggestions.push({
              type: 'improvement',
              message: 'Include dates of recent work. When was last maintenance? What was done? By whom?',
            });
          }
          if (value.includes('recent') && !value.includes('OEM') && !value.includes('aftermarket')) {
            suggestions.push({
              type: 'improvement',
              message: 'For recent parts replacement, specify: OEM or aftermarket parts? Installation procedure followed?',
            });
          }
        }
        break;

      case 'operating_conditions':
        if (typeof value === 'string' && equipmentType.includes('Pump')) {
          if (!value.includes('pressure') && !value.includes('flow')) {
            suggestions.push({
              type: 'improvement',
              message: 'Include key parameters: suction/discharge pressure, flow rate, temperature, and compare to design values.',
            });
          }
          if (value.includes('normal') && !value.includes('actual')) {
            suggestions.push({
              type: 'validation',
              message: 'Instead of "normal," provide actual readings: pressure in bar/psi, flow in m³/h, temperature in °C.',
            });
          }
        }
        break;
    }
  };

  const generateNextStepSuggestions = (suggestions: AISuggestion[]) => {
    const completedFields = Object.keys(evidenceData).filter(key => 
      evidenceData[key] !== undefined && evidenceData[key] !== null && evidenceData[key] !== ''
    );
    
    if (currentQuestion.id === 'equipment_tag' && currentValue) {
      suggestions.push({
        type: 'next_step',
        message: 'Great! Next, I suggest completing the equipment location and then the maintenance history for this tag.',
      });
    }
    
    if (completedFields.length > 5) {
      suggestions.push({
        type: 'next_step',
        message: `Excellent progress! You've completed ${completedFields.length} fields. The evidence is building a clear picture of the failure.`,
      });
    }
  };

  const generateSectionSummary = () => {
    const lastSection = completedSections[completedSections.length - 1];
    if (!lastSection) return;

    let summary = '';
    const evidenceStrength: string[] = [];
    const evidenceWeakness: string[] = [];

    if (evidenceData.equipment_tag && evidenceData.equipment_type && evidenceData.event_datetime) {
      evidenceStrength.push('equipment identification');
    }
    
    if (evidenceData.observed_problem && evidenceData.observed_problem.length > 20) {
      evidenceStrength.push('detailed problem description');
    } else if (evidenceData.observed_problem) {
      evidenceWeakness.push('problem description needs more detail');
    }

    if (evidenceData.last_maintenance_date && evidenceData.last_maintenance_type) {
      evidenceStrength.push('maintenance history');
    } else {
      evidenceWeakness.push('maintenance history incomplete');
    }

    if (evidenceStrength.length > evidenceWeakness.length) {
      summary = `✅ Strong Evidence: Your ${lastSection} section provides excellent ${evidenceStrength.join(', ')}. `;
    } else {
      summary = `⚠️ Evidence Quality: Your ${lastSection} section is complete but could be stronger. `;
    }

    if (evidenceWeakness.length > 0) {
      summary += `Consider improving: ${evidenceWeakness.join(', ')}.`;
    }

    setSectionSummary(summary);
  };

  const handleChatSubmit = () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { 
      role: 'user', 
      message: userMessage, 
      timestamp: new Date() 
    }]);
    setChatInput('');

    setTimeout(() => {
      let aiResponse = '';
      const lowerInput = userMessage.toLowerCase();
      
      if (lowerInput.includes('what') && lowerInput.includes('next')) {
        aiResponse = generateNextStepGuidance();
      } else if (lowerInput.includes('maintenance') || lowerInput.includes('history')) {
        aiResponse = generateMaintenanceGuidance();
      } else if (lowerInput.includes('seal') || lowerInput.includes('pump')) {
        aiResponse = generatePumpSpecificGuidance();
      } else if (lowerInput.includes('help') || lowerInput.includes('how')) {
        aiResponse = generateFieldSpecificHelp();
      } else {
        aiResponse = generateContextualResponse(userMessage);
      }

      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        message: aiResponse, 
        timestamp: new Date() 
      }]);
    }, 1000);
  };

  const generateNextStepGuidance = () => {
    const completedFields = Object.keys(evidenceData).filter(key => 
      evidenceData[key] !== undefined && evidenceData[key] !== null && evidenceData[key] !== ''
    ).length;

    if (completedFields < 5) {
      return "Let's focus on the basics first: equipment tag, problem description, and timing. These form the foundation of any good RCA.";
    } else if (completedFields < 15) {
      return "Great start! Now let's dive deeper into the operating conditions and maintenance history. This will help us understand the failure context.";
    } else {
      return "You're doing excellent work! Let's now focus on human factors and any external influences that might have contributed to this failure.";
    }
  };

  const generateMaintenanceGuidance = () => {
    const equipmentType = evidenceData.equipment_type;
    if (equipmentType?.includes('Pump')) {
      return "For pump maintenance records, I need: last seal change, bearing lubrication, alignment checks, and any recent repairs. Also check if OEM or aftermarket parts were used.";
    }
    return "Maintenance records should include: type of work, parts replaced, who performed it, any deviations from procedure, and post-work testing results.";
  };

  const generatePumpSpecificGuidance = () => {
    const problem = evidenceData.observed_problem?.toLowerCase() || '';
    if (problem.includes('seal')) {
      return "Pump seal failures often trace to: dry running (check suction pressure), contamination (fluid analysis), excessive heat (cooling issues), or installation errors. What evidence do you have for each?";
    } else if (problem.includes('vibration')) {
      return "Pump vibration analysis should cover: foundation condition, alignment status, bearing wear, impeller balance, and suction conditions. Have you checked these areas?";
    }
    return "For pump failures, key evidence includes: suction/discharge pressures, flow rates, vibration levels, temperature readings, and any cavitation signs.";
  };

  const generateFieldSpecificHelp = () => {
    if (!currentQuestion) return "I'm here to help with your RCA investigation. What specific aspect would you like guidance on?";
    
    const questionId = currentQuestion.id;
    const fieldHelp: Record<string, string> = {
      'equipment_tag': "Equipment tags link to all historical data - maintenance, modifications, previous failures. Use the exact tag from the nameplate or asset database.",
      'observed_problem': "Describe what you actually observed - sounds, smells, visual signs, measurements. Include timeline: when did it start? How did it progress?",
      'operating_mode': "This tells us the stress state during failure. Running failures suggest mechanical issues, startup failures often indicate electrical problems.",
      'last_maintenance_date': "Recent maintenance can introduce new failure modes. I need the exact date and type of work performed.",
    };

    return fieldHelp[questionId] || "I can provide specific guidance for any field. What would you like to know about this current question?";
  };

  const generateContextualResponse = (input: string) => {
    const responses = [
      "Based on your evidence so far, I can see this is a systematic failure. Let me help you gather the key data points.",
      "That's a great question. In my experience with similar failures, the critical factors are usually operating conditions, maintenance history, and environmental factors.",
      "Let's approach this systematically. For this type of equipment failure, we need to examine the sequence of events leading up to the failure.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const applySuggestion = (suggestion: AISuggestion) => {
    if (suggestion.value) {
      onSuggestion(suggestion.value);
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'example': return <Lightbulb className="h-4 w-4 text-amber-500" />;
      case 'context': return <HelpCircle className="h-4 w-4 text-blue-500" />;
      case 'next_step': return <ArrowRight className="h-4 w-4 text-green-500" />;
      case 'validation': return <Target className="h-4 w-4 text-red-500" />;
      case 'improvement': return <Sparkles className="h-4 w-4 text-purple-500" />;
      case 'contradiction': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'best_practice': return <CheckCircle className="h-4 w-4 text-indigo-500" />;
      default: return <MessageCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'example': return 'border-amber-200 bg-amber-50';
      case 'context': return 'border-blue-200 bg-blue-50';
      case 'next_step': return 'border-green-200 bg-green-50';
      case 'validation': return 'border-red-200 bg-red-50';
      case 'improvement': return 'border-purple-200 bg-purple-50';
      case 'contradiction': return 'border-orange-200 bg-orange-50';
      case 'best_practice': return 'border-indigo-200 bg-indigo-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  if (!currentQuestion) return null;

  return (
    <Card className="border-blue-200">
      <CardHeader 
        className="cursor-pointer" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            AI Assistant
            {isTyping && <span className="text-sm text-blue-500">Analyzing...</span>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {suggestions.length} insights
            </Badge>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Section Summary */}
          {sectionSummary && (
            <div className="p-3 bg-gray-50 rounded-lg border">
              <div className="text-sm font-medium text-gray-800 mb-1">Section Summary</div>
              <div className="text-sm text-gray-600">{sectionSummary}</div>
            </div>
          )}

          {/* Current Field Context */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Current Field: {currentQuestion.question}</span>
            </div>
            <p className="text-sm text-blue-700">
              {currentQuestion.required ? 'This field is required for analysis.' : 'This field provides additional context.'}
              {currentQuestion.context && ` ${currentQuestion.context}`}
            </p>
          </div>

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border-2 ${getSuggestionColor(suggestion.type)}`}
                >
                  <div className="flex items-start gap-3">
                    {getSuggestionIcon(suggestion.type)}
                    <div className="flex-1">
                      <div className="text-sm text-gray-800 mb-2">{suggestion.message}</div>
                      {suggestion.value && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => applySuggestion(suggestion)}
                          className="text-xs"
                        >
                          Apply Suggestion
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chat Mode */}
          {conversationMode && (
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-sm font-medium text-gray-800 mb-3">Chat with RCA Expert</div>
              
              {/* Chat Messages */}
              <div className="max-h-48 overflow-y-auto mb-3 space-y-2">
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-2 rounded-lg text-sm max-w-xs ${
                      msg.role === 'user' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-white border text-gray-800'
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                ))}
                {chatMessages.length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-4">
                    Ask me anything about this investigation...
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="flex gap-2">
                <Input 
                  placeholder="e.g., What maintenance records should I look for?" 
                  className="text-sm flex-1"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                />
                <Button size="sm" onClick={handleChatSubmit}>
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateIntelligentSuggestions()}
              className="flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3" />
              More Help
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConversationMode(!conversationMode)}
              className="flex items-center gap-1"
            >
              <MessageCircle className="h-3 w-3" />
              {conversationMode ? 'Exit Chat' : 'Chat Mode'}
            </Button>

            {currentValue && (
              <Button
                variant="outline"
                size="sm"
                onClick={onFieldComplete}
                className="flex items-center gap-1 text-green-600"
              >
                <CheckCircle className="h-3 w-3" />
                Looks Good
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}