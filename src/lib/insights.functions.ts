import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  className: z.string().min(1).max(120),
  aggregates: z
    .array(
      z.object({
        question_number: z.number(),
        students: z.number(),
        lost_points: z.number(),
        possible_points: z.number(),
        students_with_errors: z.number(),
        correct_answer: z.string().max(300).optional(),
      }),
    )
    .min(1)
    .max(60),
});

export const analyzeClassErrors = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const { analyzeClass } = await import("./insights.server");
    return analyzeClass(data.className, data.aggregates);
  });
