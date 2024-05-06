const { invoke } = window.__TAURI__.tauri;

let quillSave, quillUpdate;

// Fonction pour enregistrer une nouvelle note
async function saveNote() {
  try {
    const title = document.querySelector("#save-note-title").value;
    const content = quillSave.root.innerHTML; // Utiliser l'instance de Quill pour récupérer le contenu
    if (!title || !content) {
      console.error("Le titre et le contenu sont requis.");
      return;
    }
    await invoke("save_note", { title, content });
    await displayAllNotes(); // Rafraîchir l'affichage des notes après l'ajout
    const saveNoteForm = document.querySelector("#save-note-form");
    saveNoteForm.style.display = "none"; // Masquer le formulaire après l'ajout
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la note:", error);
  }
}

// Fonction pour afficher toutes les notes
async function displayAllNotes() {
  try {
    const notesString = await invoke("read_note");
    const allNotesContainer = document.querySelector("#all-notes");
    allNotesContainer.innerHTML = ""; // Réinitialiser le contenu du conteneur
    if (!notesString || notesString.trim() === "") {
      console.error("La chaîne de notes est vide ou indéfinie.");
      return;
    }
    const notes = JSON.parse(notesString);
    if (!Array.isArray(notes)) {
      console.error("Chaîne JSON invalide.");
      return;
    }
    notes.forEach((note) => {
      const noteElement = document.createElement("div");
      noteElement.innerHTML = `
        <div class="note" data-id="${note.id}">
          <div class="note-title">${note.title}</div>
          <div class="note-content">${note.content}</div>
          <button class="update-note-button">Modifier</button>
          <button class="delete-note-button">Supprimer</button>
        </div>
      `;
      allNotesContainer.appendChild(noteElement);
    });
  } catch (error) {
    console.error("Erreur lors de l'affichage des notes:", error);
  }
}

// Fonction pour afficher le formulaire de mise à jour d'une note
async function showUpdateForm(id) {
  try {
    const note = await fetchNoteById(id);
    if (!note) {
      console.error("La note avec l'ID spécifié n'a pas été trouvée.");
      return;
    }
    document.querySelector("#update-note-id").value = note.id;
    document.querySelector("#update-note-title").value = note.title;
    quillUpdate.root.innerHTML = note.content;
    document.getElementById("update-note-form-container").style.display = "block";
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la note:", error);
  }
}

// Fonction pour récupérer une note par son ID
async function fetchNoteById(id) {
  try {
    const notesString = await invoke("read_note");
    const notes = JSON.parse(notesString);
    return notes.find((note) => note.id === id);
  } catch (error) {
    console.error("Erreur lors de la récupération de la note par ID:", error);
    return null;
  }
}

// Fonction pour enregistrer une note mise à jour
async function saveUpdatedNote() {
  try {
    const id = parseInt(document.querySelector("#update-note-id").value);
    const title = document.querySelector("#update-note-title").value;
    const content = quillUpdate.root.innerHTML;
    if (!id || isNaN(id) || !title.trim() || !content.trim()) {
      console.error("Identifiant, titre et contenu sont requis.");
      return;
    }
    await invoke("update_note", { id, title, content });
    await displayAllNotes();
    document.getElementById("update-note-form-container").style.display = "none";
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la note:", error);
  }
}

// Gestionnaire d'événement pour le clic sur le bouton de mise à jour d'une note
async function updateNote() {
  try {
    const id = parseInt(event.target.closest(".note").dataset.id);
    if (isNaN(id)) {
      console.error("Identifiant de note invalide.");
      return;
    }
    await showUpdateForm(id);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la note:", error);
  }
}

// Gestionnaire d'événement pour le clic sur le bouton de sauvegarde lors de la mise à jour de la note
async function saveUpdatedNoteButton(event) {
  event.preventDefault();
  await saveUpdatedNote();
}

// Fonction pour afficher toutes les notes filtrées par le titre et le contenu de recherche
async function displayFilteredNotes(searchText) {
  try {
    const notesString = await invoke("read_note");
    const allNotesContainer = document.querySelector("#all-notes");
    allNotesContainer.innerHTML = ""; // Réinitialiser le contenu du conteneur
    if (!notesString || notesString.trim() === "") {
      console.error("La chaîne de notes est vide ou indéfinie.");
      return;
    }
    const notes = JSON.parse(notesString);
    if (!Array.isArray(notes)) {
      console.error("Chaîne JSON invalide.");
      return;
    }
    notes.forEach((note) => {
      if (note.title.toLowerCase().includes(searchText.toLowerCase()) ||
          note.content.toLowerCase().includes(searchText.toLowerCase())) {
        const noteElement = document.createElement("div");
        noteElement.innerHTML = `
          <div class="note" data-id="${note.id}">
            <div class="note-title">${note.title}</div>
            <div class="note-content">${note.content}</div>
            <button class="update-note-button">Modifier</button>
            <button class="delete-note-button">Supprimer</button>
          </div>
        `;
        allNotesContainer.appendChild(noteElement);
      }
    });
  } catch (error) {
    console.error("Erreur lors de l'affichage des notes filtrées:", error);
  }
}

// Gestionnaire d'événement pour la saisie dans le champ de recherche
document.querySelector("#search-note-input").addEventListener("input", async (event) => {
  const searchText = event.target.value.trim();
  if (searchText !== "") {
    await displayFilteredNotes(searchText);
  } else {
    await displayAllNotes();
  }
});


// Gestionnaire d'événement pour le chargement initial de la page
window.addEventListener("DOMContentLoaded", () => {
  const addNoteButton = document.querySelector("#add-note-button");
  const saveNoteButton = document.querySelector("#save-note-button");
  const allNotesContainer = document.querySelector("#all-notes");

  addNoteButton.addEventListener("click", () => {
    document.querySelector("#save-note-form").style.display = "block";
  });

  saveNoteButton.addEventListener("click", saveNote);

  allNotesContainer.addEventListener("click", async (event) => {
    const target = event.target;
    if (target.classList.contains("delete-note-button")) {
      const id = parseInt(target.parentNode.dataset.id);
      if (!isNaN(id)) {
        await invoke("delete_note", { id });
        await displayAllNotes();
      }
    } else if (target.classList.contains("update-note-button")) {
      await updateNote();
    }
  });

  const updateNoteForm = document.getElementById("update-note-form");
  updateNoteForm.addEventListener("submit", saveUpdatedNoteButton);

  displayAllNotes();
});

// Initialiser Quill pour le formulaire d'ajout de note
quillSave = new Quill("#editor", {
  theme: "snow",
  placeholder: "Entrez le contenu de la note...",
});

// Initialiser Quill pour le formulaire de mise à jour de note
quillUpdate = new Quill("#update-editor", {
  theme: "snow",
  placeholder: "Entrez un nouveau contenu...",
});
