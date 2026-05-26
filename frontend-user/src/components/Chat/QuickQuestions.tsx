interface Props {
  onSelect: (q: string) => void;
}

const DEFAULT_QUESTIONS = [
  "景区开放时间是几点？",
  "洗手间在哪里？",
  "有什么推荐的游览路线？",
  "门票价格是多少？",
  "附近有餐厅吗？",
];

export default function QuickQuestions({ onSelect }: Props) {
  return (
    <div className="quick-questions">
      {DEFAULT_QUESTIONS.map((q) => (
        <button key={q} className="quick-q-btn" onClick={() => onSelect(q)}>
          {q}
        </button>
      ))}
    </div>
  );
}
