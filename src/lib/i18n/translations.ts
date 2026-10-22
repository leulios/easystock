export type Language = "en" | "am";

export interface Translations {
  // Brand & General
  appName: string;
  tagline: string;
  loading: string;
  save: string;
  cancel: string;
  confirm: string;
  delete: string;
  edit: string;
  add: string;
  search: string;
  actions: string;
  status: string;
  date: string;
  all: string;
  success: string;
  error: string;
  back: string;
  close: string;
  yes: string;
  no: string;
  areYouSure: string;

  // Navigation
  navDashboard: string;
  navSellItems: string;
  navPhoneScanner: string;
  navStock: string;
  navStockHistory: string;
  navItems: string;
  navImportItems: string;
  navReceiveGoods: string;
  navCustomers: string;
  navExpenses: string;
  navReports: string;
  navSettings: string;
  navReturnToAdmin: string;
  signOut: string;
  moreMenu: string;

  // Sales & POS
  sellTitle: string;
  fastPOS: string;
  catalogTab: string;
  cartTab: string;
  searchItemPlaceholder: string;
  scanBarcodePrompt: string;
  openPhoneScanner: string;
  phoneScannerDesc: string;
  quickManualSell: string;
  quickManualSellDesc: string;
  typeBarcodeOrName: string;
  quantity: string;
  unitPrice: string;
  inStock: string;
  outOfStock: string;
  lowStock: string;
  cart: string;
  emptyCart: string;
  itemsInCart: string;
  clearCart: string;
  subtotal: string;
  discount: string;
  tax: string;
  totalToPay: string;
  paymentMethod: string;
  payCash: string;
  payTelebirr: string;
  payCbeBirr: string;
  payCredit: string;
  amountReceived: string;
  changeDue: string;
  completeSaleBtn: string;
  quickSellAndDeductBtn: string;
  saleCompleted: string;
  printReceipt: string;
  newSale: string;
  selectCustomer: string;
  walkInCustomer: string;
  customerCreditBalance: string;
  exactAmount: string;
  viewCartAndCheckout: string;
  backToItems: string;
  addToCart: string;
  soldDeductedSuccess: string;

  // Scanner & Dual Modes
  scannerTitle: string;
  scannerModeSell: string;
  scannerModeStockIn: string;
  cameraActive: string;
  cameraPaused: string;
  startScanning: string;
  pauseCamera: string;
  toggleTorch: string;
  cameraInstructionSell: string;
  cameraInstructionStockIn: string;
  cameraError: string;
  cameraRetry: string;
  manualLookupTab: string;
  cameraScanTab: string;
  scannedItem: string;
  scanNext: string;
  unrecognizedBarcode: string;
  registerNewProduct: string;
  readyToScan: string;
  readyToScanDesc: string;
  quickRegisterProductTitle: string;
  quickRegisterProductDesc: string;
  initialStockLabel: string;
  quickSellNowBtn: string;
  quickStockInNowBtn: string;
  addToCartAndScanMore: string;
  stockRemaining: string;
  itemRegisteredAndStocked: string;
  quickCategoryGeneral: string;
  quickCategoryBooks: string;
  quickCategoryStationery: string;
  quickCategoryElectronics: string;
  quickCategoryGroceries: string;
  quickCategoryClothing: string;

  // Stock In Mode
  stockInTitle: string;
  stockInSubtitle: string;
  receivingList: string;
  emptyReceivingList: string;
  costPrice: string;
  quantityReceived: string;
  addToReceivingList: string;
  confirmStockInBtn: string;
  stockInSuccess: string;
  totalUnitsReceived: string;
  previousStock: string;
  newStock: string;
  receivingNotes: string;
  stockInItemAdded: string;

  // Inventory & Stock Management
  inventoryTitle: string;
  inventorySubtitle: string;
  totalStockValuation: string;
  lowStockItems: string;
  outOfStockItems: string;
  adjustStockBtn: string;
  transferStockBtn: string;
  adjustmentType: string;
  addQuantity: string;
  deductQuantity: string;
  setQuantity: string;
  mandatoryReason: string;
  reasonRestock: string;
  reasonDamaged: string;
  reasonCountCorrection: string;
  reasonCustomerReturn: string;
  reasonInternalUse: string;
  reasonOther: string;
  confirmAdjustmentBtn: string;
  stockMovementsTitle: string;
  movementType: string;
  delta: string;
  resultingBalance: string;

  // Products & Catalog
  productsTitle: string;
  productsSubtitle: string;
  addProductBtn: string;
  productName: string;
  sku: string;
  barcode: string;
  category: string;
  sellingPriceLabel: string;
  costPriceLabel: string;
  reorderLevel: string;
  unitOfMeasure: string;
  unitPcs: string;
  unitPkt: string;
  unitBox: string;
  unitCtn: string;
  unitKg: string;
  unitLiter: string;
  printLabels: string;
  archiveProduct: string;

  // Customers & Debt (ዱቤ)
  customersTitle: string;
  customersSubtitle: string;
  addNewCustomer: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  saveAndSelectCustomer: string;
  accountsWithCredit: string;
  totalOutstandingCredit: string;
  repayCreditBtn: string;
  salesCount: string;
  noCustomersFound: string;
  repaymentAmount: string;
  confirmRepayment: string;

  // Expenses
  expensesTitle: string;
  expensesSubtitle: string;
  addExpenseBtn: string;
  expenseAmount: string;
  expenseCategory: string;
  expenseDescription: string;
  totalExpensesToday: string;
  totalExpensesMonth: string;

  // Purchases & Suppliers
  purchasesTitle: string;
  purchasesSubtitle: string;
  newPurchaseOrder: string;
  supplierName: string;
  supplierPhone: string;
  supplierList: string;
  orderStatus: string;
  receiveOrderBtn: string;

  // Reports
  reportsTitle: string;
  reportsSubtitle: string;
  salesReport: string;
  profitLossReport: string;
  inventoryValuationReport: string;
  totalRevenue: string;
  grossProfit: string;
  netProfit: string;
  cogs: string;
  dateRangeToday: string;
  dateRangeWeek: string;
  dateRangeMonth: string;
  dateRangeAll: string;
  exportCsv: string;

  // Settings & Staff
  settingsTitle: string;
  shopDetails: string;
  taxRateLabel: string;
  currencyLabel: string;
  staffManagement: string;
  addStaffBtn: string;
  staffRole: string;
  roleOwner: string;
  roleManager: string;
  roleShopkeeper: string;
  posPinLabel: string;

  // Auth & Account
  signInTitle: string;
  signInSubtitle: string;
  emailLabel: string;
  passwordLabel: string;
  signInBtn: string;
  newToApp: string;
  registerShopLink: string;
  registerTitle: string;
  registerSubtitle: string;
  fullNameLabel: string;
  shopNameLabel: string;
  shopCodeLabel: string;
  registerBtn: string;
  alreadyHaveAccount: string;
  forgotPassword: string;
  resetPasswordTitle: string;
  resetPasswordBtn: string;

