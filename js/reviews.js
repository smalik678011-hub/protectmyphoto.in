(async function () {
  "use strict";

  var root = document.querySelector("[data-reviews-page]");
  if (!root) return;

  var form = document.querySelector("[data-review-form]");
  var ratingInput = document.querySelector("[data-review-rating]");
  var ratingButtons = Array.prototype.slice.call(document.querySelectorAll("[data-rating-value]"));
  var nameInput = document.querySelector("[data-review-name]");
  var textInput = document.querySelector("[data-review-text]");
  var countdown = document.querySelector("[data-review-countdown]");
  var submitButton = document.querySelector("[data-review-submit]");
  var statusBox = document.querySelector("[data-review-status]");
  var statusText = statusBox ? statusBox.querySelector("p") : null;
  var authNote = document.querySelector("[data-review-auth-note]");
  var list = document.querySelector("[data-reviews-list]");
  var empty = document.querySelector("[data-review-empty]");
  var moreButton = document.querySelector("[data-review-more]");
  var averageText = document.querySelector("[data-review-average]");
  var countText = document.querySelector("[data-review-count]");
  var liveBadge = document.querySelector("[data-review-live]");
  var schemaNode = document.querySelector("[data-review-schema]");

  var activeUser = null;
  var authClient = null;
  var db = null;
  var firestore = null;
  var firebaseConfig = null;
  var lastVisible = null;
  var pageSize = 6;
  var visibleReviewCount = pageSize;
  var allApprovedReviews = [];
  var loadedReviews = [];
  var blockedWords = ["scam", "fraud", "fake", "abuse", "hate", "idiot", "stupid"];

  function setStatus(message, type) {
    if (!statusBox || !statusText) return;
    statusBox.hidden = false;
    statusBox.classList.toggle("is-success", type === "success");
    statusBox.classList.toggle("is-error", type === "error");
    statusText.textContent = message;
  }

  function cleanText(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function getClientId() {
    try {
      var key = "pmp:reviewClientId";
      var value = localStorage.getItem(key);
      if (!value) {
        value = "guest-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(key, value);
      }
      return value;
    } catch (error) {
      return "guest-unavailable";
    }
  }

  function hasLocalReviewToday() {
    try {
      return localStorage.getItem("pmp:reviewDay") === todayKey();
    } catch (error) {
      return false;
    }
  }

  function markLocalReviewToday() {
    try {
      localStorage.setItem("pmp:reviewDay", todayKey());
    } catch (error) {
      // Local storage is only a convenience spam guard.
    }
  }

  function containsBlockedWord(text) {
    var value = text.toLowerCase();
    return blockedWords.some(function (word) {
      return value.indexOf(word) !== -1;
    });
  }

  function setRating(value) {
    ratingInput.value = String(value);
    ratingButtons.forEach(function (button) {
      var active = Number(button.dataset.ratingValue) <= value;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function relativeDate(date) {
    if (!date) return "Just now";
    var diff = Date.now() - date.getTime();
    var minutes = Math.floor(diff / 60000);
    var hours = Math.floor(minutes / 60);
    var days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return minutes + " min ago";
    if (hours < 24) return hours + " hour" + (hours === 1 ? "" : "s") + " ago";
    if (days < 30) return days + " day" + (days === 1 ? "" : "s") + " ago";
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  function stars(rating) {
    var value = Math.max(1, Math.min(5, Number(rating) || 0));
    return "★★★★★".slice(0, value) + "☆☆☆☆☆".slice(0, 5 - value);
  }

  function renderReview(doc) {
    var data = doc.data ? doc.data() : doc;
    var card = document.createElement("article");
    var top = document.createElement("div");
    var name = document.createElement("strong");
    var rating = document.createElement("span");
    var text = document.createElement("p");
    var date = document.createElement("time");
    var timestamp = data.timestamp && data.timestamp.toDate ? data.timestamp.toDate() : null;
    if (!timestamp && data.timestamp instanceof Date) {
      timestamp = data.timestamp;
    }
    if (!timestamp && typeof data.timestamp === "string") {
      timestamp = new Date(data.timestamp);
    }
    if (timestamp && Number.isNaN(timestamp.getTime())) {
      timestamp = null;
    }

    card.className = "review-card";
    top.className = "review-card-top";
    name.textContent = data.name || "ProtectMyPhoto user";
    rating.className = "review-stars";
    rating.textContent = stars(data.rating);
    text.textContent = data.reviewText || "";
    date.dateTime = timestamp ? timestamp.toISOString() : "";
    date.textContent = relativeDate(timestamp);

    top.appendChild(name);
    top.appendChild(rating);
    card.appendChild(top);
    card.appendChild(text);
    card.appendChild(date);
    return card;
  }

  function updateSummary(reviews) {
    var visible = reviews.filter(function (item) {
      return item.status !== "hidden";
    });
    var count = visible.length;
    var avg = count ? visible.reduce(function (sum, item) {
      return sum + Number(item.rating || 0);
    }, 0) / count : 0;

    if (averageText) {
      averageText.textContent = count ? avg.toFixed(1) + " ★" : "New reviews";
    }

    if (countText) {
      countText.textContent = count ? "based on " + count + " recent review" + (count === 1 ? "" : "s") : "Feedback will appear here after users submit reviews.";
    }

    if (schemaNode) {
      var schema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "ProtectMyPhoto",
        url: "https://protectmyphoto.in/",
        applicationCategory: "PhotoApplication",
        operatingSystem: "Any browser",
        isAccessibleForFree: true,
        publisher: {
          "@type": "Organization",
          name: "ProtectMyPhoto",
          email: "admin@protectmyphoto.in"
        }
      };

      if (count) {
        schema.aggregateRating = {
          "@type": "AggregateRating",
          ratingValue: avg.toFixed(1),
          ratingCount: count,
          bestRating: "5",
          worstRating: "1"
        };
        schema.review = visible.slice(0, 8).map(function (item) {
          return {
            "@type": "Review",
            author: { "@type": "Person", name: item.name || "ProtectMyPhoto user" },
            reviewRating: { "@type": "Rating", ratingValue: String(item.rating), bestRating: "5", worstRating: "1" },
            reviewBody: item.reviewText || ""
          };
        });
      }

      schemaNode.textContent = JSON.stringify(schema);
    }
  }

  function renderList(docs) {
    if (list) {
      list.innerHTML = "";
    }

    docs.slice(0, visibleReviewCount).forEach(function (doc) {
      if (list) {
        list.appendChild(renderReview(doc));
      }
    });

    if (empty) {
      empty.hidden = Boolean(list && list.children.length);
    }

    if (moreButton) {
      moreButton.hidden = docs.length <= visibleReviewCount;
    }
  }

  function firestoreValueToPlain(value) {
    if (!value || typeof value !== "object") return null;
    if (Object.prototype.hasOwnProperty.call(value, "stringValue")) return value.stringValue;
    if (Object.prototype.hasOwnProperty.call(value, "integerValue")) return Number(value.integerValue);
    if (Object.prototype.hasOwnProperty.call(value, "doubleValue")) return Number(value.doubleValue);
    if (Object.prototype.hasOwnProperty.call(value, "booleanValue")) return Boolean(value.booleanValue);
    if (Object.prototype.hasOwnProperty.call(value, "timestampValue")) return value.timestampValue;
    if (Object.prototype.hasOwnProperty.call(value, "nullValue")) return null;
    return null;
  }

  async function loadReviewsFromRest() {
    if (!firebaseConfig || !firebaseConfig.projectId || !firebaseConfig.apiKey) {
      return [];
    }

    var body = {
      structuredQuery: {
        from: [{ collectionId: "reviews" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "status" },
            op: "EQUAL",
            value: { stringValue: "approved" }
          }
        },
        limit: 50
      }
    };

    var response = await fetch("https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(firebaseConfig.projectId) + "/databases/(default)/documents:runQuery?key=" + encodeURIComponent(firebaseConfig.apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Reviews fallback could not read Firestore.");
    }

    var payload = await response.json();
    return payload.filter(function (item) {
      return item.document && item.document.fields;
    }).map(function (item) {
      var output = {};
      Object.keys(item.document.fields).forEach(function (key) {
        output[key] = firestoreValueToPlain(item.document.fields[key]);
      });
      return output;
    }).sort(function (a, b) {
      return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
    });
  }

  function reviewTimestampValue(review) {
    var data = review && review.data ? review.data() : review;
    var timestamp = data && data.timestamp;
    if (timestamp && timestamp.toMillis) return timestamp.toMillis();
    if (timestamp && timestamp.toDate) return timestamp.toDate().getTime();
    if (timestamp instanceof Date) return timestamp.getTime();
    if (typeof timestamp === "string") return new Date(timestamp).getTime() || 0;
    return 0;
  }

  function sortReviewsNewestFirst(reviews) {
    return reviews.slice().sort(function (a, b) {
      return reviewTimestampValue(b) - reviewTimestampValue(a);
    });
  }

  async function loadReviews() {
    if (!db || !firestore) return;

    try {
      if (liveBadge) liveBadge.textContent = "Loading";
      var constraints = [
        firestore.collection(db, "reviews"),
        firestore.where("status", "==", "approved"),
        firestore.limit(50)
      ];

      var snapshot = await firestore.getDocs(firestore.query.apply(null, constraints));
      var docs = snapshot.docs;
      if (!docs.length) {
        var fallbackReviews = await loadReviewsFromRest();
        if (fallbackReviews.length) {
          allApprovedReviews = sortReviewsNewestFirst(fallbackReviews);
          loadedReviews = allApprovedReviews.map(function (review) { return review.data ? review.data() : review; });
          renderList(allApprovedReviews);
          updateSummary(loadedReviews);
          if (liveBadge) liveBadge.textContent = "Live";
          return;
        }
      }
      lastVisible = docs.length ? docs[docs.length - 1] : lastVisible;
      allApprovedReviews = sortReviewsNewestFirst(docs);
      loadedReviews = allApprovedReviews.map(function (doc) { return doc.data(); });
      renderList(allApprovedReviews);
      updateSummary(loadedReviews);
      if (liveBadge) liveBadge.textContent = "Live";
    } catch (error) {
      console.warn("ProtectMyPhoto reviews load failed:", error);
      if (liveBadge) liveBadge.textContent = "Unavailable";
      if (empty) {
        empty.hidden = false;
        empty.textContent = "Reviews could not load right now.";
      }
    }
  }

  async function hasRemoteReviewToday(identityField, identityValue) {
    try {
      var snapshot = await firestore.getDocs(firestore.query(
        firestore.collection(db, "reviews"),
        firestore.where(identityField, "==", identityValue),
        firestore.limit(12)
      ));
      return snapshot.docs.some(function (doc) {
        return doc.data().dayKey === todayKey();
      });
    } catch (error) {
      console.warn("ProtectMyPhoto review rate-limit check failed:", error);
      return hasLocalReviewToday();
    }
  }

  function reviewDocumentId(submitUser, clientId) {
    var identity = submitUser ? submitUser.uid : clientId;
    return (submitUser ? "user_" : "guest_") + identity.replace(/[\/\\#?\[\]]/g, "-") + "_" + todayKey();
  }

  async function submitReview(event) {
    event.preventDefault();
    if (!db || !firestore) {
      setStatus("Reviews are not connected yet. Please try again after Firebase setup is deployed.", "error");
      return;
    }

    var rating = Number(ratingInput.value);
    var name = cleanText(nameInput.value) || "Guest user";
    var reviewText = cleanText(textInput.value);
    var clientId = getClientId();
    var submitUser = activeUser || (authClient ? authClient.currentUser : null);
    var identityField = submitUser ? "userId" : "clientId";
    var identityValue = submitUser ? submitUser.uid : clientId;

    if (rating < 1 || rating > 5) {
      setStatus("Please choose a star rating.", "error");
      return;
    }

    if (reviewText.length < 12) {
      setStatus("Please write at least 12 characters so the review is useful.", "error");
      return;
    }

    if (containsBlockedWord(name + " " + reviewText)) {
      setStatus("Please keep the review respectful and specific.", "error");
      return;
    }

    if (hasLocalReviewToday() || await hasRemoteReviewToday(identityField, identityValue)) {
      setStatus("You have already submitted a review today from this browser/account.", "error");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
      var reviewRef = firestore.doc(db, "reviews", reviewDocumentId(submitUser, clientId));
      await firestore.setDoc(reviewRef, {
        name: name.slice(0, 60),
        rating: rating,
        reviewText: reviewText.slice(0, 500),
        timestamp: firestore.serverTimestamp(),
        userId: submitUser ? submitUser.uid : null,
        clientId: clientId,
        dayKey: todayKey(),
        status: "pending"
      });
      markLocalReviewToday();
      setStatus("Thanks. Your review was submitted and will appear after approval.", "success");
      textInput.value = "";
      setRating(0);
      lastVisible = null;
      await loadReviews(false);
    } catch (error) {
      console.warn("ProtectMyPhoto review submit failed:", error);
      if (error && error.code === "permission-denied") {
        setStatus("You may have already submitted a review today. Please try again tomorrow.", "error");
      } else {
        setStatus("Review could not be submitted. Please try again.", "error");
      }
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Submit review";
      if (countdown) countdown.textContent = "500";
    }
  }

  ratingButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setRating(Number(button.dataset.ratingValue));
    });
  });

  if (textInput && countdown) {
    textInput.addEventListener("input", function () {
      countdown.textContent = String(500 - textInput.value.length);
    });
  }

  if (form) {
    form.addEventListener("submit", submitReview);
  }

  if (moreButton) {
    moreButton.addEventListener("click", function () {
      visibleReviewCount += pageSize;
      renderList(allApprovedReviews);
    });
  }

  try {
    var configModule = await import("./firebase-config.js");
    firebaseConfig = configModule.firebaseConfig || {};
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey.indexOf("YOUR_") === 0) {
      throw new Error("Firebase config is missing.");
    }

    var appModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    var authModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
    firestore = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
    var app = appModule.getApps().length ? appModule.getApp() : appModule.initializeApp(firebaseConfig);
    var auth = authModule.getAuth(app);
    authClient = auth;
    db = firestore.getFirestore(app);

    authModule.onAuthStateChanged(auth, function (user) {
      activeUser = user;
      if (user && nameInput && !nameInput.value) {
        nameInput.value = user.displayName || (user.email ? user.email.split("@")[0] : "");
      }
      if (authNote) {
        authNote.textContent = user ? "Signed in reviews use your account for the one-review-per-day limit." : "Guests can submit one review per day from this browser.";
      }
    });

    await loadReviews(false);
  } catch (error) {
    console.warn("ProtectMyPhoto reviews setup failed:", error);
    if (liveBadge) liveBadge.textContent = "Setup needed";
    if (empty) {
      empty.hidden = false;
      empty.textContent = "Reviews will appear after Firebase Firestore is enabled.";
    }
    setStatus("Firebase Firestore is not ready yet. Enable Firestore and deploy rules before collecting reviews.", "error");
  }
})();
