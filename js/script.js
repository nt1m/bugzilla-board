const BUGZILLA_DOMAIN = "https://bugzilla.mozilla.org/";
function getBug(bug) {
  return fetch(`${BUGZILLA_DOMAIN}/rest/bug/${bug}`)
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
      element.querySelector(".bug-component").textContent = bug.product + " :: " + bug.component;
      element.querySelector(".bug-component").style.backgroundColor = stringToColor(bug.product + " :: " + bug.component);
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

// From https://www.designedbyaturtle.co.uk/convert-string-to-hexidecimal-colour-with-javascript-vanilla/
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

function stringToColor(str) {
  let i = hashCode(str);
  let hex = ((i >> 24) & 0xFF).toString(16) +
    ((i >> 16) & 0xFF).toString(16) +
    ((i >> 8) & 0xFF).toString(16) +
    (i & 0xFF).toString(16);

  return "#" + hex.padStart(6, "0");
}