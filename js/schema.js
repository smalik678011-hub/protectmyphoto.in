(function () {
  "use strict";

  var baseUrl = "https://protectmyphoto.in";
  var path = location.pathname.split("/").pop() || "index.html";
  var pageTitle = document.title.replace(/\s+-\s+ProtectMyPhoto.*$/i, "").trim();
  var pageDescription = document.querySelector('meta[name="description"]');
  var canonical = document.querySelector('link[rel="canonical"]');
  var currentUrl = canonical ? canonical.href : baseUrl + "/" + path;
  var organization = {
    "@type": "Organization",
    "@id": baseUrl + "/#organization",
    "name": "ProtectMyPhoto",
    "url": baseUrl + "/",
    "email": "admin@protectmyphoto.in",
    "logo": baseUrl + "/favicon.svg"
  };
  var toolPages = {
    "compress-image.html": "Image compressor",
    "resize-image.html": "Image resizer",
    "convert-image.html": "Image converter",
    "remove-metadata.html": "EXIF metadata remover",
    "image-to-pdf.html": "Image to PDF converter",
    "passport-photo-maker.html": "Passport photo maker",
    "crop-image.html": "Image cropper",
    "rotate-image.html": "Image rotator",
    "signature-resizer.html": "Signature resizer",
    "white-background-photo.html": "White background photo maker",
    "custom-stamp-maker.html": "Custom stamp maker"
  };
  var graph = [organization];

  if (path === "index.html") {
    graph.push({
      "@type": "WebSite",
      "@id": baseUrl + "/#website",
      "name": "ProtectMyPhoto",
      "url": baseUrl + "/",
      "publisher": { "@id": baseUrl + "/#organization" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": baseUrl + "/tools.html?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    });
  }

  if (toolPages[path]) {
    graph.push({
      "@type": "SoftwareApplication",
      "@id": currentUrl + "#app",
      "name": toolPages[path] + " - ProtectMyPhoto",
      "url": currentUrl,
      "description": pageDescription ? pageDescription.content : pageTitle,
      "applicationCategory": "PhotoApplication",
      "operatingSystem": "Any (Browser-based)",
      "isAccessibleForFree": true,
      "browserRequirements": "Requires a modern browser with JavaScript enabled.",
      "creator": { "@id": baseUrl + "/#organization" },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "INR"
      }
    });
  }

  if (document.querySelector(".faq-section details")) {
    graph.push({
      "@type": "FAQPage",
      "@id": currentUrl + "#faq",
      "mainEntity": Array.prototype.map.call(document.querySelectorAll(".faq-section details"), function (item) {
        return {
          "@type": "Question",
          "name": item.querySelector("summary").textContent.trim(),
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.querySelector("p").textContent.trim()
          }
        };
      })
    });
  }

  if (path !== "index.html" && path !== "404.html") {
    graph.push({
      "@type": "BreadcrumbList",
      "@id": currentUrl + "#breadcrumb",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": baseUrl + "/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": pageTitle || document.querySelector("h1").textContent.trim(),
          "item": currentUrl
        }
      ]
    });
  }

  var script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graph
  });
  document.head.appendChild(script);
}());
