import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getLastResult, type GradeResult, type QuestionResult } from "@/lib/result-store";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "تفاصيل التصحيح — TashihAI" },
      {
        name: "description",
        content:
          "تفاصيل تصحيح ورقة الطالب سؤالًا بسؤال: الإجابة الصحيحة، إجابة الطالب، النقاط وسبب القرار.",
      },
      { property: "og:title", content: "تفاصيل التصحيح — TashihAI" },
      {
        property: "og:description",
        content: "عرض مفصّل لكل سؤال مع النقاط وسبب القرار.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResultsPage,
});

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

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {full ? "صحيحة" : partial ? "جزئية" : "خاطئة"}
    </span>
  );
}

function QuestionCard({ question }: { question: QuestionResult }) {
  const full = question.points_earned === question.points_possible;
  const zero = question.points_earned === 0;
  const accent = full
    ? "border-r-primary"
    : zero
      ? "border-r-destructive"
      : "border-r-warning";

  return (
    <article
      className={`rounded-2xl border border-border border-r-4 bg-card p-5 shadow-sm ${accent}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">
          السؤال {question.question_number}
        </h2>
        <StatusBadge
          earned={question.points_earned}
          possible={question.points_possible}
        />
      </div>

      <dl className="mt-4 flex flex-col gap-3 text-sm">
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">الإجابة الصحيحة</dt>
          <dd className="text-foreground" dir="auto">
            {question.correct_answer || "—"}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">إجابة الطالب</dt>
          <dd className="text-foreground" dir="auto">
            {question.student_answer || "— (لم يجب)"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <dt className="text-xs text-muted-foreground">النقاط</dt>
          <dd
            className="text-base font-bold tabular-nums text-foreground"
            dir="ltr"
          >
            {question.points_earned}/{question.points_possible}
          </dd>
        </div>
      </dl>

      {question.reasoning && (
        <p className="mt-4 rounded-xl bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          {question.reasoning}
        </p>
      )}
    </article>
  );
}

function ResultsPage() {
  const [result, setResult] = useState<GradeResult | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setResult(getLastResult());
    setReady(true);
  }, []);

  return (
    <main
      dir="rtl"
      lang="ar"
      className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-8 px-5 py-10"
    >
      <header className="flex flex-col gap-5 rounded-3xl border border-border bg-card px-6 py-8">
        <Link
          to="/"
          className="self-start rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent"
        >
          ← رجوع
        </Link>
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm text-muted-foreground">العلامة النهائية</span>
          <p className="text-6xl font-black tabular-nums text-primary" dir="ltr">
            {result ? `${result.score}/${result.total}` : "—"}
          </p>
          {result && (
            <span className="text-xs text-muted-foreground">
              {result.questions.length} سؤال
            </span>
          )}
        </div>
      </header>

      {ready && !result && (
        <p className="rounded-2xl bg-muted/50 px-5 py-8 text-center text-sm text-muted-foreground">
          لا توجد نتيجة محفوظة. ارجع إلى الصفحة الرئيسية وقم بالتصحيح أولًا.
        </p>
      )}

      {result && (
        <section className="flex flex-col gap-5">
          <h1 className="text-xl font-extrabold text-foreground">
            تفاصيل التصحيح
          </h1>
          {result.questions.map((q) => (
            <QuestionCard key={q.question_number} question={q} />
          ))}
        </section>
      )}
    </main>
  );
}
