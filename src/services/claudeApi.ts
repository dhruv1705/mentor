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

  // Generate system prompt for structured data collection
  private generateSystemPrompt(): string {
    let systemPrompt = `You are a data collection assistant. Your role is to collect specific information from users through structured questions only.

Your task is to ask questions in this exact order:

PHASE 1 - Profile Information (1 question):
1. Welcome to Mentor app, To start off with, Please tell me your name, age, gender and height. You can answer whatever you are comfortable answering.

PHASE 2 - Current Schedule (2 questions):
2. Tell me about your sleep schedule, What time do you go to bed and what time do you usually wake up?
3. Now tell me about your meals, What time do you have breakfast lunch and dinner?

PHASE 3 - Target Schedule (2 questions):
4. Now that we know your current daily schedule, Let us understand your Targeted schedule. Why don't you tell me what time would you like to go to sleep and what time would you like to wake up?
5. Now tell me what time you would like to have your breakfast lunch and dinner.

IMPORTANT GUIDELINES:
1. Ask only ONE question at a time
2. Wait for the user's answer before asking the next question
3. Do NOT provide advice, suggestions, or optimization recommendations
4. Do NOT engage in general conversation
5. Simply acknowledge the answer and ask the next question
6. Show progress: "Question X of 5"
7. If an answer is unclear, ask for clarification on that same question
8. When all 5 questions are completed, say "Thank you! Data collection complete."`;

    // Add current progress context
    if (this.context?.profile || this.context?.schedule) {
      const profile = this.context.profile;
      const schedule = this.context.schedule?.weekday;
      
      const answeredQuestions: string[] = [];
      
      // Track profile questions answered
      if (profile?.name && profile.name !== 'Voice Assistant User') answeredQuestions.push('name');
      if (profile?.age) answeredQuestions.push('age');
      if (profile?.gender) answeredQuestions.push('gender');
      if (profile?.height && profile.height > 0) answeredQuestions.push('height');
      
      // Track current schedule questions answered
      if (schedule?.wake_time) answeredQuestions.push('current_wake');
      if (schedule?.breakfast_time) answeredQuestions.push('current_breakfast');
      if (schedule?.lunch_time) answeredQuestions.push('current_lunch');
      if (schedule?.dinner_time) answeredQuestions.push('current_dinner');
      if (schedule?.sleep_time) answeredQuestions.push('current_sleep');
      
      // Track target schedule questions answered (we'll need to add these fields)
      // TODO: Add target schedule tracking
      
      if (answeredQuestions.length > 0) {
        systemPrompt += `\n\nPROGRESS: Already answered questions for: ${answeredQuestions.join(', ')}. Continue with the next unanswered question in sequence. Show "Question X of 5" where X is the next question number.`;
      } else {
        systemPrompt += `\n\nSTART: Begin with "Question 1 of 5: Welcome to Mentor app, To start off with, Please tell me your name, age, gender and height. You can answer whatever you are comfortable answering"`;
      }
    }



    return systemPrompt;
  }

  // Get the next question number based on completed data
  private getNextQuestionNumber(): number {
    const profile = this.context?.profile;
    const schedule = this.context?.schedule?.weekday;
    
    let questionNumber = 1;
    
    // Check if profile question (1) is completed - any profile field means we can move to question 2
    const hasValidGender = profile?.gender && 
                          profile.gender !== 'not_specified' && 
                          profile.gender !== 'Not specified' &&
                          profile.gender !== 'Not provided' &&
                          profile.gender !== 'not provided' &&
                          profile.gender !== '';
    const hasAnyProfileInfo = (profile?.name && profile.name !== 'Voice Assistant User') || 
                              profile?.age || 
                              hasValidGender || 
                              (profile?.height && profile.height > 0);
    
    if (hasAnyProfileInfo) questionNumber = Math.max(questionNumber, 2);
    
    // Check sleep schedule question (2) - both sleep_time AND wake_time needed
    const hasSleepSchedule = schedule?.sleep_time && schedule?.wake_time;
    if (hasSleepSchedule) questionNumber = Math.max(questionNumber, 3);
    
    // Check meal schedule question (3) - all three meal times needed
    const hasMealSchedule = schedule?.breakfast_time && schedule?.lunch_time && schedule?.dinner_time;
    if (hasMealSchedule) questionNumber = Math.max(questionNumber, 4);
    
    // Check target sleep schedule question (4) - both target sleep and wake times needed
    const hasTargetSleepSchedule = schedule?.target_sleep_time && schedule?.target_wake_time;
    if (hasTargetSleepSchedule) questionNumber = Math.max(questionNumber, 5);
    
    // Check target meal schedule question (5) - all three target meal times needed
    const hasTargetMealSchedule = schedule?.target_breakfast_time && schedule?.target_lunch_time && schedule?.target_dinner_time;
    if (hasTargetMealSchedule) questionNumber = Math.max(questionNumber, 6);
    
    return questionNumber;
  }

  // Extract and save schedule information from user message with question context
  private async extractAndSaveSchedule(userMessage: string, questionNumber?: number): Promise<void> {
    if (!this.context?.onScheduleUpdate) return;

    try {
      // Extract all schedule times from the message
      const extractedSchedules = ScheduleExtractor.extractAllScheduleTimes(userMessage);
      
      // Process each extracted schedule time
      for (const scheduleInfo of extractedSchedules) {
        if (scheduleInfo.confidence > ScheduleExtractor.getConfidenceThreshold()) {
          let fieldName: string;
          
          // Use question context to determine target vs regular fields
          if (questionNumber === 4) {
            // Question 4: Target sleep schedule
            if (scheduleInfo.type === 'sleep' || scheduleInfo.type === 'target_sleep') {
              fieldName = 'target_sleep_time';
            } else if (scheduleInfo.type === 'wake' || scheduleInfo.type === 'target_wake') {
              fieldName = 'target_wake_time';
            } else {
              continue; // Skip non-sleep/wake times for question 4
            }
          } else if (questionNumber === 5) {
            // Question 5: Target meal schedule
            if (scheduleInfo.type === 'breakfast' || scheduleInfo.type === 'target_breakfast') {
              fieldName = 'target_breakfast_time';
            } else if (scheduleInfo.type === 'lunch' || scheduleInfo.type === 'target_lunch') {
              fieldName = 'target_lunch_time';
            } else if (scheduleInfo.type === 'dinner' || scheduleInfo.type === 'target_dinner') {
              fieldName = 'target_dinner_time';
            } else {
              continue; // Skip non-meal times for question 5
            }
          } else {
            // Questions 2-3 or unknown: Use original field mapping
            const fieldMap = {
              wake: 'wake_time',
              breakfast: 'breakfast_time',
              lunch: 'lunch_time',
              dinner: 'dinner_time',
              sleep: 'sleep_time',
              target_wake: 'target_wake_time',
              target_breakfast: 'target_breakfast_time',
              target_lunch: 'target_lunch_time',
              target_dinner: 'target_dinner_time',
              target_sleep: 'target_sleep_time'
            };
            fieldName = fieldMap[scheduleInfo.type];
          }
          
          if (fieldName) {
            // Update only the specific field
            await this.context.onScheduleUpdate({
              field: fieldName,
              value: scheduleInfo.time,
              userId: this.context.profile?.user_id || '',
              scheduleType: 'weekday'
            });
            console.log(`✅ Auto-saved schedule: ${scheduleInfo.type} → ${fieldName} at ${scheduleInfo.time} (confidence: ${scheduleInfo.confidence}, question: ${questionNumber})`);
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
        const currentGender = this.context.profile?.gender;
        const hasGender = currentGender && 
          currentGender !== 'not_specified' && 
          currentGender !== 'Not specified' &&
          currentGender !== 'Not provided' &&
          currentGender !== 'not provided' &&
          currentGender !== '';
        console.log('🔍 Gender check - hasGender:', hasGender, 'current profile gender:', currentGender);
        
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

      // Get current question number for context-aware extraction
      const currentQuestion = this.getNextQuestionNumber();
      
      // Extract and save profile information from user message
      await this.extractAndSaveProfile(userMessage);
      
      // Extract and save schedule information from user message with question context
      await this.extractAndSaveSchedule(userMessage, currentQuestion);

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