import { created, methods, route } from "@/server/http/route";
import { sensitiveLimiter } from "@/server/http/rate-limit";
import { contactSchema } from "@/server/modules/contact/contact.schemas";
import { submitContactMessage } from "@/server/modules/contact/contact.service";

/** POST /api/contact → 201 { message } (public; stored for the admin inbox, admin emailed). */
export const { GET, POST, PUT, PATCH, DELETE } = methods({
  POST: route({ limiter: sensitiveLimiter, body: contactSchema }, (ctx) => submitContactMessage(ctx.body).then(created)),
});
