const pages = {
  loading: new Page("loading"),
  landing: new Page("landing"),
  home: new Page("home", [{ uri: "/user" }, { uri: "/jobs" }])
};

const router = createRouter(pages);
router.navigate("loading");
setTimeout(() => {
  const route = router.getRoute();
  if (route === "loading" && !localStorage.getItem("jwt")) {
    router.navigate("landing");
    document.querySelector(".signout").classList.add("hidden");
  }
}, 2700);
