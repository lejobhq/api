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
    .then(console.log) // TODO
    .catch(console.error);
}

function onSignOut() {
  var auth2 = gapi.auth2.getAuthInstance();
  auth2.signOut().then(function() {
    // TODO
    console.log("User signed out.");
  });
}
