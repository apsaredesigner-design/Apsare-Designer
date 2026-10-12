import { isIPv4, isIPv6 } from "node:net";
import { env } from "../config/env";

/**
 * Key used when no trustworthy client IP exists. A Route Handler never sees the
 * socket address, and without TRUST_PROXY=1 an X-Forwarded-For header may be
 * client-supplied (Next only fills it in when absent), so it is ignored.
 * Consequence: with TRUST_PROXY=0 every guest shares ONE rate-limit bucket per
 * IP-keyed limiter (api, login, sensitive; per-user limiters are unaffected).
 * Deploy behind a proxy with TRUST_PROXY=1.
 */
export const UNKNOWN_IP = "unknown";

/**
 * The client IP, like Express `req.ip` with `trust proxy` = 1 when TRUST_PROXY=1:
 * the last X-Forwarded-For entry (the one the nearest proxy appended; Next itself
 * sets the header to the socket address when there is no proxy).
 */
export function clientIp(req: Request): string {
  if (!env.trustProxy) return UNKNOWN_IP;
  const hops = (req.headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return hops.at(-1) ?? UNKNOWN_IP;
}

function expandIPv6(ip: string): number[] | null {
  let addr = ip.split("%")[0];
  const v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(addr);
  if (v4) {
    const [a, b, c, d] = v4[1].split(".").map(Number);
    addr = addr.slice(0, -v4[1].length) + `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, tail] = addr.includes("::") ? addr.split("::") : [addr, undefined];
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const fill = tail === undefined ? [] : Array(8 - h.length - t.length).fill("0");
  const parts = [...h, ...fill, ...t].map((p) => parseInt(p || "0", 16));
  return parts.length === 8 && parts.every((n) => n >= 0 && n <= 0xffff) ? parts : null;
}

/**
 * express-rate-limit's `ipKeyGenerator`: IPv4 as is, IPv4-mapped IPv6 as IPv4,
 * other IPv6 grouped by /56 subnet (one customer's whole allocation = one key).
 */
export function ipKeyGenerator(ip: string, ipv6Subnet = 56): string {
  if (!isIPv6(ip)) return ip;
  const parts = expandIPv6(ip);
  if (!parts) return ip;
  if (parts.slice(0, 5).every((n) => n === 0) && parts[5] === 0xffff) {
    const v4 = `${parts[6] >> 8}.${parts[6] & 0xff}.${parts[7] >> 8}.${parts[7] & 0xff}`;
    if (isIPv4(v4)) return v4;
  }
  const masked = parts.map((n, i) => {
    const bits = Math.max(0, Math.min(16, ipv6Subnet - i * 16));
    return bits === 0 ? 0 : n & ((0xffff << (16 - bits)) & 0xffff);
  });
  return `${masked.map((n) => n.toString(16)).join(":")}/${ipv6Subnet}`;
}
