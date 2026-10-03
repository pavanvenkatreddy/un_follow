import { compareFollowingDiscovery, compareNetworkDiscovery } from "./src/compare.js";
import { exportUsersCsv } from "./src/csv.js";
import { fetchRelationshipPage, normalizeUsername, sleep } from "./src/platformApi.js";
import { clearNetworkFollowingCache, loadLastDiscovery, loadLastScan, loadNetworkFollowingCache, saveLastDiscovery, saveNetworkFollowingCache } from "./src/storage.js";

const DEFAULT_DELAY_MS = 3000;
const MAX_DISCOVER_SUGGESTIONS = 10;

const state = {
  activeView: "notFollowingBack",
  activeDiscoveryView: "targetOnly",
  activeNetworkView: "allIncludedFollow",
  discovery: null,
  isDiscovering: false,
  isNetworkScanning: false,
  mode: "followers",
  network: null,
  networkCache: {},
  networkIncludeSelf: false,
  networkTargets: [],
  query: "",
  scan: null
};

const elements = {
  bothFollowCount: document.querySelector("#bothFollowCount"),
  discoverCompareButton: document.querySelector("#discoverCompareButton"),
  discoverForm: document.querySelector("#discoverForm"),
  discoverListTitle: document.querySelector("#discoverListTitle"),
  discoverProgressCount: document.querySelector("#discoverProgressCount"),
  discoverResultCount: document.querySelector("#discoverResultCount"),
  discoverResultsList: document.querySelector("#discoverResultsList"),
  discoverSuggestions: document.querySelector("#discoverSuggestions"),
  discoverStatusText: document.querySelector("#discoverStatusText"),
  discoverUsernameInput: document.querySelector("#discoverUsernameInput"),
  discoverView: document.querySelector("#discoverView"),
  exportButton: document.querySelector("#exportButton"),
  followersView: document.querySelector("#followersView"),
  followersCount: document.querySelector("#followersCount"),
  followingCount: document.querySelector("#followingCount"),
  listTitle: document.querySelector("#listTitle"),
  mutualCount: document.querySelector("#mutualCount"),
  networkAddButton: document.querySelector("#networkAddButton"),
  networkAllCount: document.querySelector("#networkAllCount"),
  networkClearCacheButton: document.querySelector("#networkClearCacheButton"),
  networkForm: document.querySelector("#networkForm"),
  networkAllLabel: document.querySelector("#networkAllLabel"),
  networkIncludeSelfInput: document.querySelector("#networkIncludeSelfInput"),
  networkListTitle: document.querySelector("#networkListTitle"),
  networkNotMineTile: document.querySelector('[data-network-view="notMine"]'),
  networkResultCount: document.querySelector("#networkResultCount"),
  networkResultsList: document.querySelector("#networkResultsList"),
  networkScanButton: document.querySelector("#networkScanButton"),
  networkSelectedList: document.querySelector("#networkSelectedList"),
  networkSeveralIDontCount: document.querySelector("#networkSeveralIDontCount"),
  networkStatusText: document.querySelector("#networkStatusText"),
  networkSuggestions: document.querySelector("#networkSuggestions"),
  networkUniqueCount: document.querySelector("#networkUniqueCount"),
  networkUsernameInput: document.querySelector("#networkUsernameInput"),
  notFollowedBackCount: document.querySelector("#notFollowedBackCount"),
  notFollowingBackCount: document.querySelector("#notFollowingBackCount"),
  openSiteButton: document.querySelector("#openSiteButton"),
  overlapPercent: document.querySelector("#overlapPercent"),
  resultCount: document.querySelector("#resultCount"),
  resultsList: document.querySelector("#resultsList"),
  scanMeta: document.querySelector("#scanMeta"),
  searchInput: document.querySelector("#searchInput"),
  targetFollowingCount: document.querySelector("#targetFollowingCount"),
  targetOnlyCount: document.querySelector("#targetOnlyCount"),
  template: document.querySelector("#resultItemTemplate")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  wireEvents();

  state.scan = await loadLastScan();
  state.discovery = await loadLastDiscovery();
  state.networkCache = await loadNetworkFollowingCache();
  if (!state.scan) {
    renderEmpty("Run a scan first.");
    renderDiscoverEmpty("Run Scan first.");
    setDiscoverControlsEnabled(false);
    return;
  }

  renderSummary();
  renderResults();
  renderDiscovery();
  renderNetworkSelectedList();
  renderNetwork();
}

