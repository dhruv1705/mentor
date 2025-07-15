import { ExtractedProfileInfo } from '../types/profile';
import { UserProfileService } from '../services/userProfileService';

export class ProfileExtractor {
  
  static extractAge(text: string): { value: number | null; confidence: number } {
    const lowerText = text.toLowerCase();
    
    // Patterns for age extraction
    const patterns = [
      // "I'm 25 years old", "I am 25 years old"
      /(?:i'm|i am|im)\s+(\d{1,2})\s+years?\s+old/i,
      // "I'm 25", "I am 25" (when context suggests age)
      /(?:i'm|i am|im)\s+(\d{1,2})(?:\s+years?\s+old)?/i,
      // "25 years old", "25 yrs old"
      /(\d{1,2})\s+(?:years?|yrs?)\s+old/i,
      // "age 25", "aged 25"
      /age[d]?\s+(\d{1,2})/i,
      // "25-year-old", "25 year old"
      /(\d{1,2})[- ]year[- ]old/i,
      // Direct age mention in context
      /(?:my age is|age:|age\s+is)\s*(\d{1,2})/i,
    ];

    for (const pattern of patterns) {
      const match = lowerText.match(pattern);
      if (match) {
        const age = parseInt(match[1]);
        if (age >= 1 && age <= 120) {
          // Higher confidence for more explicit patterns
          const confidence = pattern.source.includes('years old') ? 0.9 : 0.7;
          return { value: age, confidence };
        }
      }
    }

    return { value: null, confidence: 0 };
  }

  static extractGender(text: string): { value: string | null; confidence: number } {
    const lowerText = text.toLowerCase();
    
    // High confidence patterns
    const highConfidencePatterns = [
      { pattern: /(?:i'm|i am|im)\s+(?:a\s+)?(?:male|man|guy|boy)/i, gender: 'male', confidence: 0.9 },
      { pattern: /(?:i'm|i am|im)\s+(?:a\s+)?(?:female|woman|girl|lady)/i, gender: 'female', confidence: 0.9 },
      { pattern: /(?:my gender is|gender:|i identify as)\s*(?:male|man)/i, gender: 'male', confidence: 0.95 },
      { pattern: /(?:my gender is|gender:|i identify as)\s*(?:female|woman)/i, gender: 'female', confidence: 0.95 },
    ];

    // Medium confidence patterns
    const mediumConfidencePatterns = [
      { pattern: /\b(?:male|man|guy|boy)\b/i, gender: 'male', confidence: 0.6 },
      { pattern: /\b(?:female|woman|girl|lady)\b/i, gender: 'female', confidence: 0.6 },
      { pattern: /\b(?:he|him|his)\b/i, gender: 'male', confidence: 0.5 },
      { pattern: /\b(?:she|her|hers)\b/i, gender: 'female', confidence: 0.5 },
    ];

    // Check high confidence patterns first
    for (const { pattern, gender, confidence } of highConfidencePatterns) {
      if (pattern.test(lowerText)) {
        return { value: gender, confidence };
      }
    }

    // Check medium confidence patterns
    for (const { pattern, gender, confidence } of mediumConfidencePatterns) {
      if (pattern.test(lowerText)) {
        return { value: gender, confidence };
      }
    }

    return { value: null, confidence: 0 };
  }

  static extractHeight(text: string): { value: number | null; confidence: number } {
    const lowerText = text.toLowerCase();
    
    // Patterns for height extraction
    const patterns = [
      // "I'm 5'8", "I am 5 feet 8 inches"
      {
        pattern: /(?:i'm|i am|im)\s+(\d+)['']?\s*(?:feet?|ft)?\s*(\d+)['"]?\s*(?:inches?|in)?/i,
        type: 'feet_inches',
        confidence: 0.9
      },
      // "I'm 175cm", "I am 175 cm"
      {
        pattern: /(?:i'm|i am|im)\s+(\d+(?:\.\d+)?)\s*(?:cm|centimeters?)/i,
        type: 'cm',
        confidence: 0.9
      },
      // "I'm 1.75m", "I am 1.75 meters"
      {
        pattern: /(?:i'm|i am|im)\s+(\d+\.\d+)\s*(?:m|meters?)/i,
        type: 'meters',
        confidence: 0.9
      },
      // "5'8 tall", "5 feet 8 inches tall"
      {
        pattern: /(\d+)['']?\s*(?:feet?|ft)?\s*(\d+)['"]?\s*(?:inches?|in)?\s*tall/i,
        type: 'feet_inches',
        confidence: 0.8
      },
      // "175cm tall", "175 cm tall"
      {
        pattern: /(\d+(?:\.\d+)?)\s*(?:cm|centimeters?)\s*tall/i,
        type: 'cm',
        confidence: 0.8
      },
      // "my height is 175cm"
      {
        pattern: /(?:my height is|height:|height\s+is)\s*(\d+(?:\.\d+)?)\s*(?:cm|centimeters?)/i,
        type: 'cm',
        confidence: 0.9
      },
      // "my height is 5'8"
      {
        pattern: /(?:my height is|height:|height\s+is)\s*(\d+)['']?\s*(?:feet?|ft)?\s*(\d+)['"]?\s*(?:inches?|in)?/i,
        type: 'feet_inches',
        confidence: 0.9
      },
    ];

    for (const { pattern, type, confidence } of patterns) {
      const match = lowerText.match(pattern);
      if (match) {
        let heightInCm: number | null = null;

        if (type === 'feet_inches') {
          const feet = parseInt(match[1]);
          const inches = match[2] ? parseInt(match[2]) : 0;
          if (feet >= 3 && feet <= 8 && inches >= 0 && inches <= 11) {
            heightInCm = Math.round((feet * 12 + inches) * 2.54);
          }
        } else if (type === 'cm') {
          const cm = parseFloat(match[1]);
          if (cm >= 50 && cm <= 300) {
            heightInCm = Math.round(cm);
          }
        } else if (type === 'meters') {
          const meters = parseFloat(match[1]);
          if (meters >= 0.5 && meters <= 3.0) {
            heightInCm = Math.round(meters * 100);
          }
        }

        if (heightInCm) {
          return { value: heightInCm, confidence };
        }
      }
    }

    return { value: null, confidence: 0 };
  }

  static extractName(text: string): { value: string | null; confidence: number } {
    const lowerText = text.toLowerCase();
    
    // Patterns for name extraction
    const patterns = [
      // "My name is John", "I'm John"
      /(?:my name is|i'm|i am|im|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      // "I'm called John"
      /(?:i'm called|they call me|people call me)\s+([A-Z][a-z]+)/i,
      // Direct introduction patterns
      /(?:hi,?\s+i'm|hello,?\s+i'm|hey,?\s+i'm)\s+([A-Z][a-z]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern); // Use original text to preserve capitalization
      if (match) {
        const name = match[1].trim();
        // Basic validation for name
        if (name.length >= 2 && name.length <= 50 && /^[A-Za-z\s]+$/.test(name)) {
          return { value: name, confidence: 0.8 };
        }
      }
    }

    return { value: null, confidence: 0 };
  }

  static extractAllProfileInfo(text: string): ExtractedProfileInfo {
    const age = this.extractAge(text);
    const gender = this.extractGender(text);
    const height = this.extractHeight(text);
    const name = this.extractName(text);

    const extractedData: ExtractedProfileInfo = {
      source: text,
      confidence: 0,
    };

    // Add extracted data with confidence
    if (age.value !== null) {
      extractedData.age = age.value;
      extractedData.confidence = Math.max(extractedData.confidence, age.confidence);
    }

    if (gender.value !== null) {
      extractedData.gender = gender.value as any;
      extractedData.confidence = Math.max(extractedData.confidence, gender.confidence);
    }

    if (height.value !== null) {
      extractedData.height = height.value;
      extractedData.confidence = Math.max(extractedData.confidence, height.confidence);
    }

    // Calculate overall confidence (average of individual confidences)
    const confidences = [age.confidence, gender.confidence, height.confidence].filter(c => c > 0);
    if (confidences.length > 0) {
      extractedData.confidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    }

    return extractedData;
  }

  static generateProfileQuestions(missingFields: string[]): string[] {
    const questions: { [key: string]: string[] } = {
      age: [
        "By the way, how old are you? This helps me provide more relevant advice.",
        "I'd love to know your age to better personalize our conversations.",
        "Could you tell me how old you are? It helps me understand your perspective better.",
      ],
      gender: [
        "I'd like to know a bit more about you - what are your pronouns?",
        "Could you tell me how you identify? This helps me communicate more naturally.",
        "What pronouns should I use when referring to you?",
      ],
      height: [
        "How tall are you? Just curious to get to know you better!",
        "What's your height? This might be useful for health or fitness discussions.",
        "Could you tell me how tall you are?",
      ],
      name: [
        "What should I call you? I'd love to know your name!",
        "I'd like to know your name so I can address you properly.",
        "What's your name? I want to make our conversation more personal.",
      ],
    };

    const selectedQuestions: string[] = [];
    
    for (const field of missingFields) {
      if (questions[field]) {
        const randomQuestion = questions[field][Math.floor(Math.random() * questions[field].length)];
        selectedQuestions.push(randomQuestion);
      }
    }

    return selectedQuestions;
  }

  static shouldAskForProfile(missingFields: string[], conversationLength: number): boolean {
    // Don't ask too early in conversation
    if (conversationLength < 2) return false;
    
    // Don't ask if profile is complete
    if (missingFields.length === 0) return false;
    
    // Ask with decreasing probability as conversation gets longer
    const probability = Math.max(0.1, 0.8 - (conversationLength * 0.1));
    return Math.random() < probability;
  }
}