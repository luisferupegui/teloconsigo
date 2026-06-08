"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, UserPlus, Trash2, KeyRound, Loader2, CheckCircle2, AlertCircle,
  Eye, EyeOff, ShieldCheck, X,
} from "lucide-react";

type AdminUserRow = { username: string; createdAt: string };
type Toast = { ok: boolean; msg: string };

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function UsersManager() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const flash = useCallback((ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const d = await (await fetch("/api/admin/users")).json();
      setUsers(d.users ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  // ── Alta de usuario ──
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [adding, setAdding] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, password: newPassword }),
      });
      const d = await res.json();
      if (!res.ok) { flash(false, d.error ?? "No se pudo crear el usuario"); return; }
      flash(true, `Usuario “${newUsername.trim()}” creado ✓`);
      setNewUsername(""); setNewPassword(""); setShowNew(false);
      refresh();
    } catch {
      flash(false, "Error de red al crear el usuario");
    } finally {
      setAdding(false);
    }
  }

  // ── Cambiar contraseña ──
  const [pwOpen, setPwOpen] = useState<string | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwShow, setPwShow] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  function openPw(username: string) {
    setPwOpen((cur) => (cur === username ? null : username));
    setPwValue(""); setPwShow(false);
  }

  async function savePw(username: string) {
    setPwSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: pwValue }),
      });
      const d = await res.json();
      if (!res.ok) { flash(false, d.error ?? "No se pudo cambiar la contraseña"); return; }
      flash(true, `Contraseña de “${username}” actualizada ✓`);
      setPwOpen(null); setPwValue("");
    } catch {
      flash(false, "Error de red al cambiar la contraseña");
    } finally {
      setPwSaving(false);
    }
  }

  // ── Borrar ──
  const [deleting, setDeleting] = useState<string | null>(null);
  async function remove(username: string) {
    if (!confirm(`¿Borrar al usuario “${username}”? Ya no podrá acceder al panel.`)) return;
    setDeleting(username);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const d = await res.json();
      if (!res.ok) { flash(false, d.error ?? "No se pudo borrar el usuario"); return; }
      flash(true, `Usuario “${username}” borrado`);
      refresh();
    } catch {
      flash(false, "Error de red al borrar el usuario");
    } finally {
      setDeleting(null);
    }
  }

  const onlyOne = users.length <= 1;

  return (
    <div className="space-y-6">
      {/* ── Alta de usuario ── */}
      <form onSubmit={add} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-bold text-zinc-900">
          <UserPlus className="h-4 w-4 text-indigo-600" /> Agregar usuario
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          El nuevo usuario podrá entrar a este panel con el usuario y contraseña que definas.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-1 min-w-[180px] flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Usuario</span>
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              autoComplete="off"
              placeholder="ej: maria.ventas"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="flex flex-1 min-w-[180px] flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Contraseña (mín. 8)</span>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 pr-9 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <button type="button" onClick={() => setShowNew((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          <button
            type="submit"
            disabled={adding || newUsername.trim() === "" || newPassword === ""}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Crear usuario
          </button>
        </div>
      </form>

      {/* ── Lista de usuarios ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <p className="flex items-center gap-2 text-sm font-bold text-zinc-900">
            <Users className="h-4 w-4 text-indigo-600" /> Usuarios con acceso
          </p>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
            {users.length}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 px-5 py-10 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando usuarios…
          </div>
        ) : users.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-400">No hay usuarios.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {users.map((u) => (
              <li key={u.username} className="px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-zinc-900">{u.username}</p>
                    <p className="text-[11px] text-zinc-400">Creado el {formatDate(u.createdAt)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openPw(u.username)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                        pwOpen === u.username
                          ? "border-indigo-300 bg-indigo-50 text-indigo-600"
                          : "border-zinc-300 text-zinc-600 hover:border-indigo-300 hover:text-indigo-600"
                      }`}
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Cambiar contraseña
                    </button>
                    <button
                      onClick={() => remove(u.username)}
                      disabled={deleting === u.username || onlyOne}
                      title={onlyOne ? "No puedes borrar el último usuario" : "Borrar usuario"}
                      className="rounded-lg border border-zinc-300 p-1.5 text-zinc-400 hover:border-red-300 hover:text-red-500 disabled:opacity-40 disabled:hover:border-zinc-300 disabled:hover:text-zinc-400 transition"
                    >
                      {deleting === u.username ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Panel inline para cambiar la contraseña */}
                {pwOpen === u.username && (
                  <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                    <label className="flex flex-1 min-w-[200px] flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Nueva contraseña para “{u.username}” (mín. 8)
                      </span>
                      <div className="relative">
                        <input
                          type={pwShow ? "text" : "password"}
                          value={pwValue}
                          onChange={(e) => setPwValue(e.target.value)}
                          autoComplete="new-password"
                          placeholder="••••••••"
                          className="w-full rounded-lg border border-zinc-300 px-3 py-2 pr-9 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                        <button type="button" onClick={() => setPwShow((s) => !s)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                          {pwShow ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </label>
                    <button
                      onClick={() => savePw(u.username)}
                      disabled={pwSaving || pwValue === ""}
                      className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                      {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Guardar
                    </button>
                    <button
                      onClick={() => { setPwOpen(null); setPwValue(""); }}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-700"
                    >
                      <X className="h-4 w-4" /> Cancelar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-zinc-400">
        Las contraseñas se guardan <strong>hasheadas</strong> en el servidor (archivo ignorado por git).
        No es posible verlas, solo reemplazarlas.
      </p>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${toast.ok ? "bg-emerald-500" : "bg-red-500"}`}>
            {toast.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
