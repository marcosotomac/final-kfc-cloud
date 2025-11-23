"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiService } from "@/services/api";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    location: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      const result = await apiService.registerTenant({
        name: formData.name,
        location: formData.location || undefined,
      });

      setSuccess(result.tenantId);
      setTimeout(() => {
        router.push(`/?tenantId=${result.tenantId}`);
      }, 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al registrar franquicia"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-red-600 mb-2">
            🍗 Registrar Franquicia
          </h1>
          <p className="text-gray-600">KFC Orders System</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            <p className="font-semibold">
              ¡Franquicia registrada exitosamente!
            </p>
            <p className="text-sm mt-1">
              Tenant ID: <span className="font-mono font-bold">{success}</span>
            </p>
            <p className="text-sm mt-1">Redirigiendo...</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nombre de la Franquicia *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ej: KFC Centro"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
              disabled={loading || !!success}
            />
          </div>

          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Ubicación (Opcional)
            </label>
            <input
              type="text"
              id="location"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="Ej: Av. Principal 123"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
              disabled={loading || !!success}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !!success}
            className="w-full py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading
              ? "Registrando..."
              : success
              ? "✓ Registrado"
              : "Registrar Franquicia"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
