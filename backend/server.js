import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";


/* =========================================
   ABAIRA AI BACKEND
========================================= */

dotenv.config();


/* ================= SERVER ================= */

const app = express();

const PORT =
  process.env.PORT || 3000;


/* ================= MIDDLEWARE ================= */

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
  })
);

app.use(express.json());


/* ================= OPENAI ================= */

if (!process.env.OPENAI_API_KEY) {

  console.warn(
    "WARNING: OPENAI_API_KEY is not configured."
  );

}

const openai =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY
  });


/* ================= FILE PATHS ================= */

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);


/*
  Your products.json is here:

  Abaiyra/
  ├── data/
  │   └── products.json
  │
  └── backend/
      └── server.js

  Therefore we go one level up
  from backend/ and then into data/.
*/

const productsPath =
  path.join(
    __dirname,
    "..",
    "data",
    "products.json"
  );


/* ================= DATA ================= */

let products = [];

let productEmbeddings = [];


/* =========================================
   PRODUCT → SEARCHABLE TEXT
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
   BUILD PRODUCT EMBEDDINGS
========================================= */

async function buildProductEmbeddings() {

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


  if (!process.env.OPENAI_API_KEY) {

    console.warn(
      "ABAIRA: embeddings skipped because API key is missing."
    );

    return;

  }


  console.log(
    "ABAIRA: generating semantic embeddings..."
  );


  productEmbeddings = [];


  /*
    Generate an embedding for every
    ABAIRA product.
  */

  for (
    const product of products
  ) {

    const searchableText =
      productToText(product);


    const response =
      await openai.embeddings.create({

        model:
          "text-embedding-3-small",

        input:
          searchableText

      });


    productEmbeddings.push({

      productId:
        product.id,

      embedding:
        response.data[0].embedding

    });


    console.log(
      `Embedded: ${product.name}`
    );

  }


  console.log(
    `ABAIRA: ${productEmbeddings.length} embeddings ready.`
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
        "ABAIRA AI Search",

      products:
        products.length,

      embeddedProducts:
        productEmbeddings.length,

      semanticSearch:
        productEmbeddings.length > 0

    });

  }
);


/* =========================================
   SEMANTIC SEARCH
========================================= */

app.post(
  "/api/search",
  async (req, res) => {

    try {

      const query =
        req.body?.query?.trim();


      /* ---------- VALIDATE QUERY ---------- */

      if (!query) {

        return res.status(400).json({

          error:
            "Search query is required."

        });

      }


      /* ---------- CHECK EMBEDDINGS ---------- */

      if (
        !productEmbeddings.length
      ) {

        return res.status(503).json({

          error:
            "Semantic search index is not ready."

        });

      }


      /*
        Convert the user's natural-language
        request into an embedding.
      */

      const queryResponse =
        await openai.embeddings.create({

          model:
            "text-embedding-3-small",

          input:
            query

        });


      const queryEmbedding =
        queryResponse
          .data[0]
          .embedding;


      /*
        Compare the query against
        every ABAIRA product.
      */

      const results =
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

              similarity

            };

          })


          .filter(Boolean)


          /*
            Highest semantic similarity
            comes first.
          */

          .sort(
            (a, b) =>
              b.similarity -
              a.similarity
          )


          /*
            We only return the top
            three recommendations.
          */

          .slice(0, 3);


      /* ---------- RESPONSE ---------- */

      res.json({

        query,

        retrievalMethod:
          "embedding-based semantic search",

        model:
          "text-embedding-3-small",

        results

      });

    }


    catch (error) {

      console.error(
        "ABAIRA semantic search error:",
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

    await buildProductEmbeddings();


    app.listen(
      PORT,
      () => {

        console.log(
          `ABAIRA AI server running on port ${PORT}`
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
