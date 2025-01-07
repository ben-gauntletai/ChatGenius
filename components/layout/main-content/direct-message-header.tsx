import Image from 'next/image';

interface DirectMessageHeaderProps {
  userName: string;
  userImage: string;
}

export default function DirectMessageHeader({ userName, userImage }: DirectMessageHeaderProps) {
  return (
    <div className="h-14 border-b flex items-center px-4 gap-2">
      <div className="relative w-6 h-6">
        <Image
          src={userImage}
          alt={userName}
          fill
          className="rounded-sm object-cover"
        />
      </div>
      <span className="font-bold">{userName}</span>
    </div>
  );
} 