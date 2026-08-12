export function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim();
}


export function tokenize(text) {
  return normalize(text)
    .split(/\s+/)
    .filter(Boolean);
}


/*
  Simple retrieval baseline.

  Later:

  Keyword Retrieval
        ↓
  Embedding Retrieval
        ↓
  Compare performance
*/


export function scoreProduct(query, product) {

  const words = tokenize(query);

  const searchableText = normalize([
    product.name,
    product.category,
    product.color,
    product.comfort,
    product.coverage,
    product.description,
    ...product.occasion,
    ...product.style,
    ...product.tags
  ].join(" "));


  let score = 0;


  words.forEach(word => {

    if (searchableText.includes(word)) {
      score += 1;
    }

    if (product.name.toLowerCase().includes(word)) {
      score += 3;
    }

    if (product.tags.some(tag =>
      tag.toLowerCase().includes(word)
    )) {
      score += 2;
    }

    if (product.style.some(style =>
      style.toLowerCase().includes(word)
    )) {
      score += 2;
    }

    if (product.occasion.some(occasion =>
      occasion.toLowerCase().includes(word)
    )) {
      score += 2;
    }

  });


  return score;
}


export function searchProducts(query, products) {

  if (!query || !products.length) {
    return [];
  }


  const results = products
    .map(product => ({
      ...product,
      score: scoreProduct(query, product)
    }))
    .filter(product => product.score > 0)
    .sort((a, b) => b.score - a.score);


  return results;
}
