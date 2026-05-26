interface Props {
  isThinking: boolean;
  isSpeaking: boolean;
  viseme: string;
}

export default function DigitalHumanAvatar({ isThinking, isSpeaking, viseme }: Props) {
  return (
    <div className="avatar-container">
      <div className="avatar-glow" />
      <svg viewBox="0 0 400 500" className="avatar-svg">
        {/* Body */}
        <g className="avatar-body">
          <ellipse cx="200" cy="280" rx="90" ry="120" fill="#4A90D9" />
          <circle cx="200" cy="180" r="65" fill="#FFD93D" />
        </g>
        {/* Eyes */}
        <g className={`avatar-eyes ${isThinking ? "thinking" : ""}`}>
          <ellipse cx="178" cy="175" rx="10" ry="12" fill="#333" />
          <ellipse cx="222" cy="175" rx="10" ry="12" fill="#333" />
          <circle cx="180" cy="172" r="3" fill="#fff" />
          <circle cx="224" cy="172" r="3" fill="#fff" />
        </g>
        {/* Mouth */}
        <g className="avatar-mouth">
          {viseme === "rest" && (
            <path d="M 185 210 Q 200 215 215 210" stroke="#333" strokeWidth="3" fill="none" />
          )}
          {viseme === "ah" && (
            <ellipse cx="200" cy="215" rx="15" ry="20" fill="#333" />
          )}
          {viseme === "ee" && (
            <path d="M 185 205 L 190 210 L 200 208 L 210 210 L 215 205" stroke="#333" strokeWidth="2" fill="none" />
          )}
          {viseme === "ih" && (
            <path d="M 185 210 Q 195 218 205 212 Q 210 208 215 210" stroke="#333" strokeWidth="2" fill="none" />
          )}
          {viseme === "oh" && (
            <circle cx="200" cy="212" r="10" fill="#333" />
          )}
          {viseme === "oo" && (
            <circle cx="200" cy="212" r="6" fill="#333" />
          )}
        </g>
      </svg>
      {isThinking && <div className="status-label">思考中...</div>}
      {isSpeaking && <div className="status-label">讲解中...</div>}
    </div>
  );
}
