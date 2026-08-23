import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const dataUrl = z
  .string()
  .min(32)
  .max(12_000_000)
  .refine((v) => v.startsWith("data:image/"), "Invalid image");

const Input = z.object({
  studentImages: z.array(dataUrl).min(1).max(10),
  keyImages: z.array(dataUrl).min(1).max(10),
});

export const gradeSubmission = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const { gradeSheets } = await import("./grader.server");
    return gradeSheets(data.studentImages, data.keyImages);
  });
