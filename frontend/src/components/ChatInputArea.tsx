import { RefObject, ChangeEvent, KeyboardEvent } from 'react';
import { X, MicOff, Mic, Paperclip, Send, Image, FileText, Loader2 } from 'lucide-react';
import { Attachment } from '../types';
import { useChatStore } from '../store/useChatStore';

export interface ChatInputAreaProps {
  handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSend: () => void;
  attachments: Attachment[];
  handleAttachClick: () => void;
  handleFilesSelected: (event: ChangeEvent<HTMLInputElement>) => void;
  removeAttachment: (id: string | number) => void;
  isRecording: boolean;
  recordingNotSupported: boolean;
  toggleRecording: () => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
  fileInputRef: RefObject<HTMLInputElement>;
}

/** Character count threshold to show the counter */
const CHAR_COUNT_THRESHOLD = 200;

export default function ChatInputArea({
  handleKeyDown,
  handleSend,
  attachments,
  handleAttachClick,
  handleFilesSelected,
  removeAttachment,
  isRecording,
  recordingNotSupported,
  toggleRecording,
  textareaRef,
  fileInputRef,
}: ChatInputAreaProps) {
  const { input, setInput, isLoading } = useChatStore();

  const canSend =
    (input.trim() || attachments.some((a) => a.content || a.imageData)) &&
    !isLoading &&
    !attachments.some((a) => a.loading);

  return (
    <div className="z-20 flex w-full shrink-0 justify-center border-t border-glass-border bg-background/95 p-4 backdrop-blur-sm md:p-6">
      <div className="w-full max-w-[800px]">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a) => (
              <div
                key={a.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
                  a.error
                    ? 'border-red-500/30 bg-red-500/10 text-red-300'
                    : a.loading
                      ? 'border-glass-border bg-slate-800/60 text-on-surface-variant/70'
                      : 'border-glass-border bg-slate-800 text-on-surface-variant'
                }`}
              >
                {a.isImage && a.dataUrl ? (
                  <img src={a.dataUrl} alt="" className="h-6 w-6 rounded object-cover" />
                ) : a.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : a.error ? (
                  <FileText className="h-4 w-4 text-red-400" />
                ) : a.isImage ? (
                  <Image className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span className="max-w-[160px] truncate">{a.name}</span>
                {a.loading && <span className="text-on-surface-variant/60">processing…</span>}
                {a.truncated && <span className="text-on-surface-variant/60">(truncated)</span>}
                {a.error && <span className="max-w-[220px] truncate">— {a.error}</span>}
                {!a.loading && (
                  <button
                    onClick={() => removeAttachment(a.id)}
                    className="transition-colors hover:text-on-surface"
                    aria-label={`Remove ${a.name}`}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-end gap-2 overflow-hidden rounded-xl p-2 shadow-2xl transition-colors glass-panel group focus-within:border-secondary/50">
          <div className="pointer-events-none absolute inset-0 bg-secondary/5 opacity-0 blur-xl transition-opacity group-focus-within:opacity-100" />

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md,.markdown,.csv,.json,.log,.rtf,.html,.htm,.xml,.yaml,.yml,text/*,image/*,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tiff"
            className="hidden"
            onChange={handleFilesSelected}
            aria-hidden="true"
          />

          <button
            type="button"
            onClick={handleAttachClick}
            disabled={isLoading}
            title="Attach a file"
            aria-label="Attach a file"
            className="shrink-0 p-3 text-on-surface-variant transition-colors hover:text-secondary disabled:opacity-50"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            className="relative z-10 w-full min-h-[44px] max-h-[150px] resize-none border-none bg-transparent py-3 text-sm text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-0"
            placeholder="Draft a consultation query or cite a provision..."
            aria-label="Chat message input"
            rows={1}
          />

          <div className="relative z-10 flex shrink-0 items-center gap-1 pb-1 pr-1">
            {input.length > CHAR_COUNT_THRESHOLD && (
              <span className="mr-2 text-xs text-on-surface-variant">{input.length}</span>
            )}
            {!recordingNotSupported && (
              <button
                onClick={toggleRecording}
                disabled={isLoading}
                className={`rounded-lg p-2 transition-colors ${
                  isRecording
                    ? 'border border-red-500/30 bg-red-500/20 text-red-400'
                    : 'text-on-surface-variant hover:bg-white/5 hover:text-secondary'
                }`}
                aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="rounded-lg bg-secondary p-2 text-on-secondary shadow-lg transition-colors hover:bg-secondary-container disabled:bg-surface-variant disabled:text-on-surface-variant disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-3 text-center">
          <span className="text-[10px] text-on-surface-variant/50 font-label-caps">
            NyayaAI can make mistakes. Verify critical legal information.
          </span>
        </div>
      </div>
    </div>
  );
}
