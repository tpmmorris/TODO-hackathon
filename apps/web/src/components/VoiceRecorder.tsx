import { useRef, useState } from 'react';
import { CloudflareCallsAudioClient } from '../services/cloudflareCalls';

interface VoiceRecorderProps {
  onError: (message: string) => void;
}

type RecorderStatus = 'idle' | 'connecting' | 'recording' | 'error';

/** Browser microphone and Cloudflare Calls signaling boundary. */
export function VoiceRecorder({ onError }: VoiceRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [message, setMessage] = useState('Start a secure live audio session');
  const stream = useRef<MediaStream | null>(null);
  const callsClient = useRef<CloudflareCallsAudioClient | null>(null);

  async function toggleRecording() {
    if (status === 'recording') {
      callsClient.current?.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      callsClient.current = null;
      setStatus('idle');
      setMessage('Voice session ended. Describe symptoms in the text box.');
      return;
    }

    if (status === 'connecting') {
      return;
    }

    let nextStream: MediaStream | null = null;
    let nextClient: CloudflareCallsAudioClient | null = null;
    try {
      setStatus('connecting');
      setMessage('Requesting microphone access...');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser does not support microphone capture');
      nextStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMessage('Connecting to Cloudflare Calls...');
      nextClient = new CloudflareCallsAudioClient();
      await nextClient.publish(nextStream);
      stream.current = nextStream;
      callsClient.current = nextClient;
      setStatus('recording');
      setMessage('Cloudflare Calls live audio connected');
    } catch (error) {
      nextStream?.getTracks().forEach((track) => track.stop());
      nextClient?.stop();
      callsClient.current?.stop();
      callsClient.current = null;
      const message = error instanceof Error ? error.message : 'Cloudflare Calls voice session failed';
      setStatus('error');
      setMessage(message);
      onError(message);
    }
  }

  return (
    <div className={`voice-recorder ${status}`}>
      <button className="voice-button" type="button" onClick={toggleRecording} disabled={status === 'connecting'} aria-label="Start Cloudflare Calls voice session">
        <span className="voice-icon">{status === 'recording' ? '■' : '●'}</span>
      </button>
      <div>
        <strong>{status === 'recording' ? 'Live voice session' : 'Cloudflare Calls'}</strong>
        <span>{message}</span>
      </div>
    </div>
  );
}