function wireEvents() {
  elements.exportButton.addEventListener("click", exportActiveView);
  elements.discoverForm.addEventListener("submit", runDiscoverCompare);
  elements.networkForm.addEventListener("submit", addNetworkTarget);
  elements.networkIncludeSelfInput.addEventListener("change", () => {
    state.networkIncludeSelf = elements.networkIncludeSelfInput.checked;
    if (!state.networkIncludeSelf && state.activeNetworkView === "notMine") {
      state.activeNetworkView = "allIncludedFollow";
    }
    recomputeNetworkFromTargets();
    renderNetwork();
  });
  elements.networkClearCacheButton.addEventListener("click", clearNetworkCache);
  elements.networkScanButton.addEventListener("click", runNetworkScan);
  elements.openSiteButton.addEventListener("click", () => {
    chrome.tabs.create({
      url: "https://www.instagram.com/"
    });
  });
  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderResults();
  });
  elements.discoverUsernameInput.addEventListener("input", () => {
    renderDiscoverSuggestions();
  });
  elements.discoverUsernameInput.addEventListener("focus", () => {
    renderDiscoverSuggestions();
  });
  elements.discoverUsernameInput.addEventListener("blur", () => {
    window.setTimeout(clearDiscoverSuggestions, 120);
  });
  elements.networkUsernameInput.addEventListener("input", () => {
    renderNetworkSuggestions();
  });
  elements.networkUsernameInput.addEventListener("focus", () => {
    renderNetworkSuggestions();
  });
  elements.networkUsernameInput.addEventListener("blur", () => {
    window.setTimeout(clearNetworkSuggestions, 120);
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      setFollowersView(button.dataset.view);
    });
  });

  document.querySelectorAll("[data-followers-view]").forEach((button) => {
    button.addEventListener("click", () => {
      setFollowersView(button.dataset.followersView);
    });
  });

  document.querySelectorAll("[data-discover-view]").forEach((button) => {
    button.addEventListener("click", () => {
      setDiscoveryView(button.dataset.discoverView);
    });
  });

  document.querySelectorAll("[data-network-view]").forEach((button) => {
    button.addEventListener("click", () => {
      setNetworkView(button.dataset.networkView);
    });
  });

  document.querySelectorAll(".mode-button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      setMode(button.dataset.mode);
    });
  });
}

function renderSummary() {
  const scan = state.scan;
  elements.scanMeta.textContent = formatScanMeta(scan);
  elements.followersCount.textContent = scan.followers.length;
  elements.followingCount.textContent = scan.following.length;
  elements.mutualCount.textContent = scan.mutual.length;
  elements.notFollowingBackCount.textContent = scan.notFollowingBack.length;
  elements.notFollowedBackCount.textContent = scan.notFollowedBack.length;
  elements.exportButton.disabled = false;
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".mode-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  elements.followersView.classList.toggle("active", mode === "followers");
  elements.discoverView.classList.toggle("active", mode === "discover");
  elements.exportButton.disabled = !canExportActiveMode();
}

function renderResults() {
  const users = getFilteredUsers();
  elements.listTitle.textContent = getActiveTitle();
  elements.resultCount.textContent = `${users.length} ${users.length === 1 ? "account" : "accounts"}`;
  renderUserList({
    container: elements.resultsList,
    users,
    emptyMessage: state.query ? "No accounts match this search." : "No accounts in this view."
  });
}

function setFollowersView(view) {
  state.activeView = view;
  document.querySelectorAll(".tab-button").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === view);
  });
  document.querySelectorAll("[data-followers-view]").forEach((tile) => {
    tile.classList.toggle("active", tile.dataset.followersView === view);
  });
  renderResults();
  elements.exportButton.disabled = !canExportActiveMode();
}

