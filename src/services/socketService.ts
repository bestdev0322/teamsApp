import { io, Socket } from 'socket.io-client';
import { SocketEvent, SocketMessage } from '../types/socket';
import { authService } from './authService';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private reconnectDelay = 3000; // 3 seconds
  private messageQueue: SocketMessage[] = [];
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      this.socket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        transports: ['websocket']
      });

      this.setupEventHandlers();
      this.processMessageQueue();
    } catch (error) {
      console.error('Socket initialization error:', error);
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      if (authService.isAuthenticated()) {
        this.reconnectAttempts = 0;
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }

        const token = authService.getToken();
        this.socket?.emit('authenticate', token);

        // Listen for authentication success/failure (optional, depending on backend)
        this.socket?.once('authenticated', () => {
          this.processMessageQueue(); // Process queued messages after authentication
        });

        this.socket?.once('unauthorized', (error) => {
          console.error('SocketService: Authentication failed:', error);
          this.handleDisconnect(); // Disconnect on auth failure
        });

      } else {
        this.handleDisconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('SocketService: Connection error:', error);
      this.handleDisconnect();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('SocketService: Disconnected. Reason:', reason);
      this.handleDisconnect();
    });

    // Handle incoming messages
    Object.values(SocketEvent).forEach(event => {
      this.socket?.on(event, (data: any) => {
        // console.log(`SocketService: Event ${event} received:`, data);
        this.notifyListeners(event, data);
      });
    });
  }

  private processMessageQueue(): void {
    if (!this.socket?.connected || this.messageQueue.length === 0) return;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.socket.emit(message.type, message.data);
      }
    }
  }

  private notifyListeners(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }

  public subscribe(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  public emit(event: string, data: any): void {
    const message: SocketMessage = {
      type: event,
      data,
      timestamp: new Date().toISOString()
    };

    if (!this.socket?.connected) {
      this.messageQueue.push(message);
      return;
    }

    this.socket.emit(event, message);
  }

  public disconnect(): void {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    this.socket?.disconnect();
    this.socket = null;
    this.listeners.clear();
  }

  public reconnect(): void {
    this.disconnect();
    this.initialize();
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    return 'connecting';
  }

  private handleDisconnect(): void {
    if (this.reconnectInterval) return; // Already trying to reconnect

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      this.reconnectAttempts++;
      this.reconnectInterval = setInterval(() => {
         this.reconnect();
      }, this.reconnectDelay);
    } else {
      console.error('SocketService: Max reconnect attempts reached. Giving up.');
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }
    }
  }

  public unsubscribe(event: string): void {
    this.listeners.get(event)?.clear();
  }
}

export const socketService = new SocketService(); 