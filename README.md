# Tidepool Supply: a Shopify theme

Everyday goods store. Shopify Liquid theme with a React storefront and a GraphQL data layer.

## What's in here

| Tech | Where |
|---|---|
| Liquid | `layout/`, `sections/`, `snippets/`, `templates/` |
| React | `assets/shop-react.js` (no build step, UMD React from cdnjs) |
| GraphQL | `assets/api.js` (Storefront API query, falls back to a fake API) |
| Async JS | `assets/api.js`, `assets/theme.js` (fetch, async/await, AbortController) |
| DOM manipulation | `assets/theme.js` (drawer, header, hero stack, AJAX add-to-cart) |
| CSS | `assets/theme.css` (custom properties, grid, no framework) |
| Git | this repo, see `git log` |

## Run it

**Quick look (no Shopify needed):** open `preview/index.html` in a browser.

**On Shopify:**
```
shopify theme dev --store your-store.myshopify.com
```
Then in Theme settings fill in the Storefront API token. Leave it blank to use the fake products API (fakestoreapi.com).
