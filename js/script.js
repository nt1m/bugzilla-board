const BUGZILLA_DOMAIN = "https://bugzilla.mozilla.org/";
const USED_FIELDS = [
  "id",
  "summary",
  "status",
  "resolution",
  "depends_on",
  "type",
  "component",
  "product",
  "keywords",
  "assigned_to",
];

function getBug(bug) {
  return fetch(`${BUGZILLA_DOMAIN}/rest/bug/${bug}?include_fields=${USED_FIELDS.join(",")}`)
    .then(r => r.json())
    .then(r => r.bugs[0]);
}

async function getBoards(bugId) {
  let metadata = await getBug(bugId);
  let boards = {
    done: [],
    in_progress: [],
    not_started: [],
  };
  for (let bug of metadata.depends_on) {
    let data = await getBug(bug);
    if (data.resolution == "FIXED") {
      boards.done.push(data);
    } else if (data.status == "ASSIGNED") {
      boards.in_progress.push(data);
    } else {
      boards.not_started.push(data);
    }
  }
  return { boards, metadata };
}

async function loadBug(bugId) {
  document.body.classList.add("loading");

  let { metadata, boards } = await getBoards(bugId);

  document.getElementById("bug-title").textContent =
    metadata.id + " - " + metadata.summary;
  document.getElementById("bug-title").href = BUGZILLA_DOMAIN + metadata.id;

  let bugTemplate = document.getElementById("bug-template").content;
  for (let board in boards) {
    let container = document.getElementById(board);
    container.textContent = "";
    container.append(...boards[board].map(bug => {
      let element = bugTemplate.cloneNode(true);
      element.querySelector(".bug").href = BUGZILLA_DOMAIN + bug.id;
      element.querySelector(".bug-title").textContent = bug.summary;
      if (bug.status != "NEW") {
        element.querySelector(".bug-assignee").textContent = bug.assigned_to_detail.nick || bug.assigned_to_detail.email;
      }
      element.querySelector(".bug-type").textContent = bug.type;
      element.querySelector(".bug-keywords").textContent = bug.keywords.join(", ");

      let compStr = bug.product + " :: " + bug.component;
      let compElement = element.querySelector(".bug-component");
      compElement.textContent = compStr;

      let {background: compBackground, textColor: compColor } = hashColor(compStr);
      compElement.style.backgroundColor = compBackground;
      compElement.style.color = compColor;
      return element;
    }));
  }
  document.body.classList.remove("loading");
}

(function init() {
  let idInput = document.getElementById("bug-id");
  idInput.addEventListener("change", () => {
    loadBug(idInput.value);
  });

  let searchParams = new URLSearchParams(location.search);
  let bugId = searchParams.get("id");
  if (bugId) {
    loadBug(bugId);
    idInput.value = bugId;
  }
})();


function hashCode(str) { // java String#hashCode
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