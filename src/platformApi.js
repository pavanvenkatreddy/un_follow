const BASE_URL = "https://www.instagram.com";
const FALLBACK_IG_APP_ID = "936619743392459";

let cachedRuntimeHeaders = null;

export async function fetchCurrentUser() {
  const endpointResult = await fetchCurrentUserFromEndpoints();
  if (endpointResult.user?.id) {
    return endpointResult.user;
  }

  const tabUser = await fetchCurrentUserFromActiveTab();
  if (tabUser?.id) {
    return tabUser;
  }

  if (endpointResult.error) {
    throw endpointResult.error;
  }

  throw new Error("Could not detect the logged-in account. Open the supported website in the active tab and confirm you are logged in.");
}

async function fetchCurrentUserFromEndpoints() {
  const paths = [
    "/api/v1/accounts/edit/web_form_data/",
    "/api/v1/accounts/current_user/?edit=true"
  ];

  for (const path of paths) {
    try {
      const response = await platformFetch(path);
      const data = await response.json();
      const user = data.form_data || data.user || data;
      const id = user.user_id || user.pk || user.id;
      const username = user.username || user.full_name || null;

      if (id) {
        return {
          user: {
            id: String(id),
            username: username || `user-${id}`
          }
        };
      }
    } catch (error) {
      if (isRateLimitError(error)) {
        return {
          user: null,
          error
        };
      }

      console.info(`Current user endpoint failed: ${path}`, error);
    }
  }

  return {
    user: null,
    error: null
  };
}

async function fetchCurrentUserFromActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id || !tab.url?.startsWith(BASE_URL)) {
    return null;
  }

  const [result] = await chrome.scripting.executeScript({
    target: {
      tabId: tab.id
    },
    func: probePlatformPage
  });

  const probedUser = result?.result;
  if (!probedUser?.id) {
    return null;
  }

  if (probedUser.username) {
    return probedUser;
  }

  const enrichedUser = await fetchUserInfo(probedUser.id);
  return enrichedUser || {
    id: probedUser.id,
    username: `user-${probedUser.id}`
  };
}

function probePlatformPage() {
  const cookies = Object.fromEntries(
    document.cookie
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([name, value]) => name && value)
  );

  const html = document.documentElement.innerHTML;
  const scripts = Array.from(document.scripts)
    .map((script) => script.textContent || "")
    .join("\n");
  const searchText = `${html}\n${scripts}`;
  const id = cookies.ds_user_id || findFirstMatch(searchText, [
    /"ds_user_id"\s*:\s*"?(?<value>\d+)"?/,
    /"viewerId"\s*:\s*"?(?<value>\d+)"?/,
    /"actorID"\s*:\s*"?(?<value>\d+)"?/,
    /"user_id"\s*:\s*"?(?<value>\d+)"?/
  ]);
  const username = findUsernameForId(searchText, id) || findFirstMatch(searchText, [
    /"username"\s*:\s*"(?<value>[^"]+)"/,
    /"viewer"\s*:\s*\{[^}]*"username"\s*:\s*"(?<value>[^"]+)"/
  ]);

  return id
    ? {
        id: String(id),
        username
      }
    : null;
}

function findFirstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.groups?.value;
    if (value) {
      return value;
    }
  }

  return null;
}

function findUsernameForId(text, id) {
  if (!id) return null;

  const escapedId = escapeRegExp(String(id));
  const idBeforeUsername = new RegExp(`"user_id"\\s*:\\s*"?${escapedId}"?[^}]{0,500}"username"\\s*:\\s*"(?<value>[^"]+)"`);
  const usernameBeforeId = new RegExp(`"username"\\s*:\\s*"(?<value>[^"]+)"[^}]{0,500}"user_id"\\s*:\\s*"?${escapedId}"?`);

  return findFirstMatch(text, [
    idBeforeUsername,
    usernameBeforeId
  ]);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function probePlatformRuntimeConfig() {
  const cookies = Object.fromEntries(
    document.cookie
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([name, value]) => name && value)
  );
  const html = document.documentElement.innerHTML;
  const scripts = Array.from(document.scripts)
    .map((script) => script.textContent || "")
    .join("\n");
  const searchText = `${html}\n${scripts}`;
  const appIdPatterns = [
    /"X-IG-App-ID"\s*:\s*"(?<value>\d+)"/,
    /"appId"\s*:\s*"(?<value>\d+)"/,
    /"instagramWebAppId"\s*:\s*"(?<value>\d+)"/,
    /"APP_ID"\s*:\s*"(?<value>\d+)"/
  ];
  const ajaxPatterns = [
    /"X-Instagram-AJAX"\s*:\s*"(?<value>[a-zA-Z0-9_-]+)"/,
    /"rollout_hash"\s*:\s*"(?<value>[a-zA-Z0-9_-]+)"/
  ];

  let igAppId = null;
  let xInstagramAjax = null;

  for (const pattern of appIdPatterns) {
    const match = searchText.match(pattern);
    const value = match?.groups?.value;
    if (value) {
      igAppId = value;
      break;
    }
  }

  for (const pattern of ajaxPatterns) {
    const match = searchText.match(pattern);
    const value = match?.groups?.value;
    if (value) {
      xInstagramAjax = value;
      break;
    }
  }

  return {
    igAppId,
    csrfToken: cookies.csrftoken || null,
    xInstagramAjax
  };
}

