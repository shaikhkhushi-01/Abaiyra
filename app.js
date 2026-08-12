/* =========================================
   ABAIRA — FRONTEND INTERACTIONS
========================================= */


/* ================= MOBILE MENU ================= */

const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

if (menuBtn && navLinks) {

  menuBtn.addEventListener("click", () => {

    navLinks.classList.toggle("open");

  });

}


/* ================= AI MODAL ================= */

const modal = document.getElementById("aiModal");

const modalClose = document.getElementById("modalClose");

const modalTitle = document.getElementById("modalTitle");

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
      "Describe the kind of burqa you are looking for. In the production version, this input will be converted into an embedding and matched against the ABAIRA collection.",

    placeholder:
      "e.g. elegant black burqa for an evening event",

    result:
      "Prototype pipeline → Natural language → Embedding → Vector retrieval → Ranked ABAIRA results."

  },


  stylist: {

    title: "AI Stylist",

    description:
      "Tell ABAIRA about your occasion, preferences or existing wardrobe. The future recommendation engine will combine these signals to generate personalized suggestions.",

    placeholder:
      "e.g. I need a comfortable black burqa for a wedding",

    result:
      "Prototype pipeline → Occasion + preferences + wardrobe context → Recommendation model → Personalized suggestions."

  },


  visual: {

    title: "Visual Discovery",

    description:
      "Use a reference image to discover visually related ABAIRA designs. The production system will use image embeddings and similarity search.",

    placeholder:
      "Describe your reference look",

    result:
      "Prototype pipeline → Reference image → Vision embedding → Similarity search → Related ABAIRA designs."

  }

};


/* ================= OPEN AI MODAL ================= */

const aiButtons =
  document.querySelectorAll(".ai-demo");


aiButtons.forEach(button => {

  button.addEventListener("click", () => {

    const type = button.dataset.ai;

    const concept = aiConcepts[type];

    if (!concept || !modal) return;


    modalTitle.textContent =
      concept.title;


    modalDescription.textContent =
      concept.description;


    aiInput.placeholder =
      concept.placeholder;


    aiInput.value = "";


    aiResult.textContent = "";


    modal.classList.add("show");

  });

});


/* ================= CLOSE MODAL ================= */

if (modalClose) {

  modalClose.addEventListener("click", () => {

    modal.classList.remove("show");

  });

}


/* Close by clicking outside */

if (modal) {

  modal.addEventListener("click", event => {

    if (event.target === modal) {

      modal.classList.remove("show");

    }

  });

}


/* Close using Escape */

document.addEventListener("keydown", event => {

  if (
    event.key === "Escape" &&
    modal &&
    modal.classList.contains("show")
  ) {

    modal.classList.remove("show");

  }

});


/* ================= AI DEMO RESPONSE ================= */

if (aiRun) {

  aiRun.addEventListener("click", () => {

    const query =
      aiInput.value.trim();


    if (!query) {

      aiResult.textContent =
        "Please describe the burqa or style you are looking for.";

      return;

    }


    const activeTitle =
      modalTitle.textContent;


    if (activeTitle === "Semantic Search") {

      aiResult.textContent =
        "Concept result: your fashion intent has been identified. A production embedding model would now retrieve the closest ABAIRA designs.";

    }


    else if (activeTitle === "AI Stylist") {

      aiResult.textContent =
        "Concept result: occasion and preference signals detected. A production recommendation model would generate personalized ABAIRA suggestions.";

    }


    else {

      aiResult.textContent =
        "Concept result: visual-search workflow ready. A production vision model would compare the reference against ABAIRA image embeddings.";

    }

  });

}


/* ================= IMAGE FALLBACK ================= */

/*
   If one of the original images is missing,
   the browser will show a neutral fallback
   instead of breaking the layout.
*/

document.querySelectorAll("img").forEach(image => {

  image.addEventListener("error", () => {

    image.style.background = "#e5ddd5";

    image.alt = "ABAIRA collection image";

  });

});
