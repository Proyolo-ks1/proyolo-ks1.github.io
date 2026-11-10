import {
    ProjectStatus,
    ProjectFunctionality,
    ProjectBadge
} from "./enums.js";


export const projects = [
    {
        name: "Clash of Clans Message Previewer",
        description: "Preview and format Clash of Clans messages.",
        path: "coc-message-previewer",
        image: "assets/images/previews/coc-message-previewer.png",
        status: ProjectStatus.WIP,
        functionality: ProjectFunctionality.WORKING,
        badges: [ProjectBadge.GENERATOR],
        featured: true,
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
        image: "assets/images/previews/poopleGraphExperimentation.png",
        status: ProjectStatus.WIP,
        functionality: ProjectFunctionality.WORKING,
        badges: []
    },
    {
        name: "MeyerWeb Color Blender Reimagined",
        description: "Blend two colors into a customizable palette with RGB or HSL interpolation.",
        path: "MeyerWebColorBlenderReimagined",
        image: "assets/images/previews/MeyerWebColorBlenderReimagined.png",
        status: ProjectStatus.COMPLETED,
        functionality: ProjectFunctionality.WORKING,
        badges: [ProjectBadge.TOOL],
        featured: true,
    }
];