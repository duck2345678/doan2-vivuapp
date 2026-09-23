import {
  Client,
  IMessage,
  StompConfig,
  type StompHeaders,
} from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type {
  StompSubscription,
  WebSocketConfig,
  WebSocketMessage,
} from "./types";

/**
 * Error rate limiter to prevent spam logging
 */
class ErrorRateLimiter {
  private lastErrorTime = 0;
  private lastErrorMessage = "";
  private errorCount = 0;
  private readonly minIntervalMs = 10000; // 10 seconds minimum between same error logs

  /**
   * Check if we should log this error
   * Returns true if enough time has passed or error message is different
   */
  shouldLog(errorMessage: string): boolean {
    const now = Date.now();
    const isDifferentError = errorMessage !== this.lastErrorMessage;
    const hasEnoughTimePassed = now - this.lastErrorTime >= this.minIntervalMs;

    if (isDifferentError || hasEnoughTimePassed) {
      if (this.errorCount > 1) {
        console.warn(
          `[STOMP] Suppressed ${this.errorCount - 1} duplicate error(s)`,
        );
      }
      this.lastErrorTime = now;
      this.lastErrorMessage = errorMessage;
      this.errorCount = 1;
      return true;
    }

    this.errorCount++;
    return false;
  }

  reset(): void {
    this.lastErrorTime = 0;
    this.lastErrorMessage = "";
    this.errorCount = 0;
  }
}

class StompClientService {
  private client: Client | null = null;
  private destinationSubscriptions: Map<
    string,
    {
      subscription: StompSubscription;
      handlers: Map<string, (message: WebSocketMessage<unknown>) => void>;
    }
  > = new Map();
  private handlerToDestination: Map<string, string> = new Map();
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 3000;
  private currentReconnectDelay = 3000;
  private maxReconnectDelay = 60000; // 60 seconds max
  private errorRateLimiter = new ErrorRateLimiter();
  private hasReachedMaxAttempts = false;

