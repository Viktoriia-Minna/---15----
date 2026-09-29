const API_URL = "https://api.restcountries.com/countries/v5/name";

export default async function fetchCountries(searchQuery) {
  const normalizedQuery = searchQuery.trim();

  if (!normalizedQuery) {
    return [];
  }

  const apiKey = process.env.REST_COUNTRIES_API_KEY;

  if (!apiKey) {
    const error = new Error("Rest Countries API key is not configured.");
    error.status = 401;
    throw error;
  }

  const parameters = new URLSearchParams({
    q: normalizedQuery,
    limit: "15",
    response_fields: "names.common,capitals,population,languages,flag.url_png",
  });
  const response = await fetch(`${API_URL}?${parameters}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const payload = await response.json();

  if (!response.ok || payload.errors?.length) {
    const error = new Error(
      payload.errors?.[0]?.message ||
        `Country request failed: ${response.status}`,
    );
    error.status = response.status;
    throw error;
  }

  if (!Array.isArray(payload.data?.objects)) {
    const error = new Error("Unexpected response from Rest Countries API.");
    error.status = response.status;
    throw error;
  }

  return payload.data.objects.map((country) => ({
    name: country.names?.common || country.names?.official || "Unknown country",
    capital:
      country.capitals?.find((capital) => capital.attributes?.primary)?.name ||
      country.capitals?.[0]?.name ||
      "",
    population: country.population,
    languages: country.languages || [],
    flag: country.flag?.url_png || "",
  }));
}