async function runDiscoverCompare(event) {
  event.preventDefault();
  if (state.isDiscovering) return;

  if (!state.scan?.following?.length) {
    renderDiscoverEmpty("Run Scan first.");
    return;
  }

  const username = normalizeUsername(elements.discoverUsernameInput.value);
  if (!username) {
    setDiscoverStatus("Enter a username.", "");
    return;
  }

  state.isDiscovering = true;
  setDiscoverControlsEnabled(false);
  setDiscoverStatus("Resolving...", "");

  try {
    const target = await resolveDiscoverTarget(username);
    const targetFollowing = await fetchAllTargetFollowing(target.id);
    const comparison = compareFollowingDiscovery(state.scan.following, targetFollowing);
    const discovery = {
      target,
      scannedAt: new Date().toISOString(),
      targetFollowing,
      ...comparison
    };

    state.discovery = discovery;
    await saveLastDiscovery(discovery);
    renderDiscovery();
    clearDiscoverSuggestions();
    setDiscoverStatus(`Compared @${target.username} using id ${target.id}.`, targetFollowing.length);
  } catch (error) {
    console.warn(error);
    const message = error.message?.startsWith("Supported website rejected")
      ? error.message
      : normalizeDiscoverError(error);
    setDiscoverStatus(message, "");
  } finally {
    state.isDiscovering = false;
    setDiscoverControlsEnabled(true);
    elements.exportButton.disabled = !canExportActiveMode();
  }
}

async function fetchAllTargetFollowing(userId) {
  const users = [];
  let nextMaxId = null;

  do {
    setDiscoverStatus("Fetching target following...", users.length);

    const data = await fetchRelationshipPage({
      userId,
      type: "following",
      maxId: nextMaxId
    });

    users.push(...(data.users || []));
    nextMaxId = data.has_more && data.next_max_id ? data.next_max_id : null;
    setDiscoverStatus("Fetched target following.", users.length);

    if (nextMaxId) {
      await sleep(DEFAULT_DELAY_MS);
    }
  } while (nextMaxId);

  return users;
}

function renderDiscovery() {
  const discovery = state.discovery;

  if (!discovery) {
    renderDiscoverEmpty(state.scan?.following?.length
      ? "Enter a username to compare."
      : "Run Scan first.");
    return;
  }

  elements.discoverUsernameInput.value = discovery.target?.username || "";
  elements.targetFollowingCount.textContent = discovery.targetFollowing.length;
  elements.targetOnlyCount.textContent = discovery.targetOnly.length;
  elements.bothFollowCount.textContent = discovery.bothFollow.length;
  elements.overlapPercent.textContent = `${discovery.overlapPercent}%`;
  elements.discoverListTitle.textContent = `Missing from @${discovery.target.username}`;
  updateDiscoveryTileState();
  renderUserList({
    container: elements.discoverResultsList,
    users: getDiscoveryUsers(),
    emptyMessage: "You already follow everyone this account follows."
  });
  const users = getDiscoveryUsers();
  elements.discoverListTitle.textContent = getDiscoveryTitle();
  elements.discoverResultCount.textContent = `${users.length} ${users.length === 1 ? "account" : "accounts"}`;
  setDiscoverStatus(formatDiscoveryMeta(discovery), discovery.targetFollowing.length);
}

function renderDiscoverSuggestions() {
  if (!state.scan?.following?.length || elements.discoverUsernameInput.disabled) {
    clearDiscoverSuggestions();
    return;
  }

  const query = normalizeUsername(elements.discoverUsernameInput.value);
  const suggestions = getDiscoverSuggestions(query);
  elements.discoverSuggestions.replaceChildren();
  elements.discoverSuggestions.classList.toggle("active", suggestions.length > 0);

  suggestions.forEach((user) => {
    const button = document.createElement("button");
    button.className = "suggestion-option";
    button.type = "button";
    button.setAttribute("role", "option");
    button.innerHTML = `
      <strong>@${escapeHtml(user.username || "unknown")}</strong>
      <span>${escapeHtml(user.full_name || "No full name")}</span>
    `;
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      elements.discoverUsernameInput.value = user.username || "";
      clearDiscoverSuggestions();
    });
    elements.discoverSuggestions.append(button);
  });
}

