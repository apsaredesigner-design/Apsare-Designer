-- Functional GIN index backing free-text product search (see products.service.ts:
-- fullTextScores / toTsQuery). Mirrors the old MySQL FULLTEXT index over the same
-- four columns, concatenated the same way the query concatenates them at read time.
CREATE INDEX "product_search_idx" ON "Product" USING GIN (
  to_tsvector('english', "name" || ' ' || "brand" || ' ' || "code" || ' ' || coalesce("description", ''))
);
