import axios from 'axios';
import { CLAUDE_API_KEY } from '@env';
import { UserProfile, ProfileCompletionStatus } from '../types/profile';
import { ProfileExtractor } from '../utils/profileExtraction';
import { ScheduleExtractor } from '../utils/scheduleExtraction';
import { scheduleService } from './scheduleService';

const API_KEY = CLAUDE_API_KEY || '';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeConversationContext {
  profile?: UserProfile | null;
  profileCompletion?: ProfileCompletionStatus;
  schedule?: { weekday: any; weekend: any };
  conversationLength: number;
  onProfileUpdate?: (field: string, value: any) => Promise<void>;
  onScheduleUpdate?: (scheduleData: any) => Promise<void>;
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
    let systemPrompt = `You are a personal schedule optimization mentor. Your role is to help users improve their daily routine by optimizing 5 key time points:

1. Wake up time
2. Breakfast time
3. Lunch time
4. Dinner time
5. Sleep time

Your personality is supportive, focused, and data-driven. You ask specific questions about timing, track consistency, and provide gentle optimization suggestions.

IMPORTANT GUIDELINES:
1. Focus conversations on schedule optimization and daily routine
2. Ask specific questions about the 5 time points when appropriate
3. Provide actionable timing recommendations based on user patterns
4. Be encouraging about schedule improvements and consistency
5. Keep responses focused on schedule optimization while being conversational`;

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

    // Add schedule context if available
    if (this.context?.schedule) {
      const schedule = this.context.schedule.weekday;
      if (schedule) {
        const scheduleInfo: string[] = [];
        
        if (schedule.wake_time) scheduleInfo.push(`wake up at ${schedule.wake_time}`);
        if (schedule.breakfast_time) scheduleInfo.push(`have breakfast at ${schedule.breakfast_time}`);
        if (schedule.lunch_time) scheduleInfo.push(`have lunch at ${schedule.lunch_time}`);
        if (schedule.dinner_time) scheduleInfo.push(`have dinner at ${schedule.dinner_time}`);
        if (schedule.sleep_time) scheduleInfo.push(`go to sleep at ${schedule.sleep_time}`);

        if (scheduleInfo.length > 0) {
          systemPrompt += `\n\nSCHEDULE CONTEXT: You know that they ${scheduleInfo.join(', ')}. Use this schedule information to provide personalized timing advice and ask relevant follow-up questions about their routine.`;
          
          // Add optimization suggestions
          const optimizations = this.generateScheduleOptimizations(schedule);
          if (optimizations.length > 0) {
            systemPrompt += `\n\nSCHEDULE OPTIMIZATION OPPORTUNITIES: ${optimizations.join('; ')}. Mention these improvements naturally when relevant to the conversation.`;
          }
        }
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

  // Generate schedule optimization suggestions
  private generateScheduleOptimizations(schedule: any): string[] {
    const optimizations: string[] = [];

    // Helper function to convert time to minutes
    const timeToMinutes = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // Helper function to format time for display
    const formatTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
    };

    // Check wake time optimization
    if (schedule.wake_time) {
      const wakeMinutes = timeToMinutes(schedule.wake_time);
      if (wakeMinutes < 360) { // Before 6 AM
        optimizations.push("Consider waking up slightly later (around 6:30 AM) for better sleep quality");
      } else if (wakeMinutes > 540) { // After 9 AM
        optimizations.push("Earlier wake time (around 7:00 AM) can improve productivity and energy");
      }
    }

    // Check breakfast timing relative to wake time
    if (schedule.wake_time && schedule.breakfast_time) {
      const wakeMinutes = timeToMinutes(schedule.wake_time);
      const breakfastMinutes = timeToMinutes(schedule.breakfast_time);
      const timeDiff = breakfastMinutes - wakeMinutes;

      if (timeDiff > 120) { // More than 2 hours
        const suggestedTime = formatTime(wakeMinutes + 60);
        optimizations.push(`Try having breakfast within 1-2 hours of waking (around ${suggestedTime}) to boost metabolism`);
      } else if (timeDiff < 30) { // Less than 30 minutes
        optimizations.push("Consider waiting 30-60 minutes after waking before eating to aid digestion");
      }
    }

    // Check lunch timing
    if (schedule.lunch_time) {
      const lunchMinutes = timeToMinutes(schedule.lunch_time);
      if (lunchMinutes < 660) { // Before 11 AM
        optimizations.push("Lunch might be too early - consider eating around 12:00-1:00 PM");
      } else if (lunchMinutes > 840) { // After 2 PM
        optimizations.push("Late lunch can affect dinner timing - try eating around 12:00-1:00 PM");
      }
    }

    // Check dinner and sleep timing
    if (schedule.dinner_time && schedule.sleep_time) {
      const dinnerMinutes = timeToMinutes(schedule.dinner_time);
      const sleepMinutes = timeToMinutes(schedule.sleep_time);
      let timeDiff = sleepMinutes - dinnerMinutes;
      
      // Handle next day sleep time
      if (timeDiff < 0) {
        timeDiff += 24 * 60;
      }

      if (timeDiff < 120) { // Less than 2 hours
        const suggestedTime = formatTime(sleepMinutes - 180);
        optimizations.push(`Try eating dinner 3 hours before sleep (around ${suggestedTime}) for better sleep quality`);
      } else if (timeDiff > 360) { // More than 6 hours
        optimizations.push("Large gap between dinner and sleep - consider a light snack before bed");
      }
    }

    // Check overall sleep time
    if (schedule.sleep_time) {
      const sleepMinutes = timeToMinutes(schedule.sleep_time);
      if (sleepMinutes < 1320 && sleepMinutes > 60) { // Between 1 AM and 10 PM (converted to next day)
        if (sleepMinutes < 120) { // Before 2 AM
          optimizations.push("Very late bedtime - consider going to sleep by 10:00-11:00 PM");
        }
      } else if (sleepMinutes > 1380) { // After 11 PM
        optimizations.push("Good bedtime range - maintain consistency for best results");
      }
    }

    return optimizations;
  }

  // Extract and save schedule information from user message
  private async extractAndSaveSchedule(userMessage: string): Promise<void> {
    if (!this.context?.onScheduleUpdate) return;

    try {
      // Extract all schedule times from the message
      const extractedSchedules = ScheduleExtractor.extractAllScheduleTimes(userMessage);
      
      // Process each extracted schedule time
      for (const scheduleInfo of extractedSchedules) {
        if (scheduleInfo.confidence > ScheduleExtractor.getConfidenceThreshold()) {
          const fieldMap = {
            wake: 'wake_time',
            breakfast: 'breakfast_time',
            lunch: 'lunch_time',
            dinner: 'dinner_time',
            sleep: 'sleep_time'
          };
          
          const fieldName = fieldMap[scheduleInfo.type];
          if (fieldName) {
            // Update only the specific field
            await this.context.onScheduleUpdate({
              field: fieldName,
              value: scheduleInfo.time,
              userId: this.context.profile?.user_id || '',
              scheduleType: 'weekday'
            });
            console.log(`✅ Auto-saved schedule: ${scheduleInfo.type} at ${scheduleInfo.time} (confidence: ${scheduleInfo.confidence})`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error extracting schedule information:', error);
    }
  }

  // Extract and save profile information from user message
  private async extractAndSaveProfile(userMessage: string): Promise<void> {
    if (!this.context?.onProfileUpdate) return;

    try {
      console.log('🔍 Extracting profile info from message:', userMessage);
      
      // Extract each field individually for better debugging
      const ageExtraction = ProfileExtractor.extractAge(userMessage);
      const genderExtraction = ProfileExtractor.extractGender(userMessage);
      const heightExtraction = ProfileExtractor.extractHeight(userMessage);
      const nameExtraction = ProfileExtractor.extractName(userMessage);
      
      console.log('🔍 Extraction results:', {
        age: ageExtraction,
        gender: genderExtraction,
        height: heightExtraction,
        name: nameExtraction
      });
      
      // Process age
      if (ageExtraction.value && ageExtraction.confidence > 0.5) {
        const hasAge = this.context.profile?.age && this.context.profile.age !== 'Voice Assistant User';
        console.log('🔍 Age check - hasAge:', hasAge, 'current profile age:', this.context.profile?.age);
        
        if (!hasAge) {
          await this.context.onProfileUpdate('age', ageExtraction.value);
          console.log(`✅ Auto-saved age: ${ageExtraction.value} (confidence: ${ageExtraction.confidence})`);
        }
      }
      
      // Process gender
      if (genderExtraction.value && genderExtraction.confidence > 0.5) {
        const hasGender = this.context.profile?.gender;
        console.log('🔍 Gender check - hasGender:', hasGender, 'current profile gender:', this.context.profile?.gender);
        
        if (!hasGender) {
          await this.context.onProfileUpdate('gender', genderExtraction.value);
          console.log(`✅ Auto-saved gender: ${genderExtraction.value} (confidence: ${genderExtraction.confidence})`);
        }
      }
      
      // Process height
      if (heightExtraction.value && heightExtraction.confidence > 0.5) {
        const hasHeight = this.context.profile?.height && this.context.profile.height > 0;
        console.log('🔍 Height check - hasHeight:', hasHeight, 'current profile height:', this.context.profile?.height);
        
        if (!hasHeight) {
          await this.context.onProfileUpdate('height', heightExtraction.value);
          console.log(`✅ Auto-saved height: ${heightExtraction.value}cm (confidence: ${heightExtraction.confidence})`);
        }
      }
      
      // Process name
      if (nameExtraction.value && nameExtraction.confidence > 0.5) {
        const hasName = this.context.profile?.name && this.context.profile.name.trim() !== 'Voice Assistant User';
        console.log('🔍 Name check - hasName:', hasName, 'current profile name:', this.context.profile?.name);
        
        if (!hasName) {
          await this.context.onProfileUpdate('name', nameExtraction.value);
          console.log(`✅ Auto-saved name: ${nameExtraction.value} (confidence: ${nameExtraction.confidence})`);
        }
      }
    } catch (error) {
      console.error('❌ Error extracting profile information:', error);
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
      
      // Extract and save schedule information from user message
      await this.extractAndSaveSchedule(userMessage);

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

  // Get the last user message from conversation history
  getLastUserMessage(): string | null {
    // Find the last user message in the conversation history
    const lastUserMessage = [...this.conversationHistory]
      .reverse()
      .find(msg => msg.role === 'user');
    
    return lastUserMessage ? lastUserMessage.content : null;
  }
}

// Export a singleton instance
export const claudeApi = new ClaudeApiService();