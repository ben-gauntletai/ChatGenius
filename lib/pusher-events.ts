export const EVENTS = {
  MEMBER_UPDATE: 'member:update',     // Single event for all member updates (profile, status)
  ERROR: 'error',                     // For error broadcasting
  CHANNEL_CREATE: 'channel:create',   // When a new channel is created
  CHANNEL_DELETE: 'channel:delete',   // When a channel is deleted
  CHANNEL_UPDATE: 'channel:update'    // When a channel is updated
} as const;

export interface MemberUpdateEvent {
  id: string;
  userId: string;
  userName: string;
  userImage: string | null;
  status: string;
  hasCustomName: boolean;
  hasCustomImage: boolean;
  workspaceId: string;
}

export interface ErrorEvent {
  error: string;
  memberId?: string;
}

export interface ChannelEvent {
  id: string;
  name: string;
  workspaceId: string;
  description?: string;
} 