const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadBtn = document.querySelector("#load-btn");
const statusText = document.querySelector("#status");
const notesList = document.querySelector("#notes-list");

function setStatus(message, type) {
  statusText.textContent = message;
  statusText.className = type;
}

async function request(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error("Request failed with status " + response.status);
  }

  const data = await response.json();
  return { status: response.status, data: data };
}

function showNote(note) {
  const li = document.createElement("li");

  const title = document.createElement("strong");
  title.textContent = note.title;

  const body = document.createElement("p");
  body.textContent = note.body;

  li.append(title, body);
  notesList.appendChild(li);
}

async function loadNotes() {
  setStatus("Loading notes...", "");
  loadBtn.disabled = true;
  notesList.textContent = "";

  try {
    const result = await request(API_URL + "?_limit=10");
    const notes = result.data;

    if (notes.length === 0) {
      const empty = document.createElement("li");
      empty.textContent = "No notes yet.";
      notesList.appendChild(empty);
    } else {
      notes.forEach(showNote);
    }

    setStatus("Loaded " + notes.length + " notes from the server.", "success");
  } catch (error) {
    setStatus("Could not load notes. Please try again.", "error");
    console.error(error);
  } finally {
    loadBtn.disabled = false;
  }
}

loadBtn.addEventListener("click", loadNotes);
