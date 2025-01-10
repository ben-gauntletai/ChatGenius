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
      <div className="flex-1 flex flex-col">
        <DirectMessageHeader
          userId={otherUser.userId}
          workspaceId={workspaceId}
        />
      </div>
      <MessageList 
        initialMessages={initialMessages}
        isDM={true}
        otherUserId={otherUser.userId}
        workspaceId={workspaceId}
      />
    </div>
  );
} 