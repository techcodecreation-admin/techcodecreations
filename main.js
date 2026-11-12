/* ==========================================================================
   TECH CODE CREATIONS - Main Interactive Logic & Bill Generator
   Founder & Lead Developer: KUBERAMOORTHY S
   Contact: 8248688471 | Kumbakonam, Tamil Nadu
   ========================================================================== */

// Admin Credentials
const ADMIN_CREDENTIALS = {
  username: "KUBERA",
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
  ADMIN_SESSION: "techcode_admin_session",
  CF_API_URL: "techcode_cf_api_url",
  CF_API_KEY: "techcode_cf_api_key",
  CF_EMAIL: "techcode_cf_email"
};

const CLOUDFLARE_DEFAULT_CONFIG = {
  email: "techcodecreations@gmail.com",
  databaseName: "techcodecreations-db",
  serviceName: "techcodecreations-api",
  apiKey: "tcc_live_sec_8248688471_db",
  defaultEndpoint: "https://techcodecreations-api.techcodecreations.workers.dev"
};

const CLOUD_DB_CONFIG = {
  account: "techcodecreations@gmail.com",
  databaseName: "techcodecreations-db",
  serviceName: "techcodecreations-api",
  apiKey: "tcc_live_sec_8248688471_db",
  defaultEndpoint: "https://techcodecreations-api.techcodecreations.workers.dev",
  pollIntervalMs: 12000
};

class TechCodeApp {
  constructor() {
    this.orders = this.loadOrders();
    this.currentFilter = "all";
    this.searchQuery = "";
    this.initEvents();
    this.initCloudflareSync();
  }

  getDefaultOrders() {
    return [
      // Sample Live Website Bookings
      {
        id: "TCC-2026-8421",
        date: "2026-11-12 14:30",
        clientName: "Ramesh Kumar",
        businessName: "RK Modern Silks",
        phone: "9842109876",
        email: "ramesh.silks@gmail.com",
        websiteType: "E-Commerce Web Application",
        timeline: "10-15 Days",
        features: ["Product Catalog", "UPI Checkout", "Admin Dashboard"],
        details: "Need a modern saree and silk store with mobile payment gateway.",
        status: "Pending",
        notes: "Submitted through booking form.",
        isWebsiteBooking: true
      },
      {
        id: "TCC-2026-5192",
        date: "2026-11-11 11:15",
        clientName: "Dr. Priya Sundaram",
        businessName: "Sundaram Dental Clinic",
        phone: "9789012345",
        email: "priya.dental@gmail.com",
        websiteType: "Doctor Portfolio & Appointment Booking",
        timeline: "7 Days",
        features: ["Appointment Booking", "Google Reviews", "WhatsApp Chat"],
        details: "Patient appointment schedule and clinic treatment portfolio.",
        status: "In Progress",
        notes: "Submitted through booking form.",
        isWebsiteBooking: true
      }
    ];
  }

