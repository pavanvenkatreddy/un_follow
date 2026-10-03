import { compareRelationships } from "./src/compare.js";
import { exportUsersCsv } from "./src/csv.js";
import { fetchCurrentUser, fetchRelationshipPage, sleep } from "./src/platformApi.js";
import { loadLastScan, saveLastScan } from "./src/storage.js";

const DEFAULT_DELAY_MS = 3000;

const state = {
  activeView: "notFollowingBack",
  scan: null,
  isScanning: false
};

const elements = {
  accountBadge: document.querySelector("#accountBadge"),
  exportButton: document.querySelector("#exportButton"),
  followersCount: document.querySelector("#followersCount"),
  followingCount: document.querySelector("#followingCount"),
  mutualCount: document.querySelector("#mutualCount"),
  notFollowedBackCount: document.querySelector("#notFollowedBackCount"),
  notFollowingBackCount: document.querySelector("#notFollowingBackCount"),
  progressBar: document.querySelector("#progressBar"),
  progressCount: document.querySelector("#progressCount"),
  refreshFollowersInput: document.querySelector("#refreshFollowersInput"),
  resultsList: document.querySelector("#resultsList"),
  scanButton: document.querySelector("#scanButton"),
  statusText: document.querySelector("#statusText"),
  template: document.querySelector("#resultItemTemplate"),
  viewResultsButton: document.querySelector("#viewResultsButton")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  wireEvents();

  const lastScan = await loadLastScan();
  if (lastScan) {
    state.scan = lastScan;
    renderScan(lastScan);
    setStatus("Loaded last scan from this browser.", "");
  }
}

function wireEvents() {
  elements.scanButton.addEventListener("click", runScan);
  elements.exportButton.addEventListener("click", exportActiveView);
  elements.viewResultsButton.addEventListener("click", openResultsPage);

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeView = button.dataset.view;
      document.querySelectorAll(".tab-button").forEach((tab) => {
        tab.classList.toggle("active", tab === button);
      });
      renderResults();
    });
  });
}

async function runScan() {
  if (state.isScanning) return;

  state.isScanning = true;
  setControlsEnabled(false);
  resetProgress();

  try {
    setStatus("Detecting account...", "");
    const currentUser = await fetchCurrentUser();
    elements.accountBadge.textContent = `@${currentUser.username}`;

    const shouldRefreshFollowers = elements.refreshFollowersInput.checked || !state.scan?.followers?.length;
    const followers = shouldRefreshFollowers
      ? await fetchAllUsers({
          userId: currentUser.id,
          type: "followers",
          label: "fans"
        })
      : state.scan.followers;

    const following = await fetchAllUsers({
      userId: currentUser.id,
      type: "following",
      label: "follows"
    });

    const comparison = compareRelationships(followers, following);
    const scan = {
      account: currentUser,
      scannedAt: new Date().toISOString(),
      followersScannedAt: shouldRefreshFollowers
        ? new Date().toISOString()
        : state.scan?.followersScannedAt || state.scan?.scannedAt || null,
      followers,
      following,
      ...comparison
    };

    state.scan = scan;
    await saveLastScan(scan);
    renderScan(scan);
    setStatus(shouldRefreshFollowers ? "Done." : "Done. Fans reused.", `${followers.length + following.length}`);
  } catch (error) {
    console.warn(error);
    setStatus(error.message || "Scan failed.", "");
  } finally {
    state.isScanning = false;
    setControlsEnabled(true);
  }
}

async function fetchAllUsers({ userId, type, label }) {
  const users = [];
  let nextMaxId = null;
  let page = 0;

  do {
    page += 1;
    setStatus(`Fetching ${label}...`, users.length);

    const data = await fetchRelationshipPage({
      userId,
      type,
      maxId: nextMaxId
    });

    users.push(...(data.users || []));
    nextMaxId = data.has_more && data.next_max_id ? data.next_max_id : null;

    setStatus(`Fetched ${label}.`, users.length);

    if (nextMaxId) {
      await sleep(DEFAULT_DELAY_MS);
    }
  } while (nextMaxId);

  console.info(`Fetched ${users.length} ${label} across ${page} pages.`);
  return users;
}

function renderScan(scan) {
  elements.accountBadge.textContent = scan.account?.username
    ? `@${scan.account.username}`
    : "Scanned";
  elements.followersCount.textContent = scan.followers.length;
  elements.followingCount.textContent = scan.following.length;
  elements.mutualCount.textContent = scan.mutual.length;
  elements.notFollowingBackCount.textContent = scan.notFollowingBack.length;
  elements.notFollowedBackCount.textContent = scan.notFollowedBack.length;
  elements.exportButton.disabled = false;
  elements.viewResultsButton.disabled = false;
  renderResults();
}

function renderResults() {
  elements.resultsList.replaceChildren();

  const users = getActiveUsers();
  if (!users.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = state.scan
      ? "No accounts in this view."
      : "Run a scan to compare accounts.";
    elements.resultsList.append(empty);
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

  elements.resultsList.append(fragment);
}

function exportActiveView() {
  const users = getActiveUsers();
  const label = state.activeView === "notFollowingBack"
    ? "they-dont"
    : "you-dont";

  exportUsersCsv(users, `follow-check-${label}.csv`);
}

function openResultsPage() {
  chrome.tabs.create({
    url: chrome.runtime.getURL("results.html")
  });
}

function getActiveUsers() {
  if (!state.scan) return [];
  return state.activeView === "notFollowingBack"
    ? state.scan.notFollowingBack
    : state.scan.notFollowedBack;
}

function setControlsEnabled(enabled) {
  elements.scanButton.disabled = !enabled;
  elements.scanButton.textContent = enabled ? "Scan" : "Scanning...";
  elements.exportButton.disabled = !enabled || !state.scan;
  elements.viewResultsButton.disabled = !enabled || !state.scan;
}

function resetProgress() {
  elements.progressBar.removeAttribute("value");
  elements.progressCount.textContent = "0";
}

function setStatus(message, count) {
  elements.statusText.textContent = message;
  elements.progressCount.textContent = String(count ?? "");
}
