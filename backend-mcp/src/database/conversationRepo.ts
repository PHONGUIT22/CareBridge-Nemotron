import { getDatabase } from './db.js';

export interface ChatMessageEntity {
  id?: string;
  userId?: string;
  sender: 'user' | 'assistant' | 'alexa';
  text: string;
  toolName?: string | null;
  toolArgs?: Record<string, any> | null;
  toolResult?: any | null;
  urgencyLevel?: string | null;
  createdAt?: string;
}

export interface SeniorMemoryEntity {
  id?: string;
  userId?: string;
  category: 'preference' | 'habit' | 'clinical_note' | string;
  content: string;
  extractedAt?: string;
}

/**
 * Conversation & Senior Habit Memory Repository
 * Manages persistent cross-session dialogue history and long-term senior habits in SQLite WAL.
 */
export const ConversationRepo = {
  /**
   * Fetch recent conversation dialogue turns for persistent cross-session memory
   */
  async getRecentConversations(userId: string = 'usr_demo', limit: number = 20): Promise<ChatMessageEntity[]> {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT * FROM conversation_history
      WHERE user_id = ?
      ORDER BY created_at ASC
      LIMIT ?
    `).all(userId, limit) as any[];

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      sender: row.sender,
      text: row.text,
      toolName: row.tool_name,
      toolArgs: row.tool_args ? JSON.parse(row.tool_args) : null,
      toolResult: row.tool_result ? JSON.parse(row.tool_result) : null,
      urgencyLevel: row.urgency_level,
      createdAt: row.created_at,
    }));
  },

  /**
   * Save a single dialogue message turn into conversation_history
   */
  async saveMessage(message: ChatMessageEntity): Promise<ChatMessageEntity> {
    const db = getDatabase();
    const id = message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userId = message.userId || 'usr_demo';
    const createdAt = message.createdAt || new Date().toISOString();

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO conversation_history (
        id, user_id, sender, text, tool_name, tool_args, tool_result, urgency_level, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      userId,
      message.sender,
      message.text,
      message.toolName || null,
      message.toolArgs ? JSON.stringify(message.toolArgs) : null,
      message.toolResult ? JSON.stringify(message.toolResult) : null,
      message.urgencyLevel || null,
      createdAt
    );

    return {
      ...message,
      id,
      userId,
      createdAt,
    };
  },

  /**
   * Retrieve all recorded long-term senior habits and personal preferences
   */
  async getSeniorMemories(userId: string = 'usr_demo'): Promise<SeniorMemoryEntity[]> {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT * FROM senior_memories
      WHERE user_id = ?
      ORDER BY extracted_at DESC
    `).all(userId) as any[];

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      category: row.category,
      content: row.content,
      extractedAt: row.extracted_at,
    }));
  },

  /**
   * Store a newly extracted senior preference or habit
   */
  async addSeniorMemory(
    userId: string = 'usr_demo',
    category: string,
    content: string
  ): Promise<SeniorMemoryEntity> {
    const db = getDatabase();
    const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const extractedAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO senior_memories (id, user_id, category, content, extracted_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, userId, category, content, extractedAt);

    return {
      id,
      userId,
      category,
      content,
      extractedAt,
    };
  },
};
