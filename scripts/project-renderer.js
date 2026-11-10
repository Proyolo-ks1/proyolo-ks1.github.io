import { projects } from "./projects.js";

import {
    ProjectStatus,
    ProjectFunctionality
} from "./enums.js";

import {
    BASE_URL
} from "./config.js";

import {
    projectMetadata,
    projectLanguages,
    loadIcon
} from "./github.js";

import {
    fuzzyMatch,
    highlightText
} from "./search.js";

import {
    statusConfig,
    functionalityConfig
} from "./badge-config.js";

import {
    filterCategories,
    selectedFilters,
    getProjectBadgesByCategory,
    toggleFilter
} from "./filters.js";


const container = document.getElementById("projects");
const search = document.getElementById("search");
const dateFilter = document.getElementById("date-filter");


// --------------------------------------------------
// Sorting priorities
// --------------------------------------------------

const statusPriority = {
    [ProjectStatus.COMPLETED]: 0,
    [ProjectStatus.WIP]: 1,
    [ProjectStatus.ARCHIVED]: 2
};


const functionalityPriority = {
    [ProjectFunctionality.WORKING]: 0,
    [ProjectFunctionality.PARTIAL]: 1,
    [ProjectFunctionality.BROKEN]: 2
};


// --------------------------------------------------
// Project badges
// --------------------------------------------------

function createProjectBadges(project, container) {
    const query = search.value.trim();

    function addBadge(label, className = "", tooltip = "") {
        const badge = document.createElement("span");

        badge.className = `badge ${className}`;
        badge.title = tooltip;
        badge.classList.add("clickable-badge");
        badge.setAttribute("role", "button");
        badge.tabIndex = 0;

        const category = Object.keys(filterCategories).find(category =>
            getProjectBadgesByCategory(project)[category].includes(label)
        );

        badge.setAttribute(
            "aria-pressed",
            String(category ? selectedFilters[category].has(label) : false)
        );


        function toggleBadgeFilter(event) {
            event.preventDefault();
            event.stopPropagation();

            let category;

            if (Object.values(statusConfig).some(c => c.label === label)) {
                category = "status";
            } else if (
                Object.values(functionalityConfig).some(c => c.label === label)
            ) {
                category = "functionality";
            } else if ((project.badges ?? []).includes(label)) {
                category = "tags";
            } else {
                category = "languages";
            }

            const enabled = !selectedFilters[category].has(label);

            toggleFilter(category, label, enabled);
        }


        badge.addEventListener("click", toggleBadgeFilter);

        badge.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                toggleBadgeFilter(event);
            }
        });

        const match = fuzzyMatch(label, query);

        highlightText(badge, label, match?.indices ?? []);

        container.appendChild(badge);
    }


    const status = statusConfig[project.status];

    if (status) {
        addBadge(status.label, status.className);
    }


    const functionality = functionalityConfig[project.functionality];

    if (functionality) {
        addBadge(functionality.label, functionality.className);
    }


    for (const badge of project.badges ?? []) {
        addBadge(badge, "badge-custom");
    }


    const languages = projectLanguages.get(project.path) ?? [];

    for (const language of languages) {
        addBadge(
            language.name,
            "",
            `${language.percentage.toFixed(1)}% of detected code`
        );
    }
}


// --------------------------------------------------
// Render project cards
// --------------------------------------------------

