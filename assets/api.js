/* Data layer. Talks GraphQL to Shopify's Storefront API when a token is set,
   otherwise pulls from a fake products API and reshapes it to the same format. */
(function (w) {
  const CFG = w.TIDEPOOL || {};
  const FAKE_API = 'https://fakestoreapi.com/products';
  const API_VERSION = '2024-10';

  const PRODUCTS_QUERY = `
    query Products($first: Int!) {
      products(first: $first) {
        edges { node {
          id title handle description productType
          priceRange { minVariantPrice { amount } }
          featuredImage { url }
          variants(first: 1) { edges { node { id } } }
        } }
      }
    }`;

  async function gql(query, variables, signal) {
    const res = await fetch(`https://${CFG.domain}/api/${API_VERSION}/graphql.json`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': CFG.token
      },
      body: JSON.stringify({ query, variables })
    });
    if (!res.ok) throw new Error('Storefront API said ' + res.status);
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
  }

  const fromShopify = ({ node: n }) => ({
    id: n.id,
    handle: n.handle,
    title: n.title,
    desc: n.description,
    category: n.productType || 'Other',
    price: parseFloat(n.priceRange.minVariantPrice.amount),
    image: n.featuredImage && n.featuredImage.url,
    variantId: n.variants.edges[0] && n.variants.edges[0].node.id,
    rating: null
  });

  const nice = { "men's clothing": 'Menswear', "women's clothing": 'Womenswear', jewelery: 'Jewellery', electronics: 'Gadgets' };

  const fromFake = (p) => ({
    id: 'fake-' + p.id,
    handle: '#' + p.id,
    title: p.title.length > 58 ? p.title.slice(0, 55).trim() + '...' : p.title,
    desc: p.description,
    category: nice[p.category] || p.category,
    price: p.price,
    image: p.image,
    variantId: 'fake-' + p.id,
    rating: p.rating ? p.rating.rate : null
  });

  async function getProducts(limit = 20, signal) {
    if (CFG.domain && CFG.token) {
      try {
        const data = await gql(PRODUCTS_QUERY, { first: limit }, signal);
        return data.products.edges.map(fromShopify);
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        console.warn('GraphQL failed, using fake API instead.', err);
      }
    }
    const res = await fetch(`${FAKE_API}?limit=${limit}`, { signal });
    if (!res.ok) throw new Error('Could not load products (' + res.status + ')');
    return (await res.json()).map(fromFake);
  }

  w.TidepoolAPI = { getProducts, gql };
})(window);
