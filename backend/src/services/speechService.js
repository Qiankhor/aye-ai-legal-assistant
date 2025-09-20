import { configService } from '../config/clients.js';

/**
 * Speech Service for handling audio processing and speech-to-text conversion
 */
class SpeechService {
  constructor() {
    this.defaultConfig = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'en-US'
    };
  }

  /**
   * Convert audio buffer to text using Google Cloud Speech-to-Text
   */
  async convertSpeechToText(audioBuffer, languageCode = 'en-US') {
    try {
      if (!audioBuffer) {
        throw new Error('No audio buffer provided');
      }

      const speechClient = configService.getSpeechClient();
      const audioBytes = audioBuffer.toString('base64');

      const audio = {
        content: audioBytes,
      };

      const config = {
        ...this.defaultConfig,
        languageCode: languageCode || this.defaultConfig.languageCode
      };

      const request = {
        audio: audio,
        config: config,
      };

      console.log('Speech-to-text request config:', config);
      const [response] = await speechClient.recognize(request);
      console.log('Google Speech API Response:', response);
      
      if (!response || !response.results || response.results.length === 0) {
        console.log('No transcription results received');
        throw new Error('No transcription results');
      }

      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');

      console.log('Final transcription:', transcription);
      
      return {
        transcription,
        results: response.results,
        confidence: this.calculateAverageConfidence(response.results)
      };
    } catch (error) {
      console.error('Speech-to-text error:', error);
      throw new Error(`Error processing audio: ${error.message}`);
    }
  }

  /**
   * Calculate average confidence from speech recognition results
   */
  calculateAverageConfidence(results) {
    if (!results || results.length === 0) return 0;
    
    const confidences = results
      .map(result => result.alternatives[0]?.confidence || 0)
      .filter(conf => conf > 0);
    
    if (confidences.length === 0) return 0;
    
    return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
  }

  /**
   * Validate audio file format and size
   */
  validateAudioFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const supportedFormats = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg'];
    
    if (!file) {
      throw new Error('No audio file provided');
    }
    
    if (file.size > maxSize) {
      throw new Error('Audio file too large. Maximum size is 5MB');
    }
    
    if (!supportedFormats.some(format => file.mimetype?.includes(format.split('/')[1]))) {
      console.warn(`Unsupported audio format: ${file.mimetype}. Proceeding anyway...`);
    }
    
    return true;
  }

  /**
   * Get supported languages for speech recognition
   */
  getSupportedLanguages() {
    return [
      { code: 'en-US', name: 'English (US)' },
      { code: 'zh-CN', name: 'Chinese (Simplified)' },
      { code: 'ms-MY', name: 'Malay' },
    ];
  }

  /**
   * Process audio file and return transcription with metadata
   */
  async processAudioFile(file, languageCode) {
    try {
      // Validate the audio file
      this.validateAudioFile(file);
      
      // Convert speech to text
      const result = await this.convertSpeechToText(file.buffer, languageCode);
      
      return {
        success: true,
        transcription: result.transcription,
        confidence: result.confidence,
        languageCode: languageCode,
        fileSize: file.size,
        fileName: file.originalname,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error processing audio file:', error);
      return {
        success: false,
        error: error.message,
        fileName: file?.originalname || 'unknown',
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const speechService = new SpeechService();
