'use client';

import MessageList from './message-list';
import DirectMessageHeader from './direct-message-header';

interface DirectMessageContainerProps {
  otherUser: {
    userId: string;
  };
  initialMessages: any[];
  workspaceId: string;
}

export default function DirectMessageContainer({
  otherUser,
  initialMessages,
  workspaceId
}: DirectMessageContainerProps) {
  return (
    <div className="flex flex-col h-full">
      <DirectMessageHeader
        userId={otherUser.userId}
        workspaceId={workspaceId}
      />
      <MessageList 
        initialMessages={initialMessages}
        isDM={true}
        otherUserId={otherUser.userId}
        workspaceId={workspaceId}
      />
    </div>
  );
} 