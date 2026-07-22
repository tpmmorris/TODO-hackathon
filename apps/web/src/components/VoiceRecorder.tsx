import { useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { transcribeAudio } from '../services/api';

interface VoiceRecorderProps {
  patientId: string;
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
}

type RecorderStatus = 'idle' | 'recording' | 'processing' | 'error';

/** Browser microphone capture and Workers AI Whisper transcription boundary. */
export function VoiceRecorder({ patientId, onTranscript, onError }: VoiceRecorderProps) {
  const { lang } = useI18n();
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [message, setMessage] = useState('Use your voice instead');
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  async function processRecording(audioRecorder: MediaRecorder, audioStream: MediaStream) {
    const audio = new Blob(chunks.current, { type: audioRecorder.mimeType || 'audio/webm' });
    audioStream.getTracks().forEach((track) => track.stop());
    stream.current = null;
    recorder.current = null;
    if (audio.size === 0) throw new Error('No audio was captured from the microphone');
    setMessage('Processing your symptoms...');
    const transcript = await transcribeAudio(audio, patientId, lang);
    onTranscript(transcript);
    setStatus('idle');
      setMessage('Your words were added to symptoms');
  }

  function fail(error: unknown) {
    const message = error instanceof Error ? error.message : 'Voice transcription failed';
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    recorder.current = null;
    setStatus('error');
    setMessage(message);
    onError(message);
  }

  async function toggleRecording() {
    if (status === 'recording') {
      const activeRecorder = recorder.current;
      if (!activeRecorder || activeRecorder.state !== 'recording' || !stream.current) {
        fail(new Error('Voice recording session is not active'));
        return;
      }
      setStatus('processing');
      setMessage('Finishing voice recording...');
      activeRecorder.stop();
      return;
    }

    if (status === 'processing') {
      return;
    }

    let nextStream: MediaStream | null = null;
    try {
      setMessage('Requesting microphone access...');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser does not support microphone capture');
      if (typeof MediaRecorder === 'undefined') throw new Error('This browser does not support audio recording');
      nextStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMessage('Recording symptoms...');
      const nextRecorder = new MediaRecorder(nextStream);
      const activeStream = nextStream;
      chunks.current = [];
      nextRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      });
      nextRecorder.addEventListener('stop', () => {
        void processRecording(nextRecorder, activeStream).catch(fail);
      });
      nextRecorder.start();
      stream.current = nextStream;
      recorder.current = nextRecorder;
      setStatus('recording');
      setMessage('Recording symptoms; speak now');
    } catch (error) {
      nextStream?.getTracks().forEach((track) => track.stop());
      const message = error instanceof Error ? error.message : 'Voice transcription failed';
      setStatus('error');
      setMessage(message);
      onError(message);
    }
  }

  return (
    <div className={`voice-recorder ${status}`}>
      <button className="voice-button" type="button" onClick={toggleRecording} disabled={status === 'processing'} aria-label="Record symptoms for transcription">
        <span className="voice-icon">{status === 'recording' ? '■' : '●'}</span>
      </button>
      <div>
        <strong>{status === 'recording' ? 'Recording symptoms' : status === 'processing' ? 'Processing symptoms' : 'Voice input'}</strong>
        <span>{message}</span>
      </div>
    </div>
  );
}
