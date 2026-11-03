/* ==========================================================================
   TECH CODE CREATIONS - Main Interactive Logic & Bill Generator
   Founder & Lead Developer: KUBERAMOORTHY S
   Contact: 8248688471 | Kumbakonam, Tamil Nadu
   ========================================================================== */

// Admin Credentials
const ADMIN_CREDENTIALS = {
  username: "TechCodeCreation",
  password: "techcode@12345"
};

// Indian Currency Number to Words Converter
function convertNumberToIndianWords(number) {
  const num = Math.floor(Math.abs(Number(number) || 0));
  if (num === 0) return "Rupees Zero Only";

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  function numToWordsUnderThousand(n) {
    let str = "";
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "") + " ";
    } else if (n > 0) {
      str += a[n] + " ";
    }
    return str;
  }

  let crore = Math.floor(num / 10000000);
  let rem = num % 10000000;
  let lakh = Math.floor(rem / 100000);
  rem %= 100000;
  let thousand = Math.floor(rem / 1000);
  rem %= 1000;
  let hundredAndBelow = rem;

  let words = "Rupees ";
  if (crore > 0) words += numToWordsUnderThousand(crore).trim() + " Crore ";
  if (lakh > 0) words += numToWordsUnderThousand(lakh).trim() + " Lakh ";
  if (thousand > 0) words += numToWordsUnderThousand(thousand).trim() + " Thousand ";
  if (hundredAndBelow > 0) words += numToWordsUnderThousand(hundredAndBelow).trim() + " ";

  return (words.trim() + " Only");
}

// Orders Database - Real Billing System (Empty by default)
const INITIAL_ORDERS = [];

const STORAGE_KEYS = {
  ORDERS: "techcode_orders_v2",
  ADMIN_SESSION: "techcode_admin_session"
};

class TechCodeApp {
  constructor() {
    this.orders = this.loadOrders();
    this.currentFilter = "all";
    this.searchQuery = "";
    this.initEvents();
  }

