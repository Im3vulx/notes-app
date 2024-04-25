const { invoke } = window.__TAURI__.tauri;

// Fonction pour enregistrer une nouvelle note
async function saveNote() {
  try {
    const title = document.querySelector("#save-note-title").value;
    const content = document.querySelector("#save-note-content").value;
    if (!title || !content) {
      console.error("Title and content are required.");
      return;
    }
    await invoke("save_note", { title, content });
    await displayAllNotes(); // Rafraîchir l'affichage des notes après l'ajout
    const saveNoteForm = document.querySelector("#save-note-form");
    saveNoteForm.style.display = "none"; // Masquer le formulaire après l'ajout
  } catch (error) {
    console.error("Error saving note:", error);
  }
}

// Fonction pour afficher toutes les notes
async function displayAllNotes() {
  try {
    const notesString = await invoke("read_note");
    const allNotesContainer = document.querySelector("#all-notes");
    allNotesContainer.innerHTML = ''; // Réinitialiser le contenu du conteneur
    if (!notesString || notesString.trim() === "") {
      console.error("Notes string is empty or undefined.");
      return;
    }
    const notes = JSON.parse(notesString);
    if (!Array.isArray(notes)) {
      console.error("Invalid JSON string.");
      return;
    }
    notes.forEach(note => {
      const noteElement = document.createElement('div');
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
    console.error("Error displaying notes:", error);
  }
}

// Fonction pour afficher le formulaire de mise à jour d'une note
async function showUpdateForm(id) {
  try {
    const noteElement = document.querySelector(`.note[data-id="${id}"]`);
    const title = noteElement.querySelector('.note-title').innerText;
    const content = noteElement.querySelector('.note-content').innerText;

    // Remplir les champs du formulaire avec les données de la note sélectionnée
    document.querySelector('#update-note-title').value = title;
    document.querySelector('#update-note-content').value = content;

    // Afficher le formulaire de mise à jour
    const updateNoteFormContainer = document.getElementById('update-note-form-container');
    updateNoteFormContainer.style.display = 'block';

    // Gérer l'événement de soumission du formulaire de mise à jour
    const updateNoteForm = document.getElementById('update-note-form');
    updateNoteForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const updatedTitle = document.querySelector('#update-note-title').value;
      const updatedContent = document.querySelector('#update-note-content').value;
      if (!updatedTitle || !updatedContent) {
        console.error("Title and content are required.");
        return;
      }
      await invoke("update_note", { id, title: updatedTitle, content: updatedContent });
      await displayAllNotes(); // Rafraîchir l'affichage des notes après la mise à jour
      updateNoteFormContainer.style.display = 'none'; // Masquer le formulaire après la soumission
    });
  } catch (error) {
    console.error("Error updating note:", error);
  }
}

// Gestionnaire d'événement pour le clic sur le bouton de mise à jour d'une note
async function updateNote() {
  try {
    const id = parseInt(event.target.parentNode.dataset.id);
    if (isNaN(id)) {
      console.error("Invalid note ID.");
      return;
    }
    await showUpdateForm(id); // Afficher le formulaire de mise à jour avec l'ID de la note
  } catch (error) {
    console.error("Error updating note:", error);
  }
}

// Gestionnaire d'événement pour le chargement initial de la page
window.addEventListener("DOMContentLoaded", () => {
  const addNoteButton = document.querySelector("#add-note-button");
  const saveNoteButton = document.querySelector("#save-note-button");
  const allNotesContainer = document.querySelector("#all-notes");

  addNoteButton.addEventListener("click", () => {
    const saveNoteForm = document.querySelector("#save-note-form");
    saveNoteForm.style.display = "block";
  });

  saveNoteButton.addEventListener("click", saveNote);

  allNotesContainer.addEventListener("click", async (event) => {
    const target = event.target;
    if (target.classList.contains("delete-note-button")) {
      const id = parseInt(target.parentNode.dataset.id);
      if (!isNaN(id)) {
        await invoke("delete_note", { id });
        await displayAllNotes(); // Rafraîchir l'affichage des notes après la suppression
      }
    } else if (target.classList.contains("update-note-button")) {
      await updateNote();
    }
  });

  displayAllNotes();
});
