import { useState, useEffect, useRef } from 'react';

export interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  readonly isFinal: boolean;
}

export interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

/**
 * Custom hook for capturing speech input via the browser's Web Speech API.
 */
export function useSpeechInput(
  input: string,
  setInput: React.Dispatch<React.SetStateAction<string>>
) {
  const recognitionRef = useRef<any>(null);
  const speechBaseRef = useRef<string>('');
  const finalTranscriptRef = useRef<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingNotSupported, setRecordingNotSupported] = useState<boolean>(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecordingNotSupported(true);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += transcript;
        } else {
          interim += transcript;
        }
      }
      const base = speechBaseRef.current;
      const spoken = `${finalTranscriptRef.current}${interim}`.trim();
      const joined = base ? (spoken ? `${base} ${spoken}` : base) : spoken;
      setInput(joined);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      // Commit final transcript into base so subsequent recordings append cleanly
      const base = speechBaseRef.current;
      const finalized = finalTranscriptRef.current.trim();
      if (finalized) {
        speechBaseRef.current = base ? `${base} ${finalized}` : finalized;
      }
      finalTranscriptRef.current = '';
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [setInput]);

  /**
   * Toggles speech recording on or off.
   */
  const toggleRecording = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      // Snapshot whatever the user has typed so speech results are appended,
      // not duplicated onto the previous recording.
      speechBaseRef.current = input.trim();
      finalTranscriptRef.current = '';
      try {
        recognition.start();
        setIsRecording(true);
      } catch (err) {
        console.warn('Could not start speech recognition:', err);
      }
    }
  };

  return {
    isRecording,
    recordingNotSupported,
    toggleRecording,
    speechBaseRef,
    finalTranscriptRef,
  };
}
