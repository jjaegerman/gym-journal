import { z } from "npm:zod";

export const OpenAILogDetails = z.object({
    exerciseName: z.string(),
    weight: z.number().or(z.null()),
    weightUnit: z.enum(["kg", "lbs"]).or(z.null()),
    repetitions: z.number().or(z.null()),
    duration: z.iso.duration().or(z.null()),
    effort: z.enum(["low", "medium", "high"]).or(z.null()),
})
