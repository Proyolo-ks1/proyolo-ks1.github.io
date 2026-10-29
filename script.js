
const BASE_URL = "https://proyolo-ks1.github.io/";
const FALLBACK_ICON = "https://github.com/Proyolo-ks1.png";


const ProjectStatus = Object.freeze({
  WIP: "wip",
  COMPLETED: "completed",
  ARCHIVED: "archived",
});

const ProjectFunctionality = Object.freeze({
  WORKING: "working",
  PARTIAL: "partial",
  BROKEN: "broken",
});

const ProjectBadge = Object.freeze({
  AI: "AI",
  EXPERIMENTAL: "Experimental",
  GAME: "Game",
  TOOL: "Tool",
  EDUCATIONAL: "Educational",
  GENERATOR: "Generator",
});


const projects = [
  {
    name: "Clash of Clans Message Previewer",
    description: "Preview and format Clash of Clans messages.",
    path: "coc-message-previewer",
    status: ProjectStatus.WIP,
    functionality: ProjectFunctionality.WORKING,
    badges: [ProjectBadge.GENERATOR]
  },
  {
    name: "Autobahn Sign Generator",
    description: "Create custom German Autobahn signs.",
    path: "autobahn-sign-generator",
    status: ProjectStatus.WIP,
    functionality: ProjectFunctionality.WORKING,
    badges: [ProjectBadge.GENERATOR]
  },
  {
    name: "Poker Evaluator",
    description: "Evaluate poker hands and combinations.",
    path: "PokerSense",
    status: ProjectStatus.WIP,
    functionality: ProjectFunctionality.BROKEN,
    badges: [ProjectBadge.TOOL, ProjectBadge.EDUCATIONAL]
  },
  {
    name: "Tanky Troubles",
    description: "A browser-based tank game.",
    path: "TankyTroubles",
    status: ProjectStatus.WIP,
    functionality: ProjectFunctionality.BROKEN,
    badges: [ProjectBadge.GAME]
  },
  {
    name: "GPT-2 Browser Demo",
    description: "Experiment with GPT-2 in your browser.",
    path: "BrowserGPT",
    status: ProjectStatus.WIP,
    functionality: ProjectFunctionality.BROKEN,
    badges: [ProjectBadge.AI, ProjectBadge.EXPERIMENTAL]
  },
  {
    name: "Vrienden Planner",
    description: "Plan activities and vacations with friends.",
    path: "project-vacation",
    status: ProjectStatus.WIP,
    functionality: ProjectFunctionality.BROKEN,
    badges: [ProjectBadge.TOOL]
  },
  {
    name: "Interactive IPv4 Map",
    description: "Explore and visualize the IPv4 address space.",
    path: "IPv4AddressSpaceVisualizer",
    status: ProjectStatus.WIP,
    functionality: ProjectFunctionality.WORKING,
    badges: [ProjectBadge.EDUCATIONAL]
  },
  {
    name: "Poople Graph Explorer",
    description: "Explore four-letter word connections and shortest paths to POOP.",
    path: "poopleGraphExperimentation",
    status: ProjectStatus.WIP,
    functionality: ProjectFunctionality.WORKING,
    badges: []
  }
];


const projectMetadata = new Map();

