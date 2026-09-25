export function categoryLabels(category: string) {
  const labels = category
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !/^(без категорії|без категории)$/iu.test(part))
    // The legacy parent category duplicates the same storefront group as
    // ultrasonic scrubbers. Keep only the customer-facing category.
    .map((part) => categoryKey(part) === "face-care" ? "Ультразвукові скрабери" : part);
  return [...new Set(labels)];
}

export function cleanCategoryLabel(category: string) {
  return categoryLabels(category).join(", ");
}

/**
 * Short storefront names. The source category remains unchanged so that
 * CMS editing, URLs and adapter mappings keep their current stable values.
 */
export function displayCategoryLabel(category: string, locale: "uk" | "ru") {
  return categoryLabels(category).map((label) => {
    if (categoryKey(label) === "thermometers") return locale === "uk" ? "Термометри" : "Термометры";
    if (categoryKey(label) === "face-care") return locale === "uk" ? "Ультразвукові скрабери" : "Ультразвуковые скраберы";
    return label;
  }).join(", ");
}

/** Stable comparison for labels received from different catalog providers. */
export function categoryKey(category: string) {
  const normalized = category
    .trim()
    .toLocaleLowerCase("uk-UA")
    .replace(/[’'`]/g, "")
    .replace(/\s+/g, " ");
  const aliases: Record<string, string> = {
    "термометри": "thermometers", "термометры": "thermometers", "термометри для вимірювання температури тіла": "thermometers", "термометры для измерения температуры тела": "thermometers",
    "аспіратори": "aspirators", "аспираторы": "aspirators",
    "небулайзери": "nebulizers", "небулайзеры": "nebulizers", "небулайзери (інгалятори)": "nebulizers", "небулайзеры (ингаляторы)": "nebulizers",
    "фотоепілятори": "epilators", "фотоэпиляторы": "epilators",
    "апарати для чищення обличчя": "face-care", "аппараты для чистки лица": "face-care", "ультразвукові скрабери": "face-care", "ультразвуковые скраберы": "face-care",
    "пульсоксиметри": "oximeters", "пульсоксиметры": "oximeters",
    "товари для новонароджених": "newborn", "товары для новорожденных": "newborn",
    "фетальні доплери": "fetal", "фетальні доплери і монітори": "fetal", "фетальні доплери та монітори": "fetal", "фетальные допплеры": "fetal", "фетальные допплеры и мониторы": "fetal",
    "молоковідсмоктувачі": "pumps", "молокоотсосы": "pumps",
  };
  return aliases[normalized] ?? normalized;
}
