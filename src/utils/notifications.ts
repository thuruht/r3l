// src/utils/notifications.ts
import { Env } from '../types';
import { RelfDO } from '../do';

/**
 * --- Notification Helpers ---
 * Uses RPC to communicate with RelfDO (no HTTP overhead).
 */

export async function createNotification(
  env: Env,
  db: D1Database, 
  user_id: number, 
  type: 'sym_request' | 'sym_accepted' | 'file_shared' | 'system_alert' | '3space_request' | '3space_accepted',
  actor_id?: number, 
  payload: any = {}
) {
  try {
    await db.prepare(
      'INSERT INTO notifications (user_id, actor_id, type, payload) VALUES (?, ?, ?, ?)'
    ).bind(user_id, actor_id || null, type, JSON.stringify(payload)).run();

    // Notify the user via Durable Object RPC
    const doId = env.DO_NAMESPACE.idFromName('relf-do-instance');
    const doStub = env.DO_NAMESPACE.get(doId) as DurableObjectStub<RelfDO>;
    
    await doStub.notify(user_id, { 
      type: 'new_notification', notificationType: type, actorId: actor_id, payload 
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
    const doStub = env.DO_NAMESPACE.get(doId) as DurableObjectStub<RelfDO>;
    
    await doStub.broadcastSignal({ type, userId, payload });
  } catch (e) {
    console.error("Failed to broadcast signal:", e);
  }
}
