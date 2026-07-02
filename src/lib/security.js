import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTS = new Set(["localhost", "localhost.localdomain"]);
const MAX_DNS_RECORDS = 12;

function ipToNumber(ip) {
  return ip.split(".").reduce((total, part) => (total << 8) + Number(part), 0) >>> 0;
}

function isPrivateIpv4(ip) {
  const value = ipToNumber(ip);
  const ranges = [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.168.0.0", 16],
    ["100.64.0.0", 10],
    ["198.18.0.0", 15],
    ["224.0.0.0", 4],
  ];

  return ranges.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (value & mask) === (ipToNumber(base) & mask);
  });
}

function isPrivateIpv6(ip) {
  const value = ip.toLowerCase();
  return (
    value === "::1" ||
    value === "::" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe80:") ||
    value.startsWith("::ffff:127.") ||
    value.startsWith("::ffff:10.") ||
    value.startsWith("::ffff:192.168.")
  );
}

export function isBlockedAddress(address) {
  const version = net.isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

export async function assertPublicUrl(target) {
  const url = typeof target === "string" ? new URL(target) : target;
  const hostname = url.hostname.toLowerCase();

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs can be scanned.");
  }
  if (!hostname.includes(".") || BLOCKED_HOSTS.has(hostname)) {
    throw new Error("Please enter a valid public website URL.");
  }
  if (net.isIP(hostname) && isBlockedAddress(hostname)) {
    throw new Error("Private, local and internal network URLs cannot be scanned.");
  }

  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length) {
    throw new Error("The website hostname could not be resolved.");
  }
  const sample = records.slice(0, MAX_DNS_RECORDS);
  if (sample.some((record) => isBlockedAddress(record.address))) {
    throw new Error("This URL resolves to a private or internal network address and cannot be scanned.");
  }
  return true;
}
