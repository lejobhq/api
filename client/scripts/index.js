const pages = {
  loading: new Page("loading"),
  landing: new Page("landing"),
  home: new Page("home", [{ uri: "/user" }, { uri: "/jobs" }])
};

const router = createRouter(pages);
router.navigate("loading");
