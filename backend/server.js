import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { pipeline } from "@huggingface/transformers";


/* =========================================
   ABAIRA AI — LOCAL SEMANTIC SEARCH
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


/*
  Repository structure:

  Abaiyra/
  ├── data/
  │   └── products.json
  │
  └── backend/
      └── server.js
*/

const productsPath =
  path.join(
    __dirname,
    "..",
    "data",
    "products.json"
  );


/* =========================================
   MODEL CONFIGURATION
========================================= */

const MODEL_NAME =
  "Xenova/all-MiniLM-L6-v2";


let extractor = null;

let products = [];

let productEmbeddings = [];

let modelReady = false;


/* =========================================
   PRODUCT TEXT REPRESENTATION
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
   VECTOR → ARRAY
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
   LOAD AI MODEL
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
   BUILD PRODUCT INDEX
========================================= */

async function buildProductIndex() {

  console.log(
    "ABAIRA: building semantic product index..."
  );


  productEmbeddings = [];


  for (
    const product of products
  ) {

    const searchableText =
      productToText(product);


    console.log(
      `ABAIRA: embedding ${product.name}`
    );


    const embedding =
      await createEmbedding(
        searchableText
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
        "ABAIRA AI Semantic Search",

      model:
        MODEL_NAME,

      products:
        products.length,

      indexedProducts:
        productEmbeddings.length,

      semanticSearch:
        modelReady &&
        productEmbeddings.length > 0

    });

  }
);


/* =========================================
   SEMANTIC SEARCH API
========================================= */

app.post(
  "/api/search",
  async (req, res) => {

    try {

      const query =
        req.body?.query?.trim();


      /* -------------------------------
         VALIDATE QUERY
      -------------------------------- */

      if (!query) {

        return res.status(400).json({

          error:
            "Search query is required."

        });

      }


      /* -------------------------------
         MODEL CHECK
      -------------------------------- */

      if (
        !modelReady ||
        !extractor
      ) {

        return res.status(503).json({

          error:
            "ABAIRA AI model is still loading. Please try again shortly."

        });

      }


      /* -------------------------------
         INDEX CHECK
      -------------------------------- */

      if (
        !productEmbeddings.length
      ) {

        return res.status(503).json({

          error:
            "ABAIRA semantic index is not ready."

        });

      }


      console.log(
        `ABAIRA query: "${query}"`
      );


      /* -------------------------------
         QUERY EMBEDDING
      -------------------------------- */

      const queryEmbedding =
        await createEmbedding(
          query
        );


      /* -------------------------------
         SEMANTIC RETRIEVAL
      -------------------------------- */

      const rankedResults =
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


            const similarity =
              cosineSimilarity(
                queryEmbedding,
                item.embedding
              );


            return {

              ...product,

              score:
                Number(
                  similarity.toFixed(4)
                ),

              matchScore:
                Math.round(
                  similarity * 100
                )

            };

          })

          .filter(Boolean)

          .sort(
            (a, b) =>
              b.score -
              a.score
          )

          .slice(0, 3);


      /* -------------------------------
         RESPONSE
      -------------------------------- */

      res.json({

        query,

        retrievalMethod:
          "local dense-vector semantic retrieval",

        embeddingModel:
          MODEL_NAME,

        resultCount:
          rankedResults.length,

        results:
          rankedResults

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
   START SERVER
========================================= */

async function startServer() {

  try {

    /*
      Step 1:
      Load products
    */

    await loadProducts();


    /*
      Step 2:
      Load local AI model
    */

    await loadModel();

    modelReady = true;


    /*
      Step 3:
      Create product embeddings
    */

    await buildProductIndex();


    /*
      Step 4:
      Start HTTP server
    */

    app.listen(
      PORT,
      () => {

        console.log(
          `ABAIRA AI server running on port ${PORT}`
        );

        console.log(
          "ABAIRA: semantic search is ONLINE."
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


startServer();