async function buildPlatformHeaders() {
  const runtimeHeaders = await resolveRuntimeHeaders();
  const headers = {
    "X-IG-App-ID": runtimeHeaders.igAppId,
    "X-Requested-With": "XMLHttpRequest"
  };

  if (runtimeHeaders.csrfToken) {
    headers["X-CSRFToken"] = runtimeHeaders.csrfToken;
  }

  if (runtimeHeaders.xInstagramAjax) {
    headers["X-Instagram-AJAX"] = runtimeHeaders.xInstagramAjax;
  }

  return headers;
}

async function fetchUserInfo(userId) {
  try {
    const response = await platformFetch(`/api/v1/users/${userId}/info/`);
    const data = await response.json();
    const user = data.user || data;

    if (!user?.pk && !user?.id) return null;

    return {
      id: String(user.pk || user.id),
      username: user.username || `user-${userId}`
    };
  } catch (error) {
    console.info("Could not enrich account info.", error);
    return null;
  }
}

export async function resolveUserByUsername(username) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) {
    throw new Error("Enter a username.");
  }

  try {
    const response = await platformFetch(`/api/v1/users/web_profile_info/?username=${encodeURIComponent(normalizedUsername)}`);
    const data = await response.json();
    const user = data.data?.user || data.user;

    if (!user?.id) {
      throw new Error("Could not find that account.");
    }

    return {
      id: String(user.id),
      username: user.username || normalizedUsername,
      fullName: user.full_name || "",
      isPrivate: Boolean(user.is_private)
    };
  } catch (error) {
    if (error.message?.startsWith("Supported website returned 404")) {
      throw new Error("Could not find that account.");
    }

    throw error;
  }
}

export function normalizeUsername(username) {
  return String(username || "")
    .trim()
    .replace(/^@+/, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

export async function fetchRelationshipPage({ userId, type, maxId }) {
  const path = type === "followers"
    ? `/api/v1/friendships/${userId}/followers/`
    : `/api/v1/friendships/${userId}/following/`;

  const params = new URLSearchParams({
    count: "200"
  });

  if (type === "followers") {
    params.set("search_surface", "follow_list_page");
  }

  if (maxId) {
    params.set("max_id", maxId);
  }

  const response = await platformFetch(`${path}?${params.toString()}`);
  return response.json();
}

async function platformFetch(path) {
  let response = await platformFetchWithHeaders(path);

  if ((response.status === 401 || response.status === 403) && cachedRuntimeHeaders) {
    cachedRuntimeHeaders = null;
    response = await platformFetchWithHeaders(path);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Supported website rejected the request. Confirm you are logged in on the supported website.");
    }

    if (response.status === 429) {
      throw new Error(buildRateLimitMessage(response));
    }

    throw new Error(`Supported website returned ${response.status}.`);
  }

  return response;
}

function buildRateLimitMessage(response) {
  const retryAfter = response.headers.get("Retry-After");
  const waitText = retryAfter ? ` Wait about ${formatRetryAfter(retryAfter)} before trying again.` : " Wait a while before trying again.";
  return `The supported website is rate-limiting requests.${waitText}`;
}

function isRateLimitError(error) {
  const message = String(error?.message || "");
  return message.includes("rate-limiting") || message.includes("returned 429");
}

function formatRetryAfter(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) {
    return value;
  }

  if (seconds < 60) {
    return `${seconds} seconds`;
  }

  return `${Math.ceil(seconds / 60)} minutes`;
}

async function platformFetchWithHeaders(path) {
  const headers = await buildPlatformHeaders();
  return fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers
  });
}

async function resolveRuntimeHeaders() {
  if (cachedRuntimeHeaders) {
    return cachedRuntimeHeaders;
  }

  const dynamicHeaders = await fetchRuntimeHeadersFromActiveTab();
  cachedRuntimeHeaders = {
    igAppId: dynamicHeaders?.igAppId || FALLBACK_IG_APP_ID,
    csrfToken: dynamicHeaders?.csrfToken || null,
    xInstagramAjax: dynamicHeaders?.xInstagramAjax || null
  };

  return cachedRuntimeHeaders;
}

async function fetchRuntimeHeadersFromActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab?.id || !tab.url?.startsWith(BASE_URL)) {
      return null;
    }

    const [result] = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id
      },
      func: probePlatformRuntimeConfig
    });

    return result?.result || null;
  } catch (error) {
    console.info("Could not resolve runtime headers from page.", error);
    return null;
  }
}

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
