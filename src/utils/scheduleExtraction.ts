export interface ScheduleExtraction {
  type: 'wake' | 'breakfast' | 'lunch' | 'dinner' | 'sleep';
  time: string; // 24-hour format HH:MM
  confidence: number; // 0-1 confidence score
  originalText: string;
  source: 'explicit' | 'implicit';
}

export class ScheduleExtractor {
  // Time patterns for different formats
  private static timePatterns = [
    // 12-hour format with AM/PM
    /\b(\d{1,2}):?(\d{2})?\s*(AM|PM)\b/gi,
    // 24-hour format
    /\b(\d{1,2}):(\d{2})\b/g,
    // Word numbers with AM/PM
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(AM|PM)\b/gi,
    // Approximate times
    /\baround\s+(\d{1,2}):?(\d{2})?\s*(AM|PM)?\b/gi,
    /\babout\s+(\d{1,2}):?(\d{2})?\s*(AM|PM)?\b/gi,
  ];

  // Activity patterns for different schedule types
  private static activityPatterns = {
    wake: [
      /\b(wake\s+up|waking\s+up|get\s+up|getting\s+up)\s+(?:at\s+)?/gi,
      /\b(wake|woke)\s+(?:at\s+)?/gi,
      /\b(morning\s+routine|start\s+my\s+day)\s+(?:at\s+)?/gi,
    ],
    breakfast: [
      /\b(breakfast|morning\s+meal)\s+(?:at\s+)?/gi,
      /\b(have\s+breakfast|eat\s+breakfast)\s+(?:at\s+)?/gi,
      /\b(morning\s+food|first\s+meal)\s+(?:at\s+)?/gi,
    ],
    lunch: [
      /\b(lunch|midday\s+meal)\s+(?:at\s+)?/gi,
      /\b(have\s+lunch|eat\s+lunch)\s+(?:at\s+)?/gi,
      /\b(noon\s+meal|afternoon\s+meal)\s+(?:at\s+)?/gi,
    ],
    dinner: [
      /\b(dinner|evening\s+meal|supper)\s+(?:at\s+)?/gi,
      /\b(have\s+dinner|eat\s+dinner)\s+(?:at\s+)?/gi,
      /\b(night\s+meal|evening\s+food)\s+(?:at\s+)?/gi,
    ],
    sleep: [
      /\b(sleep|go\s+to\s+sleep|going\s+to\s+sleep)\s+(?:at\s+)?/gi,
      /\b(bedtime|go\s+to\s+bed|going\s+to\s+bed)\s+(?:at\s+)?/gi,
      /\b(night\s+routine|end\s+my\s+day)\s+(?:at\s+)?/gi,
    ],
  };

