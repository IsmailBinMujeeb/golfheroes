import * as React from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/AuthContext";

type Mode = "login" | "signup" | "reset";

export default function Auth() {
  const { user, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [mode, setMode] = React.useState<Mode>("login");
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";
  if (user) return <Navigate to={from} replace />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    if (mode === "reset") {
      const { error: resetError } = await resetPassword(email);
      setBusy(false);
      if (resetError) return setError(resetError);
      toast("Check your inbox for the reset link.", "success");
      setMode("login");
      return;
    }

    if (mode === "signup" && password.length < 8) {
      setBusy(false);
      return setError("Passwords need at least 8 characters.");
    }

    const result =
      mode === "login" ? await signIn(email, password) : await signUp(email, password, fullName);
    setBusy(false);

    if (result.error) return setError(readableError(result.error));
    navigate(mode === "signup" ? "/subscribe" : from, { replace: true });
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-5 py-20">
      <Link to="/" className="font-display text-xl font-semibold">
        digital<span className="italic text-sage-400">.heroes</span>
      </Link>
      <h1 className="mt-8 font-display text-2xl font-semibold">
        {mode === "signup" ? "Create your account" : mode === "reset" ? "Reset your password" : "Log in"}
      </h1>
      <p className="mt-2 text-sm text-cream-300">
        {mode === "signup"
          ? "One account covers your scores, your charity and your draw entries."
          : mode === "reset"
            ? "We'll email you a link to set a new password."
            : "Pick up where you left off."}
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        {mode === "signup" ? (
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        {mode !== "reset" ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === "login" ? (
                <button
                  type="button"
                  onClick={() => setMode("reset")}
                  className="text-xs text-sage-400 hover:underline"
                >
                  Forgotten it?
                </button>
              ) : null}
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="border border-danger/50 bg-danger/5 px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Working…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Continue"}
        </Button>
      </form>

      {mode !== "reset" ? (
        <>
          <div className="my-6 flex items-center gap-4 text-xs text-cream-500">
            <span className="h-px flex-1 bg-line-700" />
            or
            <span className="h-px flex-1 bg-line-700" />
          </div>
          <Button variant="outline" onClick={() => void signInWithGoogle()}>
            Continue with Google
          </Button>
        </>
      ) : null}

      <button
        type="button"
        className="mt-8 text-sm text-cream-300 hover:text-cream-100"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
      </button>
    </div>
  );
}

function readableError(message: string) {
  if (/invalid login/i.test(message)) return "That email and password don't match an account.";
  if (/already registered|already exists/i.test(message)) {
    return "That email already has an account. Log in instead.";
  }
  return message;
}