async function getProjectMetadata(project) {
  const repo = project.repo ?? project.path;
  const cacheKey = `metadata:${GITHUB_USER}/${repo}`;
  const cacheDuration = 60 * 60 * 1000;

  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));

    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      return cached.data;
    }
  } catch {
    // Ignore unavailable or invalid cache.
  }

  try {
    const url = `https://api.github.com/repos/${
      encodeURIComponent(GITHUB_USER)
    }/${encodeURIComponent(repo)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`GitHub API: ${response.status}`);
    }

    const repoData = await response.json();

    const data = {
      pushedAt: repoData.pushed_at
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data
      }));
    } catch {
      // Storage unavailable.
    }

    return data;
  } catch (error) {
    console.warn(`Metadata lookup failed for ${repo}`, error);
    return null;
  }
}

const projectLanguages = new Map();

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


const container = document.getElementById("projects");
const search = document.getElementById("search");

const iconCache = new Map();
const ICON_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// --------------------------------------------------
// Fuzzy matching
// --------------------------------------------------

function fuzzyMatch(text, query) {
  const source = text.toLowerCase();
  const target = query.toLowerCase().replace(/\s+/g, "");

  if (!target) {
    return { score: 0, indices: [] };
  }

  const indices = [];
  let position = 0;
  let score = 0;

  for (const char of target) {
    const index = source.indexOf(char, position);

    if (index === -1) {
      return null;
    }

    indices.push(index);

    // Prefer consecutive letters.
    if (indices.length > 1) {
      const previous = indices[indices.length - 2];

      if (index === previous + 1) {
        score += 10;
      }
    }

    // Prefer matches at the beginning of words.
    if (index === 0 || /[\s-_]/.test(source[index - 1])) {
      score += 5;
    }

    position = index + 1;
  }

  // Prefer earlier matches.
  score -= indices[0];

  return { score, indices };
}

// --------------------------------------------------
// Highlight matched characters
// --------------------------------------------------

function highlightText(element, text, indices) {
  const matched = new Set(indices);

  for (let i = 0; i < text.length; i++) {
    if (matched.has(i)) {
      const mark = document.createElement("mark");
      mark.textContent = text[i];
      element.appendChild(mark);
    } else {
      element.appendChild(
        document.createTextNode(text[i])
      );
    }
  }
}

// --------------------------------------------------
// Automatically discover website favicons
// --------------------------------------------------

async function discoverIcon(project, forceRefresh = false) {
  const cacheKey = `favicon:${project.path}`;

  if (!forceRefresh) {
    // Check in-memory cache.
    if (iconCache.has(project.path)) {
      return iconCache.get(project.path);
    }

    // Check persistent browser cache.
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey));

      if (
        cached &&
        Array.isArray(cached.icons) &&
        Date.now() - cached.timestamp < ICON_CACHE_DURATION
      ) {
        iconCache.set(project.path, cached.icons);
        return cached.icons;
      }
    } catch {
      // Cache unavailable or invalid.
    }
  }

  const pageUrl = new URL(project.path + "/", BASE_URL);

  try {
    const response = await fetch(pageUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    const candidates = [...doc.querySelectorAll("link[rel]")]
      .filter(link =>
        link.rel.toLowerCase().split(/\s+/).includes("icon")
      )
      .map(link => link.getAttribute("href"))
      .filter(Boolean)
      .map(href => new URL(href, pageUrl).href);

    // Conventional fallback locations.
    candidates.push(
      new URL("favicon.ico", pageUrl).href,
      new URL("/favicon.ico", BASE_URL).href
    );

    const icons = [...new Set(candidates)];

    iconCache.set(project.path, icons);

    // Save discovered URLs for future visits.
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        icons
      }));
    } catch {
      // Storage unavailable.
    }

    return icons;

  } catch (error) {
    console.warn(`Could not discover icon for ${project.name}`, error);

    // Avoid caching failed discovery attempts persistently.
    const fallback = [
      new URL("favicon.ico", pageUrl).href
    ];

    iconCache.set(project.path, fallback);
    return fallback;
  }
}


async function loadIcon(img, project) {
  let candidates = await discoverIcon(project);

  if (!img.isConnected) return;

  let index = 0;
  let refreshed = false;

  async function tryNext() {
    if (!img.isConnected) return;

    if (index < candidates.length) {
      img.src = candidates[index++];
      return;
    }

    // Cached URLs may be outdated. Rediscover once.
    if (!refreshed) {
      refreshed = true;

      candidates = await discoverIcon(project, true);
      index = 0;

      if (!img.isConnected) return;

      if (candidates.length) {
        tryNext();
        return;
      }
    }

    // Final fallback.
    img.onerror = null;
    img.src = FALLBACK_ICON;
  }

  img.onerror = tryNext;
  tryNext();
}


// --------------------------------------------------
// Create Badges and Automatically get project languages from Github for Badges
// --------------------------------------------------

const GITHUB_USER = "Proyolo-ks1";
const LANGUAGE_CACHE_HOURS = 24;

async function getProjectLanguages(project) {
  const repo = project.repo ?? project.path;
  const cacheKey = `languages:${GITHUB_USER}/${repo}`;

  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));

    if (
      cached &&
      Date.now() - cached.timestamp <
        LANGUAGE_CACHE_HOURS * 60 * 60 * 1000
    ) {
      return cached.languages;
    }
  } catch {
    // Ignore invalid cache entries.
  }

  try {
    const url = `https://api.github.com/repos/${
      encodeURIComponent(GITHUB_USER)
    }/${encodeURIComponent(repo)}/languages`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`GitHub API: ${response.status}`);
    }

    const data = await response.json();
    const total = Object.values(data)
      .reduce((sum, bytes) => sum + bytes, 0);

    const languages = Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .map(([name, bytes]) => ({
        name,
        percentage: total ? bytes / total * 100 : 0
      }));

    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        languages
      }));
    } catch {
      // Storage may be unavailable.
    }

    return languages;

  } catch (error) {
    console.warn(`Language lookup failed for ${repo}`, error);
    return [];
  }
}

const statusConfig = {
  [ProjectStatus.WIP]: {
    label: "Work in Progress",
    className: "badge-warning"
  },
  [ProjectStatus.COMPLETED]: {
    label: "Completed",
    className: "badge-success"
  },
  [ProjectStatus.ARCHIVED]: {
    label: "Archived",
    className: "badge-neutral"
  }
};

const functionalityConfig = {
  [ProjectFunctionality.WORKING]: {
    label: "Working",
    className: "badge-success"
  },
  [ProjectFunctionality.PARTIAL]: {
    label: "Partially Working",
    className: "badge-warning"
  },
  [ProjectFunctionality.BROKEN]: {
    label: "Not Working",
    className: "badge-danger"
  }
};

function appendBadge(container, label, className = "") {
  const badge = document.createElement("span");
  badge.className = `badge ${className}`;
  badge.textContent = label;
  container.appendChild(badge);
  return badge;
}

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


function getBadgeClass(name) {
  const status = Object.values(statusConfig)
    .find(config => config.label === name);

  if (status) return status.className;

  const functionality = Object.values(functionalityConfig)
    .find(config => config.label === name);

  if (functionality) return functionality.className;

  const isCustomBadge = projects.some(project =>
    (project.badges ?? []).includes(name)
  );

  if (isCustomBadge) return "badge-custom";

  // Programming language badge
  return "";
}



// --------------------------------------------------
// Render project cards
// --------------------------------------------------


const functionalityPriority = {
  [ProjectFunctionality.WORKING]: 0,
  [ProjectFunctionality.PARTIAL]: 1,
  [ProjectFunctionality.BROKEN]: 2
};


function renderProjects(query = "") {
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
        ...project.badges.map(badge => ({
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

      // Otherwise, prioritize functionality.
      const priorityA =
        functionalityPriority[a.project.functionality] ?? 99;

      const priorityB =
        functionalityPriority[b.project.functionality] ?? 99;

      return priorityA - priorityB ||
        a.originalIndex - b.originalIndex;
    });

  resultCount.textContent = `${matches.length} of ${projects.length} projects`;
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

    const description = document.createElement("p");
    highlightText(
      description,
      project.description,
      descriptionMatch?.indices ?? []
    );

    const badges = document.createElement("div");
    badges.className = "card-badges";

    const link = document.createElement("span");
    link.className = "open-link";
    link.textContent = "Open project →";

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


// --------------------------------------------------
// Filtering System
// --------------------------------------------------
  
const filterCategories = {
  status: "Development",
  functionality: "Functionality",
  tags: "Tags",
  languages: "Languages"
};

const selectedFilters = {
  status: new Set(),
  functionality: new Set(),
  tags: new Set(),
  languages: new Set()
};

const categoryFilters = document.getElementById("category-filters");
const activeFilters = document.getElementById("active-filters");
const dateFilter = document.getElementById("date-filter");
const clearFiltersButton = document.getElementById("clear-filters");
const resultCount = document.getElementById("result-count");

function getProjectBadgesByCategory(project) {
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

function updateBadgeFilterOptions() {
  categoryFilters.replaceChildren();

  for (const [category, title] of Object.entries(filterCategories)) {
    const wrapper = document.createElement("div");
    wrapper.className = "filter-dropdown";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-dropdown-button";

    const count = selectedFilters[category].size;
    button.textContent = count ? `${title} (${count}) ▾` : `${title} ▾`;

    const menu = document.createElement("div");
    menu.className = "filter-menu";
    menu.hidden = true;

    const heading = document.createElement("div");
    heading.className = "filter-menu-title";
    heading.textContent = title;

    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.className = "filter-menu-search";
    searchInput.placeholder = "Search badges...";

    const options = document.createElement("div");
    options.className = "filter-menu-options";

    function renderOptions() {
      options.replaceChildren();

      const query = searchInput.value.toLowerCase();

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

    searchInput.addEventListener("input", renderOptions);

    button.addEventListener("click", () => {
      const wasHidden = menu.hidden;

      document.querySelectorAll(".filter-menu")
        .forEach(other => other.hidden = true);

      menu.hidden = !wasHidden;

      if (!menu.hidden) {
        searchInput.focus();
      }
    });

    menu.append(heading, searchInput, options);
    wrapper.append(button, menu);
    categoryFilters.appendChild(wrapper);

    renderOptions();
  }
}

function toggleFilter(category, name, enabled) {
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
  renderProjects(search.value);
}

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

// Close dropdowns when clicking outside.
document.addEventListener("click", event => {
  if (!event.target.closest(".filter-dropdown")) {
    document.querySelectorAll(".filter-menu")
      .forEach(menu => menu.hidden = true);
  }
});

dateFilter.addEventListener("change", () => {
  renderProjects(search.value);
});

clearFiltersButton.addEventListener("click", () => {
  Object.values(selectedFilters).forEach(set => set.clear());

  dateFilter.value = "all";
  search.value = "";

  updateBadgeFilterOptions();
  renderActiveFilters();
  renderProjects();
});


// --------------------------------------------------
// Search events
// --------------------------------------------------

search.addEventListener("input", () => {
  renderProjects(search.value);
});

updateBadgeFilterOptions();
renderProjects();
initializeProjectData();