  // Convert word numbers to digits
  private static wordToNumber: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  };

  // Extract all schedule times from a message
  static extractAllScheduleTimes(message: string): ScheduleExtraction[] {
    const extractions: ScheduleExtraction[] = [];
    const lowerMessage = message.toLowerCase();

    // Check each activity type
    for (const [activityType, patterns] of Object.entries(this.activityPatterns)) {
      for (const pattern of patterns) {
        const matches = [...lowerMessage.matchAll(pattern)];
        
        for (const match of matches) {
          const activityIndex = match.index || 0;
          const contextWindow = message.substring(
            Math.max(0, activityIndex - 20),
            Math.min(message.length, activityIndex + match[0].length + 50)
          );

          // Look for time expressions near the activity mention
          const timeExtraction = this.extractTimeFromContext(contextWindow);
          
          if (timeExtraction) {
            extractions.push({
              type: activityType as any,
              time: timeExtraction.time,
              confidence: timeExtraction.confidence,
              originalText: contextWindow.trim(),
              source: timeExtraction.source,
            });
          }
        }
      }
    }

    // Remove duplicates and return highest confidence extractions
    return this.deduplicateExtractions(extractions);
  }

  // Extract time from context around an activity mention
  private static extractTimeFromContext(context: string): { time: string; confidence: number; source: 'explicit' | 'implicit' } | null {
    const timeExpressions = this.findTimeExpressions(context);
    
    if (timeExpressions.length === 0) return null;

    // Use the first (closest) time expression
    const timeExpr = timeExpressions[0];
    const time24 = this.convertTo24Hour(timeExpr.time, timeExpr.period);
    
    if (!time24) return null;

    return {
      time: time24,
      confidence: timeExpr.confidence,
      source: timeExpr.explicit ? 'explicit' : 'implicit',
    };
  }

  // Find time expressions in text
  private static findTimeExpressions(text: string): Array<{ time: string; period?: string; confidence: number; explicit: boolean }> {
    const expressions: Array<{ time: string; period?: string; confidence: number; explicit: boolean }> = [];

    // 12-hour format with AM/PM (highest confidence)
    const amPmRegex = /(\d{1,2}):?(\d{2})?\s*(AM|PM|A\.M\.|P\.M\.)/gi;
    let match;
    while ((match = amPmRegex.exec(text)) !== null) {
      const hours = match[1];
      const minutes = match[2] || '00';
      const rawPeriod = match[3];
      
      if (rawPeriod) {
        // Normalize period (handle A.M./P.M. format)
        const period = rawPeriod.toUpperCase().replace(/\./g, '').replace(/M$/, 'M');
        
        expressions.push({
          time: `${hours}:${minutes}`,
          period,
          confidence: 0.9,
          explicit: true,
        });
      } else {
        expressions.push({
          time: `${hours}:${minutes}`,
          confidence: 0.8,
          explicit: true,
        });
      }
    }

    // 24-hour format (high confidence)
    const time24Regex = /\b(\d{1,2}):(\d{2})\b/g;
    while ((match = time24Regex.exec(text)) !== null) {
      const hours = parseInt(match[1]);
      const minutes = match[2];
      
      if (hours >= 0 && hours <= 23) {
        expressions.push({
          time: `${hours}:${minutes}`,
          confidence: 0.8,
          explicit: true,
        });
      }
    }

    // Word numbers with AM/PM (medium confidence)
    const wordTimeRegex = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(AM|PM|A\.M\.|P\.M\.)\b/gi;
    while ((match = wordTimeRegex.exec(text)) !== null) {
      const wordNum = match[1].toLowerCase();
      const rawPeriod = match[2].toUpperCase();
      const numHours = this.wordToNumber[wordNum];
      
      // Normalize period (handle A.M./P.M. format)
      const period = rawPeriod.replace(/\./g, '').replace(/M$/, 'M');
      
      if (numHours) {
        expressions.push({
          time: `${numHours}:00`,
          period,
          confidence: 0.7,
          explicit: true,
        });
      }
    }

    // Approximate times (lower confidence)
    const approxRegex = /\b(around|about|approximately)\s+(\d{1,2}):?(\d{2})?\s*(AM|PM|A\.M\.|P\.M\.)?\b/gi;
    while ((match = approxRegex.exec(text)) !== null) {
      const hours = match[2];
      const minutes = match[3] || '00';
      const rawPeriod = match[4]?.toUpperCase();
      
      // Normalize period (handle A.M./P.M. format)
      const period = rawPeriod ? rawPeriod.replace(/\./g, '').replace(/M$/, 'M') : undefined;
      
      expressions.push({
        time: `${hours}:${minutes}`,
        period,
        confidence: 0.6,
        explicit: false,
      });
    }

    return expressions;
  }

  // Convert 12-hour to 24-hour format
  private static convertTo24Hour(time: string, period?: string): string | null {
    const [hoursStr, minutesStr] = time.split(':');
    let hours = parseInt(hoursStr);
    const minutes = parseInt(minutesStr || '0');

    if (isNaN(hours) || isNaN(minutes) || hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      return null;
    }

    if (period) {
      if (period === 'AM' && hours === 12) {
        hours = 0;
      } else if (period === 'PM' && hours !== 12) {
        hours += 12;
      }
    } else {
      // No period specified - use context clues or assume based on hour
      if (hours >= 1 && hours <= 6) {
        // Early morning hours - likely AM unless context suggests otherwise
        // For now, assume AM
      } else if (hours >= 7 && hours <= 11) {
        // Could be AM or PM - assume AM for wake/breakfast, PM for dinner
        // Context-dependent logic would go here
      } else if (hours === 12) {
        // Noon - assume PM
        hours = 12;
      }
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // Remove duplicate extractions, keeping highest confidence
  private static deduplicateExtractions(extractions: ScheduleExtraction[]): ScheduleExtraction[] {
    const deduped: Record<string, ScheduleExtraction> = {};

    for (const extraction of extractions) {
      const key = extraction.type;
      if (!deduped[key] || extraction.confidence > deduped[key].confidence) {
        deduped[key] = extraction;
      }
    }

    return Object.values(deduped);
  }

  // Extract specific schedule time type from message
  static extractScheduleTime(message: string, type: 'wake' | 'breakfast' | 'lunch' | 'dinner' | 'sleep'): ScheduleExtraction | null {
    const extractions = this.extractAllScheduleTimes(message);
    return extractions.find(ext => ext.type === type) || null;
  }

  // Validate extracted time format
  static validateTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  // Get confidence threshold for auto-saving
  static getConfidenceThreshold(): number {
    return 0.6; // Only auto-save extractions with 60%+ confidence
  }
}