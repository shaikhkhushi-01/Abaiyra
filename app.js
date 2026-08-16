/* =========================================
   ABAIRA AI STUDIO
   Phase 1: Semantic Search
   Phase 2: AI Stylist
========================================= */


/* ================= CONFIGURATION ================= */

const API_BASE_URL =
  "https://abaira-ai-backend.onrender.com";


/* ================= DOM ELEMENTS ================= */

const modal =
  document.getElementById("aiModal");

const modalClose =
  document.getElementById("modalClose");

const modalTitle =
  document.getElementById("modalTitle");

const modalDescription =
  document.getElementById("modalDescription");

const aiInput =
  document.getElementById("aiInput");

const aiRun =
  document.getElementById("aiRun");

const aiResult =
  document.getElementById("aiResult");


/* ================= AI STYLIST ELEMENTS ================= */

const stylistForm =
  document.getElementById("stylistForm");

const stylistRun =
  document.getElementById("stylistRun");

const stylistOccasion =
  document.getElementById("stylistOccasion");

const stylistStyle =
  document.getElementById("stylistStyle");

const stylistComfort =
  document.getElementById("stylistComfort");

const stylistColor =
  document.getElementById("stylistColor");

const stylistCoverage =
  document.getElementById("stylistCoverage");

const stylistDescription =
  document.getElementById("stylistDescription");


/* ================= SEMANTIC SEARCH FORM ================= */

const semanticSearchForm =
  document.getElementById("semanticSearchForm");


/* ================= MOBILE MENU ================= */

const menuBtn =
  document.getElementById("menuBtn");

const navLinks =
  document.getElementById("navLinks");


if (menuBtn && navLinks) {

  menuBtn.addEventListener("click", () => {

    navLinks.classList.toggle("open");

  });

}


/* ================= AI CONCEPTS ================= */

const aiConcepts = {

  search: {

    title: "Semantic Search",

    description:
      "Describe the kind of burqa you are looking for. ABAIRA converts your natural-language request into an embedding and retrieves the most semantically relevant designs."

  },


  stylist: {

    title: "AI Stylist",

    description:
      "Tell ABAIRA about your occasion, style, comfort, colour and coverage preferences. Our recommendation engine will rank the collection around your requirements."

  },


  visual: {

    title: "Visual Discovery",

    description:
      "Describe the visual characteristics of the design you want. ABAIRA will prepare the request for the visual discovery stage."

  }

};


/* ================= CURRENT AI MODE ================= */

let currentAIMode =
  "search";


/* ================= OPEN AI MODAL ================= */

document
  .querySelectorAll(".ai-demo")
  .forEach(button => {

    button.addEventListener("click", () => {

      const type =
        button.dataset.ai;

      const concept =
        aiConcepts[type];


      if (!concept || !modal) {

        return;

      }


      currentAIMode =
        type;


      /* ---------- HEADER ---------- */

      if (modalTitle) {

        modalTitle.textContent =
          concept.title;

      }


      if (modalDescription) {

        modalDescription.textContent =
          concept.description;

      }


      /* ---------- RESET ---------- */

      resetAIInterface();


      /* ---------- MODE ---------- */

      if (type === "stylist") {

        showStylistMode();

      }

      else {

        showSemanticMode(type);

      }


      modal.classList.add("show");

    });

  });


/* ================= RESET AI INTERFACE ================= */

function resetAIInterface() {

  if (aiResult) {

    aiResult.innerHTML = "";

  }


  if (aiInput) {

    aiInput.value = "";

  }


  if (stylistOccasion) {

    stylistOccasion.value = "";

  }


  if (stylistStyle) {

    stylistStyle.value = "";

  }


  if (stylistComfort) {

    stylistComfort.value = "";

  }


  if (stylistColor) {

    stylistColor.value = "";

  }


  if (stylistCoverage) {

    stylistCoverage.value = "";

  }


  if (stylistDescription) {

    stylistDescription.value = "";

  }

}


/* ================= SHOW STYLIST ================= */

function showStylistMode() {

  if (stylistForm) {

    stylistForm.style.display =
      "block";

  }


  if (semanticSearchForm) {

    semanticSearchForm.style.display =
      "none";

  }

}


/* ================= SHOW SEMANTIC SEARCH ================= */

