import { useState, useRef } from 'react';
import { apiUrl } from '../lib/api';
import type { Attachment } from '../types';

export const ATTACHABLE_EXT = /\.(txt|md|markdown|csv|json|log|rtf|html?|xml|ya?ml)$/i;
export const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i;
export const MAX_ATTACH_CHARS = 20000;        // per plain-text file (matches backend extract cap)
export const MAX_ATTACH_TEXT_CHARS = 24000;   // combined attachment_text cap (matches backend)
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Custom hook for handling file attachments.
 */
export function useAttachments() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachIdRef = useRef<number>(0);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const handleAttachClick = () => fileInputRef.current?.click();

  /**
   * Extracts text content from a file by uploading it to the backend.
   */
  const extractViaBackend = async (file: File): Promise<{ content?: string; truncated?: boolean }> => {
    const token = localStorage.getItem('nyayaai_token');
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(apiUrl('/extract'), {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Could not process this file');
    return { content: data.text, truncated: data.truncated };
  };

  /**
   * Reads an image file and converts it to a base64 string.
   */
  const readImageAsBase64 = (file: File): Promise<{ imageData: string; imageMime: string; dataUrl: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const [meta, b64] = result.split(',');
        const mimeMatch = meta.match(/data:(.*?);base64/);
        resolve({
          imageData: b64,
          imageMime: mimeMatch ? mimeMatch[1] : file.type || 'image/png',
          dataUrl: result,
        });
      };
      reader.onerror = () => reject(new Error('Could not read image'));
      reader.readAsDataURL(file);
    });

  /**
   * Handles file selection and updates the attachments state.
   */
  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = ''; // allow re-selecting the same file later
    for (const file of files) {
      const id = ++attachIdRef.current;
      const isImage = IMAGE_EXT.test(file.name) || (file.type || '').startsWith('image/');
      setAttachments((prev) => [...prev, { id, name: file.name, loading: true, isImage }]);
      try {
        let result: Partial<Attachment> = {};
        if (isImage) {
          // Screenshots / photos: sent to a vision model as base64.
          if (file.size > MAX_IMAGE_BYTES) throw new Error('Image too large (max 5 MB)');
          const imgData = await readImageAsBase64(file);
          result = { isImage: true, ...imgData };
        } else if (ATTACHABLE_EXT.test(file.name)) {
          // Plain text: read directly in the browser (no round-trip).
          const text = await file.text();
          result = { content: text.slice(0, MAX_ATTACH_CHARS), truncated: text.length > MAX_ATTACH_CHARS };
        } else {
          // PDF / DOCX / etc.: extract text on the server.
          result = await extractViaBackend(file);
        }
        setAttachments((prev) => prev.map((a) => (a.id === id ? { id, name: file.name, ...result, loading: false } : a)));
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to read file';
        setAttachments((prev) =>
          prev.map((a) => (a.id === id ? { id, name: file.name, error: errorMsg, loading: false } : a))
        );
      }
    }
  };

  /**
   * Removes an attachment by ID.
   */
  const removeAttachment = (id: number | string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  return {
    attachments,
    setAttachments,
    fileInputRef,
    attachIdRef,
    handleAttachClick,
    handleFilesSelected,
    removeAttachment,
    extractViaBackend,
    readImageAsBase64,
  };
}
