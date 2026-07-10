(function () {
  "use strict";

  var pageTitle = document.querySelector("h1");
  var schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": pageTitle ? pageTitle.textContent.trim() : "ProtectMyPhoto",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Any",
    "url": "https://protectmyphoto.in/" + location.pathname.split("/").pop(),
    "creator": {
      "@type": "Organization",
      "name": "ProtectMyPhoto",
      "url": "https://protectmyphoto.in",
      "email": "admin@protectmyphoto.in"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "INR"
    }
  };
  var script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}());
