"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiService } from "@/services/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Order, OrderItem } from "@/types";

function AdminContent() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") || "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<OrderItem[]>([{ name: "", quantity: 1 }]);

  const loadOrders = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    setError("");
    try {
      const data = await apiService.listOrders(tenantId);
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar pedidos");
      setOrders([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const handleWebSocketMessage = useCallback(() => {
    // Refresh orders when we receive an update
    loadOrders();
  }, [loadOrders]);

  const { isConnected } = useWebSocket({
    tenantId,
    role: "admin",
    onMessage: handleWebSocketMessage,
  });

  useEffect(() => {
    if (tenantId) {
      loadOrders();
    }
  }, [tenantId, loadOrders]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setLoading(true);
    setError("");

    try {
      const validItems = items.filter(
        (item) => item.name.trim() && item.quantity > 0
      );
      await apiService.createOrder(tenantId, {
        items: validItems,
        customerName: customerName || undefined,
      });

      setShowForm(false);
      setCustomerName("");
      setItems([{ name: "", quantity: 1 }]);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear pedido");
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { name: "", quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof OrderItem,
    value: string | number
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const getStatusColor = (status: string) => {
    if (status.startsWith("kitchen")) return "bg-orange-100 text-orange-800";
    if (status.startsWith("packaging")) return "bg-yellow-100 text-yellow-800";
    if (status.startsWith("delivery")) return "bg-blue-100 text-blue-800";
    if (status === "delivered") return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  const formatStatus = (status: string) => {
    if (status === "placed") return "Recibido";
    if (status === "delivered") return "Entregado";
    return status.replace(/_/g, " ");
  };

  const stageDisplay = (order: Order) => {
    const stages = ["kitchen", "packaging", "delivery"] as const;
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
        {stages.map((stage) => {
          const stageData = order.workflow?.[stage];
          const stageStatus = stageData?.status || "pending";
          return (
            <div
              key={stage}
              className="border border-gray-200 rounded-md p-2 text-xs bg-gray-50"
            >
              <p className="font-semibold capitalize">{stage}</p>
              <p className="mt-1">
                Estado:{" "}
                <span className="font-mono">{formatStatus(stageStatus)}</span>
              </p>
              {stageData?.actor && <p>Resp: {stageData.actor}</p>}
              {stageData?.startedAt && (
                <p>
                  Inicio: {new Date(stageData.startedAt).toLocaleTimeString()}
                </p>
              )}
              {stageData?.completedAt && (
                <p>
                  Fin: {new Date(stageData.completedAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (!tenantId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Tenant ID requerido
          </h2>
          <p className="text-gray-600 mb-6">
            Por favor, ingresa un Tenant ID para continuar
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                👨‍💼 Panel Admin / Caja
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
              href="/"
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

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Pedidos</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
            >
              {showForm ? "Cancelar" : "+ Nuevo Pedido"}
            </button>
          </div>

          {showForm && (
            <form
              onSubmit={handleCreateOrder}
              className="mb-6 p-6 bg-gray-50 rounded-lg"
            >
              <h3 className="text-lg font-semibold mb-4">Crear Nuevo Pedido</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Cliente (Opcional)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Items
                </label>
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) =>
                        updateItem(index, "name", e.target.value)
                      }
                      placeholder="Producto"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                      required
                    />
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", parseInt(e.target.value))
                      }
                      className="w-24 px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                      required
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  + Agregar Item
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? "Creando..." : "Crear Pedido"}
              </button>
            </form>
          )}

          <button
            onClick={loadOrders}
            disabled={loading}
            className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Cargando..." : "🔄 Actualizar"}
          </button>

          <div className="space-y-4">
            {orders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No hay pedidos todavía
              </p>
            ) : (
              orders.map((order) => (
                <div
                  key={order.orderId}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-800">
                        Pedido #{order.orderId}
                      </p>
                      {(order.customer?.name || order.customerName) && (
                        <p className="text-sm text-gray-600">
                          Cliente: {order.customer?.name || order.customerName}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {formatStatus(order.status)}
                    </span>
                  </div>
                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-700">Items:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {order.items.map((item, idx) => (
                        <li key={idx}>
                          {item.quantity}x {item.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {stageDisplay(order)}
                  <p className="text-xs text-gray-500">
                    Creado: {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          Cargando...
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  );
}