export function renderProjects(query = "") {
    container.replaceChildren();

    const normalizedQuery = query.trim();

    const matches = projects
        .map((project, originalIndex) => {
            const languages = projectLanguages.get(project.path) ?? [];

            const statusLabel =
                statusConfig[project.status]?.label ?? "";

            const functionalityLabel =
                functionalityConfig[project.functionality]?.label ?? "";

            const searchableFields = [
                { text: project.name, weight: 100 },
                { text: project.description, weight: 50 },
                { text: statusLabel, weight: 20 },
                { text: functionalityLabel, weight: 20 },
                { text: project.status, weight: 20 },

                ...(project.badges ?? []).map(badge => ({
                    text: badge,
                    weight: 30
                })),

                ...languages.map(language => ({
                    text: language.name,
                    weight: 30
                }))
            ];


            const results = searchableFields
                .map(field => ({
                    ...field,
                    match: fuzzyMatch(field.text, normalizedQuery)
                }))
                .filter(field => field.match !== null);


            if (!results.length) return null;

            const bestScore = Math.max(
                ...results.map(result =>
                    result.match.score + result.weight
                )
            );


            return {
                project,
                originalIndex,
                score: bestScore,

                nameMatch: fuzzyMatch(project.name, normalizedQuery),

                descriptionMatch: fuzzyMatch(
                    project.description,
                    normalizedQuery
                )
            };
        })

        .filter(Boolean)

        .filter(result => {
            const project = result.project;
            const badges = getProjectBadgesByCategory(project);

            // OR within categories, AND between categories.
            for (const category of Object.keys(filterCategories)) {
                const selected = selectedFilters[category];

                if (!selected.size) continue;

                const matches = [...selected].some(name =>
                    badges[category].includes(name)
                );

                if (!matches) return false;
            }


            // Date filtering.
            const days = Number(dateFilter.value);

            if (days > 0) {
                const metadata = projectMetadata.get(project.path);

                if (!metadata?.pushedAt) return false;

                const pushedAt = new Date(metadata.pushedAt).getTime();
                const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

                if (!Number.isFinite(pushedAt) || pushedAt < cutoff) {
                    return false;
                }
            }

            return true;
        })

        .sort((a, b) => {
            // When searching, prioritize relevance.
            if (normalizedQuery && a.score !== b.score) {
                return b.score - a.score;
            }

            // Prioritize featured projects.
            const featuredA = a.project.featured ? 0 : 1;
            const featuredB = b.project.featured ? 0 : 1;

            // Then prioritize development status.
            const statusA = statusPriority[a.project.status] ?? 99;
            const statusB = statusPriority[b.project.status] ?? 99;

            // Then prioritize functionality.
            const functionalityA =
                functionalityPriority[a.project.functionality] ?? 99;

            const functionalityB =
                functionalityPriority[b.project.functionality] ?? 99;


            return featuredA - featuredB ||
                statusA - statusB ||
                functionalityA - functionalityB ||
                a.originalIndex - b.originalIndex;
        });


    const resultCount = document.getElementById("result-count");

    resultCount.textContent =
        `${matches.length} of ${projects.length} projects`;


    if (!matches.length) {
        const message = document.createElement("p");

        message.className = "no-results";
        message.textContent = "No matching projects found.";

        container.appendChild(message);
        return;
    }


    for (const result of matches) {
        const { project, nameMatch, descriptionMatch } = result;

        const card = document.createElement("a");

        card.className = "card";
        card.href = new URL(project.path + "/", BASE_URL).href;


        // Header and icon.
        const header = document.createElement("div");
        header.className = "card-header";

        const icon = document.createElement("img");

        icon.className = "card-icon";
        icon.alt = "";
        icon.width = 32;
        icon.height = 32;
        icon.loading = "lazy";


        const title = document.createElement("h2");

        highlightText(
            title,
            project.name,
            nameMatch?.indices ?? []
        );

        header.append(icon, title);


        // Description.
        const description = document.createElement("p");

        highlightText(
            description,
            project.description,
            descriptionMatch?.indices ?? []
        );


        // Badges.
        const badges = document.createElement("div");
        badges.className = "card-badges";


        // Project link.
        const link = document.createElement("span");

        link.className = "open-link";
        link.textContent = "Open project →";


        // Last updated.
        const updated = document.createElement("div");
        updated.className = "card-updated";

        const metadata = projectMetadata.get(project.path);

        if (metadata?.pushedAt) {
            const date = new Date(metadata.pushedAt);

            updated.textContent = `Last pushed: ${
                date.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                })
            }`;

            updated.title = date.toLocaleString();
        } else {
            updated.textContent = "Last push unknown";
        }


        card.append(header, description, badges, link, updated);
        container.appendChild(card);

        loadIcon(icon, project);
        createProjectBadges(project, badges);
    }
}