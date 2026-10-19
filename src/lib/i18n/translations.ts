export type Language = "en" | "am";

export interface Translations {
  // Brand & General
  appName: string;
  tagline: string;
  loading: string;
  save: string;
  cancel: string;
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

  // Sales & POS
  sellTitle: string;
  fastPOS: string;
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

  // Phone Scanner
  phoneScannerTitle: string;
  phoneScannerInstruction: string;
  cameraActive: string;
  cameraError: string;
  cameraRetry: string;
  scannedItem: string;
  quickSell1: string;
  addToCart: string;
  scanNext: string;
  manualLookupTab: string;
  cameraScanTab: string;
  soldDeductedSuccess: string;

  // Units
  unitPcs: string;
  unitPkt: string;
  unitBox: string;
  unitCtn: string;
  unitKg: string;
  unitLiter: string;

  // Phone Scanner Modal & Selling Shortcuts
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

  // Quick Customer Creation
  addNewCustomer: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  saveAndSelectCustomer: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Brand & General
    appName: "EasyStock",
    tagline: "Simple Retail & Inventory Management",
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
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

    // Sales & POS
    sellTitle: "Sell Items",
    fastPOS: "Fast Cashier Register",
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

    // Phone Scanner
    phoneScannerTitle: "Mobile Barcode Scanner",
    phoneScannerInstruction: "Point your phone camera at any item barcode",
    cameraActive: "Camera Scanner Active",
    cameraError: "Camera access unavailable. Make sure permissions are enabled or use manual lookup.",
    cameraRetry: "Retry Camera",
    scannedItem: "Scanned Item",
    quickSell1: "Quick Sell 1 (Cash)",
    addToCart: "Add to Current Sale",
    scanNext: "Scan Next Item",
    manualLookupTab: "Manual Code / Name",
    cameraScanTab: "Camera Scanner",
    soldDeductedSuccess: "Item sold! Stock deducted from inventory.",

    // Units
    unitPcs: "Pieces (Pcs)",
    unitPkt: "Packet (Pkt)",
    unitBox: "Box",
    unitCtn: "Carton",
    unitKg: "Kilogram (Kg)",
    unitLiter: "Liter (L)",

    // Phone Scanner Modal & Selling Shortcuts
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

    // Quick Customer Creation
    addNewCustomer: "+ Add Customer",
    customerName: "Customer Full Name",
    customerPhone: "Phone Number (Optional)",
    customerAddress: "Address / Kebele (Optional)",
    saveAndSelectCustomer: "Save & Select for Sale",
  },

  am: {
    // Brand & General
    appName: "ኢዚስቶክ",
    tagline: "ቀላል የሱቅ እና የዕቃ ክምችት መቆጣጠሪያ",
    loading: "በመጫን ላይ...",
    save: "አስቀምጥ",
    cancel: "ሰርዝ",
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

    // Sales & POS
    sellTitle: "የዕቃ መሸጫ",
    fastPOS: "ፈጣን የገንዘብ መቀበያ (መሸጫ)",
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

    // Phone Scanner
    phoneScannerTitle: "የስልክ ባርኮድ መቃኛ",
    phoneScannerInstruction: "የስልክዎን ካሜራ ወደ ዕቃው ባርኮድ ያነጣጥሩ",
    cameraActive: "የስልክ ካሜራ ክፍት ነው",
    cameraError: "ካሜራውን መክፈት አልተቻለም። የካሜራ ፈቃድ መከፈቱን ያረጋግጡ ወይም በስም ይፈልጉ።",
    cameraRetry: "ካሜራውን እንደገና ሞክር",
    scannedItem: "የተቃኘው ዕቃ",
    quickSell1: "በቀጥታ 1 ሽጥ (በጥሬ ገንዘብ)",
    addToCart: "ወደ መሸጫ ጨምር",
    scanNext: "ቀጣይ ዕቃ ቃኝ",
    manualLookupTab: "በስም ወይም በኮድ",
    cameraScanTab: "በካሜራ መቃኛ",
    soldDeductedSuccess: "ዕቃው ተሽጧል! ከክምችቱ ላይ ወዲያውኑ ተቀንሷል።",

    // Units
    unitPcs: "ፍሬ (Pcs)",
    unitPkt: "ፓኬት (Pkt)",
    unitBox: "ካርቶን / ሳጥን",
    unitCtn: "ካርቶን (Ctn)",
    unitKg: "ኪሎግራም (Kg)",
    unitLiter: "ሊትር (L)",

    // Phone Scanner Modal & Selling Shortcuts
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

    // Quick Customer Creation
    addNewCustomer: "+ አዲስ ደንበኛ",
    customerName: "የደንበኛው ሙሉ ስም",
    customerPhone: "ስልክ ቁጥር (አስገዳጅ አይደለም)",
    customerAddress: "አድራሻ / ሰፈር (አስገዳጅ አይደለም)",
    saveAndSelectCustomer: "መዝግብና ለዚህ ሽያጭ ምረጥ",
  },
};
