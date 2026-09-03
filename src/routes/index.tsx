import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { gradeSubmission, extractStudentNames } from "@/lib/grade.functions";
import { setLastResult, type GradeResult } from "@/lib/result-store";
import {
  useRosterStore,
  saveMark,
  nextStudentId,
  addClass,
  addStudentsBulk,
  saveRubric,
  removeRubric,
  removeClass,
  removeStudent,
} from "@/lib/roster-store";
import { Trash2 } from "lucide-react";

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

type Picked = { id: string; url: string; file?: File; dataUrl?: string };

function pickedToDataUrl(p: Picked): Promise<string> {
  if (p.dataUrl) return Promise.resolve(p.dataUrl);
  if (p.file) return readFile(p.file);
  return Promise.reject(new Error("empty_page"));
}

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
    if (it?.file) URL.revokeObjectURL(it.url);
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

function RosterModal({
  mode,
  classId,
  onClose,
  onCreatedClass,
}: {
  mode: "class" | "student";
  classId: string | null;
  onClose: () => void;
  onCreatedClass: (id: string) => void;
}) {
  const [value, setValue] = useState("");
  const isClass = mode === "class";

  function submit() {
    const text = value.trim();
    if (!text) return;
    if (isClass) {
      onCreatedClass(addClass(text));
    } else if (classId) {
      addStudentsBulk(classId, text);
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-5"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="w-full max-w-md rounded-3xl border border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-foreground">
          {isClass ? "إضافة قسم جديد" : "إضافة تلاميذ"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {isClass
            ? "اكتب اسم القسم."
            : "اسم واحد في كل سطر لإضافة عدة تلاميذ."}
        </p>
        {isClass ? (
          <input
            autoFocus
            value={value}
            placeholder="مثال: السنة الأولى - أ"
            onChange={(e) => setValue(e.target.value)}
            className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
          />
        ) : (
          <textarea
            autoFocus
            rows={5}
            value={value}
            placeholder={"أحمد بن علي\nسارة مرزوق"}
            onChange={(e) => setValue(e.target.value)}
            className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
          />
        )}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={!value.trim()}
            onClick={submit}
            className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-40"
          >
            إضافة
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-foreground hover:bg-accent"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Quick import (Excel / paste / image) ---------------- */

type ImportTab = "file" | "paste" | "image";

function QuickImportModal({
  classId,
  onClose,
  onImported,
}: {
  classId: string;
  onClose: () => void;
  onImported: (count: number) => void;
}) {
  const extract = useServerFn(extractStudentNames);
  const [tab, setTab] = useState<ImportTab>("file");
  const [names, setNames] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const tabs: { id: ImportTab; label: string }[] = [
    { id: "file", label: "ملف Excel/CSV" },
    { id: "paste", label: "لصق نصي" },
    { id: "image", label: "صورة القائمة" },
  ];

  async function onSheet(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = sheetName ? wb.Sheets[sheetName] : undefined;
      if (!ws) throw new Error("empty");
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
      const found: string[] = [];
      for (const row of rows) {
        for (const cell of row ?? []) {
          const v = String(cell ?? "").trim();
          if (!v || /^\d+([.,]\d+)?$/.test(v)) continue;
          found.push(v);
          break;
        }
      }
      const clean = found.filter(
        (n) => !/^(الاسم|اسم|nom|name|التلميذ|n°)$/i.test(n),
      );
      if (clean.length === 0) throw new Error("empty");
      setNames(clean);
    } catch {
      setErr("تعذّرت قراءة الملف. تأكد من أنه ملف Excel أو CSV صالح.");
    } finally {
      setBusy(false);
    }
  }

  async function onImage(files: FileList | null) {
    const list = Array.from(files ?? []).filter((f) =>
      ACCEPTED.includes(f.type),
    );
    if (list.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const images = await Promise.all(list.slice(0, 5).map(readFile));
      const res = (await extract({ data: { images } })) as { names: string[] };
      if (!res.names.length) throw new Error("empty");
      setNames(res.names);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setErr(
        msg.includes("RATE_LIMIT")
          ? "الخدمة مشغولة حاليًا، حاول بعد قليل."
          : msg.includes("NO_CREDITS")
            ? "نفد رصيد الذكاء الاصطناعي."
            : "تعذّرت قراءة الأسماء من الصورة، جرّب صورة أوضح.",
      );
    } finally {
      setBusy(false);
    }
  }

  function applyPaste() {
    const list = text
      .split(/\r?\n|,/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (list.length === 0) {
      setErr("لا توجد أسماء.");
      return;
    }
    setErr(null);
    setNames(list);
  }

  function confirmImport() {
    const added = addStudentsBulk(classId, names.join("\n"));
    onImported(added);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-5"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-foreground">استيراد سريع</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          استورد قائمة التلاميذ دفعة واحدة.
        </p>

        <div className="mt-4 flex gap-1 rounded-xl bg-secondary p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setErr(null);
              }}
              className={`flex-1 rounded-lg px-2 py-2 text-[11px] font-bold transition-colors ${
                tab === t.id
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === "file" && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-border bg-background px-5 py-8 text-center text-sm font-semibold text-foreground hover:border-primary hover:bg-accent"
              >
                اختر ملف .xlsx أو .csv
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  void onSheet(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <p className="text-xs text-muted-foreground">
                تُقرأ الأسماء من العمود الأول لكل سطر.
              </p>
            </div>
          )}

          {tab === "paste" && (
            <div className="flex flex-col gap-3">
              <textarea
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"أحمد بن علي\nسارة مرزوق"}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
              />
              <button
                type="button"
                onClick={applyPaste}
                className="self-start rounded-xl bg-secondary px-4 py-2.5 text-sm font-bold text-foreground hover:bg-accent"
              >
                تحليل الأسماء
              </button>
            </div>
          )}

          {tab === "image" && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => imgRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-border bg-background px-5 py-8 text-center text-sm font-semibold text-foreground hover:border-primary hover:bg-accent"
              >
                {busy ? "جارٍ قراءة الصورة…" : "اختر صورة قائمة التلاميذ"}
              </button>
              <input
                ref={imgRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(e) => {
                  void onImage(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </div>

        {err && (
          <p className="mt-3 rounded-xl bg-destructive/10 px-4 py-3 text-center text-xs text-destructive">
            {err}
          </p>
        )}

        {names.length > 0 && (
          <div className="mt-4 rounded-2xl border border-border bg-background p-3">
            <p className="text-xs font-bold text-foreground">
              {names.length} اسم جاهز للاستيراد
            </p>
            <ul className="mt-2 max-h-40 overflow-y-auto text-xs text-muted-foreground">
              {names.map((n, i) => (
                <li key={`${n}-${i}`} className="py-0.5">
                  {i + 1}. {n}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={names.length === 0 || busy}
            onClick={confirmImport}
            className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-40"
          >
            استيراد
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-foreground hover:bg-accent"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Breakdown card with manual verification ---------------- */

function QuestionCard({
  q,
  onChange,
}: {
  q: GradeResult["questions"][number];
  onChange: (next: GradeResult["questions"][number]) => void;
}) {
  const full = q.points_earned >= q.points_possible;
  const zero = q.points_earned <= 0;
  const needsCheck = !full;

  const tone = full
    ? "border-primary/40 bg-primary/5"
    : zero
      ? "border-destructive/40 bg-destructive/5"
      : "border-warning/50 bg-warning/10";

  const badge = full
    ? { text: "صحيحة", cls: "bg-primary/10 text-primary" }
    : zero
      ? { text: "خاطئة", cls: "bg-destructive/10 text-destructive" }
      : { text: "جزئية", cls: "bg-warning/20 text-warning-foreground" };

  return (
    <li className={`rounded-2xl border px-4 py-4 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-foreground">
          السؤال {q.question_number}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.cls}`}
          >
            {badge.text}
          </span>
          <span
            className="text-sm font-black tabular-nums text-foreground"
            dir="ltr"
          >
            {q.points_earned}/{q.points_possible}
          </span>
        </div>
      </div>

      <dl className="mt-3 flex flex-col gap-1.5 text-xs">
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted-foreground">الإجابة النموذجية:</dt>
          <dd className="font-semibold text-foreground">{q.correct_answer}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted-foreground">إجابة التلميذ:</dt>
          <dd className="font-semibold text-foreground">
            {q.student_answer || "—"}
          </dd>
        </div>
      </dl>

      {needsCheck ? (
        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-warning/50 bg-warning/10 p-3">
          <span className="text-[11px] font-bold text-warning-foreground">
            ⚠️ تحقق يدوي — يمكنك تعديل العلامة والملاحظة
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={q.points_possible}
              step="0.25"
              dir="ltr"
              value={q.points_earned}
              onChange={(e) => {
                const v = Number(e.target.value);
                onChange({
                  ...q,
                  points_earned: Number.isFinite(v)
                    ? Math.min(Math.max(v, 0), q.points_possible)
                    : 0,
                });
              }}
              className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-bold tabular-nums text-foreground"
            />
            <span className="text-xs text-muted-foreground">
              من {q.points_possible}
            </span>
          </div>
          <textarea
            rows={2}
            value={q.reasoning}
            onChange={(e) => onChange({ ...q, reasoning: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
          />
        </div>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {q.reasoning}
        </p>
      )}
    </li>
  );
}

/* ---------------- Page ---------------- */

function Index() {
  const grade = useServerFn(gradeSubmission);
  const navigate = useNavigate();
  const { roster, rubrics } = useRosterStore();
  const [classId, setClassId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [student, setStudent] = useState<Picked[]>([]);
  const [key, setKey] = useState<Picked[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [modal, setModal] = useState<"class" | "student" | "import" | null>(
    null,
  );
  const [rubricTitle, setRubricTitle] = useState("");
  const [rubricMsg, setRubricMsg] = useState<string | null>(null);
  const [loadedRubricId, setLoadedRubricId] = useState("");

  const selectedClass = roster.find((c) => c.id === classId) ?? null;
  const selectedStudent =
    selectedClass?.students.find((s) => s.id === studentId) ?? null;

  const ready = student.length > 0 && key.length > 0 && !loading;

  function flash(setter: (v: string | null) => void, msg: string) {
    setter(msg);
    setTimeout(() => setter(null), 2500);
  }

  function resetSheets() {
    setStudent([]);
    setKey([]);
    setResult(null);
    setError(null);
  }

  function onSaveAndNext() {
    if (!result || !selectedClass || !selectedStudent) return;
    saveMark(
      selectedClass.id,
      selectedStudent.id,
      result.score,
      result.total,
      result.questions,
    );
    const next = nextStudentId(selectedClass.id, selectedStudent.id);
    // keep the model answer sheets loaded, clear only the student's sheets
    setStudent([]);
    setResult(null);
    setError(null);
    setStudentId(next);
    flash(
      setSavedMsg,
      next ? "تم حفظ العلامة — التلميذ التالي" : "تم حفظ العلامة — انتهى القسم",
    );
  }

  async function onSaveRubric() {
    const title = rubricTitle.trim();
    if (!title || key.length === 0) return;
    try {
      const images = await Promise.all(key.map(pickedToDataUrl));
      const ok = saveRubric(title, images);
      flash(
        setRubricMsg,
        ok ? "تم حفظ النموذج في المكتبة" : "الذاكرة ممتلئة — احذف نماذج قديمة",
      );
      if (ok) setRubricTitle("");
    } catch {
      flash(setRubricMsg, "تعذّر حفظ النموذج");
    }
  }

  function onLoadRubric(id: string) {
    setLoadedRubricId(id);
    const r = rubrics.find((x) => x.id === id);
    if (!r) return;
    setKey(
      r.images.map((dataUrl, i) => ({
        id: `${r.id}-${i}`,
        url: dataUrl,
        dataUrl,
      })),
    );
    setResult(null);
    flash(setRubricMsg, `تم تحميل «${r.title}»`);
  }

  function updateQuestion(i: number, q: GradeResult["questions"][number]) {
    setResult((prev) => {
      if (!prev) return prev;
      const questions = prev.questions.map((old, idx) => (idx === i ? q : old));
      const score =
        Math.round(
          questions.reduce((s, x) => s + (x.points_earned || 0), 0) * 100,
        ) / 100;
      const next = { ...prev, questions, score };
      setLastResult(next);
      return next;
    });
  }

  async function onGrade() {
    if (student.length === 0 || key.length === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const [studentImages, keyImages] = await Promise.all([
        Promise.all(student.map(pickedToDataUrl)),
        Promise.all(key.map(pickedToDataUrl)),
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
            {selectedClass && (
              <button
                type="button"
                aria-label="حذف القسم"
                title="حذف القسم"
                onClick={() => {
                  if (
                    window.confirm(
                      `حذف القسم «${selectedClass.name}» وكل تلاميذه؟`,
                    )
                  ) {
                    removeClass(selectedClass.id);
                    setClassId(null);
                    setStudentId(null);
                  }
                }}
                className="shrink-0 rounded-xl border border-destructive/40 bg-destructive/10 px-3 text-destructive hover:bg-destructive/20"
              >
                <Trash2 size={18} />
              </button>
            )}
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

          <button
            type="button"
            disabled={!selectedClass}
            onClick={() => setModal("import")}
            className="self-start rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-primary hover:bg-accent disabled:opacity-40"
          >
            استيراد سريع
          </button>

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

        {(modal === "class" || modal === "student") && (
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

        {modal === "import" && selectedClass && (
          <QuickImportModal
            classId={selectedClass.id}
            onClose={() => setModal(null)}
            onImported={(n) => flash(setSavedMsg, `تم استيراد ${n} تلميذًا`)}
          />
        )}

        <div className="h-16" />
      </main>
    );
  }

  // ---- Step 2: grading UI ----
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

        <div className="flex flex-col gap-3">
          <UploadField
            label="أوراق التصحيح النموذجية"
            items={key}
            onChange={setKey}
          />

          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-4">
            <h3 className="text-sm font-bold text-foreground">
              مكتبة الاختبارات
            </h3>
            <div className="flex gap-2">
              <input
                value={rubricTitle}
                onChange={(e) => setRubricTitle(e.target.value)}
                placeholder="عنوان الاختبار"
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              />
              <button
                type="button"
                disabled={!rubricTitle.trim() || key.length === 0}
                onClick={() => void onSaveRubric()}
                className="shrink-0 rounded-xl bg-secondary px-3 text-xs font-bold text-foreground hover:bg-accent disabled:opacity-40"
              >
                حفظ هذا النموذج
              </button>
            </div>
            <div className="flex gap-2">
              <select
                value={loadedRubricId}
                onChange={(e) => onLoadRubric(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground"
              >
                <option value="">اختبار محفوظ…</option>
                {rubrics.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!loadedRubricId}
                onClick={() => {
                  removeRubric(loadedRubricId);
                  setLoadedRubricId("");
                }}
                className="shrink-0 rounded-xl bg-secondary px-3 text-xs font-semibold text-destructive hover:bg-accent disabled:opacity-40"
              >
                حذف
              </button>
            </div>
            {rubricMsg && (
              <p className="text-xs font-semibold text-primary">{rubricMsg}</p>
            )}
          </div>
        </div>
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
            حفظ العلامة والانتقال للتلميذ التالي
          </button>
        </section>
      )}

      {result && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-foreground">
            تفصيل الأسئلة
          </h2>
          <ul className="flex flex-col gap-3">
            {result.questions.map((q, i) => (
              <QuestionCard
                key={`${q.question_number}-${i}`}
                q={q}
                onChange={(next) => updateQuestion(i, next)}
              />
            ))}
          </ul>
        </section>
      )}

      <div className="h-16" />
    </main>
  );
}
