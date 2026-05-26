import { useState, useCallback, useEffect } from "react";
import DigitalHumanPanel from "../DigitalHuman/DigitalHumanPanel";
import ChatPanel from "../Chat/ChatPanel";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "../../hooks/useSpeechSynthesis";
import { useLive2D } from "../../hooks/useLive2D";
import { useChat } from "../../hooks/useChat";
import { chatStore } from "../../store/chatStore";

export default function UserLayout() {
  const [interests, setInterests] = useState<string[]>([]);

  const { messages, isThinking, sendMessage } = useChat();
  const { isListening, transcript, interimTranscript, error: voiceError, start: startListen, stop: stopListen, supported: voiceSupported } = useSpeechRecognition();
  const { isSpeaking, speak, stop: stopSpeak, supported: ttsSupported } = useSpeechSynthesis();
  const { mouthOpen, expression, setMouthByChar, startSpeaking, stopSpeaking, setEmotion } = useLive2D();

  // Handle voice toggle
  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListen();
    } else {
      startListen();
    }
  }, [isListening, startListen, stopListen]);

  // Handle sending messages (text or voice)
  const handleSend = useCallback(
    async (text: string) => {
      stopSpeak();
      const convId = chatStore.getState().conversationId;

      const result = await sendMessage(text, convId);
      if (!result) return;

      if (!convId) {
        chatStore.getState().setConversationId(result.conversationId);
      }

      // Determine emotion based on response
      const content = result.content;
      if (content.includes("欢迎") || content.includes("高兴")) {
        setEmotion("happy");
      } else if (content.includes("抱歉") || content.includes("对不起")) {
        setEmotion("sorry");
      }

      // Speak the response
      if (ttsSupported) {
        startSpeaking();
        speak(content, (charIndex) => {
          setMouthByChar(charIndex);
        });
      }
    },
    [sendMessage, speak, stopSpeak, startSpeaking, setMouthByChar, setEmotion, ttsSupported]
  );

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      stopSpeak();
      stopSpeaking();
    };
  }, [stopSpeak, stopSpeaking]);

  // Update mouth open when speech ends
  useEffect(() => {
    if (!isSpeaking) {
      stopSpeaking();
    }
  }, [isSpeaking, stopSpeaking]);

  return (
    <div className="user-layout">
      <div className="avatar-section">
        <DigitalHumanPanel
          isSpeaking={isSpeaking}
          isThinking={isThinking}
          isListening={isListening}
          mouthOpen={mouthOpen}
          expression={expression}
        />
      </div>
      <div className="chat-section">
        <ChatPanel
          messages={messages}
          isThinking={isThinking}
          onSend={handleSend}
          interests={interests}
          onInterestsChange={setInterests}
          isListening={isListening}
          transcript={transcript}
          interimTranscript={interimTranscript}
          onMicToggle={handleMicToggle}
          voiceSupported={voiceSupported}
          voiceError={voiceError}
        />
      </div>
    </div>
  );
}
