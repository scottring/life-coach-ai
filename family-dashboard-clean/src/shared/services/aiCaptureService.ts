// AI service for processing natural language input into structured tasks

interface AIProcessingResult {
  intent: string;
  items: ParsedItem[];
  suggestions: string[];
  clarificationNeeded?: string;
}

interface ParsedItem {
  id: string;
  title: string;
  type: 'task' | 'event' | 'project' | 'sop' | 'meal' | 'note';
  context: 'work' | 'family' | 'personal' | 'auto-detected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledDate?: Date;
  scheduledTime?: string;
  duration?: number;
  assignedTo?: string;
  tags?: string[];
  confidence: number;
}

export class AICaptureService {
  private apiKey: string | null = null;

  constructor() {
    // In production, get this from environment variables
    this.apiKey = process.env.REACT_APP_OPENAI_API_KEY || null;
  }

  async processInput(
    inputText: string, 
    contextId: string, 
    userContext: {
      currentTime: Date;
      activeContext: 'work' | 'family' | 'personal';
      familyMembers?: string[];
      recentTasks?: string[];
    }
  ): Promise<AIProcessingResult> {
    
    if (!this.apiKey) {
      console.warn('OpenAI API key not configured, using smart parsing fallback');
      return this.smartFallbackProcessing(inputText, userContext);
    }

    try {
      const systemPrompt = this.buildSystemPrompt(userContext);
      const userPrompt = this.buildUserPrompt(inputText, userContext);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content;

      if (!aiResponse) {
        throw new Error('No response from OpenAI');
      }

      // Parse the structured JSON response from AI
      return this.parseAIResponse(aiResponse, inputText);

    } catch (error) {
      console.error('AI processing error, falling back to smart parsing:', error);
      return this.smartFallbackProcessing(inputText, userContext);
    }
  }

  private buildSystemPrompt(userContext: any): string {
    const currentTime = userContext.currentTime.toLocaleString();
    const activeContext = userContext.activeContext;
    const familyMembers = userContext.familyMembers?.join(', ') || '';

    return `You are an AI assistant that processes natural language input into structured tasks for a personal life management system.

CONTEXT:
- Current time: ${currentTime}
- Active context: ${activeContext}
- Family members: ${familyMembers}

YOUR JOB:
1. Parse the user's brain dump into specific, actionable items
2. Detect context (work/family/personal) from content
3. Assign realistic priorities and time estimates
4. Suggest scheduling when time references are mentioned
5. Identify if items should be assigned to specific people

RESPONSE FORMAT (JSON only):
{
  "intent": "Brief description of what the user wants to accomplish",
  "items": [
    {
      "title": "Clear, actionable task title",
      "type": "task|event|project|sop|meal|note",
      "context": "work|family|personal|auto-detected",
      "priority": "low|medium|high|urgent",
      "scheduledDate": "2024-01-15" (if time mentioned),
      "scheduledTime": "14:00" (if specific time mentioned),
      "duration": 60 (minutes, estimated),
      "assignedTo": "person name" (if mentioned),
      "tags": ["relevant", "tags"],
      "confidence": 0.85 (your confidence in this parsing)
    }
  ],
  "suggestions": [
    "Helpful suggestions about scheduling or organization"
  ],
  "clarificationNeeded": "Any questions you have about ambiguous items"
}

IMPORTANT:
- Always respond with valid JSON only
- Be specific with task titles (not "call dentist" but "Schedule dentist appointment for cleaning")
- Estimate realistic durations (calls: 15min, meetings: 60min, cooking: 30-90min)
- Consider the user's context when assigning work/family/personal
- If someone is mentioned by name, suggest assigning to them`;
  }

  private buildUserPrompt(inputText: string, userContext: any): string {
    return `Process this brain dump and convert it into structured tasks:

"${inputText}"

Remember to consider:
- Current context: ${userContext.activeContext}
- Current time: ${userContext.currentTime.toLocaleString()}
- Available family members: ${userContext.familyMembers?.join(', ') || 'none specified'}

Return structured JSON only.`;
  }

