import { API_CONFIG } from "@/config/api";
import { Tenant, Order, OrderItem } from "@/types";

const fetchAPI = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_CONFIG.baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
};

export const apiService = {
  // Tenant APIs
  registerTenant: async (data: {
    name: string;
    location?: string;
  }): Promise<Tenant> => {
    return fetchAPI<Tenant>(API_CONFIG.endpoints.registerTenant, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Order APIs
  createOrder: async (
    tenantId: string,
    data: { items: OrderItem[]; customerName?: string }
  ): Promise<Order> => {
    const payload = {
      items: data.items,
      customer: {
        name: (data.customerName || "Cliente").trim(),
      },
    };

    return fetchAPI<Order>(API_CONFIG.endpoints.createOrder(tenantId), {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  listOrders: async (tenantId: string, status?: string): Promise<Order[]> => {
    const endpoint = status
      ? `${API_CONFIG.endpoints.listOrders(tenantId)}?status=${status}`
      : API_CONFIG.endpoints.listOrders(tenantId);

    const result = await fetchAPI<any>(endpoint, { method: "GET" });
    if (Array.isArray(result)) return result as Order[];
    if (Array.isArray(result?.items)) return result.items as Order[];
    throw new Error("Respuesta inválida del servidor");
  },

  getOrder: async (tenantId: string, orderId: string): Promise<Order> => {
    return fetchAPI<Order>(API_CONFIG.endpoints.getOrder(tenantId, orderId), {
      method: "GET",
    });
  },

  completeStage: async (
    tenantId: string,
    orderId: string,
    stage: "kitchen" | "packaging" | "delivery",
    userId?: string
  ): Promise<{ orderId: string; stage: string; status: string }> => {
    return fetchAPI(API_CONFIG.endpoints.completeStage(tenantId, orderId, stage), {
      method: "POST",
      headers: userId ? { "x-user-id": userId } : {},
    });
  },
};
