import { API_CONFIG } from "@/config/api";
import { Tenant, Order, OrderItem, Product, AuthResponse } from "@/types";

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

  // Products
  createProduct: async (
    tenantId: string,
    data: { name: string; price: number; stock: number; description?: string }
  ): Promise<Product> => {
    return fetchAPI<Product>(API_CONFIG.endpoints.createProduct(tenantId), {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listProducts: async (tenantId: string): Promise<Product[]> => {
    const result = await fetchAPI<{ items: Product[] }>(
      API_CONFIG.endpoints.listProducts(tenantId),
      { method: "GET" }
    );
    return result.items || [];
  },

  listOrders: async (tenantId: string, status?: string): Promise<Order[]> => {
    const endpoint = status
      ? `${API_CONFIG.endpoints.listOrders(tenantId)}?status=${status}`
      : API_CONFIG.endpoints.listOrders(tenantId);

    type OrdersResponse = Order[] | { items: Order[] };
    const result = await fetchAPI<OrdersResponse>(endpoint, { method: "GET" });
    if (Array.isArray(result)) return result;
    if (Array.isArray((result as { items?: Order[] }).items)) {
      return (result as { items: Order[] }).items;
    }
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

  // Auth
  registerUser: async (
    tenantId: string,
    data: { email: string; password: string; role?: string }
  ): Promise<{ userId: string; email: string; role?: string }> => {
    return fetchAPI(API_CONFIG.endpoints.registerUser(tenantId), {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  login: async (
    tenantId: string,
    data: { email: string; password: string },
    secret?: string
  ): Promise<AuthResponse> => {
    return fetchAPI<AuthResponse>(API_CONFIG.endpoints.login(tenantId), {
      method: "POST",
      body: JSON.stringify(data),
      headers: secret ? { "x-auth-secret": secret } : {},
    });
  },
};
