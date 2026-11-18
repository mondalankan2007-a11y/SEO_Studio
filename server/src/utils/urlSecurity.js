import dns from 'node:dns/promises';
import net from 'node:net';
import ipaddr from 'ipaddr.js';

function blockedAddress(value) {
  try {
    let addr = ipaddr.parse(value);
    if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) addr = addr.toIPv4Address();
    const range = addr.range();
    return !['unicast'].includes(range);
  } catch { return true; }
}

export function parsePublicHttpUrl(input) {
  let url;
  try { url = new URL(input); } catch { throw new Error('Enter a valid website URL.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported.');
  if (url.username || url.password) throw new Error('URLs containing credentials are not allowed.');
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname === 'metadata.google.internal') {
    throw new Error('This host is not available for public website audits.');
  }
  if (net.isIP(hostname) && blockedAddress(hostname)) throw new Error('Private or reserved IP addresses cannot be audited.');
  url.hash = '';
  return url;
}

export async function resolvePublicHost(url) {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(hostname)) {
    if (blockedAddress(hostname)) throw new Error('Private or reserved IP addresses cannot be audited.');
    return [{ address: hostname, family: net.isIP(hostname) }];
  }
  let records;
  try { records = await dns.lookup(hostname, { all: true, verbatim: true }); }
  catch { throw new Error('The website host could not be resolved.'); }
  if (!records.length || records.some(({ address }) => blockedAddress(address))) {
    throw new Error('This website resolves to a private or reserved network address.');
  }
  return records;
}

export { blockedAddress };
