'use strict';

/**
 * Proxy rotator that cycles through proxies from the PROXY_LIST env variable.
 * PROXY_LIST should be a comma-separated list of proxy URLs, e.g.:
 *   PROXY_LIST=http://user:pass@1.2.3.4:8080,http://user:pass@5.6.7.8:3128
 */

let proxyList = [];
let currentIndex = 0;

/**
 * Parse and load the proxy list from the PROXY_LIST environment variable.
 * Called once at module load time and can be called again to reload.
 */
function loadProxies() {
  const raw = process.env.PROXY_LIST || '';
  if (!raw.trim()) {
    proxyList = [];
    return;
  }

  proxyList = raw
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  currentIndex = 0;
}

// Load proxies on module initialization
loadProxies();

/**
 * Returns the next proxy in round-robin order.
 * Returns null if no proxies are configured.
 * @returns {string|null} proxy URL string or null
 */
function getNextProxy() {
  if (proxyList.length === 0) {
    return null;
  }

  const proxy = proxyList[currentIndex];
  currentIndex = (currentIndex + 1) % proxyList.length;
  return proxy;
}

/**
 * Returns the current list of loaded proxies.
 * @returns {string[]}
 */
function getProxyList() {
  return [...proxyList];
}

/**
 * Returns the total number of proxies available.
 * @returns {number}
 */
function getProxyCount() {
  return proxyList.length;
}

/**
 * Re-reads PROXY_LIST from the environment and reloads.
 * Useful if the env variable was updated after startup.
 */
function reloadProxies() {
  loadProxies();
}

module.exports = {
  getNextProxy,
  getProxyList,
  getProxyCount,
  reloadProxies,
};