function getDiscoverSuggestions(query) {
  const following = state.scan?.following || [];
  const usableFollowing = following.filter((user) => user.username);

  if (!query) {
    return usableFollowing.slice(0, MAX_DISCOVER_SUGGESTIONS);
  }

  return usableFollowing
    .filter((user) => {
      const username = user.username || "";
      const fullName = user.full_name || "";
      return `${username} ${fullName}`.toLowerCase().includes(query);
    })
    .slice(0, MAX_DISCOVER_SUGGESTIONS);
}

function resolveDiscoverTarget(username) {
  const localTarget = findFollowingByUsername(username);
  if (localTarget?.pk) {
    return {
      id: String(localTarget.pk),
      username: localTarget.username,
      fullName: localTarget.full_name || "",
      isPrivate: Boolean(localTarget.is_private),
      source: "saved-following"
    };
  }

  throw new Error("Choose someone from your saved list. Run Scan again if missing.");
}

function findFollowingByUsername(username) {
  const normalizedUsername = normalizeUsername(username);
  return (state.scan?.following || []).find((user) => {
    return normalizeUsername(user.username) === normalizedUsername;
  }) || null;
}

function clearDiscoverSuggestions() {
  elements.discoverSuggestions.replaceChildren();
  elements.discoverSuggestions.classList.remove("active");
}

function addNetworkTarget(event) {
  event.preventDefault();

  try {
    const username = normalizeUsername(elements.networkUsernameInput.value);
    if (!username) {
    setNetworkStatus("Enter a saved username.");
      return;
    }

    const target = resolveDiscoverTarget(username);
    if (state.networkTargets.some((existing) => existing.id === target.id)) {
      setNetworkStatus(`@${target.username} is already selected.`);
      return;
    }

    state.networkTargets.push(target);
    elements.networkUsernameInput.value = "";
    clearNetworkSuggestions();
    renderNetworkSelectedList();
    setNetworkStatus("Ready.");
  } catch (error) {
    setNetworkStatus(error.message || "Could not add that person.");
  }
}

async function runNetworkScan() {
  if (state.isNetworkScanning) return;

  if (state.networkTargets.length < 2) {
    setNetworkStatus("Add 2+ accounts.");
    return;
  }

  state.isNetworkScanning = true;
  setNetworkControlsEnabled(false);

  try {
    const targets = [];
    let fetchedCount = 0;

    for (const target of state.networkTargets) {
      const cached = state.networkCache[target.id];
      const following = cached?.following || await fetchAndCacheNetworkFollowing(target);
      if (!cached?.following) {
        fetchedCount += 1;
      }

      targets.push({
        ...target,
        following
      });
    }

    state.network = {
      scannedAt: new Date().toISOString(),
      targets,
      ...compareNetworkDiscovery(state.scan.following, targets, {
        includeSelf: state.networkIncludeSelf
      })
    };
    renderNetwork();
    setNetworkStatus(`Scanned ${targets.length}. Fetched ${fetchedCount} new.`);
  } catch (error) {
    console.warn(error);
    setNetworkStatus(normalizeDiscoverError(error));
  } finally {
    state.isNetworkScanning = false;
    setNetworkControlsEnabled(true);
  }
}

async function fetchAndCacheNetworkFollowing(target) {
  setNetworkStatus(`Fetching @${target.username}...`);
  const following = await fetchAllNetworkTargetFollowing(target.id, target.username);
  state.networkCache[target.id] = {
    target,
    following,
    scannedAt: new Date().toISOString()
  };
  await saveNetworkFollowingCache(state.networkCache);
  return following;
}

async function fetchAllNetworkTargetFollowing(userId, username) {
  const users = [];
  let nextMaxId = null;

  do {
    setNetworkStatus(`Fetching @${username}... ${users.length}`);

    const data = await fetchRelationshipPage({
      userId,
      type: "following",
      maxId: nextMaxId
    });

    users.push(...(data.users || []));
    nextMaxId = data.has_more && data.next_max_id ? data.next_max_id : null;

    if (nextMaxId) {
      await sleep(DEFAULT_DELAY_MS);
    }
  } while (nextMaxId);

  return users;
}

