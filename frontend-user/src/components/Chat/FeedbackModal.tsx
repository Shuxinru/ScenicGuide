import { useState, useEffect } from "react";
import { submitFeedback, getFeedback, FeedbackDetail } from "../../api/tourist";

interface Props {
  open: boolean;
  conversationId: string | null;
  onClose: () => void;
  onDone: (convId: string) => void;
}

const RATINGS = [
  { value: 1, label: "很差", emoji: "😞" },
  { value: 2, label: "较差", emoji: "😕" },
  { value: 3, label: "一般", emoji: "😐" },
  { value: 4, label: "满意", emoji: "😊" },
  { value: 5, label: "很棒", emoji: "🤩" },
];

export default function FeedbackModal({ open, conversationId, onClose, onDone }: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [existingFeedback, setExistingFeedback] = useState<FeedbackDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && conversationId) {
      setLoading(true);
      setExistingFeedback(null);
      getFeedback(conversationId)
        .then((fb) => {
          setExistingFeedback(fb);
          setRating(fb.rating);
          setComment(fb.comment || "");
        })
        .catch(() => {
          setExistingFeedback(null);
          setRating(0);
          setComment("");
        })
        .finally(() => setLoading(false));
    } else if (open && !conversationId) {
      setExistingFeedback(null);
      setRating(0);
      setComment("");
    }
  }, [open, conversationId]);

  if (!open) return null;

  const isEdit = !!existingFeedback;

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    setError("");
    try {
      await submitFeedback({ rating, comment, conversation_id: conversationId });
      setDone(true);
      if (conversationId) onDone(conversationId);
    } catch (err: any) {
      setError("提交失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setDone(false);
    setError("");
    setExistingFeedback(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content feedback-modal" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="feedback-done">
            <span className="done-icon">✅</span>
            <h3>{isEdit ? "评价已更新！" : "感谢您的反馈！"}</h3>
            <p>您的评价将帮助我们改进服务质量</p>
            <button className="modal-btn primary" onClick={handleClose}>关闭</button>
          </div>
        ) : loading ? (
          <p style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.5)" }}>加载中...</p>
        ) : (
          <>
            <h3 className="modal-title">{isEdit ? "查看/修改评价" : "评价反馈"}</h3>

            <div className="rating-section">
              <p className="rating-label">请给本次服务评分</p>
              <div className="rating-stars">
                {RATINGS.map((r) => (
                  <button
                    key={r.value}
                    className={`rating-star ${rating >= r.value ? "active" : ""}`}
                    onClick={() => setRating(r.value)}
                    title={r.label}
                  >
                    <span className="star-emoji">{r.emoji}</span>
                    <span className="star-label">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="comment-section">
              <p className="comment-label">补充评价（可选）</p>
              <textarea
                className="comment-input"
                placeholder="分享您的体验感受或建议..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={500}
              />
            </div>

            {error && <p className="feedback-error">{error}</p>}

            <div className="modal-actions">
              <button className="modal-btn" onClick={handleClose}>取消</button>
              <button
                className="modal-btn primary"
                onClick={handleSubmit}
                disabled={rating === 0 || submitting}
              >
                {submitting ? "提交中..." : isEdit ? "更新评价" : "提交反馈"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
