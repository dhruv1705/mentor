import axios from 'axios';
import { CLAUDE_API_KEY } from '@env';
import { UserProfile, ProfileCompletionStatus } from '../types/profile';
import { ProfileExtractor } from '../utils/profileExtraction';

const API_KEY = CLAUDE_API_KEY || '';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeConversationContext {
  profile?: UserProfile | null;
  profileCompletion?: ProfileCompletionStatus;
  conversationLength: number;
  onProfileUpdate?: (field: string, value: any) => Promise<void>;
}

export interface ClaudeResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  id: string;
  model: string;
  role: string;
  stop_reason: string;
  stop_sequence: null;
  type: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class ClaudeApiService {
  private conversationHistory: ClaudeMessage[] = [];
  private context: ClaudeConversationContext | null = null;

  // Set conversation context
  setContext(context: ClaudeConversationContext): void {
    this.context = context;
  }

  // Generate system prompt with user context
  private generateSystemPrompt(): string {
    let systemPrompt = `You are a helpful, friendly AI assistant. Your role is to provide clear, concise, and helpful responses while getting to know the user naturally.

IMPORTANT GUIDELINES:
1. Be conversational and engaging, but not intrusive
2. If you don't know personal details about the user, you may occasionally ask 1-2 friendly questions to get to know them better
3. Keep responses helpful and focused on the user's actual questions
4. Don't overwhelm with too many personal questions at once`;

    // Add user context if available
    if (this.context?.profile) {
      const profile = this.context.profile;
      const profileInfo: string[] = [];

      if (profile.name) profileInfo.push(`their name is ${profile.name}`);
      if (profile.age) profileInfo.push(`they are ${profile.age} years old`);
      if (profile.gender) profileInfo.push(`they identify as ${profile.gender}`);
      if (profile.height) profileInfo.push(`they are ${profile.height}cm tall`);

      if (profileInfo.length > 0) {
        systemPrompt += `\n\nUSER CONTEXT: You know that ${profileInfo.join(', ')}. Use this information naturally in conversation when relevant, but don't repeat information they've already told you.`;
      }
    }

    // Add profile completion guidance
    if (this.context?.profileCompletion) {
      const completion = this.context.profileCompletion;
      if (completion.missingFields.length > 0 && completion.completionPercentage < 100) {
        systemPrompt += `\n\nPROFILE COMPLETION: The user's profile is ${completion.completionPercentage}% complete. Missing: ${completion.missingFields.join(', ')}. You may naturally ask about this information when appropriate, but prioritize helping with their actual questions first.`;
      }
    }

    return systemPrompt;
  }

  // Extract and save profile information from user message
  private async extractAndSaveProfile(userMessage: string): Promise<void> {
    if (!this.context?.onProfileUpdate) return;

    try {
      const extractedInfo = ProfileExtractor.extractAllProfileInfo(userMessage);
      
      // Only save information with reasonable confidence
      if (extractedInfo.confidence > 0.5) {
        if (extractedInfo.age && !this.context.profile?.age) {
          await this.context.onProfileUpdate('age', extractedInfo.age);
          console.log(`Auto-saved age: ${extractedInfo.age} (confidence: ${extractedInfo.confidence})`);
        }
        
        if (extractedInfo.gender && !this.context.profile?.gender) {
          await this.context.onProfileUpdate('gender', extractedInfo.gender);
          console.log(`Auto-saved gender: ${extractedInfo.gender} (confidence: ${extractedInfo.confidence})`);
        }
        
        if (extractedInfo.height && !this.context.profile?.height) {
          await this.context.onProfileUpdate('height', extractedInfo.height);
          console.log(`Auto-saved height: ${extractedInfo.height}cm (confidence: ${extractedInfo.confidence})`);
        }
      }
    } catch (error) {
      console.error('Error extracting profile information:', error);
    }
  }

  async sendMessage(userMessage: string): Promise<string> {
    try {
      // Debug: Log API key status
      console.log('API Key status:', API_KEY ? `Present (${API_KEY.substring(0, 10)}...)` : 'Missing');
      
      if (!API_KEY || API_KEY.trim() === '') {
        return 'API key is missing. Please check your .env file and restart the app.';
      }

      // Extract and save profile information from user message
      await this.extractAndSaveProfile(userMessage);

      // Add user message to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      // Prepare the API request with system prompt
      const requestData = {
        model: 'claude-3-haiku-20240307', // Fast and cost-effective model
        max_tokens: 1000,
        system: this.generateSystemPrompt(),
        messages: this.conversationHistory
      };

      console.log('Making request to Claude API...');
      const response = await axios.post<ClaudeResponse>(
        CLAUDE_API_URL,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
            'anthropic-version': '2023-06-01'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      // Extract the assistant's response
      const assistantMessage = response.data.content[0]?.text || 'Sorry, I could not process your request.';

      // Add assistant response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage
      });

      return assistantMessage;

    } catch (error) {
      console.error('Claude API Error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return 'Authentication error. Please check the API key.';
        } else if (error.response?.status === 429) {
          return 'Rate limit exceeded. Please try again later.';
        } else if (error.code === 'ECONNABORTED') {
          return 'Request timeout. Please try again.';
        }
      }
      
      return 'Sorry, I encountered an error. Please try again.';
    }
  }

  // Clear conversation history
  clearHistory(): void {
    this.conversationHistory = [];
  }

  // Get conversation history
  getHistory(): ClaudeMessage[] {
    return [...this.conversationHistory];
  }
}

// Export a singleton instance
export const claudeApi = new ClaudeApiService();