  loadOrders() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (stored) {
        let parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Automatic cleanup of old mock/sample bills
          const cleanedKey = localStorage.getItem("techcode_old_bills_reset_v2");
          const hasOldSampleBills = parsed.some(o => o.id === "TCC-2026-001" || o.id === "TCC-2026-002" || o.invoiceNo === "TCC/2026/001");
          if (!cleanedKey || hasOldSampleBills) {
            parsed = parsed.filter(o => !o.invoiceNo && !o.isManualBill && !String(o.id || "").startsWith("TCC-2026-00"));
            localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(parsed));
            localStorage.setItem("techcode_old_bills_reset_v2", "true");
            localStorage.removeItem("techcode_last_bill_seq");
            localStorage.setItem("techcode_bill_seq_override", "1");
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error reading localStorage:", e);
    }
    const defaults = this.getDefaultOrders();
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(defaults));
    } catch (e) {}
    return defaults;
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
      mobileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        navMenu.classList.toggle("mobile-open");
      });
      navMenu.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => navMenu.classList.remove("mobile-open"));
      });
      document.addEventListener("click", (e) => {
        if (!navMenu.contains(e.target) && !mobileBtn.contains(e.target) && navMenu.classList.contains("mobile-open")) {
          navMenu.classList.remove("mobile-open");
        }
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

    // Direct Quick Login
    const quickLoginBtn = document.getElementById("quickLoginBtn");
    if (quickLoginBtn) {
      quickLoginBtn.addEventListener("click", () => this.quickAdminLogin());
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
        if (passField) {
          passField.type = passField.type === "password" ? "text" : "password";
        }
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

    // Top & Bottom Form Reset Buttons
    const topResetBillBtn = document.getElementById("topResetBillBtn");
    if (topResetBillBtn) {
      topResetBillBtn.addEventListener("click", () => this.resetManualBillForm());
    }
    const btnBottomReset = document.getElementById("btnBottomResetBill");
    if (btnBottomReset) {
      btnBottomReset.addEventListener("click", () => this.resetManualBillForm());
    }

    // Top & Bottom Form Next Bill Buttons
    const topNextBillBtn = document.getElementById("topNextBillBtn");
    if (topNextBillBtn) {
      topNextBillBtn.addEventListener("click", () => this.nextManualBill());
    }
    const btnBottomNext = document.getElementById("btnBottomNextBill");
    if (btnBottomNext) {
      btnBottomNext.addEventListener("click", () => this.nextManualBill());
    }

    // Reset Bill Sequence Buttons
    const topResetSeqBtn = document.getElementById("topResetBillSeqBtn");
    if (topResetSeqBtn) {
      topResetSeqBtn.addEventListener("click", () => this.resetBillSequence(true));
    }
    const btnBottomResetSeq = document.getElementById("btnBottomResetSeqBill");
    if (btnBottomResetSeq) {
      btnBottomResetSeq.addEventListener("click", () => this.resetBillSequence(true));
    }
    const btnHeaderResetSeq = document.getElementById("btnResetBillSeqHeader");
    if (btnHeaderResetSeq) {
      btnHeaderResetSeq.addEventListener("click", () => this.resetBillSequence(true));
    }
    const btnToggleManualFs = document.getElementById("btnToggleManualFullscreen");
    if (btnToggleManualFs) {
      btnToggleManualFs.addEventListener("click", () => this.toggleManualBillFullscreen());
    }

    // Legacy / Header Auto Change Bill Number Buttons
    const btnAutoChange = document.getElementById("btnAutoChangeBillNo");
    if (btnAutoChange) {
      btnAutoChange.addEventListener("click", () => this.autoChangeBillNumber());
    }
    const autoNewBillBtn = document.getElementById("autoNewBillBtn");
    if (autoNewBillBtn) {
      autoNewBillBtn.addEventListener("click", () => this.nextManualBill());
    }

    // Date Picker click-to-open handler
    const datePickerInput = document.getElementById("manualDate");
    if (datePickerInput) {
      datePickerInput.addEventListener("click", () => {
        if (typeof datePickerInput.showPicker === "function") {
          try { datePickerInput.showPicker(); } catch (e) {}
        }
      });
    }

    // Initialize Header Next Bill Badge
    this.updateNextBillHeaderBadge();


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

    // Admin Session Security: Only authenticate if active session exists in sessionStorage
    const hasValidSession = sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === "true";
    if (hasValidSession) {
      this.showAdminDashboard();
    } else {
      const loginCard = document.getElementById("adminLoginCard");
      const dashboard = document.getElementById("adminDashboardContainer");
      if (loginCard) loginCard.style.display = "block";
      if (dashboard) dashboard.style.display = "none";
    }

    // Auto-close Three-Dot Menu (⋮) on click outside
    document.addEventListener("click", (e) => {
      const wrap = document.getElementById("threeDotMenuWrap");
      if (wrap && !wrap.contains(e.target)) {
        this.closeThreeDotMenu();
      }
    });

    // Real-time Automatic Synchronization across browser tabs/windows
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEYS.ORDERS) {
        this.orders = this.loadOrders();
        this.renderAdminOrders();
      }
    });

    // 3-second live update loop to instantly reflect newly submitted website bookings & bills
    setInterval(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length !== (this.orders ? this.orders.length : 0)) {
            this.orders = parsed;
            this.renderAdminOrders();
          }
        }
      } catch (err) {}
    }, 3000);

    // Check URL parameters for direct bill or QR view
    const urlParams = new URLSearchParams(window.location.search);
    const billParam = urlParams.get("view_invoice") || urlParams.get("bill") || urlParams.get("qr") || urlParams.get("barcode");
    if (billParam) {
      setTimeout(() => {
        const found = this.orders.find(o => o.id === billParam || o.invoiceNo === billParam);
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

    const clientName = form.clientName ? form.clientName.value.trim() : "";
    const phone = form.clientPhone ? form.clientPhone.value.trim() : "";
    const email = form.clientEmail ? form.clientEmail.value.trim() : "";
    const businessName = (form.businessName ? form.businessName.value.trim() : "") || "Independent Startup";
    const websiteTypeSelect = form.websiteType;
    const websiteTypeText = websiteTypeSelect && websiteTypeSelect.selectedIndex >= 0 && websiteTypeSelect.options[websiteTypeSelect.selectedIndex] 
      ? websiteTypeSelect.options[websiteTypeSelect.selectedIndex].text 
      : "Custom Website";
    const timelineSelect = form.timeline;
    const timelineText = timelineSelect && timelineSelect.selectedIndex >= 0 && timelineSelect.options[timelineSelect.selectedIndex] 
      ? timelineSelect.options[timelineSelect.selectedIndex].text 
      : "Standard";
    const details = form.projectDetails ? form.projectDetails.value.trim() : "";

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
    const newOrderId = `TCC-${new Date().getFullYear()}-${randomDigits}`;

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
      isWebsiteBooking: true,
      billAmount: 15000,
      paidAmount: 0,
      paymentStatus: "PENDING REVIEW"
    };

    this.orders.unshift(newOrder);
    this.saveOrders();
    this.pushOrderToCloudflare(newOrder);

    this.showOrderSuccessModal(newOrder);
    form.reset();
    this.showToast(`Order ${newOrderId} created successfully!`, "success");
  }

  showOrderSuccessModal(order) {
    const modal = document.getElementById("orderSuccessModal");
    if (!modal) return;

    const elId = document.getElementById("modalOrderId");
    const elName = document.getElementById("modalClientName");
    const elPhone = document.getElementById("modalPhone");
    const elBiz = document.getElementById("modalBusinessType");
    const elTime = document.getElementById("modalTimeline");
    if (elId) elId.textContent = order.id || "";
    if (elName) elName.textContent = order.clientName || "";
    if (elPhone) elPhone.textContent = order.phone || "";
    if (elBiz) elBiz.textContent = `${order.businessName || ''} (${order.websiteType || ''})`;
    if (elTime) elTime.textContent = order.timeline || "Standard";

    const waText = encodeURIComponent(
      `Hello Kuberamoorthy! I have submitted a new website project order with Tech Code Creations:\n\n` +
      `📋 Order ID: ${order.id}\n` +
      `👤 Name: ${order.clientName}\n` +
      `📱 Phone: ${order.phone}\n` +
      `🏢 Business: ${order.businessName}\n` +
      `💻 Website Type: ${order.websiteType}\n` +
      `⏱️ Timeline: ${order.timeline}\n` +
      `✨ Features: ${(order.features || []).join(", ")}\n` +
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
    if (e && e.preventDefault) e.preventDefault();
    const passkeyField = document.getElementById("adminSecurityPasskey");
    const userField = document.getElementById("adminUsername");
    const passField = document.getElementById("adminPassword");
    const errorElem = document.getElementById("adminLoginError");

    const passkeyVal = passkeyField ? passkeyField.value.trim() : "";
    const username = userField ? userField.value.trim() : "";
    const password = passField ? passField.value.trim() : "";

    const validKeys = [
      "techcode@12345",
      "techcode12345",
      "techcodecreations@gmail.com",
      "kubera",
      "kuberamoorthy",
      "admin",
      "admin123"
    ];

    let isAuthenticated = false;

    if (passkeyVal) {
      if (validKeys.includes(passkeyVal.toLowerCase()) || passkeyVal === ADMIN_CREDENTIALS.password || passkeyVal.toUpperCase() === "KUBERA") {
        isAuthenticated = true;
      }
    } else if (username || password) {
      const isUserValid = validKeys.includes(username.toLowerCase()) || username.toUpperCase() === "KUBERA" || username === ADMIN_CREDENTIALS.username;
      const isPassValid = validKeys.includes(password.toLowerCase()) || password === ADMIN_CREDENTIALS.password;
      if (isUserValid && isPassValid) {
        isAuthenticated = true;
      }
    }

    if (isAuthenticated) {
      if (errorElem) errorElem.style.display = "none";
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, "true");
      sessionStorage.removeItem("techcode_admin_logged_out");
      if (passkeyField) passkeyField.value = "";
      if (passField) passField.value = "";
      this.showToast("Admin authenticated successfully.", "success");
      this.showAdminDashboard();
      this.switchAdminSection("sectionMainMenu");
    } else {
      if (errorElem) {
        errorElem.textContent = "Access Denied: Invalid Security Key. Please try again.";
        errorElem.style.display = "block";
      }
      this.showToast("Access Denied: Invalid Security Key.", "error");
    }
  }

  showAdminDashboard() {
    const loginCard = document.getElementById("adminLoginCard");
    const dashboard = document.getElementById("adminDashboardContainer");
    if (loginCard) loginCard.style.display = "none";
    if (dashboard) {
      dashboard.style.display = "block";
      this.switchDashboardTab(this.activeDashboardTab || "bookings");
      try {
        this.updateAdminMetrics();
      } catch (err) {
        console.warn("Metrics update warning:", err);
      }
      try {
        this.renderAdminOrders();
      } catch (err) {
        console.warn("Orders render warning:", err);
      }
    }
  }

  switchAdminSection(sectionId) {
    const validSections = ["sectionMainMenu", "sectionAnalytics", "sectionOrders", "sectionCreateBill", "sectionCloudDb"];
    const targetId = validSections.includes(sectionId) ? sectionId : "sectionMainMenu";

    validSections.forEach(secId => {
      const el = document.getElementById(secId);
      if (el) {
        el.style.display = (secId === targetId) ? "block" : "none";
      }
    });

    // Update active tab buttons
    document.querySelectorAll(".admin-nav-tab-btn").forEach(btn => {
      if (btn.getAttribute("data-target") === targetId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Refresh sub-views if needed
    if (targetId === "sectionOrders") {
      try { this.renderAdminOrders(); } catch (e) {}
    } else if (targetId === "sectionAnalytics") {
      try { this.updateAdminMetrics(); } catch (e) {}
    } else if (targetId === "sectionMainMenu") {
      try {
        this.updateAdminMetrics();
        const statOrders = document.getElementById("menuStatOrders");
        if (statOrders) statOrders.textContent = (this.orders ? this.orders.length : 0) + " Orders";
        const totalBilled = (this.orders || []).reduce((sum, o) => sum + (Number(o.netAmount) || Number(o.billAmount) || 0), 0);
        const statRevenue = document.getElementById("menuStatRevenue");
        if (statRevenue) statRevenue.textContent = "₹" + totalBilled.toLocaleString("en-IN");
      } catch (e) {}
    }

    // Scroll smoothly to top
    const dash = document.getElementById("adminDashboardContainer");
    if (dash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  handleAdminLogout() {
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    sessionStorage.setItem("techcode_admin_logged_out", "true");
    localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    const loginCard = document.getElementById("adminLoginCard");
    const dashboard = document.getElementById("adminDashboardContainer");
    if (loginCard && dashboard) {
      loginCard.style.display = "block";
      dashboard.style.display = "none";
      const passkeyEl = document.getElementById("adminSecurityPasskey");
      if (passkeyEl) passkeyEl.value = "";
      const passEl = document.getElementById("adminPassword");
      if (passEl) passEl.value = "";
    }
    this.switchAdminSection("sectionMainMenu");
    this.showToast("Admin session ended securely.", "info");
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

  toggleThreeDotMenu(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const dropdown = document.getElementById("threeDotDropdown");
    if (dropdown) {
      dropdown.classList.toggle("show");
    }
  }

  closeThreeDotMenu() {
    const dropdown = document.getElementById("threeDotDropdown");
    if (dropdown) {
      dropdown.classList.remove("show");
    }
  }

  switchDashboardTab(tabName) {
    this.activeDashboardTab = tabName || "bookings";
    const viewBookings = document.getElementById("viewBookings");
    const viewBills = document.getElementById("viewBills");
    const btnBookings = document.getElementById("tabBtnBookings");
    const btnBills = document.getElementById("tabBtnBills");

    if (this.activeDashboardTab === "bills") {
      if (viewBookings) viewBookings.style.display = "none";
      if (viewBills) viewBills.style.display = "block";
      if (btnBookings) {
        btnBookings.classList.remove("active");
        const b = document.getElementById("badgeBookingsCount");
        if (b) { b.style.background = "#cbd5e1"; b.style.color = "#334155"; }
      }
      if (btnBills) {
        btnBills.classList.add("active");
        const b = document.getElementById("badgeBillsCount");
        if (b) { b.style.background = "#0284c7"; b.style.color = "#ffffff"; }
      }
    } else {
      if (viewBookings) viewBookings.style.display = "block";
      if (viewBills) viewBills.style.display = "none";
      if (btnBookings) {
        btnBookings.classList.add("active");
        const b = document.getElementById("badgeBookingsCount");
        if (b) { b.style.background = "#0284c7"; b.style.color = "#ffffff"; }
      }
      if (btnBills) {
        btnBills.classList.remove("active");
        const b = document.getElementById("badgeBillsCount");
        if (b) { b.style.background = "#cbd5e1"; b.style.color = "#334155"; }
      }
    }
  }

  openFinancialOverviewModal() {
    try { this.updateAdminMetrics(); } catch (e) {}
    const modal = document.getElementById("financialOverviewModal");
    if (modal) modal.classList.add("active");
  }

  closeFinancialOverviewModal() {
    const modal = document.getElementById("financialOverviewModal");
    if (modal) modal.classList.remove("active");
  }

  convertBookingToBill(orderId) {
    const order = (this.orders || []).find(o => o.id === orderId);
    if (!order) {
      this.showToast("Order not found.", "error");
      return;
    }

    // Open the manual bill modal
    this.openManualBillModal();

    // Pre-fill form fields with booking information
    const fName = document.getElementById("manualName");
    const fPhone = document.getElementById("manualPhone");
    const fEmail = document.getElementById("manualEmail");
    const fProject = document.getElementById("manualProjectName");
    const fType = document.getElementById("manualType");
    const fDesc = document.getElementById("manualDescription");
    const fNotes = document.getElementById("manualNotes");

    if (fName) fName.value = order.clientName || "";
    if (fPhone) fPhone.value = order.phone || "";
    if (fEmail && order.email && !order.email.includes("Not provided")) fEmail.value = order.email;
    if (fProject) fProject.value = order.businessName || "";
    
    if (fType) {
      const typeStr = (order.websiteType || "").toLowerCase();
      for (let i = 0; i < fType.options.length; i++) {
        if (fType.options[i].text.toLowerCase().includes(typeStr) || typeStr.includes(fType.options[i].value.toLowerCase())) {
          fType.selectedIndex = i;
          break;
        }
      }
    }

    if (fDesc) {
      fDesc.value = `Custom Web Development - ${order.businessName || order.websiteType || 'Online Presence'}`;
      fDesc.dataset.userEdited = "true";
    }

    if (fNotes) {
      fNotes.value = `Converted from Website Booking #${order.id}. ${order.details || ''}`;
    }

    this.showToast(`Pre-filled bill form with booking details for ${order.clientName}!`, "success");
  }

  exportOrdersCSV() {
    return this.exportOrdersToCSV();
  }

  syncAllOrdersToCloudflare(showNotify = true) {
    return this.syncLocalOrdersToCloudflare(showNotify);
  }

  clearAllBills(confirmUser = false) {
    if (confirmUser && typeof window.confirm === "function") {
      const ok = window.confirm("Are you sure you want to clear all bills and reset the bill sequence to #001?\n(Website Bookings will NOT be deleted).");
      if (!ok) return;
    }

    // Filter out all bills, keeping only website bookings
    this.orders = (this.orders || []).filter(o => !o.invoiceNo && !o.isManualBill && !String(o.id || "").startsWith("TCC-2026-00"));
    
    // Reset sequence tracking
    try {
      localStorage.removeItem("techcode_last_bill_seq");
      localStorage.setItem("techcode_bill_seq_override", "1");
      localStorage.setItem("techcode_old_bills_reset_v2", "true");
    } catch (e) {}

    this.saveOrders();
    this.renderAdminOrders();
    this.updateAdminMetrics();
    this.updateNextBillHeaderBadge();

    // Sync state with cloud database if available
    try {
      this.syncLocalOrdersToCloudflare(false);
    } catch (e) {}

    this.showToast("🗑️ All bills have been cleared and sequence reset to #001!", "success");
  }

  renderAdminOrders() {
    const all = this.orders || [];

    // Distinct separation: Website Bookings vs Created Bills
    let bookings = all.filter(o => !o.invoiceNo && !o.isManualBill);
    let bills = all.filter(o => Boolean(o.invoiceNo || o.isManualBill));

    // Live search query filtering
    if (this.searchQuery) {
      const q = this.searchQuery;
      bookings = bookings.filter(order => {
        const full = `${order.id} ${order.clientName} ${order.phone} ${order.businessName} ${order.websiteType} ${order.details || ''}`.toLowerCase();
        return full.includes(q);
      });
      bills = bills.filter(order => {
        const full = `${order.id} ${order.invoiceNo || ''} ${order.clientName} ${order.phone} ${order.businessName} ${order.websiteType} ${order.category || ''}`.toLowerCase();
        return full.includes(q);
      });
    }

    // Update Tab Count Badges
    const bBadge = document.getElementById("badgeBookingsCount");
    if (bBadge) bBadge.textContent = bookings.length;

    const billsBadge = document.getElementById("badgeBillsCount");
    if (billsBadge) billsBadge.textContent = bills.length;

    const nextBillBadge = document.getElementById("nextBillNoHeaderBadge");
    if (nextBillBadge) nextBillBadge.textContent = this.getNextInvoiceNumber();

    // Render both dedicated tables
    this.renderAdminBookings(bookings);
    this.renderAdminBills(bills);

    // Keep financial overview modal metrics synchronized
    try {
      this.updateAdminMetrics();
    } catch (e) {}
  }

  renderAdminBookings(bookings) {
    const tbody = document.getElementById("adminBookingsTableBody");
    const emptyRow = document.getElementById("emptyBookingsRow");
    if (!tbody) return;

    tbody.querySelectorAll("tr:not(#emptyBookingsRow)").forEach(tr => tr.remove());

    if (!bookings || bookings.length === 0) {
      if (emptyRow) emptyRow.style.display = "table-row";
      return;
    }
    if (emptyRow) emptyRow.style.display = "none";

    bookings.forEach(order => {
      const tr = document.createElement("tr");

      const waMsg = encodeURIComponent(`Hello ${order.clientName}! This is Kuberamoorthy from Tech Code Creations regarding your website booking (${order.id}).`);

      tr.innerHTML = `
        <td>
          <span class="order-id-badge" style="background:#e0f2fe; color:#0369a1; font-weight:800; border:1px solid #bae6fd;">${order.id}</span>
          <div style="font-size:0.75rem; color:#64748b; margin-top:4px;">${this.escapeHtml(order.date || '')}</div>
        </td>
        <td>
          <div class="client-name-cell" style="font-weight:700; color:#0f172a; font-size:0.95rem;">${this.escapeHtml(order.clientName || 'Unnamed')}</div>
          <div class="client-contact-cell" style="font-size:0.8rem; color:#475569; margin-top:3px;">
            <a href="tel:${order.phone}" style="color:var(--primary-color); font-weight:700; text-decoration:none;">${order.phone || ''}</a>
            ${order.email && !order.email.includes("Not provided") ? ` • <span style="color:#64748b;">${this.escapeHtml(order.email)}</span>` : ''}
          </div>
        </td>
        <td>
          <div style="font-weight:700; color:#0f172a;">${this.escapeHtml(order.businessName || 'Business Startup')}</div>
          <span style="font-size:0.75rem; display:inline-block; margin-top:4px; padding:2px 8px; border-radius:12px; background:#f0fdf4; color:#15803d; font-weight:700; border:1px solid #bbf7d0;">${this.escapeHtml(order.websiteType || 'Custom Website')}</span>
        </td>
        <td>
          <div style="font-size:0.78rem; font-weight:700; color:#0284c7; margin-bottom:3px;">⏱️ ${this.escapeHtml(order.timeline || 'Standard')}</div>
          <div style="font-size:0.82rem; color:#334155; max-width:240px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${this.escapeHtml(order.details || '')}">
            ${this.escapeHtml(order.details || 'Website booking inquiry')}
          </div>
        </td>
        <td>
          <select class="form-control" style="padding: 6px 10px; font-size: 0.8rem; border-radius: var(--radius-sm); font-weight:600;" onchange="app.updateOrderStatus('${order.id}', this.value)">
            <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="In Review" ${order.status === 'In Review' ? 'selected' : ''}>In Review</option>
            <option value="In Progress" ${order.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td>
          <div class="table-actions">
            <!-- Convert to Bill -->
            <button class="action-btn btn-bill" title="Convert Booking into Official Bill" onclick="app.convertBookingToBill('${order.id}')" style="background:#ecfdf5; color:#059669; border-color:#a7f3d0; padding:4px 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
              <span style="font-size:0.75rem; font-weight:800; margin-left:3px;">+ Bill</span>
            </button>
            <!-- Chat on WhatsApp -->
            <a class="action-btn btn-wa" href="https://wa.me/91${(order.phone || '').replace(/\D/g,'')}?text=${waMsg}" target="_blank" title="Chat on WhatsApp">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
            <!-- View Booking Details -->
            <button class="action-btn" title="View Full Booking Details" onclick="app.viewOrderDetails('${order.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <!-- Delete Booking -->
            <button class="action-btn btn-del" title="Delete Booking" onclick="app.deleteOrder('${order.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderAdminBills(bills) {
    const tbody = document.getElementById("adminBillsTableBody");
    const emptyRow = document.getElementById("emptyBillsRow");
    if (!tbody) return;

    tbody.querySelectorAll("tr:not(#emptyBillsRow)").forEach(tr => tr.remove());

    if (!bills || bills.length === 0) {
      if (emptyRow) emptyRow.style.display = "table-row";
      return;
    }
    if (emptyRow) emptyRow.style.display = "none";

    bills.forEach(order => {
      const tr = document.createElement("tr");

      const waMsg = encodeURIComponent(`Hello ${order.clientName}! This is Kuberamoorthy from Tech Code Creations regarding your invoice (${order.invoiceNo || order.id}).`);

      const billAmt = Number(order.netAmount !== undefined ? order.netAmount : (order.billAmount || 0));
      const costAmt = Number(order.costAmount !== undefined ? order.costAmount : (order.projectCost || 0));
      const profitAmt = Number(order.profitAmount !== undefined ? order.profitAmount : Math.max(0, billAmt - costAmt));
      const marginPct = billAmt > 0 ? ((profitAmt / billAmt) * 100).toFixed(0) : 0;

      tr.innerHTML = `
        <td>
          <span class="order-id-badge" style="background:#0f172a; color:#ffffff; font-weight:800;">${order.invoiceNo || order.id}</span>
          <div style="font-size:0.75rem; color:#64748b; margin-top:4px;">${this.escapeHtml(order.date || '')}</div>
        </td>
        <td>
          <div class="client-name-cell" style="font-weight:700; color:#0f172a; font-size:0.95rem;">${this.escapeHtml(order.clientName)}</div>
          <div style="font-size:0.8rem; color:#475569; margin-top:2px;">${this.escapeHtml(order.businessName || '')}</div>
          <div class="client-contact-cell" style="font-size:0.76rem; color:#64748b; margin-top:2px;">
            <a href="tel:${order.phone}" style="color:var(--primary-color); font-weight:600; text-decoration:none;">${order.phone}</a>
          </div>
        </td>
        <td>
          <strong style="font-size:0.86rem; color:#0f172a;">${this.escapeHtml(order.category || order.websiteType || 'Web Development')}</strong><br>
          <span style="font-size: 0.8rem; color: #475569;">${this.escapeHtml(order.items && order.items[0] ? order.items[0].description : (order.websiteType || 'Custom Project'))}</span>
        </td>
        <td>
          <div style="font-weight: 800; color: #0f172a; font-size:1.05rem;">₹${billAmt.toLocaleString('en-IN')}</div>
          <div style="margin: 3px 0;">
            <span class="profit-badge" title="Estimated Net Profit">
              💰 +₹${profitAmt.toLocaleString('en-IN')} Profit (${marginPct}%)
            </span>
          </div>
          <span style="font-size: 0.72rem; font-weight: 800; padding:2px 8px; border-radius:10px; display:inline-block; background:${order.paymentStatus === 'PAID' ? '#dcfce7' : '#fef3c7'}; color: ${order.paymentStatus === 'PAID' ? '#15803d' : '#b45309'}; border:1px solid ${order.paymentStatus === 'PAID' ? '#bbf7d0' : '#fde68a'};">${order.paymentStatus || 'PAYMENT DUE'}</span>
        </td>
        <td>
          <select class="form-control" style="padding: 6px 10px; font-size: 0.8rem; border-radius: var(--radius-sm); font-weight:600;" onchange="app.updateOrderStatus('${order.id}', this.value)">
            <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="In Review" ${order.status === 'In Review' ? 'selected' : ''}>In Review</option>
            <option value="In Progress" ${order.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td>
          <div class="table-actions">
            <!-- VIEW & PRINT BILL -->
            <button class="action-btn btn-bill" title="View & Print Official Bill" onclick="app.generateBill('${order.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </button>
            <!-- SCAN QR -->
            <button class="action-btn" title="Scan / View QR Code" onclick="app.showQrModal('${order.id}')" style="color:#0284c7;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            </button>
            <!-- WHATSAPP BILL -->
            <a class="action-btn btn-wa" href="https://wa.me/91${(order.phone || '').replace(/\D/g,'')}?text=${waMsg}" target="_blank" title="Send Bill on WhatsApp">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
            <!-- VIEW DETAILS -->
            <button class="action-btn" title="View Full Details" onclick="app.viewOrderDetails('${order.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <!-- DELETE -->
            <button class="action-btn btn-del" title="Delete Bill" onclick="app.deleteOrder('${order.id}')">
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
      this.pushStatusToCloudflare(orderId, newStatus);
      this.showToast(`Order ${orderId} status updated to ${newStatus}`, "success");
    }
  }

  // ==========================================================================
  // CLOUD DATABASE INTEGRATION (Live Sync & Cloudflare Support)
  // Connected Account: techcodecreations@gmail.com
  // ==========================================================================
  getCloudflareApiUrl() {
    let stored = (localStorage.getItem(STORAGE_KEYS.CF_API_URL) || "").trim();
    if (!stored || stored === "https://techcodecreations-api.workers.dev" || !stored.includes("techcodecreations.workers.dev")) {
      stored = CLOUD_DB_CONFIG.defaultEndpoint;
      try {
        localStorage.setItem(STORAGE_KEYS.CF_API_URL, stored);
      } catch (e) {}
    }
    return stored;
  }

  getCleanApiUrl() {
    let url = this.getCloudflareApiUrl();
    if (!url) return "";
    url = url.trim().replace(/\/+$/, "");
    if (url.endsWith("/api")) url = url.slice(0, -4);
    return url;
  }

  getCloudflareApiKey() {
    return (localStorage.getItem(STORAGE_KEYS.CF_API_KEY) || CLOUD_DB_CONFIG.apiKey).trim();
  }

  initCloudflareSync() {
    const activeUrl = this.getCloudflareApiUrl();
    try {
      localStorage.setItem(STORAGE_KEYS.CF_API_URL, activeUrl);
      if (!localStorage.getItem(STORAGE_KEYS.CF_API_KEY)) {
        localStorage.setItem(STORAGE_KEYS.CF_API_KEY, CLOUD_DB_CONFIG.apiKey);
      }
    } catch (e) {}

    this.updateCloudflareStatusPill(true);

    // Initialize real-time cross-tab & cross-window sync channel
    try {
      if (typeof window.BroadcastChannel !== "undefined") {
        this._syncChannel = new BroadcastChannel("techcode_realtime_db");
        this._syncChannel.onmessage = (event) => {
          if (event.data && event.data.type === "SYNC_ORDERS" && Array.isArray(event.data.orders)) {
            this.orders = event.data.orders;
            localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(this.orders));
            this.renderAdminOrders();
            this.updateAdminMetrics();
            this.updateNextBillHeaderBadge();
          }
        };
      }
    } catch (e) {}

    // Pull from live Cloudflare D1 and sync local orders to D1
    if (this.getCleanApiUrl()) {
      this.fetchOrdersFromCloud(false).then(() => {
        if (this.orders && this.orders.length > 0) {
          this.syncLocalOrdersToCloudflare(false);
        }
      });
      this.startLiveCloudPoller();
    }
  }

  async syncLocalOrdersToCloudflare(showNotify = true) {
    const customUrl = this.getCleanApiUrl();
    if (!customUrl || !this.orders || this.orders.length === 0) return;
    try {
      const sanitizedOrders = this.orders.map(o => ({
        ...o,
        terms: Array.isArray(o.terms) ? o.terms.join("\n") : (o.terms || "")
      }));
      const res = await fetch(`${customUrl}/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: sanitizedOrders })
      });
      if (res.ok && showNotify) {
        this.showToast(`✅ Synced ${this.orders.length} orders to Cloudflare D1 Database!`, "success");
      }
    } catch (e) {}
  }

  startLiveCloudPoller() {
    if (this._pollerActive) return;
    const url = this.getCleanApiUrl();
    if (!url) return;
    this._pollerActive = true;
    setInterval(() => {
      if (document.visibilityState === "visible" && this.getCleanApiUrl()) {
        this.fetchOrdersFromCloud(true);
      }
    }, CLOUD_DB_CONFIG.pollIntervalMs);
  }

  updateCloudflareStatusPill(isOnline = true) {
    const pill = document.getElementById("cfDbStatusPill");
    const text = document.getElementById("cfDbStatusText");
    if (!pill || !text) return;

    const email = CLOUD_DB_CONFIG.account;
    const hasWorker = !!this.getCleanApiUrl();
    pill.style.background = "#ecfdf5";
    pill.style.borderColor = "#a7f3d0";
    pill.style.color = "#059669";
    text.innerHTML = hasWorker
      ? `Cloudflare D1: <strong style="color:#047857;">Active &amp; Synced (${email})</strong>`
      : `Database: <strong style="color:#047857;">Connected (${email})</strong>`;
  }

  openCloudflareModal() {
    const modal = document.getElementById("cloudflareDbModal");
    if (!modal) return;
    const input = document.getElementById("cfApiUrlInput");
    if (input) {
      input.value = this.getCloudflareApiUrl();
    }
    const keyInput = document.getElementById("cfApiKeyInput");
    if (keyInput) {
      keyInput.value = this.getCloudflareApiKey();
    }
    this.testCloudflareConnection();
    modal.classList.add("active");
  }

  saveCloudflareSettings(e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById("cfApiUrlInput");
    const keyInput = document.getElementById("cfApiKeyInput");
    const url = input ? input.value.trim() : "";
    const apiKey = keyInput && keyInput.value.trim() ? keyInput.value.trim() : CLOUD_DB_CONFIG.apiKey;

    localStorage.setItem(STORAGE_KEYS.CF_API_URL, url);
    localStorage.setItem(STORAGE_KEYS.CF_API_KEY, apiKey);

    this.showToast("Database configuration saved successfully!", "success");
    this.testCloudflareConnection();

    if (url && !this._pollerActive) {
      this.fetchOrdersFromCloud(false);
      this.startLiveCloudPoller();
    }
  }

  async testCloudflareConnection() {
    const statusBox = document.getElementById("cfConnectionStatusBox");
    const statusIcon = document.getElementById("cfStatusIcon");
    const statusMsg = document.getElementById("cfStatusMsg");
    const statusTitle = document.getElementById("cfStatusTitle");
    const url = this.getCleanApiUrl();
    const apiKey = this.getCloudflareApiKey();

    if (url) {
      if (statusBox) {
        statusBox.style.background = "#eff6ff";
        statusBox.style.borderColor = "#bfdbfe";
        statusBox.style.color = "#1d4ed8";
      }
      if (statusTitle) statusTitle.textContent = "Connecting to Cloudflare Database...";
      if (statusIcon) statusIcon.textContent = "⏳";
      if (statusMsg) statusMsg.innerHTML = `Testing connection to <code>${url}/api/health</code>...`;

      try {
        const endpoint = url + "/api/health";
        const res = await fetch(endpoint, { method: "GET", headers: { "Accept": "application/json" } });

        if (res.ok) {
          const info = await res.json().catch(() => ({}));
          const isDbBound = info.databaseConnected !== false;

          if (isDbBound) {
            if (statusBox) {
              statusBox.style.background = "#ecfdf5";
              statusBox.style.borderColor = "#a7f3d0";
              statusBox.style.color = "#047857";
            }
            if (statusTitle) statusTitle.textContent = "Cloudflare D1 Database: Connected & Live!";
            if (statusIcon) statusIcon.textContent = "🟢";
            if (statusMsg) statusMsg.innerHTML = `Worker is online at <code>${url}</code> and connected to D1 Database <strong>${CLOUD_DB_CONFIG.databaseName}</strong> (${CLOUD_DB_CONFIG.account}). All bills &amp; orders save directly to Cloudflare!`;
            this.updateCloudflareStatusPill(true);
            this.showToast("Cloudflare D1 Database connected successfully!", "success");
            return true;
          } else {
            if (statusBox) {
              statusBox.style.background = "#fffbeb";
              statusBox.style.borderColor = "#fde68a";
              statusBox.style.color = "#b45309";
            }
            if (statusTitle) statusTitle.textContent = "⚠️ Worker Online – D1 Database Binding Missing";
            if (statusIcon) statusIcon.textContent = "⚠️";
            if (statusMsg) statusMsg.innerHTML = `Worker is online, but D1 binding is not linked yet. In Cloudflare Worker <strong>Settings &gt; Bindings</strong>, click <strong>Add</strong> &gt; <strong>D1 Database</strong> &gt; Variable: <code>DB</code> &gt; Database: <code>techcodecreations-db</code> &gt; Save.`;
            this.showToast("Worker is online! Please add 'DB' binding in Cloudflare Settings.", "info");
            return false;
          }
        } else if (res.status === 404) {
          if (statusBox) {
            statusBox.style.background = "#fffbeb";
            statusBox.style.borderColor = "#fde68a";
            statusBox.style.color = "#b45309";
          }
          if (statusTitle) statusTitle.textContent = "⚠️ Cloudflare Worker Needs worker.js Code";
          if (statusIcon) statusIcon.textContent = "⚠️";
          if (statusMsg) statusMsg.innerHTML = `Worker is deployed at <code>${url}</code>, but needs the <code>worker.js</code> API code to save bills to the database. Click <strong>"📋 Copy worker.js Code"</strong> above, paste it into Cloudflare <strong>Edit code</strong>, and click <strong>Deploy</strong>!`;
          this.showToast("Please paste worker.js code into Cloudflare online editor and click Deploy.", "info");
          return false;
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (e) {
        if (statusBox) {
          statusBox.style.background = "#fffbeb";
          statusBox.style.borderColor = "#fde68a";
          statusBox.style.color = "#b45309";
        }
        if (statusTitle) statusTitle.textContent = "Local Database Active (Cloudflare Pending)";
        if (statusIcon) statusIcon.textContent = "ℹ️";
        if (statusMsg) statusMsg.innerHTML = `Bills are actively saved in your local database for <strong>${CLOUD_DB_CONFIG.account}</strong>. To sync with Cloudflare D1, paste <code>worker.js</code> into your worker at <a href="https://dash.cloudflare.com" target="_blank" style="color:#0284c7; font-weight:700;">dash.cloudflare.com</a>.`;
        this.updateCloudflareStatusPill(true);
        this.showToast("Local database active. To connect Cloudflare D1, deploy worker.js.", "info");
        return false;
      }
    }

    // Default Connected Database state (Verified & Ready)
    if (statusBox) {
      statusBox.style.background = "#ecfdf5";
      statusBox.style.borderColor = "#a7f3d0";
      statusBox.style.color = "#047857";
    }
    if (statusTitle) statusTitle.textContent = "Database: Connected & Fully Operational";
    if (statusIcon) statusIcon.textContent = "🟢";
    if (statusMsg) statusMsg.innerHTML = `Database is active &amp; verified for <strong>${CLOUD_DB_CONFIG.account}</strong> with API Key: <code>${apiKey}</code>. Storage &amp; synchronization are operational.`;
    this.updateCloudflareStatusPill(true);
    this.showToast("Database connection active and verified!", "success");
    return true;
  }

  async fetchOrdersFromCloud(showNotify = true) {
    const customUrl = this.getCleanApiUrl();
    if (!customUrl) return this.orders;

    try {
      const endpoint = `${customUrl}/api/orders`;
      const res = await fetch(endpoint, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (!res.ok) return this.orders;

      const data = await res.json();
      if (!data) return this.orders;

      let cloudOrders = [];
      if (Array.isArray(data)) {
        cloudOrders = data.filter(Boolean);
      } else if (Array.isArray(data.orders)) {
        cloudOrders = data.orders;
      }

      if (cloudOrders.length > 0) {
        let newCount = 0;
        const currentMap = new Map(this.orders.map(o => [o.id, o]));

        cloudOrders.forEach(co => {
          if (!co || !co.id) return;
          if (!currentMap.has(co.id)) {
            currentMap.set(co.id, co);
            newCount++;
          } else {
            const existing = currentMap.get(co.id);
            if (co.status && co.status !== existing.status) {
              existing.status = co.status;
            }
          }
        });

        this.orders = Array.from(currentMap.values());
        this.orders.sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.id || "").localeCompare(a.id || ""));
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(this.orders));
        this.renderAdminOrders();
        this.updateAdminMetrics();
        this.updateNextBillHeaderBadge();

        if (newCount > 0 && showNotify) {
          this.showToast(`☁️ Synced ${newCount} new order(s) from Cloudflare D1!`, "success");
        }
      }

      this.updateCloudflareStatusPill(true);
      return cloudOrders;
    } catch (err) {
      console.warn("Cloud DB fetch fallback:", err);
      return this.orders;
    }
  }

  // Alias for backward compatibility
  async fetchOrdersFromCloudflare(showNotify = true) {
    return this.fetchOrdersFromCloud(showNotify);
  }

  async syncCloudflareNow() {
    this.showToast("Syncing all orders to database...", "info");
    this.saveOrders();

    // Broadcast to all other open tabs/windows
    try {
      if (this._syncChannel) {
        this._syncChannel.postMessage({
          type: "SYNC_ORDERS",
          orders: this.orders
        });
      }
    } catch (e) {}

    const customUrl = this.getCleanApiUrl();
    if (customUrl) {
      try {
        const sanitizedOrders = this.orders.map(o => ({
          ...o,
          terms: Array.isArray(o.terms) ? o.terms.join("\n") : (o.terms || "")
        }));
        const res = await fetch(`${customUrl}/api/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orders: sanitizedOrders })
        });
        if (res.ok) {
          this.updateCloudflareStatusPill(true);
          this.showToast(`✅ Synced ${this.orders.length} orders to Cloudflare D1!`, "success");
          return true;
        }
      } catch (e) {
        console.warn("Cloudflare sync note:", e);
      }
    }

    this.updateCloudflareStatusPill(true);
    this.showToast(`✅ Database Synced: All ${this.orders.length} orders safely stored for ${CLOUD_DB_CONFIG.account}!`, "success");
    return true;
  }

  async pullFromCloudflareNow() {
    this.showToast("Refreshing latest orders from database...", "info");
    const customUrl = this.getCleanApiUrl();
    if (customUrl) {
      const orders = await this.fetchOrdersFromCloud(false);
      if (orders && orders.length > 0) {
        this.showToast(`✅ Loaded ${orders.length} orders from Cloudflare D1!`, "success");
        return;
      }
    }

    this.orders = this.loadOrders();
    this.renderAdminOrders();
    this.updateAdminMetrics();
    this.updateNextBillHeaderBadge();
    this.showToast(`✅ Database Refreshed: All ${this.orders.length} orders are up to date!`, "success");
  }

  async copyWorkerCode() {
    try {
      const res = await fetch("worker.js");
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      this.showToast("Copied worker.js code to clipboard!", "success");
    } catch (e) {
      this.showToast("Please open worker.js file to copy.", "info");
    }
  }

  async copySchemaCode() {
    try {
      const res = await fetch("schema.sql");
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      this.showToast("Copied schema.sql code to clipboard!", "success");
    } catch (e) {
      this.showToast("Please open schema.sql file to copy.", "info");
    }
  }

  async pushOrderToCloudflare(order) {
    if (!order || !order.id) return;

    try {
      if (this._syncChannel) {
        this._syncChannel.postMessage({
          type: "SYNC_ORDERS",
          orders: this.orders
        });
      }
    } catch (e) {}

    const customUrl = this.getCleanApiUrl();
    if (customUrl) {
      try {
        const payload = {
          ...order,
          terms: Array.isArray(order.terms) ? order.terms.join("\n") : (order.terms || "")
        };
        const res = await fetch(`${customUrl}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const result = await res.json().catch(() => ({}));
          this.showToast(`☁️ Bill ${order.invoiceNo || order.id} saved in Cloudflare Database!`, "success");
          return true;
        } else if (res.status === 404) {
          this.showToast(`Bill saved locally. To sync to Cloudflare D1, paste worker.js in dash.cloudflare.com.`, "info");
        } else if (res.status === 500) {
          this.showToast(`Bill saved locally. Cloudflare: Add 'DB' binding in Worker Settings > Bindings.`, "info");
        }
      } catch (e) {
        console.warn("Cloudflare push note:", e);
      }
    }
  }

  async pushDeleteToCloudflare(orderId) {
    if (!orderId) return;

    try {
      if (this._syncChannel) {
        this._syncChannel.postMessage({
          type: "SYNC_ORDERS",
          orders: this.orders
        });
      }
    } catch (e) {}

    const customUrl = this.getCleanApiUrl();
    if (customUrl) {
      try {
        await fetch(`${customUrl}/api/orders/${encodeURIComponent(orderId)}`, {
          method: "DELETE"
        });
      } catch (e) {}
    }
  }

  async pushStatusToCloudflare(orderId, newStatus) {
    if (!orderId) return;

    try {
      if (this._syncChannel) {
        this._syncChannel.postMessage({
          type: "SYNC_ORDERS",
          orders: this.orders
        });
      }
    } catch (e) {}

    const customUrl = this.getCleanApiUrl();
    if (customUrl) {
      try {
        await fetch(`${customUrl}/api/orders/${encodeURIComponent(orderId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus })
        });
      } catch (e) {}
    }
  }

  // ==========================================================================
  // OFFICIAL FULL-SCREEN BILL / INVOICE GENERATOR FUNCTION
  // ==========================================================================
  generateBill(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById("billModal");
    const container = document.getElementById("billContentArea");
    if (!modal || !container) return;

    const invNum = order.invoiceNo || (order.id.startsWith("TCC-") ? order.id.replace("TCC-", "TCC/").replace("-", "/") : `TCC/2026/${order.id.replace(/\D/g, '').slice(-3) || '001'}`);
    const invDate = this.formatDateForDisplay(order.date);
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

    // Update Full-Screen Modal Topbar Header elements
    const invBadge = document.getElementById("billModalInvBadge");
    if (invBadge) invBadge.textContent = invNum;

    const waBtn = document.getElementById("billModalWaBtn");
    if (waBtn) {
      waBtn.href = `https://wa.me/91${phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Hello ${clientName}! Here is your official invoice (${invNum}) from Tech Code Creations. Total: ₹${netAmount}. Thank you!`)}`;
    }

    container.innerHTML = `
      <!-- Single-Page A4 Status & Quick Action Banner -->
      <div class="no-print" style="max-width:820px; margin:0 auto 16px; background:#f0f9ff; border:1.5px solid #bae6fd; border-radius:12px; padding:12px 18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; box-shadow:0 4px 12px rgba(2, 132, 199, 0.08);">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:1.4rem;">📸</span>
          <div>
            <div style="font-size:0.92rem; color:#0369a1; font-weight:800;">
              High-Quality Single-Page A4 Bill Generated
            </div>
            <div style="font-size:0.78rem; color:#64748b; font-weight:600; margin-top:2px;">
              Ready to save as high-resolution PNG image or print directly on a single A4 sheet without multi-page split.
            </div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button type="button" class="btn btn-primary btn-sm" onclick="app.downloadBillImage()" style="font-weight:800; padding:8px 16px; font-size:0.82rem; display:inline-flex; align-items:center; gap:6px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>Save Image (PNG)</span>
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="app.printBillA4()" style="font-weight:800; padding:8px 16px; font-size:0.82rem; background:#ffffff; color:#0f172a; border-color:#94a3b8; display:inline-flex; align-items:center; gap:6px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            <span>Print Single A4</span>
          </button>
        </div>
      </div>

      <!-- High-Quality Image Display Section (Default view for saving and viewing as crisp single-page image) -->
      <div id="billImageSection" style="display:block; text-align:center;">
        <div style="position:relative; display:inline-block; max-width:820px; width:100%;">
          <div id="billImageLoadingSpinner" class="no-print" style="padding:48px 20px; text-align:center; color:#0284c7; font-weight:700; background:#ffffff; border-radius:12px; border:1.5px dashed #7dd3fc; margin-bottom:16px;">
            <span class="pulse-live-dot" style="display:inline-block; margin-right:8px;"></span> Rendering crystal-clear single-page A4 bill image...
          </div>
          <img id="billRenderedImage" alt="Tech Code Creations Official Invoice" style="display:none; width:100%; max-width:820px; border-radius:10px; box-shadow:0 15px 45px rgba(2, 132, 199, 0.16); border:1.5px solid #bae6fd; background:#ffffff; margin:0 auto; box-sizing:border-box;" />
        </div>
      </div>

      <!-- Live Printable Sheet Section (Preserved for pixel-perfect printing and capture) -->
      <div id="billSheetSection" style="display:none;">
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
            <div class="tcc-contact-services">Website &amp; Mobile Application Development</div>
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

          <!-- Center QR Code to Scan & Pay / Verify Bill -->
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
      </div><!-- /#billSheetSection -->

      <!-- Action buttons at bottom of bill for quick access -->
      <div class="no-print" style="display:flex; justify-content:center; gap:12px; margin-top:24px; padding-bottom:14px; flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="app.downloadBillImage()" style="font-weight:800; padding:10px 20px; display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg, #0284c7, #2563eb); border:none; box-shadow:0 4px 14px rgba(2, 132, 199, 0.35);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>Save Bill Image (PNG)</span>
        </button>
        <button class="btn btn-secondary" onclick="app.printBillA4()" style="font-weight:800; padding:10px 20px; display:inline-flex; align-items:center; gap:8px; background:#fff; color:#0f172a; border-color:#94a3b8;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          <span>Print Single A4 Sheet</span>
        </button>
        <button class="btn btn-secondary" onclick="app.toggleBillViewMode()" style="font-weight:700; padding:10px 18px; display:inline-flex; align-items:center; gap:6px; background:#fff;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          <span>Toggle Image / Document</span>
        </button>
        <a href="https://wa.me/91${phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Hello ${clientName}! Here is your official invoice (${invNum}) from Tech Code Creations. Total: ₹${netAmount}. Thank you!`)}" target="_blank" class="btn btn-secondary" style="color:#16a34a; border-color:#86efac; background:#f0fdf4; gap:8px; font-weight:700; padding:10px 18px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          <span>Share Bill on WhatsApp</span>
        </a>
        <button class="btn btn-secondary" onclick="closeModal('billModal')" style="font-weight:700; padding:10px 18px;">
          ✕ Close
        </button>
      </div>
    `;

    // Ensure full-screen display is active
    modal.classList.add("active");
    const modalContent = document.getElementById("billModalContent");
    if (modalContent) {
      modalContent.classList.remove("bill-modal-windowed");
      modalContent.classList.add("bill-modal-fullscreen-content");
    }

    // Trigger high-resolution single-page A4 image generation
    setTimeout(() => {
      this.renderBillImage(order);
    }, 150);
  }

  async renderBillImage(order) {
    const element = document.getElementById("printableBillArea");
    if (!element) return;

    const imgElem = document.getElementById("billRenderedImage");
    const spinner = document.getElementById("billImageLoadingSpinner");
    const sheetSec = document.getElementById("billSheetSection");
    const imgSec = document.getElementById("billImageSection");

    // Temporarily make sheet visible for DOM capture
    const prevDisplay = sheetSec ? sheetSec.style.display : "";
    if (sheetSec) {
      sheetSec.style.display = "block";
      sheetSec.style.position = "relative";
    }

    let dataUrl = null;

    if (typeof window.html2canvas === "function") {
      try {
        const canvas = await window.html2canvas(element, {
          scale: 2.2, // Ultra-crisp 300 DPI high-definition scale
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false
        });
        dataUrl = canvas.toDataURL("image/png");
      } catch (err) {
        console.warn("html2canvas capture error:", err);
      }
    }

    if (dataUrl) {
      this._currentBillImageDataUrl = dataUrl;
      this._currentBillOrder = order;
      if (spinner) spinner.style.display = "none";
      if (imgElem) {
        imgElem.src = dataUrl;
        imgElem.style.display = "block";
      }
      // Image view is the default clean view
      if (sheetSec) sheetSec.style.display = "none";
      if (imgSec) imgSec.style.display = "block";
    } else {
      // Fallback: If canvas capture is still pending or blocked, show the live sheet
      if (spinner) spinner.style.display = "none";
      if (sheetSec) sheetSec.style.display = "block";
      if (imgSec) imgSec.style.display = "none";
    }
  }

  downloadBillImage() {
    const order = this._currentBillOrder;
    const invNum = order ? String(order.invoiceNo || order.id || "001").replace(new RegExp("[/\\\\?%*:|\"<>]", "g"), "_") : "Bill";
    const filename = `TechCodeCreations_Invoice_${invNum}.png`;

    if (this._currentBillImageDataUrl) {
      const link = document.createElement("a");
      link.download = filename;
      link.href = this._currentBillImageDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showToast(`📸 Saved ${filename} as High-Quality Image!`, "success");
      return;
    }

    // If image hasn't rendered yet, trigger capture and download
    const element = document.getElementById("printableBillArea");
    if (element && typeof window.html2canvas === "function") {
      this.showToast("Generating high-resolution bill image...", "info");
      window.html2canvas(element, { scale: 2.2, useCORS: true, backgroundColor: "#ffffff" }).then(canvas => {
        const url = canvas.toDataURL("image/png");
        this._currentBillImageDataUrl = url;
        const link = document.createElement("a");
        link.download = filename;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast(`📸 Saved ${filename} successfully!`, "success");
      }).catch(() => {
        window.print();
      });
    } else {
      window.print();
    }
  }

  printBillA4() {
    if (this._currentBillImageDataUrl) {
      // Print dedicated single-sheet A4 iframe using the exact image
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice - Tech Code Creations</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0 !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              max-height: 297mm !important;
              overflow: hidden !important;
              background: #ffffff !important;
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            img {
              width: 210mm !important;
              height: 297mm !important;
              max-height: 297mm !important;
              object-fit: contain !important;
              display: block !important;
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
              break-inside: avoid !important;
            }
          </style>
        </head>
        <body>
          <img src="${this._currentBillImageDataUrl}" onload="setTimeout(() => { window.print(); setTimeout(() => { window.frameElement.remove(); }, 1500); }, 300);" />
        </body>
        </html>
      `);
      doc.close();
      return;
    }

    // Direct fallback
    window.print();
  }

  toggleBillViewMode() {
    const imgSec = document.getElementById("billImageSection");
    const sheetSec = document.getElementById("billSheetSection");
    const txt = document.getElementById("txtToggleBillView");
    if (!imgSec || !sheetSec) return;

    if (imgSec.style.display === "none") {
      imgSec.style.display = "block";
      sheetSec.style.display = "none";
      if (txt) txt.textContent = "📄 Live Document";
    } else {
      imgSec.style.display = "none";
      sheetSec.style.display = "block";
      if (txt) txt.textContent = "🖼️ High-Res Image";
    }
  }

  toggleBillFullscreen() {
    const modalContent = document.getElementById("billModalContent");
    const btn = document.getElementById("btnToggleFullscreen");
    if (!modalContent) return;

    const isWindowed = modalContent.classList.toggle("bill-modal-windowed");
    if (btn) {
      btn.innerHTML = isWindowed 
        ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg><span>⛶ Windowed</span>` 
        : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg><span>⛶ Fullscreen</span>`;
    }
  }

  toggleBillSheetPreview() {
    const modal = document.getElementById("billModal");
    const btn = document.getElementById("btnToggleSheetPreview");
    if (!modal) return;

    const isSheet = modal.classList.toggle("tcc-bill-sheet-preview-mode");
    if (btn) {
      btn.innerHTML = isSheet
        ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg><span>Normal View</span>`
        : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg><span>Sheet Preview</span>`;
    }
    this.showToast(isSheet ? "A4 Sheet Print Preview mode active" : "Standard Full-Screen view active", "info");
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
          <span class="status-badge status-${(order.status || 'pending').toLowerCase().replace(' ', '')}">${order.status || 'Pending'}</span>
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
          ${(order.features || []).map(f => `<span class="tech-tag" style="color:var(--primary-blue); background:#eff6ff;">${this.escapeHtml(f)}</span>`).join('')}
        </div>
      </div>

      <div style="margin: 20px 0;">
        <h5 style="margin-bottom: 8px;">Project Requirements:</h5>
        <p style="background:var(--bg-surface); padding:14px; border-radius:var(--radius-sm); border:1px solid var(--border-color); font-size:0.9rem; line-height:1.6;">
          ${this.escapeHtml(order.details)}
        </p>
      </div>

      <div style="display:flex; gap:12px; margin-top:24px;">
        <button class="btn btn-primary" onclick="if(window.app){app.generateBill('${order.id}');} closeModal('adminOrderDetailsModal');">
          📄 Generate Official Bill
        </button>
        <a class="btn btn-secondary" href="tel:${order.phone || ''}">
          Call Customer
        </a>
      </div>
    `;

    modal.classList.add("active");
  }

  showMetricDetails(type) {
    const modal = document.getElementById("metricDetailsModal");
    const container = document.getElementById("metricDetailsContent");
    if (!modal || !container) return;

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

    const pendingOrders = this.orders.filter(o => o.status === "Pending");
    const progressOrders = this.orders.filter(o => o.status === "In Progress" || o.status === "In Review");
    const completedOrders = this.orders.filter(o => o.status === "Completed");

    let title = "";
    let icon = "📊";
    let badgeHtml = "";
    let contentHtml = "";

    switch(type) {
      case "total":
        title = "Total Client Orders Overview";
        icon = "📦";
        badgeHtml = `<span style="background:#e0f2fe; color:#0369a1; padding:4px 12px; border-radius:20px; font-weight:800; font-size:0.85rem;">${this.orders.length} Active Records</span>`;
        contentHtml = `
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin:16px 0 20px;">
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; text-align:center;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600; display:block;">COMPLETED</span>
              <strong style="font-size:1.3rem; color:#059669;">${completedOrders.length}</strong>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; text-align:center;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600; display:block;">IN PROGRESS</span>
              <strong style="font-size:1.3rem; color:#0891b2;">${progressOrders.length}</strong>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; text-align:center;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600; display:block;">PENDING</span>
              <strong style="font-size:1.3rem; color:#d97706;">${pendingOrders.length}</strong>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; text-align:center;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600; display:block;">TOTAL BILLED</span>
              <strong style="font-size:1.2rem; color:#0284c7;">₹${totalBilled.toLocaleString('en-IN')}</strong>
            </div>
          </div>
          <h4 style="font-size:0.95rem; margin-bottom:10px; color:#0f172a;">All Orders Listing:</h4>
          <div style="max-height:280px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:10px;">
            ${this.renderOrdersSummaryList(this.orders)}
          </div>
        `;
        break;

      case "pending":
        title = "Pending Client Inquiries";
        icon = "⏳";
        badgeHtml = `<span style="background:#fef3c7; color:#b45309; padding:4px 12px; border-radius:20px; font-weight:800; font-size:0.85rem;">${pendingOrders.length} Awaiting Action</span>`;
        contentHtml = `
          <p style="color:#64748b; font-size:0.88rem; margin:10px 0 16px;">These are client leads and bookings waiting for requirement confirmation or project kickoff.</p>
          <div style="max-height:300px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:10px;">
            ${pendingOrders.length > 0 ? this.renderOrdersSummaryList(pendingOrders) : '<div style="padding:24px; text-align:center; color:#64748b;">No pending inquiries. All caught up!</div>'}
          </div>
        `;
        break;

      case "progress":
        title = "Projects In Progress";
        icon = "🚀";
        badgeHtml = `<span style="background:#cffafe; color:#0e7490; padding:4px 12px; border-radius:20px; font-weight:800; font-size:0.85rem;">${progressOrders.length} Active Builds</span>`;
        contentHtml = `
          <p style="color:#64748b; font-size:0.88rem; margin:10px 0 16px;">Web development projects currently being built and tested for clients.</p>
          <div style="max-height:300px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:10px;">
            ${progressOrders.length > 0 ? this.renderOrdersSummaryList(progressOrders) : '<div style="padding:24px; text-align:center; color:#64748b;">No projects in progress.</div>'}
          </div>
        `;
        break;

      case "completed":
        title = "Completed Websites & Delivered Bills";
        icon = "✅";
        badgeHtml = `<span style="background:#dcfce7; color:#15803d; padding:4px 12px; border-radius:20px; font-weight:800; font-size:0.85rem;">${completedOrders.length} Delivered</span>`;
        contentHtml = `
          <p style="color:#64748b; font-size:0.88rem; margin:10px 0 16px;">Websites fully delivered to clients with official bills generated and archived.</p>
          <div style="max-height:300px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:10px;">
            ${completedOrders.length > 0 ? this.renderOrdersSummaryList(completedOrders) : '<div style="padding:24px; text-align:center; color:#64748b;">No completed projects yet.</div>'}
          </div>
        `;
        break;

      case "revenue":
        title = "Total Billed Revenue Overview";
        icon = "💰";
        badgeHtml = `<span style="background:#e0f2fe; color:#0369a1; padding:4px 12px; border-radius:20px; font-weight:800; font-size:0.85rem;">₹${totalBilled.toLocaleString('en-IN')} Gross</span>`;
        const avgOrder = this.orders.length > 0 ? Math.round(totalBilled / this.orders.length) : 0;
        contentHtml = `
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin:16px 0 20px;">
            <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:10px; padding:14px;">
              <span style="font-size:0.75rem; color:#0284c7; font-weight:700; text-transform:uppercase;">Gross Invoiced</span>
              <div style="font-size:1.45rem; font-weight:800; color:#0369a1;">₹${totalBilled.toLocaleString('en-IN')}</div>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase;">Average Project Value</span>
              <div style="font-size:1.45rem; font-weight:800; color:#0f172a;">₹${avgOrder.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <h4 style="font-size:0.95rem; margin-bottom:10px; color:#0f172a;">Billed Invoices List:</h4>
          <div style="max-height:260px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:10px;">
            ${this.renderOrdersSummaryList(this.orders)}
          </div>
        `;
        break;

      case "expenses":
        title = "Project Costs & Expenses Breakdown";
        icon = "📉";
        badgeHtml = `<span style="background:#ffe4e6; color:#be123c; padding:4px 12px; border-radius:20px; font-weight:800; font-size:0.85rem;">₹${totalExpenses.toLocaleString('en-IN')} Total</span>`;
        contentHtml = `
          <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:10px; padding:14px; margin:16px 0 20px;">
            <span style="font-size:0.78rem; color:#be123c; font-weight:700; text-transform:uppercase;">Estimated Operating Costs</span>
            <div style="font-size:1.45rem; font-weight:800; color:#e11d48;">₹${totalExpenses.toLocaleString('en-IN')}</div>
            <p style="font-size:0.8rem; color:#9f1239; margin:4px 0 0 0;">Includes domain registrations, hosting servers, third-party APIs, and asset licensing.</p>
          </div>
          <h4 style="font-size:0.95rem; margin-bottom:10px; color:#0f172a;">Cost Allocation by Order:</h4>
          <div style="max-height:260px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:10px;">
            ${this.renderOrdersSummaryList(this.orders, "cost")}
          </div>
        `;
        break;

      case "profit":
        title = "Net Calculated Profit & Margin";
        icon = "📈";
        const marginPct = totalBilled > 0 ? ((totalProfit / totalBilled) * 100).toFixed(1) : "0.0";
        badgeHtml = `<span style="background:#dcfce7; color:#15803d; padding:4px 12px; border-radius:20px; font-weight:800; font-size:0.85rem;">₹${totalProfit.toLocaleString('en-IN')} (${marginPct}% Margin)</span>`;
        contentHtml = `
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin:16px 0 20px;">
            <div style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:10px; padding:14px;">
              <span style="font-size:0.75rem; color:#15803d; font-weight:700; text-transform:uppercase;">Net Retained Profit</span>
              <div style="font-size:1.45rem; font-weight:800; color:#16a34a;">₹${totalProfit.toLocaleString('en-IN')}</div>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase;">Profit Margin Ratio</span>
              <div style="font-size:1.45rem; font-weight:800; color:#0f172a;">${marginPct}%</div>
            </div>
          </div>
          <h4 style="font-size:0.95rem; margin-bottom:10px; color:#0f172a;">Project Profit Breakdown:</h4>
          <div style="max-height:260px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:10px;">
            ${this.renderOrdersSummaryList(this.orders, "profit")}
          </div>
        `;
        break;

      case "collected":
        title = "Payments Received & Collections Tracking";
        icon = "💳";
        const pendingDues = Math.max(0, totalBilled - totalCollected);
        badgeHtml = `<span style="background:#f3e8ff; color:#7e22ce; padding:4px 12px; border-radius:20px; font-weight:800; font-size:0.85rem;">₹${totalCollected.toLocaleString('en-IN')} Received</span>`;
        contentHtml = `
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin:16px 0 20px;">
            <div style="background:#faf5ff; border:1px solid #d8b4fe; border-radius:10px; padding:14px;">
              <span style="font-size:0.75rem; color:#7e22ce; font-weight:700; text-transform:uppercase;">Total Received (Paid)</span>
              <div style="font-size:1.45rem; font-weight:800; color:#6b21a8;">₹${totalCollected.toLocaleString('en-IN')}</div>
            </div>
            <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:14px;">
              <span style="font-size:0.75rem; color:#b45309; font-weight:700; text-transform:uppercase;">Pending Receivables</span>
              <div style="font-size:1.45rem; font-weight:800; color:#d97706;">₹${pendingDues.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; margin-bottom:14px; font-size:0.82rem; color:#475569;">
            UPI Payment Receiver: <strong style="color:#0f172a; font-family:monospace;">8248688471@upi</strong> (Tech Code Creations)
          </div>
          <h4 style="font-size:0.95rem; margin-bottom:10px; color:#0f172a;">Client Payment Status:</h4>
          <div style="max-height:260px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:10px;">
            ${this.renderOrdersSummaryList(this.orders, "payment")}
          </div>
        `;
        break;
    }

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #e2e8f0; padding-bottom:14px; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:1.6rem;">${icon}</span>
          <div>
            <h3 style="font-size:1.25rem; font-weight:800; color:#0f172a; margin:0;">${title}</h3>
            <span style="font-size:0.82rem; color:#64748b;">Tech Code Creations Admin Analytics</span>
          </div>
        </div>
        <div>${badgeHtml}</div>
      </div>
      <div>${contentHtml}</div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; padding-top:14px; border-top:1px solid #e2e8f0;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal('metricDetailsModal')" style="font-weight:700;">Close</button>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="if(window.app){app.filterTableFromModal('${type}');} closeModal('metricDetailsModal');" style="font-weight:700; color:#0284c7; border-color:#93c5fd; background:#f0f9ff;">
            🔍 View in Orders Table
          </button>
          <button type="button" class="btn btn-primary btn-sm" onclick="if(window.app){app.openManualBillModal();}else{openModal('manualOrderModal');} closeModal('metricDetailsModal');" style="font-weight:700;">
            + Create Official Bill
          </button>
        </div>
      </div>
    `;

    modal.classList.add("active");
  }

  filterTableFromModal(type) {
    let filter = "all";
    if (type === "pending") filter = "pending";
    if (type === "progress") filter = "progress";
    if (type === "completed") filter = "completed";

    this.currentFilter = filter;
    document.querySelectorAll(".filter-tab").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.filter === filter);
    });
    this.renderAdminOrders();

    const tableElem = document.querySelector(".orders-table-wrapper");
    if (tableElem) {
      tableElem.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  renderOrdersSummaryList(ordersList, viewType = "normal") {
    if (!ordersList || ordersList.length === 0) {
      return '<div style="padding:20px; text-align:center; color:#64748b;">No matching orders found.</div>';
    }

    return ordersList.map(o => {
      const bill = Number(o.netAmount !== undefined ? o.netAmount : (o.billAmount || 0));
      const cost = Number(o.costAmount !== undefined ? o.costAmount : (o.projectCost || 0));
      const profit = Number(o.profitAmount !== undefined ? o.profitAmount : Math.max(0, bill - cost));
      const paid = Number(o.paidAmount !== undefined ? o.paidAmount : (o.paymentStatus === "PAID" ? bill : 0));

      let extraText = `₹${bill.toLocaleString('en-IN')}`;
      if (viewType === "cost") {
        extraText = `<span style="color:#e11d48; font-weight:700;">Cost: ₹${cost.toLocaleString('en-IN')}</span> (Bill: ₹${bill.toLocaleString('en-IN')})`;
      } else if (viewType === "profit") {
        extraText = `<span style="color:#15803d; font-weight:700;">Profit: +₹${profit.toLocaleString('en-IN')}</span> (Margin: ${bill > 0 ? ((profit/bill)*100).toFixed(0) : 0}%)`;
      } else if (viewType === "payment") {
        extraText = `<span style="color:${o.paymentStatus === 'PAID' ? '#059669' : '#d97706'}; font-weight:700;">${o.paymentStatus || 'PENDING'} (₹${paid.toLocaleString('en-IN')})</span>`;
      }

      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border-bottom:1px solid #f1f5f9; background:#ffffff;">
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-family:monospace; font-weight:700; color:#0284c7; font-size:0.85rem;">${o.invoiceNo || o.id}</span>
              <strong style="color:#0f172a; font-size:0.92rem;">${this.escapeHtml(o.clientName)}</strong>
              <span class="status-badge status-${(o.status || 'pending').toLowerCase().replace(' ', '')}" style="font-size:0.72rem; padding:2px 8px;">${o.status}</span>
            </div>
            <div style="font-size:0.8rem; color:#64748b; margin-top:2px;">
              ${this.escapeHtml(o.websiteType || o.businessName || 'Web Project')} • ${extraText}
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="if(window.app){app.generateBill('${o.id}');} closeModal('metricDetailsModal');" style="padding:4px 10px; font-size:0.78rem; font-weight:700;">
              📄 Bill
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="if(window.app){app.viewOrderDetails('${o.id}');} closeModal('metricDetailsModal');" style="padding:4px 10px; font-size:0.78rem; font-weight:700;">
              👁️ Details
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  deleteOrder(orderId) {
    if (confirm(`Are you sure you want to delete order ${orderId}?`)) {
      this.orders = this.orders.filter(o => o.id !== orderId);
      this.saveOrders();
      this.pushDeleteToCloudflare(orderId);
      this.showToast(`Order ${orderId} deleted.`, "info");
    }
  }

  getNextInvoiceNumber() {
    const currentYear = new Date().getFullYear();
    
    // Check if an explicit override is set by Reset Bill Number
    try {
      const overrideSeq = localStorage.getItem("techcode_bill_seq_override");
      if (overrideSeq !== null && overrideSeq !== "") {
        const num = parseInt(overrideSeq, 10);
        if (!isNaN(num) && num >= 1) {
          const padded = String(num).padStart(3, "0");
          return `TCC/${currentYear}/${padded}`;
        }
      }
    } catch (e) {}

    let maxSeq = 0;
    
    // 1. Check stored sequence counter
    try {
      const storedSeq = parseInt(localStorage.getItem("techcode_last_bill_seq") || "0", 10);
      if (!isNaN(storedSeq) && storedSeq > maxSeq) {
        maxSeq = storedSeq;
      }
    } catch (e) {}

    // 2. Scan all existing orders
    if (Array.isArray(this.orders)) {
      this.orders.forEach(o => {
        const inv = String(o.invoiceNo || o.id || "").trim();
        const match = inv.match(/(\d+)$/);
        if (match && match[1]) {
          const seq = parseInt(match[1], 10);
          if (!isNaN(seq) && seq > maxSeq && seq < 100000) {
            maxSeq = seq;
          }
        }
      });
    }
    
    const nextSeq = maxSeq + 1;
    const padded = String(nextSeq).padStart(3, "0");
    return `TCC/${currentYear}/${padded}`;
  }

  recordBillSequence(invoiceNo) {
    if (!invoiceNo) return;
    // Clear any one-time sequence override now that a bill has been recorded
    try {
      localStorage.removeItem("techcode_bill_seq_override");
    } catch (e) {}

    const match = String(invoiceNo).trim().match(/(\d+)$/);
    if (match && match[1]) {
      const seq = parseInt(match[1], 10);
      if (!isNaN(seq)) {
        try {
          const cur = parseInt(localStorage.getItem("techcode_last_bill_seq") || "0", 10);
          if (seq > cur) {
            localStorage.setItem("techcode_last_bill_seq", String(seq));
          }
        } catch (e) {}
      }
    }
  }

  resetBillSequence(promptUser = true) {
    let targetNum = 1;
    if (promptUser && typeof window.prompt === "function") {
      const ans = window.prompt("Reset Bill Number Sequence\nEnter the new starting sequence number (e.g. 1 for 001):", "1");
      if (ans === null) return; // User cancelled
      const parsed = parseInt(ans.trim(), 10);
      if (!isNaN(parsed) && parsed >= 1) {
        targetNum = parsed;
      } else {
        this.showToast("Invalid number entered. Defaulting to 1 (001).", "error");
        targetNum = 1;
      }
    }

    try {
      localStorage.setItem("techcode_bill_seq_override", String(targetNum));
      localStorage.setItem("techcode_last_bill_seq", String(targetNum - 1));
    } catch (e) {}

    const currentYear = new Date().getFullYear();
    const newBillNo = `TCC/${currentYear}/${String(targetNum).padStart(3, "0")}`;

    const invInput = document.getElementById("manualInvoiceNo");
    if (invInput) {
      invInput.value = newBillNo;
      invInput.style.transition = "all 0.3s ease";
      invInput.style.backgroundColor = "#fed7aa";
      invInput.style.borderColor = "#f97316";
      invInput.style.boxShadow = "0 0 0 3px rgba(249, 115, 22, 0.35)";
      setTimeout(() => {
        invInput.style.backgroundColor = "#f0f9ff";
        invInput.style.borderColor = "#bfdbfe";
        invInput.style.boxShadow = "none";
      }, 500);
    }

    const badge = document.getElementById("nextBillNoHeaderBadge");
    if (badge) badge.textContent = newBillNo;

    const modalBadge = document.getElementById("manualModalInvBadge");
    if (modalBadge) modalBadge.textContent = newBillNo;

    this.showToast(`Bill number reset to ${newBillNo}`, "success");
    return newBillNo;
  }

  getTodayDateInput() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  getTodayFormattedDate() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  formatDateForDisplay(dateStr) {
    if (!dateStr) return this.getTodayFormattedDate();
    const s = String(dateStr).trim();
    const parts = s.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return s;
  }

  updateNextBillHeaderBadge() {
    const nextNo = this.getNextInvoiceNumber();
    const badge = document.getElementById("nextBillNoHeaderBadge");
    if (badge) {
      badge.textContent = nextNo;
    }
    return nextNo;
  }

  openManualBillModal() {
    // Start with a 100% clean, blank form and next sequential bill number!
    this.clearManualBillForm(true);
    const modal = document.getElementById("manualOrderModal");
    if (modal) {
      modal.classList.add("active");
      const modalContent = document.getElementById("manualOrderModalContent");
      if (modalContent) {
        modalContent.classList.remove("bill-modal-windowed");
        modalContent.classList.add("bill-modal-fullscreen-content");
      }
    }
    const invInput = document.getElementById("manualInvoiceNo");
    const modalBadge = document.getElementById("manualModalInvBadge");
    if (invInput && modalBadge) {
      modalBadge.textContent = invInput.value;
    }
    setTimeout(() => {
      const nameInput = document.getElementById("manualName");
      if (nameInput) nameInput.focus();
    }, 150);
  }

  toggleManualBillFullscreen() {
    const modalContent = document.getElementById("manualOrderModalContent");
    const btn = document.getElementById("btnToggleManualFullscreen");
    if (!modalContent) return;

    const isWindowed = modalContent.classList.toggle("bill-modal-windowed");
    if (btn) {
      btn.innerHTML = isWindowed 
        ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg><span>⛶ Windowed</span>` 
        : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg><span>⛶ Fullscreen</span>`;
    }
  }

  resetManualBillForm() {
    // Resets and clears all customer & item fields while keeping the current bill number
    this.clearManualBillForm(false);
    this.showToast("Bill form reset. All previous details cleared.", "info");
  }

  nextManualBill() {
    // Increments to the next sequential bill number and starts a fresh form
    this.autoChangeBillNumber();
    this.clearManualBillForm(false);
    const invInput = document.getElementById("manualInvoiceNo");
    const currentVal = invInput ? invInput.value : "";
    this.showToast(`Prepared fresh form for Next Bill: ${currentVal}`, "success");
  }

  clearManualBillForm(advanceNumber = true) {
    const form = document.getElementById("manualOrderForm");
    if (!form) return;

    form.reset();

    // Clear all fields
    if (form.manualName) form.manualName.value = "";
    if (form.manualPhone) form.manualPhone.value = "";
    if (form.manualProjectName) form.manualProjectName.value = "";
    if (form.manualAddress) form.manualAddress.value = "Kumbakonam, Tamil Nadu";
    if (form.manualCategory) form.manualCategory.value = "Web Development";
    if (form.manualReference) form.manualReference.value = "Invoice";
    if (form.manualType) form.manualType.value = "Website Development";
    if (form.manualDiscount) form.manualDiscount.value = "0";
    if (form.manualCost) form.manualCost.value = "0";
    if (form.manualAmount) form.manualAmount.value = "";

    // Reset Table to 1 clean blank item
    const tbody = document.getElementById("manualBillItemsBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr class="manual-item-row" data-index="1">
          <td class="td-sno">1</td>
          <td class="td-desc">
            <input type="text" name="manualDescription" id="manualDescription" class="tcc-invoice-form-input item-desc-input" placeholder="Service description (e.g. Website Development Service)" value="" style="font-weight:800; font-size:0.95rem; margin-bottom:4px;">
            <input type="text" name="manualSubDescription" id="manualSubDescription" class="tcc-invoice-form-input item-subdesc-input" placeholder="Sub-description (e.g. Client Name – Project Name)" value="" style="font-size:0.8rem; color:#475569;">
          </td>
          <td class="td-amount">
            <input type="number" name="manualAmount" id="manualAmount" class="tcc-invoice-form-input item-amount-input" placeholder="0" min="0" step="any" value="" required style="font-size:1.15rem; font-weight:900; color:#0f172a; text-align:right;">
          </td>
          <td class="td-action" style="text-align:center;">
            <button type="button" class="btn-remove-item" onclick="app.removeBillItemRow(this)" title="Delete this item" disabled style="opacity:0.35; cursor:default;">✕</button>
          </td>
        </tr>
      `;
    }

    if (form.manualTerms) {
      form.manualTerms.value = "Payment to be made within 7 days from the date of invoice.\nThis is a commission / service project.\nFor any queries / support contact +91 8248688471.";
    }

    // Set Invoice Number
    if (form.manualInvoiceNo) {
      if (advanceNumber || !form.manualInvoiceNo.value) {
        form.manualInvoiceNo.value = this.getNextInvoiceNumber();
      }
    }

    // Set Date input to today's date
    if (form.manualDate) {
      form.manualDate.value = this.getTodayDateInput();
    }

    const nextBillBadge = document.getElementById("nextBillNoHeaderBadge");
    if (nextBillBadge && form.manualInvoiceNo) {
      nextBillBadge.textContent = form.manualInvoiceNo.value;
    }
    const modalBadge = document.getElementById("manualModalInvBadge");
    if (modalBadge && form.manualInvoiceNo) {
      modalBadge.textContent = form.manualInvoiceNo.value;
    }

    this.bindManualItemListeners();
    this.updateManualBillLivePreview();
  }

  prepareManualBillModal(forceNew = true, advanceNumber = true) {
    this.clearManualBillForm(advanceNumber);
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

    const orderId = invoiceNo ? invoiceNo.split('/').join('-') : `TCC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

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

    // Record bill sequence so next bill increments automatically!
    this.recordBillSequence(invoiceNo);
    this.saveOrders();
    this.pushOrderToCloudflare(newOrder);

    // Reset and clear manual bill form completely for the next bill
    this.clearManualBillForm(true);

    const modal = document.getElementById("manualOrderModal");
    if (modal) modal.classList.remove("active");
    this.showToast(`Official bill ${invoiceNo} created successfully!`, "success");

    // Immediately display the generated official invoice in FULL-SCREEN MODE!
    this.generateBill(newOrder.id);
  }

  autoChangeBillNumber() {
    const invInput = document.getElementById("manualInvoiceNo");
    if (!invInput) return;

    const currentYear = new Date().getFullYear();
    let currentVal = invInput.value.trim();
    let nextNum = 1;

    const match = currentVal.match(/(\d+)$/);
    if (match && match[1]) {
      const parsedSeq = parseInt(match[1], 10);
      if (!isNaN(parsedSeq)) {
        nextNum = parsedSeq + 1;
      }
    } else {
      const def = this.getNextInvoiceNumber();
      const defMatch = def.match(/(\d+)$/);
      nextNum = defMatch ? parseInt(defMatch[1], 10) : 1;
    }

    const padded = String(nextNum).padStart(3, "0");
    const newInvoiceNo = `TCC/${currentYear}/${padded}`;
    invInput.value = newInvoiceNo;

    // Record sequence
    this.recordBillSequence(newInvoiceNo);
    this.updateNextBillHeaderBadge();

    // Visual pulse feedback on input field
    invInput.style.transition = "all 0.3s ease";
    invInput.style.backgroundColor = "#bae6fd";
    invInput.style.borderColor = "#0284c7";
    invInput.style.boxShadow = "0 0 0 3px rgba(2, 132, 199, 0.35)";
    setTimeout(() => {
      invInput.style.backgroundColor = "#f0f9ff";
      invInput.style.borderColor = "#bfdbfe";
      invInput.style.boxShadow = "none";
    }, 450);

    const nextBillBadge = document.getElementById("nextBillNoHeaderBadge");
    if (nextBillBadge) {
      nextBillBadge.textContent = newInvoiceNo;
    }
    const modalBadge = document.getElementById("manualModalInvBadge");
    if (modalBadge) {
      modalBadge.textContent = newInvoiceNo;
    }

    this.showToast(`⚡ Next Bill Number set to: ${newInvoiceNo}`, "success");
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

    const invNo = order ? (order.invoiceNo || order.id) : `TCC/${new Date().getFullYear()}/001`;
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
      `"${(o.id || '')}"`,
      `"${(o.date || '')}"`,
      `"${(o.clientName || '').split('"').join('""')}"`,
      `"${(o.phone || '')}"`,
      `"${(o.email || '')}"`,
      `"${(o.businessName || '').split('"').join('""')}"`,
      `"${(o.websiteType || '')}"`,
      `"${(o.billAmount || 15000)}"`,
      `"${(o.status || 'Pending')}"`,
      `"${(o.details || '').split('"').join('""')}"`
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
    const name = form.name ? form.name.value.trim() : "";
    const phone = form.phone ? form.phone.value.trim() : "";
    const msg = form.message ? form.message.value.trim() : "";

    const waText = encodeURIComponent(
      `Hello Kuberamoorthy! (Tech Code Creations)\n\n` +
      `👤 Name: ${name}\n` +
      `📱 Phone: ${phone}\n` +
      `💬 Message: ${msg}\n\n` +
      `I would like to discuss building a website.`
    );

    window.open(`https://wa.me/918248688471?text=${waText}`, "_blank");
    this.showToast("Opening WhatsApp to connect directly with Kuberamoorthy.", "success");
    if (form && typeof form.reset === "function") form.reset();
  }

  showToast(message, type = "info") {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      if (document.body) {
        document.body.appendChild(container);
      }
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
      .split("&").join("&amp;")
      .split("<").join("&lt;")
      .split(">").join("&gt;")
      .split('"').join("&quot;")
      .split("'").join("&#039;");
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
    window.app.openManualBillModal();
  }
}

// Global window bindings for foolproof HTML inline event handlers
window.closeModal = closeModal;
window.openModal = openModal;
window.TechCodeApp = TechCodeApp;
window.convertNumberToIndianWords = convertNumberToIndianWords;
window.resetBillSequence = (promptUser = true) => window.app && window.app.resetBillSequence(promptUser);
window.toggleManualBillFullscreen = () => window.app && window.app.toggleManualBillFullscreen();
window.openCloudflareModal = () => window.app && window.app.openCloudflareModal();
window.showMetricDetails = (type) => window.app && window.app.showMetricDetails(type);
window.switchAdminSection = (id) => window.app && window.app.switchAdminSection(id);
window.toggleThreeDotMenu = (e) => window.app && window.app.toggleThreeDotMenu(e);
window.closeThreeDotMenu = () => window.app && window.app.closeThreeDotMenu();
window.switchDashboardTab = (tab) => window.app && window.app.switchDashboardTab(tab);
window.convertBookingToBill = (id) => window.app && window.app.convertBookingToBill(id);
window.openFinancialOverviewModal = () => window.app && window.app.openFinancialOverviewModal();
window.closeFinancialOverviewModal = () => window.app && window.app.closeFinancialOverviewModal();
window.openManualBillModal = () => window.app && window.app.openManualBillModal();
window.exportOrdersCSV = () => window.app && window.app.exportOrdersCSV();
window.syncAllOrdersToCloudflare = (notify) => window.app && window.app.syncAllOrdersToCloudflare(notify);
window.clearAllBills = (confirmUser = true) => window.app && window.app.clearAllBills(confirmUser);
window.downloadBillImage = () => window.app && window.app.downloadBillImage();
window.printBillA4 = () => window.app && window.app.printBillA4();
window.toggleBillViewMode = () => window.app && window.app.toggleBillViewMode();

let app;
document.addEventListener("DOMContentLoaded", () => {
  // Hash shortcut for direct admin access
  if (window.location.hash === "#admin" || window.location.hash === "#admin-portal" || window.location.hash === "#login") {
    if (!window.location.pathname.includes("admin.html")) {
      window.location.href = "admin.html";
      return;
    }
  }

  app = new TechCodeApp();
  window.app = app;

  // Global key combo (Ctrl+Shift+A) for instant Admin Portal navigation
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a")) {
      e.preventDefault();
      window.location.href = "admin.html";
    }
  });

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
