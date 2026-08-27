import { apiUrl } from '../lib/api';
import type { ChatMessage } from '../types';
import { useChatStore } from '../store/useChatStore';

export const STREAMING_MESSAGE: ChatMessage = {
  role: 'ai',
  content: '',
  sources: [],
};

/**
 * Custom hook for handling SSE streaming replies from the assistant.
 */
export function useStreamingReply(
  messages: ChatMessage[],
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
) {
  const { isLoading, setIsLoading } = useChatStore();

  /**
   * Updates the final message in the chat that is currently streaming.
   */
  const updateStreamingMessage = (updater: (msg: ChatMessage) => ChatMessage) => {
    setMessages((prev) => {
      const next = [...prev];
      const lastMessage = next[next.length - 1];

      if (!lastMessage || lastMessage.role !== 'ai') {
        next.push({ ...STREAMING_MESSAGE });
      }

      next[next.length - 1] = updater(next[next.length - 1]);
      return next;
    });
  };

  /**
   * Build the recent conversation to send as context, skipping the canned
   * welcome greeting and any empty placeholders.
   */
  const buildHistory = (msgs: ChatMessage[]): Array<{ role: string; content: string }> =>
    msgs
      .filter((m) => !m.welcome && m.content && m.content.trim().length > 0)
      .slice(-6)
      .map((m) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content,
      }));

  /**
   * Streams the AI's response using an AbortController for cleanup.
   */
  const streamAssistantReply = async (
    query: string,
    history: Array<{ role: string; content: string }> = [],
    extra: {
      attachmentText?: string;
      attachmentName?: string;
      imageData?: string;
      imageMime?: string;
      imageName?: string;
    } = {}
  ) => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('nyayaai_token');
      const response = await fetch(apiUrl('/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: query.trim(),
          history,
          ...(extra.attachmentText
            ? { attachment_text: extra.attachmentText, attachment_name: extra.attachmentName }
            : {}),
          ...(extra.imageData
            ? { image_data: extra.imageData, image_mime: extra.imageMime, image_name: extra.imageName }
            : {}),
        }),
      });

      if (response.status === 401) {
        updateStreamingMessage(() => ({
          role: 'ai',
          content: 'Your session has expired or you are not signed in. Please log in again to continue.',
          sources: [],
        }));
        setIsLoading(false);
        return;
      }

      if (!response.ok || !response.body) {
        const errorText = await response.text().catch(() => '');
        throw new Error(errorText || `Chat request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamFinished = false;

      while (!streamFinished) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventChunk of events) {
          const payloadText = eventChunk
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim())
            .join('\n');

          if (!payloadText) continue;

          try {
            const payload = JSON.parse(payloadText);

            if (payload.type === 'token') {
              updateStreamingMessage((message) => ({
                ...message,
                content: `${message.content}${payload.content ?? ''}`,
              }));
              continue;
            }

            if (payload.type === 'citations') {
              updateStreamingMessage((message) => ({
                ...message,
                sources: payload.citations || [],
                sourceType: payload.source || 'kb',
                confidence: payload.confidence,
              }));
              continue;
            }

            if (payload.type === 'error') {
              throw new Error(payload.content || 'Streaming failed');
            }

            if (payload.type === 'done') {
              streamFinished = true;
              break;
            }
          } catch (err) {
            console.error('Error parsing SSE payload:', err);
            // Ignore incomplete JSON chunks or invalid parses if necessary
          }
        }
      }
    } catch {
      updateStreamingMessage(() => ({
        role: 'ai',
        content:
          'I apologise - something went wrong while processing your request. Please try again or rephrase your query.',
        sources: [],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Regenerates the last AI message.
   */
  const handleRegenerate = () => {
    if (isLoading) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    const priorMessages: ChatMessage[] = [];
    setMessages((prev) => {
      const next = [...prev];
      if (next.length > 0 && next[next.length - 1].role === 'ai') {
        next.pop();
      }
      // History for regeneration excludes the last user message we're answering.
      priorMessages.push(...next.slice(0, -1));
      return next;
    });

    streamAssistantReply(lastUserMsg.content, buildHistory(priorMessages));
  };

  return {
    streamAssistantReply,
    buildHistory,
    handleRegenerate,
  };
}
