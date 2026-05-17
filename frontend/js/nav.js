(function () {
  function render() {
    const el = document.getElementById("site-nav");
    if (!el) return;
    const user = (function () {
      try {
        return JSON.parse(localStorage.getItem("user") || "null");
      } catch {
        return null;
      }
    })();
    const cartHint = '<a href="cart.html" class="nav-link">Cart</a>';
    const adminLink =
      user && user.is_admin
        ? '<a href="admin.html" class="nav-link nav-admin">Admin</a>'
        : "";
    const auth = user
      ? `<span class="nav-user">${escapeHtml(user.name)}</span><button type="button" class="btn btn-ghost btn-sm" id="nav-logout">Log out</button>`
      : `<a href="login.html" class="nav-link">Log in</a><a href="register.html" class="btn btn-sm">Sign up</a>`;

    el.innerHTML = `
      <a href="index.html" class="logo">Shop<span>Lite</span></a>
      <div class="nav-links">
        <a href="index.html" class="nav-link">Products</a>
        ${cartHint}
        <a href="orders.html" class="nav-link">Orders</a>
        ${adminLink}
      </div>
      <div class="nav-auth">${auth}</div>
    `;
    const btn = document.getElementById("nav-logout");
    if (btn) {
      btn.addEventListener("click", function () {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "index.html";
      });
    }
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
