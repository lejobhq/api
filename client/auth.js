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
      router.navigate("home");
    })
    .catch(err => {
      console.error(err);
      router.navigate("landing");
    });
}

function onSignOut() {
  var auth2 = gapi.auth2.getAuthInstance();
  auth2.signOut().then(function() {
    localStorage.removeItem("jwt");
    router.navigate("landing");
    console.log("User signed out.");
  });
}
