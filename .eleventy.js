module.exports = function (eleventyConfig) {
  eleventyConfig.addFilter("slug", (str) => {
    return String(str)
      .toLowerCase()
      .trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  });
};
