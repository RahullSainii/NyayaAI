import { ChangeEvent, KeyboardEvent, RefObject } from 'react';
import { FileText, Image, Loader2, Mic, MicOff, Paperclip, Send, X } from 'lucide-react';
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

/** Show the counter only once length is worth knowing about. */
const CHAR_COUNT_THRESHOLD = 400;

/**
 * The composer owns the whole footer region: its own border, padding and reading
 * measure. Previously the chat page wrapped it in a second padded, gradient
 * container, so the composer sat inside two competing shells and the disclaimer
 * was rendered twice.
 */
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

  const hasPayload = attachments.some((a) => a.content || a.imageData);
  const isProcessing = attachments.some((a) => a.loading);
  const canSend = Boolean(input.trim() || hasPayload) && !isLoading && !isProcessing;

  return (
    <div className="shrink-0 border-t border-line bg-ink px-4 pb-3 pt-3 md:px-6">
      <div className="mx-auto w-full max-w-[46rem]">
        {attachments.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((a) => (
              <li
                key={a.id}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[0.75rem] ${
                  a.error
                    ? 'bg-danger/8 text-danger ring-1 ring-inset ring-danger/25'
                    : 'bg-surface-2 text-fg-muted ring-1 ring-inset ring-line'
                }`}
              >
                {a.isImage && a.dataUrl ? (
                  <img src={a.dataUrl} alt="" className="h-5 w-5 rounded object-cover" />
                ) : a.loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : a.isImage ? (
                  <Image className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                )}

                <span className="max-w-[11rem] truncate">{a.name}</span>
                {a.loading && <span className="text-fg-subtle">reading…</span>}
                {a.truncated && <span className="text-fg-subtle">truncated</span>}
                {a.error && <span className="max-w-[13rem] truncate">— {a.error}</span>}

                {!a.loading && (
                  <button
                    onClick={() => removeAttachment(a.id)}
                    aria-label={`Remove ${a.name}`}
                    className="rounded text-fg-subtle transition-colors hover:text-fg"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-end gap-1 rounded-lg bg-surface p-1.5 shadow-[inset_0_0_0_1px_var(--color-line)] transition-shadow duration-150 focus-within:shadow-[inset_0_0_0_1px_var(--color-gold),0_0_0_3px_rgba(217,169,74,0.14)]">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md,.markdown,.csv,.json,.log,.rtf,.html,.htm,.xml,.yaml,.yml,text/*,image/*,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tiff"
            className="hidden"
            onChange={handleFilesSelected}
            tabIndex={-1}
          />

          <button
            type="button"
            onClick={handleAttachClick}
            disabled={isLoading}
            aria-label="Attach a document or image"
            className="btn btn-ghost btn-sm btn-icon"
          >
            <Paperclip className="h-4 w-4" aria-hidden="true" />
          </button>

          <label htmlFor="chat-input" className="sr-only">
            Your question
          </label>
          <textarea
            id="chat-input"
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about a section, a procedure, or something you've received…"
            className="max-h-[9rem] min-h-[2.125rem] w-full resize-none self-center bg-transparent px-1.5 py-1.5 text-[0.9375rem] leading-6 text-fg placeholder:text-fg-subtle focus:outline-none"
          />

          <div className="flex shrink-0 items-center gap-1">
            {input.length > CHAR_COUNT_THRESHOLD && (
              <span className="t-mono mr-1 text-fg-subtle">{input.length}</span>
            )}

            {!recordingNotSupported && (
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isLoading}
                aria-pressed={isRecording}
                aria-label={isRecording ? 'Stop dictation' : 'Dictate your question'}
                className={`btn btn-sm btn-icon ${isRecording ? 'btn-danger' : 'btn-ghost'}`}
              >
                {isRecording ? (
                  <MicOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Mic className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              aria-label="Send question"
              className="btn btn-primary btn-sm btn-icon"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[0.6875rem] text-fg-subtle">
          <span className="hidden items-center gap-1 sm:inline-flex">
            <kbd className="kbd">Enter</kbd> to send
            <span className="mx-0.5 text-line-2">·</span>
            <kbd className="kbd">Shift</kbd>
            <kbd className="kbd">Enter</kbd> for a new line
          </span>
          <span>Answers can be wrong — check them against the cited provisions.</span>
        </p>
      </div>
    </div>
  );
}
