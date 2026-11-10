import { projects } from "./scripts/projects.js";

import {
    getProjectMetadata,
    getProjectLanguages,
    projectMetadata,
    projectLanguages
} from "./scripts/github.js";

import {
    initializeFilters,
    updateBadgeFilterOptions
} from "./scripts/filters.js";

import {
    renderProjects
} from "./scripts/project-renderer.js";


// --------------------------------------------------
// DOM elements
// --------------------------------------------------

const search = document.getElementById("search");


// --------------------------------------------------
// Initialize filters
// --------------------------------------------------

initializeFilters({
    searchInput: search,
    onChange: renderProjects
});


// --------------------------------------------------
// Search events
// --------------------------------------------------

search.addEventListener("input", () => {
    renderProjects(search.value);
});


// --------------------------------------------------
// Initialize project data
// --------------------------------------------------

async function initializeProjectData() {
    await Promise.all(
        projects.map(async project => {
            const [languages, metadata] = await Promise.all([
                getProjectLanguages(project),
                getProjectMetadata(project)
            ]);

            projectLanguages.set(project.path, languages);
            projectMetadata.set(project.path, metadata);
        })
    );

    updateBadgeFilterOptions();
    renderProjects(search.value);
}


// --------------------------------------------------
// Initial rendering
// --------------------------------------------------

updateBadgeFilterOptions();
renderProjects();

initializeProjectData();