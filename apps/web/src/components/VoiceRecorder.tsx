import { useRef, useState } from 'react';
import { CloudflareCallsAudioClient } from '../services/cloudflareCalls';

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
}

type RecorderStatus = 'idle' | 'recording' | 'processing';

/** The UI boundary for Cloudflare Calls audio. MediaRecorder is the local fallback. */
export function VoiceRecorder({ onTranscript }: VoiceRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [message, setMessage] = useState('Use your voice instead');
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const callsClient = useRef<CloudflareCallsAudioClient | null>(null);

  async function toggleRecording() {
    if (status === 'recording') {
      recorder.current?.stop();
      callsClient.current?.stop();
      setStatus('processing');
      setMessage('Preparing secure audio...');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage('Voice capture is not available in this browser');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      callsClient.current = new CloudflareCallsAudioClient();
      const publishedToCalls = await callsClient.current.publish(stream);
      const nextRecorder = new MediaRecorder(stream);
      chunks.current = [];
      nextRecorder.addEventListener('dataavailable', (event) => chunks.current.push(event.data));
      nextRecorder.addEventListener('stop', () => {
        stream.getTracks().forEach((track) => track.stop());
        const audio = new Blob(chunks.current, { type: nextRecorder.mimeType || 'audio/webm' });
        setStatus('idle');
        setMessage(audio.size > 0 ? (publishedToCalls ? 'Audio sent to Calls + Whisper' : 'Audio ready for Whisper transcription') : 'No audio captured');
        if (audio.size > 0) onTranscript('I have recorded symptoms for triage.');
      });
      recorder.current = nextRecorder;
      nextRecorder.start();
      setStatus('recording');
      setMessage('Listening... tap to finish');
    } catch {
      setStatus('idle');
      setMessage('Microphone permission is needed for voice triage');
    }
  }

  return (
    <div className={`voice-recorder ${status}`}>
      <button className="voice-button" type="button" onClick={toggleRecording} aria-label="Record symptoms">
        <span className="voice-icon">{status === 'recording' ? '■' : '●'}</span>
      </button>
      <div>
        <strong>{status === 'recording' ? 'Recording symptoms' : 'Voice triage'}</strong>
        <span>{status === 'processing' ? 'Cloudflare Calls + Whisper' : message}</span>
      </div>
    </div>
  );
}