async function clearNetworkCache() {
  if (state.isNetworkScanning) return;

  state.networkCache = {};
  state.network = null;
  state.activeNetworkView = "allIncludedFollow";
  await clearNetworkFollowingCache();
  renderNetwork();
  setNetworkStatus("Cache cleared. Scan Group will fetch fresh data.");
}

function renderNetworkSuggestions() {
  if (!state.scan?.following?.length || elements.networkUsernameInput.disabled) {
    clearNetworkSuggestions();
    return;
  }

  const query = normalizeUsername(elements.networkUsernameInput.value);
  const suggestions = getDiscoverSuggestions(query).filter((user) => {
    return !state.networkTargets.some((target) => String(target.id) === String(user.pk));
  });

  elements.networkSuggestions.replaceChildren();
  elements.networkSuggestions.classList.toggle("active", suggestions.length > 0);

  suggestions.forEach((user) => {
    const button = document.createElement("button");
    button.className = "suggestion-option";
    button.type = "button";
    button.setAttribute("role", "option");
    button.innerHTML = `
      <strong>@${escapeHtml(user.username || "unknown")}</strong>
      <span>${escapeHtml(user.full_name || "No full name")}</span>
    `;
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      elements.networkUsernameInput.value = user.username || "";
      clearNetworkSuggestions();
    });
    elements.networkSuggestions.append(button);
  });
}

function clearNetworkSuggestions() {
  elements.networkSuggestions.replaceChildren();
  elements.networkSuggestions.classList.remove("active");
}

function renderNetworkSelectedList() {
  elements.networkSelectedList.replaceChildren();

  if (!state.networkTargets.length) {
    const empty = document.createElement("span");
    empty.className = "selected-empty";
    empty.textContent = "None selected.";
    elements.networkSelectedList.append(empty);
    setNetworkControlsEnabled(!state.isNetworkScanning);
    return;
  }

  state.networkTargets.forEach((target) => {
    const chip = document.createElement("button");
    chip.className = "selected-chip";
    chip.type = "button";
    chip.textContent = `@${target.username} x`;
    chip.addEventListener("click", () => {
      state.networkTargets = state.networkTargets.filter((item) => item.id !== target.id);
      renderNetworkSelectedList();
    });
    elements.networkSelectedList.append(chip);
  });

  setNetworkControlsEnabled(!state.isNetworkScanning);
}

function renderNetwork() {
  updateNetworkTileState();
  elements.networkAllLabel.textContent = state.networkIncludeSelf
    ? "All included"
    : "All share";
  elements.networkNotMineTile.hidden = !state.networkIncludeSelf;

  if (!state.network) {
    elements.networkAllCount.textContent = "0";
    elements.networkSeveralIDontCount.textContent = "0";
    elements.networkUniqueCount.textContent = "0";
    renderNetworkGroups([], "Select accounts and scan.");
    return;
  }

  elements.networkAllCount.textContent = state.network.allIncludedFollow.length;
  elements.networkSeveralIDontCount.textContent = state.network.notMine.length;
  elements.networkUniqueCount.textContent = state.network.uniqueFollows.length;
  renderNetworkGroups(getNetworkGroups(), getNetworkEmptyMessage());
}

