import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { authApi } from "@/lib/api/endpoints";
import { useAuth, homePathForRole } from "@/store/auth";
import { toast } from "@/components/ui/Toast";

const PASSWORD_MIN = 8;

function StrengthBar({ password }: { password: string }) {
  const score = [
    password.length >= PASSWORD_MIN,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const colors = ["bg-danger", "bg-warn", "bg-warn", "bg-ok", "bg-ok"];
  const labels = ["", "Débil", "Regular", "Buena", "Fuerte"];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= score ? colors[score] : "bg-g-mid"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-g-dark">{labels[score]}</p>
    </div>
  );
}

export function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const { status, activateFromToken } = useAuth();

  const [info, setInfo] = useState<{ email?: string; name?: string } | null>(null);
  const [validating, setValidating] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Already authenticated users go straight to their home screen
  useEffect(() => {
    if (status === "authenticated") {
      const { user } = useAuth.getState();
      navigate(homePathForRole(user?.role), { replace: true });
    }
  }, [status, navigate]);

  // Validate the token on mount to pre-fill the user's name/email
  useEffect(() => {
    if (!token) {
      setTokenError("No se encontró el token de invitación en la URL.");
      setValidating(false);
      return;
    }
    authApi
      .validateInvitation(token)
      .then((res) => {
        if (typeof res === "object" && res !== null) {
          const r = res as Record<string, unknown>;
          setInfo({ email: r.email as string, name: r.name as string });
        }
        setValidating(false);
      })
      .catch((e: Error) => {
        setTokenError(e.message ?? "El token de invitación no es válido o ha expirado.");
        setValidating(false);
      });
  }, [token]);

  const mismatch = !!confirm && password !== confirm;
  const canSubmit =
    !submitting &&
    password.length >= PASSWORD_MIN &&
    confirm.length > 0 &&
    !mismatch;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const data = await authApi.acceptInvitation({
        token,
        password,
        confirm_password: confirm,
      });

      // Attempt to auto-sign in using tokens in the response
      try {
        const user = await activateFromToken(data as Record<string, unknown>);
        toast.success("¡Cuenta activada!", `Bienvenido, ${user.name}.`);
        navigate(homePathForRole(user.role), { replace: true });
      } catch {
        // Response had no tokens — redirect to login as fallback
        toast.success("¡Cuenta activada!", "Ahora puedes iniciar sesión.");
        navigate("/login", { replace: true });
      }
    } catch (e) {
      toast.error("No se pudo activar la cuenta", (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-g-light px-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Activar cuenta</h1>
          <p className="text-center text-sm text-g-dark">
            Establece tu contraseña para acceder a la plataforma
          </p>
        </div>

        <div className="panel p-8">
          {/* Validating token */}
          {validating && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-secondary" />
              <p className="text-sm text-g-dark">Validando invitación…</p>
            </div>
          )}

          {/* Token error state */}
          {!validating && tokenError && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                {tokenError}
              </div>
              <button
                onClick={() => navigate("/login")}
                className="text-sm text-secondary underline underline-offset-2"
              >
                Ir al inicio de sesión
              </button>
            </div>
          )}

          {/* Password setup form */}
          {!validating && !tokenError && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Account info pill */}
              {info?.email && (
                <div className="rounded-xl border border-g-mid bg-g-light/60 px-4 py-3">
                  <p className="text-xs text-g-dark">Activando cuenta para</p>
                  <p className="mt-0.5 font-medium text-primary">{info.name ?? info.email}</p>
                  {info.name && <p className="text-xs text-g-dark">{info.email}</p>}
                </div>
              )}

              {/* New password */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-g-dark">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={PASSWORD_MIN}
                    placeholder={`Mínimo ${PASSWORD_MIN} caracteres`}
                    autoComplete="new-password"
                    className="h-10 w-full rounded-xl border border-g-mid bg-white px-3 pr-10 text-sm text-primary placeholder-g-dark focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-g-dark hover:text-primary"
                    aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    <span className="contents">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </span>
                  </button>
                </div>
                <StrengthBar password={password} />
              </div>

              {/* Confirm password */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-g-dark">
                  Confirmar contraseña
                </label>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                  className={`h-10 w-full rounded-xl border bg-white px-3 text-sm text-primary placeholder-g-dark focus:outline-none focus:ring-2 ${
                    mismatch
                      ? "border-danger focus:border-danger focus:ring-danger/20"
                      : "border-g-mid focus:border-secondary focus:ring-secondary/20"
                  }`}
                />
                {mismatch && (
                  <p className="mt-1 text-xs text-danger">Las contraseñas no coinciden</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                <span className="contents">
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                </span>
                {submitting ? "Activando…" : "Activar cuenta"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-g-dark">
          ¿Ya tienes acceso?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-secondary underline underline-offset-2"
          >
            Iniciar sesión
          </button>
        </p>
      </div>
    </div>
  );
}
