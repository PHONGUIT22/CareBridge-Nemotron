import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationRepo } from '../src/database/conversationRepo.js';
import { getDatabase } from '../src/database/db.js';

describe('Conversation & Senior Habit Persistent Memory Suite', () => {
  const testUserId = `usr_test_${Date.now()}`;

  beforeEach(() => {
    const db = getDatabase();
    // Ensure test user exists to satisfy foreign key constraint
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, pin, role, created_at)
      VALUES (?, ?, '1234', 'caregiver', ?)
    `).run(testUserId, `${testUserId}@example.com`, new Date().toISOString());

    db.prepare('DELETE FROM conversation_history WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM senior_memories WHERE user_id = ?').run(testUserId);
  });

  it('persists and retrieves cross-session conversation turns in chronological order', async () => {
    const userTurn = await ConversationRepo.saveMessage({
      id: `msg_test_user_1`,
      userId: testUserId,
      sender: 'user',
      text: 'I took my morning Amlodipine pill with water.',
      createdAt: '2026-10-03T08:00:00.000Z',
    });

    const assistantTurn = await ConversationRepo.saveMessage({
      id: `msg_test_asst_1`,
      userId: testUserId,
      sender: 'assistant',
      text: 'Confirmed! Amlodipine recorded as taken.',
      toolName: 'logDoseStatus',
      toolArgs: { medicineName: 'Amlodipine', status: 'taken' },
      toolResult: { success: true, remainingStock: 29 },
      urgencyLevel: 'LOW',
      createdAt: '2026-10-03T08:00:02.000Z',
    });

    expect(userTurn.id).toBe('msg_test_user_1');
    expect(assistantTurn.toolName).toBe('logDoseStatus');

    const history = await ConversationRepo.getRecentConversations(testUserId, 10);
    expect(history).toHaveLength(2);
    expect(history[0].sender).toBe('user');
    expect(history[0].text).toContain('Amlodipine');
    expect(history[1].sender).toBe('assistant');
    expect(history[1].toolName).toBe('logDoseStatus');
    expect(history[1].toolArgs?.status).toBe('taken');
    expect(history[1].toolResult?.remainingStock).toBe(29);
  });

  it('stores and retrieves long-term senior habit memories and preferences', async () => {
    const memory1 = await ConversationRepo.addSeniorMemory(
      testUserId,
      'preference',
      'Prefers taking blood pressure pills at 8 AM with warm water and oatmeal.'
    );

    const memory2 = await ConversationRepo.addSeniorMemory(
      testUserId,
      'habit',
      'Reports slight bitter taste when taking Metformin 500mg.'
    );

    expect(memory1.id).toBeDefined();
    expect(memory2.category).toBe('habit');

    const memories = await ConversationRepo.getSeniorMemories(testUserId);
    expect(memories).toHaveLength(2);
    expect(memories.some((m) => m.category === 'preference')).toBe(true);
    expect(memories.some((m) => m.content.includes('oatmeal'))).toBe(true);
    expect(memories.some((m) => m.content.includes('Metformin'))).toBe(true);
  });

  it('enforces multi-user isolation for conversation history and senior habits', async () => {
    const anotherUser = `usr_other_${Date.now()}`;
    const db = getDatabase();
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, pin, role, created_at)
      VALUES (?, ?, '1234', 'caregiver', ?)
    `).run(anotherUser, `${anotherUser}@example.com`, new Date().toISOString());

    await ConversationRepo.saveMessage({
      userId: testUserId,
      sender: 'user',
      text: 'Private message for test user',
    });

    await ConversationRepo.addSeniorMemory(
      testUserId,
      'clinical_note',
      'Private clinical note for test user'
    );

    const otherUserHistory = await ConversationRepo.getRecentConversations(anotherUser);
    const otherUserMemories = await ConversationRepo.getSeniorMemories(anotherUser);

    expect(otherUserHistory).toHaveLength(0);
    expect(otherUserMemories).toHaveLength(0);
  });
});
