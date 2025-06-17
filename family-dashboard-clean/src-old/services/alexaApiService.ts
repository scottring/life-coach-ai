// src/services/alexaApiService.ts
// Service for integrating with Alexa for dog behavior monitoring

import { WyzeBarkEvent, WyzeMotionEvent } from '../types/dogBehavior';

export interface AlexaCredentials {
  deviceId: string;
  skillId?: string;
  apiKey?: string;
}

export interface AlexaDevice {
  id: string;
  name: string;
  type: string;
  isOnline: boolean;
  capabilities: string[];
  room?: string;
}

export interface AlexaEvent {
  eventId: string;
  deviceId: string;
  timestamp: number;
  type: 'bark' | 'motion' | 'sound';
  intensity: 'light' | 'moderate' | 'heavy';
  confidence: number;
  duration?: number;
  metadata?: {
    soundLevel?: number;
    frequency?: number;
    location?: string;
  };
}

export interface AlexaMonitoringData {
  sessionId: string;
  deviceId: string;
  startTime: Date;
  endTime?: Date;
  barkEvents: WyzeBarkEvent[];
  motionEvents: WyzeMotionEvent[];
  soundLevels: Array<{
    timestamp: Date;
    level: number;
    type: string;
  }>;
  isActive: boolean;
}

class AlexaApiService {
  private webhookUrl = process.env.NODE_ENV === 'production' 
    ? '/api/alexa-webhook' 
    : 'http://localhost:3000/api/alexa-webhook';
  private deviceId: string | null = null;
  private apiKey: string | null = null;
  private isConnected = false;

  constructor() {
    // Load credentials from localStorage
    this.deviceId = localStorage.getItem('alexa_device_id');
    this.apiKey = localStorage.getItem('alexa_api_key');
    this.isConnected = !!this.deviceId;
  }

  // Configuration and setup methods
  async setCredentials(credentials: AlexaCredentials): Promise<void> {
    this.deviceId = credentials.deviceId;
    this.apiKey = credentials.apiKey || '';
    
    localStorage.setItem('alexa_device_id', this.deviceId);
    if (this.apiKey) {
      localStorage.setItem('alexa_api_key', this.apiKey);
    }
    
    this.isConnected = true;
  }

  getCredentials(): AlexaCredentials | null {
    if (!this.deviceId) return null;
    
    return {
      deviceId: this.deviceId,
      apiKey: this.apiKey || undefined
    };
  }

  clearCredentials(): void {
    this.deviceId = null;
    this.apiKey = null;
    this.isConnected = false;
    
    localStorage.removeItem('alexa_device_id');
    localStorage.removeItem('alexa_api_key');
  }

  isAuthenticated(): boolean {
    return this.isConnected && !!this.deviceId;
  }

  // Device discovery and management
  async getAvailableDevices(): Promise<AlexaDevice[]> {
    // In a real implementation, this would query Alexa Smart Home API
    // For now, return mock devices based on common Alexa device types
    return [
      {
        id: 'echo-living-room',
        name: 'Living Room Echo',
        type: 'Echo Dot',
        isOnline: true,
        capabilities: ['SoundDetection', 'MotionDetection', 'DropIn'],
        room: 'Living Room'
      },
      {
        id: 'echo-kitchen',
        name: 'Kitchen Echo Show',
        type: 'Echo Show',
        isOnline: true,
        capabilities: ['SoundDetection', 'VideoStreaming', 'DropIn'],
        room: 'Kitchen'
      },
      {
        id: 'echo-bedroom',
        name: 'Bedroom Echo',
        type: 'Echo',
        isOnline: false,
        capabilities: ['SoundDetection', 'DropIn'],
        room: 'Bedroom'
      }
    ];
  }

  async testConnection(): Promise<boolean> {
    if (!this.deviceId) {
      throw new Error('No device configured');
    }
    
    try {
      // Test webhook connectivity
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey || 'test'
        },
        body: JSON.stringify({
          eventType: 'connection_test',
          sessionId: 'test',
          familyId: 'test',
          data: { deviceId: this.deviceId },
          timestamp: new Date().toISOString()
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Alexa connection test failed:', error);
      return false;
    }
  }

  // Session management
  async startMonitoring(sessionId: string, familyId: string): Promise<void> {
    if (!this.deviceId) {
      throw new Error('No Alexa device configured');
    }
    
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey || ''
        },
        body: JSON.stringify({
          eventType: 'session_start',
          sessionId,
          familyId,
          data: { deviceId: this.deviceId },
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to start Alexa monitoring');
      }
    } catch (error) {
      console.error('Error starting Alexa monitoring:', error);
      throw error;
    }
  }

