import debounce from "lodash.debounce";
import { notice, alert } from "@pnotify/core";
import "@pnotify/core/dist/PNotify.css";
import "@pnotify/core/dist/BrightTheme.css";
import fetchCountries from "./fetchCountries.js";

const searchInput = document.querySelector("#country-search-input");
const searchStatus = document.querySelector("#search-status");
const countryList = document.querySelector("#country-list");
const countryDetails = document.querySelector("#country-details");
let latestSearchId = 0;

const clearResults = () => {
  countryList.replaceChildren();
  countryDetails.replaceChildren();
};

const createInfoRow = (label, value) => {
  const row = document.createElement("div");
  row.className = "detail-row";

  const term = document.createElement("dt");
  term.textContent = label;

  const description = document.createElement("dd");
  description.textContent = value;

  row.append(term, description);
  return row;
};

const renderCountryDetails = (country) => {
  const heading = document.createElement("h2");
  heading.className = "country-name";
  heading.textContent = country.name;

  const flag = document.createElement("img");
  flag.className = "country-flag";
  flag.src = country.flag;
  flag.alt = `Прапор країни ${country.name}`;
  flag.loading = "lazy";

  const information = document.createElement("dl");
  information.className = "country-information";
  const capital = country.capital || "Немає даних";
  const population = Number(country.population).toLocaleString("uk-UA");
  const languages = country.languages
    ?.map((language) => language.name)
    .join(", ");

  information.append(
    createInfoRow("Столиця", capital),
    createInfoRow("Населення", population),
    createInfoRow("Мови", languages || "Немає даних"),
  );

  countryDetails.append(heading, flag, information);
};

const renderCountryList = (countries) => {
  const items = countries.map((country) => {
    const item = document.createElement("li");
    item.className = "country-list-item";
    item.textContent = country.name;
    return item;
  });

  countryList.replaceChildren(...items);
};

const searchCountries = debounce(async (query, searchId) => {
  searchStatus.textContent = "Шукаємо країни…";

  try {
    const countries = await fetchCountries(query);

    if (searchId !== latestSearchId) {
      return;
    }

    clearResults();

    if (countries.length === 0) {
      searchStatus.textContent = "Країн за цим запитом не знайдено.";
      return;
    }

    if (countries.length > 10) {
      searchStatus.textContent = "Уточніть пошуковий запит.";
      notice({
        text: "Знайдено більше 10 країн. Зробіть запит більш специфічним.",
        delay: 3000,
      });
      return;
    }

    searchStatus.textContent = "";

    if (countries.length === 1) {
      renderCountryDetails(countries[0]);
      return;
    }

    renderCountryList(countries);
  } catch (error) {
    if (searchId !== latestSearchId) {
      return;
    }

    clearResults();

    if (error.status === 404) {
      searchStatus.textContent = "Країн за цим запитом не знайдено.";
      return;
    }

    if (error.status === 401) {
      searchStatus.textContent = "Перевірте налаштування API-ключа.";
      return;
    }

    searchStatus.textContent = "Не вдалося завантажити дані. Спробуйте ще раз.";
    alert({
      text: "Помилка під час запиту до сервера країн.",
      delay: 3000,
    });
  }
}, 500);

searchInput.addEventListener("input", (event) => {
  latestSearchId += 1;
  clearResults();

  const query = event.currentTarget.value.trim();

  if (!query) {
    searchStatus.textContent = "";
    searchCountries.cancel();
    return;
  }

  searchStatus.textContent = "Очікуємо на завершення введення…";
  searchCountries(query, latestSearchId);
});
