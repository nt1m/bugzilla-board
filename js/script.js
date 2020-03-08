window.UI_STATE = {
  lastDropTarget: null
};

async function loadPreset(preset) {
  document.body.classList.add("loading");

  const lists = document.getElementById("lists");
  lists.textContent = "";
  for (const { name, query } of preset) {
    const list = document.createElement("bug-list");
    lists.append(list);
    list.name = name;
    list.query = query;
  }
  document.body.classList.remove("loading");
}

function showAddDialog() {
  const dialog = document.getElementById("edit-list");
  const title = document.getElementById("edit-list-title");
  title.textContent = "Add new list";

  const nameInput = document.getElementById("edit-list-name");
  nameInput.value = "";

  const queryInput = document.getElementById("edit-list-query");
  queryInput.value = "";

  const cancelButton = document.getElementById("edit-list-cancel");
  cancelButton.onclick = () => dialog.close();

  const form = dialog.querySelector("form");
  form.onsubmit = e => {
    const list = document.createElement("bug-list");
    document.getElementById("lists").append(list);
    list.name = nameInput.value;
    list.query = queryInput.value;

    dialog.close();
    e.preventDefault();
  };
  dialog.showModal();
}

function getBoardURL() {
  const searchParams = new URLSearchParams();

  const titleInput = document.getElementById("title");
  if (titleInput.value) {
    searchParams.append("title", titleInput.value);
  }
  for (const list of document.querySelectorAll("bug-list")) {
    searchParams.append("name", list.name || "");
    searchParams.append("query", list.query);
  }

  const base = new URL(location.pathname, location.href).href;
  return base + "?" + searchParams.toString();
}

function updateURL() {
  history.pushState([], document.title, getBoardURL());
}

function setTitle(title) {
  document.getElementById("title").value = title;
  if (title) {
    document.title = title + " - Bugzilla board";
  } else {
    document.title = "Bugzilla board";
  }
  updateURL();
}

(function init() {
  for (const dialog of document.querySelectorAll("dialog")) {
    window.dialogPolyfill.registerDialog(dialog);
  }

  document.getElementById("title").onchange = function() {
    setTitle(this.value);
  };
  document.getElementById("list-new").onclick = showAddDialog;
  const clipboardButton = document.getElementById("list-url");
  clipboardButton.onclick = async () => {
    await navigator.clipboard.writeText(getBoardURL());
    const lastTextContent = clipboardButton.textContent;
    clipboardButton.textContent = "Copied";
    clipboardButton.classList.add("copied");
    await new Promise(resolve => setTimeout(resolve, 1000));
    clipboardButton.textContent = lastTextContent;
    clipboardButton.classList.remove("copied");
  };

  const searchParams = new URLSearchParams(location.search);
  let title = searchParams.get("title");
  const names = searchParams.getAll("name");
  const queries = searchParams.getAll("query");

  const bugId = searchParams.get("id");
  let preset = [];

  if (!queries.length && bugId) {
    preset = [
      { name: "Not Started", query: `status:NEW blocked:${bugId}` },
      { name: "In Progress", query: `status:ASSIGNED blocked:${bugId}` },
      { name: "Done", query: `resolution:FIXED blocked:${bugId}` }
    ];

    if (!title) {
      title = "Bug " + bugId + " dependencies";
    }
  }

  if (queries.length) {
    for (let i = 0; i < queries.length; i++) {
      const name = names[i] || "";
      preset.push({ name, query: queries[i] });
    }
  }
  if (preset.length) {
    loadPreset(preset);
  }
  if (title) {
    setTitle(title);
  }
})();
