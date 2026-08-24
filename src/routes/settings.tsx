import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useRosterStore,
  updateSettings,
  addClass,
  addStudent,
} from "@/lib/roster-store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — TashihAI" },
      {
        name: "description",
        content:
          "إدارة مفتاح Gemini، الوضع الليلي، البريد الإلكتروني، الأقسام والتلاميذ، والمساعدة.",
      },
      { property: "og:title", content: "الإعدادات — TashihAI" },
      {
        property: "og:description",
        content: "مفتاح Gemini، الوضع الليلي، الحساب والدعم.",
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

function SettingsPage() {
  const { settings, roster } = useRosterStore();
  const [key, setKey] = useState(settings.geminiApiKey);
  const [email, setEmail] = useState(settings.email);
  const [showKey, setShowKey] = useState(false);
  const [help, setHelp] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [className, setClassName] = useState("");
  const [studentClass, setStudentClass] = useState(roster[0]?.id ?? "");
  const [studentName, setStudentName] = useState("");

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
        <p className="text-sm text-muted-foreground">
          تخصيص التطبيق وإدارة الأقسام.
        </p>
      </header>

      <Section title="مفتاح Gemini API">
        <input
          type={showKey ? "text" : "password"}
          value={key}
          dir="ltr"
          placeholder="AIza..."
          onChange={(e) => setKey(e.target.value)}
          className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              updateSettings({ geminiApiKey: key });
              flash("تم حفظ المفتاح");
            }}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            حفظ
          </button>
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
          >
            {showKey ? "إخفاء" : "إظهار"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          التصحيح يعمل حاليًا بمفتاح مدمج. أضف مفتاحك الخاص لاستعماله لاحقًا.
        </p>
      </Section>

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

      <Section title="البريد الإلكتروني">
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

      <Section title="الأقسام والتلاميذ">
        <div className="flex gap-2">
          <input
            value={className}
            placeholder="اسم القسم الجديد"
            onChange={(e) => setClassName(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
          />
          <button
            type="button"
            disabled={!className.trim()}
            onClick={() => {
              addClass(className.trim());
              setClassName("");
              flash("تم إضافة القسم");
            }}
            className="rounded-xl bg-secondary px-4 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-40"
          >
            إضافة
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <select
            value={studentClass}
            onChange={(e) => setStudentClass(e.target.value)}
            className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground"
          >
            {roster.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              value={studentName}
              placeholder="اسم التلميذ"
              onChange={(e) => setStudentName(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
            />
            <button
              type="button"
              disabled={!studentName.trim() || !studentClass}
              onClick={() => {
                addStudent(studentClass, studentName.trim());
                setStudentName("");
                flash("تم إضافة التلميذ");
              }}
              className="rounded-xl bg-secondary px-4 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-40"
            >
              إضافة
            </button>
          </div>
        </div>
      </Section>

      <Section title="المساعدة والدعم">
        <button
          type="button"
          onClick={() => setHelp(true)}
          className="self-start rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
        >
          كيف يعمل التطبيق؟
        </button>
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
              <li>اختر القسم ثم التلميذ من تبويب التصحيح.</li>
              <li>ارفع أوراق إجابة التلميذ وأوراق التصحيح النموذجية.</li>
              <li>اضغط «تصحيح» ثم احفظ العلامة للتلميذ.</li>
              <li>راجع النتائج والمعدلات في تبويب التقارير وصدّرها إلى Excel.</li>
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
    </main>
  );
}
