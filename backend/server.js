import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { pipeline } from "@huggingface/transformers";

import {
  searchProducts
} from "./retrieval.js";


/* =========================================
   ABAIRA AI
   SEMANTIC SEARCH + AI STYLIST
========================================= */

const app = express();

const PORT = process.env.PORT || 3000;


/* =========================================
   MIDDLEWARE
========================================= */

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
  })
);

app.use(express.json());


/* =========================================
   PATH CONFIGURATION
========================================= */

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

const productsPath =
  path.join(
    __dirname,
    "..",
    "data",
    "products.json"
  );


/* =========================================
   AI MODEL
========================================= */

const MODEL_NAME =
  "Xenova/all-MiniLM-L6-v2";

let extractor = null;

let products = [];

let productEmbeddings = [];

let modelReady = false;


/* =========================================
   PRODUCT → SEARCH TEXT
========================================= */

function productToText(product) {

  return [

    `Product: ${product.name}`,

    `Category: ${product.category}`,

    `Color: ${product.color}`,

    `Occasions: ${
      Array.isArray(product.occasion)
        ? product.occasion.join(", ")
        : ""
    }`,

    `Style: ${
      Array.isArray(product.style)
        ? product.style.join(", ")
        : ""
    }`,

    `Comfort: ${product.comfort}`,

    `Coverage: ${product.coverage}`,

    `Description: ${product.description}`

  ]
    .join(". ")
    .replace(/\s+/g, " ")
    .trim();

}


/* =========================================
   TENSOR → ARRAY
========================================= */

function tensorToArray(tensor) {

  return Array.from(
    tensor.data
  );

}


/* =========================================
   COSINE SIMILARITY
========================================= */

