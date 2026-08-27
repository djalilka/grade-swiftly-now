import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeClassErrors } from "@/lib/insights.functions";
import { useRosterStore, type ClassRoom } from "@/lib/roster-store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "التقارير — TashihAI" },
      {
        name: "description",
        content:
          "كشف نقاط القسم، معدل القسم وأعلى وأدنى علامة، وتصدير النتائج إلى Excel.",
      },
      { property: "og:title", content: "التقارير — TashihAI" },
      {
        property: "og:description",
        content: "إحصائيات الأقسام وكشوف النقاط في مكان واحد.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function pct(score: number, total: number) {
  return total > 0 ? (score / total) * 100 : 0;
}

function stats(cls: ClassRoom | undefined) {
  const graded = (cls?.students ?? []).filter((s) => s.mark);
  const values = graded.map((s) => pct(s.mark!.score, s.mark!.total));
  const avg = values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : 0;
  return {
    count: cls?.students.length ?? 0,
    gradedCount: graded.length,
    avg,
    max: values.length ? Math.max(...values) : 0,
    min: values.length ? Math.min(...values) : 0,
  };
}

async function exportExcel(cls: ClassRoom) {
  const XLSX = await import("xlsx");
  const rows = [
    ["التلميذ", "العلامة", "من", "النسبة %", "الحالة", "التاريخ"],
    ...cls.students.map((s) => [
      s.name,
      s.mark ? s.mark.score : "",
      s.mark ? s.mark.total : "",
      s.mark ? Number(pct(s.mark.score, s.mark.total).toFixed(1)) : "",
      s.mark ? "تم التصحيح" : "لم يتم التصحيح",
      s.mark ? new Date(s.mark.at).toLocaleDateString("fr-FR") : "",
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 24 },
    { wch: 10 },
    { wch: 8 },
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "كشف النقاط");
  XLSX.writeFile(wb, `كشف-النقاط-${cls.name}.xlsx`);
}

type Insights = {
  issues: { question_number: number; headline: string; detail: string }[];
  recommendations: string[];
};

function aggregates(cls: ClassRoom | undefined) {
  const map = new Map<
    number,
    {
      question_number: number;
      students: number;
      lost_points: number;
      possible_points: number;
      students_with_errors: number;
      correct_answer?: string;
    }
  >();
  for (const st of cls?.students ?? []) {
    for (const q of st.mark?.questions ?? []) {
      const cur = map.get(q.question_number) ?? {
        question_number: q.question_number,
        students: 0,
        lost_points: 0,
        possible_points: 0,
        students_with_errors: 0,
        ...(q.correct_answer ? { correct_answer: q.correct_answer } : {}),
      };
      const lost = Math.max(q.points_possible - q.points_earned, 0);
      cur.students += 1;
      cur.lost_points += lost;
      cur.possible_points += q.points_possible;
      if (lost > 0) cur.students_with_errors += 1;
      map.set(q.question_number, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.lost_points - a.lost_points);
}

function CommonErrorsCard({ cls }: { cls: ClassRoom | undefined }) {
  const analyze = useServerFn(analyzeClassErrors);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = aggregates(cls);

  async function run() {
    if (!cls || rows.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = (await analyze({
        data: { className: cls.name, aggregates: rows.slice(0, 40) },
      })) as Insights;
      setData(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        msg.includes("RATE_LIMIT")
          ? "الخدمة مشغولة حاليًا، حاول بعد قليل."
          : msg.includes("NO_CREDITS")
            ? "نفد رصيد الذكاء الاصطناعي."
            : "تعذّر التحليل، حاول مجددًا.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-5 py-5">
      <h2 className="text-base font-bold text-foreground">
        كاشف الأخطاء الشائعة والتوصيات
      </h2>
      <p className="text-xs text-muted-foreground">
        تحليل ذكي للأسئلة التي فقد فيها القسم أكبر قدر من النقاط.
      </p>

      {rows.length === 0 ? (
        <p className="rounded-xl bg-muted/50 px-4 py-4 text-center text-xs text-muted-foreground">
          صحّح ورقتين على الأقل مع حفظ العلامات لعرض التحليل.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {rows.slice(0, 3).map((r) => {
              const pctLost = r.possible_points
                ? (r.lost_points / r.possible_points) * 100
                : 0;
              return (
                <li
                  key={r.question_number}
                  className="flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-4 py-3 text-sm"
                >
                  <span className="font-semibold text-foreground">
                    السؤال {r.question_number}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {r.students_with_errors}/{r.students} تلميذ أخطأ —{" "}
                    <span className="font-bold text-warning" dir="ltr">
                      {pctLost.toFixed(0)}%
                    </span>{" "}
                    من النقاط ضائعة
                  </span>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            disabled={loading}
            onClick={() => void run()}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
          >
            {loading && (
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {loading ? "جارٍ التحليل…" : "تحليل بالذكاء الاصطناعي"}
          </button>
        </>
      )}

      {error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-center text-xs text-destructive">
          {error}
        </p>
      )}

      {data && (
        <div className="flex flex-col gap-3">
          {data.issues.map((it) => (
            <div
              key={`${it.question_number}-${it.headline}`}
              className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3"
            >
              <p className="text-sm font-bold text-foreground">
                {it.headline}
              </p>
              {it.detail && (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {it.detail}
                </p>
              )}
            </div>
          ))}
          {data.recommendations.length > 0 && (
            <ul className="flex flex-col gap-2 rounded-xl bg-muted/50 px-4 py-3">
              {data.recommendations.map((r) => (
                <li key={r} className="text-xs leading-relaxed text-foreground">
                  • {r}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function ReportsPage() {
  const { roster, ready } = useRosterStore();
  const [classId, setClassId] = useState<string | null>(null);
  const cls = roster.find((c) => c.id === (classId ?? roster[0]?.id));
  const s = stats(cls);

  return (
    <main
      dir="rtl"
      lang="ar"
      className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-5 py-10"
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-foreground">التقارير</h1>
        <p className="text-sm text-muted-foreground">
          إحصائيات الأقسام وكشوف النقاط. تُدار الأقسام والتلاميذ من تبويب
          التصحيح.
        </p>
      </header>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          القسم
        </span>
        <select
          value={cls?.id ?? ""}
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

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "معدل القسم", value: `${s.avg.toFixed(1)}%` },
          { label: "أعلى علامة", value: `${s.max.toFixed(1)}%` },
          { label: "أدنى علامة", value: `${s.min.toFixed(1)}%` },
          { label: "تم تصحيحهم", value: `${s.gradedCount}/${s.count}` },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-border bg-card px-4 py-5 text-center"
          >
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p
              className="mt-1 text-2xl font-black tabular-nums text-primary"
              dir="ltr"
            >
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <CommonErrorsCard cls={cls} />

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-right font-semibold">التلميذ</th>
              <th className="px-4 py-3 text-right font-semibold">العلامة</th>
              <th className="px-4 py-3 text-right font-semibold">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {(cls?.students ?? []).map((st) => (
              <tr key={st.id} className="border-t border-border">
                <td className="px-4 py-3 font-semibold text-foreground">
                  {st.name}
                </td>
                <td className="px-4 py-3 tabular-nums text-foreground" dir="ltr">
                  {st.mark ? `${st.mark.score}/${st.mark.total}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      st.mark
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {st.mark ? "تم التصحيح" : "لم يتم التصحيح"}
                  </span>
                </td>
              </tr>
            ))}
            {ready && (cls?.students.length ?? 0) === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  لا يوجد تلاميذ في هذا القسم.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        disabled={!cls}
        onClick={() => cls && void exportExcel(cls)}
        className="mb-20 w-full rounded-2xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground shadow-md transition-all hover:brightness-110 disabled:opacity-40"
      >
        تصدير إلى Excel
      </button>
    </main>
  );
}
