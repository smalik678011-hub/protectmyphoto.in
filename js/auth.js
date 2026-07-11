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
  var debugBox = document.querySelector("[data-auth-debug]");
  var debugList = document.querySelector("[data-auth-debug-list]");
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
  var googleSignInStarted = false;
  var debugSteps = [];

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

  function updateDebug() {
    if (!debugBox || !debugList) return;
    debugBox.hidden = debugSteps.length === 0;
    debugList.innerHTML = "";
    debugSteps.slice(-8).forEach(function (step) {
      var item = document.createElement("li");
      item.textContent = step;
      debugList.appendChild(item);
    });
  }

  function rememberDebug(step) {
    var timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    var message = timestamp + " - " + step;
    debugSteps.push(message);
    updateDebug();
    try {
      localStorage.setItem("pmp:lastAuthDebug", debugSteps.slice(-8).join("\n"));
    } catch (error) {
      // Ignore storage failures in private browsing modes.
    }
  }

  function restoreDebug() {
    try {
      var previous = localStorage.getItem("pmp:lastAuthDebug");
      if (previous) {
        debugSteps = previous.split("\n").filter(Boolean).slice(-8);
        updateDebug();
      }
    } catch (error) {
      // Ignore storage failures in private browsing modes.
    }
  }

  function cleanError(error) {
    var message = error && error.message ? error.message : "Something went wrong.";
    return message.replace("Firebase: ", "").replace(/\s*\(auth\/[^)]+\)\.?$/, ".");
  }

  function errorCode(error) {
    return error && error.code ? error.code : "no-code";
  }

  function errorSummary(error) {
    return errorCode(error) + ": " + cleanError(error);
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
      rememberDebug("No signed-in user found yet.");
      if (userPanel) userPanel.hidden = true;
      form.hidden = false;
      if (authTabs) authTabs.hidden = false;
      return;
    }
    rememberDebug("Signed in user found: " + (user.email || "Google account"));
    try {
      localStorage.setItem("pmp:lastSignedInEmail", user.email || "Signed in");
      localStorage.removeItem("pmp:googleRedirectStarted");
    } catch (error) {
      // Ignore storage failures in private browsing modes.
    }
    if (userEmail) userEmail.textContent = user.email || "Signed in";
    if (userPanel) userPanel.hidden = false;
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
      rememberDebug("Loading Firebase config.");
      configModule = await import("./firebase-config.js");
    } catch (error) {
      rememberDebug("Firebase config failed: " + errorSummary(error));
      setStatus("Firebase is not connected yet. Create js/firebase-config.js from the example file after you make a Firebase project.", "error");
      throw error;
    }

    var config = configModule.firebaseConfig || {};
    if (!config.apiKey || config.apiKey.indexOf("YOUR_") === 0) {
      rememberDebug("Firebase config is empty.");
      setStatus("Firebase config is still empty. Add your Firebase web app values in js/firebase-config.js.", "error");
      throw new Error("Missing Firebase config");
    }

    rememberDebug("Loading Firebase Auth modules.");
    var appModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    var authSdk = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
    var app = appModule.getApps().length ? appModule.getApp() : appModule.initializeApp(config);
    var auth = authSdk.getAuth(app);
    await authSdk.setPersistence(auth, authSdk.browserLocalPersistence);
    authSdk.useDeviceLanguage(auth);
    var googleProvider = new authSdk.GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });
    rememberDebug("Firebase Auth ready for " + (config.authDomain || "configured domain") + ".");

    return {
      auth: auth,
      googleProvider: googleProvider,
      authModule: {
        onAuthStateChanged: function (authInstance, callback) {
          return authSdk.onAuthStateChanged(authInstance, callback);
        },
        getRedirectResult: function (authInstance) {
          return authSdk.getRedirectResult(authInstance);
        },
        signInWithPopup: function (authInstance, provider) {
          return authSdk.signInWithPopup(authInstance, provider);
        },
        signInWithRedirect: function (authInstance, provider) {
          return authSdk.signInWithRedirect(authInstance, provider);
        },
        signOut: function (authInstance) {
          return authSdk.signOut(authInstance);
        },
        createUserWithEmailAndPassword: function (authInstance, email, password) {
          return authSdk.createUserWithEmailAndPassword(authInstance, email, password);
        },
        signInWithEmailAndPassword: function (authInstance, email, password) {
          return authSdk.signInWithEmailAndPassword(authInstance, email, password);
        },
        updateProfile: function (user, profile) {
          return authSdk.updateProfile(user, profile);
        },
        sendEmailVerification: function (user) {
          return authSdk.sendEmailVerification(user);
        },
        sendPasswordResetEmail: function (authInstance, email) {
          return authSdk.sendPasswordResetEmail(authInstance, email);
        }
      }
    };
  }

  restoreDebug();
  rememberDebug("Login page script loaded.");

  var firebaseReady = loadFirebase().then(function (firebase) {
    activeFirebase = firebase;
    if (googleButton) {
      googleButton.disabled = false;
      googleButton.dataset.loading = "false";
    }
    rememberDebug("Listening for login state.");
    firebase.authModule.onAuthStateChanged(firebase.auth, function (user) {
      rememberDebug(user ? "Auth state returned signed-in user." : "Auth state returned signed-out.");
      showSignedIn(user);
    });
    rememberDebug("Checking Google redirect result.");
    firebase.authModule.getRedirectResult(firebase.auth).then(function (result) {
      if (result && result.user) {
        rememberDebug("Redirect result has user.");
        showSignedIn(result.user);
        setStatus("Signed in with Google.", "success");
      } else {
        rememberDebug("Redirect result is empty.");
      }
    }).catch(function (error) {
      rememberDebug("Redirect result error: " + errorCode(error));
      setStatus(cleanError(error), "error");
    });
    window.setTimeout(function () {
      if (firebase.auth.currentUser) {
        rememberDebug("Current user found after wait.");
        showSignedIn(firebase.auth.currentUser);
        return;
      }
      var redirectStarted = false;
      try {
        redirectStarted = localStorage.getItem("pmp:googleRedirectStarted") === "1";
      } catch (error) {
        redirectStarted = false;
      }
      if (redirectStarted) {
        rememberDebug("Redirect returned without saved session.");
        setStatus("Google sign in returned, but the browser did not keep the Firebase session. I am switching Google login to popup mode for this Hostinger site.", "error");
      }
    }, 1800);
    return firebase;
  }).catch(function (error) {
    if (googleButton) {
      googleButton.disabled = false;
      googleButton.dataset.loading = "false";
    }
    rememberDebug("Firebase load failed: " + errorSummary(error));
    setStatus("Firebase load failed: " + cleanError(error), "error");
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

  async function startGoogleSignIn(event) {
    if (event) event.preventDefault();
    if (googleSignInStarted) return;
    rememberDebug("Google button tapped.");

    if (isFilePreview()) {
      rememberDebug("Blocked because page is file preview.");
      setStatus("Google sign in cannot run from a file URL. Start the preview server and open " + previewLoginUrl() + ".", "error");
      return;
    }

    googleSignInStarted = true;
    googleButton.disabled = true;
    googleButton.dataset.loading = "true";
    setStatus("Starting Google sign in...", "info");

    var firebase = activeFirebase;
    if (!firebase) {
      rememberDebug("Google sign in stopped because Firebase is not ready yet.");
      setStatus("Google sign in is still loading. Wait 2 seconds, then tap Continue with Google again.", "error");
      googleSignInStarted = false;
      googleButton.disabled = false;
      googleButton.dataset.loading = "false";
      return;
    }

    try {
      localStorage.setItem("pmp:googleRedirectStarted", "1");
      rememberDebug("Google sign-in marker saved.");
    } catch (storageError) {
      rememberDebug("Storage marker could not be saved.");
      // Continue even if localStorage is unavailable.
    }

    try {
      setStatus("Opening Google sign in...", "info");
      rememberDebug("Starting Google popup.");
      var credential = await firebase.authModule.signInWithPopup(firebase.auth, firebase.googleProvider);
      try {
        localStorage.removeItem("pmp:googleRedirectStarted");
      } catch (storageError) {
        // Ignore storage failures.
      }
      if (credential && credential.user) {
        showSignedIn(credential.user);
        setStatus("Signed in with Google.", "success");
      } else if (firebase.auth.currentUser) {
        showSignedIn(firebase.auth.currentUser);
      } else {
        setStatus("Google sign in finished, but no account was returned. Please try once more.", "error");
      }
    } catch (error) {
      rememberDebug("Google popup error: " + errorCode(error));
      try {
        localStorage.removeItem("pmp:googleRedirectStarted");
      } catch (storageError) {
        // Ignore storage failures.
      }
      if (error && (error.code === "auth/popup-blocked" || error.code === "auth/popup-closed-by-user")) {
        setStatus("Google popup was blocked or closed. Please allow popups for ProtectMyPhoto and try again.", "error");
      } else {
        setStatus(cleanError(error), "error");
      }
      googleSignInStarted = false;
      googleButton.disabled = false;
      googleButton.dataset.loading = "false";
    }
  }

  googleButton.disabled = true;
  googleButton.dataset.loading = "true";
  googleButton.addEventListener("click", startGoogleSignIn);
  googleButton.addEventListener("touchend", startGoogleSignIn, { passive: false });

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

  googleSwitchButton.addEventListener("click", async function (event) {
    if (isFilePreview()) {
      setStatus("Google sign in cannot run from a file URL. Start the preview server and open " + previewLoginUrl() + ".", "error");
      return;
    }

    var firebase = await firebaseReady;
    if (firebase) {
      await firebase.authModule.signOut(firebase.auth);
      try {
        localStorage.removeItem("pmp:googleRedirectStarted");
      } catch (storageError) {
        // Ignore storage failures.
      }
      await startGoogleSignIn(event);
      return;
    }
    setMode("signin");
  });

  setMode("signin");
})();
