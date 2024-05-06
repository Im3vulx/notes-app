// Importer la fonction d'invocation de Tauri pour communiquer avec le backend
const { invoke } = window.__TAURI__.tauri;

// Déclarations des variables globales pour les éditeurs Quill
let quillSave, quillUpdate;

// Fonction pour enregistrer une nouvelle note
async function saveNote() {
  try {
    // Récupérer les valeurs des champs de saisie et du contenu Quill
    const title = document.querySelector("#save-note-title").value;
    const tagsInput = document.querySelector("#save-note-tags").value;
    const content = quillSave.root.innerHTML;
    const tags = tagsInput.split(",").map(tag => tag.trim());

    // Vérifier si le titre et le contenu sont renseignés
    if (!title || !content) {
      console.error("Le titre et le contenu sont requis.");
      return;
    }

    // Appeler la fonction backend pour enregistrer la note
    await invoke("save_note", { title, content, tags });

    // Rafraîchir l'affichage des notes après l'ajout
    await displayAllNotes();

    // Masquer le formulaire après l'ajout
    const saveNoteForm = document.querySelector("#save-note-form");
    saveNoteForm.style.display = "none";
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la note:", error);
  }
}

// Fonction pour afficher toutes les notes
async function displayAllNotes() {
  try {
    // Récupérer la liste de toutes les notes depuis le backend
    const notesString = await invoke("read_note");
    const allNotesContainer = document.querySelector("#all-notes");
    allNotesContainer.innerHTML = ""; // Réinitialiser le contenu du conteneur

    // Vérifier si la liste de notes est vide
    if (!notesString || notesString.trim() === "") {
      console.error("La chaîne de notes est vide ou indéfinie.");
      return;
    }

    // Parser la chaîne JSON des notes
    const notes = JSON.parse(notesString);

    // Vérifier si les notes sont un tableau
    if (!Array.isArray(notes)) {
      console.error("Chaîne JSON invalide.");
      return;
    }

    // Afficher chaque note dans le conteneur
    notes.forEach((note) => {
      const noteElement = document.createElement("div");
      noteElement.innerHTML = `
        <div class="note" data-id="${note.id}">
          <div class="note-title">${note.title}</div>
          <div class="note-content">${note.content}</div>
          <div class="note-tags">${note.tags}</div>
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
    // Récupérer la note par son ID depuis le backend
    const note = await fetchNoteById(id);

    // Vérifier si la note existe
    if (!note) {
      console.error("La note avec l'ID spécifié n'a pas été trouvée.");
      return;
    }

    // Pré-remplir le formulaire de mise à jour avec les données de la note
    document.querySelector("#update-note-id").value = note.id;
    document.querySelector("#update-note-title").value = note.title;
    quillUpdate.root.innerHTML = note.content;
    const tagsInput = document.getElementById("update-note-tags").value  = note.tags;
    document.getElementById("update-note-form-container").style.display = "block";
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la note:", error);
  }
}

// Fonction pour récupérer une note par son ID
async function fetchNoteById(id) {
  try {
    // Récupérer la liste de toutes les notes depuis le backend
    const notesString = await invoke("read_note");
    const notes = JSON.parse(notesString);

    // Rechercher la note avec l'ID spécifié
    return notes.find((note) => note.id === id);
  } catch (error) {
    console.error("Erreur lors de la récupération de la note par ID:", error);
    return null;
  }
}

// Fonction pour enregistrer une note mise à jour
async function saveUpdatedNote() {
  try {
    // Récupérer les données du formulaire de mise à jour
    const id = parseInt(document.querySelector("#update-note-id").value);
    const title = document.querySelector("#update-note-title").value;
    const content = quillUpdate.root.innerHTML;
    const tagsInput = document.querySelector("#update-note-tags").value;
    const tags = tagsInput.split(",").map(tag => tag.trim());

    // Vérifier si les données sont valides
    if (!id || isNaN(id) || !title.trim() || !content.trim()) {
      console.error("Un titre et un contenu sont requis.");
      return;
    }

    // Appeler la fonction backend pour mettre à jour la note
    await invoke("update_note", { id, title, content, tags });

    // Rafraîchir l'affichage des notes après la mise à jour
    await displayAllNotes();

    // Masquer le formulaire de mise à jour
    document.getElementById("update-note-form-container").style.display = "none";
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la note:", error);
  }
}

// Gestionnaire d'événement pour le clic sur le bouton de mise à jour d'une note
async function updateNote() {
  try {
    // Récupérer l'ID de la note à mettre à jour
    const id = parseInt(event.target.closest(".note").dataset.id);
    if (isNaN(id)) {
      console.error("Identifiant de note invalide.");
      return;
    }

    // Afficher le formulaire de mise à jour avec les données de la note
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
    // Récupérer la liste de toutes les notes depuis le backend
    const notesString = await invoke("read_note");
    const allNotesContainer = document.querySelector("#all-notes");
    allNotesContainer.innerHTML = ""; // Réinitialiser le contenu du conteneur

    // Vérifier si la liste de notes est vide
    if (!notesString || notesString.trim() === "") {
      console.error("La chaîne de notes est vide ou indéfinie.");
      return;
    }

    // Parser la chaîne JSON des notes
    const notes = JSON.parse(notesString);

    // Vérifier si les notes sont un tableau
    if (!Array.isArray(notes)) {
      console.error("Chaîne JSON invalide.");
      return;
    }

    // Afficher chaque note qui correspond au texte de recherche
    notes.forEach((note) => {
      if (note.title.toLowerCase().includes(searchText.toLowerCase()) ||
          note.content.toLowerCase().includes(searchText.toLowerCase())) {
        const noteElement = document.createElement("div");
        noteElement.innerHTML = `
          <div class="note" data-id="${note.id}">
            <div class="note-title">${note.title}</div>
            <div class="note-content">${note.content}</div>
            <div class="note-tags">${note.tags}</div>
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
  // Sélection des éléments HTML
  const addNoteButton = document.querySelector("#add-note-button");
  const saveNoteButton = document.querySelector("#save-note-button");
  const allNotesContainer = document.querySelector("#all-notes");

  // Ajout d'un écouteur d'événement pour le clic sur le bouton "Ajouter une note"
  addNoteButton.addEventListener("click", () => {
    document.querySelector("#save-note-form").style.display = "block";
  });

  // Ajout d'un écouteur d'événement pour le clic sur le bouton "Enregistrer"
  saveNoteButton.addEventListener("click", saveNote);

  // Ajout d'un écouteur d'événement pour gérer les clics sur les boutons de chaque note
  allNotesContainer.addEventListener("click", async (event) => {
    const target = event.target;
    if (target.classList.contains("delete-note-button")) {
      // Supprimer une note lorsque le bouton "Supprimer" est cliqué
      const id = parseInt(target.parentNode.dataset.id);
      if (!isNaN(id)) {
        await invoke("delete_note", { id });
        await displayAllNotes();
      }
    } else if (target.classList.contains("update-note-button")) {
      // Afficher le formulaire de mise à jour lors du clic sur le bouton "Modifier"
      await updateNote();
    }
  });

  // Ajout d'un écouteur d'événement pour le soumission du formulaire de mise à jour
  const updateNoteForm = document.getElementById("update-note-form");
  updateNoteForm.addEventListener("submit", saveUpdatedNoteButton);

  // Affichage initial de toutes les notes lors du chargement de la page
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