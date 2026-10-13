// Find the HTML elements
const form = document.querySelector('#project-form');
const nameInput = document.querySelector('#name');
const statusInput = document.querySelector('#status');
const projectList = document.querySelector('#project-list');
const emptyState = document.querySelector('#empty-state');
const saveButton = document.querySelector('#save-button');
const cancelButton = document.querySelector('#cancel-button');
const message = document.querySelector('#message');

// The exact localStorage key
const STORAGE_KEY = 'workshop-projects-v1';

// Store projects in memory
const projects = [];

// Track the project currently being edited
let editingId = null;

// Track whether stored data is safe to modify
let storageReady = false;

// Generate a unique ID for each new project
function generateProjectId() {
    return crypto.randomUUID();
}

// Display a message to the user
function showMessage(text) {
    if (message) {
        message.textContent = text;
    }
}

// Validate the stored project array
function isValidProjectArray(data) {
    if (!Array.isArray(data)) {
        return false;
    }

    const ids = new Set();

    for (const project of data) {
        if (
            project === null ||
            typeof project !== 'object' ||
            Array.isArray(project) ||
            typeof project.id !== 'string' ||
            project.id.trim() === '' ||
            typeof project.name !== 'string' ||
            project.name.trim() === '' ||
            typeof project.status !== 'string' ||
            !['Planned', 'In Progress', 'Completed'].includes(project.status)
        ) {
            return false;
        }

        if (ids.has(project.id)) {
            return false;
        }

        ids.add(project.id);
    }

    return true;
}

// Load projects from localStorage
function loadProjects() {
    let savedText;

    try {
        savedText = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
        storageReady = false;
        showMessage(
            'Could not read browser storage. Projects cannot be loaded or saved.'
        );
        return;
    }

    // No saved data: start with an empty array
    if (savedText === null) {
        storageReady = true;
        renderProjects();
        return;
    }

    let savedProjects;

    try {
        // Convert stored JSON text back into JavaScript data
        savedProjects = JSON.parse(savedText);
    } catch (error) {
        storageReady = false;
        renderProjects();
        showMessage(
            'Saved project data is invalid JSON. Existing stored data was not changed.'
        );
        return;
    }

    // Do not use or overwrite malformed project records
    if (!isValidProjectArray(savedProjects)) {
        storageReady = false;
        renderProjects();
        showMessage(
            'Saved project data has an invalid format. Existing stored data was not changed.'
        );
        return;
    }

    // Restore the saved projects
    projects.push(...savedProjects);

    storageReady = true;
    renderProjects();
}

// Save a proposed project array before updating the in-memory array
function saveProjects(updatedProjects) {
    if (!storageReady) {
        showMessage(
            'Changes could not be saved. Check browser storage and saved project data.'
        );
        return false;
    }

    let savedText;

    try {
        // Convert the array into JSON text
        savedText = JSON.stringify(updatedProjects);

        // Store the updated JSON text
        localStorage.setItem(STORAGE_KEY, savedText);
    } catch (error) {
        showMessage(
            'Changes could not be saved to browser storage. Your previous saved data was not intentionally changed.'
        );
        return false;
    }

    // Update the in-memory array only after saving succeeds
    projects.splice(0, projects.length, ...updatedProjects);

    return true;
}

// Reset the form to Add mode
function resetForm() {
    form.reset();

    editingId = null;

    saveButton.textContent = 'Save Project';
    cancelButton.hidden = true;
}

// Display all projects
function renderProjects() {
    projectList.replaceChildren();

    projects.forEach(project => {
        const listItem = document.createElement('li');

        const projectName = document.createElement('strong');
        projectName.textContent = project.name;

        const projectStatus = document.createElement('span');
        projectStatus.textContent = ` — Status: ${project.status} `;

        // Edit button
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.textContent = 'Edit';

        editButton.addEventListener('click', () => {
            if (!storageReady) {
                showMessage(
                    'Editing is unavailable until the saved project data can be read safely.'
                );
                return;
            }

            editingId = project.id;

            nameInput.value = project.name;
            statusInput.value = project.status;

            saveButton.textContent = 'Save changes';
            cancelButton.hidden = false;

            showMessage('');
            nameInput.focus();
        });

        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.textContent = 'Delete';

        deleteButton.addEventListener('click', () => {
            if (!storageReady) {
                showMessage(
                    'Deletion is unavailable until the saved project data can be read safely.'
                );
                return;
            }

            const confirmed = window.confirm(
                `Delete "${project.name}"?`
            );

            // Cancelled deletion changes nothing
            if (!confirmed) {
                return;
            }

            const updatedProjects = projects.filter(
                item => item.id !== project.id
            );

            if (saveProjects(updatedProjects)) {
                if (editingId === project.id) {
                    resetForm();
                }

                renderProjects();
                showMessage('Project deleted successfully.');
            }
        });

        listItem.appendChild(projectName);
        listItem.appendChild(projectStatus);
        listItem.appendChild(editButton);
        listItem.appendChild(deleteButton);

        projectList.appendChild(listItem);
    });

    if (emptyState) {
        emptyState.hidden = projects.length > 0;
    }
}

// Handle Add and Edit using one submit listener
form.addEventListener('submit', event => {
    event.preventDefault();

    if (!storageReady) {
        showMessage(
            'Changes could not be saved. Check browser storage and saved project data.'
        );
        return;
    }

    // Read and validate the actual form values
    const name = nameInput.value.trim();
    const status = statusInput.value;

    if (name === '') {
        showMessage('Please enter a project name.');
        nameInput.focus();
        return;
    }

    if (!['Planned', 'In Progress', 'Completed'].includes(status)) {
        showMessage('Please select a valid project status.');
        statusInput.focus();
        return;
    }

    let updatedProjects;

    if (editingId === null) {
        // Add a new project with a unique ID
        const newProject = {
            id: generateProjectId(),
            name: name,
            status: status
        };

        updatedProjects = [...projects, newProject];
    } else {
        // Find the existing project
        const existingProject = projects.find(
            project => project.id === editingId
        );

        if (!existingProject) {
            showMessage('The project being edited could not be found.');
            resetForm();
            return;
        }

        // Update the selected project without changing its ID
        updatedProjects = projects.map(project => {
            if (project.id === editingId) {
                return {
                    ...project,
                    name: name,
                    status: status
                };
            }

            return project;
        });
    }

    // Save first; update the UI only if storage succeeds
    if (saveProjects(updatedProjects)) {
        renderProjects();
        resetForm();
        nameInput.focus();
        showMessage('Project saved successfully.');
    }
});

// Cancel editing without changing stored projects
cancelButton.addEventListener('click', () => {
    resetForm();
    showMessage('Editing cancelled.');
    nameInput.focus();
});

// Load saved data when the page starts
loadProjects();