import { btn, btnTab, btnTabActive, cardCls, inputCls, labelCls, mainCls } from "../lib/ui";
import type { MessageState } from "./Message";

export type AuthMode = "login" | "register";

export interface AuthFormState {
  name: string;
  email: string;
  password: string;
}

interface Props {
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  form: AuthFormState;
  setForm: (form: AuthFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  message: MessageState;
}

export default function AuthForm({
  authMode,
  setAuthMode,
  form,
  setForm,
  onSubmit,
  message,
}: Props) {
  return (
    <main className={mainCls}>
      <h1 className="text-xl font-bold">Save State — Test Console</h1>
      <div className="mb-3 flex gap-2">
        <button
          className={authMode === "login" ? btnTabActive : btnTab}
          onClick={() => setAuthMode("login")}
        >
          Login
        </button>
        <button
          className={authMode === "register" ? btnTabActive : btnTab}
          onClick={() => setAuthMode("register")}
        >
          Register
        </button>
      </div>
      <form onSubmit={onSubmit} className={cardCls}>
        {authMode === "register" && (
          <label className={labelCls}>
            Nome
            <input
              required
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
        )}
        <label className={labelCls}>
          E-mail
          <input
            type="email"
            required
            className={inputCls}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label className={labelCls}>
          Senha
          <input
            type="password"
            required
            minLength={8}
            className={inputCls}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>
        <button type="submit" className={btn}>
          {authMode === "login" ? "Entrar" : "Criar conta"}
        </button>
      </form>
      {message && (
        <p className={message.kind === "error" ? "text-red-600" : "text-green-600"}>
          {message.text}
        </p>
      )}
    </main>
  );
}
