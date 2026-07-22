import type { SlotLockState } from '@gpnow/types';
import type { Env } from '../env';

interface LockCommand {
  type: 'LOCK' | 'RELEASE';
  slotId: string;
  userId?: string;
  ttlSeconds?: number;
}

export class SlotLockDO implements DurableObject {
  private readonly clients = new Set<WebSocket>();
  private readonly locks = new Map<string, SlotLockState>();

  constructor(private readonly state: DurableObjectState, _env: Env) {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return Response.json({ error: 'WebSocket upgrade required' }, { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    this.clients.add(server);

    server.addEventListener('message', (event) => {
      void this.handleMessage(server, event as MessageEvent<string>);
    });
    server.addEventListener('close', () => this.clients.delete(server));
    server.addEventListener('error', () => this.clients.delete(server));
    server.send(JSON.stringify({ type: 'CONNECTED', locks: [...this.locks.values()] }));

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleMessage(source: WebSocket, event: MessageEvent<string>) {
    try {
      const command = JSON.parse(event.data) as Partial<LockCommand>;
      if ((command.type !== 'LOCK' && command.type !== 'RELEASE') || !command.slotId) {
        source.send(JSON.stringify({ type: 'ERROR', message: 'Invalid slot lock command' }));
        return;
      }

      if (command.type === 'RELEASE') {
        this.locks.delete(command.slotId);
      } else {
        const current = this.locks.get(command.slotId);
        if (current && current.status === 'LOCKED' && current.expiresAt && new Date(current.expiresAt) > new Date()) {
          source.send(JSON.stringify({ type: 'LOCK_REJECTED', state: current }));
          return;
        }
        const expiresAt = new Date(Date.now() + (command.ttlSeconds ?? 600) * 1000).toISOString();
        this.locks.set(command.slotId, {
          slotId: command.slotId,
          status: 'LOCKED',
          lockedBy: command.userId ?? 'anonymous',
          expiresAt
        });
      }

      await this.state.storage.put('locks', [...this.locks.entries()]);
      this.broadcast({ type: 'LOCK_STATE', locks: [...this.locks.values()] });
    } catch {
      source.send(JSON.stringify({ type: 'ERROR', message: 'Could not process slot lock command' }));
    }
  }

  private broadcast(message: unknown) {
    const payload = JSON.stringify(message);
    this.clients.forEach((client) => client.send(payload));
  }
}