  loadOrders() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Remove all previous demo bills from localStorage
          const demoIds = ["TCC-2026-011", "TCC-2026-012", "TCC-2026-013", "TCC-2026-014", "TCC/2026/011", "TCC/2026/012", "TCC/2026/013", "TCC/2026/014"];
          const cleaned = parsed.filter(o => {
            const id = (o.id || "").trim();
            const inv = (o.invoiceNo || "").trim();
            const name = (o.clientName || "").toLowerCase();
            if (demoIds.includes(id) || demoIds.includes(inv) || name.includes("spatakal") || name.includes("ramesh babu") || name.includes("saravanan k") || name.includes("prakash raj")) {
              return false;
            }
            return true;
          });
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(cleaned));
          }
          return cleaned;
        }
      }
    } catch (e) {
      console.error("Error reading localStorage:", e);
    }
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
    return [];
  }

  saveOrders() {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(this.orders));
      this.renderAdminOrders();
      this.updateAdminMetrics();
    } catch (e) {
      console.error("Error saving orders:", e);
    }
  }

  initEvents() {
    // Mobile Navigation Drawer
    const mobileBtn = document.getElementById("mobileMenuBtn");
    const navMenu = document.getElementById("navMenu");
    if (mobileBtn && navMenu) {
      mobileBtn.addEventListener("click", () => {
        navMenu.classList.toggle("mobile-open");
      });
      navMenu.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => navMenu.classList.remove("mobile-open"));
      });
    }

    // Booking Form
    const bookingForm = document.getElementById("orderBookingForm");
    if (bookingForm) {
      bookingForm.addEventListener("submit", (e) => this.handleOrderSubmit(e));
    }

    // Admin Login Form
    const adminLoginForm = document.getElementById("adminLoginForm");
    if (adminLoginForm) {
      adminLoginForm.addEventListener("submit", (e) => this.handleAdminLogin(e));
    }

    // Admin Logout
    const adminLogoutBtn = document.getElementById("adminLogoutBtn");
    if (adminLogoutBtn) {
      adminLogoutBtn.addEventListener("click", () => this.handleAdminLogout());
    }

    // Fill Demo Credentials
    const demoCredsBtn = document.getElementById("fillDemoCredsBtn");
    if (demoCredsBtn) {
      demoCredsBtn.addEventListener("click", () => {
        const userField = document.getElementById("adminUsername");
        const passField = document.getElementById("adminPassword");
        if (userField && passField) {
          userField.value = ADMIN_CREDENTIALS.username;
          passField.value = ADMIN_CREDENTIALS.password;
          this.showToast("Admin credentials filled! Click 'Sign In'.", "info");
        }
      });
    }

    // Toggle Password Visibility
    const togglePassBtn = document.getElementById("togglePassBtn");
    if (togglePassBtn) {
      togglePassBtn.addEventListener("click", () => {
        const passField = document.getElementById("adminPassword");
        passField.type = passField.type === "password" ? "text" : "password";
      });
    }

    // Admin Filter Tabs
    document.querySelectorAll(".filter-tab").forEach(tab => {
      tab.addEventListener("click", (e) => {
        document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
        e.currentTarget.classList.add("active");
        this.currentFilter = e.currentTarget.getAttribute("data-filter");
        this.renderAdminOrders();
      });
    });

    // Admin Search
    const searchInput = document.getElementById("adminOrderSearch");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderAdminOrders();
      });
    }

    // Admin Add Manual Order Form
    const manualOrderForm = document.getElementById("manualOrderForm");
    if (manualOrderForm) {
      manualOrderForm.addEventListener("submit", (e) => this.handleManualOrderSubmit(e));
      
      // Live Preview Listeners
      const amtInput = document.getElementById("manualAmount");
      const discInput = document.getElementById("manualDiscount");
      const costInput = document.getElementById("manualCost");
      if (amtInput) amtInput.addEventListener("input", () => this.updateManualBillLivePreview());
      if (discInput) discInput.addEventListener("input", () => this.updateManualBillLivePreview());
      if (costInput) costInput.addEventListener("input", () => this.updateManualBillLivePreview());

      const nameInput = document.getElementById("manualName");
      const projInput = document.getElementById("manualProjectName");
      const typeInput = document.getElementById("manualType");
      if (nameInput) nameInput.addEventListener("input", () => this.syncManualDescriptions());
      if (projInput) projInput.addEventListener("input", () => this.syncManualDescriptions());
      if (typeInput) typeInput.addEventListener("change", () => this.syncManualDescriptions());

      const descInput = document.getElementById("manualDescription");
      const subDescInput = document.getElementById("manualSubDescription");
      if (descInput) descInput.addEventListener("input", (e) => { e.target.dataset.userEdited = "true"; });
      if (subDescInput) subDescInput.addEventListener("input", (e) => { e.target.dataset.userEdited = "true"; });
    }

    // Auto Regenerate Invoice Number Button
    const btnRegenInvNo = document.getElementById("btnRegenInvNo");
    if (btnRegenInvNo) {
      btnRegenInvNo.addEventListener("click", () => {
        const invInput = document.getElementById("manualInvoiceNo");
        if (invInput) {
          invInput.value = this.getNextInvoiceNumber();
          this.showToast(`Auto created Bill No: ${invInput.value}`, "info");
        }
      });
    }

    // Fresh Auto Bill Button
    const autoNewBillBtn = document.getElementById("autoNewBillBtn");
    if (autoNewBillBtn) {
      autoNewBillBtn.addEventListener("click", () => {
        this.prepareManualBillModal(true);
        this.showToast("Prepared fresh auto bill with next sequential number!", "info");
      });
    }



    // Auto Change Bill Number Button
    const btnAutoChange = document.getElementById("btnAutoChangeBillNo");
    if (btnAutoChange) {
      btnAutoChange.addEventListener("click", () => this.autoChangeBillNumber());
    }


    // Export CSV
    const exportCsvBtn = document.getElementById("exportCsvBtn");
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener("click", () => this.exportOrdersToCSV());
    }

    // Contact Form
    const contactForm = document.getElementById("contactForm");
    if (contactForm) {
      contactForm.addEventListener("submit", (e) => this.handleContactSubmit(e));
    }

    // Check existing admin session
    if (sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === "true") {
      this.showAdminDashboard();
    }

    // Check URL parameters for direct bill or QR view
    const urlParams = new URLSearchParams(window.location.search);
    const billParam = urlParams.get("view_invoice") || urlParams.get("bill") || urlParams.get("qr") || urlParams.get("barcode");
    if (billParam) {
      setTimeout(() => {
        const found = this.orders.find(o => o.id === billParam || o.invoiceNo === billParam || billParam.includes("35545"));
        if (found) {
          this.generateBill(found.id);
        } else if (this.orders.length > 0) {
          this.generateBill(this.orders[0].id);
        }
      }, 500);
    }
  }

  // Handle Order Booking Form Submission (No budget field required)
  handleOrderSubmit(e) {
    e.preventDefault();
    const form = e.target;

    const clientName = form.clientName.value.trim();
    const phone = form.clientPhone.value.trim();
    const email = form.clientEmail.value.trim();
    const businessName = form.businessName.value.trim() || "Independent Startup";
    const websiteTypeSelect = form.websiteType;
    const websiteTypeText = websiteTypeSelect.options[websiteTypeSelect.selectedIndex].text;
    const timelineSelect = form.timeline;
    const timelineText = timelineSelect ? timelineSelect.options[timelineSelect.selectedIndex].text : "Standard";
    const details = form.projectDetails.value.trim();

    const selectedFeatures = [];
    form.querySelectorAll('#featuresCheckboxContainer input[type="checkbox"]:checked').forEach(cb => {
      selectedFeatures.push(cb.value);
    });

    if (!clientName || !phone) {
      this.showToast("Please provide your Name and Contact Phone Number.", "error");
      return;
    }

    if (phone.replace(/\D/g, '').length < 10) {
      this.showToast("Please enter a valid 10-digit mobile number.", "error");
      return;
    }

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const newOrderId = `TCC-2026-${randomDigits}`;

    const now = new Date();
    const dateFormatted = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    const newOrder = {
      id: newOrderId,
      date: dateFormatted,
      clientName,
      phone,
      email: email || "Not provided",
      businessName,
      websiteType: websiteTypeText,
      timeline: timelineText,
      features: selectedFeatures.length ? selectedFeatures : ["Mobile Responsive", "Standard SEO"],
      details: details || "Custom website requested.",
      status: "Pending",
      notes: "Submitted through booking form.",
      billAmount: 15000,
      paidAmount: 0,
      paymentStatus: "PENDING REVIEW"
    };

    this.orders.unshift(newOrder);
    this.saveOrders();

    this.showOrderSuccessModal(newOrder);
    form.reset();
    this.showToast(`Order ${newOrderId} created successfully!`, "success");
  }

  showOrderSuccessModal(order) {
    const modal = document.getElementById("orderSuccessModal");
    if (!modal) return;

    document.getElementById("modalOrderId").textContent = order.id;
    document.getElementById("modalClientName").textContent = order.clientName;
    document.getElementById("modalPhone").textContent = order.phone;
    document.getElementById("modalBusinessType").textContent = `${order.businessName} (${order.websiteType})`;
    document.getElementById("modalTimeline").textContent = order.timeline;

    const waText = encodeURIComponent(
      `Hello Kuberamoorthy! I have submitted a new website project order with Tech Code Creations:\n\n` +
      `📋 Order ID: ${order.id}\n` +
      `👤 Name: ${order.clientName}\n` +
      `📱 Phone: ${order.phone}\n` +
      `🏢 Business: ${order.businessName}\n` +
      `💻 Website Type: ${order.websiteType}\n` +
      `⏱️ Timeline: ${order.timeline}\n` +
      `✨ Features: ${order.features.join(", ")}\n` +
      `📝 Requirements: ${order.details}\n\n` +
      `Please let me know the next steps to start our project!`
    );

    const waBtn = document.getElementById("modalWaShareBtn");
    if (waBtn) {
      waBtn.href = `https://wa.me/918248688471?text=${waText}`;
    }

    modal.classList.add("active");
  }

  // Admin Authentication
  handleAdminLogin(e) {
    e.preventDefault();
    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value.trim();
    const errorElem = document.getElementById("adminLoginError");

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      if (errorElem) errorElem.style.display = "none";
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, "true");
      this.showToast("Welcome back, TechCodeCreation! Admin session active.", "success");
      this.showAdminDashboard();
    } else {
      if (errorElem) {
        errorElem.textContent = "Invalid credentials. Please enter username TechCodeCreation and password techcode@12345.";
        errorElem.style.display = "block";
      }
      this.showToast("Authentication failed.", "error");
    }
  }

  showAdminDashboard() {
    const loginCard = document.getElementById("adminLoginCard");
    const dashboard = document.getElementById("adminDashboardContainer");
    if (loginCard && dashboard) {
      loginCard.style.display = "none";
      dashboard.style.display = "block";
      this.updateAdminMetrics();
      this.renderAdminOrders();
    }
  }

  handleAdminLogout() {
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    const loginCard = document.getElementById("adminLoginCard");
    const dashboard = document.getElementById("adminDashboardContainer");
    if (loginCard && dashboard) {
      loginCard.style.display = "block";
      dashboard.style.display = "none";
      document.getElementById("adminPassword").value = "";
    }
    this.showToast("Admin logged out safely.", "info");
  }

  updateAdminMetrics() {
    const totalElem = document.getElementById("metricTotalOrders");
    const pendingElem = document.getElementById("metricPendingOrders");
    const progressElem = document.getElementById("metricProgressOrders");
    const completedElem = document.getElementById("metricCompletedOrders");

    if (totalElem) totalElem.textContent = this.orders.length;
    if (pendingElem) pendingElem.textContent = this.orders.filter(o => o.status === "Pending").length;
    if (progressElem) progressElem.textContent = this.orders.filter(o => o.status === "In Progress" || o.status === "In Review").length;
    if (completedElem) completedElem.textContent = this.orders.filter(o => o.status === "Completed").length;

    // Financial & Profit Calculations
    let totalBilled = 0;
    let totalExpenses = 0;
    let totalProfit = 0;
    let totalCollected = 0;

    this.orders.forEach(o => {
      const bill = Number(o.netAmount !== undefined ? o.netAmount : (o.billAmount || 0));
      const cost = Number(o.costAmount !== undefined ? o.costAmount : (o.projectCost || 0));
      const profit = Number(o.profitAmount !== undefined ? o.profitAmount : Math.max(0, bill - cost));
      const paid = Number(o.paidAmount !== undefined ? o.paidAmount : (o.paymentStatus === "PAID" ? bill : 0));

      totalBilled += bill;
      totalExpenses += cost;
      totalProfit += profit;
      totalCollected += paid;
    });

    const billedElem = document.getElementById("metricTotalBilled");
    const expElem = document.getElementById("metricTotalExpenses");
    const profitElem = document.getElementById("metricNetProfit");
    const marginBadge = document.getElementById("metricProfitMarginBadge");
    const collElem = document.getElementById("metricTotalCollected");

    if (billedElem) billedElem.textContent = "₹" + totalBilled.toLocaleString("en-IN");
    if (expElem) expElem.textContent = "₹" + totalExpenses.toLocaleString("en-IN");
    if (profitElem) profitElem.textContent = "₹" + totalProfit.toLocaleString("en-IN");
    if (collElem) collElem.textContent = "₹" + totalCollected.toLocaleString("en-IN");

    if (marginBadge) {
      const margin = totalBilled > 0 ? ((totalProfit / totalBilled) * 100).toFixed(1) : "0.0";
      marginBadge.textContent = `${margin}% Margin`;
    }
  }

  renderAdminOrders() {
    const tbody = document.getElementById("adminOrdersTableBody");
    const emptyRow = document.getElementById("emptyOrdersRow");
    if (!tbody) return;

    let filtered = this.orders.filter(order => {
      if (this.currentFilter === "pending" && order.status !== "Pending") return false;
      if (this.currentFilter === "progress" && (order.status !== "In Progress" && order.status !== "In Review")) return false;
      if (this.currentFilter === "completed" && order.status !== "Completed") return false;

      if (this.searchQuery) {
        const fullString = `${order.id} ${order.clientName} ${order.phone} ${order.businessName} ${order.websiteType}`.toLowerCase();
        if (!fullString.includes(this.searchQuery)) return false;
      }
      return true;
    });

    const nextBillBadge = document.getElementById("nextBillNoHeaderBadge");
    if (nextBillBadge) nextBillBadge.textContent = this.getNextInvoiceNumber();

    tbody.querySelectorAll("tr:not(#emptyOrdersRow)").forEach(tr => tr.remove());

    if (filtered.length === 0) {
      if (emptyRow) emptyRow.style.display = "table-row";
      return;
    }
    if (emptyRow) emptyRow.style.display = "none";

    filtered.forEach(order => {
      const tr = document.createElement("tr");

      const waMsg = encodeURIComponent(`Hello ${order.clientName}! This is Kuberamoorthy from Tech Code Creations regarding your website booking (${order.id}).`);

      const billAmt = Number(order.netAmount !== undefined ? order.netAmount : (order.billAmount || 0));
      const costAmt = Number(order.costAmount !== undefined ? order.costAmount : (order.projectCost || 0));
      const profitAmt = Number(order.profitAmount !== undefined ? order.profitAmount : Math.max(0, billAmt - costAmt));
      const marginPct = billAmt > 0 ? ((profitAmt / billAmt) * 100).toFixed(0) : 0;

      tr.innerHTML = `
        <td><span class="order-id-badge">${order.id}</span></td>
        <td>
          <div class="client-name-cell">${this.escapeHtml(order.clientName)}</div>
          <div class="client-contact-cell">${order.phone} • ${this.escapeHtml(order.email)}</div>
        </td>
        <td>
          <strong>${this.escapeHtml(order.businessName)}</strong><br>
          <span style="font-size: 0.82rem; color: var(--text-secondary);">${this.escapeHtml(order.websiteType)}</span>
        </td>
        <td>
          <div style="font-weight: 700; color: #0f172a; font-size:1.02rem;">₹${billAmt.toLocaleString('en-IN')}</div>
          <div style="margin: 3px 0;">
            <span class="profit-badge" title="Estimated Net Profit">
              💰 +₹${profitAmt.toLocaleString('en-IN')} Profit (${marginPct}%)
            </span>
          </div>
          <span style="font-size: 0.72rem; font-weight: 700; color: ${order.paymentStatus === 'PAID' ? '#059669' : '#d97706'};">${order.paymentStatus || 'PAYMENT DUE'}</span>
        </td>
        <td>
          <select class="form-control" style="padding: 6px 10px; font-size: 0.8rem; border-radius: var(--radius-sm);" onchange="app.updateOrderStatus('${order.id}', this.value)">
            <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="In Review" ${order.status === 'In Review' ? 'selected' : ''}>In Review</option>
            <option value="In Progress" ${order.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td>
          <div class="table-actions">
            <!-- CREATE / VIEW BILL BUTTON -->
            <button class="action-btn btn-bill" title="Generate Bill / Invoice" onclick="app.generateBill('${order.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </button>
            <button class="action-btn" title="Scan / View QR Code" onclick="app.showQrModal('${order.id}')" style="color:#0284c7;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            </button>
            <button class="action-btn" title="View Full Details" onclick="app.viewOrderDetails('${order.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <a class="action-btn btn-wa" href="https://wa.me/91${order.phone.replace(/\D/g,'')}?text=${waMsg}" target="_blank" title="Chat on WhatsApp">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
            <a class="action-btn" href="tel:${order.phone}" title="Call Client">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.28-.28.36-.67.25-1.02A11.36 11.36 0 019 4.31c0-.56-.45-1-1-1H4.5c-.55 0-1 .45-1 1C3.5 13.04 10.96 20.5 20.01 20.5c.55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z"/></svg>
            </a>
            <button class="action-btn btn-del" title="Delete Order" onclick="app.deleteOrder('${order.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  updateOrderStatus(orderId, newStatus) {
    const order = this.orders.find(o => o.id === orderId);
    if (order) {
      order.status = newStatus;
      this.saveOrders();
      this.showToast(`Order ${orderId} status updated to ${newStatus}`, "success");
    }
  }

  // ==========================================================================
  // OFFICIAL BILL / INVOICE GENERATOR FUNCTION
  // ==========================================================================
  generateBill(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById("billModal");
    const container = document.getElementById("billContentArea");
    if (!modal || !container) return;

    const invNum = order.invoiceNo || (order.id.startsWith("TCC-") ? order.id.replace("TCC-", "TCC/").replace("-", "/") : `TCC/2026/${order.id.replace(/\D/g, '').slice(-3) || '001'}`);
    const invDate = order.date ? (order.date.includes(" ") ? order.date.split(" ")[0] : order.date) : this.getTodayFormattedDate();
    const amount = Number(order.billAmount) || 0;
    const discount = Number(order.discountAmount) || 0;
    const netAmount = Number(order.netAmount) || Math.max(0, amount - discount);
    const amountInWords = convertNumberToIndianWords(netAmount);
    const clientName = order.clientName || order.businessName || "Valued Client";
    const phone = order.phone || "-";
    const address = order.address || "-";
    const projectName = order.projectName || order.websiteType || "Website Project";
    const projectType = order.projectType || order.websiteType || "Website Development";
    const category = order.category || "Web Development";
    const reference = order.reference || "Invoice";
    // Multi-item descriptions support
    const items = (Array.isArray(order.items) && order.items.length > 0)
      ? order.items
      : [
          {
            description: order.itemDescription || `${projectName} Service`,
            subDescription: order.itemSubDescription || `(${clientName} – ${projectType})`,
            amount: amount
          }
        ];

    const itemsRowsHtml = items.map((it, idx) => `
      <tr>
        <td class="td-sno">${idx + 1}</td>
        <td class="td-desc">
          <div class="tcc-desc-main">${this.escapeHtml(it.description || `${projectName} Service`)}</div>
          ${it.subDescription ? `<div class="tcc-desc-sub">${this.escapeHtml(it.subDescription)}</div>` : ''}
        </td>
        <td class="td-amount">₹ ${(Number(it.amount) || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
      </tr>
    `).join("");

    const qrData = `upi://pay?pa=8248688471@upi&pn=TechCodeCreations&am=${netAmount}&cu=INR&tn=Invoice_${encodeURIComponent(invNum)}`;

    const termsList = Array.isArray(order.terms) && order.terms.length > 0 
      ? order.terms 
      : [
          "Payment to be made within 7 days from the date of invoice.",
          `Services provided for the ${projectName} project.`,
          "For any queries, please contact us."
        ];

    const termsHtml = termsList.map(t => `<li>${this.escapeHtml(t)}</li>`).join("");

    container.innerHTML = `
      <div class="tcc-invoice-container" id="printableBillArea">
        <!-- Top-Right Geometric Polygonal Accent -->
        <div class="tcc-corner-decor tcc-corner-top-right">
          <svg viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="50,0 240,0 240,140 150,140" fill="#0369a1" />
            <polygon points="110,0 240,0 240,90" fill="#0284c7" />
            <polygon points="175,0 240,0 240,45" fill="#38bdf8" />
          </svg>
        </div>

        <!-- Bottom Geometric Polygonal Accents -->
        <div class="tcc-corner-decor tcc-corner-bottom-left">
          <svg viewBox="0 0 160 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="0,0 0,80 160,80" fill="#0284c7" />
            <polygon points="0,35 0,80 100,80" fill="#38bdf8" />
          </svg>
        </div>
        <div class="tcc-corner-decor tcc-corner-bottom-right">
          <svg viewBox="0 0 240 90" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="0,90 240,90 240,0 140,90" fill="#0284c7" />
            <polygon points="70,90 240,90 240,30" fill="#0369a1" />
            <polygon points="150,90 240,90 240,65" fill="#38bdf8" />
          </svg>
        </div>

        <!-- Header -->
        <div class="tcc-invoice-header">
          <div class="tcc-header-brand">
            <div class="tcc-brand-logo-wrap">
              <img src="logo.png" alt="Tech Code Creations" class="tcc-brand-logo">
            </div>
            <div class="tcc-brand-text">
              <h1 class="tcc-brand-title">Tech Code</h1>
              <div class="tcc-brand-subtitle">— Creations —</div>
              <div class="tcc-brand-tagline">IDEAS &nbsp;|&nbsp; DESIGN &nbsp;|&nbsp; DEVELOP &nbsp;|&nbsp; GROW</div>
            </div>
          </div>

          <div class="tcc-header-divider"></div>

          <div class="tcc-header-contact">
            <div class="tcc-contact-item">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="#0284c7"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
              <span><strong>Kumbakonam, Tamil Nadu</strong></span>
            </div>
            <div class="tcc-contact-item">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="#0284c7"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.41 11.41 0 0 0 3.58.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.41 11.41 0 0 0 .57 3.58 1 1 0 0 1-.25 1.02l-2.2 2.19z"/></svg>
              <span><strong>+91 8248688471</strong></span>
            </div>
            <div class="tcc-contact-item">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="#0284c7"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
              <span>techcodecreations@gmail.com</span>
            </div>
            <div class="tcc-contact-services">Website & Mobile Application Development</div>
          </div>
        </div>

        <!-- 3-Column Metadata Row -->
        <div class="tcc-meta-row-grid">
          <!-- Col 1: INVOICE badge + Bill To -->
          <div class="tcc-meta-col-1">
            <div class="tcc-invoice-pill-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
              <span>INVOICE</span>
            </div>

            <div class="tcc-inv-meta-list">
              <div class="tcc-inv-meta-item">
                <span class="lbl">Invoice No</span>
                <span class="colon">:</span>
                <span class="val"><strong>${this.escapeHtml(invNum)}</strong></span>
              </div>
              <div class="tcc-inv-meta-item">
                <span class="lbl">Date</span>
                <span class="colon">:</span>
                <span class="val"><strong>${this.escapeHtml(invDate)}</strong></span>
              </div>
            </div>

            <div class="tcc-billto-card">
              <div class="tcc-billto-tab">Bill To</div>
              <div class="tcc-billto-body">
                <div class="tcc-client-company">${this.escapeHtml(clientName)}</div>
                <div class="tcc-client-row">
                  <span class="lbl">Contact No</span>
                  <span class="colon">:</span>
                  <span class="val"><strong>${this.escapeHtml(phone)}</strong></span>
                </div>
                <div class="tcc-client-row">
                  <span class="lbl">Address</span>
                  <span class="colon">:</span>
                  <span class="val">${this.escapeHtml(address)}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Col 2: Payment / Contact -->
          <div class="tcc-meta-col-card">
            <div class="tcc-card-header">Payment / Contact</div>
            <div class="tcc-card-body tcc-payment-body">
              <div class="tcc-person-item">
                <div class="tcc-round-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#0284c7"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                <strong>Kuberamoorthy</strong>
              </div>
              <div class="tcc-person-item">
                <div class="tcc-round-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#0284c7"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.41 11.41 0 0 0 3.58.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.41 11.41 0 0 0 .57 3.58 1 1 0 0 1-.25 1.02l-2.2 2.19z"/></svg>
                </div>
                <strong>8248688471</strong>
              </div>
              <div class="tcc-queries-subtext">(For any queries / support)</div>
            </div>
          </div>

          <!-- Col 3: Project Details -->
          <div class="tcc-meta-col-card">
            <div class="tcc-card-header">Project Details</div>
            <div class="tcc-card-body tcc-project-body">
              <div class="tcc-project-row">
                <span class="lbl">Project Name</span>
                <span class="colon">:</span>
                <span class="val"><strong>${this.escapeHtml(projectName)}</strong></span>
              </div>
              <div class="tcc-project-row">
                <span class="lbl">Project Type</span>
                <span class="colon">:</span>
                <span class="val"><strong>${this.escapeHtml(projectType)}</strong></span>
              </div>
              <div class="tcc-project-row">
                <span class="lbl">Category</span>
                <span class="colon">:</span>
                <span class="val"><strong>${this.escapeHtml(category)}</strong></span>
              </div>
              <div class="tcc-project-row">
                <span class="lbl">Reference</span>
                <span class="colon">:</span>
                <span class="val"><strong>${this.escapeHtml(reference)}</strong></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Itemized Description Table -->
        <div class="tcc-table-wrapper">
          <table class="tcc-items-table">
            <thead>
              <tr>
                <th class="th-sno" style="width:48px;">S.No</th>
                <th class="th-desc">Description</th>
                <th class="th-amount" style="width:160px;">Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Amount In Words & Totals Box -->
        <div class="tcc-words-totals-grid">
          <!-- Left: Amount in Words -->
          <div class="tcc-words-box">
            <div class="tcc-wallet-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#0284c7"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
            </div>
            <div class="tcc-words-content">
              <div class="tcc-words-title">Amount in Words :</div>
              <div class="tcc-words-val">${this.escapeHtml(amountInWords)}</div>
            </div>
          </div>

          <!-- Right: Totals -->
          <div class="tcc-totals-box">
            <div class="tcc-total-line">
              <span class="lbl">Total Amount</span>
              <span class="colon">:</span>
              <span class="val">₹ ${amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
            </div>
            <div class="tcc-total-line">
              <span class="lbl">Less Discount</span>
              <span class="colon">:</span>
              <span class="val">₹ ${discount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
            </div>
            <div class="tcc-net-amount-banner">
              <span class="lbl">Net Amount</span>
              <span class="colon">:</span>
              <span class="val">₹ ${netAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>

        <!-- Bottom Terms, QR Code & Signature / Seal -->
        <div class="tcc-bottom-grid">
          <!-- Terms & Conditions -->
          <div class="tcc-terms-section">
            <div class="tcc-terms-title">Terms & Conditions</div>
            <ul class="tcc-terms-list">
              ${termsHtml}
            </ul>
            <div class="tcc-thank-you-script">Thank you for your business!</div>
          </div>

          <!-- Center QR Code to Scan & Pay / Verify Bill (Replaces Barcode) -->
          <div class="tcc-qrcode-col">
            <div class="tcc-qrcode-wrap" title="Scan QR Code to pay via Google Pay, PhonePe, Paytm or UPI" onclick="app.showQrModal('${order.id}')">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=2&data=${encodeURIComponent(qrData)}" 
                   alt="UPI QR Code - Tech Code Creations" 
                   class="tcc-qr-img" 
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
              <!-- Offline High-Definition SVG QR Fallback -->
              <svg class="tcc-qr-svg" style="display:none;" viewBox="0 0 100 100" fill="#0f172a" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="28" height="28" rx="3" fill="none" stroke="#0284c7" stroke-width="4" />
                <rect x="11" y="11" width="14" height="14" rx="1.5" fill="#0284c7" />
                <rect x="68" y="4" width="28" height="28" rx="3" fill="none" stroke="#0284c7" stroke-width="4" />
                <rect x="75" y="11" width="14" height="14" rx="1.5" fill="#0284c7" />
                <rect x="4" y="68" width="28" height="28" rx="3" fill="none" stroke="#0284c7" stroke-width="4" />
                <rect x="11" y="75" width="14" height="14" rx="1.5" fill="#0284c7" />
                <rect x="36" y="8" width="4" height="4" fill="#0369a1"/>
                <rect x="44" y="8" width="4" height="4" fill="#0369a1"/>
                <rect x="52" y="8" width="4" height="4" fill="#0369a1"/>
                <rect x="60" y="8" width="4" height="4" fill="#0369a1"/>
                <rect x="8" y="36" width="4" height="4" fill="#0369a1"/>
                <rect x="8" y="44" width="4" height="4" fill="#0369a1"/>
                <rect x="8" y="52" width="4" height="4" fill="#0369a1"/>
                <rect x="8" y="60" width="4" height="4" fill="#0369a1"/>
                <rect x="68" y="68" width="14" height="14" rx="2" fill="none" stroke="#0284c7" stroke-width="3" />
                <rect x="73" y="73" width="4" height="4" fill="#0284c7" />
                <rect x="36" y="20" width="8" height="4" fill="#0f172a"/>
                <rect x="48" y="20" width="4" height="8" fill="#0f172a"/>
                <rect x="56" y="20" width="6" height="4" fill="#0f172a"/>
                <rect x="36" y="36" width="12" height="12" rx="2" fill="#0284c7"/>
                <rect x="52" y="36" width="4" height="4" fill="#0f172a"/>
                <rect x="60" y="36" width="8" height="4" fill="#0f172a"/>
                <rect x="52" y="44" width="8" height="8" fill="#0f172a"/>
                <rect x="64" y="44" width="4" height="8" fill="#0f172a"/>
                <rect x="36" y="52" width="6" height="6" fill="#0f172a"/>
                <rect x="46" y="52" width="4" height="8" fill="#0f172a"/>
                <rect x="54" y="56" width="8" height="4" fill="#0f172a"/>
                <rect x="36" y="64" width="4" height="8" fill="#0f172a"/>
                <rect x="44" y="68" width="8" height="4" fill="#0f172a"/>
                <rect x="56" y="64" width="6" height="8" fill="#0f172a"/>
                <rect x="36" y="76" width="8" height="4" fill="#0f172a"/>
                <rect x="48" y="76" width="4" height="8" fill="#0f172a"/>
                <rect x="36" y="84" width="14" height="4" fill="#0f172a"/>
                <rect x="54" y="84" width="8" height="4" fill="#0f172a"/>
                <rect x="86" y="36" width="4" height="8" fill="#0f172a"/>
                <rect x="74" y="48" width="8" height="4" fill="#0f172a"/>
                <rect x="86" y="52" width="4" height="10" fill="#0f172a"/>
              </svg>
              <div class="tcc-qr-scan-pill">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                <span>SCAN TO PAY (UPI)</span>
              </div>
              <div class="tcc-qr-upi-info">UPI ID: <strong>8248688471@upi</strong></div>
            </div>
          </div>

          <!-- Official Stamp Seal & Signature -->
          <div class="tcc-sign-seal-section">
            <div class="tcc-for-title">For Tech Code Creations</div>
            
            <div class="tcc-sign-seal-flex">
              <!-- Digital Signature -->
              <div class="tcc-signature-wrap">
                <img src="signature.png" alt="Authorized Signature" class="tcc-signature-img">
                <div class="tcc-sign-line-rule"></div>
                <div class="tcc-authorized-sign-text">Authorized Signature</div>
              </div>

              <!-- Official Seal Stamp -->
              <div class="tcc-seal-stamp-wrap">
                <svg class="tcc-seal-svg" viewBox="0 0 120 120" width="95" height="95" xmlns="http://www.w3.org/2000/svg">
                  <!-- Outer Double Ring -->
                  <circle cx="60" cy="60" r="56" fill="#f8fafc" stroke="#0284c7" stroke-width="2.5" />
                  <circle cx="60" cy="60" r="49" fill="none" stroke="#0284c7" stroke-width="1.2" stroke-dasharray="3,2" />
                  <circle cx="60" cy="60" r="45" fill="#ffffff" stroke="#0284c7" stroke-width="1.5" />

                  <!-- Circular Path for Top & Bottom Text -->
                  <defs>
                    <path id="sealTopArc" d="M 22,60 A 38,38 0 0,1 98,60" fill="none" />
                    <path id="sealBottomArc" d="M 98,60 A 38,38 0 0,1 22,60" fill="none" />
                  </defs>

                  <text font-family="'Segoe UI', Roboto, sans-serif" font-size="8.2" font-weight="800" fill="#0284c7" letter-spacing="1.2">
                    <textPath href="#sealTopArc" startOffset="50%" text-anchor="middle">
                      ★ TECH CODE CREATIONS ★
                    </textPath>
                  </text>

                  <text font-family="'Segoe UI', Roboto, sans-serif" font-size="8.5" font-weight="800" fill="#0284c7" letter-spacing="2">
                    <textPath href="#sealBottomArc" startOffset="50%" text-anchor="middle">
                      KUMBAKONAM
                    </textPath>
                  </text>

                  <!-- Inner Monogram TC Logo with Digital Pixels -->
                  <g transform="translate(42, 42) scale(0.6)">
                    <rect x="0" y="0" width="60" height="60" rx="8" fill="#e0f2fe" opacity="0.6"/>
                    <path d="M12 18 H48 V26 H34 V48 H26 V26 H12 Z" fill="#0284c7"/>
                    <rect x="42" y="10" width="6" height="6" fill="#38bdf8"/>
                    <rect x="50" y="16" width="6" height="6" fill="#0369a1"/>
                    <rect x="44" y="24" width="5" height="5" fill="#38bdf8"/>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="no-print" style="display:flex; justify-content:center; gap:14px; margin-top:24px;">
        <button class="btn btn-primary" onclick="window.print()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          <span>Print / Save as PDF</span>
        </button>
        <a href="https://wa.me/91${phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Hello ${clientName}! Here is your official invoice (${invNum}) from Tech Code Creations. Total: ₹${netAmount}. Thank you!`)}" target="_blank" class="btn btn-secondary" style="color:#16a34a; border-color:#86efac; gap:8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          <span>Share Bill on WhatsApp</span>
        </a>
        <button class="btn btn-secondary" onclick="closeModal('billModal')">
          Close
        </button>
      </div>
    `;

    modal.classList.add("active");
  }

  viewOrderDetails(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById("adminOrderDetailsModal");
    const body = document.getElementById("adminOrderDetailsContent");
    if (!modal || !body) return;

    body.innerHTML = `
      <div style="margin-bottom: 20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
          <span class="order-id-badge" style="font-size: 1rem;">${order.id}</span>
          <span class="status-badge status-${order.status.toLowerCase().replace(' ', '')}">${order.status}</span>
        </div>
        <p style="font-size: 0.84rem; color: var(--text-secondary);">Booked On: <strong>${order.date}</strong></p>
      </div>

      <div class="order-receipt-box">
        <div class="receipt-row">
          <span class="receipt-label">Client Name:</span>
          <span class="receipt-value">${this.escapeHtml(order.clientName)}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Contact Phone:</span>
          <span class="receipt-value"><a href="tel:${order.phone}" style="color:var(--primary-blue);">${order.phone}</a></span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Email:</span>
          <span class="receipt-value">${this.escapeHtml(order.email)}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Business:</span>
          <span class="receipt-value">${this.escapeHtml(order.businessName)}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Website Type:</span>
          <span class="receipt-value">${this.escapeHtml(order.websiteType)}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Timeline:</span>
          <span class="receipt-value">${this.escapeHtml(order.timeline)}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Bill Amount:</span>
          <span class="receipt-value" style="font-weight:700; color:#0f172a;">₹${Number(order.netAmount !== undefined ? order.netAmount : (order.billAmount || 0)).toLocaleString('en-IN')}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Project Cost:</span>
          <span class="receipt-value" style="font-weight:600; color:#e11d48;">₹${Number(order.costAmount !== undefined ? order.costAmount : (order.projectCost || 0)).toLocaleString('en-IN')}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Net Profit:</span>
          <span class="receipt-value" style="font-weight:700; color:#16a34a;">
            ₹${Number(order.profitAmount !== undefined ? order.profitAmount : Math.max(0, (order.netAmount || order.billAmount || 0) - (order.costAmount || 0))).toLocaleString('en-IN')}
            <span style="font-size:0.75rem; background:#dcfce7; padding:2px 6px; border-radius:6px; margin-left:4px;">
              ${(order.netAmount || order.billAmount) ? (((order.profitAmount !== undefined ? order.profitAmount : Math.max(0, (order.netAmount || order.billAmount || 0) - (order.costAmount || 0))) / (order.netAmount || order.billAmount)) * 100).toFixed(0) : 0}% Margin
            </span>
          </span>
        </div>
      </div>

      <div style="margin: 20px 0;">
        <h5 style="margin-bottom: 8px;">Features Selected:</h5>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          ${order.features.map(f => `<span class="tech-tag" style="color:var(--primary-blue); background:#eff6ff;">${this.escapeHtml(f)}</span>`).join('')}
        </div>
      </div>

      <div style="margin: 20px 0;">
        <h5 style="margin-bottom: 8px;">Project Requirements:</h5>
        <p style="background:var(--bg-surface); padding:14px; border-radius:var(--radius-sm); border:1px solid var(--border-color); font-size:0.9rem; line-height:1.6;">
          ${this.escapeHtml(order.details)}
        </p>
      </div>

      <div style="display:flex; gap:12px; margin-top:24px;">
        <button class="btn btn-primary" onclick="app.generateBill('${order.id}'); closeModal('adminOrderDetailsModal');">
          📄 Generate Official Bill
        </button>
        <a class="btn btn-secondary" href="tel:${order.phone}">
          Call Customer
        </a>
      </div>
    `;

    modal.classList.add("active");
  }

  deleteOrder(orderId) {
    if (confirm(`Are you sure you want to delete order ${orderId}?`)) {
      this.orders = this.orders.filter(o => o.id !== orderId);
      this.saveOrders();
      this.showToast(`Order ${orderId} deleted.`, "info");
    }
  }

  getNextInvoiceNumber() {
    const currentYear = new Date().getFullYear();
    let maxSeq = 0;
    
    if (Array.isArray(this.orders)) {
      this.orders.forEach(o => {
        const inv = o.invoiceNo || o.id || "";
        const match = inv.match(/TCC[\/-]\d{4}[\/-](\d+)/i) || inv.match(/TCC[\/-](\d+)/i);
        if (match && match[1]) {
          const seq = parseInt(match[1], 10);
          if (!isNaN(seq) && seq > maxSeq && seq < 10000) {
            maxSeq = seq;
          }
        }
      });
    }
    
    const nextSeq = maxSeq + 1;
    const padded = String(nextSeq).padStart(3, "0");
    return `TCC/${currentYear}/${padded}`;
  }

  getTodayFormattedDate() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  openManualBillModal() {
    this.prepareManualBillModal();
    const modal = document.getElementById("manualOrderModal");
    if (modal) modal.classList.add("active");
  }

  prepareManualBillModal(forceNew = false) {
    const form = document.getElementById("manualOrderForm");
    if (!form) return;

    if (forceNew) {
      form.reset();
      if (form.manualDiscount) form.manualDiscount.value = "0";
      if (form.manualCost) form.manualCost.value = "0";
      if (form.manualAmount) form.manualAmount.value = "";
      if (form.manualAddress) form.manualAddress.value = "Kumbakonam, Tamil Nadu";
      if (form.manualCategory) form.manualCategory.value = "Web Development";
      if (form.manualReference) form.manualReference.value = "Invoice";
      if (form.manualType) form.manualType.value = "Website Development";
      if (form.manualProjectName) form.manualProjectName.value = "";
      if (form.manualName) form.manualName.value = "";
      if (form.manualPhone) form.manualPhone.value = "";

      const tbody = document.getElementById("manualBillItemsBody");
      if (tbody) {
        tbody.innerHTML = `
          <tr class="manual-item-row" data-index="1">
            <td class="td-sno">1</td>
            <td class="td-desc">
              <input type="text" name="manualDescription" id="manualDescription" class="tcc-invoice-form-input item-desc-input" placeholder="Service description (e.g. Website Development Service)" style="font-weight:800; font-size:0.95rem; margin-bottom:4px;">
              <input type="text" name="manualSubDescription" id="manualSubDescription" class="tcc-invoice-form-input item-subdesc-input" placeholder="Sub-description (e.g. Client Name – Project Name)" style="font-size:0.8rem; color:#475569;">
            </td>
            <td class="td-amount">
              <input type="number" name="manualAmount" id="manualAmount" class="tcc-invoice-form-input item-amount-input" placeholder="25000" min="0" step="any" required style="font-size:1.15rem; font-weight:900; color:#0f172a; text-align:right;">
            </td>
            <td class="td-action" style="text-align:center;">
              <button type="button" class="btn-remove-item" onclick="app.removeBillItemRow(this)" title="Delete this item" disabled style="opacity:0.35; cursor:default;">✕</button>
            </td>
          </tr>
        `;
      }
    }

    if (form.manualInvoiceNo && (!form.manualInvoiceNo.value || forceNew)) {
      form.manualInvoiceNo.value = this.getNextInvoiceNumber();
    }
    if (form.manualDate && (!form.manualDate.value || forceNew)) {
      form.manualDate.value = this.getTodayFormattedDate();
    }

    const nextBillBadge = document.getElementById("nextBillNoHeaderBadge");
    if (nextBillBadge && form.manualInvoiceNo) {
      nextBillBadge.textContent = form.manualInvoiceNo.value;
    }

    this.bindManualItemListeners();
    this.syncManualDescriptions();
    this.updateManualBillLivePreview();
  }

  bindManualItemListeners() {
    const tbody = document.getElementById("manualBillItemsBody");
    if (!tbody) return;
    const amountInputs = tbody.querySelectorAll(".item-amount-input");
    amountInputs.forEach(input => {
      input.addEventListener("input", () => this.updateManualBillLivePreview());
    });
  }

  addBillItemRow(desc = "", subDesc = "", amount = "") {
    const tbody = document.getElementById("manualBillItemsBody");
    if (!tbody) return;

    const rowCount = tbody.querySelectorAll("tr").length + 1;
    const tr = document.createElement("tr");
    tr.className = "manual-item-row";
    tr.innerHTML = `
      <td class="td-sno">${rowCount}</td>
      <td class="td-desc">
        <input type="text" class="tcc-invoice-form-input item-desc-input" placeholder="Additional service (e.g. Domain, Hosting, Maintenance, Feature...)" value="${this.escapeHtml(desc)}" style="font-weight:800; font-size:0.95rem; margin-bottom:4px;">
        <input type="text" class="tcc-invoice-form-input item-subdesc-input" placeholder="Sub-description (optional details / specifications)" value="${this.escapeHtml(subDesc)}" style="font-size:0.8rem; color:#475569;">
      </td>
      <td class="td-amount">
        <input type="number" class="tcc-invoice-form-input item-amount-input" placeholder="0" min="0" step="any" value="${amount}" required style="font-size:1.15rem; font-weight:900; color:#0f172a; text-align:right;">
      </td>
      <td class="td-action" style="text-align:center;">
        <button type="button" class="btn-remove-item" onclick="app.removeBillItemRow(this)" title="Delete this item">✕</button>
      </td>
    `;
    tbody.appendChild(tr);

    const amtInput = tr.querySelector(".item-amount-input");
    if (amtInput) {
      amtInput.addEventListener("input", () => this.updateManualBillLivePreview());
    }
    const descInput = tr.querySelector(".item-desc-input");
    if (descInput) {
      descInput.focus();
    }

    this.reindexBillItemRows();
    this.updateManualBillLivePreview();
    this.showToast(`Added Line Item #${rowCount} to bill.`, "info");
  }

  removeBillItemRow(btn) {
    const row = btn.closest("tr");
    const tbody = document.getElementById("manualBillItemsBody");
    if (row && tbody) {
      if (tbody.querySelectorAll("tr").length > 1) {
        row.remove();
        this.reindexBillItemRows();
        this.updateManualBillLivePreview();
        this.showToast("Removed line item.", "info");
      } else {
        this.showToast("At least one line item is required in the bill.", "info");
      }
    }
  }

  reindexBillItemRows() {
    const tbody = document.getElementById("manualBillItemsBody");
    if (!tbody) return;
    const rows = tbody.querySelectorAll("tr");
    rows.forEach((r, idx) => {
      const snoCell = r.querySelector(".td-sno");
      if (snoCell) snoCell.textContent = idx + 1;
      const removeBtn = r.querySelector(".btn-remove-item");
      if (removeBtn) {
        if (rows.length === 1) {
          removeBtn.disabled = true;
          removeBtn.style.opacity = "0.35";
          removeBtn.style.cursor = "default";
        } else {
          removeBtn.disabled = false;
          removeBtn.style.opacity = "1";
          removeBtn.style.cursor = "pointer";
        }
      }
    });
  }

  updateManualBillLivePreview() {
    const form = document.getElementById("manualOrderForm");
    if (!form) return;

    let amount = 0;
    const amountInputs = form.querySelectorAll(".item-amount-input");
    amountInputs.forEach(input => {
      amount += parseFloat(input.value) || 0;
    });
    if (amountInputs.length === 0 && form.manualAmount) {
      amount = parseFloat(form.manualAmount.value) || 0;
    }

    const discount = parseFloat(form.manualDiscount ? form.manualDiscount.value : 0) || 0;
    const netAmount = Math.max(0, amount - discount);

    const totalDisplay = document.getElementById("liveTotalDisplay");
    if (totalDisplay) {
      totalDisplay.textContent = "₹ " + amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    const wordsElem = document.getElementById("liveAmountInWords");
    if (wordsElem) {
      wordsElem.textContent = convertNumberToIndianWords(netAmount);
    }

    const netElem = document.getElementById("liveNetAmount");
    if (netElem) {
      netElem.textContent = "₹ " + netAmount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  }

  syncManualDescriptions() {
    const form = document.getElementById("manualOrderForm");
    if (!form) return;

    const clientName = form.manualName ? form.manualName.value.trim() : "";
    const projectName = form.manualProjectName ? form.manualProjectName.value.trim() : "";
    const projectType = form.manualType ? form.manualType.value : "Website Development";

    const firstDescInput = form.querySelector(".item-desc-input");
    const firstSubDescInput = form.querySelector(".item-subdesc-input");

    if (firstDescInput && !firstDescInput.dataset.userEdited) {
      firstDescInput.value = projectName ? `${projectName} Service` : (projectType ? `${projectType} Service` : "");
    }

    if (firstSubDescInput && !firstSubDescInput.dataset.userEdited) {
      if (clientName && projectName) {
        firstSubDescInput.value = `${clientName} – ${projectName}`;
      } else if (clientName) {
        firstSubDescInput.value = `${clientName} – ${projectType}`;
      } else if (projectName) {
        firstSubDescInput.value = `(${projectName})`;
      } else {
        firstSubDescInput.value = "";
      }
    }
  }

  handleManualOrderSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const invoiceNo = form.manualInvoiceNo && form.manualInvoiceNo.value.trim() ? form.manualInvoiceNo.value.trim() : this.getNextInvoiceNumber();
    const dateFormatted = form.manualDate && form.manualDate.value.trim() ? form.manualDate.value.trim() : this.getTodayFormattedDate();
    const clientName = form.manualName ? form.manualName.value.trim() : "";
    const phone = form.manualPhone ? form.manualPhone.value.trim() : "";
    const address = form.manualAddress && form.manualAddress.value.trim() ? form.manualAddress.value.trim() : "-";
    const projectName = form.manualProjectName && form.manualProjectName.value.trim() ? form.manualProjectName.value.trim() : "Website Project";
    const websiteType = form.manualType ? form.manualType.value : "Website Development";
    const category = form.manualCategory && form.manualCategory.value.trim() ? form.manualCategory.value.trim() : "Web Development";
    const reference = form.manualReference && form.manualReference.value.trim() ? form.manualReference.value.trim() : "Invoice";
    
    // Collect all items from the multi-item table
    const itemRows = form.querySelectorAll("#manualBillItemsBody tr");
    const items = [];
    itemRows.forEach(row => {
      const descInput = row.querySelector(".item-desc-input");
      const subDescInput = row.querySelector(".item-subdesc-input");
      const amtInput = row.querySelector(".item-amount-input");
      const descVal = descInput ? descInput.value.trim() : "";
      const subDescVal = subDescInput ? subDescInput.value.trim() : "";
      const amtVal = parseFloat(amtInput ? amtInput.value : 0) || 0;
      if (descVal || amtVal > 0) {
        items.push({
          description: descVal || "Service Item",
          subDescription: subDescVal,
          amount: amtVal
        });
      }
    });

    if (items.length === 0) {
      const fallbackAmount = parseFloat(form.manualAmount ? form.manualAmount.value : 0) || 0;
      items.push({
        description: `${projectName} Service`,
        subDescription: `${clientName} – ${projectName}`,
        amount: fallbackAmount
      });
    }

    const billAmount = items.reduce((sum, it) => sum + (it.amount || 0), 0);
    const discountAmount = parseFloat(form.manualDiscount ? form.manualDiscount.value : 0) || 0;
    const costAmount = parseFloat(form.manualCost ? form.manualCost.value : 0) || 0;
    const netAmount = Math.max(0, billAmount - discountAmount);
    const profitAmount = Math.max(0, netAmount - costAmount);
    const profitMargin = netAmount > 0 ? Number(((profitAmount / netAmount) * 100).toFixed(1)) : 0;

    if (!clientName || !phone) {
      this.showToast("Customer name and phone number are required.", "error");
      return;
    }
    if (billAmount <= 0) {
      this.showToast("Please enter at least one item with a valid bill amount.", "error");
      return;
    }

    const orderId = invoiceNo ? invoiceNo.replace(/\//g, "-") : `TCC-2026-${Math.floor(100 + Math.random() * 900)}`;

    const termsText = form.manualTerms ? form.manualTerms.value.trim() : "";
    const terms = termsText
      ? termsText.split("\n").map(t => t.trim()).filter(Boolean)
      : [
          "Payment to be made within 7 days from the date of invoice.",
          `Services provided for the ${projectName} project.`,
          "For any queries, please contact us."
        ];

    const newOrder = {
      id: orderId,
      invoiceNo: invoiceNo,
      date: dateFormatted,
      clientName: clientName,
      phone: phone,
      email: `${clientName.toLowerCase().replace(/[^a-z0-9]/g, "")}@gmail.com`,
      address: address,
      businessName: clientName,
      websiteType: websiteType,
      projectName: projectName,
      projectType: websiteType,
      category: category,
      reference: reference,
      items: items,
      itemDescription: items[0].description,
      itemSubDescription: items[0].subDescription,
      timeline: "Completed",
      features: [websiteType, reference],
      details: items.map(it => it.description).join(", "),
      status: "Completed",
      notes: "Official real bill created.",
      billAmount: billAmount,
      discountAmount: discountAmount,
      costAmount: costAmount,
      netAmount: netAmount,
      profitAmount: profitAmount,
      profitMargin: profitMargin,
      paidAmount: netAmount,
      paymentStatus: "PAID",
      terms: terms
    };

    // Replace if exists with same ID, or unshift
    const existingIndex = this.orders.findIndex(o => o.id === orderId || o.invoiceNo === invoiceNo);
    if (existingIndex >= 0) {
      this.orders[existingIndex] = newOrder;
    } else {
      this.orders.unshift(newOrder);
    }

    this.saveOrders();
    const modal = document.getElementById("manualOrderModal");
    if (modal) modal.classList.remove("active");
    this.showToast(`Official bill ${invoiceNo} created successfully!`, "success");

    // Immediately display the generated official invoice to the user!
    this.generateBill(newOrder.id);
  }

  autoChangeBillNumber() {
    const invInput = document.getElementById("manualInvoiceNo");
    if (!invInput) return;

    const currentYear = new Date().getFullYear();
    let currentVal = invInput.value.trim();
    let nextNum = 1;

    const match = currentVal.match(/TCC[\/-](\d{4})[\/-](\d+)/i) || currentVal.match(/TCC[\/-](\d+)/i);
    if (match) {
      const parsedSeq = parseInt(match[2] || match[1], 10);
      if (!isNaN(parsedSeq)) {
        nextNum = parsedSeq + 1;
      }
    } else {
      const def = this.getNextInvoiceNumber();
      const defMatch = def.match(/TCC\/\d{4}\/(\d+)/);
      nextNum = defMatch ? parseInt(defMatch[1], 10) : 1;
    }

    const padded = String(nextNum).padStart(3, "0");
    const newInvoiceNo = `TCC/${currentYear}/${padded}`;
    invInput.value = newInvoiceNo;

    // Visual pulse feedback on input field
    invInput.style.transition = "all 0.3s ease";
    invInput.style.backgroundColor = "#bae6fd";
    invInput.style.borderColor = "#0284c7";
    invInput.style.boxShadow = "0 0 0 3px rgba(2, 132, 199, 0.35)";
    setTimeout(() => {
      invInput.style.backgroundColor = "#f0f9ff";
      invInput.style.boxShadow = "none";
    }, 600);

    const nextBillBadge = document.getElementById("nextBillNoHeaderBadge");
    if (nextBillBadge) {
      nextBillBadge.textContent = newInvoiceNo;
    }

    this.showToast(`⚡ Auto changed Bill Number to: ${newInvoiceNo}`, "success");
  }

  showQrModal(orderId) {
    let order = null;
    if (orderId && orderId !== "sample") {
      order = this.orders.find(o => o.id === orderId || o.invoiceNo === orderId);
    }
    if (!order && this.orders.length > 0) {
      order = this.orders[0];
    }

    const modal = document.getElementById("qrModal") || document.getElementById("barcodeModal");
    const container = document.getElementById("qrModalContent") || document.getElementById("barcodeModalContent");
    if (!modal || !container) return;

    const invNo = order ? (order.invoiceNo || order.id) : "TCC/2026/001";
    const client = order ? order.clientName : "Official Verified Bill";
    const amt = order ? (order.netAmount !== undefined ? order.netAmount : (order.billAmount || 0)) : 25000;
    const date = order ? order.date : this.getTodayFormattedDate();
    const upiId = "8248688471@upi";
    const upiName = "Tech Code Creations";
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${amt}&cu=INR&tn=${encodeURIComponent(`Bill_${invNo}`)}`;
    const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=2&data=${encodeURIComponent(upiUrl)}`;

    container.innerHTML = `
      <div style="background:#ffffff; border:2px dashed #0284c7; border-radius:14px; padding:20px; text-align:center; margin-bottom:16px;">
        <div style="font-size:0.78rem; font-weight:800; color:#0284c7; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:12px;">
          ★ TECH CODE CREATIONS OFFICIAL BILL QR CODE ★
        </div>
        
        <div style="background:#ffffff; padding:12px; border-radius:12px; display:inline-block; box-shadow:0 4px 14px rgba(2, 132, 199, 0.12); border:1px solid #e0f2fe;">
          <img src="${qrImgSrc}" 
               alt="Scan to Pay via UPI" 
               style="width:160px; height:160px; display:block; border-radius:8px;"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
          <svg class="tcc-qr-svg" style="display:none; width:160px; height:160px;" viewBox="0 0 100 100" fill="#0f172a" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="28" height="28" rx="3" fill="none" stroke="#0284c7" stroke-width="4" />
            <rect x="11" y="11" width="14" height="14" rx="1.5" fill="#0284c7" />
            <rect x="68" y="4" width="28" height="28" rx="3" fill="none" stroke="#0284c7" stroke-width="4" />
            <rect x="75" y="11" width="14" height="14" rx="1.5" fill="#0284c7" />
            <rect x="4" y="68" width="28" height="28" rx="3" fill="none" stroke="#0284c7" stroke-width="4" />
            <rect x="11" y="75" width="14" height="14" rx="1.5" fill="#0284c7" />
            <rect x="36" y="8" width="4" height="4" fill="#0369a1"/>
            <rect x="44" y="8" width="4" height="4" fill="#0369a1"/>
            <rect x="52" y="8" width="4" height="4" fill="#0369a1"/>
            <rect x="60" y="8" width="4" height="4" fill="#0369a1"/>
            <rect x="8" y="36" width="4" height="4" fill="#0369a1"/>
            <rect x="8" y="44" width="4" height="4" fill="#0369a1"/>
            <rect x="8" y="52" width="4" height="4" fill="#0369a1"/>
            <rect x="8" y="60" width="4" height="4" fill="#0369a1"/>
            <rect x="68" y="68" width="14" height="14" rx="2" fill="none" stroke="#0284c7" stroke-width="3" />
            <circle cx="50" cy="50" r="10" fill="#0284c7" />
            <rect x="38" y="42" width="6" height="16" fill="#0284c7"/>
            <rect x="56" y="42" width="6" height="16" fill="#0284c7"/>
            <rect x="42" y="38" width="16" height="6" fill="#0284c7"/>
            <rect x="42" y="56" width="16" height="6" fill="#0284c7"/>
            <rect x="36" y="72" width="4" height="4" fill="#0369a1"/>
            <rect x="44" y="80" width="4" height="4" fill="#0369a1"/>
            <rect x="52" y="72" width="4" height="4" fill="#0369a1"/>
            <rect x="60" y="80" width="4" height="4" fill="#0369a1"/>
            <rect x="76" y="40" width="4" height="4" fill="#0369a1"/>
            <rect x="84" y="48" width="4" height="4" fill="#0369a1"/>
          </svg>
          <div style="font-size:0.72rem; font-weight:700; color:#0284c7; letter-spacing:0.04em; text-transform:uppercase; margin-top:8px;">
            ⚡ SCAN & PAY VIA UPI
          </div>
          <div style="font-size:0.75rem; color:#475569; font-weight:600; margin-top:2px;">
            UPI ID: <span style="color:#0f172a; font-family:monospace; font-weight:700;">${upiId}</span>
          </div>
        </div>

        <div style="margin-top:14px; text-align:left; background:#f8fafc; border-radius:10px; padding:12px 14px; font-size:0.88rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span style="color:#64748b; font-weight:600;">Invoice No:</span>
            <strong style="color:#0284c7; font-family:monospace;">${invNo}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span style="color:#64748b; font-weight:600;">Customer:</span>
            <strong>${this.escapeHtml(client)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span style="color:#64748b; font-weight:600;">Date:</span>
            <span>${date}</span>
          </div>
          <div style="display:flex; justify-content:space-between; border-top:1px dashed #cbd5e1; padding-top:6px; margin-top:6px;">
            <span style="font-weight:700; color:#0f172a;">Net Payable Amount:</span>
            <strong style="font-size:1.05rem; color:#15803d;">₹ ${Number(amt).toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong>
          </div>
        </div>
      </div>

      <div style="display:flex; gap:10px; justify-content:center;">
        ${order ? `
          <button class="btn btn-primary" onclick="closeModal('qrModal'); closeModal('barcodeModal'); app.generateBill('${order.id}');" style="flex:1;">
            📄 Show Full Bill
          </button>
        ` : `
          <button class="btn btn-primary" onclick="closeModal('qrModal'); closeModal('barcodeModal'); app.openManualBillModal();" style="flex:1;">
            + Create This Bill
          </button>
        `}
        <button class="btn btn-secondary" onclick="navigator.clipboard.writeText('${invNo}'); app.showToast('Copied Bill No ${invNo} to clipboard!', 'success');">
          📋 Copy Bill No
        </button>
      </div>
    `;

    modal.classList.add("active");
  }

  showBarcodeModal(orderId) {
    return this.showQrModal(orderId);
  }


  exportOrdersToCSV() {
    if (this.orders.length === 0) {
      this.showToast("No orders available to export.", "error");
      return;
    }

    const headers = ["Order ID", "Date", "Client Name", "Phone", "Email", "Business Name", "Website Type", "Amount", "Status", "Requirements"];
    const rows = this.orders.map(o => [
      `"${o.id}"`,
      `"${o.date}"`,
      `"${o.clientName.replace(/"/g, '""')}"`,
      `"${o.phone}"`,
      `"${o.email}"`,
      `"${o.businessName.replace(/"/g, '""')}"`,
      `"${o.websiteType}"`,
      `"${o.billAmount || 15000}"`,
      `"${o.status}"`,
      `"${(o.details || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TechCodeCreations_Orders_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast("Orders exported successfully as CSV!", "success");
  }

  handleContactSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    const msg = form.message.value.trim();

    const waText = encodeURIComponent(
      `Hello Kuberamoorthy! (Tech Code Creations)\n\n` +
      `👤 Name: ${name}\n` +
      `📱 Phone: ${phone}\n` +
      `💬 Message: ${msg}\n\n` +
      `I would like to discuss building a website.`
    );

    window.open(`https://wa.me/918248688471?text=${waText}`, "_blank");
    this.showToast("Opening WhatsApp to connect directly with Kuberamoorthy.", "success");
    form.reset();
  }

  showToast(message, type = "info") {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    if (type === "success") {
      icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (type === "error") {
      icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    }

    toast.innerHTML = `${icon}<span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-20px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("active");
  if (modalId === "manualOrderModal" && window.app) {
    window.app.prepareManualBillModal();
  }
}

let app;
document.addEventListener("DOMContentLoaded", () => {
  // Hash shortcut for direct admin access
  if (window.location.hash === "#admin" || window.location.hash === "#admin-portal") {
    if (!window.location.pathname.includes("admin.html")) {
      window.location.href = "admin.html";
      return;
    }
  }

  app = new TechCodeApp();

  // Scroll Reveal Animations
  const revealElements = document.querySelectorAll(
    ".reveal-fade-up, .reveal-fade-left, .reveal-fade-right, .reveal-zoom-in"
  );
  if ("IntersectionObserver" in window && revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: "0px 0px -40px 0px",
      threshold: 0.1
    });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add("is-revealed"));
  }

  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("active");
    });
  });
});
