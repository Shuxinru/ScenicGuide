import { useState, useEffect } from "react";
import { getConversations, ConversationSummary } from "../../api/tourist";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (convId: string) => void;
}

export default function HistoryDrawer({ open, onClose, onSelect }: Props) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getConversations(1, 500)
        .then((res) => setConversations(res.items || []))
        .catch(() => setConversations([]))
        .finally(() => setLoading(false));
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content history-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>历史对话</h3>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          {loading ? (
            <p className="drawer-empty">加载中...</p>
          ) : conversations.length === 0 ? (
            <p className="drawer-empty">暂无历史对话</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                className="conversation-item"
                onClick={() => {
                  onSelect(conv.id);
                  onClose();
                }}
              >
                <div className="conv-title">{conv.title}</div>
                <div className="conv-meta">
                  <span>{conv.message_count} 条消息</span>
                  <span>{conv.created_at ? new Date(conv.created_at).toLocaleDateString("zh-CN") : ""}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