  async stopMonitoring(sessionId: string, familyId: string): Promise<void> {
    if (!this.deviceId) {
      throw new Error('No Alexa device configured');
    }
    
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey || ''
        },
        body: JSON.stringify({
          eventType: 'session_end',
          sessionId,
          familyId,
          data: { deviceId: this.deviceId },
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop Alexa monitoring');
      }
    } catch (error) {
      console.error('Error stopping Alexa monitoring:', error);
      throw error;
    }
  }

  // Event simulation for testing (since we can't easily trigger real Alexa events)
  async simulateBarkEvent(sessionId: string, familyId: string, intensity: 'light' | 'moderate' | 'heavy' = 'moderate'): Promise<void> {
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey || 'demo'
      },
      body: JSON.stringify({
        eventType: 'bark_detected',
        sessionId,
        familyId,
        data: {
          intensity,
          confidence: 0.85 + Math.random() * 0.15, // 85-100% confidence
          duration: Math.random() * 3 + 1 // 1-4 seconds
        },
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to simulate bark event');
    }
  }

  async simulateMotionEvent(sessionId: string, familyId: string, level: 'light' | 'moderate' | 'heavy' = 'moderate'): Promise<void> {
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey || 'demo'
      },
      body: JSON.stringify({
        eventType: 'motion_detected',
        sessionId,
        familyId,
        data: {
          level,
          confidence: 0.80 + Math.random() * 0.20, // 80-100% confidence
          duration: Math.random() * 10 + 5 // 5-15 seconds
        },
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to simulate motion event');
    }
  }

  // Generate demo monitoring data with realistic patterns
  async generateDemoMonitoringData(sessionId: string, familyId: string, startTime: Date, endTime: Date): Promise<AlexaMonitoringData> {
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    const barkEvents: WyzeBarkEvent[] = [];
    const motionEvents: WyzeMotionEvent[] = [];
    const soundLevels: Array<{ timestamp: Date; level: number; type: string }> = [];

    // Generate realistic bark patterns
    // Most barking happens in first 30 minutes (separation anxiety)
    const barkProbability = Math.min(durationMinutes / 60, 1); // More likely for longer sessions
    const numBarks = Math.floor(Math.random() * 8 * barkProbability);

    for (let i = 0; i < numBarks; i++) {
      // 70% of barks in first 30 minutes
      const timeRatio = Math.random() < 0.7 ? Math.random() * 0.5 : Math.random();
      const barkTime = new Date(startTime.getTime() + timeRatio * (endTime.getTime() - startTime.getTime()));
      
      const intensities = ['light', 'moderate', 'heavy'] as const;
      const intensity = intensities[Math.floor(Math.random() * intensities.length)];
      
      barkEvents.push({
        timestamp: barkTime,
        loudness: intensity === 'light' ? 3 : intensity === 'moderate' ? 6 : 9, // 1-10 scale
        duration: Math.random() * 5 + 1, // 1-6 seconds
        confidence: 0.8 + Math.random() * 0.2
      });
    }

    // Generate motion events (dog moving around)
    const motionProbability = Math.min(durationMinutes / 120, 1);
    const numMotions = Math.floor(Math.random() * 15 * motionProbability);

    for (let i = 0; i < numMotions; i++) {
      const motionTime = new Date(startTime.getTime() + Math.random() * (endTime.getTime() - startTime.getTime()));
      
      const levels = ['light', 'moderate', 'heavy'] as const;
      const level = levels[Math.floor(Math.random() * levels.length)];
      
      motionEvents.push({
        timestamp: motionTime,
        intensity: level === 'light' ? 3 : level === 'moderate' ? 6 : 9, // 1-10 scale
        duration: Math.random() * 30 + 10, // 10-40 seconds
        location: 'Living Room' // Could be randomized based on device location
      });
    }

    // Generate ambient sound levels every 5 minutes
    for (let time = startTime.getTime(); time < endTime.getTime(); time += 5 * 60 * 1000) {
      soundLevels.push({
        timestamp: new Date(time),
        level: Math.random() * 0.3 + 0.1, // 10-40% ambient level
        type: 'ambient'
      });
    }

    return {
      sessionId,
      deviceId: this.deviceId || 'alexa-device',
      startTime,
      endTime,
      barkEvents,
      motionEvents,
      soundLevels,
      isActive: false
    };
  }

  // Utility methods for UI display
  getSetupInstructions(): string[] {
    return [
      "1. Open the Alexa app on your phone",
      "2. Go to Devices → All Devices",
      "3. Select your Echo device in the room where you want to monitor your dog",
      "4. Enable 'Sound Detection' in device settings",
      "5. Set up a routine: 'When dog barks, send notification'",
      "6. Copy your device ID from the Alexa app",
      "7. Paste it below and click 'Connect'"
    ];
  }

  getDeviceRequirements(): string[] {
    return [
      "Amazon Echo, Echo Dot, or Echo Show device",
      "Device must support Sound Detection (most 3rd gen+ devices)",
      "Stable WiFi connection",
      "Alexa app with Sound Detection enabled",
      "Device placed within hearing range of your dog"
    ];
  }
}

export const alexaApiService = new AlexaApiService();