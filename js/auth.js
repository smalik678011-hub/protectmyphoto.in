(function () {
  "use strict";

  var form = document.querySelector("[data-auth-form]");
  var statusBox = document.querySelector("[data-auth-status]");
  var emailInput = document.querySelector("[data-auth-email]");
  var passwordInput = document.querySelector("[data-auth-password]");
  var nameInput = document.querySelector("[data-auth-name]");
  var modeInput = document.querySelector("[data-auth-mode]");
  var actionButton = document.querySelector("[data-auth-action]");
  var resetButton = document.querySelector("[data-auth-reset]");
  var logoutButton = document.querySelector("[data-auth-logout]");
  var switchButtons = Array.prototype.slice.call(document.querySelectorAll("[data-auth-switch]"));
  var googleSwitchButton = document.querySelector("[data-auth-google-switch]");
  var googleButton = document.querySelector("[data-google-login]");
  var authTabs = document.querySelector("[data-auth-tabs]");
  var continueAfterLogin = new URLSearchParams(window.location.search).get("continue");
  var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-auth-tab]"));
  var userPanel = document.querySelector("[data-user-panel]");
  var userEmail = document.querySelector("[data-user-email]");
  var activeFirebase = null;
  var activeUser = null;

  if (!form) return;

  function isFilePreview() {
    return window.location.protocol === "file:";
  }

  function previewLoginUrl() {
    return "http://localhost:4200/login.html";
  }

  var blockedDomains = [
    "10minutemail.com",
    "guerrillamail.com",
    "mailinator.com",
    "tempmail.com",
    "temp-mail.org",
    "yopmail.com",
    "throwawaymail.com",
    "getnada.com",
    "sharklasers.com",
    "trashmail.com"
  ];

  function setStatus(message, type) {
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.dataset.state = type || "info";
    statusBox.hidden = false;
  }

  function cleanError(error) {
    var message = error && error.message ? error.message : "Something went wrong.";
    return message.replace("Firebase: ", "").replace(/\s*\(auth\/[^)]+\)\.?$/, ".");
  }

  function getEmailDomain(email) {
    return String(email || "").trim().toLowerCase().split("@").pop();
  }

  function isDisposableEmail(email) {
    var domain = getEmailDomain(email);
    return blockedDomains.some(function (blocked) {
      return domain === blocked || domain.endsWith("." + blocked);
    });
  }

  function setMode(mode) {
    form.hidden = false;
    userPanel.hidden = true;
    if (authTabs) authTabs.hidden = false;
    modeInput.value = mode;
    tabs.forEach(function (tab) {
      tab.classList.toggle("is-active", tab.dataset.authTab === mode);
    });
    var isSignup = mode === "signup";
    nameInput.hidden = !isSignup;
    nameInput.parentElement.hidden = !isSignup;
    actionButton.textContent = isSignup ? "Create account" : "Continue";
    if (isFilePreview()) {
      setStatus("Google login needs the local preview server. Open " + previewLoginUrl() + " instead of the file URL.", "error");
      return;
    }
    setStatus(isSignup ? "Create an account with a real email address. Temporary emails are blocked." : "Sign in to manage account preferences. Tools still work without login.", "info");
  }

  function validate(mode) {
    var email = emailInput.value.trim();
    var password = passwordInput.value;
    if (!email || !email.includes("@")) {
      setStatus("Please enter a valid email address.", "error");
      return false;
    }
    if (mode === "signup" && isDisposableEmail(email)) {
      setStatus("Temporary or disposable email addresses are not allowed.", "error");
      return false;
    }
    if (!password || password.length < 8) {
      setStatus("Password must be at least 8 characters.", "error");
      return false;
    }
    return true;
  }

  function showSignedIn(user) {
    activeUser = user || null;
    if (!user) {
      userPanel.hidden = true;
      form.hidden = false;
      if (authTabs) authTabs.hidden = false;
      return;
    }
    userEmail.textContent = user.email || "Signed in";
    userPanel.hidden = false;
    form.hidden = true;
    if (authTabs) authTabs.hidden = false;
    setStatus("You are signed in. Image tools continue to process files in your browser.", "success");
    if (continueAfterLogin) {
      window.location.href = continueAfterLogin;
    }
  }

  async function loadFirebase() {
    var configModule;
    try {
      configModule = await import("./firebase-config.js");
    } catch (error) {
      setStatus("Firebase is not connected yet. Create js/firebase-config.js from the example file after you make a Firebase project.", "error");
      throw error;
    }

    var config = configModule.firebaseConfig || {};
    if (!config.apiKey || config.apiKey.indexOf("YOUR_") === 0) {
      setStatus("Firebase config is still empty. Add your Firebase web app values in js/firebase-config.js.", "error");
      throw new Error("Missing Firebase config");
    }

    var appModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    var authModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
    var app = appModule.getApps().length ? appModule.getApp() : appModule.initializeApp(config);
    return {
      auth: authModule.getAuth(app),
      googleProvider: new authModule.GoogleAuthProvider(),
      authModule: authModule
    };
  }

  var firebaseReady = loadFirebase().then(function (firebase) {
    activeFirebase = firebase;
    firebase.authModule.onAuthStateChanged(firebase.auth, showSignedIn);
    return firebase;
  }).catch(function (error) {
    setStatus(cleanError(error) + " Check Firebase config and internet connection.", "error");
    return null;
  });

  tabs.forEach(function (tab) {
    tab.addEventListener("click", async function () {
      if (activeUser && activeFirebase) {
        await activeFirebase.authModule.signOut(activeFirebase.auth);
      }
      setMode(tab.dataset.authTab);
    });
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (isFilePreview()) {
      setStatus("Login cannot run from a file URL. Start the preview server and open " + previewLoginUrl() + ".", "error");
      return;
    }
    var mode = modeInput.value;
    if (!validate(mode)) return;

    var firebase = await firebaseReady;
    if (!firebase) {
      setStatus("Firebase is not ready yet. Refresh the page and check your connection.", "error");
      return;
    }

    actionButton.disabled = true;
    setStatus("Working...", "info");

    try {
      if (mode === "signup") {
        var credential = await firebase.authModule.createUserWithEmailAndPassword(firebase.auth, emailInput.value.trim(), passwordInput.value);
        if (nameInput.value.trim()) {
          await firebase.authModule.updateProfile(credential.user, { displayName: nameInput.value.trim() });
        }
        await firebase.authModule.sendEmailVerification(credential.user);
        setStatus("Account created. Please check your inbox to verify your email.", "success");
      } else {
        await firebase.authModule.signInWithEmailAndPassword(firebase.auth, emailInput.value.trim(), passwordInput.value);
        setStatus("Signed in successfully.", "success");
      }
    } catch (error) {
      setStatus(error.message.replace("Firebase: ", ""), "error");
    } finally {
      actionButton.disabled = false;
    }
  });

  googleButton.addEventListener("click", async function () {
    if (isFilePreview()) {
      setStatus("Google sign in cannot run from a file URL. Start the preview server and open " + previewLoginUrl() + ".", "error");
      return;
    }

    var firebase = await firebaseReady;
    if (!firebase) {
      setStatus("Google sign in is not ready. Firebase did not load correctly.", "error");
      return;
    }

    googleButton.disabled = true;
    googleButton.dataset.loading = "true";
    setStatus("Opening Google sign in...", "info");

    try {
      await firebase.authModule.signInWithPopup(firebase.auth, firebase.googleProvider);
      setStatus("Signed in with Google.", "success");
    } catch (error) {
      if (error.code === "auth/popup-blocked" || error.code === "auth/popup-closed-by-user") {
        try {
          setStatus("Popup did not complete. Redirecting to Google sign in...", "info");
          await firebase.authModule.signInWithRedirect(firebase.auth, firebase.googleProvider);
          return;
        } catch (redirectError) {
          setStatus(cleanError(redirectError), "error");
        }
      } else {
        setStatus(cleanError(error), "error");
      }
    } finally {
      googleButton.disabled = false;
      googleButton.dataset.loading = "false";
    }
  });

  resetButton.addEventListener("click", async function () {
    if (isFilePreview()) {
      setStatus("Password reset cannot run from a file URL. Start the preview server and open " + previewLoginUrl() + ".", "error");
      return;
    }

    var email = emailInput.value.trim();
    if (!email || !email.includes("@")) {
      setStatus("Enter your email first, then request a reset link.", "error");
      return;
    }
    var firebase = await firebaseReady;
    if (!firebase) {
      setStatus("Firebase is not ready yet. Refresh the page and check your connection.", "error");
      return;
    }
    try {
      await firebase.authModule.sendPasswordResetEmail(firebase.auth, email);
      setStatus("Password reset link sent if this email exists.", "success");
    } catch (error) {
      setStatus(cleanError(error), "error");
    }
  });

  logoutButton.addEventListener("click", async function () {
    var firebase = await firebaseReady;
    if (!firebase) {
      setStatus("Firebase is not ready yet. Refresh the page and check your connection.", "error");
      return;
    }
    await firebase.authModule.signOut(firebase.auth);
    setMode("signin");
    setStatus("Signed out.", "info");
  });

  switchButtons.forEach(function (button) {
    button.addEventListener("click", async function () {
      var firebase = await firebaseReady;
      if (firebase) {
        await firebase.authModule.signOut(firebase.auth);
      }
      emailInput.value = "";
      passwordInput.value = "";
      setMode(button.dataset.authSwitch || "signin");
      setStatus(button.dataset.authSwitch === "signup" ? "Create a new account with a real email address." : "Sign in with email or Google.", "info");
    });
  });

  googleSwitchButton.addEventListener("click", async function () {
    if (isFilePreview()) {
      setStatus("Google sign in cannot run from a file URL. Start the preview server and open " + previewLoginUrl() + ".", "error");
      return;
    }

    var firebase = await firebaseReady;
    if (firebase) {
      await firebase.authModule.signOut(firebase.auth);
      try {
        await firebase.authModule.signInWithPopup(firebase.auth, firebase.googleProvider);
        setStatus("Signed in with Google.", "success");
        return;
      } catch (error) {
        setStatus(cleanError(error), "error");
      }
    }
    setMode("signin");
  });

  setMode("signin");
})();
