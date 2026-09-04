import { useEffect, useState } from "react";

export type MarkQuestion = {
  question_number: number;
  correct_answer: string;
  student_answer: string;
  points_earned: number;
  points_possible: number;
  reasoning: string;
};

export type Mark = {
  score: number;
  total: number;
  at: string;
  questions?: MarkQuestion[];
};

export type Student = {
  id: string;
  name: string;
  mark?: Mark;
};

export type ClassRoom = {
  id: string;
  name: string;
  students: Student[];
};

export type Settings = {
  geminiApiKey: string;
  email: string;
  dark: boolean;
};

export type Rubric = {
  id: string;
  title: string;
  images: string[];
  at: string;
};

const ROSTER_KEY = "tashihai:roster";
const SETTINGS_KEY = "tashihai:settings";
const RUBRIC_KEY = "tashihai:rubrics";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}


const DEFAULT_ROSTER: ClassRoom[] = [];

const DEFAULT_SETTINGS: Settings = { geminiApiKey: "", email: "", dark: false };

let roster: ClassRoom[] = DEFAULT_ROSTER;
let settings: Settings = DEFAULT_SETTINGS;
let rubrics: Rubric[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const r = localStorage.getItem(ROSTER_KEY);
    if (r) roster = JSON.parse(r) as ClassRoom[];
    const s = localStorage.getItem(SETTINGS_KEY);
    if (s) settings = { ...DEFAULT_SETTINGS, ...(JSON.parse(s) as Settings) };
    const k = localStorage.getItem(RUBRIC_KEY);
    if (k) rubrics = JSON.parse(k) as Rubric[];
  } catch {
    /* ignore */
  }
}

function persistRubrics() {
  try {
    localStorage.setItem(RUBRIC_KEY, JSON.stringify(rubrics));
    return true;
  } catch {
    return false;
  }
}

export function getRubrics() {
  hydrate();
  return rubrics;
}

export function saveRubric(title: string, images: string[]) {
  const next: Rubric = {
    id: uid(),
    title,
    images,
    at: new Date().toISOString(),
  };
  const prev = rubrics;
  rubrics = [next, ...getRubrics()];
  const ok = persistRubrics();
  if (!ok) rubrics = prev;
  emit();
  return ok;
}

export function removeRubric(id: string) {
  rubrics = getRubrics().filter((r) => r.id !== id);
  persistRubrics();
  emit();
}


function persistRoster() {
  try {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
  } catch {
    /* ignore */
  }
}

function persistSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getRoster() {
  hydrate();
  return roster;
}

export function getSettings() {
  hydrate();
  return settings;
}

export function updateSettings(patch: Partial<Settings>) {
  settings = { ...getSettings(), ...patch };
  persistSettings();
  emit();
}

export function addClass(name: string) {
  const id = uid();
  roster = [...getRoster(), { id, name, students: [] }];
  persistRoster();
  emit();
  return id;
}


export function addStudent(classId: string, name: string) {
  roster = getRoster().map((c) =>
    c.id === classId
      ? { ...c, students: [...c.students, { id: uid(), name }] }
      : c,
  );
  persistRoster();
  emit();
}

export function addStudentsBulk(classId: string, text: string) {
  const names = text
    .split(/\r?\n|,/)
    .map((n) => n.trim())
    .filter(Boolean);
  if (names.length === 0) return 0;
  roster = getRoster().map((c) =>
    c.id === classId
      ? {
          ...c,
          students: [...c.students, ...names.map((name) => ({ id: uid(), name }))],
        }
      : c,
  );
  persistRoster();
  emit();
  return names.length;
}

export function renameClass(classId: string, name: string) {
  roster = getRoster().map((c) => (c.id === classId ? { ...c, name } : c));
  persistRoster();
  emit();
}

export function removeClass(classId: string) {
  roster = getRoster().filter((c) => c.id !== classId);
  persistRoster();
  emit();
}

export function removeStudent(classId: string, studentId: string) {
  roster = getRoster().map((c) =>
    c.id === classId
      ? { ...c, students: c.students.filter((s) => s.id !== studentId) }
      : c,
  );
  persistRoster();
  emit();
}

export function saveMark(
  classId: string,
  studentId: string,
  score: number,
  total: number,
  questions?: MarkQuestion[],
) {
  roster = getRoster().map((c) =>
    c.id === classId
      ? {
          ...c,
          students: c.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  mark: {
                    score,
                    total,
                    at: new Date().toISOString(),
                    ...(questions ? { questions } : {}),
                  },
                }
              : s,
          ),
        }
      : c,
  );
  persistRoster();
  emit();
}


/* ---------------- Documents vault + teacher notes ---------------- */

export type TeacherDoc = {
  id: string;
  title: string;
  kind: "pdf" | "image";
  dataUrl: string;
  at: string;
};

const DOCS_KEY = "tashihai:docs";
const NOTES_KEY = "tashihai:notes";
const PENDING_KEY = "tashihai:pending-rubric";

let docs: TeacherDoc[] = [];
let notes: Record<string, string> = {};
let docsHydrated = false;

function hydrateDocs() {
  if (docsHydrated || typeof window === "undefined") return;
  docsHydrated = true;
  try {
    const d = localStorage.getItem(DOCS_KEY);
    if (d) docs = JSON.parse(d) as TeacherDoc[];
    const n = localStorage.getItem(NOTES_KEY);
    if (n) notes = JSON.parse(n) as Record<string, string>;
  } catch {
    /* ignore */
  }
}

export function getDocs() {
  hydrateDocs();
  return docs;
}

export function addDoc(title: string, kind: "pdf" | "image", dataUrl: string) {
  const prev = getDocs();
  docs = [{ id: uid(), title, kind, dataUrl, at: new Date().toISOString() }, ...prev];
  try {
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  } catch {
    docs = prev;
    emit();
    return false;
  }
  emit();
  return true;
}

export function removeDoc(id: string) {
  docs = getDocs().filter((d) => d.id !== id);
  try {
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  } catch {
    /* ignore */
  }
  emit();
}

export function getNotes() {
  hydrateDocs();
  return notes;
}

export function setNote(classId: string, text: string) {
  notes = { ...getNotes(), [classId]: text };
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch {
    /* ignore */
  }
  emit();
}

/** Cross-tab hand-off: "use this rubric now in grading". */
export function setPendingRubric(id: string) {
  try {
    sessionStorage.setItem(PENDING_KEY, id);
  } catch {
    /* ignore */
  }
}

export function takePendingRubric() {
  try {
    const id = sessionStorage.getItem(PENDING_KEY);
    if (id) sessionStorage.removeItem(PENDING_KEY);
    return id;
  } catch {
    return null;
  }
}

export function nextStudentId(classId: string, studentId: string) {
  const cls = getRoster().find((c) => c.id === classId);
  if (!cls) return null;
  const i = cls.students.findIndex((s) => s.id === studentId);
  const next = cls.students[i + 1];
  return next ? next.id : null;
}

/** Subscribe a component to roster + settings changes (client-only). */
export function useRosterStore() {
  const [, force] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
    hydrateDocs();
    setReady(true);
    return subscribe(() => force((n) => n + 1));
  }, []);

  return {
    roster: getRoster(),
    settings: getSettings(),
    rubrics: getRubrics(),
    docs: getDocs(),
    notes: getNotes(),
    ready,
  };
}

