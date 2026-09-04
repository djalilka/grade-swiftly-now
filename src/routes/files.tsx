import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, X } from "lucide-react";
import {
  useRosterStore,
  removeRubric,
  setPendingRubric,
  addDoc,
  removeDoc,
  setNote,
  type Rubric,
  type TeacherDoc,
} from "@/lib/roster-store";

export const Route = createFileRoute("/files")({
  head: () => ({
    meta: [
      { title: "ملفاتي — TashihAI" },
      {
        name: "description",
        content:
          "أرشيف نماذج الإجابة، حافظة المستندات التربوية، ومفكرة الأستاذ لكل قسم.",
      },
      { property: "og:title", content: "ملفاتي — TashihAI" },
      {
        property: "og:description",
        content: "أرشيف الاختبارات والمستندات والمفكرة في مكان واحد.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FilesPage,
});

const SUBTABS = [
  { id: "exams", label: "أرشيف الاختبارات" },
  { id: "docs", label: "حافظة المستندات" },
  { id: "notes", label: "مفكرة الأستاذ" },
] as const;

type SubTab = (typeof SUBTABS)[number]["id"];

function fmt(at: string) {
  return new Date(at).toLocaleDateString("fr-FR");
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("read"));
    fr.readAsDataURL(file);
  });
}

function FilesPage() {
  const navigate = useNavigate();
  const { rubrics, docs, notes, roster } = useRosterStore();
  const [tab, setTab] = useState<SubTab>("exams");
  const [preview, setPreview] = useState<Rubric | null>(null);
  const [docPreview, setDocPreview] = useState<TeacherDoc | null>(null);

  function useNow(r: Rubric) {
    setPendingRubric(r.id);
    void navigate({ to: "/" });
  }

  return (
    <main
      dir="rtl"
      lang="ar"
      className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-5 py-10 pb-28"
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-foreground">ملفاتي</h1>
        <p className="text-sm text-muted-foreground">
          نماذج الإجابة المحفوظة، المستندات التربوية، ومفكرتك الخاصة.
        </p>
      </header>

      <div className="flex items-stretch gap-1 rounded-2xl bg-secondary/60 p-1">
        {SUBTABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-xl px-2 py-2.5 text-xs font-bold transition-colors ${
              tab === t.id
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "exams" && (
        <ExamsArchive
          rubrics={rubrics}
          onPreview={setPreview}
          onUse={useNow}
        />
      )}
      {tab === "docs" && (
        <DocsVault docs={docs} onOpen={setDocPreview} />
      )}
      {tab === "notes" && <NotesTab roster={roster} notes={notes} />}

      {preview && (
        <FullScreen
          title={preview.title}
          backLabel="← رجوع إلى الأرشيف"
          onBack={() => setPreview(null)}
        >
          {preview.images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${preview.title} — صفحة ${i + 1}`}
              className="w-full rounded-xl border border-border"
            />
          ))}
        </FullScreen>
      )}

      {docPreview && (
        <FullScreen
          title={docPreview.title}
          backLabel="← رجوع إلى قائمة المستندات"
          onBack={() => setDocPreview(null)}
        >
          {docPreview.kind === "pdf" ? (
            <iframe
              src={docPreview.dataUrl}
              title={docPreview.title}
              className="h-[75vh] w-full rounded-xl border border-border bg-card"
            />
          ) : (
            <img
              src={docPreview.dataUrl}
              alt={docPreview.title}
              className="w-full rounded-xl border border-border"
            />
          )}
        </FullScreen>
      )}
    </main>
  );
}

function FullScreen({
  title,
  backLabel,
  onBack,
  children,
}: {
  title: string;
  backLabel: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-background"
    >
      <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground"
        >
          {backLabel}
        </button>
        <span className="truncate text-sm font-bold text-foreground">
          {title}
        </span>
      </div>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-4">
        {children}
      </div>
    </div>
  );
}

function ExamsArchive({
  rubrics,
  onPreview,
  onUse,
}: {
  rubrics: Rubric[];
  onPreview: (r: Rubric) => void;
  onUse: (r: Rubric) => void;
}) {
  if (rubrics.length === 0)
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        لا توجد نماذج محفوظة. احفظ نموذج إجابة من تبويب التصحيح ليظهر هنا
        تلقائياً.
      </p>
    );

  return (
    <ul className="flex flex-col gap-3">
      {rubrics.map((r) => (
        <li
          key={r.id}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">
                {r.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {fmt(r.at)} • {r.images.length} صفحة
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onUse(r)}
              className="flex-1 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground"
            >
              استخدامه فوراً في التصحيح
            </button>
            <button
              type="button"
              onClick={() => onPreview(r)}
              className="rounded-xl bg-secondary px-3 py-2.5 text-xs font-bold text-secondary-foreground"
            >
              معاينة الملف
            </button>
            <button
              type="button"
              aria-label={`حذف ${r.title}`}
              onClick={() => removeRubric(r.id)}
              className="rounded-xl bg-destructive/10 px-3 py-2.5 text-xs font-bold text-destructive"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function DocsVault({
  docs,
  onOpen,
}: {
  docs: TeacherDoc[];
  onOpen: (d: TeacherDoc) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!file || !title.trim()) return;
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const kind = file.type === "application/pdf" ? "pdf" : "image";
      const ok = addDoc(title.trim(), kind, dataUrl);
      if (!ok) {
        setMsg("الذاكرة ممتلئة — احذف مستندات قديمة");
        return;
      }
      setOpen(false);
      setTitle("");
      setFile(null);
      setMsg(null);
    } catch {
      setMsg("تعذّر رفع المستند");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground"
      >
        + رفع مستند جديد
      </button>

      {docs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          لا توجد مستندات بعد.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <button
                type="button"
                onClick={() => onOpen(d)}
                className="flex min-w-0 flex-1 items-center gap-3 text-right"
              >
                <span className="text-xl" aria-hidden>
                  {d.kind === "pdf" ? "📄" : "🖼️"}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-foreground">
                    {d.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {fmt(d.at)}
                  </span>
                </span>
              </button>
              <button
                type="button"
                aria-label={`حذف ${d.title}`}
                onClick={() => removeDoc(d.id)}
                className="rounded-lg p-2 text-destructive"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-6">
          <div
            dir="rtl"
            className="flex w-full max-w-xl flex-col gap-4 rounded-t-3xl bg-card p-5 sm:rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">
                رفع مستند جديد
              </h2>
              <button
                type="button"
                aria-label="إغلاق"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                عنوان الدرس / المستند
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: درس المتتاليات"
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
              />
            </label>

            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="rounded-xl border border-border bg-background px-4 py-3 text-xs text-foreground"
            />

            {msg && (
              <p className="text-xs font-semibold text-destructive">{msg}</p>
            )}

            <button
              type="button"
              disabled={!file || !title.trim() || busy}
              onClick={() => void submit()}
              className="w-full rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              {busy ? "جارٍ الرفع…" : "رفع"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function NotesTab({
  roster,
  notes,
}: {
  roster: { id: string; name: string }[];
  notes: Record<string, string>;
}) {
  const [classId, setClassId] = useState<string>("");
  const active = classId || roster[0]?.id || "";

  return (
    <section className="flex flex-col gap-3">
      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          القسم
        </span>
        <select
          value={active}
          onChange={(e) => setClassId(e.target.value)}
          className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground"
        >
          {roster.length === 0 && <option value="">لا توجد أقسام</option>}
          {roster.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <textarea
        rows={14}
        disabled={!active}
        value={active ? (notes[active] ?? "") : ""}
        onChange={(e) => active && setNote(active, e.target.value)}
        placeholder="ملاحظاتك البيداغوجية حول هذا القسم… تُحفظ تلقائياً."
        className="w-full rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground disabled:opacity-50"
      />
      <p className="text-xs text-muted-foreground">
        يتم الحفظ تلقائياً أثناء الكتابة.
      </p>
    </section>
  );
}
