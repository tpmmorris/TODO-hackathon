interface CallsAnswer {
  type: RTCSdpType;
  sdp: string;
}

/**
 * Thin browser-side WebRTC publisher. The signaling endpoint should be a
 * Worker/API proxy that creates the Cloudflare Calls session and returns its SDP answer.
 */
export class CloudflareCallsAudioClient {
  private connection: RTCPeerConnection | null = null;
  private readonly signalingUrl = import.meta.env.VITE_CALLS_SIGNALING_URL as string | undefined;

  async publish(stream: MediaStream): Promise<boolean> {
    if (!this.signalingUrl) return false;

    try {
      this.connection = new RTCPeerConnection();
      stream.getAudioTracks().forEach((track) => this.connection?.addTrack(track, stream));
      const offer = await this.connection.createOffer();
      await this.connection.setLocalDescription(offer);
      const response = await fetch(this.signalingUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionDescription: this.connection.localDescription })
      });
      if (!response.ok) throw new Error(`Calls signaling returned ${response.status}`);
      const answer = (await response.json()) as CallsAnswer;
      await this.connection.setRemoteDescription(answer);
      return true;
    } catch {
      this.connection?.close();
      this.connection = null;
      return false;
    }
  }

  stop() {
    this.connection?.getSenders().forEach((sender) => sender.track?.stop());
    this.connection?.close();
    this.connection = null;
  }
}
