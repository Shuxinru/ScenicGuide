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
  const { isListening, transcript, interimTranscript, error: voiceError, start: startListen, stop: stopListen, clearTranscript, supported: voiceSupported } = useSpeechRecognition();
  const { isSpeaking, playState, activeMessageId, speak, pause, resume, stop: stopSpeak, supported: ttsSupported } = useSpeechSynthesis();
  const { mouthOpen, expression, setMouthByChar, startSpeaking, stopSpeaking, setEmotion } = useLive2D();

  // Handle voice toggle
  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListen();
    } else {
      startListen();
    }
  }, [isListening, startListen, stopListen]);

  // Handle sending messages (text or voice) — no longer auto-speaks
  const handleSend = useCallback(
    async (text: string) => {
      stopSpeak();
      clearTranscript();
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
    },
    [sendMessage, stopSpeak, clearTranscript, setEmotion]
  );

  // Handle per-message voice playback
  const handlePlay = useCallback(
    (messageId: string, content: string) => {
      startSpeaking();
      setEmotion("happy");
      speak(content, messageId, (charIndex: number) => {
        setMouthByChar(charIndex);
      });
    },
    [speak, startSpeaking, setMouthByChar, setEmotion]
  );

  const handlePause = useCallback(() => {
    pause();
    stopSpeaking();
  }, [pause, stopSpeaking]);

  const handleResume = useCallback(() => {
    resume();
    startSpeaking();
  }, [resume, startSpeaking]);

  const handleStop = useCallback(() => {
    stopSpeak();
    stopSpeaking();
  }, [stopSpeak, stopSpeaking]);

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

  const playback = {
    isSpeaking,
    playState,
    activeMessageId,
    onPlay: handlePlay,
    onPause: handlePause,
    onResume: handleResume,
    onStop: handleStop,
  };

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
          playback={playback}
        />
      </div>
    </div>
  );
}
