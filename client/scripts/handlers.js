function onSignIn(googleUser) {
  var id_token = googleUser.getAuthResponse().id_token;

  fetch("/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ token: id_token })
  })
    .then(res => res.json())
    .then(({ jwt }) => {
      localStorage.setItem("jwt", jwt);
      document.querySelector(".signout").classList.remove("hidden");
      router.navigate("home");
    })
    .catch(err => {
      console.error(err);
      router.navigate("landing");
      document.querySelector(".signout").classList.add("hidden");
    });
}

function onSignOut() {
  var auth2 = gapi.auth2.getAuthInstance();
  router.navigate("loading");
  auth2.signOut().then(function() {
    localStorage.removeItem("jwt");
    router.navigate("landing");
    document.querySelector(".signout").classList.add("hidden");
    console.log("User signed out.");
  });
}

function onAddNewJob() {
  const url = document.querySelector(`input[name=new-job]`).value;
  if (!url) {
    return;
  }
  document.querySelector(`input[name=new-job]`).value = "";

  fetch("/api/job", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Access-Token": localStorage.getItem("jwt")
    },
    body: JSON.stringify({ url })
  })
    .then(res => res.json())
    .then(() => router.navigate("home"))
    .catch(console.error);
}
