'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [tenantId, setTenantId] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8 md:p-12">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-red-600 mb-4">🍗 KFC Orders</h1>
            <p className="text-gray-600 text-lg">Sistema de Gestión de Pedidos Multi-Tenant</p>
          </div>

          <div className="mb-8">
            <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700 mb-2">
              Tenant ID (Franquicia)
            </label>
            <input
              type="text"
              id="tenantId"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="Ingrese su Tenant ID"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href={`/admin?tenantId=${tenantId}`}
              className={`flex items-center justify-center gap-3 p-6 rounded-xl transition-all ${
                tenantId
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              onClick={(e) => !tenantId && e.preventDefault()}
            >
              <span className="text-2xl">👨‍💼</span>
              <span className="font-semibold">Admin / Caja</span>
            </Link>

            <Link
              href={`/kitchen?tenantId=${tenantId}`}
              className={`flex items-center justify-center gap-3 p-6 rounded-xl transition-all ${
                tenantId
                  ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              onClick={(e) => !tenantId && e.preventDefault()}
            >
              <span className="text-2xl">👨‍🍳</span>
              <span className="font-semibold">Cocina</span>
            </Link>

            <Link
              href={`/packaging?tenantId=${tenantId}`}
              className={`flex items-center justify-center gap-3 p-6 rounded-xl transition-all ${
                tenantId
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              onClick={(e) => !tenantId && e.preventDefault()}
            >
              <span className="text-2xl">📦</span>
              <span className="font-semibold">Empaque</span>
            </Link>

            <Link
              href={`/delivery?tenantId=${tenantId}`}
              className={`flex items-center justify-center gap-3 p-6 rounded-xl transition-all ${
                tenantId
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              onClick={(e) => !tenantId && e.preventDefault()}
            >
              <span className="text-2xl">🚗</span>
              <span className="font-semibold">Delivery</span>
            </Link>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">¿No tienes un Tenant ID?</h3>
            <p className="text-sm text-gray-600 mb-3">
              Registra tu franquicia para obtener un Tenant ID
            </p>
            <Link
              href="/register"
              className="inline-block px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              Registrar Franquicia
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
