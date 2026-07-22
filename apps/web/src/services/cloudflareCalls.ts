interface CallsAnswer {
  type: RTCSdpType;
  sdp: string;
}

interface IceServersResponse {
  iceServers?: unknown;
}

/**
 * Thin browser-side WebRTC publisher. The signaling endpoint should be a
 * Worker/API proxy that creates the Cloudflare Calls session and returns its SDP answer.
 */
export class CloudflareCallsAudioClient {
  private connection: RTCPeerConnection | null = null;
  private readonly signalingUrl: string;
  private readonly iceServersUrl: string;

  constructor() {
    const signalingUrl = import.meta.env.VITE_CALLS_SIGNALING_URL;
    const iceServersUrl = import.meta.env.VITE_CALLS_ICE_SERVERS_URL;
    if (!signalingUrl) throw new Error('VITE_CALLS_SIGNALING_URL must be configured for voice triage');
    if (!iceServersUrl) throw new Error('VITE_CALLS_ICE_SERVERS_URL must be configured for voice triage');
    this.signalingUrl = signalingUrl;
    this.iceServersUrl = iceServersUrl;
  }

  async publish(stream: MediaStream): Promise<void> {
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) throw new Error('No microphone audio track was captured');
    if (this.connection) throw new Error('A Cloudflare Calls session is already active');

    const connection = new RTCPeerConnection({ iceServers: await this.getIceServers() });
    this.connection = connection;
    audioTracks.forEach((track) => connection.addTrack(track, stream));
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    await this.waitForIceGathering(connection);

    const localDescription = connection.localDescription;
    if (!localDescription) throw new Error('WebRTC did not produce a local session description');
    const mid = connection.getTransceivers()[0]?.mid;
    if (!mid) throw new Error('WebRTC did not assign an audio track mid');
    const response = await fetch(this.signalingUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sessionDescription: localDescription,
        mid
      })
    });
    if (!response.ok) throw new Error(`Calls signaling returned ${response.status}`);
    const answer = (await response.json()) as Partial<CallsAnswer>;
    if (answer.type !== 'answer' || typeof answer.sdp !== 'string') {
      throw new Error('Calls signaling returned an invalid SDP answer');
    }
    await connection.setRemoteDescription({ type: answer.type, sdp: answer.sdp });
    await this.waitForConnection(connection);
  }

  private async getIceServers(): Promise<RTCIceServer[]> {
    const response = await fetch(this.iceServersUrl);
    if (!response.ok) throw new Error(`TURN credential endpoint returned ${response.status}`);
    const payload = (await response.json()) as IceServersResponse;
    if (!Array.isArray(payload.iceServers) || payload.iceServers.length === 0) {
      throw new Error('TURN credential endpoint returned no ICE servers');
    }

    return payload.iceServers.map((value, index) => {
      if (!value || typeof value !== 'object') throw new Error(`ICE server ${index} is invalid`);
      const server = value as { urls?: unknown; username?: unknown; credential?: unknown };
      const urls = Array.isArray(server.urls)
        ? server.urls.filter((url): url is string => typeof url === 'string' && !url.includes(':53'))
        : typeof server.urls === 'string' && !server.urls.includes(':53')
          ? [server.urls]
          : [];
      if (urls.length === 0) throw new Error(`ICE server ${index} has no usable URLs`);
      return {
        urls,
        ...(typeof server.username === 'string' ? { username: server.username } : {}),
        ...(typeof server.credential === 'string' ? { credential: server.credential } : {})
      };
    });
  }

  private waitForIceGathering(connection: RTCPeerConnection): Promise<void> {
    if (connection.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve, reject) => {
      let lastIceError = '';
      const timeout = window.setTimeout(() => {
        connection.removeEventListener('icegatheringstatechange', onStateChange);
        connection.removeEventListener('icecandidateerror', onIceError);
        reject(new Error(lastIceError || 'Timed out while gathering WebRTC network candidates'));
      }, 30_000);
      const onStateChange = () => {
        if (connection.iceGatheringState !== 'complete') return;
        window.clearTimeout(timeout);
        connection.removeEventListener('icegatheringstatechange', onStateChange);
        connection.removeEventListener('icecandidateerror', onIceError);
        resolve();
      };
      const onIceError = (event: RTCPeerConnectionIceErrorEvent) => {
        // One STUN/TURN server can fail while another configured ICE server succeeds.
        // The connection state below is the authoritative failure signal.
        lastIceError = `ICE server candidate gathering failed (${event.errorCode}: ${event.errorText})`;
      };
      connection.addEventListener('icegatheringstatechange', onStateChange);
      connection.addEventListener('icecandidateerror', onIceError);
    });
  }

  private waitForConnection(connection: RTCPeerConnection): Promise<void> {
    if (connection.connectionState === 'connected') return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        connection.removeEventListener('connectionstatechange', onStateChange);
        reject(new Error('Timed out while connecting to Cloudflare Realtime'));
      }, 15_000);
      const onStateChange = () => {
        if (connection.connectionState === 'connected') {
          window.clearTimeout(timeout);
          connection.removeEventListener('connectionstatechange', onStateChange);
          resolve();
          return;
        }
        if (connection.connectionState === 'failed' || connection.connectionState === 'closed' || connection.connectionState === 'disconnected') {
          window.clearTimeout(timeout);
          connection.removeEventListener('connectionstatechange', onStateChange);
          reject(new Error(`Cloudflare Realtime connection ${connection.connectionState}`));
        }
      };
      connection.addEventListener('connectionstatechange', onStateChange);
    });
  }

  stop() {
    this.connection?.close();
    this.connection = null;
  }
}
