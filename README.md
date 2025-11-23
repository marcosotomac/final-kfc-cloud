# KFC Orders - Backend (Serverless)

Backend multi-tenant y event-driven para gestionar pedidos KFC usando AWS (Api Gateway HTTP + WebSockets, EventBridge, Step Functions, Lambda, DynamoDB, S3, SQS, SNS, Amplify como front host).

## Endpoints principales (HTTP API)
- `POST /tenants` crea un tenant/franquicia.
- `POST /tenants/{tenantId}/orders` crea un pedido y dispara `order.created` al bus.
- `GET /tenants/{tenantId}/orders` lista pedidos (filtro `?status=` opcional).
- `GET /tenants/{tenantId}/orders/{orderId}` detalle y trazabilidad.

## WebSockets
- Rutas `$connect`, `$disconnect`, `$default`, `ping`.
- En `$connect` se persiste `{tenantId, role, userId, connectionId}` con TTL (`CONNECTION_TTL_SECONDS`).
- `orderEventsRouter` reenvía eventos del bus a todas las conexiones del tenant y a SNS.

## Workflow y microservicios
- Step Functions orquesta etapas `kitchen -> packaging -> delivery` con `sqs:sendMessage.waitForTaskToken`.
- Lambdas `kitchenWorker`, `packagingWorker`, `deliveryWorker` consumen de SQS, actualizan DynamoDB y responden a Step Functions.
- Estados de pedido: `placed`, `kitchen_in_progress`, `kitchen_done`, `packaging_in_progress`, `packaging_done`, `delivery_in_progress`, `delivered`.

## Datos en DynamoDB
- `TenantsTable`: `{tenantId, name, contact, status, createdAt, updatedAt}`.
- `OrdersTable`: `{tenantId, orderId, status, items, customer, notes, workflow{stage{status,startedAt,completedAt,actor}}, createdAt, updatedAt}`.
- `ConnectionsTable`: `{tenantId, connectionId, role, userId, connectedAt, expiresAt}` con GSI `connection-index` y `tenant-role-index` para fan-out.

## Despliegue
1. Instalar dependencias locales: `pip install -r requirements.txt`.
2. Deploy: `serverless deploy --stage dev`.
3. Variables clave inyectadas por Serverless: tablas, colas, tópico SNS, bus de eventos, ARN de Step Functions y WebSocket endpoint (`WEBSOCKET_API_ENDPOINT`).