  // Phone Scanner Modal
  phoneScannerModalTitle: string;
  phoneScannerModalDesc: string;
  copyLink: string;
  linkCopied: string;
  openInNewTab: string;
  scanQrWithPhone: string;
  startSellingNow: string;
  startSellingDesc: string;
  openPOS: string;
  openScanner: string;
  phoneCameraScannerBtn: string;
  instantAccessNoLogin: string;
  scanQrInstantInstruction: string;

  // Expenses additional
  expenseRecordsCount: string;
  noExpensesFound: string;
  recordExpenseModalTitle: string;
  recordExpenseModalDesc: string;
  expenseDate: string;
  allCategories: string;

  // Purchases additional
  allOrders: string;
  ordered: string;
  partiallyReceived: string;
  fullyReceived: string;
  draft: string;
  poNumber: string;
  itemsCount: string;
  totalCost: string;
  noPurchasesFound: string;
  createPoBtn: string;
  suppliersDirectory: string;
  receiveGoodsGrn: string;
  verifyReceivedQuantities: string;
  orderedQty: string;
  receivedSoFar: string;
  receivingNow: string;
  completed: string;
  grnNotesPlaceholder: string;
  confirmReceiveStockBtn: string;

  // Reports additional
  reportsHubTitle: string;
  reportsHubSubtitle: string;
  salesReportDesc: string;
  inventoryReportDesc: string;
  profitLossReportDesc: string;
  openReport: string;
  openStatement: string;
  restrictedAccess: string;
  restrictedAccessDesc: string;
  returnToDashboard: string;
  backToReportsHub: string;
  grossRevenue: string;
  totalTaxCollected: string;
  totalDiscountsGiven: string;
  netMargin: string;
  costOfGoodsSold: string;
  transactionCount: string;
  salesMarginReport: string;

  // Settings additional
  tabGeneral: string;
  tabFinancial: string;
  tabReceipt: string;
  tabStaff: string;
  shopPhoneLabel: string;
  shopEmailLabel: string;
  shopAddressLabel: string;
  saveSettingsBtn: string;
  settingsSavedSuccess: string;
  negativeStockTitle: string;
  negativeStockDescription: string;
  receiptHeaderSubtitle: string;
  receiptFooterSubtitle: string;
  manageStaffPermissionsTitle: string;
  inviteStaffModalTitle: string;
  inviteStaffModalDesc: string;
  canViewReportsLabel: string;
  canApplyDiscountLabel: string;
  canAdjustStockLabel: string;
  savePermissionsBtn: string;
  sendInviteBtn: string;

  // Dashboard, Ledger & Misc
  activeCashierShift: string;
  welcomeTerminal: string;
  cashierSubtitle: string;
  startNewSalePOS: string;
  salesHistoryTitle: string;
  salesHistorySubtitle: string;
  backToPOS: string;
  allTransactions: string;
  stockLedgerTitle: string;
  stockLedgerSubtitle: string;
  backToInventory: string;
  allMovementTypes: string;
  registerBusinessHeading: string;
  registerBusinessSubheading: string;
  organizationDetailsSection: string;
  companyNameLabel: string;
  initialShopBranchSection: string;
  ownerCredentialsSection: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Brand & General
    appName: "EasyStock",
    tagline: "Simple Retail & Inventory Management",
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    search: "Search...",
    actions: "Actions",
    status: "Status",
    date: "Date",
    all: "All",
    success: "Success",
    error: "Error",
    back: "Back",
    close: "Close",
    yes: "Yes",
    no: "No",
    areYouSure: "Are you sure?",

    // Navigation
    navDashboard: "Dashboard",
    navSellItems: "Sell Items (Sales)",
    navPhoneScanner: "Phone Barcode Scanner",
    navStock: "Stock & Inventory",
    navStockHistory: "Stock Movements",
    navItems: "Items & Prices",
    navImportItems: "Import Excel / CSV",
    navReceiveGoods: "Receive Goods (Purchase)",
    navCustomers: "Customers & Credit (ዱቤ)",
    navExpenses: "Daily Expenses",
    navReports: "Reports & Profit",
    navSettings: "Shop Settings",
    navReturnToAdmin: "Platform Admin Console",
    signOut: "Sign Out",
    moreMenu: "More Menu",

    // Sales & POS
    sellTitle: "Sell Items",
    fastPOS: "Fast Cashier Register",
    catalogTab: "Catalog",
    cartTab: "Sale Cart",
    searchItemPlaceholder: "Search item name or scan barcode...",
    scanBarcodePrompt: "Scan Barcode with Camera",
    openPhoneScanner: "Open Phone Scanner",
    phoneScannerDesc: "Use your smartphone camera to scan items directly into your sale",
    quickManualSell: "Quick Manual Sell",
    quickManualSellDesc: "Enter item code or name, sell, and deduct stock instantly",
    typeBarcodeOrName: "Type Item Name or Barcode Number",
    quantity: "Quantity",
    unitPrice: "Price",
    inStock: "in stock",
    outOfStock: "Out of stock",
    lowStock: "Low Stock",
    cart: "Current Sale",
    emptyCart: "No items selected yet. Search or scan items to add.",
    itemsInCart: "items",
    clearCart: "Clear Sale",
    subtotal: "Subtotal",
    discount: "Discount",
    tax: "Tax",
    totalToPay: "Total to Pay",
    paymentMethod: "Payment Method",
    payCash: "Cash",
    payTelebirr: "Telebirr",
    payCbeBirr: "CBE Birr",
    payCredit: "Customer Credit (ዱቤ)",
    amountReceived: "Amount Received",
    changeDue: "Change Due",
    completeSaleBtn: "Complete Sale & Print Receipt",
    quickSellAndDeductBtn: "Sell & Deduct from Stock",
    saleCompleted: "Sale Completed Successfully!",
    printReceipt: "Print Receipt",
    newSale: "Start New Sale",
    selectCustomer: "Customer (Optional)",
    walkInCustomer: "Walk-in Customer",
    customerCreditBalance: "Outstanding Credit",
    exactAmount: "Exact Amount",
    viewCartAndCheckout: "View Cart & Checkout",
    backToItems: "Back to Catalog",
    addToCart: "Add to Cart",
    soldDeductedSuccess: "Item sold and deducted from inventory successfully!",