function cosineSimilarity(a, b) {

  let dotProduct = 0;

  let magnitudeA = 0;

  let magnitudeB = 0;

  for (
    let i = 0;
    i < a.length;
    i++
  ) {

    dotProduct +=
      a[i] * b[i];

    magnitudeA +=
      a[i] * a[i];

    magnitudeB +=
      b[i] * b[i];

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

  const output =
    await extractor(
      text,
      {
        pooling: "mean",
        normalize: true
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

  const file =
    await fs.readFile(
      productsPath,
      "utf-8"
    );

  products =
    JSON.parse(file);

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

  extractor =
    await pipeline(
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

  for (
    const product of products
  ) {

    console.log(
      `ABAIRA: embedding ${product.name}`
    );

    const embedding =
      await createEmbedding(
        productToText(product)
      );

    productEmbeddings.push({

      productId:
        product.id,

      embedding

    });

  }

  console.log(
    `ABAIRA: ${productEmbeddings.length} product embeddings ready.`
  );

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

      model:
        MODEL_NAME,

      products:
        products.length,

      indexedProducts:
        productEmbeddings.length,

      semanticSearch:
        modelReady &&
        productEmbeddings.length > 0,

      aiStylist:
        modelReady &&
        productEmbeddings.length > 0

    });

  }
);


/* =========================================
   PHASE 1
   SEMANTIC SEARCH
========================================= */

app.post(
  "/api/search",
  async (req, res) => {

    try {

      const query =
        typeof req.body?.query === "string"
          ? req.body.query.trim()
          : "";


      if (!query) {

        return res.status(400).json({
          error: "Search query is required."
        });

      }


      if (
        !modelReady ||
        !extractor
      ) {

        return res.status(503).json({
          error:
            "ABAIRA AI model is still loading."
        });

      }


      /* =====================================
         KEYWORD RETRIEVAL
      ===================================== */

      const keywordResults =
        searchProducts(
          query,
          products
        );


      /* =====================================
         SEMANTIC RETRIEVAL
      ===================================== */

      const queryEmbedding =
        await createEmbedding(
          query
        );


      const semanticResults =
        productEmbeddings

          .map(item => {

            const product =
              products.find(
                p =>
                  p.id === item.productId
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

              similarity,

              semanticScore:
                Math.round(
                  Math.max(
                    0,
                    Math.min(
                      100,
                      similarity * 100
                    )
                  )
                )

            };

          })

          .filter(Boolean);


      /* =====================================
         HYBRID RETRIEVAL
      ===================================== */

      const keywordMap =
        new Map(
          keywordResults.map(
            product => [
              product.id,
              product.score
            ]
          )
        );


      const hybridResults =
        semanticResults

          .map(product => {

            const keywordScore =
              keywordMap.get(
                product.id
              ) || 0;


            /*
              Semantic similarity has the
              primary weight.

              Keyword matching provides
              an additional retrieval signal.
            */

            const hybridScore =
              (
                product.similarity * 0.75
              ) +
              (
                Math.min(
                  keywordScore / 10,
                  1
                ) * 0.25
              );


            return {

              ...product,

              score:
                Number(
                  hybridScore.toFixed(4)
                ),

              matchScore:
                Math.round(
                  Math.max(
                    0,
                    Math.min(
                      100,
                      hybridScore * 100
                    )
                  )
                ),

              keywordScore

            };

          })

          .sort(
            (a, b) =>
              b.score - a.score
          )

          .slice(0, 3);


      /* =====================================
         RESPONSE
      ===================================== */

      res.json({

        success: true,

        query,

        retrievalMethod:
          "hybrid keyword + dense-vector semantic retrieval",

        embeddingModel:
          MODEL_NAME,

        resultCount:
          hybridResults.length,

        results:
          hybridResults

      });

    }


    catch (error) {

      console.error(
        "ABAIRA search error:",
        error
      );


      res.status(500).json({

        error:
          "Semantic search failed."

      });

    }

  }
);

/* =========================================
   PHASE 2
   AI STYLIST HELPERS
========================================= */


/* =========================================
   NORMALIZE VALUES TO ARRAY
========================================= */

function normalizeArray(value) {

  if (Array.isArray(value)) {

    return value
      .map(item =>
        String(item)
          .toLowerCase()
          .trim()
      )
      .filter(Boolean);

  }


  if (
    value === undefined ||
    value === null
  ) {

    return [];

  }


  const normalized =
    String(value)
      .toLowerCase()
      .trim();


  return normalized
    ? [normalized]
    : [];

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
    normalizeArray(
      productValues
    );


  const request =
    String(
      requestedValue
    )
      .toLowerCase()
      .trim();


  if (!request) {

    return 0;

  }


  /* ---------- EXACT MATCH ---------- */

  if (
    values.includes(request)
  ) {

    return 1;

  }


  /* ---------- PARTIAL MATCH ---------- */

  const partial =
    values.some(value =>
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


  const product =
    String(
      productComfort || ""
    )
      .toLowerCase()
      .trim();


  const requested =
    String(
      requestedComfort
    )
      .toLowerCase()
      .trim();


  if (
    product === requested
  ) {

    return 1;

  }


  const comfortLevels = [

    "low",

    "medium",

    "high",

    "very-high"

  ];


  const productIndex =
    comfortLevels.indexOf(
      product
    );


  const requestedIndex =
    comfortLevels.indexOf(
      requested
    );


  if (
    productIndex === -1 ||
    requestedIndex === -1
  ) {

    return 0;

  }


  const difference =
    Math.abs(
      productIndex -
      requestedIndex
    );


  if (
    difference === 1
  ) {

    return 0.7;

  }


  if (
    difference === 2
  ) {

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


  if (
    preferences.description
  ) {

    parts.push(
      preferences.description
    );

  }


  if (
    preferences.occasion
  ) {

    parts.push(
      `occasion: ${preferences.occasion}`
    );

  }


  if (
    preferences.style
  ) {

    parts.push(
      `style: ${preferences.style}`
    );

  }


  if (
    preferences.color
  ) {

    parts.push(
      `color: ${preferences.color}`
    );

  }


  if (
    preferences.comfort
  ) {

    parts.push(
      `comfort: ${preferences.comfort}`
    );

  }


  if (
    preferences.coverage
  ) {

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

      .map(item => {

        const product =
          products.find(
            p =>
              p.id ===
              item.productId
          );


        if (!product) {

          return null;

        }


        /* =========================
           SEMANTIC SCORE
        ========================= */

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
                semanticSimilarity * 100
              )
            )
          );


        /* =========================
           STRUCTURED MATCHES
        ========================= */

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


        /* =========================
           WEIGHTED SCORE

           Semantic     = 25%
           Occasion     = 25%
           Style        = 20%
           Comfort      = 15%
           Color        = 10%
           Coverage     = 5%

           TOTAL        = 100%
        ========================= */

        const structuredScore =

          occasionScore * 25 +

          styleScore * 20 +

          comfortScore * 15 +

          colorScore * 10 +

          coverageScore * 5;


        const finalScore =

          semanticScore * 0.25 +

          structuredScore;


        /* =========================
           MATCH REASONS
        ========================= */

        const reasons = [];


        if (
          occasionScore >= 1
        ) {

          reasons.push(
            `matches your ${preferences.occasion} occasion`
          );

        }


        if (
          styleScore >= 1
        ) {

          reasons.push(
            `matches your ${preferences.style} style preference`
          );

        }


        if (
          comfortScore >= 1
        ) {

          reasons.push(
            `matches your ${preferences.comfort} comfort preference`
          );

        }


        if (
          colorScore >= 1
        ) {

          reasons.push(
            `matches your ${preferences.color} color preference`
          );

        }


        if (
          coverageScore >= 1
        ) {

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


        /* =========================
           RETURN PRODUCT
        ========================= */

        return {

          ...product,

          score:
            Number(
              (
                finalScore / 100
              ).toFixed(4)
            ),

          matchScore:
            Math.max(
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
              )

          },

          reasons

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
   PHASE 2
   AI STYLIST API
========================================= */

app.post(
  "/api/stylist",
  async (req, res) => {

    try {

      const preferences =
        req.body || {};


      /* =========================
         CLEAN DESCRIPTION
      ========================= */

      const description =

        typeof preferences.description ===
        "string"

          ? preferences.description.trim()

          : "";


      /* =========================
         VALIDATION
      ========================= */

      const hasPreference =

        Boolean(description) ||

        Boolean(preferences.occasion) ||

        Boolean(preferences.style) ||

        Boolean(preferences.color) ||

        Boolean(preferences.comfort) ||

        Boolean(preferences.coverage);


      if (!hasPreference) {

        return res.status(400).json({

          error:
            "Please provide at least one styling preference."

        });

      }


      /* =========================
         MODEL CHECK
      ========================= */

      if (
        !modelReady ||
        !extractor
      ) {

        return res.status(503).json({

          error:
            "ABAIRA AI stylist is still loading."

        });

      }


      /* =========================
         RANK PRODUCTS
      ========================= */

      const rankedProducts =
        await rankStylistProducts({

          ...preferences,

          description

        });


      /* =========================
         TOP 3
      ========================= */

      const recommendations =
        rankedProducts.slice(0, 3);


      /* =========================
         RESPONSE
      ========================= */

      return res.json({

        success: true,

        engine:
          "ABAIRA Hybrid AI Stylist",

        retrievalMethod:
          "Hybrid semantic + attribute-based ranking",

        model:
          MODEL_NAME,

        query:
          buildStylistQuery({
            ...preferences,
            description
          }),

        preferences: {

          ...preferences,

          description

        },

        resultCount:
          recommendations.length,

        recommendations

      });

    }


    catch (error) {

      console.error(
        "ABAIRA stylist error:",
        error
      );


      return res.status(500).json({

        error:
          "AI Stylist recommendation failed."

      });

    }

  }
);


/* =========================================
   START SERVER
========================================= */

async function startServer() {

  try {

    /* =========================
       LOAD PRODUCTS
    ========================= */

    await loadProducts();


    /* =========================
       LOAD AI MODEL
    ========================= */

    await loadModel();


    modelReady = true;


    /* =========================
       BUILD INDEX
    ========================= */

    await buildProductIndex();


    /* =========================
       START EXPRESS SERVER
    ========================= */

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

      }
    );

  }


  catch (error) {

    console.error(
      "ABAIRA backend startup failed:",
      error
    );

    process.exit(1);

  }

}


/* =========================================
   START
========================================= */

startServer();
