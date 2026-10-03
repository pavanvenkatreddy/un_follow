export function compareRelationships(followers, following) {
  const followerIds = new Set(followers.map((user) => normalizeId(user.pk)));
  const followingIds = new Set(following.map((user) => normalizeId(user.pk)));

  return {
    mutual: followers.filter((user) => followingIds.has(normalizeId(user.pk))),
    notFollowingBack: following.filter((user) => !followerIds.has(normalizeId(user.pk))),
    notFollowedBack: followers.filter((user) => !followingIds.has(normalizeId(user.pk)))
  };
}

export function compareFollowingDiscovery(myFollowing, targetFollowing) {
  const myFollowingIds = new Set(myFollowing.map((user) => normalizeId(user.pk)));
  const bothFollow = targetFollowing.filter((user) => myFollowingIds.has(normalizeId(user.pk)));
  const targetOnly = targetFollowing.filter((user) => !myFollowingIds.has(normalizeId(user.pk)));
  const overlapPercent = targetFollowing.length
    ? Math.round((bothFollow.length / targetFollowing.length) * 100)
    : 0;

  return {
    targetOnly,
    bothFollow,
    overlapPercent
  };
}

export function compareNetworkDiscovery(myFollowing, targets, options = {}) {
  const includeSelf = Boolean(options.includeSelf);
  const myFollowingIds = new Set(myFollowing.map((user) => normalizeId(user.pk)));
  const accountMap = new Map();

  targets.forEach((target) => {
    target.following.forEach((account) => {
      addAccountFollower(accountMap, account, {
        id: target.id,
        username: target.username
      });
    });
  });

  if (includeSelf) {
    myFollowing.forEach((account) => {
      addAccountFollower(accountMap, account, {
        id: "me",
        username: "me",
        isSelf: true
      });
    });
  }

  const includedCount = targets.length + (includeSelf ? 1 : 0);

  const groups = Array.from(accountMap.values())
    .map((entry) => ({
      account: entry.account,
      followedBy: entry.followedBy,
      followedByCount: entry.followedBy.length,
      iFollow: myFollowingIds.has(normalizeId(entry.account.pk))
    }))
    .sort((a, b) => {
      if (b.followedByCount !== a.followedByCount) {
        return b.followedByCount - a.followedByCount;
      }

      return String(a.account.username || "").localeCompare(String(b.account.username || ""));
    });

  return {
    allIncludedFollow: groups.filter((group) => group.followedByCount === includedCount),
    notMine: includeSelf
      ? groups.filter((group) => group.followedByCount > 1 && !group.iFollow)
      : [],
    uniqueFollows: groups.filter((group) => group.followedByCount === 1),
    groups
  };
}

function normalizeId(id) {
  return String(id ?? "");
}

function addAccountFollower(accountMap, account, follower) {
  const accountId = normalizeId(account.pk);
  if (!accountId) return;

  const existing = accountMap.get(accountId) || {
    account,
    followedBy: [],
    followerIds: new Set()
  };
  const followerId = normalizeId(follower.id);

  if (!existing.followerIds.has(followerId)) {
    existing.followedBy.push(follower);
    existing.followerIds.add(followerId);
  }

  accountMap.set(accountId, existing);
}
