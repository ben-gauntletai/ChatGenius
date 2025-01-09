interface ChannelHeaderProps {
  name: string;
}

export default function ChannelHeader({ name }: ChannelHeaderProps) {
  return (
    <div className="px-6 py-4 border-b">
      <div className="flex items-center">
        <span className="text-lg font-semibold">#{name}</span>
      </div>
    </div>
  );
} 