function renderNetworkGroups(groups, emptyMessage) {
  elements.networkResultsList.replaceChildren();
  elements.networkListTitle.textContent = getNetworkTitle();
  elements.networkResultCount.textContent = `${groups.length} ${groups.length === 1 ? "account" : "accounts"}`;

  if (!groups.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = emptyMessage;
    elements.networkResultsList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  groups.forEach((group) => {
    const item = elements.template.content.firstElementChild.cloneNode(true);
    const profileButton = item.querySelector(".profile-button");
    const usernames = group.followedBy
      .map((target) => target.isSelf ? "me" : `@${target.username}`)
      .join(" + ");
    item.querySelector(".username").textContent = `@${group.account.username || "unknown"}`;
    item.querySelector(".full-name").textContent = usernames || "No followers in this view";

    if (group.account.username) {
      profileButton.addEventListener("click", () => {
        chrome.tabs.create({
          url: `https://www.instagram.com/${encodeURIComponent(group.account.username)}/`
        });
      });
    } else {
      profileButton.disabled = true;
    }

    fragment.append(item);
  });

  elements.networkResultsList.append(fragment);
}

function recomputeNetworkFromTargets() {
  if (!state.network?.targets?.length) return;

  state.network = {
    ...state.network,
    ...compareNetworkDiscovery(state.scan.following, state.network.targets, {
      includeSelf: state.networkIncludeSelf
    })
  };
}

function renderDiscoverEmpty(message) {
  elements.targetFollowingCount.textContent = "0";
  elements.targetOnlyCount.textContent = "0";
  elements.bothFollowCount.textContent = "0";
  elements.overlapPercent.textContent = "0%";
  elements.discoverListTitle.textContent = "Missing";
  elements.discoverResultCount.textContent = "0 accounts";
  updateDiscoveryTileState();
  renderUserList({
    container: elements.discoverResultsList,
    users: [],
    emptyMessage: message
  });
  setDiscoverStatus(message, "");
}

function renderEmpty(message) {
  renderUserList({
    container: elements.resultsList,
    users: [],
    emptyMessage: message
  });
  elements.resultCount.textContent = "0 accounts";
}

function exportActiveView() {
  const users = state.mode === "discover"
    ? getDiscoveryUsers()
    : getFilteredUsers();
  const label = state.mode === "discover"
    ? `discover-${state.discovery?.target?.username || "target"}-${state.activeDiscoveryView}`
    : state.activeView === "notFollowingBack"
      ? "they-dont"
      : state.activeView === "notFollowedBack"
        ? "you-dont"
        : state.activeView;

  exportUsersCsv(users, `follow-check-${label}.csv`);
}

function renderUserList({ container, users, emptyMessage }) {
  container.replaceChildren();

  if (!users.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = emptyMessage;
    container.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  users.forEach((user) => {
    const item = elements.template.content.firstElementChild.cloneNode(true);
    const profileButton = item.querySelector(".profile-button");
    item.querySelector(".username").textContent = `@${user.username || "unknown"}`;
    item.querySelector(".full-name").textContent = user.full_name || "No full name";

    if (user.username) {
      profileButton.addEventListener("click", () => {
        chrome.tabs.create({
          url: `https://www.instagram.com/${encodeURIComponent(user.username)}/`
        });
      });
    } else {
      profileButton.disabled = true;
    }

    fragment.append(item);
  });

  container.append(fragment);
}

function getFilteredUsers() {
  if (!state.scan) return [];

  const users = getFollowersUsers();

  if (!state.query) {
    return users;
  }

  return users.filter((user) => {
    const username = user.username || "";
    const fullName = user.full_name || "";
    return `${username} ${fullName}`.toLowerCase().includes(state.query);
  });
}

function getActiveTitle() {
  const titles = {
    followers: "Fans",
    following: "Follows",
    mutual: "Mutual",
    notFollowingBack: "They don't",
    notFollowedBack: "You don't"
  };

  return titles[state.activeView] || "Accounts";
}

function getFollowersUsers() {
  if (!state.scan) return [];

  const views = {
    followers: state.scan.followers || [],
    following: state.scan.following || [],
    mutual: state.scan.mutual || [],
    notFollowingBack: state.scan.notFollowingBack || [],
    notFollowedBack: state.scan.notFollowedBack || []
  };

  return views[state.activeView] || [];
}

function setDiscoveryView(view) {
  state.activeDiscoveryView = view;
  renderDiscovery();
  elements.exportButton.disabled = !canExportActiveMode();
}

function getDiscoveryUsers() {
  if (!state.discovery) return [];

  const views = {
    targetFollowing: state.discovery.targetFollowing || [],
    targetOnly: state.discovery.targetOnly || [],
    bothFollow: state.discovery.bothFollow || []
  };

  return views[state.activeDiscoveryView] || [];
}

function getDiscoveryTitle() {
  if (!state.discovery?.target?.username) {
    return "Missing";
  }

  const username = state.discovery.target.username;
  const titles = {
    targetFollowing: `@${username} follows`,
    targetOnly: `Missing from @${username}`,
    bothFollow: `Shared with @${username}`
  };

  return titles[state.activeDiscoveryView] || "Discovery results";
}

function updateDiscoveryTileState() {
  document.querySelectorAll("[data-discover-view]").forEach((tile) => {
    tile.classList.toggle("active", tile.dataset.discoverView === state.activeDiscoveryView);
  });
}

function setNetworkView(view) {
  if (view === "notMine" && !state.networkIncludeSelf) {
    view = "allIncludedFollow";
  }

  state.activeNetworkView = view;
  renderNetwork();
}

function getNetworkGroups() {
  if (!state.network) return [];

  const views = {
    allIncludedFollow: state.network.allIncludedFollow || [],
    notMine: state.network.notMine || [],
    uniqueFollows: state.network.uniqueFollows || []
  };

  return views[state.activeNetworkView] || [];
}

function getNetworkTitle() {
  const titles = {
    allIncludedFollow: state.networkIncludeSelf ? "All included" : "All share",
    notMine: "Not mine",
    uniqueFollows: "Unique"
  };

  return titles[state.activeNetworkView] || "Network";
}

function getNetworkEmptyMessage() {
  const messages = {
    allIncludedFollow: state.networkIncludeSelf
      ? "No shared accounts with you included."
      : "No accounts shared by all.",
    notMine: "No shared misses yet.",
    uniqueFollows: "No unique accounts yet."
  };

  return messages[state.activeNetworkView] || "No network overlap results.";
}

function updateNetworkTileState() {
  document.querySelectorAll("[data-network-view]").forEach((tile) => {
    tile.classList.toggle("active", tile.dataset.networkView === state.activeNetworkView);
  });
}

function canExportActiveMode() {
  if (state.mode === "discover") {
    return Boolean(getDiscoveryUsers().length);
  }

  return Boolean(state.scan);
}

function setDiscoverControlsEnabled(enabled) {
  elements.discoverUsernameInput.disabled = !enabled;
  elements.discoverCompareButton.disabled = !enabled || !state.scan?.following?.length;
  elements.discoverCompareButton.textContent = state.isDiscovering
    ? "Comparing..."
    : "Compare";

  if (!enabled) {
    clearDiscoverSuggestions();
  }
}

function setDiscoverStatus(message, count) {
  elements.discoverStatusText.textContent = message;
  elements.discoverProgressCount.textContent = String(count ?? "");
}

function setNetworkControlsEnabled(enabled) {
  elements.networkUsernameInput.disabled = !enabled;
  elements.networkAddButton.disabled = !enabled;
  elements.networkClearCacheButton.disabled = !enabled;
  elements.networkScanButton.disabled = !enabled || state.networkTargets.length < 2;
  elements.networkScanButton.textContent = state.isNetworkScanning ? "Scanning..." : "Scan Group";

  if (!enabled) {
    clearNetworkSuggestions();
  }
}

function setNetworkStatus(message) {
  elements.networkStatusText.textContent = message;
}

function normalizeDiscoverError(error) {
  const message = error.message || "Discovery failed.";
  if (message.startsWith("Supported website returned 404")) {
    return "Could not find that account.";
  }

  if (message.startsWith("Supported website returned 400") || message.startsWith("Supported website returned 403")) {
    return "This account's following list is not available to your session.";
  }

  return message;
}

function formatScanMeta(scan) {
  const account = scan.account?.username ? `@${scan.account.username}` : "Account";
  const scannedAt = scan.scannedAt
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(scan.scannedAt))
    : "unknown time";

  return `${account} scanned ${scannedAt}`;
}

function formatDiscoveryMeta(discovery) {
  const account = discovery.target?.username ? `@${discovery.target.username}` : "Target account";
  const scannedAt = discovery.scannedAt
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(discovery.scannedAt))
    : "unknown time";

  return `${account} compared ${scannedAt}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}
