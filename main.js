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

// Seed Orders
const INITIAL_ORDERS = [
  {
    id: "TCC-2026-1042",
    date: "2026-10-24 14:30",
    clientName: "Ramesh Babu",
    phone: "9842109876",
    email: "ramesh@andavatravels.in",
    businessName: "Andava Travels",
    websiteType: "Travel & Booking Portal",
    timeline: "Standard (1-2 Weeks)",
    features: ["WhatsApp Chat", "SEO Optimization", "Mobile Responsive", "Booking Engine"],
    details: "Complete travel tour package website with cab booking system and South India destinations showcase.",
    status: "Completed",
    notes: "Site is live at www.andavatravels.in! Client very satisfied.",
    billAmount: 28000,
    paidAmount: 28000,
    paymentStatus: "PAID"
  },
  {
    id: "TCC-2026-1088",
    date: "2026-10-25 11:15",
    clientName: "Saravanan K",
    phone: "9443217654",
    email: "orders@saravanacovering.com",
    businessName: "Sri Saravana Covering",
    websiteType: "E-Commerce Website",
    timeline: "Standard (1-2 Weeks)",
    features: ["Payment Gateway", "WhatsApp Chat", "Admin Dashboard", "SEO Optimization"],
    details: "Gold covering jewelry online catalog with bridal sets, necklaces, bangles and direct customer order inquiries.",
    status: "In Progress",
    notes: "Deployed to Vercel preview: sri-saravana-covering.vercel.app",
    billAmount: 38000,
    paidAmount: 20000,
    paymentStatus: "ADVANCE 50% PAID"
  },
  {
    id: "TCC-2026-1105",
    date: "2026-10-25 18:40",
    clientName: "Prakash Raj",
    phone: "8123456789",
    email: "prakash@kumbakonamdelight.com",
    businessName: "Kumbakonam Delights Cafe",
    websiteType: "Business & Restaurant Site",
    timeline: "Express (3-5 Days)",
    features: ["Mobile Responsive", "SEO Optimization", "WhatsApp Chat"],
    details: "Modern cafe menu showcase, table reservations, and Google Map integration in Kumbakonam.",
    status: "Pending",
    notes: "Follow-up scheduled for tomorrow morning.",
    billAmount: 18000,
    paidAmount: 0,
    paymentStatus: "PAYMENT DUE"
  }
];

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
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading localStorage:", e);
    }
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    return [...INITIAL_ORDERS];
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
    }

    // Export CSV
    const exportCsvBtn = document.getElementById("exportCsvBtn");
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener("click", () => this.exportOrdersToCSV());
    }

    // Reset Orders
    const resetOrdersBtn = document.getElementById("resetOrdersBtn");
    if (resetOrdersBtn) {
      resetOrdersBtn.addEventListener("click", () => {
        if (confirm("Reset orders database to initial demo sample?")) {
          this.orders = [...INITIAL_ORDERS];
          this.saveOrders();
          this.showToast("Orders database reset.", "info");
        }
      });
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

    if (!totalElem) return;

    totalElem.textContent = this.orders.length;
    pendingElem.textContent = this.orders.filter(o => o.status === "Pending").length;
    progressElem.textContent = this.orders.filter(o => o.status === "In Progress" || o.status === "In Review").length;
    completedElem.textContent = this.orders.filter(o => o.status === "Completed").length;
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

    tbody.querySelectorAll("tr:not(#emptyOrdersRow)").forEach(tr => tr.remove());

    if (filtered.length === 0) {
      if (emptyRow) emptyRow.style.display = "table-row";
      return;
    }
    if (emptyRow) emptyRow.style.display = "none";

    filtered.forEach(order => {
      const tr = document.createElement("tr");

      const waMsg = encodeURIComponent(`Hello ${order.clientName}! This is Kuberamoorthy from Tech Code Creations regarding your website booking (${order.id}).`);

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
          <span style="font-weight: 700; color: #1e3a8a;">₹${(order.billAmount || 15000).toLocaleString('en-IN')}</span><br>
          <span style="font-size: 0.74rem; font-weight: 700; color: ${order.paymentStatus === 'PAID' ? '#059669' : '#d97706'};">${order.paymentStatus || 'PAYMENT DUE'}</span>
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

    const invNum = `INV-${order.id.replace('TCC-', '')}`;
    const today = new Date().toISOString().slice(0, 10);
    const amount = order.billAmount || 18000;
    const paid = order.paidAmount || (order.status === 'Completed' ? amount : 0);
    const balance = Math.max(0, amount - paid);

    container.innerHTML = `
      <div class="bill-paper-container" id="printableBillArea">
        <!-- Bill Header -->
        <div class="bill-header">
          <div class="bill-brand-info">
            <img src="assets/images/logo.png" alt="Tech Code Creations" class="bill-logo-img">
            <div>
              <div class="bill-company-title">TECH CODE CREATIONS</div>
              <div style="font-size:0.85rem; font-weight:700; color:#2563eb;">YOUR VISION • OUR CODE • YOUR WEBSITE</div>
              <div style="font-size:0.8rem; color:#475569; margin-top:4px;">
                Founder: <strong>KUBERAMOORTHY S</strong> | Phone: <strong>8248688471</strong><br>
                Address: 85/A Seenivasa nagar, Sakkottai Post, Kumbakonam - 612401
              </div>
            </div>
          </div>
          <div class="bill-meta-right">
            <div class="bill-meta-badge">TAX INVOICE / BILL</div>
            <div class="bill-meta-row">Invoice No: <strong>${invNum}</strong></div>
            <div class="bill-meta-row">Date: <strong>${today}</strong></div>
            <div class="bill-meta-row">Order ID: <strong>${order.id}</strong></div>
          </div>
        </div>

        <!-- Bill Parties -->
        <div class="bill-parties-grid">
          <div class="bill-party-box">
            <h5>BILLED TO (CUSTOMER):</h5>
            <div class="bill-party-name">${this.escapeHtml(order.clientName)}</div>
            <div style="font-weight:600; color:#2563eb;">${this.escapeHtml(order.businessName)}</div>
            <div>Phone: <strong>${order.phone}</strong></div>
            <div>Email: ${this.escapeHtml(order.email)}</div>
          </div>
          <div class="bill-party-box" style="text-align:right;">
            <h5>PAYMENT DETAILS:</h5>
            <div>Status: <span style="display:inline-block; padding:3px 10px; border-radius:4px; font-weight:800; font-size:0.8rem; background:${balance === 0 ? '#d1fae5; color:#047857' : '#fef3c7; color:#b45309'};">${balance === 0 ? 'PAID FULL' : (paid > 0 ? 'PARTIALLY PAID' : 'PAYMENT DUE')}</span></div>
            <div style="margin-top:6px;">Payment Mode: <strong>Google Pay / PhonePe / Bank Transfer</strong></div>
            <div>UPI ID: <strong>8248688471@okaxis</strong></div>
          </div>
        </div>

        <!-- Itemized Table -->
        <table class="bill-table">
          <thead>
            <tr>
              <th style="width:8%;">#</th>
              <th style="width:52%;">Service Description</th>
              <th style="width:20%; text-align:center;">Delivery Time</th>
              <th style="width:20%; text-align:right;">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>
                <strong>${this.escapeHtml(order.websiteType)}</strong><br>
                <span style="font-size:0.8rem; color:#475569;">
                  Features included: ${order.features.join(", ")}.<br>
                  100% Mobile Responsive, Fast Speed Optimization, SSL Security.
                </span>
              </td>
              <td style="text-align:center;">${this.escapeHtml(order.timeline || 'Standard')}</td>
              <td style="text-align:right; font-weight:700;">₹${amount.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        <!-- Totals -->
        <div class="bill-totals-area">
          <div class="bill-totals-box">
            <div class="bill-total-row">
              <span>Subtotal:</span>
              <span>₹${amount.toLocaleString('en-IN')}</span>
            </div>
            <div class="bill-total-row">
              <span>GST / Taxes:</span>
              <span style="color:#059669;">Exempt / Included</span>
            </div>
            <div class="bill-total-row bill-grand-total">
              <span>Total Amount:</span>
              <span>₹${amount.toLocaleString('en-IN')}</span>
            </div>
            <div class="bill-total-row" style="color:#059669; font-weight:700;">
              <span>Amount Received:</span>
              <span>₹${paid.toLocaleString('en-IN')}</span>
            </div>
            <div class="bill-total-row" style="color:#b91c1c; font-weight:700; border-top:1px dashed #cbd5e1; padding-top:6px;">
              <span>Balance Due:</span>
              <span>₹${balance.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <!-- Terms and Signatures -->
        <div class="bill-signature-area">
          <div class="bill-seal-box">
            <span>OFFICIAL SEAL</span>
            <span style="font-size:0.6rem; color:#0f172a;">TECH CODE CREATIONS</span>
          </div>

          <div class="bill-sign-line">
            <div class="bill-sign-name">KUBERAMOORTHY S</div>
            <div style="font-size:0.78rem; color:#64748b;">Authorized Signatory / Founder</div>
            <div style="font-size:0.74rem; color:#0284c7;">Tech Code Creations, Kumbakonam</div>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="no-print" style="display:flex; justify-content:center; gap:14px; margin-top:24px;">
        <button class="btn btn-primary" onclick="window.print()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          <span>Print / Save as PDF</span>
        </button>
        <a href="https://wa.me/91${order.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Hello ${order.clientName}! Here is your website development invoice (${invNum}) from Tech Code Creations. Total: ₹${amount}. Thank you!`)}" target="_blank" class="btn btn-secondary" style="color:#16a34a; border-color:#86efac; gap:8px;">
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

  handleManualOrderSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const clientName = form.manualName.value.trim();
    const phone = form.manualPhone.value.trim();
    const businessName = form.manualBusiness.value.trim() || "Offline Client";
    const websiteType = form.manualType.value;
    const billAmount = parseInt(form.manualAmount ? form.manualAmount.value : 15000) || 15000;

    if (!clientName || !phone) {
      this.showToast("Client name and phone are required.", "error");
      return;
    }

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const newOrderId = `TCC-MANUAL-${randomDigits}`;

    const now = new Date();
    const dateFormatted = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    const newOrder = {
      id: newOrderId,
      date: dateFormatted,
      clientName,
      phone,
      email: "Offline Entry",
      businessName,
      websiteType,
      timeline: "Standard",
      features: ["Manual Booking", "Mobile Responsive"],
      details: form.manualNotes.value.trim() || "Offline phone booking recorded by admin.",
      status: "In Progress",
      notes: "Manually registered.",
      billAmount,
      paidAmount: 0,
      paymentStatus: "PAYMENT DUE"
    };

    this.orders.unshift(newOrder);
    this.saveOrders();
    form.reset();
    document.getElementById("manualOrderModal").classList.remove("active");
    this.showToast(`Manual order ${newOrderId} recorded!`, "success");
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
}

let app;
document.addEventListener("DOMContentLoaded", () => {
  app = new TechCodeApp();

  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("active");
    });
  });
});
