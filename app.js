/* =========================================
   ABAIRA AI STUDIO
   Semantic Search Frontend
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
      "Describe the kind of burqa you are looking for. ABAIRA converts your natural-language query into an embedding and retrieves the most semantically relevant designs.",

    placeholder:
      "e.g. elegant black burqa for an evening event"

  },


  stylist: {

    title: "AI Stylist",

    description:
      "Describe your occasion, comfort preferences and style. ABAIRA will rank the collection according to your requirements.",

    placeholder:
      "e.g. comfortable and elegant burqa for a wedding"

  },


  visual: {

    title: "Visual Discovery",

    description:
      "Describe the visual characteristics of the design you want. Image-based retrieval will be added in the computer-vision stage.",

    placeholder:
      "e.g. flowing dark minimalist design"

  }

};


/* ================= OPEN AI MODAL ================= */

document
  .querySelectorAll(".ai-demo")
  .forEach(button => {

    button.addEventListener("click", () => {

      const type =
        button.dataset.ai;

      const concept =
        aiConcepts[type];


      if (!concept) {
        return;
      }


      modalTitle.textContent =
        concept.title;


      modalDescription.textContent =
        concept.description;


      aiInput.placeholder =
        concept.placeholder;


      aiInput.value = "";


      aiResult.innerHTML = "";


      modal.classList.add("show");

    });

  });


/* ================= CLOSE AI MODAL ================= */

if (modalClose) {

  modalClose.addEventListener("click", () => {

    modal.classList.remove("show");

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


/* ================= AI SEARCH ================= */

async function runAISearch() {

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


  /* ---------- LOADING STATE ---------- */

  aiResult.innerHTML = `

    <div class="ai-loading">

      <div class="loading-dot"></div>

      <p>
        Understanding your request...
      </p>

      <small>
        Searching the ABAIRA semantic index
      </small>

    </div>

  `;


  try {

    /*
      IMPORTANT:

      The frontend sends the query
      to our backend.

      The API key NEVER lives here.
    */

    const response =
      await fetch(
        "http://localhost:3000/api/search",
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body: JSON.stringify({

            query: query

          })

        }
      );


    const data =
      await response.json();


    /* ---------- API ERROR ---------- */

    if (!response.ok) {

      throw new Error(
        data.error ||
        "Semantic search failed."
      );

    }


    /* ---------- RENDER RESULTS ---------- */

    renderSemanticResults(
      data.results,
      data.query
    );

  }


  catch (error) {

    console.error(
      "ABAIRA AI Search Error:",
      error
    );


    aiResult.innerHTML = `

      <div class="no-result">

        <strong>
          ABAIRA AI is currently unavailable.
        </strong>

        <p>
          Please make sure the ABAIRA AI
          backend is running on port 3000.
        </p>

      </div>

    `;

  }

}


/* ================= SEARCH BUTTON ================= */

if (aiRun) {

  aiRun.addEventListener(
    "click",
    runAISearch
  );

}


/* ================= ENTER KEY ================= */

if (aiInput) {

  aiInput.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {

        runAISearch();

      }

    }
  );

}


/* ================= RENDER SEMANTIC RESULTS ================= */

function renderSemanticResults(
  results,
  query
) {

  /* ---------- NO RESULTS ---------- */

  if (!results || !results.length) {

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


  /*
    We only show the top 3
    semantically ranked products.
  */

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

    </div>

  `;

}


/* ================= PRODUCT CARD ================= */

function createProductCard(product) {

  /*
    Convert similarity score into
    a readable percentage.

    We clamp it between 0 and 100
    for safe UI rendering.
  */

  const rawScore =
    Number(product.similarity) || 0;


  const similarity =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(rawScore * 100)
      )
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
          src="${escapeHTML(product.image)}"
          alt="${escapeHTML(product.name)}"
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

          <span>

            ${escapeHTML(
              product.color
            )}

          </span>


          <span>

            ${escapeHTML(
              product.comfort
            )}
            comfort

          </span>


          <span>

            ${escapeHTML(
              product.coverage
            )}
            coverage

          </span>

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


/* ================= HTML ESCAPE ================= */

function escapeHTML(text) {

  return String(text)

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
