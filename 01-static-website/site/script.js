// A tiny bit of JavaScript, so we know JS files are served too.
const button = document.getElementById("theme-button");

button.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

console.log("script.js loaded");
