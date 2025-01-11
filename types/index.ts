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
  workspaceId?: string;
  reactions: Reaction[];
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  replyCount?: number;
  isThreadReply?: boolean;
  threadId?: string;
  parentMessageId?: string;
  thread?: {
    id: string;
    messageId: string;
    lastReply?: Message;
  };
  conversationId?: boolean;
} 