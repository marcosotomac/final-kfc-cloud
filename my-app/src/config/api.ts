export const API_CONFIG = {
  baseUrl: "https://2afuwya2yc.execute-api.us-east-1.amazonaws.com",
  wsUrl: "wss://hmvtmrvzu4.execute-api.us-east-1.amazonaws.com/dev",
  endpoints: {
    registerTenant: "/tenants",
    createOrder: (tenantId: string) => `/tenants/${tenantId}/orders`,
    listOrders: (tenantId: string) => `/tenants/${tenantId}/orders`,
    getOrder: (tenantId: string, orderId: string) =>
      `/tenants/${tenantId}/orders/${orderId}`,
    completeStage: (tenantId: string, orderId: string, stage: string) =>
      `/tenants/${tenantId}/orders/${orderId}/stages/${stage}/complete`,
  },
};
