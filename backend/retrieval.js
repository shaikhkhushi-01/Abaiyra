/* =========================================
   ABAIRA AI STUDIO
   SEMANTIC SEARCH + AI STYLIST
========================================= */


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


/* ================= API ================= */

const API_BASE =
  "https://abaira-ai-backend.onrender.com";


/* ================= MOBILE MENU ================= */

const menuBtn =
  document.getElementById("menuBtn");

const navLinks =
  document.getElementById("navLinks");


if (menuBtn && navLinks) {

  menuBtn.addEventListener(
    "click",
    () => {

      navLinks.classList.toggle("open");

    }
  );

}


/* ================= AI CONCEPTS ================= */

const aiConcepts = {

  search: {

    title:
      "Semantic Search",

    description:
      "Describe the kind of burqa you are looking for. ABAIRA uses dense-vector semantic retrieval to find the most relevant designs.",

    placeholder:
      "e.g. elegant black burqa for an evening event"

  },


  stylist: {

    title:
      "AI Stylist",

    description:
      "Tell ABAIRA about your occasion, style, colour and comfort preferences. The AI Stylist combines semantic understanding with product attributes to recommend the best designs.",

    placeholder:
      "e.g. I need a comfortable elegant burqa for a wedding"

  },


  visual: {

    title:
      "Visual Discovery",

    description:
      "Describe the visual characteristics of the design you want. Image-based retrieval will be added in the computer-vision stage.",

    placeholder:
      "e.g. flowing dark minimalist design"

  }

};


/* ================= CURRENT AI MODE ================= */

let currentAI =
  "search";


/* ================= OPEN AI MODAL ================= */

document
  .querySelectorAll(".ai-demo")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const type =
          button.dataset.ai;

        const concept =
          aiConcepts[type];


        if (!concept) {

          return;

        }


        currentAI =
          type;


        modalTitle.textContent =
          concept.title;


        modalDescription.textContent =
          concept.description;


        aiInput.placeholder =
          concept.placeholder;


        aiInput.value =
          "";


        aiResult.innerHTML =
          "";


        modal.classList.add(
          "show"
        );

      }
    );

  });


/* ================= CLOSE MODAL ================= */

if (modalClose) {

  modalClose.addEventListener(
    "click",
    () => {

      modal.classList.remove(
        "show"
      );

    }
  );

}


if (modal) {

  modal.addEventListener(
    "click",
    event => {

      if (
        event.target === modal
      ) {

        modal.classList.remove(
          "show"
        );

      }

    }
  );

}


document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape" &&
      modal &&
      modal.classList.contains(
        "show"
      )
    ) {

      modal.classList.remove(
        "show"
      );

    }

  }
);


/* =========================================
   MAIN AI ACTION
========================================= */

async function runAI() {

  const query =
    aiInput.value.trim();


  /* =========================
     EMPTY QUERY
  ========================= */

  if (!query) {

    aiResult.innerHTML = `

      <div class="no-result">

        <strong>
          Tell ABAIRA what you're looking for.
        </strong>

        <p>
          Example: comfortable elegant burqa for a wedding.
        </p>

      </div>

    `;

    return;

  }


  /* =========================
     VISUAL DISCOVERY
  ========================= */

  if (
    currentAI === "visual"
  ) {

    aiResult.innerHTML = `

      <div class="no-result">

        <strong>
          Visual Discovery is coming next.
        </strong>

        <p>
          The computer-vision stage will allow
          ABAIRA to search designs using image
          embeddings.
        </p>

      </div>

    `;

    return;

  }


  /* =========================
     LOADING
  ========================= */

  aiResult.innerHTML = `

    <div class="ai-loading">

      <div class="loading-dot"></div>

      <p>
        ABAIRA is understanding your request...
      </p>

      <small>
        ${currentAI === "stylist"
          ? "Creating your personalized recommendations"
          : "Searching the semantic product index"}
      </small>

    </div>

  `;


  try {

    /* =========================
       AI STYLIST
    ========================= */

    if (
      currentAI === "stylist"
    ) {

      await runAIStylist(
        query
      );

      return;

    }


    /* =========================
       SEMANTIC SEARCH
    ========================= */

    await runSemanticSearch(
      query
    );

  }


  catch (error) {

    console.error(
      "ABAIRA AI error:",
      error
    );


    aiResult.innerHTML = `

      <div class="no-result">

        <strong>
          ABAIRA AI is temporarily unavailable.
        </strong>

        <p>
          Please try again in a moment.
        </p>

      </div>

    `;

  }

}


