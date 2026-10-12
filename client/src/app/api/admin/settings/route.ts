import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { settingsSchema } from "@/server/modules/admin/admin.settings.schemas";
import { getSettings, updateSettings } from "@/server/modules/admin/admin.settings.service";

/** GET / PUT /api/admin/settings: the store settings singleton (id 1). */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({}, () => getSettings()),
  PUT: adminRoute({ body: settingsSchema }, ({ body }) => updateSettings(body)),
});
