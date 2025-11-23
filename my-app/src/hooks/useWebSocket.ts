"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { API_CONFIG } from "@/config/api";
import { WebSocketMessage, UserRole } from "@/types";

interface UseWebSocketProps {
  tenantId: string;
  role: UserRole;
  userId?: string;
  onMessage?: (data: unknown) => void;
}

export const useWebSocket = ({
  tenantId,
  role,
  userId,
  onMessage,
}: UseWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const connect = useCallback(function connectSocket() {
    // Don't connect if no tenantId
    if (!tenantId) {
      console.log("WebSocket: No tenantId provided, skipping connection");
      return;
    }

    const resolvedUserId =
      userId ||
      `${role}-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`;

    try {
      console.log("WebSocket: Attempting to connect...");
      const wsUrl = `${API_CONFIG.wsUrl}?tenantId=${encodeURIComponent(
        tenantId
      )}&role=${encodeURIComponent(role)}&userId=${encodeURIComponent(
        resolvedUserId
      )}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket: Connected successfully");
        setIsConnected(true);

        // Setup ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: "ping" }));
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket: Message received:", data);
          setLastMessage(data);
          onMessage?.(data);
        } catch (error) {
          console.error("WebSocket: Error parsing message:", error);
        }
      };

      ws.onerror = (error) => {
        console.warn(
          "WebSocket: Connection error (this is normal during development)",
          error
        );
        // Don't log the full error object as it's often empty
      };

      ws.onclose = (event) => {
        console.log(
          `WebSocket: Disconnected (code: ${event.code}, reason: ${
            event.reason || "none"
          })`
        );
        setIsConnected(false);

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }

        // Only attempt to reconnect if tenantId is still available
        if (tenantId) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("WebSocket: Attempting to reconnect...");
            connectSocket();
          }, 3000);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("WebSocket: Error creating connection:", error);
    }
  }, [tenantId, role, userId, onMessage]);

  const disconnect = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not connected");
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    disconnect,
  };
};
