import { WSMessage, WSMessageType } from '../types';

type MessageHandler = (msg: WSMessage) => void;
type StatusHandler = (status: string) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string = '';
  private messageHandlers: Map<WSMessageType, MessageHandler[]> = new Map();
  private statusHandlers: StatusHandler[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pingStart: number = 0;
  private shouldReconnect: boolean = false;
  private reconnectDelay: number = 1000;
  private maxReconnectDelay: number = 30000;
  private reconnectAttempts: number = 0;
  private pendingMessages: string[] = [];

  connect(url: string): void {
    this.url = url;
    this.shouldReconnect = true;
    this._connect();
  }

  private _connect(): void {
    try {
      this.notifyStatus('connecting');
      this.ws = new WebSocket(this.url);
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (err) {
      console.error('[WS] Connection failed:', err);
      this.scheduleReconnect();
    }
  }

  private handleOpen(): void {
    console.log('[WS] Connected');
    this.reconnectDelay = 1000;
    this.reconnectAttempts = 0;
    this.notifyStatus('connected');
    this.startPing();

    // Flush pending messages
    while (this.pendingMessages.length > 0) {
      const msg = this.pendingMessages.shift();
      if (msg) this.ws?.send(msg);
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const msg: WSMessage = JSON.parse(event.data);

      if (msg.type === 'PONG') {
        const latency = Date.now() - this.pingStart;
        this.notifyStatus(`ping:${latency}`);
        return;
      }

      const handlers = this.messageHandlers.get(msg.type) || [];
      handlers.forEach(h => h(msg));

      // Also call wildcard handlers
      const wildcardHandlers = this.messageHandlers.get('*' as WSMessageType) || [];
      wildcardHandlers.forEach(h => h(msg));
    } catch (err) {
      console.error('[WS] Failed to parse message:', err);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('[WS] Closed:', event.code, event.reason);
    this.stopPing();
    this.notifyStatus('disconnected');

    if (this.shouldReconnect && event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event): void {
    console.error('[WS] Error:', event);
    this.notifyStatus('error');
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectAttempts++;
    this.notifyStatus('reconnecting');

    this.reconnectTimer = setTimeout(() => {
      if (this.shouldReconnect) {
        this._connect();
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
      }
    }, this.reconnectDelay);
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.pingStart = Date.now();
        this.ws.send(JSON.stringify({ type: 'PING', payload: {}, userId: '', roomId: '', timestamp: Date.now() }));
      }
    }, 10000);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  send<T>(message: Omit<WSMessage<T>, 'timestamp'>): void {
    const fullMessage: WSMessage<T> = {
      ...message,
      timestamp: Date.now(),
    };
    const data = JSON.stringify(fullMessage);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      // Queue non-critical messages or drop cursor updates
      if (message.type !== 'CURSOR_MOVE' && message.type !== 'PING') {
        this.pendingMessages.push(data);
      }
    }
  }

  on(type: WSMessageType | '*', handler: MessageHandler): () => void {
    const key = type as WSMessageType;
    if (!this.messageHandlers.has(key)) {
      this.messageHandlers.set(key, []);
    }
    this.messageHandlers.get(key)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(key) || [];
      this.messageHandlers.set(key, handlers.filter(h => h !== handler));
    };
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.push(handler);
    return () => {
      this.statusHandlers = this.statusHandlers.filter(h => h !== handler);
    };
  }

  private notifyStatus(status: string): void {
    this.statusHandlers.forEach(h => h(status));
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.stopPing();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.pendingMessages = [];
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get reconnectCount(): number {
    return this.reconnectAttempts;
  }
}

export const wsService = new WebSocketService();
export default wsService;
