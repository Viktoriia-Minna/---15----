import assert from "node:assert/strict";
import test from "node:test";
import fetchCountries from "../fetchCountries.js";

function setApiKey(value = "test-api-key") {
  const originalApiKey = process.env.REST_COUNTRIES_API_KEY;

  if (value === null) {
    delete process.env.REST_COUNTRIES_API_KEY;
  } else {
    process.env.REST_COUNTRIES_API_KEY = value;
  }

  return () => {
    if (originalApiKey === undefined) {
      delete process.env.REST_COUNTRIES_API_KEY;
    } else {
      process.env.REST_COUNTRIES_API_KEY = originalApiKey;
    }
  };
}

test("fetchCountries maps the v5 response to country records", async () => {
  const originalFetch = globalThis.fetch;
  const restoreApiKey = setApiKey();
  const country = {
    names: { common: "New Zealand" },
    capitals: [{ name: "Wellington", attributes: { primary: true } }],
    population: 5122600,
    languages: [{ name: "English" }],
    flag: { url_png: "https://flags.restcountries.com/v5/w640/nz.png" },
  };
  let requestedUrl;
  let requestedHeaders;

  globalThis.fetch = async (url, options) => {
    requestedUrl = url;
    requestedHeaders = options.headers;
    return new Response(JSON.stringify({ data: { objects: [country] } }), {
      status: 200,
    });
  };

  try {
    assert.deepEqual(await fetchCountries("New Zealand"), [
      {
        name: "New Zealand",
        capital: "Wellington",
        population: 5122600,
        languages: [{ name: "English" }],
        flag: "https://flags.restcountries.com/v5/w640/nz.png",
      },
    ]);
    const url = new URL(requestedUrl);
    assert.equal(
      url.origin + url.pathname,
      "https://api.restcountries.com/countries/v5/name",
    );
    assert.equal(url.searchParams.get("q"), "New Zealand");
    assert.equal(url.searchParams.get("limit"), "15");
    assert.equal(
      url.searchParams.get("response_fields"),
      "names.common,capitals,population,languages,flag.url_png",
    );
    assert.equal(requestedHeaders.Authorization, "Bearer test-api-key");
  } finally {
    globalThis.fetch = originalFetch;
    restoreApiKey();
  }
});

test("fetchCountries rejects unsuccessful API responses with their status", async () => {
  const originalFetch = globalThis.fetch;
  const restoreApiKey = setApiKey();
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ errors: [{ message: "Not found" }] }), {
      status: 404,
    });

  try {
    await assert.rejects(fetchCountries("Unknownland"), { status: 404 });
  } finally {
    globalThis.fetch = originalFetch;
    restoreApiKey();
  }
});

test("fetchCountries rejects API error payloads returned with status 200", async () => {
  const originalFetch = globalThis.fetch;
  const restoreApiKey = setApiKey();
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        errors: [{ message: "Invalid API key." }],
      }),
      { status: 200 },
    );

  try {
    await assert.rejects(fetchCountries("Ukraine"), {
      message: "Invalid API key.",
    });
  } finally {
    globalThis.fetch = originalFetch;
    restoreApiKey();
  }
});

test("fetchCountries does not request an empty query", async () => {
  const originalFetch = globalThis.fetch;
  const restoreApiKey = setApiKey();
  globalThis.fetch = () => {
    throw new Error("fetch should not be called");
  };

  try {
    assert.deepEqual(await fetchCountries("  "), []);
  } finally {
    globalThis.fetch = originalFetch;
    restoreApiKey();
  }
});

test("fetchCountries requires an API key", async () => {
  const originalFetch = globalThis.fetch;
  const restoreApiKey = setApiKey(null);
  globalThis.fetch = () => {
    throw new Error("fetch should not be called");
  };

  try {
    await assert.rejects(fetchCountries("Ukraine"), { status: 401 });
  } finally {
    globalThis.fetch = originalFetch;
    restoreApiKey();
  }
});
