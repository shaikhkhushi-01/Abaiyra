import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productsPath = path.join(
  __dirname,
  "data",
  "products.json"
);

let products = [];
let productEmbeddings = [];


/*
  Convert a product into the text representation
  that the embedding model will understand.
*/

function productToText(product) {

  return `
    Product: ${product.name}
    Category: ${product.category}
    Color: ${product.color}
    Occasions: ${product.occasion.join(", ")}
    Style: ${product.style.join(", ")}
    Comfort: ${product.comfort}
    Coverage: ${product.coverage}
    Description: ${product.description}
  `.replace(/\s+/g, " ").trim();

}


/*
  Cosine similarity

  similarity = 1
      very similar

  similarity = 0
      unrelated
*/

function cosineSimilarity(a, b) {

  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {

    dot += a[i] * b[i];

    magnitudeA += a[i] * a[i];

    magnitudeB += b[i] * b[i];

  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return (
    dot /
    (Math.sqrt(magnitudeA) *
      Math.sqrt(magnitudeB))
  );

}


/*
  Create embeddings for all ABAIRA products.
*/

async function buildProductEmbeddings() {

  console.log("Building ABAIRA product embeddings...");

  productEmbeddings = [];

  for (const product of products) {

    const text = productToText(product);

    const response =
      await client.embeddings.create({
        model: "text-embedding-3-small",
        input: text
      });

    productEmbeddings.push({
      productId: product.id,
      embedding: response.data[0].embedding
    });

  }

  console.log(
    `Embedded ${productEmbeddings.length} ABAIRA products.`
  );

}


/*
  Health endpoint
*/

app.get("/api/health", (req, res) => {

  res.json({
    status: "ok",
    service: "ABAIRA AI Search",
    products: products.length,
    embeddedProducts: productEmbeddings.length
  });

});


/*
  Semantic search endpoint

  POST /api/search

  {
    "query": "elegant black burqa for a wedding"
  }
*/

app.post("/api/search", async (req, res) => {

  try {

    const query = req.body?.query?.trim();

    if (!query) {

      return res.status(400).json({
        error: "Query is required."
      });

    }


    if (!productEmbeddings.length) {

      return res.status(503).json({
        error: "Search index is not ready."
      });

    }


    /*
      Embed user's natural-language query.
    */

    const queryResponse =
      await client.embeddings.create({
        model: "text-embedding-3-small",
        input: query
      });


    const queryEmbedding =
      queryResponse.data[0].embedding;


    /*
      Compare query against every ABAIRA product.
    */

    const results = productEmbeddings
      .map(item => {

        const product =
          products.find(
            p => p.id === item.productId
          );

        return {
          ...product,
          similarity: cosineSimilarity(
            queryEmbedding,
            item.embedding
          )
        };

      })
      .sort(
        (a, b) =>
          b.similarity - a.similarity
      )
      .slice(0, 3);


    res.json({
      query,
      model: "text-embedding-3-small",
      results
    });

  }

  catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Semantic search failed."
    });

  }

});


/*
  Load products and start server.
*/

async function start() {

  try {

    products =
      JSON.parse(
        await fs.readFile(
          productsPath,
          "utf-8"
        )
      );


    await buildProductEmbeddings();


    app.listen(PORT, () => {

      console.log(
        `ABAIRA AI server running on http://localhost:${PORT}`
      );

    });

  }

  catch (error) {

    console.error(
      "Failed to start ABAIRA AI server:",
      error
    );

    process.exit(1);

  }

}


start();
