export interface Tenant {
  tenantId: string;
  name: string;
  location?: string;
  createdAt?: string;
}

export interface OrderItem {
  productId?: string;
  name?: string;
  quantity: number;
  price?: number;
  lineTotal?: number;
}

export interface Order {
  orderId: string;
  tenantId: string;
  status:
    | "placed"
    | "kitchen_in_progress"
    | "kitchen_done"
    | "packaging_in_progress"
    | "packaging_done"
    | "delivery_in_progress"
    | "delivered"
    | "pending"
    | "kitchen"
    | "packaging"
    | "delivery"
    | "completed";
  items: OrderItem[];
  customer?: { name: string };
  customerName?: string; // fallback for older responses
  workflow?: {
    kitchen?: StageInfo;
    packaging?: StageInfo;
    delivery?: StageInfo;
    [key: string]: StageInfo | undefined;
  };
  createdAt: string;
  updatedAt?: string;
  history?: OrderHistoryEntry[];
}

export interface StageInfo {
  status: string;
  startedAt?: string;
  completedAt?: string;
  actor?: string;
}

export interface OrderHistoryEntry {
  status: string;
  timestamp: string;
  details?: string;
}

export type UserRole = "admin" | "kitchen" | "packaging" | "delivery" | "customer";

export interface WebSocketMessage {
  action: string;
  tenantId?: string;
  role?: UserRole;
  data?: unknown;
}

export interface Product {
  productId: string;
  tenantId: string;
  name: string;
  price: number;
  stock: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  token: string;
  user: { userId: string; email: string; role?: string };
}