function showSemanticMode(type) {

  if (stylistForm) {

    stylistForm.style.display =
      "none";

  }


  if (semanticSearchForm) {

    semanticSearchForm.style.display =
      "block";

  }


  if (!aiInput) {

    return;

  }


  if (type === "visual") {

    aiInput.placeholder =
      "e.g. flowing dark minimalist design";

  }

  else {

    aiInput.placeholder =
      "e.g. elegant black burqa for an evening event";

  }

}


/* ================= CLOSE AI MODAL ================= */

if (modalClose) {

  modalClose.addEventListener("click", () => {

    if (modal) {

      modal.classList.remove("show");

    }

  });

}


if (modal) {

  modal.addEventListener("click", event => {

    if (event.target === modal) {

      modal.classList.remove("show");

    }

  });

}


document.addEventListener("keydown", event => {

  if (
    event.key === "Escape" &&
    modal &&
    modal.classList.contains("show")
  ) {

    modal.classList.remove("show");

  }

});


/* =========================================
   PHASE 1
   SEMANTIC SEARCH
========================================= */


/* ================= RUN SEMANTIC SEARCH ================= */

async function runAISearch() {

  if (!aiInput || !aiResult) {

    return;

  }


  const query =
    aiInput.value.trim();


  /* ---------- EMPTY QUERY ---------- */

  if (!query) {

    aiResult.innerHTML = `

      <div class="no-result">

        <strong>
          Tell ABAIRA what you're looking for.
        </strong>

        <p>
          Example: elegant black burqa for a wedding.
        </p>

      </div>

    `;

    return;

  }


  /* ---------- LOADING ---------- */

  showLoading(
    "Understanding your request...",
    "Searching the ABAIRA semantic index"
  );


  try {

    const response =
      await fetch(
        `${API_BASE_URL}/api/search`,
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body: JSON.stringify({

            query

          })

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Semantic search failed."
      );

    }


    renderSemanticResults(
      data.results || [],
      query
    );

  }


  catch (error) {

    console.error(
      "ABAIRA semantic search error:",
      error
    );


    renderAPIError(
      "Semantic search unavailable",
      "The ABAIRA AI backend could not complete the search. Please try again."
    );

  }

}


/* ================= RENDER SEMANTIC RESULTS ================= */

function renderSemanticResults(
  results,
  query
) {

  if (!results.length) {

    aiResult.innerHTML = `

      <div class="no-result">

        <strong>
          No close ABAIRA match found.
        </strong>

        <p>
          Try describing an occasion,
          style, colour or comfort preference.
        </p>

      </div>

    `;

    return;

  }


  const topResults =
    results.slice(0, 3);


  aiResult.innerHTML = `

    <div class="search-heading">

      <div>

        <strong>
          ABAIRA AI Recommendations
        </strong>

        <p>
          Ranked using semantic similarity
        </p>

      </div>

      <span>
        ${topResults.length} matches
      </span>

    </div>


    <div class="ai-results-grid">

      ${topResults
        .map(product =>
          createProductCard(product)
        )
        .join("")}

    </div>


    <div class="retrieval-note">

      <div>

        <span>
          YOUR REQUEST
        </span>

        <strong>
          "${escapeHTML(query)}"
        </strong>

      </div>


      <div>

        <span>
          RETRIEVAL METHOD
        </span>

        <strong>
          Embedding-based semantic search
        </strong>

      </div>


      <div>

        <span>
          EMBEDDING MODEL
        </span>

        <strong>
          Xenova/all-MiniLM-L6-v2
        </strong>

      </div>

    </div>

  `;

}


/* =========================================
   PHASE 2
   AI STYLIST
========================================= */


/* ================= RUN AI STYLIST ================= */