    // Scanner & Dual Modes
    scannerTitle: "Mobile Barcode Scanner",
    scannerModeSell: "Sell Items (Sales)",
    scannerModeStockIn: "Stock In (Receiving)",
    cameraActive: "Camera Scanner Active",
    cameraPaused: "Camera is Paused",
    startScanning: "Start Scanning",
    pauseCamera: "Pause Camera",
    toggleTorch: "Toggle Flashlight",
    cameraInstructionSell: "Align barcode to add item to your sale cart",
    cameraInstructionStockIn: "Align barcode to add item to receiving list",
    cameraError: "Camera access unavailable. Make sure permissions are granted or use manual lookup.",
    cameraRetry: "Retry Permission",
    manualLookupTab: "Manual Code / Name",
    cameraScanTab: "Camera Scanner",
    scannedItem: "Scanned Item",
    scanNext: "Scan Next Item",
    unrecognizedBarcode: "Unrecognized Barcode",
    registerNewProduct: "Register as New Product",
    readyToScan: "Ready to Scan",
    readyToScanDesc: "Point phone camera at any barcode, use a Bluetooth scanner, or type below.",
    quickRegisterProductTitle: "Add New Product to Inventory",
    quickRegisterProductDesc: "This barcode was not found. Enter product details to save and add it to your inventory.",
    initialStockLabel: "Quantity to Add to Inventory",
    quickSellNowBtn: "Sell Now & Deduct Stock",
    quickStockInNowBtn: "Add to Stock Now",
    addToCartAndScanMore: "Add to Cart & Scan More",
    stockRemaining: "Remaining stock",
    itemRegisteredAndStocked: "Product registered and added to inventory!",
    quickCategoryGeneral: "General",
    quickCategoryBooks: "Books",
    quickCategoryStationery: "Stationery",
    quickCategoryElectronics: "Electronics",
    quickCategoryGroceries: "Groceries",
    quickCategoryClothing: "Clothing",

    // Stock In Mode
    stockInTitle: "Stock In & Inventory Receiving",
    stockInSubtitle: "Scan received products to update stock balances and record purchase receipts",
    receivingList: "Receiving Staging List",
    emptyReceivingList: "No received items scanned yet. Scan barcodes to stage inventory.",
    costPrice: "Cost Price",
    quantityReceived: "Quantity Received",
    addToReceivingList: "Add to Receiving List",
    confirmStockInBtn: "Confirm Stock In",
    stockInSuccess: "Stock successfully received and added to inventory!",
    totalUnitsReceived: "Total Units Received",
    previousStock: "Previous Stock",
    newStock: "New Stock",
    receivingNotes: "Receiving Notes / Supplier Details",
    stockInItemAdded: "Added to receiving list",

    // Inventory & Stock Management
    inventoryTitle: "Inventory & Stock Levels",
    inventorySubtitle: "Monitor physical stock on hand, record adjustments, and track valuation",
    totalStockValuation: "Total Stock Valuation",
    lowStockItems: "Low Stock Items",
    outOfStockItems: "Out of Stock Items",
    adjustStockBtn: "Adjust Stock",
    transferStockBtn: "Transfer Stock",
    adjustmentType: "Adjustment Type",
    addQuantity: "Add Stock (+)",
    deductQuantity: "Deduct Stock (-)",
    setQuantity: "Set New Balance",
    mandatoryReason: "Mandatory Reason",
    reasonRestock: "Restock / New Shipment",
    reasonDamaged: "Damaged / Broken / Expired",
    reasonCountCorrection: "Inventory Count Correction",
    reasonCustomerReturn: "Customer Return",
    reasonInternalUse: "Internal Store Use",
    reasonOther: "Other",
    confirmAdjustmentBtn: "Confirm Adjustment",
    stockMovementsTitle: "Stock Movements Audit Ledger",
    movementType: "Movement Type",
    delta: "Quantity Delta",
    resultingBalance: "Resulting Balance",

    // Products & Catalog
    productsTitle: "Product Catalog & Pricing",
    productsSubtitle: "Manage shop products, pricing, barcodes, and inventory thresholds",
    addProductBtn: "Add New Product",
    productName: "Product Name",
    sku: "SKU",
    barcode: "Barcode",
    category: "Category",
    sellingPriceLabel: "Selling Price",
    costPriceLabel: "Purchase Cost",
    reorderLevel: "Reorder Alert Level",
    unitOfMeasure: "Unit of Measure",
    unitPcs: "Pieces (Pcs)",
    unitPkt: "Packet (Pkt)",
    unitBox: "Box",
    unitCtn: "Carton (Ctn)",
    unitKg: "Kilogram (Kg)",
    unitLiter: "Liter (L)",
    printLabels: "Print Barcode Labels",
    archiveProduct: "Archive Product",

    // Customers & Debt (ዱቤ)
    customersTitle: "Customer Accounts & Credit (ዱቤ)",
    customersSubtitle: "Track store credit, customer debt balances, and record repayments",
    addNewCustomer: "+ Add Customer",
    customerName: "Customer Full Name",
    customerPhone: "Phone Number",
    customerAddress: "Address / Kebele",
    saveAndSelectCustomer: "Save & Select Customer",
    accountsWithCredit: "Accounts with Credit Due",
    totalOutstandingCredit: "Total Outstanding Credit",
    repayCreditBtn: "Record Repayment",
    salesCount: "Orders",
    noCustomersFound: "No customers found",
    repaymentAmount: "Repayment Amount",
    confirmRepayment: "Confirm Repayment",

    // Expenses
    expensesTitle: "Daily Store Expenses",
    expensesSubtitle: "Track operational expenses, rent, utilities, and store costs",
    addExpenseBtn: "Record Expense",
    expenseAmount: "Expense Amount",
    expenseCategory: "Category",
    expenseDescription: "Description / Notes",
    totalExpensesToday: "Expenses Today",
    totalExpensesMonth: "Expenses This Month",

    // Purchases & Suppliers
    purchasesTitle: "Purchases & Supplier Orders",
    purchasesSubtitle: "Manage supplier purchase orders and stock arrivals",
    newPurchaseOrder: "New Purchase Order",
    supplierName: "Supplier Name",
    supplierPhone: "Supplier Phone",
    supplierList: "Suppliers Directory",
    orderStatus: "Order Status",
    receiveOrderBtn: "Receive Goods",

    // Reports
    reportsTitle: "Reports & Financial Analytics",
    reportsSubtitle: "View sales performance, margins, profitability, and stock valuation",
    salesReport: "Sales Summary",
    profitLossReport: "Profit & Loss",
    inventoryValuationReport: "Inventory Valuation",
    totalRevenue: "Gross Revenue",
    grossProfit: "Gross Profit",
    netProfit: "Net Profit",
    cogs: "Cost of Goods Sold (COGS)",
    dateRangeToday: "Today",
    dateRangeWeek: "This Week",
    dateRangeMonth: "This Month",
    dateRangeAll: "All Time",
    exportCsv: "Export CSV Report",

    // Settings & Staff
    settingsTitle: "Shop Settings & Team",
    shopDetails: "Store Profile",
    taxRateLabel: "Tax Rate (%)",
    currencyLabel: "Currency",
    staffManagement: "Staff Accounts & Permissions",
    addStaffBtn: "Add Team Member",
    staffRole: "Role",
    roleOwner: "Shop Owner",
    roleManager: "Shop Manager",
    roleShopkeeper: "Shopkeeper / Cashier",
    posPinLabel: "POS Security PIN (4 Digits)",