  private async parseAIResponse(aiResponse: string, originalInput: string): Promise<AIProcessingResult> {
    try {
      // Clean up the AI response (remove any markdown formatting)
      const cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanedResponse);

      // Validate and clean up the response
      return {
        intent: parsed.intent || 'Process user input',
        items: (parsed.items || []).map((item: any, index: number) => ({
          id: `ai_${Date.now()}_${index}`,
          title: item.title || 'Untitled task',
          type: item.type || 'task',
          context: item.context || 'auto-detected',
          priority: item.priority || 'medium',
          scheduledDate: item.scheduledDate ? new Date(item.scheduledDate) : undefined,
          scheduledTime: item.scheduledTime,
          duration: item.duration || 30,
          assignedTo: item.assignedTo,
          tags: item.tags || [],
          confidence: item.confidence || 0.7
        })),
        suggestions: parsed.suggestions || [],
        clarificationNeeded: parsed.clarificationNeeded
      };

    } catch (error) {
      console.error('Failed to parse AI response:', error);
      // Return a basic parsed version
      return {
        intent: 'Process user input',
        items: [{
          id: `fallback_${Date.now()}`,
          title: originalInput.slice(0, 100) + (originalInput.length > 100 ? '...' : ''),
          type: 'note',
          context: 'auto-detected',
          priority: 'medium',
          confidence: 0.5,
          tags: ['unprocessed']
        }],
        suggestions: ['AI processing encountered an error. This item needs manual review.']
      };
    }
  }

  private smartFallbackProcessing(inputText: string, userContext: any): Promise<AIProcessingResult> {
    // Smart local processing when AI is not available
    const items: ParsedItem[] = [];
    const suggestions: string[] = [];

    // Split input into sentences and process each
    const sentences = inputText.split(/[.!?]+/).filter(s => s.trim().length > 3);

    sentences.forEach((sentence, index) => {
      const trimmed = sentence.trim();
      if (!trimmed) return;

      const item: ParsedItem = {
        id: `local_${Date.now()}_${index}`,
        title: this.cleanTaskTitle(trimmed),
        type: this.detectType(trimmed),
        context: this.detectContext(trimmed, userContext.activeContext),
        priority: this.detectPriority(trimmed),
        duration: this.estimateDuration(trimmed),
        confidence: 0.6,
        tags: this.extractTags(trimmed)
      };

      // Check for time references
      const timeMatch = this.extractTime(trimmed);
      if (timeMatch) {
        item.scheduledDate = timeMatch.date;
        item.scheduledTime = timeMatch.time;
      }

      // Check for person assignments
      const assignee = this.extractAssignee(trimmed, userContext.familyMembers || []);
      if (assignee) {
        item.assignedTo = assignee;
      }

      items.push(item);
    });

    if (items.length === 0) {
      items.push({
        id: `fallback_${Date.now()}`,
        title: inputText.slice(0, 100),
        type: 'note',
        context: userContext.activeContext,
        priority: 'medium',
        confidence: 0.4,
        tags: ['needs-review']
      });
    }

    suggestions.push(`Processed ${items.length} item(s) using local parsing. Consider adding OpenAI API key for better results.`);

    return Promise.resolve({
      intent: 'Process brain dump locally',
      items,
      suggestions
    });
  }

  // Helper methods for local processing
  private cleanTaskTitle(text: string): string {
    // Remove common filler words and clean up
    return text
      .replace(/^(need to|have to|should|must|i need to|i have to)/i, '')
      .replace(/^\s*(call|email|text|message)\s+/i, (match) => `${match.trim().toLowerCase()} `)
      .trim()
      .replace(/^./, str => str.toUpperCase());
  }

  private detectType(text: string): ParsedItem['type'] {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('meeting') || lowerText.includes('appointment')) return 'event';
    if (lowerText.includes('dinner') || lowerText.includes('lunch') || lowerText.includes('cook')) return 'meal';
    if (lowerText.includes('project') || lowerText.includes('plan')) return 'project';
    if (lowerText.includes('routine') || lowerText.includes('process')) return 'sop';
    
    return 'task';
  }

  private detectContext(text: string, currentContext: string): ParsedItem['context'] {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('work') || lowerText.includes('office') || lowerText.includes('meeting')) return 'work';
    if (lowerText.includes('family') || lowerText.includes('kids') || lowerText.includes('dinner')) return 'family';
    if (lowerText.includes('personal') || lowerText.includes('workout') || lowerText.includes('doctor')) return 'personal';
    
    return currentContext as ParsedItem['context'];
  }

  private detectPriority(text: string): ParsedItem['priority'] {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('urgent') || lowerText.includes('asap') || lowerText.includes('emergency')) return 'urgent';
    if (lowerText.includes('important') || lowerText.includes('priority')) return 'high';
    if (lowerText.includes('later') || lowerText.includes('eventually')) return 'low';
    
    return 'medium';
  }

  private estimateDuration(text: string): number {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('call') || lowerText.includes('text')) return 15;
    if (lowerText.includes('meeting')) return 60;
    if (lowerText.includes('cook') || lowerText.includes('dinner')) return 45;
    if (lowerText.includes('workout') || lowerText.includes('exercise')) return 60;
    if (lowerText.includes('review') || lowerText.includes('check')) return 30;
    
    return 30; // Default
  }

  private extractTags(text: string): string[] {
    const tags: string[] = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('urgent')) tags.push('urgent');
    if (lowerText.includes('call')) tags.push('communication');
    if (lowerText.includes('meeting')) tags.push('meeting');
    if (lowerText.includes('dinner') || lowerText.includes('cook')) tags.push('cooking');
    
    return tags;
  }

  private extractTime(text: string): { date?: Date, time?: string } | null {
    const today = new Date();
    const result: { date?: Date, time?: string } = {};
    
    // Check for relative dates
    if (text.includes('tomorrow')) {
      result.date = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    } else if (text.includes('today')) {
      result.date = today;
    }
    
    // Check for specific times
    const timeMatch = text.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = timeMatch[3]?.toLowerCase();
      
      if (period === 'pm' && hours !== 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
      
      result.time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    return Object.keys(result).length > 0 ? result : null;
  }

  private extractAssignee(text: string, familyMembers: string[]): string | undefined {
    for (const member of familyMembers) {
      if (text.toLowerCase().includes(member.toLowerCase())) {
        return member;
      }
    }
    return undefined;
  }
}