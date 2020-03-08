const BUGZILLA_DOMAIN = "https://bugzilla.mozilla.org";
const USED_FIELDS = [
  "id",
  "summary",
  "status",
  "resolution",
  "depends_on",
  "priority",
  "type",
  "component",
  "product",
  "keywords",
  "whiteboard",
  "assigned_to",
];

customElements.define("bug-list", class List extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    if (this.shadowRoot) {
      return;
    }
    this.setAttribute("draggable", "true");

    const template = document.getElementById("list");
    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.append(template.content.cloneNode(true));

    this.deleteButton = this.shadowRoot.querySelector(".list-delete");
    this.deleteButton.addEventListener("click", () => {
      if (window.confirm(`Do you really want to delete "${this.name}"?`)) {
        this.remove();
      }
    });

    this.editButton = this.shadowRoot.querySelector(".list-edit");
    this.editButton.addEventListener("click", () => {
      this.showEditDialog();
    });

    this.countText = this.shadowRoot.querySelector(".list-count");
    this.progressBar = this.shadowRoot.querySelector(".list-progress");
    this.statusText = this.shadowRoot.querySelector(".list-status");
    this.items = this.shadowRoot.querySelector(".list-items");

    this.addEventListener("dragenter", (ev) => {
      if (document.querySelector(".dragged")) {
        this.classList.add("dragover");
        UI_STATE.lastDropTarget = this;
      }
    });

    this.addEventListener("dragleave", (ev) => {
      this.classList.remove("dragover");
    });

    this.addEventListener("dragstart", (ev) => {
      if (!ev.composedPath()[0].classList.contains("bug")) {
        this.classList.add("dragged");
      }
    });

    this.addEventListener("dragend", (ev) => {
      this.classList.remove("dragged");
      const destination = UI_STATE.lastDropTarget;
      if (destination) {
        destination.parentNode.insertBefore(this, destination);
        UI_STATE.lastDropTarget = null;
        updateURL();
      }
    });
  }

  get name() {
    return this.dataset.name;
  }

  set name(newName) {
    if (this.name == newName) {
      return;
    }
  
    this.shadowRoot.querySelector(".list-name").textContent = newName;
    this.dataset.name = newName;
    updateURL();
  }

  get query() {
    return this.dataset.query;
  }

  set query(newQuery) {
    if (this.query == newQuery) {
      return;
    }

    this.statusText.textContent = "Loading";
    this.items.textContent = "";

    this.fetchAndAppendBugs(newQuery).then(results => {
      if (!results.length) {
        this.statusText.textContent = "No bugs found";
      } else {
        this.statusText.textContent = "";
      }
    });
    this.dataset.query = newQuery;
    updateURL();
  }

  remove() {
    super.remove();
    updateURL();
  }

  async fetchAndAppendBugs(query) {
    let results;
    try {
      results = await getQuickSearchResults(query);
    } catch (e) {
      results = [];
      this.statusText.textContent = e.message;
      return results;
    }

    let resolvedCount = 0;
    let bugTemplate = document.getElementById("bug-template").content;
    this.items.append(...results.map(bug => {
      let element = bugTemplate.cloneNode(true);
      let bugElement = element.querySelector(".bug");
      bugElement.href = BUGZILLA_DOMAIN + "/" + bug.id;

      let isResolved = ["RESOLVED", "VERIFIED"].includes(bug.status);
      bugElement.classList.toggle("resolved", isResolved);
      if (isResolved) {
        resolvedCount++;
      }

      element.querySelector(".bug-title").textContent = bug.summary;
      if (list != "not_started") {
        element.querySelector(".bug-assignee").textContent = bug.assigned_to_detail.nick || bug.assigned_to_detail.email;
      }
      element.querySelector(".bug-type").textContent = bug.type + (bug.priority != "--" ? " - " + bug.priority : "");
      element.querySelector(".bug-keywords").textContent = bug.keywords.join(", ");
      element.querySelector(".bug-whiteboard").textContent = bug.whiteboard;

      let compStr = bug.product + " :: " + bug.component;
      let compElement = element.querySelector(".bug-component");
      compElement.textContent = compStr;

      let { background: compBackground, textColor: compColor } = hashColor(compStr);
      compElement.style.backgroundColor = compBackground;
      compElement.style.color = compColor;
      return element;
    }));

    this.countText.textContent = results.length;
    this.progressBar.value = (resolvedCount / results.length) * 100;
    return results;
  }

  showEditDialog() {
    const dialog = document.getElementById("edit-list");
    const title = document.getElementById("edit-list-title");
    title.textContent = "Edit list";

    const nameInput = document.getElementById("edit-list-name");
    nameInput.value = this.name;

    const queryInput = document.getElementById("edit-list-query");
    queryInput.value = this.query;

    const cancelButton = document.getElementById("edit-list-cancel");
    cancelButton.onclick = () => dialog.close();

    const form = dialog.querySelector("form");
    form.onsubmit = e => {
      this.name = nameInput.value;
      this.query = queryInput.value;
      dialog.close();
      e.preventDefault();
    };
    dialog.showModal();
  }
});

async function getQuickSearchResults(query) {
  const json = await fetch(`${BUGZILLA_DOMAIN}/rest/bug?quicksearch=${encodeURIComponent(query)}&include_fields=${USED_FIELDS.join(",")}`)
    .then(r => r.json());
  if (json.error) {
    throw new Error(json.message);
  }
  return json.bugs;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

function hashColor(str) {
  const i = hashCode(str);
  const c = (i & 0x00FFFFFF)
    .toString(16)
    .toUpperCase();
  const background = "00000".substring(0, 6 - c.length) + c;
  const r = parseInt(background.substring(4, 6), 16);
  const g = parseInt(background.substring(2, 4), 16);
  const b = parseInt(background.substring(0, 2), 16);

  const isBackgroundDark = (0.2125 * r + 0.7154 * g + 0.0721 * b) <= 110;
  const textColor = isBackgroundDark ? "#ffffff" : "#000000";
  return { background: "#" + background, textColor };
}