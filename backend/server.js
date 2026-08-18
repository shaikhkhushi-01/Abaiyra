import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { pipeline } from "@huggingface/transformers";

/* =========================================
   ABAIRA AI
   SEMANTIC SEARCH + AI STYLIST
========================================= */

const app = express();

const PORT = process.env.PORT || 3000;

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

/* =========================================
   MIDDLEWARE
========================================= */

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

/* =========================================
   PATH CONFIGURATION
========================================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productsPath = path.join(
  __dirname,
  "..",
  "data",
  "products.json"
);

/* =========================================
   AI STATE
========================================= */

let extractor = null;
let products = [];
let productEmbeddings = [];
let modelReady = false;

/* =========================================
   NORMALIZATION HELPERS
========================================= */

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim();
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalize(item))
      .filter(Boolean);
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [normalize(value)].filter(Boolean);
}

function tokenize(text) {
  return normalize(text)
    .split(/\s+/)
    .filter(Boolean);
}

/* =========================================
   PRODUCT → SEARCH TEXT
========================================= */

function productToText(product) {
  const occasion = normalizeArray(product.occasion);
  const style = normalizeArray(product.style);
  const tags = normalizeArray(product.tags);

  return [
    `Product: ${product.name || ""}`,
    `Category: ${product.category || ""}`,
    `Color: ${product.color || ""}`,
    `Occasions: ${occasion.join(", ")}`,
    `Style: ${style.join(", ")}`,
    `Tags: ${tags.join(", ")}`,
    `Comfort: ${product.comfort || ""}`,
    `Coverage: ${product.coverage || ""}`,
    `Description: ${product.description || ""}`,
  ]
    .join(". ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================
   SIMPLE KEYWORD RETRIEVAL BASELINE
========================================= */

function scoreProduct(query, product) {
  const words = tokenize(query);

  const searchableText = normalize(
    [
      product.name,
      product.category,
      product.color,
      product.comfort,
      product.coverage,
      product.description,
      ...normalizeArray(product.occasion),
      ...normalizeArray(product.style),
      ...normalizeArray(product.tags),
    ].join(" ")
  );

  const productName = normalize(product.name);

  const tags = normalizeArray(product.tags);
  const styles = normalizeArray(product.style);
  const occasions = normalizeArray(product.occasion);

  let score = 0;

  words.forEach((word) => {
    if (searchableText.includes(word)) {
      score += 1;
    }

    if (productName.includes(word)) {
      score += 3;
    }

    if (
      tags.some((tag) =>
        tag.includes(word)
      )
    ) {
      score += 2;
    }

    if (
      styles.some((style) =>
        style.includes(word)
      )
    ) {
      score += 2;
    }

    if (
      occasions.some((occasion) =>
        occasion.includes(word)
      )
    ) {
      score += 2;
    }
  });

  return score;
}

function keywordSearchProducts(query) {
  if (!query || !products.length) {
    return [];
  }

  return products
    .map((product) => ({
      ...product,
      keywordScore: scoreProduct(
        query,
        product
      ),
    }))
    .filter(
      (product) =>
        product.keywordScore > 0
    )
    .sort(
      (a, b) =>
        b.keywordScore -
        a.keywordScore
    );
}

/* =========================================
   TENSOR → ARRAY
========================================= */

function tensorToArray(tensor) {
  return Array.from(tensor.data);
}

/* =========================================
   COSINE SIMILARITY
========================================= */

function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  const length = Math.min(
    a.length,
    b.length
  );

  for (let i = 0; i < length; i++) {
    dotProduct += a[i] * b[i];

    magnitudeA += a[i] * a[i];

    magnitudeB += b[i] * b[i];
  }

  if (
    magnitudeA === 0 ||
    magnitudeB === 0
  ) {
    return 0;
  }

  return (
    dotProduct /
    (
      Math.sqrt(magnitudeA) *
      Math.sqrt(magnitudeB)
    )
  );
}

/* =========================================
   CREATE EMBEDDING
========================================= */

async function createEmbedding(text) {
  if (!extractor) {
    throw new Error(
      "Embedding model is not ready."
    );
  }

  const output = await extractor(
    text,
    {
      pooling: "mean",
      normalize: true,
    }
  );

  return tensorToArray(output);
}

/* =========================================
   LOAD PRODUCTS
========================================= */

async function loadProducts() {
  console.log(
    "ABAIRA: loading product dataset..."
  );

  const file = await fs.readFile(
    productsPath,
    "utf-8"
  );

  const parsed = JSON.parse(file);

  if (!Array.isArray(parsed)) {
    throw new Error(
      "products.json must contain an array."
    );
  }

  products = parsed;

  console.log(
    `ABAIRA: ${products.length} products loaded.`
  );
}

/* =========================================
   LOAD LOCAL AI MODEL
========================================= */

async function loadModel() {
  console.log(
    "ABAIRA: loading local embedding model..."
  );

  console.log(
    `ABAIRA: model = ${MODEL_NAME}`
  );

  extractor = await pipeline(
    "feature-extraction",
    MODEL_NAME
  );

  console.log(
    "ABAIRA: embedding model ready."
  );
}

/* =========================================
   BUILD PRODUCT EMBEDDING INDEX
========================================= */

async function buildProductIndex() {
  console.log(
    "ABAIRA: building semantic product index..."
  );

  productEmbeddings = [];

  for (const product of products) {
    console.log(
      `ABAIRA: embedding ${product.name}`
    );

    const embedding =
      await createEmbedding(
        productToText(product)
      );

    productEmbeddings.push({
      productId: product.id,
      embedding,
    });
  }

  console.log(
    `ABAIRA: ${productEmbeddings.length} product embeddings ready.`
  );
}

/* =========================================
   ATTRIBUTE MATCH
========================================= */

function attributeMatch(
  productValues,
  requestedValue
) {
  if (!requestedValue) {
    return 0;
  }

  const values =
    normalizeArray(productValues);

  const request =
    normalize(requestedValue);

  if (!request) {
    return 0;
  }

  if (values.includes(request)) {
    return 1;
  }

  const partial = values.some(
    (value) =>
      value.includes(request) ||
      request.includes(value)
  );

  if (partial) {
    return 0.75;
  }

  return 0;
}

/* =========================================
   COMFORT MATCH
========================================= */

function comfortMatch(
  productComfort,
  requestedComfort
) {
  if (!requestedComfort) {
    return 0;
  }

  const product = normalize(
    productComfort
  );

  const requested = normalize(
    requestedComfort
  );

  if (product === requested) {
    return 1;
  }

  const comfortLevels = [
    "low",
    "medium",
    "high",
    "very-high",
  ];

  const productIndex =
    comfortLevels.indexOf(product);

  const requestedIndex =
    comfortLevels.indexOf(requested);

  if (
    productIndex === -1 ||
    requestedIndex === -1
  ) {
    return 0;
  }

  const difference = Math.abs(
    productIndex -
      requestedIndex
  );

  if (difference === 1) {
    return 0.7;
  }

  if (difference === 2) {
    return 0.35;
  }

  return 0;
}

/* =========================================
   BUILD STYLIST QUERY
========================================= */

function buildStylistQuery(
  preferences
) {
  const parts = [];

  const description =
    typeof preferences.description ===
    "string"
      ? preferences.description.trim()
      : "";

  if (description) {
    parts.push(description);
  }

  if (preferences.occasion) {
    parts.push(
      `occasion: ${preferences.occasion}`
    );
  }

  if (preferences.style) {
    parts.push(
      `style: ${preferences.style}`
    );
  }

  if (preferences.color) {
    parts.push(
      `color: ${preferences.color}`
    );
  }

  if (preferences.comfort) {
    parts.push(
      `comfort: ${preferences.comfort}`
    );
  }

  if (preferences.coverage) {
    parts.push(
      `coverage: ${preferences.coverage}`
    );
  }

  return parts
    .join(". ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================
   HYBRID AI STYLIST RANKING
========================================= */

async function rankStylistProducts(
  preferences
) {
  const semanticQuery =
    buildStylistQuery(
      preferences
    );

  const queryEmbedding =
    await createEmbedding(
      semanticQuery
    );

  const ranked =
    productEmbeddings
      .map((item) => {
        const product =
          products.find(
            (p) =>
              p.id ===
              item.productId
          );

        if (!product) {
          return null;
        }

        /* -------------------------------
           SEMANTIC SCORE
        -------------------------------- */

        const semanticSimilarity =
          cosineSimilarity(
            queryEmbedding,
            item.embedding
          );

        const semanticScore =
          Math.max(
            0,
            Math.min(
              100,
              Math.round(
                semanticSimilarity *
                  100
              )
            )
          );

        /* -------------------------------
           STRUCTURED MATCHES
        -------------------------------- */

        const occasionScore =
          attributeMatch(
            product.occasion,
            preferences.occasion
          );

        const styleScore =
          attributeMatch(
            product.style,
            preferences.style
          );

        const colorScore =
          attributeMatch(
            product.color,
            preferences.color
          );

        const coverageScore =
          attributeMatch(
            product.coverage,
            preferences.coverage
          );

        const comfortScore =
          comfortMatch(
            product.comfort,
            preferences.comfort
          );

        /* -------------------------------
           KEYWORD SCORE
        -------------------------------- */

        const keywordScore =
          scoreProduct(
            semanticQuery,
            product
          );

        const normalizedKeywordScore =
          Math.min(
            100,
            keywordScore * 10
          );

        /* -------------------------------
           WEIGHTED HYBRID SCORE
        -------------------------------- */

        /*
          Semantic      = 35%
          Occasion      = 20%
          Style         = 15%
          Comfort       = 10%
          Color         = 5%
          Coverage      = 5%
          Keyword       = 10%
        */

        const finalScore =
          semanticScore * 0.35 +
          occasionScore * 20 +
          styleScore * 15 +
          comfortScore * 10 +
          colorScore * 5 +
          coverageScore * 5 +
          normalizedKeywordScore * 0.10;

        /* -------------------------------
           MATCH REASONS
        -------------------------------- */

        const reasons = [];

        if (occasionScore >= 1) {
          reasons.push(
            `matches your ${preferences.occasion} occasion`
          );
        }

        if (styleScore >= 1) {
          reasons.push(
            `matches your ${preferences.style} style preference`
          );
        }

        if (comfortScore >= 1) {
          reasons.push(
            `matches your ${preferences.comfort} comfort preference`
          );
        }

        if (colorScore >= 1) {
          reasons.push(
            `matches your ${preferences.color} color preference`
          );
        }

        if (coverageScore >= 1) {
          reasons.push(
            `matches your ${preferences.coverage} coverage preference`
          );
        }

        if (
          reasons.length === 0
        ) {
          reasons.push(
            "closely matches the overall description you provided"
          );
        }

        return {
          ...product,

          score: Number(
            (
              finalScore / 100
            ).toFixed(4)
          ),

          matchScore: Math.max(
            0,
            Math.min(
              100,
              Math.round(
                finalScore
              )
            )
          ),

          matchBreakdown: {
            semantic:
              semanticScore,

            keyword:
              Math.round(
                normalizedKeywordScore
              ),

            occasion:
              Math.round(
                occasionScore * 100
              ),

            style:
              Math.round(
                styleScore * 100
              ),

            comfort:
              Math.round(
                comfortScore * 100
              ),

            color:
              Math.round(
                colorScore * 100
              ),

            coverage:
              Math.round(
                coverageScore * 100
              ),
          },

          reasons,
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.matchScore -
          a.matchScore
      );

  return ranked;
}

/* =========================================
   HEALTH CHECK
========================================= */

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      status: "ok",

      service:
        "ABAIRA AI Semantic Search + Stylist",

      model: MODEL_NAME,

      products:
        products.length,

      indexedProducts:
        productEmbeddings.length,

      semanticSearch:
        modelReady &&
        productEmbeddings.length > 0,

      aiStylist:
        modelReady &&
        productEmbeddings.length > 0,

      hybridRanking: true,

      keywordBaseline: true,
    });
  }
);

/* =========================================
   PHASE 1 — SEMANTIC SEARCH
========================================= */

app.post(
  "/api/search",
  async (req, res) => {
    try {
      const query =
        typeof req.body?.query ===
        "string"
          ? req.body.query.trim()
          : "";

      if (!query) {
        return res.status(400).json({
          error:
            "Search query is required.",
        });
      }

      if (
        !modelReady ||
        !extractor
      ) {
        return res.status(503).json({
          error:
            "ABAIRA AI model is still loading.",
        });
      }

      const queryEmbedding =
        await createEmbedding(
          query
        );

      const rankedResults =
        productEmbeddings
          .map((item) => {
            const product =
              products.find(
                (p) =>
                  p.id ===
                  item.productId
              );

            if (!product) {
              return null;
            }

            const similarity =
              cosineSimilarity(
                queryEmbedding,
                item.embedding
              );

            return {
              ...product,

              score: Number(
                similarity.toFixed(4)
              ),

              matchScore: Math.max(
                0,
                Math.min(
                  100,
                  Math.round(
                    similarity * 100
                  )
                )
              ),
            };
          })
          .filter(Boolean)
          .sort(
            (a, b) =>
              b.score - a.score
          )
          .slice(0, 3);

      res.json({
        query,

        retrievalMethod:
          "local dense-vector semantic retrieval",

        embeddingModel:
          MODEL_NAME,

        resultCount:
          rankedResults.length,

        results:
          rankedResults,
      });
    } catch (error) {
      console.error(
        "ABAIRA search error:",
        error
      );

      res.status(500).json({
        error:
          "Semantic search failed.",
      });
    }
  }
);

/* =========================================
   ABAIRA AI STYLIST — PHASE 2
========================================= */

async function runAIStylist() {

  const query = aiInput.value.trim();


  /* ---------- EMPTY QUERY ---------- */

  if (!query) {

    aiResult.innerHTML = `

      <div class="no-result">

        <strong>
          Tell ABAIRA about your style.
        </strong>

        <p>
          Example: comfortable elegant black burqa for a wedding.
        </p>

      </div>

    `;

    return;

  }


  /* ---------- LOADING ---------- */

  aiResult.innerHTML = `

    <div class="ai-loading">

      <div class="loading-dot"></div>

      <p>
        ABAIRA is styling your look...
      </p>

      <small>
        Combining semantic understanding with product attributes
      </small>

    </div>

  `;


  try {

    /*
      IMPORTANT:
      API key is NOT used in frontend.
      Request goes to our Render backend.
    */

    const response = await fetch(
      "https://abaira-ai-backend.onrender.com/api/stylist",
      {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          description: query

        })

      }
    );


    const data =
      await response.json();


    /* ---------- API ERROR ---------- */

    if (!response.ok) {

      throw new Error(
        data.error ||
        "AI Stylist request failed."
      );

    }


    /* ---------- RENDER ---------- */

    renderStylistResults(
      data.recommendations,
      query,
      data
    );

  }


  catch (error) {

    console.error(
      "ABAIRA AI Stylist error:",
      error
    );


    aiResult.innerHTML = `

      <div class="no-result">

        <strong>
          ABAIRA couldn't complete the styling request.
        </strong>

        <p>
          Please try again in a moment.
        </p>

      </div>

    `;

  }

}


