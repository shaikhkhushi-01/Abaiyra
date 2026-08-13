import { searchProducts } from "./ai/search.js";


/* =========================================
   ABAIRA APPLICATION
========================================= */


let products = [];


/* ================= LOAD PRODUCT DATA ================= */

async function loadProducts() {

  try {

    const response =
      await fetch("./data/products.json");


    if (!response.ok) {
      throw new Error("Product dataset could not be loaded.");
    }


    products = await response.json();

    console.log(
      `ABAIRA dataset loaded: ${products.length} products`
    );

  }

  catch (error) {

    console.error(
      "ABAIRA data error:",
      error
    );

  }

}


loadProducts();


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


/* ================= AI MODAL ================= */

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


const aiConcepts = {

  search: {

    title: "Semantic Search",

    description:
      "Describe the burqa you are looking for. ABAIRA currently uses a retrieval baseline; the next version will replace it with embedding-based semantic search.",

    placeholder:
      "e.g. elegant black burqa for an evening event"

  },


  stylist: {

    title: "AI Stylist",

    description:
      "Describe your occasion and preferences. The recommendation system will use these signals to rank suitable ABAIRA designs.",

    placeholder:
      "e.g. comfortable burqa for a wedding"

  },


  visual: {

    title: "Visual Discovery",

    description:
      "Describe the visual characteristics of your reference look. Image-embedding retrieval will be added in the computer-vision stage.",

    placeholder:
      "e.g. flowing dark minimalist design"

  }

};


/* ================= OPEN MODAL ================= */

document
  .querySelectorAll(".ai-demo")
  .forEach(button => {

    button.addEventListener("click", () => {

      const type =
        button.dataset.ai;

      const concept =
        aiConcepts[type];


      if (!concept) return;


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


/* ================= CLOSE MODAL ================= */

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
    modal.classList.contains("show")
  ) {

    modal.classList.remove("show");

  }

});


/* ================= SEARCH ================= */

async function runAISearch() {

  const query = aiInput.value.trim();

  if (!query) {

    aiResult.innerHTML = `
      <p>
        Please describe the style you're looking for.
      </p>
    `;

    return;
  }


  aiResult.innerHTML = `
    <p>
      Searching the ABAIRA semantic index...
    </p>
  `;


  try {

    const response = await fetch(
      "http://localhost:3000/api/search",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          query
        })
      }
    );


    const data = await response.json();


    if (!response.ok) {
      throw new Error(
        data.error || "Search failed."
      );
    }


    renderSemanticResults(
      data.results,
      data.query
    );

  }

  catch (error) {

    console.error(error);

    aiResult.innerHTML = `
      <div class="no-result">

        <strong>
          AI search unavailable
        </strong>

        <p>
          Make sure the ABAIRA AI backend
          is running on port 3000.
        </p>

      </div>
    `;

  }

}

/* ================= RENDER RESULTS ================= */

function renderResults(results, query) {

  if (!results.length) {

    aiResult.innerHTML = `

      <div class="no-result">

        <strong>
          No close match found.
        </strong>

        <p>
          Try words such as:
          black, elegant, wedding,
          comfortable, everyday or evening.
        </p>

      </div>

    `;

    return;

  }


  const topResults =
    results.slice(0, 3);


  aiResult.innerHTML = `

    <div class="search-heading">

      <strong>
        ABAIRA discovery results
      </strong>

      <span>
        ${topResults.length} matches
      </span>

    </div>

    <div class="ai-results-grid">

      ${topResults.map(product => `

        <article class="ai-result-card">

          <div class="ai-result-image">

            <img
              src="${product.image}"
              alt="${product.name}"
            >

          </div>

          <div class="ai-result-content">

            <span>
              ${product.category}
            </span>

            <h3>
              ${product.name}
            </h3>

            <p>
              ${product.description}
            </p>

            <small>
              Match score: ${product.score}
            </small>

          </div>

        </article>

      `).join("")}

    </div>

    <div class="retrieval-note">

      Query:
      <strong>"${escapeHTML(query)}"</strong>

      <br>

      Current engine:
      <strong>Keyword Retrieval Baseline</strong>

    </div>

  `;

}


/* ================= SECURITY ================= */

function escapeHTML(text) {

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}
