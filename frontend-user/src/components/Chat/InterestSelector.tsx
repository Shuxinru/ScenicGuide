import { useState } from "react";

const INTEREST_OPTIONS = [
  { key: "history", label: "历史人文", icon: "🏯" },
  { key: "nature", label: "自然风光", icon: "🌊" },
  { key: "family", label: "亲子游乐", icon: "👨‍👩‍👧" },
  { key: "food", label: "美食特产", icon: "🍜" },
  { key: "photo", label: "摄影打卡", icon: "📸" },
];

interface Props {
  selected: string[];
  onChange: (interests: string[]) => void;
}

export default function InterestSelector({ selected, onChange }: Props) {
  const toggle = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  return (
    <div className="interest-selector">
      <p className="interest-hint">选择您的兴趣，获取个性化推荐：</p>
      <div className="interest-tags">
        {INTEREST_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            className={`interest-tag ${selected.includes(opt.key) ? "active" : ""}`}
            onClick={() => toggle(opt.key)}
          >
            <span className="interest-icon">{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
