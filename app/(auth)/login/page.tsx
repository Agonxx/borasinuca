"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Btn } from "@/components/ui";

function EightBall() {
  return (
    <svg width="64" height="64" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="19" fill="#111" stroke="#243a55" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="10" fill="white" />
      <circle cx="20" cy="20" r="6" fill="#111" />
      <text x="20" y="24" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold" fontFamily="Arial">8</text>
      <circle cx="13" cy="11" r="3" fill="white" opacity="0.15" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/home");
        router.refresh();
        // Mantém loading=true enquanto a navegação acontece
      } else {
        if (!name.trim()) throw new Error("Digite seu nome");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name.trim() } },
        });
        if (error) throw error;
        router.push("/home");
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(translateError(msg));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-6 py-10"
      style={{ background: "radial-gradient(ellipse at top, #14283f 0%, #0a1929 60%)" }}>
      <div className="w-full max-w-[360px] flex flex-col gap-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <EightBall />
            <div className="absolute inset-[-8px] rounded-full border border-mint/20" />
          </div>
          <div className="text-center">
            <div
              className="text-[36px] font-bold text-mint leading-none"
              style={{ fontFamily: "var(--font-bricolage), var(--font-outfit), sans-serif", letterSpacing: -0.8 }}
            >
              BoraSinuca
            </div>
            <div className="text-[13px] text-text-dim mt-1.5">
              {mode === "login" ? "Entra aí, parceiro" : "Cria tua conta"}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">

          {mode === "signup" && (
            <div>
              <div className="text-[11px] font-semibold text-text-faint uppercase tracking-[1px] mb-1.5">nome</div>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Seu nome"
                required
                className="w-full bg-surface border border-border-2 rounded-[12px] px-3.5 py-3 text-[14px] text-text placeholder:text-text-faint outline-none focus:border-mint focus:shadow-[0_0_0_3px_var(--mint-faint)] transition-all"
              />
            </div>
          )}

          <div>
            <div className="text-[11px] font-semibold text-text-faint uppercase tracking-[1px] mb-1.5">email</div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full bg-surface border border-border-2 rounded-[12px] px-3.5 py-3 text-[14px] text-text placeholder:text-text-faint outline-none focus:border-mint focus:shadow-[0_0_0_3px_var(--mint-faint)] transition-all"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <div className="text-[11px] font-semibold text-text-faint uppercase tracking-[1px]">senha</div>
              {mode === "login" && (
                <button type="button" className="text-[11px] text-mint font-semibold cursor-pointer">
                  esqueci
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full bg-surface border border-border-2 rounded-[12px] px-3.5 py-3 pr-16 text-[14px] text-text placeholder:text-text-faint outline-none focus:border-mint focus:shadow-[0_0_0_3px_var(--mint-faint)] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-text-faint font-medium cursor-pointer"
              >
                {showPassword ? "ocultar" : "mostrar"}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-[12px] text-danger bg-danger-faint border border-danger/20 rounded-[8px] px-3 py-2">
              {error}
            </div>
          )}

          <Btn
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            className="mt-1 w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {mode === "login" ? "Entrando..." : "Criando conta..."}
              </span>
            ) : (
              mode === "login" ? "Entrar" : "Criar conta"
            )}
          </Btn>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-text-faint">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Btn
            type="button"
            variant="secondary"
            size="lg"
            className="w-full"
            disabled={googleLoading}
            onClick={async () => {
              setGoogleLoading(true);
              await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: `${window.location.origin}/auth/callback` },
              });
            }}
          >
            {googleLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Redirecionando...
              </span>
            ) : (
              "Continuar com Google"
            )}
          </Btn>
        </form>

        <p className="text-center text-[13px] text-text-dim">
          {mode === "login" ? (
            <>
              novo por aqui?{" "}
              <button type="button" onClick={() => { setMode("signup"); setError(null); }}
                className="text-mint font-bold cursor-pointer">
                criar conta
              </button>
            </>
          ) : (
            <>
              já tem conta?{" "}
              <button type="button" onClick={() => { setMode("login"); setError(null); }}
                className="text-mint font-bold cursor-pointer">
                entrar
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function translateError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "Email ou senha incorretos";
  if (msg.includes("Email not confirmed")) return "Confirme seu email antes de entrar";
  if (msg.includes("User already registered")) return "Este email já está cadastrado";
  if (msg.includes("Password should be at least")) return "A senha precisa ter pelo menos 8 caracteres";
  if (msg.includes("Unable to validate email")) return "Email inválido";
  return msg;
}
