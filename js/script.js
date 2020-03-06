const BUGZILLA_DOMAIN = "https://bugzilla.mozilla.org";
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

async function getQuickSearchResults(query) {
  const json = await fetch(`${BUGZILLA_DOMAIN}/rest/bug?quicksearch=${encodeURIComponent(query)}&include_fields=${USED_FIELDS.join(",")}`)
    .then(r => r.json());
  if (json.error) {
    throw new Error(json.message);
  }
  return json.bugs;
}

async function getBoards(query) {
  let results = await getQuickSearchResults(query);
  let boards = {
    done: [],
    in_progress: [],
    not_started: [],
  };
  for (let data of results) {
    if (data.resolution == "FIXED") {
      boards.done.push(data);
    } else if (data.status == "ASSIGNED" || !data.assigned_to.includes("nobody")) {
      boards.in_progress.push(data);
    } else {
      boards.not_started.push(data);
    }
  }
  return boards;
}

async function loadBoard(query) {
  document.body.classList.add("loading");

  let boards;
  try {
    boards = await getBoards(query);
  } catch (e) {
    console.log(e);
    document.getElementById("status").textContent = e.message;
    document.body.classList.remove("loading");
    return;
  }

  let bugTemplate = document.getElementById("bug-template").content;
  for (let board in boards) {
    let container = document.getElementById(board);
    container.textContent = "";
    container.append(...boards[board].map(bug => {
      let element = bugTemplate.cloneNode(true);
      element.querySelector(".bug").href = BUGZILLA_DOMAIN + "/" + bug.id;
      element.querySelector(".bug-title").textContent = bug.summary;
      if (board != "not_started") {
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
  let queryInput = document.getElementById("query");
  queryInput.addEventListener("change", () => {
    loadBoard(queryInput.value);
  });

  let searchParams = new URLSearchParams(location.search);
  let query = searchParams.get("query");
  let bugId = searchParams.get("id");
  if (!query && bugId) {
    query = "ALL blocked:" + bugId;
  }

  if (query) {
    loadBoard(query);
    queryInput.value = query;
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