/* =========================================
   RENDER STYLIST RESULTS
========================================= */

function renderStylistResults(
  recommendations,
  query,
  data
) {

  if (
    !recommendations ||
    !recommendations.length
  ) {

    aiResult.innerHTML = `

      <div class="no-result">

        <strong>
          No close ABAIRA style match found.
        </strong>

        <p>
          Try describing the occasion, color,
          comfort or style you prefer.
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
          Personalized recommendations for
          "${escapeHTML(query)}"
        </p>

      </div>

      <span>
        ${topResults.length} matches
      </span>

    </div>


    <div class="ai-results-grid">

      ${topResults
        .map(product =>
          createStylistCard(product)
        )
        .join("")}

    </div>


    <div class="retrieval-note">

      <div>

        <span>
          AI ENGINE
        </span>

        <strong>
          ${escapeHTML(
            data.engine ||
            "ABAIRA Hybrid AI Stylist"
          )}
        </strong>

      </div>


      <div>

        <span>
          RETRIEVAL
        </span>

        <strong>
          ${escapeHTML(
            data.retrievalMethod ||
            "Hybrid semantic + attribute-based ranking"
          )}
        </strong>

      </div>

    </div>

  `;

}


/* =========================================
   STYLIST PRODUCT CARD
========================================= */

function createStylistCard(product) {

  const similarity =
    Math.max(
      0,
      Math.min(
        100,
        Number(product.matchScore) || 0
      )
    );


  const reasons =
    Array.isArray(product.reasons)
      ? product.reasons
      : [];


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
            product.image || ""
          )}"
          alt="${escapeHTML(
            product.name || "ABAIRA product"
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
            product.category || ""
          )}

        </span>


        <h3>

          ${escapeHTML(
            product.name || ""
          )}

        </h3>


        <p>

          ${escapeHTML(
            product.description || ""
          )}

        </p>


        <div class="product-meta">

          ${
            product.color
              ? `<span>
                  ${escapeHTML(product.color)}
                </span>`
              : ""
          }


          ${
            product.comfort
              ? `<span>
                  ${escapeHTML(product.comfort)} comfort
                </span>`
              : ""
          }


          ${
            product.coverage
              ? `<span>
                  ${escapeHTML(product.coverage)} coverage
                </span>`
              : ""
          }

        </div>


        ${
          reasons.length
            ? `

              <div class="stylist-reasons">

                <strong>
                  Why ABAIRA chose this
                </strong>

                <ul>

                  ${reasons
                    .slice(0, 3)
                    .map(reason => `
                      <li>
                        ${escapeHTML(reason)}
                      </li>
                    `)
                    .join("")}

                </ul>

              </div>

            `
            : ""
        }


        <div class="match-bar">

          <div
            class="match-bar-fill"
            style="width:${similarity}%"
          ></div>

        </div>


        <small>

          AI stylist match:
          ${similarity}%

        </small>

      </div>

    </article>

  `;

}


/* =========================================
   AI STYLIST BUTTON
========================================= */

document
  .querySelectorAll(".ai-demo")
  .forEach(button => {

    button.addEventListener("click", () => {

      const type =
        button.dataset.ai;


      /*
        Only replace the search action
        when AI Stylist is selected.
      */

      if (type === "stylist") {

        if (aiRun) {

          aiRun.onclick =
            runAIStylist;

        }

      }

    });

  });


/* =========================================
   STYLIST ENTER KEY
========================================= */

if (aiInput) {

  aiInput.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter" &&
        modal &&
        modal.classList.contains("show")
      ) {

        const activeTitle =
          modalTitle?.textContent || "";


        if (
          activeTitle
            .toLowerCase()
            .includes("stylist")
        ) {

          event.preventDefault();

          runAIStylist();

        }

      }

    }
  );

}

/* =========================================
   PHASE 2 — AI STYLIST
========================================= */

app.post(
  "/api/stylist",
  async (req, res) => {
    try {
      const preferences =
        req.body || {};

      const description =
        typeof preferences.description ===
        "string"
          ? preferences.description.trim()
          : "";

      const hasPreference =
        Boolean(
          description ||
          preferences.occasion ||
          preferences.style ||
          preferences.color ||
          preferences.comfort ||
          preferences.coverage
        );

      if (!hasPreference) {
        return res.status(400).json({
          error:
            "Please provide at least one styling preference.",
        });
      }

      if (
        !modelReady ||
        !extractor
      ) {
        return res.status(503).json({
          error:
            "ABAIRA AI stylist is still loading.",
        });
      }

      const rankedProducts =
        await rankStylistProducts(
          preferences
        );

      const recommendations =
        rankedProducts.slice(0, 3);

      res.json({
        success: true,

        engine:
          "ABAIRA Hybrid AI Stylist",

        retrievalMethod:
          "Hybrid semantic + attribute + keyword ranking",

        model: MODEL_NAME,

        query:
          buildStylistQuery(
            preferences
          ),

        preferences,

        resultCount:
          recommendations.length,

        recommendations,
      });
    } catch (error) {
      console.error(
        "ABAIRA stylist error:",
        error
      );

      res.status(500).json({
        error:
          "AI Stylist recommendation failed.",
      });
    }
  }
);

/* =========================================
   START SERVER
========================================= */

async function startServer() {
  try {
    await loadProducts();

    await loadModel();

    await buildProductIndex();

    modelReady = true;

    app.listen(
      PORT,
      () => {
        console.log(
          `ABAIRA AI server running on port ${PORT}`
        );

        console.log(
          "ABAIRA: semantic search ONLINE."
        );

        console.log(
          "ABAIRA: AI stylist ONLINE."
        );

        console.log(
          "ABAIRA: hybrid ranking ONLINE."
        );
      }
    );
  } catch (error) {
    console.error(
      "ABAIRA backend startup failed:",
      error
    );

    process.exit(1);
  }
}

startServer();
