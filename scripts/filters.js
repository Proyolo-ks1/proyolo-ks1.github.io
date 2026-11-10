import { projects } from "./projects.js";

import {
    projectLanguages
} from "./github.js";

import {
    statusConfig,
    functionalityConfig,
    getBadgeClass
} from "./badge-config.js";


export const filterCategories = {
    status: "Development",
    functionality: "Functionality",
    tags: "Tags",
    languages: "Languages"
};


export const selectedFilters = {
    status: new Set(),
    functionality: new Set(),
    tags: new Set(),
    languages: new Set()
};


const categoryFilters = document.getElementById("category-filters");
const activeFilters = document.getElementById("active-filters");
const dateFilter = document.getElementById("date-filter");
const clearFiltersButton = document.getElementById("clear-filters");

let searchInput;
let renderCallback;


// --------------------------------------------------
// Project badge categories
// --------------------------------------------------

export function getProjectBadgesByCategory(project) {
    return {
        status: [
            statusConfig[project.status]?.label
        ].filter(Boolean),

        functionality: [
            functionalityConfig[project.functionality]?.label
        ].filter(Boolean),

        tags: project.badges ?? [],

        languages: (
            projectLanguages.get(project.path) ?? []
        ).map(language => language.name)
    };
}


function getAvailableFilters(category) {
    return [...new Set(
        projects.flatMap(project =>
            getProjectBadgesByCategory(project)[category]
        )
    )].sort((a, b) => a.localeCompare(b));
}


// --------------------------------------------------
// Filter dropdowns
// --------------------------------------------------

export function updateBadgeFilterOptions() {
    categoryFilters.replaceChildren();

    for (const [category, title] of Object.entries(filterCategories)) {
        const wrapper = document.createElement("div");
        wrapper.className = "filter-dropdown";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "filter-dropdown-button";

        const count = selectedFilters[category].size;
        button.textContent = count
            ? `${title} (${count}) ▾`
            : `${title} ▾`;

        const menu = document.createElement("div");
        menu.className = "filter-menu";
        menu.hidden = true;

        const heading = document.createElement("div");
        heading.className = "filter-menu-title";
        heading.textContent = title;

        const search = document.createElement("input");
        search.type = "search";
        search.className = "filter-menu-search";
        search.placeholder = "Search badges...";

        const options = document.createElement("div");
        options.className = "filter-menu-options";


        function renderOptions() {
            options.replaceChildren();

            const query = search.value.toLowerCase();

            for (const name of getAvailableFilters(category)) {
                if (!name.toLowerCase().includes(query)) continue;

                const label = document.createElement("label");
                label.className = "filter-option";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = selectedFilters[category].has(name);

                checkbox.addEventListener("change", () => {
                    toggleFilter(category, name, checkbox.checked);
                });

                const text = document.createElement("span");
                text.textContent = name;

                label.append(checkbox, text);
                options.appendChild(label);
            }
        }


        search.addEventListener("input", renderOptions);

        button.addEventListener("click", () => {
            const wasHidden = menu.hidden;

            document.querySelectorAll(".filter-menu")
                .forEach(other => other.hidden = true);

            menu.hidden = !wasHidden;

            if (!menu.hidden) {
                search.focus();
            }
        });


        menu.append(heading, search, options);
        wrapper.append(button, menu);
        categoryFilters.appendChild(wrapper);

        renderOptions();
    }
}


// --------------------------------------------------
// Toggle filters
// --------------------------------------------------

export function toggleFilter(category, name, enabled) {
    if (enabled) {
        selectedFilters[category].add(name);
    } else {
        selectedFilters[category].delete(name);
    }

    // Update dropdown button counts without rebuilding.
    document.querySelectorAll(".filter-dropdown").forEach((dropdown, index) => {
        const key = Object.keys(filterCategories)[index];
        const title = filterCategories[key];
        const count = selectedFilters[key].size;

        dropdown.querySelector(".filter-dropdown-button").textContent =
            count ? `${title} (${count}) ▾` : `${title} ▾`;

        dropdown.querySelectorAll(".filter-option").forEach(option => {
            const checkbox = option.querySelector("input");
            const label = option.querySelector("span").textContent;

            checkbox.checked = selectedFilters[key].has(label);
        });
    });

    renderActiveFilters();
    renderCallback(searchInput.value);
}


// --------------------------------------------------
// Active filter chips
// --------------------------------------------------

function renderActiveFilters() {
    activeFilters.replaceChildren();

    let firstGroup = true;

    for (const [category, title] of Object.entries(filterCategories)) {
        const selected = selectedFilters[category];

        if (!selected.size) continue;

        // AND between active filter categories.
        if (!firstGroup) {
            const and = document.createElement("span");
            and.className = "filter-operator filter-operator-and";
            and.textContent = "AND";
            activeFilters.appendChild(and);
        }

        firstGroup = false;

        const group = document.createElement("div");
        group.className = "active-filter-group";

        const label = document.createElement("span");
        label.className = "active-filter-label";
        label.textContent = `${title}:`;

        group.appendChild(label);

        let firstBadge = true;

        for (const name of selected) {
            // Keep each OR together with the following badge.
            const item = document.createElement("span");
            item.className = "active-filter-item";

            if (!firstBadge) {
                const or = document.createElement("span");
                or.className = "filter-operator filter-operator-or";
                or.textContent = "OR";
                item.appendChild(or);
            }

            firstBadge = false;

            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = `badge filter-chip ${getBadgeClass(name)}`;
            chip.textContent = `${name} ×`;
            chip.title = `Remove ${name} filter`;

            chip.addEventListener("click", () => {
                toggleFilter(category, name, false);
            });

            item.appendChild(chip);
            group.appendChild(item);
        }

        activeFilters.appendChild(group);
    }
}


// --------------------------------------------------
// Initialize filter event listeners
// --------------------------------------------------

export function initializeFilters({
    searchInput: input,
    onChange
}) {
    searchInput = input;
    renderCallback = onChange;

    // Close dropdowns when clicking outside.
    document.addEventListener("click", event => {
        if (!event.target.closest(".filter-dropdown")) {
            document.querySelectorAll(".filter-menu")
                .forEach(menu => menu.hidden = true);
        }
    });

    dateFilter.addEventListener("change", () => {
        renderCallback(searchInput.value);
    });

    clearFiltersButton.addEventListener("click", () => {
        Object.values(selectedFilters).forEach(set => set.clear());

        dateFilter.value = "all";
        searchInput.value = "";

        updateBadgeFilterOptions();
        renderActiveFilters();
        renderCallback();
    });
}