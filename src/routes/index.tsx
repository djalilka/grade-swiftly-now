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

const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

type QuestionResult = {
  question_number: number;
  correct_answer: string;
  student_answer: string;
  points_earned: number;
  points_possible: number;
  reasoning: string;
};

type GradeResult = {
  score: number;
  total: number;
  questions: QuestionResult[];
};

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
  const [dragging, setDragging] = useState(false);
  const [invalid, setInvalid] = useState(false);

  function accept(f: File | null | undefined) {
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onPick(f);
    setPreview(URL.createObjectURL(f));
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        accept(e.dataTransfer.files?.[0]);
      }}
      className={`flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card px-5 py-8 text-center transition-colors hover:border-primary hover:bg-accent ${
        dragging ? "border-primary bg-accent" : "border-border"
      }`}
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
      <span
        className={`text-xs ${invalid ? "text-destructive" : "text-muted-foreground"}`}
      >
        {invalid
          ? "صيغة غير مدعومة — استعمل JPG أو PNG"
          : file
            ? file.name
            : "اضغط أو اسحب الصورة هنا (JPG / PNG)"}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={(e) => accept(e.target.files?.[0])}
      />
    </div>
  );
}

function StatusBadge({
  earned,
  possible,
}: {
  earned: number;
  possible: number;
}) {
  const full = earned === possible;
  const zero = earned === 0;
  const partial = !full && !zero;

  const className = full
    ? "bg-primary/10 text-primary"
    : partial
      ? "bg-warning/10 text-warning"
      : "bg-destructive/10 text-destructive";

  const label = full ? "صحيحة" : partial ? "جزئية" : "خاطئة";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

function QuestionCard({ question }: { question: QuestionResult }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold text-foreground">
          السؤال {question.question_number}
        </span>
        <StatusBadge
          earned={question.points_earned}
          possible={question.points_possible}
        />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">الإجابة الصحيحة:</span>
          <span className="text-foreground" dir="auto">
            {question.correct_answer}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">إجابة الطالب:</span>
          <span className="text-foreground" dir="auto">
            {question.student_answer}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">النقاط:</span>
          <span
            className="font-semibold tabular-nums text-foreground"
            dir="ltr"
          >
            {question.points_earned}/{question.points_possible}
          </span>
        </div>
        {question.reasoning && (
          <div className="mt-1 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {question.reasoning}
          </div>
        )}
      </div>
    </div>
  );
}

function Index() {
  const grade = useServerFn(gradeSubmission);
  const [student, setStudent] = useState<File | null>(null);
  const [key, setKey] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const ready = !!student && !!key && !loading;

  async function onGrade() {
    if (!student || !key) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setShowDetails(false);
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
            : msg.includes("PARSE_ERROR") || msg.includes("UNREADABLE")
              ? "تعذّرت قراءة الصورة بوضوح، الرجاء التقاط صورة أوضح."
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
        <h1 className="text-4xl font-extrabold tracking-tight text-primary">
          TashihAI
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ارفع ورقة الطالب وورقة التصحيح، واحصل على العلامة النهائية.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <UploadField
          label="ورقة إجابة الطالب"
          file={student}
          onPick={setStudent}
        />
        <UploadField
          label="ورقة التصحيح النموذجية"
          file={key}
          onPick={setKey}
        />
      </div>

      <button
        type="button"
        disabled={!ready}
        onClick={onGrade}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-4 text-lg font-bold text-primary-foreground shadow-md transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading && (
          <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {loading ? "جارٍ التصحيح…" : "تصحيح"}
      </button>

      {error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
          {error}
        </p>
      )}

      {result && (
        <section className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card px-6 py-10">
          <span className="text-sm text-muted-foreground">العلامة النهائية</span>
          <p className="text-6xl font-black tabular-nums text-primary" dir="ltr">
            {result.score}/{result.total}
          </p>
          <button
            type="button"
            onClick={() => setShowDetails((s) => !s)}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {showDetails ? "إخفاء التفاصيل" : "عرض التفاصيل"}
          </button>

          {showDetails && (
            <div className="w-full border-t border-border pt-5">
              <div className="mb-4 text-center">
                <span className="text-sm font-semibold text-foreground">
                  تفاصيل التصحيح
                </span>
                <p
                  className="mt-1 text-2xl font-black tabular-nums text-primary"
                  dir="ltr"
                >
                  {result.score}/{result.total}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {result.questions.map((q) => (
                  <QuestionCard key={q.question_number} question={q} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
