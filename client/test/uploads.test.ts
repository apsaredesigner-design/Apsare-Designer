// Port of the removed Express suite's test/uploads.test.ts (same assertions). Uploads without Cloudinary
// go to client/public/uploads (LOCAL_DIR; the suite runs with cwd = client/), so this
// file removes exactly the files it created, and the folder if it made it.
import { existsSync } from "node:fs";
import { readFile, readdir, rm, rmdir } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LOCAL_DIR } from "@/server/modules/uploads/uploads.storage";
import { CLIENT_DIR } from "./env";
import { api, expectError, loginAs, ORIGIN, type Agent } from "./helpers/http";

let admin: Agent;
let jpeg: Buffer;
const fakeJpeg = Buffer.from("this is plain text pretending to be a jpeg\n");
const textFile = Buffer.from("just text\n");
const dirExisted = existsSync(LOCAL_DIR);
const created: string[] = [];

beforeAll(async () => {
  expect(LOCAL_DIR).toBe(path.join(CLIENT_DIR, "public/uploads"));
  admin = await loginAs("admin");
  // A real JPEG from the storefront's static images.
  jpeg = await readFile(path.join(CLIENT_DIR, "public/images/products/saree-01.jpg"));
});

afterAll(async () => {
  for (const name of created) await rm(path.join(LOCAL_DIR, name), { force: true });
  if (!dirExisted && existsSync(LOCAL_DIR) && (await readdir(LOCAL_DIR)).length === 0) await rmdir(LOCAL_DIR);
});

const upload = () => admin.post("/api/uploads/image").set("Origin", ORIGIN);

describe("uploads", () => {
  it("stores a real JPEG under a server-generated name and deletes it again", async () => {
    const res = await upload().attach("files", jpeg, { contentType: "image/jpeg", filename: "../../etc/passwd.jpg" });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const [item] = res.body.items;
    expect(item).toMatchObject({ publicId: null, format: "jpeg" });
    expect(item.url).toMatch(/^\/uploads\/[0-9a-f-]{36}\.jpg$/);
    const name = item.url.slice("/uploads/".length);
    created.push(name);
    expect(existsSync(path.join(LOCAL_DIR, name))).toBe(true);

    const del = await api(admin).delete("/api/uploads/image", { url: item.url });
    expect(del.status).toBe(204);
    expect(existsSync(path.join(LOCAL_DIR, name))).toBe(false);
    expectError(await api(admin).delete("/api/uploads/image", { url: item.url }), 404, "NOT_FOUND");
  });

  it("rejects a text file disguised as a JPEG (mimetype and name say jpeg, bytes do not) with 415", async () => {
    const res = await upload().attach("files", fakeJpeg, { contentType: "image/jpeg", filename: "evil.jpg" });
    const err = expectError(res, 415, "UNSUPPORTED_MEDIA_TYPE");
    expect(err.details).toEqual([{ path: "files.0", message: expect.any(String) }]);
  });

  it("rejects a declared text/plain .txt with 415, and stores nothing when any file is bad", async () => {
    expectError(await upload().attach("files", textFile, { contentType: "text/plain", filename: "notes.txt" }), 415, "UNSUPPORTED_MEDIA_TYPE");
    const before = existsSync(LOCAL_DIR) ? (await readdir(LOCAL_DIR)).length : 0;
    const mixed = await upload()
      .attach("files", jpeg, { contentType: "image/jpeg", filename: "photo.jpg" })
      .attach("files", fakeJpeg, { contentType: "image/jpeg", filename: "evil.jpg" });
    expect(expectError(mixed, 415, "UNSUPPORTED_MEDIA_TYPE").details![0].path).toBe("files.1");
    const after = existsSync(LOCAL_DIR) ? (await readdir(LOCAL_DIR)).length : 0;
    expect(after).toBe(before);
  });

  it("requires the files field and refuses paths outside the upload folder on delete", async () => {
    expectError(await upload().attach("image", jpeg, { contentType: "image/jpeg", filename: "photo.jpg" }), 400);
    expectError(await upload().field("x", "y"), 400);
    for (const url of ["/uploads/../../server/.env", "/images/products/saree-01.jpg", "/uploads/not-a-uuid.jpg"]) {
      expectError(await api(admin).delete("/api/uploads/image", { url }), 400);
    }
  });

  it("rejects an oversized file with 413 and more than 10 files with 400", async () => {
    const big = Buffer.concat([jpeg.subarray(0, 16), Buffer.alloc(5 * 1024 * 1024)]);
    expectError(await upload().attach("files", big, { contentType: "image/jpeg", filename: "big.jpg" }), 413);
    const many = upload();
    for (let i = 0; i < 11; i++) many.attach("files", jpeg, { contentType: "image/jpeg", filename: `p${i}.jpg` });
    expectError(await many, 400);
  });
});
