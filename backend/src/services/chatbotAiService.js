import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { configService } from '../config/clients.js';

/**
 * Document-grounded Chatbot AI Service
 * - Keeps parity with the base AI service APIs
 * - Adds helpers to answer questions using provided document content
 */
class ChatbotAIService {
  constructor() {
    this.systemPrompt = `You are Aye, an AI Legal Assistant specialized in document-grounded Q&A.

When document content is provided, always prioritize and ground your answers in that document. Cite, quote, or paraphrase relevant sections concisely. If the answer is not present in the document, clearly say so and suggest what info is missing.

If you're unsure or a legal interpretation is required, recommend consulting a qualified attorney.`;
  }

  /**
   * Generic chat (no document context) using OpenAI
   */
  async processChatWithOpenAI(message, conversationHistory = []) {
    try {
      if (!message) throw new Error('Message is required');

      const openai = configService.getOpenAIClient();

      const formattedHistory = conversationHistory.map(msg => ({
        role: msg.sender === 'bot' ? 'assistant' : 'user',
        content: msg.text
      }));

      const messages = [
        { role: 'system', content: this.systemPrompt },
        ...formattedHistory,
        { role: 'user', content: message }
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 1000,
        temperature: 0.7
      });

      return {
        response: completion.choices[0].message.content,
        timestamp: new Date().toISOString(),
        provider: 'openai'
      };
    } catch (error) {
      console.error('OpenAI chat (doc chatbot) error:', error);
      throw new Error('Error processing chat request with OpenAI');
    }
  }

  /**
   * Generic chat (no document context) using AWS Bedrock
   */
  async processChatWithBedrock(message, conversationHistory = []) {
    try {
      if (!message) throw new Error('Message is required');

      const bedrock = configService.getBedrockClient();

      let conversationContext = this.systemPrompt + '\n\nConversation History:\n';
      conversationHistory.forEach(msg => {
        conversationContext += `${msg.sender === 'bot' ? 'Assistant' : 'User'}: ${msg.text}\n`;
      });
      conversationContext += `\nUser: ${message}\n\nAssistant:`;

      const input = {
        modelId: 'mistral.mistral-7b-instruct-v0:2',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          prompt: conversationContext,
          max_tokens: 1000,
          temperature: 0.7
        })
      };

      const command = new InvokeModelCommand(input);
      const response = await bedrock.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      return {
        response: responseBody.outputs[0].text,
        timestamp: new Date().toISOString(),
        provider: 'bedrock'
      };
    } catch (error) {
      console.error('Bedrock chat (doc chatbot) error:', error);
      throw new Error('Error processing chat request with Bedrock');
    }
  }

  /**
   * Document-grounded chat using OpenAI
   */
  async processChatWithOpenAIUsingDocument(documentText, question, conversationHistory = []) {
    try {
      if (!question) throw new Error('Question is required');

      // Use OpenAI gpt-4.1 for document-grounded chat
      const openai = configService.getOpenAIClient();

      // Strict grounded prompt: answer ONLY from document; otherwise NOT_IN_DOCUMENT
      const doc = (documentText || '').trim();
      const prompt = `STRICT GROUNDED QA\n\nTASK: Using ONLY the text inside <DOCUMENT>, answer the user's question. If the document does not contain the answer, reply exactly: NOT_IN_DOCUMENT.\n\nRULES:\n- Do not use outside knowledge.\n- Keep answer concise (1-3 sentences).\n- If possible, include a short supporting quote: Quote: \"...\"\n- If no evidence, reply NOT_IN_DOCUMENT.\n\n<DOCUMENT>\n${doc}\n</DOCUMENT>\n\nQUESTION: ${question}\nANSWER:`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'STRICT GROUNDED QA: Use ONLY <DOCUMENT> text. If you cannot answer from the document, provide a concise bullet-point summary of the document and end with "Could you share more context (e.g., clause title, keywords, or section number)?" Answer in bullet points. Minimum 20 characters. Never reply with a single character.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.2
      });
      const text = completion.choices?.[0]?.message?.content || '';
      const trimmed = text.trim();

      if (!trimmed || trimmed.length < 20 || /NOT[_\s-]?IN[_\s-]?DOCUMENT/i.test(trimmed)) {
        const summary = await this.summarizeDocumentText(documentText, 'Document');
        return {
          response: `${summary}\n\nCould you share more context (e.g., clause title, keywords, or section number)?`,
          timestamp: new Date().toISOString(),
          provider: 'openai'
        };
      }

      return {
        response: trimmed,
        timestamp: new Date().toISOString(),
        provider: 'openai'
      };
    } catch (error) {
      console.error('OpenAI document-grounded chat error:', error);
      throw new Error('Error processing document-grounded chat request with OpenAI');
    }
  }

  /**
   * Document-grounded chat using OpenAI GPT-4o
   */
  async processChatWithOpenAI4UsingDocument(documentText, question, conversationHistory = []) {
    try {
      if (!question) throw new Error('Question is required');

      const openai = configService.getOpenAIClient();

      // Strict grounded prompt: answer ONLY from document; otherwise NOT_IN_DOCUMENT
      const doc = (documentText || '').trim();
      const system = `STRICT GROUNDED QA\n\nTASK: Using ONLY the text inside <DOCUMENT>, answer the user's question. If you cannot answer from the document, provide a concise bullet-point summary of the document`;

      const user = `<DOCUMENT>\n${doc}\n</DOCUMENT>\n\nQUESTION: ${question}\nANSWER:`;

      const messages = [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        max_tokens: 800,
        temperature: 0.2
      });

      const respText = completion.choices?.[0]?.message?.content || '';
      const trimmed2 = respText.trim();
      if (!trimmed2 || trimmed2.length < 20 || /NOT[_\s-]?IN[_\s-]?DOCUMENT/i.test(trimmed2)) {
        const summary = await this.summarizeDocumentText(documentText, 'Document');
        return {
          response: `${summary}\n\nCould you share more context (e.g., clause title, keywords, or section number)?`,
          timestamp: new Date().toISOString(),
          provider: 'openai'
        };
      }

      return {
        response: trimmed2,
        timestamp: new Date().toISOString(),
        provider: 'openai'
      };
    } catch (error) {
      console.error('OpenAI GPT-4 document-grounded chat error:', error);
      throw new Error('Error processing document-grounded chat request with OpenAI');
    }
  }

  /**
   * Document-grounded chat using AWS Bedrock
   */
  async processChatWithBedrockUsingDocument(documentText, question, conversationHistory = []) {
    try {
      if (!question) throw new Error('Question is required');

      const bedrock = configService.getBedrockClient();

      let prompt = this.systemPrompt + '\n\n';
      if (documentText && documentText.trim().length > 0) {
        prompt += `Document (use this as the primary source):\n<DOCUMENT>\n${documentText}\n</DOCUMENT>\n\n`;
      } else {
        prompt += 'No document was provided.\n\n';
      }

      if (conversationHistory && conversationHistory.length > 0) {
        prompt += 'Conversation History:\n';
        conversationHistory.forEach(msg => {
          prompt += `${msg.sender === 'bot' ? 'Assistant' : 'User'}: ${msg.text}\n`;
        });
        prompt += '\n';
      }

      prompt += `User question: ${question}\n\nAssistant:`;

      const input = {
        modelId: 'mistral.mistral-7b-instruct-v0:2',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          prompt,
          max_tokens: 1200,
          temperature: 0.4
        })
      };

      const command = new InvokeModelCommand(input);
      const response = await bedrock.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      return {
        response: responseBody.outputs[0].text,
        timestamp: new Date().toISOString(),
        provider: 'bedrock'
      };
    } catch (error) {
      console.error('Bedrock document-grounded chat error:', error);
      throw new Error('Error processing document-grounded chat request with Bedrock');
    }
  }

  /**
   * Summarize a raw document text (helper for Home/Doc upload flows)
   */
  async summarizeDocumentText(documentText, documentName = 'Document') {
    try {
      const openai = configService.getOpenAIClient();
      const system = 'You produce concise, professional legal summaries.';
      const user = `Summarize the following legal document in a concise, professional manner.\n\nTitle: ${documentName}\n\n<DOCUMENT>\n${documentText}\n</DOCUMENT>\n\nReturn:\n- 4-8 bullet points of key facts and obligations\n- Risks or red flags\n- Missing info (if any)`;
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        max_tokens: 700,
        temperature: 0.3
      });
      return completion.choices?.[0]?.message?.content || 'No summary available.';
    } catch (error) {
      console.error('Error summarizing document text:', error);
      return 'Unable to summarize the document at this time.';
    }
  }

  async summarizeDocumentIfPresent(documentText, documentName = 'Document') {
    const length = (documentText || '').trim().length;
    if (length === 0) {
      return { success: false, message: 'no document to be summarize' };
    }
    const summary = await this.summarizeDocumentText(documentText, documentName);
    return { success: true, summary };
  }

  // Gemini clause analysis removed; use analyzeClauseWithOpenAI4 instead

  /**
   * Clause-level analysis using OpenAI GPT-4o
   */
  async analyzeClauseWithOpenAI4({ highlightedText, role, documentType, jurisdiction, readingLevel = 'Grade 8' }) {
    try {
      const text = (highlightedText || '').trim();
      if (text.length === 0) {
        return { response: 'NOT_IN_DOCUMENT', provider: 'openai', timestamp: new Date().toISOString() };
      }

      const openai = configService.getOpenAIClient();

      const system = `You are a legal explainer for non-lawyers. Use ONLY the provided highlighted clause. If insufficient, reply exactly: NOT_IN_DOCUMENT.`;
      const user = `Role: You are helping a ${role} understand a highlighted clause from a ${documentType} governed by ${jurisdiction}.
Goal: Explain, extract obligations, spot risks, and suggest clearer wording.
Text to analyze: """ ${text} """
Output in sections:
give in point form in the following sections:
Plain-English summary (max 5 bullets, at ${readingLevel})
Who does what and when (parties, triggers, deadlines)
Money terms (amounts, caps, thresholds, currency)
Ambiguities or missing details
Key risks for ${role} and negotiation tips (max 5 bullets)
Clearer re-draft of the clause
Questions to clarify with the other party
Rules: Quote exact phrases when needed; don’t assume facts not in text; note if jurisdiction may affect interpretation; be concise and neutral.`;

      const messages = [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        max_tokens: 900,
        temperature: 0.2
      });

      return {
        response: completion.choices?.[0]?.message?.content || 'NOT_IN_DOCUMENT',
        timestamp: new Date().toISOString(),
        provider: 'openai'
      };
    } catch (error) {
      console.error('OpenAI GPT-4 clause analysis error:', error);
      throw new Error('Error processing clause analysis with OpenAI');
    }
  }
}

export const chatbotAiService = new ChatbotAIService();


