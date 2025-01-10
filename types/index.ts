export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
}

export interface Message {
  id: string;
  content: string;
  createdAt: Date | string;
  userId: string;
  userName: string;
  userImage: string | null;
  channelId?: string;
  reactions: Reaction[];
  fileUrl?: string | null | undefined;
  fileName?: string | null | undefined;
  fileType?: string | null | undefined;
  replyCount?: number;
  conversationId?: boolean;
} 