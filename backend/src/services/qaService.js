import { aiService } from './aiService.js';

/**
 * Q&A Service for managing document completion sessions
 */
class QAService {
  constructor() {
    this.sessions = new Map(); // In-memory session storage
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Create a new Q&A session
   */
  async createSession(documentData, userId = 'default') {
    try {
      const sessionId = this.generateSessionId();
      
      // Generate questions if not already provided
      let questions = documentData.questions || [];
      if (questions.length === 0) {
        questions = await aiService.generateQuestionsForDocument(
          documentData.formFields, 
          documentData.documentName
        );
      }

      const session = {
        id: sessionId,
        userId: userId,
        documentData: documentData,
        questions: questions,
        answers: {},
        currentQuestionIndex: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      this.sessions.set(sessionId, session);
      
      // Set timeout to clean up session
      setTimeout(() => {
        this.cleanupSession(sessionId);
      }, this.sessionTimeout);

      return {
        success: true,
        sessionId: sessionId,
        totalQuestions: questions.length,
        currentQuestion: questions.length > 0 ? questions[0] : null,
        questionIndex: 0
      };
    } catch (error) {
      console.error('Error creating Q&A session:', error);
      throw new Error(`Failed to create Q&A session: ${error.message}`);
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }
    
    // Update last activity
    session.lastActivity = new Date().toISOString();
    return session;
  }

  /**
   * Submit answer to current question
   */
  async submitAnswer(sessionId, answer) {
    try {
      const session = this.getSession(sessionId);
      
      if (session.status !== 'active') {
        throw new Error('Session is not active');
      }

      const currentQuestion = session.questions[session.currentQuestionIndex];
      if (!currentQuestion) {
        throw new Error('No current question found');
      }

      // Store the answer
      session.answers[currentQuestion.field] = answer;
      session.lastActivity = new Date().toISOString();

      // Check if there are more questions
      const nextQuestionIndex = session.currentQuestionIndex + 1;
      const hasMoreQuestions = nextQuestionIndex < session.questions.length;

      if (hasMoreQuestions) {
        // Move to next question
        session.currentQuestionIndex = nextQuestionIndex;
        const nextQuestion = session.questions[nextQuestionIndex];
        
        return {
          success: true,
          hasMoreQuestions: true,
          nextQuestion: nextQuestion,
          questionIndex: nextQuestionIndex,
          totalQuestions: session.questions.length,
          progress: ((nextQuestionIndex) / session.questions.length) * 100
        };
      } else {
        // All questions completed
        session.status = 'completed';
        
        return {
          success: true,
          hasMoreQuestions: false,
          sessionCompleted: true,
          totalAnswers: Object.keys(session.answers).length,
          progress: 100
        };
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw new Error(`Failed to submit answer: ${error.message}`);
    }
  }

  /**
   * Get current question for a session
   */
  getCurrentQuestion(sessionId) {
    try {
      const session = this.getSession(sessionId);
      
      if (session.currentQuestionIndex >= session.questions.length) {
        return {
          success: true,
          completed: true,
          message: 'All questions have been answered'
        };
      }

      const currentQuestion = session.questions[session.currentQuestionIndex];
      
      return {
        success: true,
        question: currentQuestion,
        questionIndex: session.currentQuestionIndex,
        totalQuestions: session.questions.length,
        progress: (session.currentQuestionIndex / session.questions.length) * 100
      };
    } catch (error) {
      console.error('Error getting current question:', error);
      throw new Error(`Failed to get current question: ${error.message}`);
    }
  }

  /**
   * Get session progress and summary
   */
  getSessionProgress(sessionId) {
    try {
      const session = this.getSession(sessionId);
      
      const answeredQuestions = Object.keys(session.answers).length;
      const totalQuestions = session.questions.length;
      const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

      return {
        success: true,
        sessionId: sessionId,
        status: session.status,
        progress: progress,
        answeredQuestions: answeredQuestions,
        totalQuestions: totalQuestions,
        currentQuestionIndex: session.currentQuestionIndex,
        answers: session.answers,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity
      };
    } catch (error) {
      console.error('Error getting session progress:', error);
      throw new Error(`Failed to get session progress: ${error.message}`);
    }
  }

  /**
   * Complete session and generate document
   */
  async completeSession(sessionId) {
    try {
      const session = this.getSession(sessionId);
      
      if (session.status !== 'completed' && session.status !== 'active') {
        throw new Error('Session cannot be completed in current state');
      }

      // Mark session as completed
      session.status = 'completed';
      session.completedAt = new Date().toISOString();

      // Prepare data for document generation
      const filledFields = Object.entries(session.answers).map(([key, value]) => ({
        key,
        value
      }));

      return {
        success: true,
        sessionId: sessionId,
        documentName: session.documentData.documentName,
        filledFields: filledFields,
        originalFields: session.documentData.formFields || [],
        totalAnswers: filledFields.length,
        completedAt: session.completedAt
      };
    } catch (error) {
      console.error('Error completing session:', error);
      throw new Error(`Failed to complete session: ${error.message}`);
    }
  }

  /**
   * Cancel/delete a session
   */
  cancelSession(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'cancelled';
        this.sessions.delete(sessionId);
        return { success: true, message: 'Session cancelled successfully' };
      }
      return { success: false, message: 'Session not found' };
    } catch (error) {
      console.error('Error cancelling session:', error);
      throw new Error(`Failed to cancel session: ${error.message}`);
    }
  }

  /**
   * Clean up expired sessions
   */
  cleanupSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session && session.status !== 'completed') {
      console.log(`Cleaning up expired session: ${sessionId}`);
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all active sessions (for debugging/monitoring)
   */
  getActiveSessions() {
    const activeSessions = [];
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.status === 'active') {
        activeSessions.push({
          sessionId,
          userId: session.userId,
          documentName: session.documentData.documentName,
          progress: (Object.keys(session.answers).length / session.questions.length) * 100,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity
        });
      }
    }
    return activeSessions;
  }

  /**
   * Format question for display
   */
  formatQuestionForDisplay(question, questionIndex, totalQuestions) {
    const questionNumber = questionIndex + 1;
    const requiredText = question.required ? '*(Required)*' : '*(Optional)*';
    const exampleText = question.example ? `*Example: ${question.example}*` : '';
    
    return `📋 **Question ${questionNumber} of ${totalQuestions}:**

${question.question}

${requiredText}
${exampleText}

Please provide your answer (you can type or use voice):`;
  }
}

export const qaService = new QAService();
