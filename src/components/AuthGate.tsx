import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { useRosterStore, saveProfile, type UserProfile } from "@/lib/roster-store";

type Mode = "signup" | "login";

const GOOGLE_CLIENT_ID =
  (import.meta.env && (import.meta.env["VITE_GOOGLE_CLIENT_ID"] as string)) ||
  "";

export function AuthGate({ children }: { children: ReactNode }) {
  const { profile, ready } = useRosterStore();

  if (!ready) return null;
  if (profile) return <>{children}</>;
  return <AuthScreen />;
}

function cleanName(name: string) {
  return name
    .replace(/^(أستاذة|أستاذ)\s*/i, "")
    .replace(/\s+(أستاذة|أستاذ)$/i, "")
    .trim();
}

function decodeGoogleJwt(token: string) {
  try {
    const parts = token.split(".");
    const payloadPart = parts[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function AuthScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [gisReady, setGisReady] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!GOOGLE_CLIENT_ID) return;
    const w = window as unknown as Record<string, unknown>;
    if (w["google"]) {
      initGis();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGis;
    script.onerror = () => setGisReady(false);
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  function initGis() {
    const g = (window as unknown as { google?: GoogleIdentityServices }).google;
    if (!g?.accounts?.id || !googleBtnRef.current) return;
    g.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    g.accounts.id.renderButton(googleBtnRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      width: googleBtnRef.current.clientWidth,
      text: "signup_with",
      shape: "pill",
      locale: "ar",
    });
    setGisReady(true);
  }

  function handleGoogleCredential(response: { credential?: string }) {
    const token = response.credential;
    if (!token) {
      setError("لم نتمكن من استرداد معلومات Google. حاول مرة أخرى.");
      return;
    }
    const payload = decodeGoogleJwt(token);
    const fullName =
      typeof payload?.name === "string" && payload.name.trim()
        ? payload.name.trim()
        : typeof payload?.given_name === "string" && payload.given_name.trim()
          ? payload.given_name.trim()
          : "مستخدم جديد";
    const email =
      typeof payload?.email === "string" ? payload.email.trim() : "";

    const next: UserProfile = {
      name: cleanName(fullName),
      contact: email || contact.trim() || "google",
      gender,
      ...(avatar ? { avatar } : {}),
    };
    saveProfile(next);
    navigate({ to: "/settings" });
  }

  function onPick(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.readAsDataURL(file);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || !password.trim()) {
      setError("يرجى ملء جميع الحقول المطلوبة.");
      return;
    }
    const next: UserProfile = {
      name: cleanName(name.trim()),
      contact: contact.trim(),
      gender,
      ...(avatar ? { avatar } : {}),
    };
    saveProfile(next);
    navigate({ to: "/settings" });
  }

  const inputCls =
    "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground";

  return (
    <main
      dir="rtl"
      lang="ar"
      className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 px-5 py-10"
    >
      <header className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserRound className="size-8" aria-hidden />
        </span>
        <h1 className="text-2xl font-extrabold text-foreground">
          مرحباً بك أيها الأستاذ الفاضل
        </h1>
        <p className="text-sm text-muted-foreground">
          رفيقك الذكي في تصحيح أوراق الإجابة، لتمنح وقتك لما هو أهم: تعليم
          تلاميذك.
        </p>
      </header>

      <div className="flex rounded-2xl bg-secondary p-1">
        {(
          [
            ["signup", "إنشاء حساب جديد"],
            ["login", "تسجيل الدخول"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
              mode === m
                ? "bg-card text-foreground shadow"
                : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        onSubmit={submit}
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card px-5 py-5"
      >
        {mode === "signup" && (
          <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
            الاسم واللقب
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: محمد بن علي"
            />
          </label>
        )}

        <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
          البريد الإلكتروني أو رقم الهاتف
          <input
            className={inputCls}
            dir="ltr"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="teacher@example.com"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
          كلمة السر
          <input
            className={inputCls}
            type="password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
          />
        </label>

        {mode === "signup" && (
          <>
            <div className="flex flex-col gap-2 text-sm font-semibold text-foreground">
              الجنس
              <div className="flex gap-2">
                {(
                  [
                    ["male", "أستاذ"],
                    ["female", "أستاذة"],
                  ] as const
                ).map(([g, label]) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                      gender === g
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-muted-foreground">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="صورة البروفايل"
                    className="size-full object-cover"
                  />
                ) : (
                  <UserRound className="size-7" aria-hidden />
                )}
              </span>
              <label className="cursor-pointer rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent">
                صورة البروفايل (اختياري)
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPick(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </>
        )}

        {error && (
          <p className="text-sm font-semibold text-destructive">{error}</p>
        )}

        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:brightness-110"
        >
          {mode === "signup" ? "إنشاء الحساب" : "دخول"}
        </button>

        {GOOGLE_CLIENT_ID ? (
          <div
            ref={googleBtnRef}
            className="flex min-h-[40px] items-center justify-center"
          />
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            تسجيل الدخول عبر Google غير مفعّل حالياً (مفتاح العميل غير مضبوط).
          </p>
        )}
      </form>
    </main>
  );
}

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential?: string }) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: Record<string, unknown>,
      ) => void;
      prompt: (moment?: string) => void;
    };
  };
}
