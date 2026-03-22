// src/utils/notifications.ts
import { Env } from '../types';

/**
 * --- Notification Helpers ---
 */

export async function createNotification(
  env: Env,
  db: D1Database, 
  user_id: number, 
  type: 'sym_request' | 'sym_accepted' | 'file_shared' | 'system_alert', 
  actor_id?: number, 
  payload: any = {}
) {
  try {
    await db.prepare(
      'INSERT INTO notifications (user_id, actor_id, type, payload) VALUES (?, ?, ?, ?)'
    ).bind(user_id, actor_id || null, type, JSON.stringify(payload)).run();

    // Notify the user via Durable Object WebSocket
    const doId = env.DO_NAMESPACE.idFromName('relf-do-instance');
    const doStub = env.DO_NAMESPACE.get(doId);
    
    await doStub.fetch('http://do-stub/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: user_id, 
        message: { type: 'new_notification', notificationType: type, actorId: actor_id, payload } 
      }),
    });

  } catch (e) {
    console.error("Failed to create notification or notify via DO:", e);
  }
}

export async function broadcastSignal(
  env: Env,
  type: 'signal_communique' | 'signal_artifact' | 'system_alert',
  userId: number,
  payload: any = {}
) {
  try {
    const doId = env.DO_NAMESPACE.idFromName('relf-do-instance');
    const doStub = env.DO_NAMESPACE.get(doId);
    
    await doStub.fetch('http://do-stub/broadcast-signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        userId,
        payload
      }),
    });
  } catch (e) {
    console.error("Failed to broadcast signal:", e);
  }
}
