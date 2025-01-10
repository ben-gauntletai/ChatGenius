export const EVENTS = {
  MEMBER_UPDATE: 'member:update',     // Single event for all member updates (profile, status)
  ERROR: 'error'                      // For error broadcasting
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