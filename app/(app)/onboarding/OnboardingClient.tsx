"use client";

import { useState, useTransition } from "react";
import { createGroup, joinGroup } from "@/lib/actions/group";
import { Btn, Avatar } from "@/components/ui";
import { IconPlus, IconUsers } from "@/components/ui/icons";

type Mode = "choose" | "create" | "join";

interface Props {
  userName: string;
  userEmail: string;
}

export function OnboardingClient({ userName, userEmail }: Props) {
  const [mode, setMode] = useState<Mode>("choose");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAction(action: (fd: FormData) => Promise<{ error: string } | void>) {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      const fd = new FormData(e.currentTarget);
      startTransition(async () => {
        const result = await action(fd);
        if (result?.error) setError(result.error);
      });
    };
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-5 py-10 gap-6">

      {/* Debug: usuário logado */}
      <div className="w-full max-w-[320px] flex items-center justify-between bg-surface-2 border border-border rounded-[10px] px-3 py-2">
        <div className="flex items-center gap-2">
          <Avatar name={userName} size={28} />
          <div>
            <div className="text-[12px] font-semibold text-text">{userName}</div>
            <div className="text-[10px] text-text-faint">{userEmail}</div>
          </div>
        </div>
        <a
          href="/auth/logout"
          className="text-[11px] font-semibold text-danger hover:underline"
        >
          sair
        </a>
      </div>

      {/* Header */}
      <div className="text-center">
        <div
          className="text-[28px] font-bold text-mint leading-tight"
          style={{ fontFamily: "var(--font-bricolage), var(--font-outfit), sans-serif" }}
        >
          Bora começar!
        </div>
        <div className="text-[13px] text-text-dim mt-1">
          {mode === "choose" && "Cria um grupo novo ou entra em um existente"}
          {mode === "create" && "Dá um nome pro seu grupo"}
          {mode === "join"   && "Cola o código que te mandaram"}
        </div>
      </div>

      {/* Choose */}
      {mode === "choose" && (
        <div className="w-full max-w-[320px] flex flex-col gap-3">
          <button
            onClick={() => setMode("create")}
            className="flex items-center gap-4 bg-surface border border-border-2 rounded-[14px] p-4 text-left hover:bg-surface-3 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-[10px] bg-mint-faint text-mint flex items-center justify-center shrink-0">
              <IconPlus />
            </div>
            <div>
              <div className="text-[14px] font-bold">Criar grupo novo</div>
              <div className="text-[12px] text-text-dim mt-0.5">Você vira o dono e convida a galera</div>
            </div>
          </button>

          <button
            onClick={() => setMode("join")}
            className="flex items-center gap-4 bg-surface border border-border-2 rounded-[14px] p-4 text-left hover:bg-surface-3 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-[10px] bg-blue-faint text-blue flex items-center justify-center shrink-0">
              <IconUsers />
            </div>
            <div>
              <div className="text-[14px] font-bold">Entrar em um grupo</div>
              <div className="text-[12px] text-text-dim mt-0.5">Usa o código que o dono te mandou</div>
            </div>
          </button>
        </div>
      )}

      {/* Create */}
      {mode === "create" && (
        <form onSubmit={handleAction(createGroup)} className="w-full max-w-[320px] flex flex-col gap-3">
          <div>
            <div className="text-[11px] font-semibold text-text-faint uppercase tracking-[1px] mb-1.5">
              nome do grupo
            </div>
            <input
              name="name"
              type="text"
              placeholder="Ex: Sinuca do Bar do Zé"
              required
              maxLength={50}
              className="w-full bg-surface border border-border-2 rounded-[12px] px-3.5 py-3 text-[14px] text-text placeholder:text-text-faint outline-none focus:border-mint focus:shadow-[0_0_0_3px_var(--mint-faint)] transition-all"
            />
          </div>
          {error && (
            <div className="text-[12px] text-danger bg-danger-faint border border-danger/20 rounded-[8px] px-3 py-2">
              {error}
            </div>
          )}
          <Btn type="submit" variant="primary" size="lg" className="w-full" disabled={isPending}>
            {isPending ? "Criando..." : "Criar grupo"}
          </Btn>
          <Btn type="button" variant="ghost" size="md" className="w-full" onClick={() => { setMode("choose"); setError(null); }}>
            Voltar
          </Btn>
        </form>
      )}

      {/* Join */}
      {mode === "join" && (
        <form onSubmit={handleAction(joinGroup)} className="w-full max-w-[320px] flex flex-col gap-3">
          <div>
            <div className="text-[11px] font-semibold text-text-faint uppercase tracking-[1px] mb-1.5">
              código do grupo
            </div>
            <input
              name="code"
              type="text"
              placeholder="Ex: BORA-ZE42"
              required
              maxLength={20}
              className="w-full bg-surface border border-border-2 rounded-[12px] px-3.5 py-3 text-[14px] text-text placeholder:text-text-faint outline-none focus:border-mint focus:shadow-[0_0_0_3px_var(--mint-faint)] transition-all uppercase tracking-widest font-mono"
            />
          </div>
          {error && (
            <div className="text-[12px] text-danger bg-danger-faint border border-danger/20 rounded-[8px] px-3 py-2">
              {error}
            </div>
          )}
          <Btn type="submit" variant="primary" size="lg" className="w-full" disabled={isPending}>
            {isPending ? "Entrando..." : "Entrar no grupo"}
          </Btn>
          <Btn type="button" variant="ghost" size="md" className="w-full" onClick={() => { setMode("choose"); setError(null); }}>
            Voltar
          </Btn>
        </form>
      )}
    </div>
  );
}
