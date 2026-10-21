import type { User } from '../../lib/types';
export interface SupportThread {
  id: string; userId: string; customer: User; status: 'open' | 'resolved'; sequence: number;
  version: number; adminUnread: number; customerUnread: number; lastMessage: string;
  createdAt: string; updatedAt: string;
}
export interface SupportMessage { id: string; sequence: number; senderId: string; senderRole: 'customer' | 'admin'; text: string; createdAt: string }
export interface SupportPage { thread: SupportThread | null; messages: SupportMessage[]; hasMore: boolean }
