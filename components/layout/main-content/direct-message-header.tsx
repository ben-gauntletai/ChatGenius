import Image from 'next/image';

interface DirectMessageHeaderProps {
  userName: string;
  userImage: string;
}

export default function DirectMessageHeader({ userName, userImage }: DirectMessageHeaderProps) {
  return (
    <div className="px-4 h-14 border-b flex items-center bg-white">
      <div className="flex items-center space-x-2">
        <Image
          src={userImage}
          alt={userName}
          width={28}
          height={28}
          className="rounded-full"
        />
        <span className="font-semibold text-lg">{userName}</span>
      </div>
    </div>
  );
} 