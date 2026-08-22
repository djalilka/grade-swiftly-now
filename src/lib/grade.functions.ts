import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const dataUrl = z
  .string()
  .min(32)
  .max(12_000_000)
  .refine((v) => v.startsWith("data:image/"), "Invalid image");

const Input = z.object({
  studentImage: dataUrl,
  keyImage: dataUrl,
});

export const gradeSubmission = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const { gradeSheets } = await import("./grader.server");
    return gradeSheets(data.studentImage, data.keyImage);
  });