async function runAIStylist() {

  if (!aiResult) {

    return;

  }


  /* ---------- COLLECT USER PREFERENCES ---------- */

  const occasion =
    stylistOccasion
      ? stylistOccasion.value.trim()
      : "";


  const style =
    stylistStyle
      ? stylistStyle.value.trim()
      : "";


  const comfort =
    stylistComfort
      ? stylistComfort.value.trim()
      : "";


  const color =
    stylistColor
      ? stylistColor.value.trim()
      : "";


  const coverage =
    stylistCoverage
      ? stylistCoverage.value.trim()
      : "";


  const description =
    stylistDescription
      ? stylistDescription.value.trim()
      : "";


  /* ---------- VALIDATION ---------- */

  if (
    !occasion &&
    !style &&
    !comfort &&
    !color &&
    !coverage &&
    !description
  ) {

    aiResult.innerHTML = `

      <div class="no-result">

        <strong>
          Tell ABAIRA a little about your style.
        </strong>

        <p>
          Choose at least one preference
          or describe what you're looking for.
        </p>

      </div>

    `;

    return;

  }


  /* ---------- LOADING ---------- */

  showLoading(
    "ABAIRA is styling your request...",
    "Combining semantic relevance with your preferences"
  );


  /* ---------- REQUEST PAYLOAD ---------- */

  const payload = {

    occasion,

    style,

    comfort,

    color,

    coverage,

    description

  };


  console.log(
    "ABAIRA AI Stylist request:",
    payload
  );


  try {

    const response =
      await fetch(
        `${API_BASE_URL}/api/stylist`,
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify(payload)

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "AI Stylist request failed."
      );

    }


    console.log(
      "ABAIRA AI Stylist response:",
      data
    );


    renderStylistResults(
      data,
      payload
    );

  }


  catch (error) {

    console.error(
      "ABAIRA AI Stylist error:",
      error
    );


    renderAPIError(
      "AI Stylist unavailable",
      "The recommendation service could not complete this request. Please make sure the ABAIRA backend is running correctly."
    );

  }

}


/* ================= RENDER AI STYLIST RESULTS ================= */

function renderStylistResults(
  data,
  preferences
) {

  const results =
    Array.isArray(data.results)
      ? data.results
      : Array.isArray(data.recommendations)
        ? data.recommendations
        : [];


  if (!results.length) {

    aiResult.innerHTML = `

      <div class="no-result">

        <strong>
          ABAIRA couldn't find a close recommendation.
        </strong>

        <p>
          Try changing the occasion,
          style or comfort preference.
        </p>

      </div>

    `;

    return;

  }


  const topResults =
    results.slice(0, 3);


  aiResult.innerHTML = `

    <div class="search-heading">

      <div>

        <strong>
          ABAIRA AI Stylist
        </strong>

        <p>
          Your collection, ranked around your preferences
        </p>

      </div>

      <span>
        ${topResults.length} recommendations
      </span>

    </div>


    <div class="stylist-preference-summary">

      ${createPreferencePill(
        "Occasion",
        preferences.occasion
      )}

      ${createPreferencePill(
        "Style",
        preferences.style
      )}

      ${createPreferencePill(
        "Comfort",
        preferences.comfort
      )}

      ${createPreferencePill(
        "Colour",
        preferences.color
      )}

      ${createPreferencePill(
        "Coverage",
        preferences.coverage
      )}

    </div>


    <div class="ai-results-grid">

      ${topResults
        .map(product =>
          createStylistCard(
            product,
            preferences
          )
        )
        .join("")}

    </div>


    <div class="retrieval-note">

      <div>

        <span>
          RECOMMENDATION METHOD
        </span>

        <strong>
          Hybrid AI ranking
        </strong>

      </div>


      <div>

        <span>
          SEMANTIC ENGINE
        </span>

        <strong>
          Xenova/all-MiniLM-L6-v2
        </strong>

      </div>


      <div>

        <span>
          RESULTS
        </span>

        <strong>
          Top ${topResults.length} personalised matches
        </strong>

      </div>

    </div>

  `;

}


/* ================= STYLIST PRODUCT CARD ================= */

