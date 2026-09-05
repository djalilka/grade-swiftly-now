import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { useRosterStore, saveProfile, type UserProfile } from "@/lib/roster-store";

type Mode = "signup" | "login";

export function AuthGate({ children }: { children: ReactNode }) {
  const { profile, ready } = useRosterStore();

  if (!ready) return null;
  if (profile) return <>{children}</>;
  return <AuthScreen />;
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
      name: name.trim(),
      contact: contact.trim(),
      gender,
      ...(avatar ? { avatar } : {}),
    };
    saveProfile(next);
    navigate({ to: "/settings" });
  }

  function googleSignIn() {
    saveProfile({
      name: name.trim() || "أستاذ",
      contact: contact.trim() || "google",
      gender,
      ...(avatar ? { avatar } : {}),
    });
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

        {error && <p className="text-sm font-semibold text-destructive">{error}</p>}

        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:brightness-110"
        >
          {mode === "signup" ? "إنشاء الحساب" : "دخول"}
        </button>

        <button
          type="button"
          onClick={googleSignIn}
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold text-foreground hover:bg-accent"
        >
          <span className="text-base font-black text-primary">G</span>
          تسجيل بواسطة Google
        </button>
      </form>
    </main>
  );
}
