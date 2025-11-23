"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiService } from "@/services/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Order, OrderItem, Product, StageInfo } from "@/types";

function CustomerContent() {
  const searchParams = useSearchParams();
  const defaultTenant = searchParams.get("tenantId") || "";

  const [tenantId, setTenantId] = useState(defaultTenant);
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<OrderItem[]>([{ productId: "", name: "", quantity: 1 }]);
  const [order, setOrder] = useState<Order | null>(null);
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const formatStatus = (status: string) => {
    if (status === "placed") return "Recibido";
    if (status === "delivered") return "Entregado";
    return status.replace(/_/g, " ");
  };

  const getStatusColor = (status: string) => {
    if (status.startsWith("kitchen")) return "text-orange-700 bg-orange-100";
    if (status.startsWith("packaging")) return "text-yellow-700 bg-yellow-100";
    if (status.startsWith("delivery")) return "text-blue-700 bg-blue-100";
    if (status === "delivered") return "text-green-700 bg-green-100";
    return "text-gray-800 bg-gray-100";
  };

  const fetchOrder = useCallback(async () => {
    if (!tenantId || !orderId) return;
    try {
      const data = await apiService.getOrder(tenantId, orderId);
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el pedido");
    }
  }, [tenantId, orderId]);

  const handleWebSocketMessage = useCallback(
    (data: unknown) => {
      const detail = (data as { detail?: { orderId?: string } })?.detail || data;
      if (
        typeof detail === "object" &&
        detail &&
        "orderId" in detail &&
        (detail as { orderId?: string }).orderId === orderId
      ) {
        fetchOrder();
      }
    },
    [orderId, fetchOrder]
  );

  const { isConnected } = useWebSocket({
    tenantId,
    role: "customer",
    userId: customerName || "cliente",
    onMessage: handleWebSocketMessage,
  });

  const addItem = () => {
    setItems([...items, { productId: "", name: "", quantity: 1 }]);
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
    let patch: Partial<OrderItem> = { [field]: value } as Partial<OrderItem>;
    if (field === "productId") {
      const selected = products.find((p) => p.productId === value);
      patch = { ...patch, name: selected?.name || "" };
    }
    newItems[index] = { ...newItems[index], ...patch };
    setItems(newItems);
  };

  const createOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) {
      setError("Tenant ID es requerido");
      return;
    }
    if (!customerName.trim()) {
      setError("Nombre del cliente es requerido");
      return;
    }
    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (!validItems.length) {
      setError("Agrega al menos un item con producto y cantidad");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const created = await apiService.createOrder(tenantId, {
        items: validItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          name: i.name,
        })),
        customerName,
      });
      setOrder(created);
      setOrderId(created.orderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el pedido");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (tenantId !== defaultTenant) {
      // sync query param change
      setTenantId(defaultTenant);
    }
  }, [defaultTenant, tenantId]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!tenantId) return;
      try {
        const result = await apiService.listProducts(tenantId);
        setProducts(result);
      } catch (err) {
        console.error(err);
      }
    };
    loadProducts();
  }, [tenantId]);

  const renderStage = (label: string, info?: StageInfo) => (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <p className="font-semibold capitalize">{label}</p>
      <p className={`text-sm mt-1 inline-flex px-2 py-1 rounded ${getStatusColor(info?.status || "pending")}`}>
        {formatStatus(info?.status || "pending")}
      </p>
      <div className="text-xs text-gray-600 mt-2 space-y-1">
        {info?.startedAt && <p>Inicio: {new Date(info.startedAt).toLocaleTimeString()}</p>}
        {info?.completedAt && <p>Fin: {new Date(info.completedAt).toLocaleTimeString()}</p>}
        {info?.actor && <p>Atendido por: {info.actor}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-red-700">🛒 Cliente</h1>
            <p className="text-sm text-gray-600">Haz tu pedido y sigue el estado en tiempo real</p>
            <p className="text-xs text-gray-500">
              WebSocket: {isConnected ? "🟢 Conectado" : "🔴 Desconectado"}
            </p>
          </div>
          <Link
            href={tenantId ? `/?tenantId=${tenantId}` : "/"}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
          >
            ← Volver
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={createOrder} className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Crear Pedido</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tenant ID
              </label>
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tu nombre
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                required
              />
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">Items</label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm px-3 py-1 bg-gray-100 rounded border hover:bg-gray-200"
                >
                  + Agregar
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <select
                      value={item.productId || ""}
                      onChange={(e) => updateItem(index, "productId", e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      required
                    >
                      <option value="">Seleccione producto</option>
                      {products.map((p) => (
                        <option key={p.productId} value={p.productId} disabled={p.stock <= 0}>
                          {p.name} - ${p.price} ({p.stock} disp.)
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", parseInt(e.target.value, 10) || 1)
                      }
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      required
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {products.length === 0 && (
                  <p className="text-xs text-gray-500">
                    No hay productos cargados. Pide al admin que registre productos.
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || products.length === 0}
              className="w-full py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-400"
            >
              {submitting ? "Enviando..." : "Enviar Pedido"}
            </button>
          </form>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Seguimiento del Pedido
            </h2>
            {order ? (
              <div>
                <p className="text-sm text-gray-600">
                  Pedido <span className="font-mono font-semibold">#{order.orderId}</span>
                </p>
                <p className="mt-2 inline-flex px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
                  Estado: {formatStatus(order.status)}
                </p>

                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Items:</p>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {(order.items || []).map((item, idx) => (
                      <li key={idx}>
                        {item.quantity}x {item.name || item.productId}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                  {renderStage("cocina", order.workflow?.kitchen)}
                  {renderStage("empaque", order.workflow?.packaging)}
                  {renderStage("delivery", order.workflow?.delivery)}
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Creado: {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">
                Crea un pedido para ver el seguimiento en tiempo real.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Cargando...
        </div>
      }
    >
      <CustomerContent />
    </Suspense>
  );
}