    // Auth & Account
    signInTitle: "Sign in to your account",
    signInSubtitle: "Access your multi-tenant shop management terminal",
    emailLabel: "Email Address",
    passwordLabel: "Password",
    signInBtn: "Sign In to Workspace",
    newToApp: "New to EasyStock?",
    registerShopLink: "Register your shop",
    registerTitle: "Register Your Shop",
    registerSubtitle: "Start managing your retail store with EasyStock",
    fullNameLabel: "Full Name",
    shopNameLabel: "Shop Name",
    shopCodeLabel: "Shop Code (e.g. ADDIS-1)",
    registerBtn: "Create Shop Account",
    alreadyHaveAccount: "Already registered?",
    forgotPassword: "Forgot password?",
    resetPasswordTitle: "Reset Password",
    resetPasswordBtn: "Update Password",

    // Phone Scanner Modal
    phoneScannerModalTitle: "Use Phone as Barcode Scanner",
    phoneScannerModalDesc: "Scan item barcodes with your smartphone camera to quickly sell and deduct inventory.",
    copyLink: "Copy Link",
    linkCopied: "Link Copied!",
    openInNewTab: "Open in New Tab",
    scanQrWithPhone: "Scan this QR code with your phone camera to open instantly",
    startSellingNow: "Start Selling Items",
    startSellingDesc: "Launch cash register or use your phone camera to scan barcodes and sell items instantly.",
    openPOS: "Open Cash Register (POS)",
    openScanner: "Open Phone Scanner",
    phoneCameraScannerBtn: "Phone Camera Scanner",
    instantAccessNoLogin: "Instant Access (No Login Required)",
    scanQrInstantInstruction: "Point your phone camera at this QR code to start scanning immediately without typing passwords.",

    // Expenses additional
    expenseRecordsCount: "Expense Records Count",
    noExpensesFound: "No expense records found",
    recordExpenseModalTitle: "Record Shop Expense",
    recordExpenseModalDesc: "Track operating overhead and utility costs",
    expenseDate: "Expense Date",
    allCategories: "All Categories",

    // Purchases additional
    allOrders: "All Orders",
    ordered: "Ordered",
    partiallyReceived: "Partially Received",
    fullyReceived: "Fully Received",
    draft: "Draft",
    poNumber: "PO Number",
    itemsCount: "Items Count",
    totalCost: "Total Cost",
    noPurchasesFound: "No purchase orders found",
    createPoBtn: "Create Purchase Order",
    suppliersDirectory: "Suppliers Directory",
    receiveGoodsGrn: "Receive Goods (GRN)",
    verifyReceivedQuantities: "Verify Received Quantities",
    orderedQty: "Ordered",
    receivedSoFar: "Received So Far",
    receivingNow: "Receiving Now",
    completed: "Completed",
    grnNotesPlaceholder: "Waybill / Delivery note / GRN reference notes...",
    confirmReceiveStockBtn: "Confirm & Receive Stock",

    // Reports additional
    reportsHubTitle: "Business Reports Hub",
    reportsHubSubtitle: "Exportable financial statements, sales metrics, and inventory valuation ledgers",
    salesReportDesc: "Detailed chronological ledger of sales transactions, taxes, discounts, and tender splits.",
    inventoryReportDesc: "Catalog asset valuation based on unit cost vs retail price, potential gross margins, and stock on hand.",
    profitLossReportDesc: "Operating statement reflecting net revenue, COGS, gross margins, operating expenses, and net profit.",
    openReport: "Open Report",
    openStatement: "Open Statement",
    restrictedAccess: "Restricted Access",
    restrictedAccessDesc: "You do not have administrative permission to view shop financial and profit reports.",
    returnToDashboard: "Return to Dashboard",
    backToReportsHub: "Back to Reports Hub",
    grossRevenue: "Gross Revenue",
    totalTaxCollected: "Total Tax Collected",
    totalDiscountsGiven: "Total Discounts Given",
    netMargin: "Net Margin",
    costOfGoodsSold: "Cost of Goods Sold (COGS)",
    transactionCount: "Transactions",
    salesMarginReport: "Sales & Margin Ledger",

    // Settings additional
    tabGeneral: "General Profile",
    tabFinancial: "Financial & Tax",
    tabReceipt: "Receipt Customization",
    tabStaff: "Team & Permissions",
    shopPhoneLabel: "Shop Phone",
    shopEmailLabel: "Shop Email",
    shopAddressLabel: "Store Location / Address",
    saveSettingsBtn: "Save Shop Settings",
    settingsSavedSuccess: "Settings saved successfully!",
    negativeStockTitle: "Allow Negative Stock (Sell without inventory)",
    negativeStockDescription: "Enables cashiers to sell items even if stock balance is zero.",
    receiptHeaderSubtitle: "Optional header line displayed at the top of printed receipts",
    receiptFooterSubtitle: "Optional footer note displayed at the bottom of printed receipts",
    manageStaffPermissionsTitle: "Manage Staff Permissions",
    inviteStaffModalTitle: "Add Team Member",
    inviteStaffModalDesc: "Assign shopkeeper or manager roles with POS access",
    canViewReportsLabel: "Can View Financial Reports",
    canApplyDiscountLabel: "Can Apply Custom Discounts at POS",
    canAdjustStockLabel: "Can Perform Stock Adjustments",
    savePermissionsBtn: "Save Permissions",
    sendInviteBtn: "Add Team Member",

