import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-base font-bold text-foreground">
          ⚠️ كاشف الأخطاء الشائعة
        </h2>
        {commonErrors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            لا توجد أخطاء شائعة بعد. صحّح أوراق التلاميذ لعرض التحليل.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {commonErrors.map((e) => (
              <li
                key={e.q}
                className="flex items-center justify-between gap-3 rounded-xl bg-destructive/10 px-3 py-2.5"
              >
                <span className="text-sm font-semibold text-foreground">
                  السؤال {e.q}
                </span>
                <span className="text-xs font-bold text-destructive">
                  {e.missed} من {e.graded} تلميذًا أخطأوا (
                  {e.rate.toFixed(0)}%)
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

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
