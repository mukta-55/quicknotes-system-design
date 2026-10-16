const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadBtn = document.querySelector("#load-btn");
const statusText = document.querySelector("#status");
const notesList = document.querySelector("#notes-list");
const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitBtn = document.querySelector("#submit-btn");

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
  return li;
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
async function createNote(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (title === "") {
    setStatus("Please type a title first.", "error");
    return;
  }

  if (title.length > 100) {
    setStatus("The title must be 100 characters or fewer.", "error");
    return;
  }

  setStatus("Creating note...", "");
  submitBtn.disabled = true;

  try {
    const result = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title, body: body, userId: 1 }),
    });

    const li = showNote(result.data);
    notesList.prepend(li);

    setStatus(
      "Note created (status " + result.status + ", id " + result.data.id + ").",
      "success",
    );
    noteForm.reset();
  } catch (error) {
    setStatus("Could not create the note. Please try again.", "error");
    console.error(error);
  } finally {
    submitBtn.disabled = false;
  }
}

noteForm.addEventListener("submit", createNote);
