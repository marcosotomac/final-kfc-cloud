"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiService } from "@/services/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Order } from "@/types";

function PackagingContent() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") || "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleWebSocketMessage = useCallback((data: any) => {
    console.log("WebSocket message received:", data);
    loadOrders();
  }, []);

  const { isConnected } = useWebSocket({
    tenantId,
    role: "packaging",
    onMessage: handleWebSocketMessage,
  });

  const loadOrders = async () => {
    if (!tenantId) return;

    setLoading(true);
    setError("");
    try {
      const data = await apiService.listOrders(tenantId, "packaging");
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar pedidos");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const completeOrder = async (orderId: string) => {
    if (!tenantId) return;
    setLoading(true);
    setError("");
    try {
      await apiService.completeStage(tenantId, orderId, "packaging");
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar el pedido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadOrders();
    }
  }, [tenantId]);

  if (!tenantId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Tenant ID requerido
          </h2>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-yellow-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-yellow-800 mb-2">
                📦 Panel Empaque
              </h1>
              <p className="text-gray-600">
                Tenant ID:{" "}
                <span className="font-mono font-semibold">{tenantId}</span>
              </p>
              <p className="text-sm text-gray-500">
                WebSocket: {isConnected ? "🟢 Conectado" : "🔴 Desconectado"}
              </p>
            </div>
            <Link
              href={`/?tenantId=${tenantId}`}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              ← Volver
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Pedidos para Empacar
            </h2>
            <button
              onClick={loadOrders}
              disabled={loading}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400"
            >
              {loading ? "Cargando..." : "🔄 Actualizar"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.length === 0 ? (
              <div className="col-span-full text-gray-500 text-center py-12">
                No hay pedidos para empacar
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.orderId}
                  className="border-2 border-yellow-300 rounded-lg p-6 bg-yellow-50 hover:shadow-lg transition-shadow"
                >
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-yellow-800">
                      #{order.orderId}
                    </p>
                    {(order.customer?.name || order.customerName) && (
                      <p className="text-sm text-gray-600 mt-1">
                        🙋 {order.customer?.name || order.customerName}
                      </p>
                    )}
                  </div>
                  <div className="mb-4">
                    <p className="font-semibold text-gray-800 mb-2">
                      Items a empacar:
                    </p>
                    <ul className="space-y-1">
                      {order.items.map((item, idx) => (
                        <li
                          key={idx}
                          className="text-lg font-medium text-gray-700"
                        >
                          <span className="inline-block bg-yellow-600 text-white rounded-full w-8 h-8 text-center leading-8 mr-2">
                            {item.quantity}
                          </span>
                          {item.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    Recibido: {new Date(order.createdAt).toLocaleTimeString()}
                  </p>
                  <button
                    onClick={() => completeOrder(order.orderId)}
                    disabled={loading}
                    className="mt-4 w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400"
                  >
                    Marcar empacado
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PackagingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-yellow-50 flex items-center justify-center">
          Cargando...
        </div>
      }
    >
      <PackagingContent />
    </Suspense>
  );
}
