import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useRosterStore, type ClassRoom } from "@/lib/roster-store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "تقارير الأقسام — TashihAI" },
      {
        name: "description",
        content:
          "إحصائيات القسم: المعدل، أعلى وأدنى علامة، وجدول بعلامات كل التلاميذ مع تصدير إلى Excel.",
      },
      { property: "og:title", content: "تقارير الأقسام — TashihAI" },
      {
        property: "og:description",
        content: "معدلات القسم وعلامات التلاميذ في جدول واحد.",
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
    graded,
    count: cls?.students.length ?? 0,
    gradedCount: graded.length,
    avg,
    max: values.length ? Math.max(...values) : 0,
    min: values.length ? Math.min(...values) : 0,
  };
}

function exportExcel(cls: ClassRoom) {
  const rows = [
    ["القسم", "التلميذ", "العلامة", "من", "النسبة %", "التاريخ"],
    ...cls.students.map((s) => [
      cls.name,
      s.name,
      s.mark ? String(s.mark.score) : "",
      s.mark ? String(s.mark.total) : "",
      s.mark ? pct(s.mark.score, s.mark.total).toFixed(1) : "",
      s.mark ? new Date(s.mark.at).toLocaleDateString("fr-FR") : "",
    ]),
  ];
  const csv = rows
    .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${cls.name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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
          إحصائيات الأقسام وعلامات التلاميذ المحفوظة.
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
          {roster.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <section className="grid grid-cols-2 gap-3">
        {[
          { label: "المعدل", value: `${s.avg.toFixed(1)}%` },
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
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-right font-semibold">التلميذ</th>
              <th className="px-4 py-3 text-right font-semibold">العلامة</th>
              <th className="px-4 py-3 text-right font-semibold">النسبة</th>
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
                <td
                  className="px-4 py-3 tabular-nums text-muted-foreground"
                  dir="ltr"
                >
                  {st.mark ? `${pct(st.mark.score, st.mark.total).toFixed(0)}%` : "—"}
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
      </section>

      <button
        type="button"
        disabled={!cls}
        onClick={() => cls && exportExcel(cls)}
        className="mb-20 w-full rounded-2xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground shadow-md transition-all hover:brightness-110 disabled:opacity-40"
      >
        تصدير إلى Excel
      </button>
    </main>
  );
}
