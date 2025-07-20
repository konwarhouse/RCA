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
    
    switch (questionId) {
      case 'equipment_tag':
        suggestions.push({
          type: 'context',
          message: 'Equipment tags help us identify the exact asset and access maintenance history.',
        });
        if (!currentValue) {
          suggestions.push({
            type: 'example',
            message: 'Examples: "P-101", "PUMP-A", "WTR-PMP-001". Check the equipment nameplate or P&ID drawings.',
            value: equipmentType.includes('Pump') ? 'P-101' : 'EQ-001'
          });
        }
        break;
        
      case 'observed_problem':
        suggestions.push({
          type: 'context',
          message: 'Detailed problem descriptions help identify failure patterns and root causes more accurately.',
        });
        if (!currentValue || currentValue.length < 10) {
          suggestions.push({
            type: 'example',
            message: `For ${equipmentType || 'equipment'} failures, describe: What you saw, heard, or measured. When it started. How it progressed.`,
            value: equipmentType.includes('Pump') ? 'Pump began making grinding noise, then seized completely. Water leaking from mechanical seal.' : 'Equipment stopped operating normally. Unusual noise detected.'
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
              message: 'The failure occurred during peak power demand hours (4-8 PM). Are you certain there were no utility issues, power dips, or electrical disturbances?',
            });
          }
        }
        break;
    }
  };

  const generateEquipmentSpecificGuidance = (suggestions: AISuggestion[]) => {
    const equipmentType = evidenceData.equipment_type || '';
    const problemDescription = evidenceData.observed_problem || '';
    
    if (equipmentType.includes('Centrifugal Pump')) {
      if (problemDescription.toLowerCase().includes('vibration')) {
        suggestions.push({
          type: 'next_step',
          message: 'For pump vibration issues, consider collecting: bearing condition, alignment status, impeller condition, and suction conditions.',
        });
      }
      
      if (problemDescription.toLowerCase().includes('seal')) {
        suggestions.push({
          type: 'context',
          message: 'Pump seal failures are often caused by: dry running, excessive heat, contamination, or incorrect installation.',
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
    
    switch (questionId) {
      case 'equipment_tag':
        if (typeof value === 'string' && value.length < 3) {
          suggestions.push({
            type: 'validation',
            message: 'Equipment tag seems short. Most plant tags are 4-10 characters. Please verify this is the complete tag.',
          });
        }
        break;
        
      case 'observed_problem':
        if (typeof value === 'string') {
          if (value.length < 20) {
            suggestions.push({
              type: 'improvement',
              message: 'More detail would help. Consider adding: timeline, severity, any unusual sounds/smells, what happened just before.',
            });
          }
          if (value.toLowerCase().includes('failed') && !value.toLowerCase().includes('how')) {
            suggestions.push({
              type: 'improvement',
              message: 'Try to describe HOW it failed, not just that it failed. This helps identify the failure mode.',
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