import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import {
  useRosterStore,
  updateSettings,
  saveProfile,
  logout,
  type UserProfile,
} from "@/lib/roster-store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — TashihAI" },
      {
        name: "description",
        content: "الوضع الليلي، معلومات الحساب، والمساعدة حول تطبيق TashihAI.",
      },
      { property: "og:title", content: "الإعدادات — TashihAI" },
      {
        property: "og:description",
        content: "الوضع الليلي، الحساب والدعم.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card px-5 py-5">
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function cleanName(name: string) {
  return name
    .replace(/^(أستاذة|أستاذ)\s*/i, "")
    .replace(/\s+(أستاذة|أستاذ)$/i, "")
    .trim();
}

function welcomeLine(profile: UserProfile) {
  const name = cleanName(profile.name);
  const raw = profile.name.trim();
  if (/أستاذ|أستاذة/.test(raw)) {
    return `مرحباً بك ${raw}`;
  }
  const title = profile.gender === "female" ? "أستاذة" : "أستاذ";
  return `مرحباً بك يا ${title} ${name}`;
}

function SettingsPage() {
  const { settings, profile } = useRosterStore();
  const [email, setEmail] = useState(settings.email);
  const [help, setHelp] = useState(false);
  const [about, setAbout] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [pName, setPName] = useState(profile?.name ?? "");
  const [pGender, setPGender] = useState<"male" | "female">(
    profile?.gender ?? "male",
  );
  const [pAvatar, setPAvatar] = useState<string | undefined>(profile?.avatar);

  useEffect(() => {
    if (!profile) return;
    setPName(cleanName(profile.name));
    setPGender(profile.gender);
    setPAvatar(profile.avatar);
    setEmail((e) => e || profile.contact);
  }, [profile?.name, profile?.gender, profile?.avatar, profile?.contact]);

  function flash(msg: string) {
    setSaved(msg);
    setTimeout(() => setSaved(null), 2000);
  }

  return (
    <main
      dir="rtl"
      lang="ar"
      className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-5 px-5 py-10"
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-foreground">الإعدادات</h1>
        <p className="text-sm text-muted-foreground">تخصيص التطبيق والحساب.</p>
      </header>

      {profile && (
        <div className="flex items-center gap-4 rounded-3xl border border-border bg-card px-5 py-5">
          <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-muted-foreground ring-2 ring-primary/40">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={`صورة ${cleanName(profile.name)}`}
                className="size-full object-cover"
              />
            ) : (
              <UserRound className="size-8" aria-hidden />
            )}
          </span>
          <div className="flex flex-col">
            <p className="text-xl font-extrabold leading-tight text-foreground">
              {welcomeLine(profile)}
            </p>
            <p className="text-sm text-muted-foreground" dir="ltr">
              {profile.contact}
            </p>
          </div>
        </div>
      )}

      {profile && (
        <Section title="الملف الشخصي">
          <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
            الاسم واللقب
            <input
              value={pName}
              onChange={(e) => setPName(e.target.value)}
              placeholder="مثال: محمد علي"
              className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
            />
          </label>
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
                  onClick={() => setPGender(g)}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                    pGender === g
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="cursor-pointer self-start rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent">
            تغيير صورة البروفايل
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => setPAvatar(String(reader.result));
                reader.readAsDataURL(f);
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              saveProfile({
                name: cleanName(pName.trim()) || cleanName(profile.name),
                contact: profile.contact,
                gender: pGender,
                ...(pAvatar ? { avatar: pAvatar } : {}),
              });
              flash("تم تحديث الملف الشخصي");
            }}
            className="self-start rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            حفظ الملف الشخصي
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("هل تريد تسجيل الخروج؟")) logout();
            }}
            className="self-start rounded-xl border border-destructive px-4 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/10"
          >
            تسجيل الخروج
          </button>
        </Section>
      )}

      <Section title="الوضع الليلي">
        <button
          type="button"
          role="switch"
          aria-checked={settings.dark}
          onClick={() => updateSettings({ dark: !settings.dark })}
          className="flex items-center justify-between gap-4"
        >
          <span className="text-sm text-muted-foreground">
            {settings.dark ? "مُفعّل" : "مُعطّل"}
          </span>
          <span
            className={`relative h-7 w-12 rounded-full transition-colors ${
              settings.dark ? "bg-primary" : "bg-secondary"
            }`}
          >
            <span
              className={`absolute top-1 size-5 rounded-full bg-card shadow transition-all ${
                settings.dark ? "right-1" : "right-6"
              }`}
            />
          </span>
        </button>
      </Section>

      <Section title="معلومات الحساب">
        <input
          type="email"
          value={email}
          dir="ltr"
          placeholder="teacher@example.com"
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
        />
        <button
          type="button"
          onClick={() => {
            updateSettings({ email });
            flash("تم حفظ البريد");
          }}
          className="self-start rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
        >
          حفظ
        </button>
      </Section>

      <Section title="المساعدة والدعم">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setHelp(true)}
            className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
          >
            كيف يعمل التطبيق؟
          </button>
          <button
            type="button"
            onClick={() => setAbout(true)}
            className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
          >
            حول التطبيق
          </button>
        </div>
      </Section>

      <div className="h-20" />

      {saved && (
        <p className="fixed bottom-24 right-1/2 z-50 translate-x-1/2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg">
          {saved}
        </p>
      )}

      {help && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-5"
          onClick={() => setHelp(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-foreground">
              المساعدة والدعم
            </h2>
            <ol className="mt-4 flex list-decimal flex-col gap-2 pr-5 text-sm leading-relaxed text-muted-foreground">
              <li>من تبويب التصحيح: أضف القسم والتلاميذ ثم اخترهم.</li>
              <li>ارفع أوراق إجابة التلميذ وأوراق التصحيح النموذجية.</li>
              <li>اضغط «تصحيح» ثم احفظ العلامة وانتقل للتلميذ التالي.</li>
              <li>راجع الإحصائيات في تبويب التقارير وصدّرها إلى Excel.</li>
            </ol>
            <button
              type="button"
              onClick={() => setHelp(false)}
              className="mt-6 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
            >
              فهمت
            </button>
          </div>
        </div>
      )}

      {about && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-5"
          onClick={() => setAbout(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-foreground">حول التطبيق</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              TashihAI أداة تصحيح آلي لأوراق الإجابة بالعربية والفرنسية. يعتمد
              على قراءة الصور ومقارنة إجابات التلميذ بورقة التصحيح النموذجية
              لحساب العلامة النهائية، مع تفصيل لكل سؤال.
            </p>
            <button
              type="button"
              onClick={() => setAbout(false)}
              className="mt-6 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