  connect(config: WebSocketConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.client?.connected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error("Connection already in progress"));
        return;
      }

      // Check if we've exceeded max attempts
      if (this.hasReachedMaxAttempts) {
        const error = new Error(
          "Max reconnection attempts reached. Call resetConnection() to retry.",
        );
        if (this.errorRateLimiter.shouldLog(error.message)) {
          console.warn("[STOMP]", error.message);
        }
        config.onError?.(error);
        reject(error);
        return;
      }

      this.isConnecting = true;

      const stompConfig: StompConfig = {
        connectHeaders: {
          Authorization: `Bearer ${config.accessToken}`,
        },
        brokerURL: undefined,
        webSocketFactory: () => new SockJS(config.url) as any,
        debug: (str) => {
          if (__DEV__) {
            // Rate limit debug logs as well
            if (!str.includes(">>> PING") && !str.includes("<<< PONG")) {
              console.log("[STOMP Debug]", str);
            }
          }
        },
        // Disable auto-reconnect - we'll handle it manually with backoff
        reconnectDelay: 0,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          console.log("[STOMP] Connected");
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.currentReconnectDelay = this.baseReconnectDelay;
          this.hasReachedMaxAttempts = false;
          this.errorRateLimiter.reset();
          config.onConnect?.();
          resolve();
        },
        onDisconnect: () => {
          console.log("[STOMP] Disconnected");
          this.isConnecting = false;
          this.destinationSubscriptions.clear();
          this.handlerToDestination.clear();
          config.onDisconnect?.();
        },
        onStompError: (frame) => {
          const errorMessage = frame.headers["message"] || "STOMP error";

          // Rate-limited error logging
          if (this.errorRateLimiter.shouldLog(errorMessage)) {
            console.error("[STOMP] Error:", errorMessage);
          }

          this.isConnecting = false;

          // Handle reconnection with exponential backoff
          this.handleReconnection(config, reject);
        },
        onWebSocketError: (event) => {
          const errorMessage = "WebSocket connection failed";

          // Rate-limited error logging
          if (this.errorRateLimiter.shouldLog(errorMessage)) {
            console.error("[STOMP] WebSocket error");
          }

          this.isConnecting = false;

          // Handle reconnection with exponential backoff
          this.handleReconnection(config, reject);
        },
      };

      this.client = new Client(stompConfig);
      this.client.activate();
    });
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnection(
    config: WebSocketConfig,
    reject: (error: Error) => void,
  ): void {
    this.reconnectAttempts++;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.hasReachedMaxAttempts = true;
      const error = new Error(
        `Max reconnection attempts (${this.maxReconnectAttempts}) reached`,
      );
      console.error("[STOMP]", error.message);
      config.onError?.(error);
      reject(error);
      return;
    }

    // Calculate exponential backoff delay
    this.currentReconnectDelay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay,
    );

    console.log(
      `[STOMP] Reconnecting in ${this.currentReconnectDelay / 1000}s ` +
        `(attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    // Schedule reconnection
    setTimeout(() => {
      if (!this.hasReachedMaxAttempts && !this.client?.connected) {
        this.isConnecting = false; // Reset so connect() can proceed
        this.connect(config).catch(() => {
          // Error already handled in connect()
        });
      }
    }, this.currentReconnectDelay);
  }

  /**
   * Reset the connection state to allow new connection attempts
   * Call this after max attempts have been reached to retry
   */
  resetConnection(): void {
    this.reconnectAttempts = 0;
    this.currentReconnectDelay = this.baseReconnectDelay;
    this.hasReachedMaxAttempts = false;
    this.errorRateLimiter.reset();
    this.isConnecting = false;
  }

  disconnect(): void {
    if (this.client) {
      this.destinationSubscriptions.forEach((entry) =>
        entry.subscription.unsubscribe(),
      );
      this.destinationSubscriptions.clear();
      this.handlerToDestination.clear();
      this.client.deactivate();
      this.client = null;
    }
    this.resetConnection();
  }

  subscribe<T = unknown>(
    destination: string,
    callback: (message: WebSocketMessage<T>) => void,
  ): StompSubscription | null {
    if (!this.client?.connected) {
      console.warn("[STOMP] Cannot subscribe - not connected");
      return null;
    }

    const handlerId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const existing = this.destinationSubscriptions.get(destination);

    if (existing) {
      existing.handlers.set(
        handlerId,
        callback as (message: WebSocketMessage<unknown>) => void,
      );
      this.handlerToDestination.set(handlerId, destination);
      return {
        id: handlerId,
        topic: destination,
        unsubscribe: () => {
          this.unsubscribe(handlerId);
        },
      };
    }

    const handlers = new Map<
      string,
      (message: WebSocketMessage<unknown>) => void
    >();
    handlers.set(
      handlerId,
      callback as (message: WebSocketMessage<unknown>) => void,
    );

    const subscription = this.client.subscribe(
      destination,
      (message: IMessage) => {
        let parsedMessage: WebSocketMessage<unknown> | null = null;
        try {
          parsedMessage = JSON.parse(message.body) as WebSocketMessage<unknown>;
        } catch (error) {
          console.error("[STOMP] Failed to parse message:", error);
          return;
        }

        const entry = this.destinationSubscriptions.get(destination);
        if (!entry) {
          return;
        }

        entry.handlers.forEach((handler) => {
          try {
            handler(parsedMessage as WebSocketMessage<T>);
          } catch (error) {
            console.error("[STOMP] Handler error:", error);
          }
        });
      },
    );

    const stompSub: StompSubscription = {
      id: subscription.id,
      topic: destination,
      unsubscribe: () => {
        subscription.unsubscribe();
      },
    };

    this.destinationSubscriptions.set(destination, {
      subscription: stompSub,
      handlers,
    });
    this.handlerToDestination.set(handlerId, destination);

    return {
      id: handlerId,
      topic: destination,
      unsubscribe: () => {
        this.unsubscribe(handlerId);
      },
    };
  }

  send(destination: string, body: any, headers?: StompHeaders): void {
    if (!this.client?.connected) {
      console.warn("[STOMP] Cannot send - not connected");
      return;
    }

    this.client.publish({
      destination,
      body: JSON.stringify(body),
      headers,
    });
  }

  watchForReceipt(receiptId: string, callback: () => void): boolean {
    if (!this.client?.connected) {
      console.warn("[STOMP] Cannot watch receipt - not connected");
      return false;
    }

    this.client.watchForReceipt(receiptId, callback);
    return true;
  }

  isConnected(): boolean {
    return this.client?.connected || false;
  }

  /**
   * Check if max reconnection attempts have been reached
   */
  hasExceededMaxAttempts(): boolean {
    return this.hasReachedMaxAttempts;
  }

  /**
   * Get the current reconnection attempt count
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  unsubscribe(subscriptionId: string): void {
    const destination = this.handlerToDestination.get(subscriptionId);
    if (!destination) {
      return;
    }

    const entry = this.destinationSubscriptions.get(destination);
    if (!entry) {
      this.handlerToDestination.delete(subscriptionId);
      return;
    }

    entry.handlers.delete(subscriptionId);
    this.handlerToDestination.delete(subscriptionId);

    if (entry.handlers.size === 0) {
      entry.subscription.unsubscribe();
      this.destinationSubscriptions.delete(destination);
    }
  }

  unsubscribeAll(): void {
    this.destinationSubscriptions.forEach((entry) =>
      entry.subscription.unsubscribe(),
    );
    this.destinationSubscriptions.clear();
    this.handlerToDestination.clear();
  }
}

export const stompClient = new StompClientService();
