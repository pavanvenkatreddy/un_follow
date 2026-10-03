export function exportUsersCsv(users, filename) {
  const rows = [
    ["username", "full_name", "instagram_id", "profile_url"],
    ...users.map((user) => [
      user.username || "",
      user.full_name || "",
      user.pk || "",
      user.username ? `https://www.instagram.com/${user.username}/` : ""
    ])
  ];

  const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value) {
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll("\"", "\"\"")}"`;
}
