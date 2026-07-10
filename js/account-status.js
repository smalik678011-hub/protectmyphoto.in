(function () {
  "use strict";

  var nav = document.querySelector(".top-nav");
  if (!nav) return;

  var accountLink = nav.querySelector('a[href="login.html"]');
  if (!accountLink) {
    accountLink = document.createElement("a");
    accountLink.href = "login.html";
    var contactLink = nav.querySelector('a[href="contact.html"]');
    nav.insertBefore(accountLink, contactLink || null);
  }

  accountLink.classList.add("account-link");
  accountLink.textContent = "Login";

  function shortEmail(email) {
    if (!email) return "Account";
    var name = email.split("@")[0];
    return name.length > 14 ? name.slice(0, 12) + ".." : name;
  }

  async function loadStatus() {
    var configModule;
    try {
      configModule = await import("./firebase-config.js");
    } catch (error) {
      return;
    }

    var config = configModule.firebaseConfig || {};
    if (!config.apiKey || config.apiKey.indexOf("YOUR_") === 0) {
      return;
    }

    try {
      var appModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
      var authModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
      var app = appModule.getApps().length ? appModule.getApp() : appModule.initializeApp(config);
      var auth = authModule.getAuth(app);

      authModule.onAuthStateChanged(auth, function (user) {
        accountLink.classList.toggle("is-signed-in", Boolean(user));
        accountLink.textContent = user ? shortEmail(user.email) : "Login";
        accountLink.title = user ? "Signed in as " + user.email : "Login";
      });
    } catch (error) {
      accountLink.textContent = "Login";
    }
  }

  loadStatus();
})();