function createStylistCard(
  product,
  preferences
) {

  const match =
    getProductMatchScore(product);


  const semantic =
    getPercentage(
      product.semanticScore ??
      product.similarity ??
      product.semanticSimilarity
    );


  const attribute =
    getPercentage(
      product.attributeScore ??
      product.preferenceScore ??
      product.preferenceMatch
    );


  const occasionMatch =
    getPercentage(
      product.occasionScore ??
      product.occasionMatch
    );


  const styleMatch =
    getPercentage(
      product.styleScore ??
      product.styleMatch
    );


  const comfortMatch =
    getPercentage(
      product.comfortScore ??
      product.comfortMatch
    );


  const colorMatch =
    getPercentage(
      product.colorScore ??
      product.colourScore ??
      product.colorMatch
    );


  const explanation =
    getRecommendationExplanation(
      product,
      preferences
    );


  return `

    <article
      class="ai-result-card stylist-result-card"
      data-product-id="${escapeHTML(
        product.id || ""
      )}"
    >

      <div class="ai-result-image">

        <img
          src="${escapeHTML(
            product.image || ""
          )}"
          alt="${escapeHTML(
            product.name || "ABAIRA design"
          )}"
          loading="lazy"
        >


        <div class="similarity-badge">

          ${match}% match

        </div>

      </div>


      <div class="ai-result-content">

        <span class="product-category">

          ${escapeHTML(
            product.category || "ABAIRA"
          )}

        </span>


        <h3>

          ${escapeHTML(
            product.name || "ABAIRA Design"
          )}

        </h3>


        <p>

          ${escapeHTML(
            product.description || ""
          )}

        </p>


        <!-- MATCH BREAKDOWN -->

        <div class="ai-match-breakdown">

          ${createScoreRow(
            "Semantic relevance",
            semantic
          )}

          ${createScoreRow(
            "Preference match",
            attribute
          )}

          ${createScoreRow(
            "Occasion",
            occasionMatch
          )}

          ${createScoreRow(
            "Style",
            styleMatch
          )}

          ${createScoreRow(
            "Comfort",
            comfortMatch
          )}

          ${createScoreRow(
            "Colour",
            colorMatch
          )}

        </div>


        <!-- WHY ABAIRA -->

        <div class="recommendation-reason">

          <strong>
            WHY ABAIRA RECOMMENDS IT
          </strong>

          <p>
            ${escapeHTML(
              explanation
            )}
          </p>

        </div>


        <!-- PRODUCT META -->

        <div class="product-meta">

          ${
            product.color
              ? `
                <span>
                  ${escapeHTML(product.color)}
                </span>
              `
              : ""
          }


          ${
            product.comfort
              ? `
                <span>
                  ${escapeHTML(product.comfort)}
                  comfort
                </span>
              `
              : ""
          }


          ${
            product.coverage
              ? `
                <span>
                  ${escapeHTML(product.coverage)}
                  coverage
                </span>
              `
              : ""
          }

        </div>


        <!-- MAIN MATCH BAR -->

        <div class="match-bar">

          <div
            class="match-bar-fill"
            style="width:${match}%"
          ></div>

        </div>


        <small>

          Overall recommendation:
          ${match}%

        </small>

      </div>

    </article>

  `;

}


/* ================= SCORE ROW ================= */

function createScoreRow(
  label,
  score
) {

  if (score === null) {

    return "";

  }


  return `

    <div class="score-row">

      <span>
        ${escapeHTML(label)}
      </span>

      <strong>
        ${score}%
      </strong>

    </div>

  `;

}


/* ================= PREFERENCE PILL ================= */

function createPreferencePill(
  label,
  value
) {

  if (!value) {

    return "";

  }


  return `

    <span class="preference-pill">

      <small>
        ${escapeHTML(label)}
      </small>

      ${escapeHTML(
        formatPreference(value)
      )}

    </span>

  `;

}


/* ================= FORMAT PREFERENCE ================= */

function formatPreference(value) {

  return String(value)

    .replace(
      /-/g,
      " "
    )

    .replace(
      /\b\w/g,
      letter =>
        letter.toUpperCase()
    );

}


/* ================= GET MATCH SCORE ================= */

function getProductMatchScore(product) {

  const possibleScores = [

    product.matchScore,

    product.overallScore,

    product.recommendationScore,

    product.score,

    product.finalScore

  ];


  for (
    const score of possibleScores
  ) {

    const percentage =
      getPercentage(score);


    if (
      percentage !== null
    ) {

      return percentage;

    }

  }


  /* ---------- FALLBACK ---------- */

  const semantic =
    getPercentage(
      product.similarity
    );


  if (semantic !== null) {

    return semantic;

  }


  return 0;

}


/* ================= SCORE NORMALIZER ================= */

function getPercentage(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return null;

  }


  const number =
    Number(value);


  if (
    Number.isNaN(number)
  ) {

    return null;

  }


  /*
    If backend gives:

    0.87 -> 87%
    87   -> 87%

  */

  const percentage =
    number <= 1
      ? number * 100
      : number;


  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        percentage
      )
    )
  );

}


