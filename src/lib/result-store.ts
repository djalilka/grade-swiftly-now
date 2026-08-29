export type QuestionResult = {
  question_number: number;
  correct_answer: string;
  student_answer: string;
  points_earned: number;
  points_possible: number;
  reasoning: string;
};

export type GradeResult = {
  score: number;
  total: number;
  questions: QuestionResult[];
};

const KEY = "tashihai:last-result";

let memory: GradeResult | null = null;

export function setLastResult(result: GradeResult) {
  memory = result;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(result));
  } catch {
    /* ignore */
  }
}

export function getLastResult(): GradeResult | null {
  if (memory) return memory;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    memory = JSON.parse(raw) as GradeResult;
    return memory;
  } catch {
    return null;
  }
}
