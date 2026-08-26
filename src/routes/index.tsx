import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { gradeSubmission } from "@/lib/grade.functions";
import { setLastResult, type GradeResult } from "@/lib/result-store";
import {
  useRosterStore,
  saveMark,
  nextStudentId,
} from "@/lib/roster-store";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TashihAI — تصحيح أوراق الإجابة بالذكاء الاصطناعي" },
      {
        name: "description",
        content:
          "ارفع أوراق إجابة الطالب وأوراق التصحيح واحصل على العلامة النهائية فورًا. يدعم العربية والفرنسية وعدة صفحات.",
      },
      { property: "og:title", content: "TashihAI — تصحيح آلي لأوراق الإجابة" },
      {
        property: "og:description",
        content: "علامة نهائية فورية من أوراق الطالب وأوراق التصحيح.",
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
const MAX_FILES = 10;

type Picked = { id: string; file: File; url: string };

function UploadField({
  label,
  items,
  onChange,
}: {
  label: string;
  items: Picked[];
  onChange: (next: Picked[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [invalid, setInvalid] = useState(false);

  function accept(files: FileList | null | undefined) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    const valid = list.filter((f) => ACCEPTED.includes(f.type));
    setInvalid(valid.length !== list.length);
    if (valid.length === 0) return;
    const next = [
      ...items,
      ...valid.map((f) => ({
        id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2)}`,
        file: f,
        url: URL.createObjectURL(f),
      })),
    ].slice(0, MAX_FILES);
    onChange(next);
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [it] = next.splice(index, 1);
    next.splice(target, 0, it!);
    onChange(next);
  }

  function remove(index: number) {
    const next = [...items];
    const [it] = next.splice(index, 1);
    if (it) URL.revokeObjectURL(it.url);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
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
          accept(e.dataTransfer.files);
        }}
        className={`flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card px-5 py-8 text-center transition-colors hover:border-primary hover:bg-accent ${
          dragging ? "border-primary bg-accent" : "border-border"
        }`}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-2xl">
          ↑
        </span>
        <span className="text-base font-semibold text-foreground">{label}</span>
        <span
          className={`text-xs ${invalid ? "text-destructive" : "text-muted-foreground"}`}
        >
          {invalid
            ? "بعض الملفات غير مدعومة — استعمل JPG أو PNG"
            : items.length > 0
              ? `${items.length} صفحة — اضغط لإضافة المزيد`
              : "اضغط أو اسحب الصور هنا (عدة صفحات مدعومة)"}
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={(e) => {
            accept(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="flex gap-3 overflow-x-auto pb-1">
          {items.map((it, i) => (
            <li
              key={it.id}
              className="relative shrink-0 rounded-xl border border-border bg-card p-2"
            >
              <img
                src={it.url}
                alt={`${label} — صفحة ${i + 1}`}
                className="h-24 w-20 rounded-lg object-cover"
              />
              <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                {i + 1}
              </span>
              <div className="mt-2 flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="تحريك لليمين"
                  className="rounded-md px-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  ›
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label="حذف الصفحة"
                  className="rounded-md px-2 text-xs font-semibold text-destructive hover:underline"
                >
                  حذف
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                  aria-label="تحريك لليسار"
                  className="rounded-md px-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  ‹
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Index() {
  const grade = useServerFn(gradeSubmission);
  const navigate = useNavigate();
  const { roster } = useRosterStore();
  const [classId, setClassId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [student, setStudent] = useState<Picked[]>([]);
  const [key, setKey] = useState<Picked[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const selectedClass = roster.find((c) => c.id === classId) ?? null;
  const selectedStudent =
    selectedClass?.students.find((s) => s.id === studentId) ?? null;

  const ready = student.length > 0 && key.length > 0 && !loading;

  function resetSheets() {
    setStudent([]);
    setKey([]);
    setResult(null);
    setError(null);
  }

  function onSaveAndNext() {
    if (!result || !selectedClass || !selectedStudent) return;
    saveMark(selectedClass.id, selectedStudent.id, result.score, result.total);
    const next = nextStudentId(selectedClass.id, selectedStudent.id);
    resetSheets();
    setStudentId(next);
    setSavedMsg(
      next ? "تم حفظ العلامة — التلميذ التالي" : "تم حفظ العلامة — انتهى القسم",
    );
    setTimeout(() => setSavedMsg(null), 2500);
  }

  async function onGrade() {
    if (student.length === 0 || key.length === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const [studentImages, keyImages] = await Promise.all([
        Promise.all(student.map((p) => readFile(p.file))),
        Promise.all(key.map((p) => readFile(p.file))),
      ]);
      const res = (await grade({
        data: { studentImages, keyImages },
      })) as GradeResult;
      setResult(res);
      setLastResult(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        msg.includes("RATE_LIMIT")
          ? "الخدمة مشغولة حاليًا، حاول بعد قليل."
          : msg.includes("NO_CREDITS")
            ? "نفد رصيد الذكاء الاصطناعي. يرجى إضافة رصيد."
            : msg.includes("PARSE_ERROR") || msg.includes("UNREADABLE")
              ? "تعذّرت قراءة الصور بوضوح، الرجاء التقاط صور أوضح."
              : "تعذّر التصحيح. تأكد من وضوح الصور وحاول مجددًا.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ---- Step 1: pick class + student (with inline roster management) ----
  if (!selectedStudent) {
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
            تحديد القسم والتلميذ قبل بدء التصحيح.
          </p>
        </header>

        {savedMsg && (
          <p className="rounded-xl bg-primary/10 px-4 py-3 text-center text-sm font-semibold text-primary">
            {savedMsg}
          </p>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-foreground">القسم</h2>
          <div className="flex gap-2">
            <select
              value={classId ?? ""}
              onChange={(e) => {
                setClassId(e.target.value || null);
                setStudentId(null);
              }}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-semibold text-foreground"
            >
              <option value="">اختر القسم…</option>
              {roster.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setModal("class")}
              className="shrink-0 rounded-xl bg-secondary px-4 text-sm font-bold text-foreground hover:bg-accent"
            >
              + إضافة قسم
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-foreground">التلميذ</h2>
          <div className="flex gap-2">
            <select
              value={studentId ?? ""}
              disabled={!selectedClass}
              onChange={(e) => {
                resetSheets();
                setStudentId(e.target.value || null);
              }}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-semibold text-foreground disabled:opacity-40"
            >
              <option value="">
                {selectedClass ? "اختر التلميذ…" : "اختر القسم أولًا"}
              </option>
              {(selectedClass?.students ?? []).map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                  {st.mark ? ` — ${st.mark.score}/${st.mark.total}` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selectedClass}
              onClick={() => setModal("student")}
              className="shrink-0 rounded-xl bg-secondary px-4 text-sm font-bold text-foreground hover:bg-accent disabled:opacity-40"
            >
              + إضافة تلميذ
            </button>
          </div>

          {selectedClass && (
            <ul className="flex flex-col gap-2">
              {selectedClass.students.map((st) => (
                <li key={st.id}>
                  <button
                    type="button"
                    onClick={() => {
                      resetSheets();
                      setStudentId(st.id);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-right transition-colors hover:border-primary hover:bg-accent"
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {st.name}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        st.mark
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                      dir={st.mark ? "rtl" : undefined}
                    >
                      {st.mark
                        ? `تم التصحيح (${st.mark.score}/${st.mark.total})`
                        : "لم يتم التصحيح"}
                    </span>
                  </button>
                </li>
              ))}
              {selectedClass.students.length === 0 && (
                <li className="rounded-2xl bg-muted/50 px-5 py-6 text-center text-sm text-muted-foreground">
                  لا يوجد تلاميذ — أضفهم بزر «+ إضافة تلميذ».
                </li>
              )}
            </ul>
          )}
        </section>

        {modal && (
          <RosterModal
            mode={modal}
            classId={selectedClass?.id ?? null}
            onClose={() => setModal(null)}
            onCreatedClass={(id) => {
              setClassId(id);
              setStudentId(null);
            }}
          />
        )}

        <div className="h-16" />
      </main>
    );
  }


  // ---- Step 2: grading UI (unchanged) ----
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
          ارفع أوراق الطالب وأوراق التصحيح، واحصل على العلامة النهائية.
        </p>
      </header>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-3.5">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">
            {selectedClass?.name}
          </span>
          <span className="text-sm font-bold text-foreground">
            {selectedStudent.name}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            resetSheets();
            setStudentId(null);
          }}
          className="rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent"
        >
          تغيير
        </button>
      </div>

      <div className="flex flex-col gap-6">
        <UploadField
          label="أوراق إجابة الطالب"
          items={student}
          onChange={setStudent}
        />
        <UploadField
          label="أوراق التصحيح النموذجية"
          items={key}
          onChange={setKey}
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
            onClick={() => navigate({ to: "/results" })}
            className="mt-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
          >
            عرض التفاصيل
          </button>
          <button
            type="button"
            onClick={onSaveAndNext}
            className="mt-1 w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            حفظ العلامة للتلميذ والانتقال للتالي
          </button>
        </section>
      )}

      <div className="h-16" />
    </main>
  );
}