/* ================= RECOMMENDATION EXPLANATION ================= */

function getRecommendationExplanation(
  product,
  preferences
) {

  /*
    Prefer backend-generated explanation
    if available.
  */

  if (
    product.explanation
  ) {

    return String(
      product.explanation
    );

  }


  if (
    product.reason
  ) {

    return String(
      product.reason
    );

  }


  if (
    product.why
  ) {

    return String(
      product.why
    );

  }


  /*
    Frontend fallback explanation.
    This is not pretending to be an LLM explanation;
    it simply reflects the selected attributes.
  */

  const reasons = [];


  const occasionMatch =
    Array.isArray(product.occasion) &&
    preferences.occasion &&
    product.occasion
      .map(String)
      .includes(
        String(
          preferences.occasion
        )
      );


  const styleMatch =
    Array.isArray(product.style) &&
    preferences.style &&
    product.style
      .map(String)
      .includes(
        String(
          preferences.style
        )
      );


  const comfortMatch =
    preferences.comfort &&
    product.comfort &&
    String(
      product.comfort
    ) === String(
      preferences.comfort
    );


  const colorMatch =
    preferences.color &&
    product.color &&
    String(
      product.color
    ) === String(
      preferences.color
    );


  if (occasionMatch) {

    reasons.push(
      `matches your ${formatPreference(
        preferences.occasion
      )} occasion`
    );

  }


  if (styleMatch) {

    reasons.push(
      `matches your ${formatPreference(
        preferences.style
      )} style preference`
    );

  }


  if (comfortMatch) {

    reasons.push(
      `matches your ${formatPreference(
        preferences.comfort
      )} comfort preference`
    );

  }


  if (colorMatch) {

    reasons.push(
      `matches your ${formatPreference(
        preferences.color
      )} colour preference`
    );

  }


  if (!reasons.length) {

    return "This design was ranked highly by ABAIRA's recommendation engine based on the overall similarity between your request and the collection.";

  }


  return `This design ${joinReasons(
    reasons
  )}.`;

}


/* ================= JOIN REASONS ================= */

function joinReasons(
  reasons
) {

  if (reasons.length === 1) {

    return reasons[0];

  }


  if (reasons.length === 2) {

    return `${reasons[0]} and ${reasons[1]}`;

  }


  return `${reasons
    .slice(0, -1)
    .join(", ")}, and ${reasons[
      reasons.length - 1
    ]}`;

}


/* =========================================
   LOADING + ERROR UI
========================================= */


/* ================= LOADING ================= */

function showLoading(
  title,
  description
) {

  if (!aiResult) {

    return;

  }


  aiResult.innerHTML = `

    <div class="ai-loading">

      <div class="loading-dot"></div>

      <p>
        ${escapeHTML(title)}
      </p>

      <small>
        ${escapeHTML(description)}
      </small>

    </div>

  `;

}


/* ================= API ERROR ================= */

function renderAPIError(
  title,
  message
) {

  if (!aiResult) {

    return;

  }


  aiResult.innerHTML = `

    <div class="no-result">

      <strong>
        ${escapeHTML(title)}
      </strong>

      <p>
        ${escapeHTML(message)}
      </p>

      <small>
        Please try again in a moment.
      </small>

    </div>

  `;

}


/* =========================================
   BUTTON EVENTS
========================================= */


/* ================= SEMANTIC SEARCH BUTTON ================= */

if (aiRun) {

  aiRun.addEventListener(
    "click",
    runAISearch
  );

}


/* ================= SEMANTIC ENTER KEY ================= */

if (aiInput) {

  aiInput.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        runAISearch();

      }

    }
  );

}


/* ================= AI STYLIST BUTTON ================= */

if (stylistRun) {

  stylistRun.addEventListener(
    "click",
    runAIStylist
  );

}


/* ================= HTML ESCAPE ================= */

function escapeHTML(
  text
) {

  return String(
    text ?? ""
  )

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================================
   ABAIRA READY
========================================= */

console.log(
  "ABAIRA AI Studio initialized."
);

console.log(
  "Semantic Search: ACTIVE"
);

console.log(
  "AI Stylist: ACTIVE"
);
