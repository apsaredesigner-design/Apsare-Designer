import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { listQuery } from "@/server/modules/admin/admin.contact.schemas";
import { listContactMessages } from "@/server/modules/admin/admin.contact.service";

/** GET /api/admin/contact-messages: the contact-form inbox, newest first. */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({ query: listQuery }, ({ query }) => listContactMessages(query)),
});
