import ChatContainer from '@/components/chat/ChatContainer';

export default async function ChatPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return (
    <div className="h-screen flex flex-col">
      <ChatContainer sessionId={sessionId} />
    </div>
  );
}
