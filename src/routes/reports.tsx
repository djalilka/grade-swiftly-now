import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useRosterStore,
  addClass,
  addStudent,
  addStudentsBulk,
  removeClass,
  removeStudent,
  renameClass,
  type ClassRoom,
} from "@/lib/roster-store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "التقارير والأقسام — TashihAI" },
      {
        name: "description",
        content:
          "إدارة الأقسام والتلاميذ، كشف النقاط، معدل القسم وأعلى وأدنى علامة، وتصدير إلى Excel.",
      },
      { property: "og:title", content: "التقارير والأقسام — TashihAI" },
      {
        property: "og:description",
        content: "أقسامك وتلاميذك وكشوف النقاط في مكان واحد.",
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
  ws["!cols"] = [{ wch: 24 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 16 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "كشف النقاط");
  XLSX.writeFile(wb, `كشف-النقاط-${cls.name}.xlsx`);
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function ClassCard({ cls }: { cls: ClassRoom }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cls.name);
  const [single, setSingle] = useState("");
  const [bulk, setBulk] = useState("");

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground"
          />
        ) : (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground">{cls.name}</span>
            <span className="text-xs text-muted-foreground">
              {cls.students.length} تلميذ
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {editing ? (
            <button
              type="button"
              onClick={() => {
                if (name.trim()) renameClass(cls.id, name.trim());
                setEditing(false);
              }}
              className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
            >
              حفظ
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent"
            >
              تعديل
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent"
          >
            {open ? "إغلاق" : "التلاميذ"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`حذف القسم «${cls.name}» وكل تلاميذه؟`))
                removeClass(cls.id);
            }}
            className="rounded-xl px-2 py-2 text-xs font-semibold text-destructive hover:underline"
          >
            حذف
          </button>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <ul className="flex flex-col gap-1.5">
            {cls.students.map((st) => (
              <li
                key={st.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2"
              >
                <span className="text-sm text-foreground">{st.name}</span>
                <button
                  type="button"
                  onClick={() => removeStudent(cls.id, st.id)}
                  className="text-xs font-semibold text-destructive hover:underline"
                >
                  حذف
                </button>
              </li>
            ))}
            {cls.students.length === 0 && (
              <li className="rounded-xl bg-muted/50 px-3 py-4 text-center text-xs text-muted-foreground">
                لا يوجد تلاميذ بعد.
              </li>
            )}
          </ul>

          <div className="flex gap-2">
            <input
              value={single}
              placeholder="اسم تلميذ واحد"
              onChange={(e) => setSingle(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
            />
            <button
              type="button"
              disabled={!single.trim()}
              onClick={() => {
                addStudent(cls.id, single.trim());
                setSingle("");
              }}
              className="rounded-xl bg-secondary px-4 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-40"
            >
              إضافة
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <textarea
              value={bulk}
              rows={4}
              placeholder={"إضافة دفعة: اسم في كل سطر\nأحمد بن علي\nسارة مرزوق"}
              onChange={(e) => setBulk(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
            />
            <button
              type="button"
              disabled={!bulk.trim()}
              onClick={() => {
                addStudentsBulk(cls.id, bulk);
                setBulk("");
              }}
              className="self-start rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-40"
            >
              إضافة القائمة
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function ReportsPage() {
  const { roster, ready } = useRosterStore();
  const [classId, setClassId] = useState<string | null>(null);
  const [newClass, setNewClass] = useState("");
  const [creating, setCreating] = useState(false);
  const cls = roster.find((c) => c.id === (classId ?? roster[0]?.id));
  const s = stats(cls);

  return (
    <main
      dir="rtl"
      lang="ar"
      className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-8 px-5 py-10"
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-foreground">
          التقارير والأقسام
        </h1>
        <p className="text-sm text-muted-foreground">
          إدارة الأقسام والتلاميذ، ومتابعة كشوف النقاط.
        </p>
      </header>

      <Section
        title="إدارة الأقسام والتلاميذ"
        subtitle="أنشئ الأقسام وأضف التلاميذ فرديًا أو دفعة واحدة."
      >
        {creating ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={newClass}
              placeholder="اسم القسم الجديد"
              onChange={(e) => setNewClass(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
            />
            <button
              type="button"
              disabled={!newClass.trim()}
              onClick={() => {
                addClass(newClass.trim());
                setNewClass("");
                setCreating(false);
              }}
              className="rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              إنشاء
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-xl bg-secondary px-4 text-sm font-semibold text-foreground hover:bg-accent"
            >
              إلغاء
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="self-start rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            + إنشاء قسم جديد
          </button>
        )}

        <ul className="flex flex-col gap-3">
          {roster.map((c) => (
            <ClassCard key={c.id} cls={c} />
          ))}
          {ready && roster.length === 0 && (
            <li className="rounded-2xl bg-muted/50 px-5 py-6 text-center text-sm text-muted-foreground">
              لا توجد أقسام — أنشئ قسمك الأول.
            </li>
          )}
        </ul>
      </Section>

      <Section title="كشف النقاط والإحصائيات">
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
                  <td
                    className="px-4 py-3 tabular-nums text-foreground"
                    dir="ltr"
                  >
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
          تصدير كشف النقاط إلى Excel
        </button>
      </Section>
    </main>
  );
}
