export const toPascalCase = (str: string): string => {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // Insert a space before all caps (except at the start)
    .split(/[\s_-]+/) // Split by non-alphanumeric characters or spaces
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalise each word
    .join("");
};

export const toKebabCase = (str: string): string => {
  return str
    .replace(/[_\s]+/g, "-") // Replace underscores and spaces with dashes
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2") // Insert a dash before uppercase letters (except at the start)
    .toLowerCase();
};
