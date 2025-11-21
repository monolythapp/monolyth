import { z } from "zod";

export const AnalyzeEntitySchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const AnalyzeResultSchema = z.object({
  summary: z.string(),
  entities: z.array(AnalyzeEntitySchema),
  dates: z.array(z.string()),
  nextAction: z.string().nullable(),
});

export type AnalyzeEntity = z.infer<typeof AnalyzeEntitySchema>;
export type AnalyzeResult = z.infer<typeof AnalyzeResultSchema>;

