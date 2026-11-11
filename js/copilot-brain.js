/*
 * ARES Copilot is a local, deterministic help panel. It does not call an LLM,
 * retrieve live telemetry, or make safety decisions.
 */
(function (root) {
  "use strict";

  const MAX_QUERY_LENGTH = 1200;
  const MAX_MESSAGES = 80;

  const knowledge = [
    {
      id: "greeting",
      patterns: [/\bhello\b/, /\bhi\b/, /\bhey\b/, /\bgreetings\b/, /\bhelp\b/, /\bwhat can i ask\b/],
      answer: "I can explain ARES, Jezero, terrain layers, route-planner logic, mission controls, and documented limitations. I use local keyword matching, so I may not understand questions outside those topics.",
    },
    {
      id: "what-ares",
      patterns: [/\bwhat (?:is|does) ares\b/, /\bwhat does this project do\b/, /\babout (?:this )?project\b/, /\bproject purpose\b/, /\bwhat can (?:you|ares) do\b/],
      answer: "ARES is a browser based Mars terrain study. It displays an embedded Jezero region dataset, lets you inspect terrain layers, and compares two example EVA routes. It does not use live telemetry or certify a route for a crew.",
    },
    {
      id: "jezero",
      patterns: [/\bjezero\b/, /\bcrater geography\b/, /\bdelta deposits?\b/, /\blanding site location\b/],
      answer: "ARES focuses on an embedded terrain study for Jezero Crater. The app describes the region as an ancient lake basin with preserved delta deposits. Its landing marker uses Perseverance touchdown coordinates as a reference, but the marker's placement on this raster is approximate.",
    },
    {
      id: "coordinates",
      patterns: [/\bcoordinates?\b/, /\blatitude\b/, /\blongitude\b/, /\btouchdown\b/, /\blanding coordinates?\b/],
      answer: "The app's Perseverance landing reference is 18.44463° N, 77.45088° E. Those published coordinates are used as a reference; their placement on the embedded raster is approximate and marked provisional.",
    },
    {
      id: "provenance",
      patterns: [/\bnasa\b/, /\bhirise\b/, /\bhi ?rise\b/, /\bhirize\b/, /\bmro\b/, /\bdata provenance\b/, /\bsource data\b/, /\bwhere (?:did|does) .* data come from\b/],
      answer: "The project documentation identifies the embedded elevation study as derived from HiRISE terrain data and the optical layer as a 2 m preview. The original source rasters and georeferencing files are not in this project, so this build cannot independently revalidate them. Data & Provenance lists the available source links and limitations; ARES does not fetch live NASA data.",
    },
    {
      id: "elevation",
      patterns: [/\belevation\b/, /\bheight range\b/, /\baltitude\b/, /\bhow high\b/],
      answer: "The embedded elevation grid spans about −2,613 to −1,664 m in the dataset's stated reference. These are derived raster values on an approximately 10 m browser grid, not live measurements. Height exaggeration changes the display only.",
    },
    {
      id: "slope",
      patterns: [/\bslope\b/, /\bsteep(?:ness)?\b/, /\bincline\b/, /\bdegrees? steep\b/],
      answer: "The displayed slope layer is provisional: it averages 1 m slope values to the browser grid, which can smooth small steep areas. The documentation notes east–west values may read up to about 1.5° too low because of map scale. The route planner blocks cells whose maximum underlying 10 m slope exceeds the selected limit; that limit is an assumption, not a NASA or astronaut safety threshold.",
    },
    {
      id: "roughness",
      patterns: [/\brough(?:ness)?\b/, /\bboulders?\b/, /\bsmall scale relief\b/],
      answer: "Roughness is a provisional relief index based on height differences in a 3 × 3 neighbourhood (about 3 m). It is not a boulder detector or a safety classification.",
    },
    {
      id: "hazards",
      patterns: [/\bhazards?\b/, /\bhazard classification\b/, /\bslope bins?\b/, /\bsafe(?:ty)?\b/, /\bsafe for astronauts?\b/, /\brollover\b/],
      answer: "The map's four hazard-colour bins are provisional slope categories (0–5°, 5–15°, 15–25°, and over 25°). They are visual aids, not validated hazard probabilities, astronaut limits, or safety guarantees. ARES cannot determine whether a route is safe.",
    },
    {
      id: "routes",
      patterns: [/\beva\b/, /\broute(?:s| planning)?\b/, /\bpath(?:s| planning)?\b/, /\bplan (?:a )?walk\b/, /\bplanner\b/, /\bshortest\b/, /\bgentlest\b/],
      answer: "The EVA planner runs A* on a 20 m grid. Both route options are constrained by the selected maximum-slope limit and valid-data cells. “Shortest” uses 3D distance cost; “Gentlest” adds a slope-weighted cost. Gentlest does not mean safe or minimum slope. Missing elevation/slope cells are blocked. Route time is distance divided by the assumed walking speed (default 0.7 m/s, adjustable 0.3–1.5 m/s); it excludes stops, suit limits, loose material, and other mission constraints.",
    },
    {
      id: "environment",
      patterns: [/\b(?:jezero|mars|surface|environment|ares|outside|day|curve|model).{0,30}\b(?:temperature|temp)\b/, /\b(?:temperature|temp).{0,30}\b(?:model|mars|jezero|surface|environment|ares|outside|day|curve)\b/, /\bradiation\b/, /\bdose\b/, /\benvironment(?:al)?\b/, /\bwalking speed\b/, /\bhow fast\b/],
      answer: "Environment values are simplified models and assumptions. The temperature panel uses an invented day curve, not a Jezero measurement. Radiation is estimated as 0.67 mSv/day × time outside, with no suit shielding; the app cites this as a Gale Crater reference, not a local Jezero reading. Walking speed is user-set and assumed. These outputs are illustrative, not mission forecasts.",
    },
    {
      id: "navigation",
      patterns: [/\bmission overview\b/, /\bsurface explorer\b/, /\bscience targets?\b/, /\bdata and provenance\b/, /\bdata & provenance\b/, /\bmodules?\b/, /\bhow do i (?:use|navigate)\b/, /\bcontrols?\b/, /\breturn to (?:the )?solar system\b/, /\bsolar system\b/, /\blayers?\b/, /\bcamera\b/, /\borbit rate\b/],
      answer: "Use the top module buttons to open Mission Overview, Surface Explorer, EVA Planner, Science Targets, Environment, or Data & Provenance. In Surface Explorer, layer checkboxes and opacity controls change the display. On the opening Solar System view, select a planet, drag to orbit, scroll to zoom, use Orbit Rate and Pause Motion, or choose Re-center. The Copilot explains these controls but does not operate them for you.",
    },
    {
      id: "limitations",
      patterns: [/\blimitations?\b/, /\buncertaint(?:y|ies)\b/, /\bhow reliable\b/, /\bscientific accuracy\b/, /\bcan i rely\b/, /\bvalidated\b/],
      answer: "Key limits: the source rasters and georeferencing files were not included for independent revalidation; slope values remain provisional and have a documented east–west scale bias and striped patch; the landing raster placement is approximate; roughness and slope bins are not safety limits; route, time, temperature, and radiation outputs are simplified models or assumptions. See Data & Provenance for details.",
    },
    {
      id: "llm",
      patterns: [/\b(?:are|is) you (?:an? )?(?:llm|ai|language model)\b/, /\bhow do you answer\b/, /\bwhere do your answers come from\b/],
      answer: "I use local, deterministic keyword and phrase matching against a small set of written help topics. I do not call a language model, query NASA, read live telemetry, or learn from this conversation. I may not understand a question outside those topics.",
    },
  ];

  const normalize = (value) => value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9°.+\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  function matchQuery(value) {
    const query = normalize(String(value || ""));
    if (!query) return "Please enter a question. I can explain the terrain layers, data limits, route planner, or mission controls.";
    if (query.length > MAX_QUERY_LENGTH) return `Please shorten your question to ${MAX_QUERY_LENGTH} characters or fewer.`;
    if (/\b(?:make up|invent|fabricate|fake|guess)\b/.test(query) && /\b(?:measurement|value|rating|source|reference|data|number|nasa)\b/.test(query)) {
      return "I won't invent measurements, NASA sources, or safety ratings. The available values and their uncertainty are described in Data & Provenance; I can summarize those instead.";
    }

    const matches = knowledge.filter((item) => item.patterns.some((pattern) => pattern.test(query)));
    if (!matches.length) {
      return "I don't have enough information to answer that reliably. I can explain the embedded Jezero data, route-planner logic, interface controls, and documented limitations. I won't invent measurements, NASA sources, or safety claims.";
    }
    // Keep compound questions useful while limiting accidental keyword pileups.
    const relevant = matches.filter((item) => item.id !== "greeting");
    const selected = relevant.length ? relevant : matches;
    return selected.slice(0, 3).map((item) => item.answer).join("\n\n");
  }

  function initCopilot() {
    const container = document.getElementById("ares-copilot-container");
    const badge = document.getElementById("ares-copilot-badge");
    const win = document.getElementById("ares-copilot-window");
    const close = document.getElementById("chat-close-btn");
    const form = document.getElementById("chat-form");
    const input = document.getElementById("chat-input");
    const btn = document.getElementById("chat-send-btn");
    const log = document.getElementById("chat-log");
    const status = document.getElementById("chat-status");
    if (!container || !badge || !win || !form || !input || !btn || !log || container.dataset.initialized === "true") return;
    container.dataset.initialized = "true";

    const appendBubble = (text, sender, extraClass = "") => {
      const bubble = document.createElement("div");
      bubble.className = `chat-message ${sender}${extraClass ? ` ${extraClass}` : ""}`;
      bubble.setAttribute("role", sender === "bot" ? "status" : "");
      // textContent keeps both user input and canned responses inert.
      bubble.textContent = text;
      log.appendChild(bubble);
      while (log.querySelectorAll(".chat-message:not(.typing)").length > MAX_MESSAGES) {
        const first = log.querySelector(".chat-message:not(.typing)");
        if (!first || first === bubble) break;
        first.remove();
      }
      log.scrollTop = log.scrollHeight;
      return bubble;
    };

    const open = () => {
      win.classList.remove("hidden");
      badge.hidden = true;
      badge.setAttribute("aria-expanded", "true");
      win.setAttribute("aria-hidden", "false");
      input.focus();
      log.scrollTop = log.scrollHeight;
    };
    const dismiss = () => {
      win.classList.add("hidden");
      badge.hidden = false;
      badge.setAttribute("aria-expanded", "false");
      win.setAttribute("aria-hidden", "true");
      badge.focus();
    };
    badge.addEventListener("click", open);
    close && close.addEventListener("click", dismiss);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !win.classList.contains("hidden")) dismiss();
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = input.value.trim();
      if (!query) {
        if (status) status.textContent = "Enter a question to send.";
        input.focus();
        return;
      }
      appendBubble(query, "user");
      input.value = "";
      btn.disabled = true;
      input.disabled = true;
      if (status) status.textContent = "Preparing a local answer…";
      const typing = appendBubble("Checking local help topics…", "bot", "typing");
      window.setTimeout(() => {
        try {
          typing.remove();
          appendBubble(matchQuery(query), "bot");
          if (status) status.textContent = "Local answer ready.";
        } catch (error) {
          typing.remove();
          appendBubble("I couldn't prepare an answer. Please try again.", "bot", "error");
          if (status) status.textContent = "Answer failed. You can retry.";
          console.error("ARES Copilot response failed", error);
        } finally {
          btn.disabled = false;
          input.disabled = false;
          input.focus();
        }
      }, 160);
    });
  }

  const api = { matchQuery, initCopilot, MAX_QUERY_LENGTH };
  root.ARES_COPILOT = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root.document) {
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", initCopilot, { once: true });
    else initCopilot();
  }
})(typeof window !== "undefined" ? window : globalThis);
