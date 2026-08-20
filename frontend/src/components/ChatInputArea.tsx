import { RefObject, ChangeEvent, KeyboardEvent } from 'react';
import { X, MicOff } from 'lucide-react';
import { Attachment } from '../types';

export interface ChatInputAreaProps {
  input: string;
  setInput: (value: string) => void;
  handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSend: () => void;
  isLoading: boolean;
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

export default function ChatInputArea({
  input,
  setInput,
  handleKeyDown,
  handleSend,
  isLoading,
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
  return (
    <div className="w-full p-4 md:p-6 bg-[#020617]/95 backdrop-blur-sm border-t border-glass-border flex justify-center shrink-0 z-20">
      <div className="w-full max-w-[800px]">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((a) => (
              <div
                key={a.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${
                  a.error
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : a.loading
                      ? 'bg-slate-800/60 border-glass-border text-on-surface-variant/70'
                      : 'bg-slate-800 border-glass-border text-on-surface-variant'
                }`}
              >
                {a.isImage && a.dataUrl ? (
                  <img src={a.dataUrl} alt="" className="w-6 h-6 rounded object-cover" />
                ) : (
                  <span className={`material-symbols-outlined text-sm ${a.loading ? 'animate-spin' : ''}`}>
                    {a.loading ? 'progress_activity' : a.error ? 'error' : a.isImage ? 'image' : 'description'}
                  </span>
                )}
                <span className="truncate max-w-[160px]">{a.name}</span>
                {a.loading && <span className="text-on-surface-variant/60">processing…</span>}
                {a.truncated && <span className="text-on-surface-variant/60">(truncated)</span>}
                {a.error && <span className="truncate max-w-[220px]">— {a.error}</span>}
                {!a.loading && (
                  <button
                    onClick={() => removeAttachment(a.id)}
                    className="hover:text-on-surface transition-colors"
                    aria-label={`Remove ${a.name}`}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="glass-panel rounded-xl p-2 flex items-end gap-2 shadow-2xl relative overflow-hidden group focus-within:border-secondary/50 transition-colors">
          <div className="absolute inset-0 bg-secondary/5 blur-xl pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity"></div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md,.markdown,.csv,.json,.log,.rtf,.html,.htm,.xml,.yaml,.yml,text/*,image/*,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tiff"
            className="hidden"
            onChange={handleFilesSelected}
          />
          <button
            type="button"
            onClick={handleAttachClick}
            disabled={isLoading}
            title="Attach a text document"
            aria-label="Attach a text document"
            className="p-3 text-on-surface-variant hover:text-secondary transition-colors shrink-0 disabled:opacity-50"
          >
            <span className="material-symbols-outlined">attach_file</span>
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none focus:ring-0 text-on-surface placeholder-on-surface-variant resize-none max-h-[150px] min-h-[44px] py-3 text-sm focus:outline-none z-10 relative"
            placeholder="Draft a consultation query or cite a provision..."
            rows={1}
          />

          <div className="flex gap-1 shrink-0 pb-1 pr-1 z-10 relative items-center">
            {input.length > 200 && (
              <span className="text-xs text-on-surface-variant mr-2">
                {input.length}
              </span>
            )}
            {!recordingNotSupported && (
              <button
                onClick={toggleRecording}
                disabled={isLoading}
                className={`p-2 transition-colors rounded-lg ${
                  isRecording
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'text-on-surface-variant hover:text-secondary hover:bg-white/5'
                }`}
                aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
              >
                {isRecording ? <MicOff size={18} /> : <span className="material-symbols-outlined">mic</span>}
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={(!input.trim() && attachments.filter((a) => a.content || a.imageData).length === 0) || isLoading || attachments.some((a) => a.loading)}
              className="p-2 bg-secondary text-on-secondary rounded-lg hover:bg-secondary-container transition-colors shadow-lg disabled:opacity-50 disabled:bg-surface-variant disabled:text-on-surface-variant"
              aria-label="Send message"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
            </button>
          </div>
        </div>
        <div className="text-center mt-3">
          <span className="font-label-caps text-[10px] text-on-surface-variant/50">NyayaAI can make mistakes. Verify critical legal information.</span>
        </div>
      </div>
    </div>
  );
}
