import { z } from "zod";

export const slugParams = z.object({
  slug: z.string().trim().min(1).max(191).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug"),
});
export type SlugParams = z.infer<typeof slugParams>;
