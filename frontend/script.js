// script.js - shared frontend logic (search, menus, app loading)

document.addEventListener("DOMContentLoaded", () => {
  // UI elements
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsMenu = document.getElementById("settingsMenu");
  const profileLink = document.getElementById("profileLink");
  const devConsoleBtn = document.getElementById("devConsoleBtn");
  const adminConsoleBtn = document.getElementById("adminConsoleBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const searchInput = document.getElementById("searchInput");

  // Show/hide settings menu
  if (settingsBtn && settingsMenu) {
    settingsBtn.addEventListener("click", () => {
      settingsMenu.style.display =
        settingsMenu.style.display === "block" ? "none" : "block";
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("apk_user");
      alert("Logged out.");
      window.location.href = "login.html";
    });
  }

  // Role-based button visibility and navigation
  const userRaw = localStorage.getItem("apk_user");
  let currentUser = null;
  if (userRaw) {
    try {
      currentUser = JSON.parse(userRaw);
    } catch (err) {
      console.error("Error parsing user data:", err);
    }
  }

  // Developer Console
  if (devConsoleBtn) {
    if (!currentUser || (currentUser.role !== "developer" && currentUser.role !== "admin")) {
      devConsoleBtn.style.display = "none";
    } else {
      devConsoleBtn.addEventListener("click", () => {
        window.location.href = "developer.html";
      });
    }
  }

  // Admin Console
  if (adminConsoleBtn) {
    if (!currentUser || currentUser.role !== "admin") {
      adminConsoleBtn.style.display = "none";
    } else {
      adminConsoleBtn.addEventListener("click", () => {
        window.location.href = "admin.html";
      });
    }
  }

  // Search functionality
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim().toLowerCase();
      filterApps(q);
    });
  }

  // Initial app load
  loadApps();
});

// ------------------- APP DISPLAY -------------------

let APPS = [];

async function loadApps() {
  try {
    const res = await fetch("/apps");
    if (!res.ok) throw new Error("Failed to fetch apps");
    APPS = await res.json();
    renderApps(APPS);
  } catch (err) {
    console.error("Error loading apps:", err);
  }
}

function renderApps(list) {
  const grid = document.getElementById("appGrid");
  const noApps = document.getElementById("noApps");
  if (!grid) return;
  grid.innerHTML = "";

  if (!list || list.length === 0) {
    if (noApps) noApps.style.display = "block";
    return;
  } else if (noApps) {
    noApps.style.display = "none";
  }

  list.forEach((a) => {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <img src="${a.icon}" alt="${escapeHtml(a.appName)}" />
      <h3>${escapeHtml(a.appName)}</h3>
      <p>${escapeHtml(a.description)}</p>
      <a class="btn" href="${a.apk}" download>Download</a>
    `;
    grid.appendChild(el);
  });
}

function filterApps(q) {
  if (!q) return renderApps(APPS);
  const filtered = APPS.filter((a) =>
    (a.appName + " " + a.description).toLowerCase().includes(q)
  );
  renderApps(filtered);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;',
    "'": "&#39;",
  }[c]));
}

// ------------------- SERVICE WORKER REGISTRATION -------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("✅ Service Worker registered with scope:", registration.scope);
      })
      .catch((error) => {
        console.error("❌ Service Worker registration failed:", error);
      });
  });
}
