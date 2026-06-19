import { useState, useCallback, useEffect } from "react";
import DigitalHumanPanel from "../DigitalHuman/DigitalHumanPanel";
import ChatPanel from "../Chat/ChatPanel";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "../../hooks/useSpeechSynthesis";
import { useLive2D } from "../../hooks/useLive2D";
import { useChat } from "../../hooks/useChat";
import { chatStore } from "../../store/chatStore";
import { getConversationMessages } from "../../api/tourist";
import apiClient from "../../api/client";
import type { Message } from "../../types/chat";

export default function UserLayout() {
  const [interests, setInterests] = useState<string[]>([]);
  const [clothingUrl, setClothingUrl] = useState<string | null>(null);
  const [voiceName, setVoiceName] = useState<string>("zh-CN-XiaoxiaoNeural");
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);
  const [voicePitch, setVoicePitch] = useState<number>(1.0);

  const { messages, isThinking, sendMessage, stopGeneration, clearMessages, setMessages } = useChat();
  const { isListening, transcript, interimTranscript, error: voiceError, start: startListen, stop: stopListen, clearTranscript, supported: voiceSupported } = useSpeechRecognition();
  const { isSpeaking, playState, activeMessageId, speak, pause, resume, stop: stopSpeak, supported: ttsSupported } = useSpeechSynthesis();
  const { mouthOpen, expression, setMouthByChar, startSpeaking, stopSpeaking, setEmotion } = useLive2D();

  const conversationId = chatStore((s) => s.conversationId);

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
      clearTranscript();
      const convId = chatStore.getState().conversationId;

      const result = await sendMessage(text, convId, interests);
      if (!result) return;

      if (!convId) {
        chatStore.getState().setConversationId(result.conversationId);
      }

      const content = result.content;
      if (content.includes("欢迎") || content.includes("高兴") || content.includes("感谢") || content.includes("谢谢") || content.includes("很棒")) {
        setEmotion("thankful");
      } else if (content.includes("抱歉") || content.includes("对不起") || content.includes("遗憾")) {
        setEmotion("sorry");
      } else if (content.includes("惊讶") || content.includes("不可思议") || content.includes("哇") || content.includes("太棒了") || content.includes("真的吗")) {
        setEmotion("surprised");
      }
    },
    [sendMessage, stopSpeak, clearTranscript, setEmotion, interests]
  );

  // New conversation
  const handleNewChat = useCallback(() => {
    stopSpeak();
    stopSpeaking();
    clearMessages();
    chatStore.getState().setConversationId("");
    setInterests([]);
  }, [stopSpeak, stopSpeaking, clearMessages]);

  // Load existing conversation
  const handleLoadConversation = useCallback(
    async (convId: string) => {
      stopSpeak();
      stopSpeaking();
      try {
        const data = await getConversationMessages(convId);
        const msgs: Message[] = (data.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources,
          created_at: m.created_at,
        }));
        setMessages(msgs);
        chatStore.getState().setConversationId(convId);
      } catch {
        // silently fail
      }
    },
    [stopSpeak, stopSpeaking, setMessages]
  );

  // Handle per-message voice playback
  const handlePlay = useCallback(
    (messageId: string, content: string) => {
      startSpeaking();
      setEmotion("happy");
      speak(content, messageId, (charIndex: number) => {
        setMouthByChar(charIndex, content);
      }, voiceName, voiceSpeed, voicePitch);
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

  useEffect(() => {
    return () => {
      stopSpeak();
      stopSpeaking();
    };
  }, [stopSpeak, stopSpeaking]);

  useEffect(() => {
    if (!isSpeaking) {
      stopSpeaking();
    }
  }, [isSpeaking, stopSpeaking]);

  // Fetch clothing URL from avatar config
  useEffect(() => {
    apiClient.get("/avatar/config").then((res) => {
      setClothingUrl(res.data.clothing_url || null);
      setVoiceName(res.data.voice_name || "zh-CN-XiaoxiaoNeural");
      setVoiceSpeed(res.data.voice_speed || 1.0);
      setVoicePitch(res.data.voice_pitch || 1.0);
    }).catch(() => {});
  }, []);

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
          clothingUrl={clothingUrl}
        />
      </div>
      <div className="chat-section">
        <ChatPanel
          messages={messages}
          isThinking={isThinking}
          conversationId={conversationId}
          onSend={handleSend}
          onStopGeneration={stopGeneration}
          onNewChat={handleNewChat}
          onLoadConversation={handleLoadConversation}
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
