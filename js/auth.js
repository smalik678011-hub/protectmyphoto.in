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
  var authStateChecked = false;
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

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        if (existing.dataset.loaded === "true" || existing.readyState === "complete") {
          resolve();
          return;
        }
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = function () {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = function () {
        reject(new Error("Could not load Firebase script: " + src));
      };
      document.head.appendChild(script);
    });
  }

  async function loadFirebase() {
    var configModule;
    try {
      rememberDebug("Loading Firebase config.");
      configModule = await import("./firebase-config.js");
    } catch (error) {
      rememberDebug("Firebase config failed: " + errorCode(error));
      setStatus("Firebase is not connected yet. Create js/firebase-config.js from the example file after you make a Firebase project.", "error");
      throw error;
    }

    var config = configModule.firebaseConfig || {};
    if (!config.apiKey || config.apiKey.indexOf("YOUR_") === 0) {
      rememberDebug("Firebase config is empty.");
      setStatus("Firebase config is still empty. Add your Firebase web app values in js/firebase-config.js.", "error");
      throw new Error("Missing Firebase config");
    }

    rememberDebug("Loading Firebase Auth scripts.");
    await loadScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
    await loadScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js");

    if (!window.firebase || !window.firebase.apps || !window.firebase.auth) {
      rememberDebug("Firebase Auth unavailable after script load.");
      throw new Error("Firebase scripts loaded, but Firebase Auth is unavailable.");
    }

    var app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(config);
    var auth = window.firebase.auth(app);
    await auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);
    auth.useDeviceLanguage();
    var googleProvider = new window.firebase.auth.GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });
    rememberDebug("Firebase Auth ready for " + (config.authDomain || "configured domain") + ".");

    return {
      auth: auth,
      googleProvider: googleProvider,
      authModule: {
        onAuthStateChanged: function (authInstance, callback) {
          return authInstance.onAuthStateChanged(callback);
        },
        getRedirectResult: function (authInstance) {
          return authInstance.getRedirectResult();
        },
        signInWithPopup: function (authInstance, provider) {
          return authInstance.signInWithPopup(provider);
        },
        signInWithRedirect: function (authInstance, provider) {
          return authInstance.signInWithRedirect(provider);
        },
        signOut: function (authInstance) {
          return authInstance.signOut();
        },
        createUserWithEmailAndPassword: function (authInstance, email, password) {
          return authInstance.createUserWithEmailAndPassword(email, password);
        },
        signInWithEmailAndPassword: function (authInstance, email, password) {
          return authInstance.signInWithEmailAndPassword(email, password);
        },
        updateProfile: function (user, profile) {
          return user.updateProfile(profile);
        },
        sendEmailVerification: function (user) {
          return user.sendEmailVerification();
        },
        sendPasswordResetEmail: function (authInstance, email) {
          return authInstance.sendPasswordResetEmail(email);
        }
      }
    };
  }

  restoreDebug();
  rememberDebug("Login page script loaded.");

  var firebaseReady = loadFirebase().then(function (firebase) {
    activeFirebase = firebase;
    rememberDebug("Listening for login state.");
    firebase.authModule.onAuthStateChanged(firebase.auth, function (user) {
      authStateChecked = true;
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
      if (redirectStarted && authStateChecked) {
        rememberDebug("Redirect returned without saved session.");
        setStatus("Google sign in returned, but the browser did not keep the Firebase session. Try once in Chrome with cookies/site data enabled.", "error");
      }
    }, 1800);
    return firebase;
  }).catch(function (error) {
    rememberDebug("Firebase load failed: " + errorCode(error));
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

    var firebase = await firebaseReady;
    if (!firebase) {
      rememberDebug("Google sign in stopped because Firebase is not ready.");
      setStatus("Google sign in is not ready. Firebase did not load correctly.", "error");
      googleSignInStarted = false;
      googleButton.disabled = false;
      googleButton.dataset.loading = "false";
      return;
    }

    try {
      localStorage.setItem("pmp:googleRedirectStarted", "1");
      rememberDebug("Google redirect marker saved.");
    } catch (storageError) {
      rememberDebug("Storage marker could not be saved.");
      // Continue even if localStorage is unavailable.
    }

    try {
      setStatus("Opening Google sign in...", "info");
      rememberDebug("Starting Google redirect.");
      await firebase.authModule.signInWithRedirect(firebase.auth, firebase.googleProvider);
    } catch (error) {
      rememberDebug("Google redirect error: " + errorCode(error));
      try {
        localStorage.removeItem("pmp:googleRedirectStarted");
      } catch (storageError) {
        // Ignore storage failures.
      }
      setStatus(cleanError(error), "error");
      googleSignInStarted = false;
      googleButton.disabled = false;
      googleButton.dataset.loading = "false";
    }
  }

  googleButton.disabled = false;
  googleButton.dataset.loading = "false";
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
