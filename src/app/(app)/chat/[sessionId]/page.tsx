import ChatContainer from '@/components/chat/ChatContainer';

export default async function ChatPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return (
    <div className="absolute inset-0 pb-[calc(env(safe-area-inset-bottom)+80px)] z-0 flex flex-col">
      <ChatContainer sessionId={sessionId} />
    </div>
  );
}
