"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Credenciales incorrectas");
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080d14] flex items-center justify-center px-4">
      {/* Fondo decorativo */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px]
                        rounded-full bg-[#1e6cff]/8 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px]
                        rounded-full bg-[#7e4dff]/6 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/Logo Oscuro Con Slogan.png"
            alt="Te lo Consigo"
            width={1774}
            height={887}
            quality={100}
            className="h-28 w-auto mix-blend-lighten"
            unoptimized
            priority
          />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04]
                        backdrop-blur-sm p-8 shadow-2xl shadow-black/50">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center
                            rounded-xl border border-[#1e6cff]/30 bg-[#1e6cff]/10">
              <Lock className="h-6 w-6 text-[#4d8dff]" />
            </div>
            <h1 className="text-xl font-bold text-white">Panel Administrativo</h1>
            <p className="mt-1 text-sm text-zinc-500">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Usuario */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="Admin"
                  className="w-full rounded-lg border border-white/10 bg-white/5
                             pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600
                             focus:outline-none focus:border-[#1e6cff]/50 focus:bg-[#1e6cff]/5
                             transition-colors"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-white/10 bg-white/5
                             pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-600
                             focus:outline-none focus:border-[#1e6cff]/50 focus:bg-[#1e6cff]/5
                             transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500
                             hover:text-zinc-300 transition-colors"
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10
                            px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg
                         bg-[#1e6cff] hover:bg-[#1858d6] disabled:opacity-60
                         px-4 py-2.5 text-sm font-bold text-white transition-colors"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Ingresando…</>
              ) : (
                "Ingresar al panel"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