/* =========================================
   PHASE 1
   SEMANTIC SEARCH
========================================= */

async function runSemanticSearch(
  query
) {

  const response =
    await fetch(
      `${API_BASE}/api/search`,
      {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
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


/* =========================================
   PHASE 2
   AI STYLIST
========================================= */

async function runAIStylist(
  description
) {

  const response =
    await fetch(
      `${API_BASE}/api/stylist`,
      {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({

            description

          })

      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    throw new Error(
      data.error ||
      "AI Stylist failed."
    );

  }


  renderStylistResults(
    data.recommendations || [],
    data.query || description
  );

}


/* =========================================
   SEMANTIC SEARCH RESULTS
========================================= */

function renderSemanticResults(
  results,
  query
) {

  if (
    !results ||
    !results.length
  ) {

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
          ABAIRA AI Discovery
        </strong>

        <p>
          Semantic matches for
          "${escapeHTML(query)}"
        </p>

      </div>

      <span>
        ${topResults.length}
        matches
      </span>

    </div>


    <div class="ai-results-grid">

      ${topResults
        .map(
          product =>
            createProductCard(
              product,
              "semantic"
            )
        )
        .join("")}

    </div>


    <div class="retrieval-note">

      <div>

        <span>
          RETRIEVAL METHOD
        </span>

        <strong>
          Dense-vector semantic search
        </strong>

      </div>


      <div>

        <span>
          MODEL
        </span>

        <strong>
          Xenova/all-MiniLM-L6-v2
        </strong>

      </div>

    </div>

  `;

}


/* =========================================
   AI STYLIST RESULTS
========================================= */

function renderStylistResults(
  recommendations,
  query
) {

  if (
    !recommendations ||
    !recommendations.length
  ) {

    aiResult.innerHTML = `

      <div class="no-result">

        <strong>
          ABAIRA couldn't find a strong match.
        </strong>

        <p>
          Try mentioning your occasion,
          preferred style, colour or comfort.
        </p>

      </div>

    `;

    return;

  }


  const topResults =
    recommendations.slice(0, 3);


  aiResult.innerHTML = `

    <div class="search-heading">

      <div>

        <strong>
          ABAIRA AI Stylist
        </strong>

        <p>
          Personalized recommendations
          for "${escapeHTML(query)}"
        </p>

      </div>

      <span>
        ${topResults.length}
        recommendations
      </span>

    </div>


    <div class="ai-results-grid">

      ${topResults
        .map(
          product =>
            createStylistCard(
              product
            )
        )
        .join("")}

    </div>


    <div class="retrieval-note">

      <div>

        <span>
          AI ENGINE
        </span>

        <strong>
          Hybrid AI Stylist
        </strong>

      </div>


      <div>

        <span>
          METHOD
        </span>

        <strong>
          Semantic + Attribute Ranking
        </strong>

      </div>

    </div>

  `;

}


/* =========================================
   STANDARD PRODUCT CARD
========================================= */

function createProductCard(
  product
) {

  const similarity =
    getPercentage(
      product.matchScore,
      product.similarity,
      product.score
    );


  return `

    <article
      class="ai-result-card"
      data-product-id="${escapeHTML(
        product.id
      )}"
    >

      <div class="ai-result-image">

        <img
          src="${escapeHTML(
            product.image
          )}"
          alt="${escapeHTML(
            product.name
          )}"
          loading="lazy"
        >

        <div class="similarity-badge">

          ${similarity}% match

        </div>

      </div>


      <div class="ai-result-content">

        <span class="product-category">

          ${escapeHTML(
            product.category
          )}

        </span>


        <h3>

          ${escapeHTML(
            product.name
          )}

        </h3>


        <p>

          ${escapeHTML(
            product.description
          )}

        </p>


        <div class="product-meta">

          ${product.color
            ? `
              <span>
                ${escapeHTML(
                  product.color
                )}
              </span>
            `
            : ""}

          ${product.comfort
            ? `
              <span>
                ${escapeHTML(
                  product.comfort
                )}
                comfort
              </span>
            `
            : ""}

          ${product.coverage
            ? `
              <span>
                ${escapeHTML(
                  product.coverage
                )}
                coverage
              </span>
            `
            : ""}

        </div>


        <div class="match-bar">

          <div
            class="match-bar-fill"
            style="width:${similarity}%"
          ></div>

        </div>


        <small>

          Semantic similarity:
          ${similarity}%

        </small>

      </div>

    </article>

  `;

}


/* =========================================
   AI STYLIST PRODUCT CARD
========================================= */

function createStylistCard(
  product
) {

  const score =
    getPercentage(
      product.matchScore,
      product.similarity,
      product.score
    );


  const reasons =
    Array.isArray(
      product.reasons
    )
      ? product.reasons
      : [];


  return `

    <article
      class="ai-result-card stylist-card"
      data-product-id="${escapeHTML(
        product.id
      )}"
    >

      <div class="ai-result-image">

        <img
          src="${escapeHTML(
            product.image
          )}"
          alt="${escapeHTML(
            product.name
          )}"
          loading="lazy"
        >

        <div class="similarity-badge">

          ${score}% match

        </div>

      </div>


      <div class="ai-result-content">

        <span class="product-category">

          ${escapeHTML(
            product.category
          )}

        </span>


        <h3>

          ${escapeHTML(
            product.name
          )}

        </h3>


        <p>

          ${escapeHTML(
            product.description
          )}

        </p>


        <div class="product-meta">

          ${product.color
            ? `
              <span>
                ${escapeHTML(
                  product.color
                )}
              </span>
            `
            : ""}

          ${product.comfort
            ? `
              <span>
                ${escapeHTML(
                  product.comfort
                )}
                comfort
              </span>
            `
            : ""}

          ${product.coverage
            ? `
              <span>
                ${escapeHTML(
                  product.coverage
                )}
                coverage
              </span>
            `
            : ""}

        </div>


        ${
          reasons.length
            ? `

              <div class="stylist-reasons">

                <strong>
                  Why ABAIRA recommends it
                </strong>

                <ul>

                  ${reasons
                    .slice(0, 3)
                    .map(
                      reason => `
                        <li>
                          ${escapeHTML(
                            reason
                          )}
                        </li>
                      `
                    )
                    .join("")}

                </ul>

              </div>

            `
            : ""
        }


        <div class="match-bar">

          <div
            class="match-bar-fill"
            style="width:${score}%"
          ></div>

        </div>


        <small>

          AI Stylist match:
          ${score}%

        </small>

      </div>

    </article>

  `;

}


/* =========================================
   SCORE HELPER
========================================= */

function getPercentage(
  matchScore,
  similarity,
  score
) {

  if (
    typeof matchScore === "number"
  ) {

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(
          matchScore
        )
      )
    );

  }


  if (
    typeof similarity === "number"
  ) {

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(
          similarity * 100
        )
      )
    );

  }


  if (
    typeof score === "number"
  ) {

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(
          score * 100
        )
      )
    );

  }


  return 0;

}


/* =========================================
   SEARCH / STYLIST BUTTON
========================================= */

if (aiRun) {

  aiRun.addEventListener(
    "click",
    runAI
  );

}


/* =========================================
   ENTER KEY
========================================= */

if (aiInput) {

  aiInput.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        runAI();

      }

    }
  );

}


/* =========================================
   HTML ESCAPE
========================================= */

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
