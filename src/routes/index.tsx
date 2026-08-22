import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { gradeSubmission } from "@/lib/grade.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TashihAI — تصحيح أوراق الإجابة بالذكاء الاصطناعي" },
      {
        name: "description",
        content:
          "ارفع ورقة إجابة الطالب وورقة التصحيح واحصل على العلامة النهائية فورًا. يدعم العربية والفرنسية.",
      },
      { property: "og:title", content: "TashihAI — تصحيح آلي لأوراق الإجابة" },
      {
        property: "og:description",
        content: "علامة نهائية فورية من صورتين: ورقة الطالب وورقة التصحيح.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read_error"));
    reader.readAsDataURL(file);
  });
}

function UploadField({
  label,
  file,
  onPick,
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card px-5 py-8 text-center transition-colors hover:border-primary hover:bg-accent"
    >
      {preview ? (
        <img
          src={preview}
          alt={label}
          className="h-28 w-auto rounded-lg object-cover shadow-sm"
        />
      ) : (
        <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-2xl">
          ↑
        </span>
      )}
      <span className="text-base font-semibold text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">
        {file ? file.name : "اضغط لاختيار صورة أو التقاط لقطة"}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onPick(f);
          setPreview(f ? URL.createObjectURL(f) : null);
        }}
      />
    </button>
  );
}

function Index() {
  const grade = useServerFn(gradeSubmission);
  const [student, setStudent] = useState<File | null>(null);
  const [key, setKey] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = !!student && !!key && !loading;

  async function onGrade() {
    if (!student || !key) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const [studentImage, keyImage] = await Promise.all([
        readFile(student),
        readFile(key),
      ]);
      const res = await grade({ data: { studentImage, keyImage } });
      setResult(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        msg.includes("RATE_LIMIT")
          ? "الخدمة مشغولة حاليًا، حاول بعد قليل."
          : msg.includes("NO_CREDITS")
            ? "نفد رصيد الذكاء الاصطناعي. يرجى إضافة رصيد."
            : "تعذّر التصحيح. تأكد من وضوح الصورتين وحاول مجددًا.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      lang="ar"
      className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-8 px-5 py-12"
    >
      <header className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-primary">TashihAI</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ارفع ورقة الطالب وورقة التصحيح، واحصل على العلامة النهائية.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <UploadField label="ورقة إجابة الطالب" file={student} onPick={setStudent} />
        <UploadField label="ورقة التصحيح النموذجية" file={key} onPick={setKey} />
      </div>

      <button
        type="button"
        disabled={!ready}
        onClick={onGrade}
        className="w-full rounded-2xl bg-primary px-6 py-4 text-lg font-bold text-primary-foreground shadow-md transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "جارٍ التصحيح…" : "تصحيح"}
      </button>

      {error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
          {error}
        </p>
      )}

      {result && (
        <section className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-card px-6 py-10">
          <span className="text-sm text-muted-foreground">العلامة النهائية</span>
          <p className="text-6xl font-black tabular-nums text-primary" dir="ltr">
            {result.score}/{result.total}
          </p>
        </section>
      )}
    </main>
  );
}
