const LAST_SCAN_KEY = "lastScan";
const LAST_DISCOVERY_KEY = "lastDiscovery";
const NETWORK_CACHE_KEY = "networkFollowingCache";

export async function loadLastScan() {
  const result = await chrome.storage.local.get(LAST_SCAN_KEY);
  return result[LAST_SCAN_KEY] || null;
}

export async function saveLastScan(scan) {
  await chrome.storage.local.set({
    [LAST_SCAN_KEY]: scan
  });
}

export async function loadLastDiscovery() {
  const result = await chrome.storage.local.get(LAST_DISCOVERY_KEY);
  return result[LAST_DISCOVERY_KEY] || null;
}

export async function saveLastDiscovery(discovery) {
  await chrome.storage.local.set({
    [LAST_DISCOVERY_KEY]: discovery
  });
}

export async function loadNetworkFollowingCache() {
  const result = await chrome.storage.local.get(NETWORK_CACHE_KEY);
  return result[NETWORK_CACHE_KEY] || {};
}

export async function saveNetworkFollowingCache(cache) {
  await chrome.storage.local.set({
    [NETWORK_CACHE_KEY]: cache
  });
}

export async function clearNetworkFollowingCache() {
  await chrome.storage.local.remove(NETWORK_CACHE_KEY);
}
