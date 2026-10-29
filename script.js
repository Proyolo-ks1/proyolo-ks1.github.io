
const BASE_URL = "https://proyolo-ks1.github.io/";
const FALLBACK_ICON = "https://github.com/Proyolo-ks1.png";

const projects = [
  {
    name: "Clash of Clans Message Previewer",
    description: "Preview and format Clash of Clans messages.",
    path: "coc-message-previewer"
  },
  {
    name: "Autobahn Sign Generator",
    description: "Create custom German Autobahn signs.",
    path: "autobahn-sign-generator"
  },
  {
    name: "Poker Evaluator",
    description: "Evaluate poker hands and combinations.",
    path: "PokerSense"
  },
  {
    name: "Tanky Troubles",
    description: "A browser-based tank game.",
    path: "TankyTroubles"
  },
  {
    name: "GPT-2 Browser Demo",
    description: "Experiment with GPT-2 in your browser.",
    path: "BrowserGPT"
  },
  {
    name: "Vrienden Planner",
    description: "Plan activities and vacations with friends.",
    path: "project-vacation"
  },
  {
    name: "Interactive IPv4 Map",
    description: "Explore and visualize the IPv4 address space.",
    path: "IPv4AddressSpaceVisualizer"
  },
  {
    name: "Poople Graph Explorer",
    description: "Explore four-letter word connections and shortest paths to POOP.",
    path: "poopleGraphExperimentation"
  }
];

const container = document.getElementById("projects");
const search = document.getElementById("search");

const iconCache = new Map();

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

async function discoverIcon(project) {
  if (iconCache.has(project.path)) {
    return iconCache.get(project.path);
  }

  const pageUrl = new URL(project.path + "/", BASE_URL);

  try {
    const response = await fetch(pageUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    const iconLinks = [
      ...doc.querySelectorAll("link[rel]")
    ].filter(link =>
      link.rel.toLowerCase().split(/\s+/).includes("icon")
    );

    const candidates = iconLinks
      .map(link => link.getAttribute("href"))
      .filter(Boolean)
      .map(href => new URL(href, pageUrl).href);

    // Conventional fallback locations.
    candidates.push(
      new URL("favicon.ico", pageUrl).href,
      new URL("/favicon.ico", BASE_URL).href
    );

    const uniqueCandidates = [...new Set(candidates)];

    iconCache.set(project.path, uniqueCandidates);
    return uniqueCandidates;

  } catch (error) {
    console.warn(`Could not discover icon for ${project.name}`, error);

    const fallback = [
      new URL("favicon.ico", pageUrl).href
    ];

    iconCache.set(project.path, fallback);
    return fallback;
  }
}

async function loadIcon(img, project) {
  const candidates = await discoverIcon(project);

  // Stop if this card was removed by a new search.
  if (!img.isConnected) return;

  let index = 0;

  function tryNext() {
    if (index < candidates.length) {
      img.src = candidates[index++];
    } else {
      img.onerror = null;
      img.src = FALLBACK_ICON;
    }
  }

  img.onerror = tryNext;
  tryNext();
}

// --------------------------------------------------
// Render project cards
// --------------------------------------------------

function renderProjects(query = "") {
  container.replaceChildren();

  const normalizedQuery = query.trim();

  const matches = projects
    .map((project, originalIndex) => {
      const nameMatch = fuzzyMatch(project.name, normalizedQuery);
      const descriptionMatch = fuzzyMatch(
        project.description,
        normalizedQuery
      );

      if (!nameMatch && !descriptionMatch) {
        return null;
      }

      return {
        project,
        originalIndex,
        nameMatch,
        descriptionMatch,
        score: Math.max(
          nameMatch ? nameMatch.score + 100 : -Infinity,
          descriptionMatch ? descriptionMatch.score : -Infinity
        )
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      b.score - a.score || a.originalIndex - b.originalIndex
    );

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

    const link = document.createElement("span");
    link.className = "open-link";
    link.textContent = "Open project →";

    card.append(header, description, link);
    container.appendChild(card);

    loadIcon(icon, project);
  }
}

// --------------------------------------------------
// Search events
// --------------------------------------------------

search.addEventListener("input", () => {
  renderProjects(search.value);
});

renderProjects();
