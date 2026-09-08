import { CartItem } from '../types';

export interface AbandonedCartSession {
  sessionId: string;
  customerEmail: string;
  items: CartItem[];
  subtotal: number;
  lastActive: number;
  status: 'active' | 'abandoned' | 'recovered' | 'completed';
}

export async function logCartSession(
  sessionId: string, 
  customerEmail: string, 
  items: CartItem[], 
  subtotal: number
) {
  if (!customerEmail || items.length === 0) return;
  // Local storage implementation for mock
  try {
    const carts = JSON.parse(localStorage.getItem('abandoned_carts') || '{}');
    carts[sessionId] = {
      sessionId,
      customerEmail,
      items,
      subtotal,
      lastActive: Date.now(),
      status: 'active'
    };
    localStorage.setItem('abandoned_carts', JSON.stringify(carts));
  } catch (error) {
    console.error('Error logging cart session:', error);
  }
}

export async function markCartCompleted(sessionId: string) {
  try {
    const carts = JSON.parse(localStorage.getItem('abandoned_carts') || '{}');
    if (carts[sessionId]) {
      carts[sessionId].status = 'completed';
      carts[sessionId].completedAt = Date.now();
      localStorage.setItem('abandoned_carts', JSON.stringify(carts));
    }
  } catch (error) {
    console.error('Error marking cart completed:', error);
  }
}
