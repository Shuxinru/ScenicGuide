import type { Message } from "../../types/chat";

interface Props {
  message: Message;
}

export default function ChatBubble({ message }: Props) {
  const isUser = message.role === "user";
  return (
    <div className={`chat-bubble ${isUser ? "user" : "assistant"}`}>
      <div className="bubble-content">{message.content}</div>
      {message.sources && message.sources.length > 0 && (
        <div className="bubble-sources">
          参考来源：
          {message.sources.map((s, i) => (
            <span key={i} className="source-tag">{s.document_title}</span>
          ))}
        </div>
      )}
    </div>
  );
}