    // Dashboard, Ledger & Misc
    activeCashierShift: "Active Cashier Shift",
    welcomeTerminal: "Welcome to",
    cashierSubtitle: "Process checkouts, scan customer items, and review stock in real time.",
    startNewSalePOS: "Start New Sale (POS)",
    salesHistoryTitle: "Sale History & Receipts",
    salesHistorySubtitle: "View completed transactions, reprint receipts, and process customer returns",
    backToPOS: "Back to POS Terminal",
    allTransactions: "All Transactions",
    stockLedgerTitle: "Stock Movement Ledger",
    stockLedgerSubtitle: "Immutable, traceable history of all inventory balance changes",
    backToInventory: "Back to Inventory",
    allMovementTypes: "All Movement Types",
    registerBusinessHeading: "Register your business",
    registerBusinessSubheading: "Setup your multi-tenant shop and owner administrative workspace",
    organizationDetailsSection: "Organization Details",
    companyNameLabel: "Business / Company Name",
    initialShopBranchSection: "Initial Shop / Branch",
    ownerCredentialsSection: "Owner Credentials",
  },

  am: {
    // Brand & General
    appName: "ኢዚስቶክ",
    tagline: "ቀላል የሱቅ እና የዕቃ ክምችት መቆጣጠሪያ",
    loading: "በመጫን ላይ...",
    save: "አስቀምጥ",
    cancel: "ሰርዝ",
    confirm: "አረጋግጥ",
    delete: "አጥፋ",
    edit: "አስተካክል",
    add: "አዲስ ጨምር",
    search: "ፈልግ...",
    actions: "ተግባራት",
    status: "ሁኔታ",
    date: "ቀን",
    all: "ሁሉም",
    success: "ተሳክቷል",
    error: "ስህተት",
    back: "ተመለስ",
    close: "ዝጋ",
    yes: "አዎ",
    no: "አይ",
    areYouSure: "እርግጠኛ ነዎት?",

    // Navigation
    navDashboard: "ዳሽቦርድ",
    navSellItems: "ዕቃ መሸጫ (ሽያጭ)",
    navPhoneScanner: "የስልክ ባርኮድ መቃኛ",
    navStock: "የዕቃ ክምችት (ስቶክ)",
    navStockHistory: "የዕቃዎች እንቅስቃሴ",
    navItems: "የዕቃዎች ዝርዝርና ዋጋ",
    navImportItems: "ዕቃዎችን ከኤክሴል ጫን",
    navReceiveGoods: "የዕቃ ግዢና ርክክብ",
    navCustomers: "ደንበኞችና ዱቤ",
    navExpenses: "ዕለታዊ ወጪዎች",
    navReports: "የሽያጭና የትርፍ ሪፖርት",
    navSettings: "የሱቅ ማስተካከያ",
    navReturnToAdmin: "የዋና አስተዳዳሪ ገጽ",
    signOut: "ውጣ (Sign Out)",
    moreMenu: "ተጨማሪ ዝርዝር",

    // Sales & POS
    sellTitle: "የዕቃ መሸጫ",
    fastPOS: "ፈጣን የገንዘብ መቀበያ (መሸጫ)",
    catalogTab: "ዕቃዎች ዝርዝር",
    cartTab: "የተመረጡ ዕቃዎች",
    searchItemPlaceholder: "የዕቃ ስም ወይም ባርኮድ ይፈልጉ...",
    scanBarcodePrompt: "በካሜራ ባርኮድ ይቃኙ",
    openPhoneScanner: "በስልክዎ ባርኮድ ይቃኙ",
    phoneScannerDesc: "በስማርት ስልክዎ ካሜራ የዕቃውን ባርኮድ በቀጥታ ይቃኙ",
    quickManualSell: "ፈጣን መሸጫ በኮድ ወይም በስም",
    quickManualSellDesc: "የዕቃውን ኮድ ወይም ስም ጽፈው በቀጥታ ይሽጡ፤ ወዲያውኑ ከክምችት ይቀነሳል",
    typeBarcodeOrName: "የዕቃውን ስም ወይም ባርኮድ ቁጥር ይጻፉ",
    quantity: "ብዛት",
    unitPrice: "ዋጋ",
    inStock: "ክምችት አለ",
    outOfStock: "አልቋል",
    lowStock: "ሊያልቅ የቀረበ",
    cart: "የተመረጡ ዕቃዎች",
    emptyCart: "እስካሁን የተመረጠ ዕቃ የለም። ለመሸጥ ዕቃ ይፈልጉ ወይም ባርኮድ ይቃኙ።",
    itemsInCart: "ዕቃዎች",
    clearCart: "ሁሉንም አጽዳ",
    subtotal: "የዕቃዎች ድምር",
    discount: "ቅናሽ",
    tax: "ግብር (ታክስ)",
    totalToPay: "ጠቅላላ የሚከፈል ድምር",
    paymentMethod: "የመክፈያ ዘዴ",
    payCash: "በጥሬ ገንዘብ (Cash)",
    payTelebirr: "በቴሌብር (Telebirr)",
    payCbeBirr: "በሲቢኢ ብር (CBE Birr)",
    payCredit: "በዱቤ (Customer Credit)",
    amountReceived: "የተቀበሉት ገንዘብ",
    changeDue: "መልስ",
    completeSaleBtn: "ሽያጩን ጨርስና ደረሰኝ አትም",
    quickSellAndDeductBtn: "ሽጥና ከክምችት ቀንስ",
    saleCompleted: "ሽያጩ በተሳካ ሁኔታ ተጠናቋል!",
    printReceipt: "ደረሰኝ አትም",
    newSale: "አዲስ ሽያጭ ጀምር",
    selectCustomer: "ደንበኛ ምረጥ (አስገዳጅ አይደለም)",
    walkInCustomer: "ተራ ደንበኛ",
    customerCreditBalance: "ያለበት የዱቤ ዕዳ",
    exactAmount: "ትክክለኛውን ሂሳብ",
    viewCartAndCheckout: "ወደ ሂሳብና ቅርጫት ሂድ",
    backToItems: "ወደ ዕቃዎች ዝርዝር ተመለስ",
    addToCart: "ወደ ቅርጫት ጨምር",
    soldDeductedSuccess: "ዕቃው ተሽጦ ወዲያውኑ ከክምችት ተቀንሷል!",

    // Scanner & Dual Modes
    scannerTitle: "የስልክ ባርኮድ መቃኛ",
    scannerModeSell: "ዕቃ መሸጫ (Sales)",
    scannerModeStockIn: "ዕቃ መረከቢያ (Stock In)",
    cameraActive: "የስልክ ካሜራ ክፍት ነው",
    cameraPaused: "ካሜራው ቆሟል",
    startScanning: "መቃኘት ጀምር",
    pauseCamera: "ካሜራ አቁም",
    toggleTorch: "ፍላሽ አብራ/አጥፋ",
    cameraInstructionSell: "ዕቃውን ወደ ቅርጫት ለመጨመር ባርኮዱን ያነጣጥሩ",
    cameraInstructionStockIn: "ዕቃውን ወደ መረከቢያ ዝርዝር ለመጨመር ባርኮዱን ያነጣጥሩ",
    cameraError: "ካሜራውን መክፈት አልተቻለም። የካሜራ ፈቃድ መከፈቱን ያረጋግጡ ወይም በስም ይፈልጉ።",
    cameraRetry: "ካሜራውን እንደገና ሞክር",
    manualLookupTab: "በስም ወይም በኮድ",
    cameraScanTab: "በካሜራ መቃኛ",
    scannedItem: "የተቃኘው ዕቃ",
    scanNext: "ቀጣይ ዕቃ ቃኝ",
    unrecognizedBarcode: "ያልተመዘገበ ባርኮድ",
    registerNewProduct: "እንደ አዲስ ዕቃ መዝግብ",
    readyToScan: "ዕቃ ለመቃኘት ተዘጋጅቷል",
    readyToScanDesc: "የስልክዎን ካሜራ በዕቃው ባርኮድ ላይ ያሳዩ፣ ወይም በብሉቱዝ መቃኛ ይጠቀሙ።",
    quickRegisterProductTitle: "አዲስ ዕቃ ወደ ክምችት ጨምር",
    quickRegisterProductDesc: "ይህ ባርኮድ በክምችት ውስጥ አልተገኘም። መረጃውን ሞልተው ወዲያውኑ ወደ ክምችት ያስገቡት።",
    initialStockLabel: "ወደ ክምችት የሚገባ የመጀመሪያ ብዛት",
    quickSellNowBtn: "ሽጥና ከክምችት ቀንስ",
    quickStockInNowBtn: "ወዲያውኑ ክምችት ላይ ጨምር",
    addToCartAndScanMore: "ወደ ቅርጫት ጨምር",
    stockRemaining: "ቀሪ ክምችት",
    itemRegisteredAndStocked: "ዕቃው ተመዝግቦ ወደ ክምችት ገብቷል!",
    quickCategoryGeneral: "አጠቃላይ",
    quickCategoryBooks: "መጽሐፍት",
    quickCategoryStationery: "ደብተርና እስክሪብቶ",
    quickCategoryElectronics: "ኤሌክትሮኒክስ",
    quickCategoryGroceries: "ምግብና ሸቀጣ ሸቀጥ",
    quickCategoryClothing: "ልብስ",

    // Stock In Mode
    stockInTitle: "የዕቃ ግዢና ክምችት መረከቢያ",
    stockInSubtitle: "የተቀበሉትን ዕቃዎች ባርኮድ በመቃኘት ክምችት ይጨምሩ እና የግዢ እንቅስቃሴ ይመዝግቡ",
    receivingList: "የሚረከቧቸው ዕቃዎች ዝርዝር",
    emptyReceivingList: "እስካሁን የተቃኘ ዕቃ የለም። የተቀበሉትን ዕቃዎች ባርኮድ ይቃኙ።",
    costPrice: "የግዢ ዋጋ (Cost Price)",
    quantityReceived: "የተረከቡት ብዛት",
    addToReceivingList: "ወደ መረከቢያ ዝርዝር ጨምር",
    confirmStockInBtn: "ዕቃ ርክክቡን አረጋግጥ",
    stockInSuccess: "ዕቃዎቹ በተሳካ ሁኔታ ተረክበዋል፤ ክምችት ላይ ተጨምረዋል!",
    totalUnitsReceived: "ጠቅላላ የተረከቡት ፍሬ",
    previousStock: "የነበረው ክምችት",
    newStock: "አዲሱ ክምችት",
    receivingNotes: "የአቅራቢው ስም ወይም ማስታወሻ",
    stockInItemAdded: "ወደ መረከቢያ ዝርዝር ተጨምሯል",

    // Inventory & Stock Management
    inventoryTitle: "የዕቃ ክምችትና ቁጥጥር",
    inventorySubtitle: "ያሉ ዕቃዎችን ክምችት ይቆጣጠሩ፣ ያስተካክሉ እና ጠቅላላ ዋጋቸውን ይመልከቱ",
    totalStockValuation: "ጠቅላላ የክምችት ዋጋ",
    lowStockItems: "ሊያልቁ የቀረቡ ዕቃዎች",
    outOfStockItems: "ያለቁ ዕቃዎች",
    adjustStockBtn: "ክምችት አስተካክል",
    transferStockBtn: "ዕቃ ወደ ሌላ ሱቅ አስተላልፍ",
    adjustmentType: "የማስተካከያ አይነት",
    addQuantity: "ክምችት ጨምር (+)",
    deductQuantity: "ክምችት ቀንስ (-)",
    setQuantity: "አዲስ ትክክለኛ ቁጥር አስቀምጥ",
    mandatoryReason: "የማስተካከያ ምክንያት (ግዴታ)",
    reasonRestock: "አዲስ ጭነት ተቀበልኩ (Restock)",
    reasonDamaged: "የተበላሸ / የተሰበረ ዕቃ (Damaged)",
    reasonCountCorrection: "የቁጥር ማስተካከያ (Count Correction)",
    reasonCustomerReturn: "ከደንበኛ የተመለሰ ዕቃ (Return)",
    reasonInternalUse: "ለሱቅ አገልግሎት የዋለ (Internal Use)",
    reasonOther: "ሌላ ምክንያት",
    confirmAdjustmentBtn: "ማስተካከያውን አረጋግጥ",
    stockMovementsTitle: "የዕቃዎች እንቅስቃሴ መዝገብ",
    movementType: "የእንቅስቃሴ አይነት",
    delta: "የተለወጠው ብዛት",
    resultingBalance: "ቀሪ ክምችት",

    // Products & Catalog
    productsTitle: "የዕቃዎች ዝርዝርና የመሸጫ ዋጋ",
    productsSubtitle: "የሱቁን ዕቃዎች፣ ዋጋ፣ ባርኮድ እና ዝቅተኛ ክምችት ያስተዳድሩ",
    addProductBtn: "አዲስ ዕቃ መዝግብ",
    productName: "የዕቃው ስም",
    sku: "ኮድ (SKU)",
    barcode: "ባርኮድ ቁጥር",
    category: "ምድብ (Category)",
    sellingPriceLabel: "የመሸጫ ዋጋ",
    costPriceLabel: "የግዢ ዋጋ",
    reorderLevel: "ማስጠንቀቂያ የሚያሳይበት ቁጥር",
    unitOfMeasure: "የመለኪያ አሃድ",
    unitPcs: "ፍሬ (Pcs)",
    unitPkt: "ፓኬት (Pkt)",
    unitBox: "ካርቶን / ሳጥን",
    unitCtn: "ካርቶን (Ctn)",
    unitKg: "ኪሎግራም (Kg)",
    unitLiter: "ሊትር (L)",
    printLabels: "የባርኮድ ሌብል አትም",
    archiveProduct: "ዕቃውን ከአገልግሎት አስወግድ",

    // Customers & Debt (ዱቤ)
    customersTitle: "የደንበኞች አካውንትና ዱቤ",
    customersSubtitle: "የደንበኞችን የዱቤ ሂሳብ ይቆጣጠሩ፣ የሽያጭ ታሪክ ይመልከቱ እና ክፍያ ይቀበሉ",
    addNewCustomer: "+ አዲስ ደንበኛ",
    customerName: "የደንበኛው ሙሉ ስም",
    customerPhone: "ስልክ ቁጥር",
    customerAddress: "አድራሻ / ሰፈር",
    saveAndSelectCustomer: "መዝግብና ለዚህ ሽያጭ ምረጥ",
    accountsWithCredit: "የዱቤ ዕዳ ያለባቸው ደንበኞች",
    totalOutstandingCredit: "ጠቅላላ መሰብሰብ ያለበት የዱቤ ሂሳብ",
    repayCreditBtn: "ክፍያ ተቀበል",
    salesCount: "የተገዙ ትዕዛዞች",
    noCustomersFound: "ምንም የተገኘ ደንበኛ የለም",
    repaymentAmount: "የተከፈለው ገንዘብ",
    confirmRepayment: "ክፍያውን መዝግብ",

    // Expenses
    expensesTitle: "ዕለታዊ የሱቅ ወጪዎች",
    expensesSubtitle: "የኪራይ፣ የመብራት፣ የትራንስፖርት እና ሌሎች የሱቅ ወጪዎችን ይቆጣጠሩ",
    addExpenseBtn: "ወጪ መዝግብ",
    expenseAmount: "የወጪው መጠን (ብር)",
    expenseCategory: "የወጪው ምድብ",
    expenseDescription: "የወጪው ዝርዝር ማብራሪያ",
    totalExpensesToday: "የዛሬ ወጪዎች",
    totalExpensesMonth: "የዚህ ወር ጠቅላላ ወጪ",

    // Purchases & Suppliers
    purchasesTitle: "የዕቃ ግዢና የአቅራቢዎች ትዕዛዝ",
    purchasesSubtitle: "ከጅምላ አከፋፋዮችና አቅራቢዎች ጋር የተደረጉ ግዢዎችን ያስተዳድሩ",
    newPurchaseOrder: "አዲስ የግዢ ትዕዛዝ",
    supplierName: "የአቅራቢው ስም",
    supplierPhone: "የአቅራቢው ስልክ",
    supplierList: "የአቅራቢዎች ዝርዝር",
    orderStatus: "የትዕዛዙ ሁኔታ",
    receiveOrderBtn: "ዕቃዎችን ተረከብ",

    // Reports
    reportsTitle: "የሽያጭና የትርፍ ሪፖርቶች",
    reportsSubtitle: "የሽያጭ አፈጻጸም፣ የተጣራ ትርፍ እና አጠቃላይ የሱቁን የፋይናንስ እንቅስቃሴ ይመልከቱ",
    salesReport: "የሽያጭ ሪፖርት",
    profitLossReport: "የትርፍና ኪሳራ ሪፖርት",
    inventoryValuationReport: "የክምችት ዋጋ ሪፖርት",
    totalRevenue: "ጠቅላላ የተሸጠው (ገቢ)",
    grossProfit: "የተገኘ አጠቃላይ ትርፍ",
    netProfit: "የተጣራ ትርፍ (ከወጪ በኋላ)",
    cogs: "የተሸጡት ዕቃዎች የግዢ ዋጋ (COGS)",
    dateRangeToday: "የዛሬ",
    dateRangeWeek: "የዚህ ሳምንት",
    dateRangeMonth: "የዚህ ወር",
    dateRangeAll: "የሁልጊዜ",
    exportCsv: "ሪፖርቱን በኤክሴል (CSV) አውርድ",

    // Settings & Staff
    settingsTitle: "የሱቅ ማስተካከያና ሰራተኞች",
    shopDetails: "የሱቁ መረጃ",
    taxRateLabel: "የግብር (ታክስ) መጠን (%)",
    currencyLabel: "መገበያያ ገንዘብ",
    staffManagement: "የሰራተኞች አካውንትና ፈቃድ",
    addStaffBtn: "አዲስ ሰራተኛ ጨምር",
    staffRole: "የስራ ሃላፊነት",
    roleOwner: "የሱቁ ባለቤት (Owner)",
    roleManager: "ስራ አስኪያጅ (Manager)",
    roleShopkeeper: "የሽያጭ ሰራተኛ (Cashier)",
    posPinLabel: "የገንዘብ መቀበያ ሚስጥር ቁጥር (4 አሃዝ ፒን)",

    // Auth & Account
    signInTitle: "ወደ አካውንትዎ ይግቡ",
    signInSubtitle: "የሱቅዎን መቆጣጠሪያ ተርሚናል ለመጠቀም ይግቡ",
    emailLabel: "ኢሜይል አድራሻ",
    passwordLabel: "የይለፍ ቃል (ፓስዎርድ)",
    signInBtn: "ይግቡ (Sign In)",
    newToApp: "አዲስ ተጠቃሚ ነዎት?",
    registerShopLink: "ሱቅዎን ይመዝግቡ",
    registerTitle: "አዲስ ሱቅ ይመዝግቡ",
    registerSubtitle: "በኢዚስቶክ የሱቅዎን ሽያጭና ክምችት በዘመናዊ መንገድ ይቆጣጠሩ",
    fullNameLabel: "ሙሉ ስም",
    shopNameLabel: "የሱቁ ስም",
    shopCodeLabel: "የሱቁ መለያ ኮድ (ምሳሌ: ADDIS-1)",
    registerBtn: "የሱቅ አካውንት ክፈት",
    alreadyHaveAccount: "ቀድመው ተመዝግበዋል?",
    forgotPassword: "ፓስዎርድ ረሱ?",
    resetPasswordTitle: "ፓስዎርድ መቀየሪያ",
    resetPasswordBtn: "አዲስ ፓስዎርድ አስቀምጥ",

    // Phone Scanner Modal
    phoneScannerModalTitle: "ስልክዎን እንደ ባርኮድ መቃኛ ይጠቀሙ",
    phoneScannerModalDesc: "በስማርት ስልክዎ ካሜራ የዕቃውን ባርኮድ በመቃኘት በፍጥነት ይሽጡ እና ከክምችት ይቀንሱ።",
    copyLink: "ሊንኩን ቅዳ",
    linkCopied: "ሊንኩ ተቀድቷል!",
    openInNewTab: "በአዲስ ገጽ ክፈት",
    scanQrWithPhone: "በስልክዎ ካሜራ ይህንን ኪውአር (QR) ኮድ በመቃኘት በቀጥታ ይክፈቱ",
    startSellingNow: "ዕቃዎችን መሸጥ ጀምር",
    startSellingDesc: "የገንዘብ መቀበያውን ይክፈቱ ወይም ስልክዎን እንደ ባርኮድ መቃኛ በመጠቀም ዕቃዎችን ይሽጡና ከክምችት ይቀንሱ።",
    openPOS: "የገንዘብ መቀበያ (መሸጫ)",
    openScanner: "የስልክ ባርኮድ መቃኛ",
    phoneCameraScannerBtn: "የስልክ ካሜራ ባርኮድ መቃኛ",
    instantAccessNoLogin: "ቀጥታ መክፈቻ (ፓስዎርድ አይጠይቅም)",
    scanQrInstantInstruction: "ይህንን ኪውአር (QR) ኮድ በስልክዎ ካሜራ ሲያነጣጥሩ ያለ ምንም ፓስዎርድ የስልኩ ባርኮድ መቃኛ ወዲያው ይከፈታል።",

    // Expenses additional
    expenseRecordsCount: "የተመዘገቡ ወጪዎች ብዛት",
    noExpensesFound: "ምንም የወጪ መዝገብ አልተገኘም",
    recordExpenseModalTitle: "የሱቅ ወጪ መዝግብ",
    recordExpenseModalDesc: "የኪራይ፣ የሰራተኛ፣ የመብራትና የዕለት ተዕለት ወጪዎችን ይመዝግቡ",
    expenseDate: "የወጣበት ቀን",
    allCategories: "ሁሉም ምድቦች",

    // Purchases additional
    allOrders: "ሁሉም ትዕዛዞች",
    ordered: "የታዘዘ (Ordered)",
    partiallyReceived: "በከፊል የተረከበ (Partially Received)",
    fullyReceived: "ሙሉ በሙሉ የተረከበ (Received)",
    draft: "ረቂቅ (Draft)",
    poNumber: "የትዕዛዝ ቁጥር (PO#)",
    itemsCount: "የዕቃዎች ብዛት",
    totalCost: "ጠቅላላ ወጪ",
    noPurchasesFound: "ምንም የግዢ ትዕዛዝ አልተገኘም",
    createPoBtn: "አዲስ የግዢ ትዕዛዝ ፍጠር",
    suppliersDirectory: "የአቅራቢዎች ማውጫ",
    receiveGoodsGrn: "ዕቃዎችን ተረከብ (GRN)",
    verifyReceivedQuantities: "የተረከቧቸውን ዕቃዎች ብዛት ያረጋግጡ",
    orderedQty: "የታዘዘው",
    receivedSoFar: "እስካሁን የተረከቡት",
    receivingNow: "አሁን የሚረከቡት",
    completed: "ተጠናቋል",
    grnNotesPlaceholder: "የማጓጓዣ ማስታወሻ ወይም ደረሰኝ ቁጥር...",
    confirmReceiveStockBtn: "ርክክቡን አረጋግጥና ክምችት ላይ ጨምር",

    // Reports additional
    reportsHubTitle: "የንግድ ሪፖርቶች ማዕከል",
    reportsHubSubtitle: "የሽያጭ፣ የትርፍና ኪሳራ እና የዕቃ ክምችት የፋይናንስ ሪፖርቶች",
    salesReportDesc: "ዝርዝር የሽያጭ፣ የታክስ፣ የቅናሽና የመክፈያ ዘዴዎች መዝገብ",
    inventoryReportDesc: "በግዢና መሸጫ ዋጋ የተሰላ ጠቅላላ የሱቁ የዕቃ ክምችት ሀብት",
    profitLossReportDesc: "ጠቅላላ ሽያጭ፣ የዕቃ ወጪ፣ ሌሎች ወጪዎችና የተጣራ ትርፍ",
    openReport: "ሪፖርቱን ክፈት",
    openStatement: "መግለጫውን ክፈት",
    restrictedAccess: "የተገደበ ገጽ",
    restrictedAccessDesc: "ይህንን የፋይናንስና የትርፍ ሪፖርት ለማየት የአስተዳዳሪ ፈቃድ ያስፈልጋል።",
    returnToDashboard: "ወደ ዳሽቦርድ ተመለስ",
    backToReportsHub: "ወደ ሪፖርቶች ማዕከል ተመለስ",
    grossRevenue: "ጠቅላላ ገቢ",
    totalTaxCollected: "የተሰበሰበ ታክስ",
    totalDiscountsGiven: "የተሰጠ ቅናሽ",
    netMargin: "የተጣራ ትርፍ",
    costOfGoodsSold: "የተሸጡ ዕቃዎች የግዢ ዋጋ (COGS)",
    transactionCount: "የሽያጭ ብዛት",
    salesMarginReport: "የሽያጭና የትርፍ መግለጫ",

    // Settings additional
    tabGeneral: "አጠቃላይ",
    tabFinancial: "ፋይናንስና ታክስ",
    tabReceipt: "የደረሰኝ ማስተካከያ",
    tabStaff: "ሰራተኞችና ፈቃዶች",
    shopPhoneLabel: "የሱቁ ስልክ ቁጥር",
    shopEmailLabel: "የሱቁ ኢሜይል",
    shopAddressLabel: "የሱቁ አድራሻ / ሰፈር",
    saveSettingsBtn: "ማስተካከያዎችን አስቀምጥ",
    settingsSavedSuccess: "ማስተካከያዎቹ በተሳካ ሁኔታ ተቀምጠዋል!",
    negativeStockTitle: "ያለ ክምችት መሸጥ ይፈቀድ (Negative Stock)",
    negativeStockDescription: "ክምችት ዜሮ ቢሆንም እንኳን የሽያጭ ሰራተኞች ዕቃ መሸጥ እንዲችሉ ይፈቅዳል",
    receiptHeaderSubtitle: "በደረሰኝ አናት ላይ የሚታተም ማስታወሻ",
    receiptFooterSubtitle: "በደረሰኝ ግርጌ ላይ የሚታተም መልዕክት",
    manageStaffPermissionsTitle: "የሰራተኛ ፈቃድ ማስተካከያ",
    inviteStaffModalTitle: "አዲስ ሰራተኛ ጨምር",
    inviteStaffModalDesc: "ለሱቁ አዲስ የሽያጭ ሰራተኛ ወይም ስራ አስኪያጅ ይመዝግቡ",
    canViewReportsLabel: "ሪፖርቶችን የማየት ፈቃድ",
    canApplyDiscountLabel: "በሽያጭ ወቅት ቅናሽ የመስጠት ፈቃድ",
    canAdjustStockLabel: "ክምችት የማስተካከል ፈቃድ",
    savePermissionsBtn: "ፈቃዶችን አስቀምጥ",
    sendInviteBtn: "ሰራተኛውን መዝግብ",

    // Dashboard, Ledger & Misc
    activeCashierShift: "የሽያጭ ሰራተኛ ፈረቃ",
    welcomeTerminal: "እንኳን ደህና መጡ ወደ",
    cashierSubtitle: "ዕቃዎችን ይሽጡ፣ ባርኮድ ይቃኙ እና የክምችት ሁኔታን ይመልከቱ",
    startNewSalePOS: "አዲስ ሽያጭ ጀምር (POS)",
    salesHistoryTitle: "የሽያጭ ታሪክና ደረሰኞች",
    salesHistorySubtitle: "የተጠናቀቁ ሽያጮችን ይመልከቱ፣ ደረሰኝ እንደገና ያትሙ ወይም ዕቃ ይመልሱ",
    backToPOS: "ወደ መሸጫ ተመለስ",
    allTransactions: "ሁሉም ሽያጮች",
    stockLedgerTitle: "የዕቃዎች እንቅስቃሴ መዝገብ",
    stockLedgerSubtitle: "በክምችት ላይ የተደረጉ ለውጦች በሙሉ ትክክለኛ መዝገብ",
    backToInventory: "ወደ ዕቃ ክምችት ተመለስ",
    allMovementTypes: "ሁሉም የእንቅስቃሴ አይነቶች",
    registerBusinessHeading: "የንግድ ድርጅትዎን ይመዝግቡ",
    registerBusinessSubheading: "የሱቅዎን እና የአስተዳዳሪ አካውንትዎን በኢዚስቶክ ይክፈቱ",
    organizationDetailsSection: "የድርጅቱ መረጃ",
    companyNameLabel: "የንግድ ድርጅቱ ስም",
    initialShopBranchSection: "የመጀመሪያው ሱቅ / ቅርንጫፍ",
    ownerCredentialsSection: "የባለቤቱ መለያና ፓስዎርድ",
  },
};
