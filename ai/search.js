export function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim();
}

export function tokenize(text) {
  return normalize(text)
    .split(/\s+/)
    .filter(Boolean);
}

export function scoreProduct(query, product) {

  const words = tokenize(query);

  const occasions = Array.isArray(product.occasion)
    ? product.occasion
    : [];

  const styles = Array.isArray(product.style)
    ? product.style
    : [];

  const tags = Array.isArray(product.tags)
    ? product.tags
    : [];

  const searchableText = normalize([
    product.name,
    product.category,
    product.color,
    product.comfort,
    product.coverage,
    product.description,
    ...occasions,
    ...styles,
    ...tags
  ].join(" "));

  let score = 0;

  words.forEach(word => {

    if (searchableText.includes(word)) {
      score += 1;
    }

    if (
      normalize(product.name).includes(word)
    ) {
      score += 3;
    }

    if (
      tags.some(tag =>
        normalize(tag).includes(word)
      )
    ) {
      score += 2;
    }

    if (
      styles.some(style =>
        normalize(style).includes(word)
      )
    ) {
      score += 2;
    }

    if (
      occasions.some(occasion =>
        normalize(occasion).includes(word)
      )
    ) {
      score += 2;
    }

  });

  return score;
}

export function searchProducts(query, products) {

  if (
    !query ||
    !Array.isArray(products) ||
    !products.length
  ) {
    return [];
  }

  return products
    .map(product => ({
      ...product,
      score: scoreProduct(query, product)
    }))
    .filter(product => product.score > 0)
    .sort((a, b) => b.score - a.score);
}
