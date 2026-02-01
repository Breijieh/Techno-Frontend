import type {
  StoreItemCategory,
  StoreItem,
  ProjectStore,
  ItemPO,
  StoreItemBalance,
  ReceivingTransaction,
  IssuingTransaction,
  TransferTransaction,
  Supplier,
} from '@/types';

export const mockItemCategories: StoreItemCategory[] = [
  { categoryCode: 1, categoryName: 'مواد حديد' },
  { categoryCode: 2, categoryName: 'مواد بناء' },
  { categoryCode: 3, categoryName: 'مواد كهربائية' },
  { categoryCode: 4, categoryName: 'مواد سباكة' },
  { categoryCode: 5, categoryName: 'عدد وأدوات' },
  { categoryCode: 6, categoryName: 'مواد الدهان' },
  { categoryCode: 7, categoryName: 'مواد العزل' },
];

export const mockStoreItems: StoreItem[] = [
  // Steel Materials
  { itemCode: 101, itemName: 'حديد تسليح 12 ملم', itemCategoryCode: 1, totalItemQuantity: 5000 },
  { itemCode: 102, itemName: 'حديد تسليح 16 ملم', itemCategoryCode: 1, totalItemQuantity: 3500 },
  { itemCode: 103, itemName: 'حديد تسليح 20 ملم', itemCategoryCode: 1, totalItemQuantity: 2800 },
  { itemCode: 104, itemName: 'شبك حديد', itemCategoryCode: 1, totalItemQuantity: 450 },

  // Construction Materials
  { itemCode: 201, itemName: 'أسمنت (كيس)', itemCategoryCode: 2, totalItemQuantity: 12000 },
  { itemCode: 202, itemName: 'رمل (متر مكعب)', itemCategoryCode: 2, totalItemQuantity: 850 },
  { itemCode: 203, itemName: 'حصى (متر مكعب)', itemCategoryCode: 2, totalItemQuantity: 620 },
  { itemCode: 204, itemName: 'بلوك', itemCategoryCode: 2, totalItemQuantity: 8500 },
  { itemCode: 205, itemName: 'جبس', itemCategoryCode: 2, totalItemQuantity: 1200 },

  // Electrical Materials
  { itemCode: 301, itemName: 'كابل كهربائي 2.5 ملم', itemCategoryCode: 3, totalItemQuantity: 15000 },
  { itemCode: 302, itemName: 'كابل كهربائي 4 ملم', itemCategoryCode: 3, totalItemQuantity: 8500 },
  { itemCode: 303, itemName: 'مفاتيح كهرباء', itemCategoryCode: 3, totalItemQuantity: 950 },
  { itemCode: 304, itemName: 'لمبات LED', itemCategoryCode: 3, totalItemQuantity: 2400 },
  { itemCode: 305, itemName: 'لوحة توزيع', itemCategoryCode: 3, totalItemQuantity: 65 },

  // Plumbing Materials
  { itemCode: 401, itemName: 'أنابيب PVC 4 بوصة', itemCategoryCode: 4, totalItemQuantity: 2800 },
  { itemCode: 402, itemName: 'أنابيب PVC 2 بوصة', itemCategoryCode: 4, totalItemQuantity: 3500 },
  { itemCode: 403, itemName: 'صمامات مياه', itemCategoryCode: 4, totalItemQuantity: 425 },
  { itemCode: 404, itemName: 'حنفيات', itemCategoryCode: 4, totalItemQuantity: 380 },

  // Tools & Equipment
  { itemCode: 501, itemName: 'مثقاب كهربائي', itemCategoryCode: 5, totalItemQuantity: 45 },
  { itemCode: 502, itemName: 'منشار كهربائي', itemCategoryCode: 5, totalItemQuantity: 32 },
  { itemCode: 503, itemName: 'مطرقة', itemCategoryCode: 5, totalItemQuantity: 180 },
  { itemCode: 504, itemName: 'مفك براغي', itemCategoryCode: 5, totalItemQuantity: 220 },

  // Painting Materials
  { itemCode: 601, itemName: 'دهان حوائط (جالون)', itemCategoryCode: 6, totalItemQuantity: 850 },
  { itemCode: 602, itemName: 'معجون', itemCategoryCode: 6, totalItemQuantity: 640 },
  { itemCode: 603, itemName: 'فرش دهان', itemCategoryCode: 6, totalItemQuantity: 320 },

  // Insulation Materials
  { itemCode: 701, itemName: 'عازل حراري', itemCategoryCode: 7, totalItemQuantity: 1200 },
  { itemCode: 702, itemName: 'عازل مائي', itemCategoryCode: 7, totalItemQuantity: 950 },
];

export const mockProjectStores: ProjectStore[] = [
  { projectCode: 1001, storeCode: 1, storeName: 'مستودع الموقع الرئيسي', storeManagerId: 1030 },
  { projectCode: 1001, storeCode: 2, storeName: 'مستودع المواد الكهربائية', storeManagerId: 1030 },
  { projectCode: 1002, storeCode: 1, storeName: 'مستودع الموقع', storeManagerId: 1030 },
  { projectCode: 1003, storeCode: 1, storeName: 'مستودع الموقع', storeManagerId: 1030 },
  { projectCode: 1003, storeCode: 2, storeName: 'مستودع العدد', storeManagerId: 1030 },
  { projectCode: 1004, storeCode: 1, storeName: 'مستودع الموقع', storeManagerId: 1030 },
];

export const mockPurchaseOrders: ItemPO[] = [
  {
    transactionNo: 20001,
    transactionDate: new Date('2024-11-01'),
    projectCode: 1001,
    storeCode: 1,
    requestStatus: 'COMPLETED',
    supplierName: 'Al-Rajhi Steel Industries',
    poAmount: 125000,
    requestedBy: 1030,
  },
  {
    transactionNo: 20002,
    transactionDate: new Date('2024-11-10'),
    projectCode: 1002,
    storeCode: 1,
    requestStatus: 'INPROCESS',
    supplierName: 'Arabian Cement Company',
    poAmount: 85000,
    requestedBy: 1030,
  },
  {
    transactionNo: 20003,
    transactionDate: new Date('2024-11-15'),
    projectCode: 1001,
    storeCode: 2,
    requestStatus: 'NEW',
    supplierName: 'Gulf Electrical Supply Co.',
    poAmount: 45000,
    requestedBy: 1030,
  },
  {
    transactionNo: 20004,
    transactionDate: new Date('2024-11-18'),
    projectCode: 1003,
    storeCode: 1,
    requestStatus: 'NEW',
    supplierName: 'National Hardware Trading',
    poAmount: 32000,
    requestedBy: 1030,
  },
];

export const mockStoreBalances: StoreItemBalance[] = [
  // Project 1001, Store 1
  { projectCode: 1001, storeCode: 1, itemCode: 101, itemBalance: 1250 },
  { projectCode: 1001, storeCode: 1, itemCode: 102, itemBalance: 850 },
  { projectCode: 1001, storeCode: 1, itemCode: 201, itemBalance: 3200 },
  { projectCode: 1001, storeCode: 1, itemCode: 202, itemBalance: 185 },
  { projectCode: 1001, storeCode: 1, itemCode: 203, itemBalance: 145 },
  { projectCode: 1001, storeCode: 1, itemCode: 204, itemBalance: 2100 },

  // Project 1001, Store 2
  { projectCode: 1001, storeCode: 2, itemCode: 301, itemBalance: 3800 },
  { projectCode: 1001, storeCode: 2, itemCode: 302, itemBalance: 2150 },
  { projectCode: 1001, storeCode: 2, itemCode: 303, itemBalance: 245 },
  { projectCode: 1001, storeCode: 2, itemCode: 304, itemBalance: 680 },
  { projectCode: 1001, storeCode: 2, itemCode: 305, itemBalance: 18 },

  // Project 1002, Store 1
  { projectCode: 1002, storeCode: 1, itemCode: 101, itemBalance: 1850 },
  { projectCode: 1002, storeCode: 1, itemCode: 102, itemBalance: 1200 },
  { projectCode: 1002, storeCode: 1, itemCode: 201, itemBalance: 4500 },
  { projectCode: 1002, storeCode: 1, itemCode: 204, itemBalance: 3200 },
  { projectCode: 1002, storeCode: 1, itemCode: 301, itemBalance: 2800 },
  { projectCode: 1002, storeCode: 1, itemCode: 401, itemBalance: 850 },
  { projectCode: 1002, storeCode: 1, itemCode: 402, itemBalance: 1100 },

  // Project 1003, Store 1
  { projectCode: 1003, storeCode: 1, itemCode: 101, itemBalance: 980 },
  { projectCode: 1003, storeCode: 1, itemCode: 201, itemBalance: 2400 },
  { projectCode: 1003, storeCode: 1, itemCode: 301, itemBalance: 3200 },
  { projectCode: 1003, storeCode: 1, itemCode: 401, itemBalance: 720 },
  { projectCode: 1003, storeCode: 1, itemCode: 601, itemBalance: 320 },

  // Project 1003, Store 2
  { projectCode: 1003, storeCode: 2, itemCode: 501, itemBalance: 12 },
  { projectCode: 1003, storeCode: 2, itemCode: 502, itemBalance: 8 },
  { projectCode: 1003, storeCode: 2, itemCode: 503, itemBalance: 45 },
  { projectCode: 1003, storeCode: 2, itemCode: 504, itemBalance: 68 },
];

// Receiving Transactions
export const mockReceivingTransactions: ReceivingTransaction[] = [
  {
    receiptNo: 30001,
    receiptDate: new Date('2024-11-05'),
    itemCode: 101,
    quantity: 500,
    unitPrice: 45.50,
    totalAmount: 22750,
    storeId: 1, // storeCode
    receivedBy: 1030,
  },
  {
    receiptNo: 30002,
    receiptDate: new Date('2024-11-05'),
    itemCode: 201,
    quantity: 200,
    unitPrice: 18.00,
    totalAmount: 3600,
    storeId: 1,
    receivedBy: 1030,
  },
  {
    receiptNo: 30003,
    receiptDate: new Date('2024-11-10'),
    itemCode: 301,
    quantity: 1500,
    unitPrice: 12.50,
    totalAmount: 18750,
    storeId: 2,
    receivedBy: 1030,
  },
  {
    receiptNo: 30004,
    receiptDate: new Date('2024-11-10'),
    itemCode: 401,
    quantity: 300,
    unitPrice: 25.00,
    totalAmount: 7500,
    storeId: 1,
    receivedBy: 1030,
  },
  {
    receiptNo: 30005,
    receiptDate: new Date('2024-11-15'),
    itemCode: 501,
    quantity: 10,
    unitPrice: 450.00,
    totalAmount: 4500,
    storeId: 1,
    receivedBy: 1030,
  },
  {
    receiptNo: 30006,
    receiptDate: new Date('2024-11-15'),
    itemCode: 601,
    quantity: 50,
    unitPrice: 85.00,
    totalAmount: 4250,
    storeId: 1,
    receivedBy: 1030,
  },
  {
    receiptNo: 30007,
    receiptDate: new Date('2024-11-20'),
    itemCode: 102,
    quantity: 350,
    unitPrice: 52.00,
    totalAmount: 18200,
    storeId: 1,
    receivedBy: 1030,
  },
  {
    receiptNo: 30008,
    receiptDate: new Date('2024-11-20'),
    itemCode: 302,
    quantity: 800,
    unitPrice: 15.75,
    totalAmount: 12600,
    storeId: 2,
    receivedBy: 1030,
  },
  {
    receiptNo: 30009,
    receiptDate: new Date('2024-11-25'),
    itemCode: 701,
    quantity: 200,
    unitPrice: 35.00,
    totalAmount: 7000,
    storeId: 1,
    receivedBy: 1030,
  },
  {
    receiptNo: 30010,
    receiptDate: new Date('2024-11-25'),
    itemCode: 203,
    quantity: 100,
    unitPrice: 22.50,
    totalAmount: 2250,
    storeId: 1,
    receivedBy: 1030,
  },
];

// Issuing Transactions
export const mockIssuingTransactions: IssuingTransaction[] = [
  {
    issueNo: 40001,
    issueDate: new Date('2024-11-06'),
    itemCode: 101,
    quantity: 200,
    projectCode: 1001,
    issuedBy: 1030,
  },
  {
    issueNo: 40002,
    issueDate: new Date('2024-11-06'),
    itemCode: 201,
    quantity: 50,
    projectCode: 1001,
    issuedBy: 1030,
  },
  {
    issueNo: 40003,
    issueDate: new Date('2024-11-08'),
    itemCode: 301,
    quantity: 500,
    projectCode: 1002,
    issuedBy: 1030,
  },
  {
    issueNo: 40004,
    issueDate: new Date('2024-11-10'),
    itemCode: 401,
    quantity: 100,
    projectCode: 1001,
    issuedBy: 1030,
  },
  {
    issueNo: 40005,
    issueDate: new Date('2024-11-12'),
    itemCode: 501,
    quantity: 2,
    projectCode: 1003,
    issuedBy: 1030,
  },
  {
    issueNo: 40006,
    issueDate: new Date('2024-11-12'),
    itemCode: 601,
    quantity: 20,
    projectCode: null, // General use
    issuedBy: 1030,
  },
  {
    issueNo: 40007,
    issueDate: new Date('2024-11-15'),
    itemCode: 102,
    quantity: 150,
    projectCode: 1002,
    issuedBy: 1030,
  },
  {
    issueNo: 40008,
    issueDate: new Date('2024-11-18'),
    itemCode: 302,
    quantity: 300,
    projectCode: 1001,
    issuedBy: 1030,
  },
  {
    issueNo: 40009,
    issueDate: new Date('2024-11-20'),
    itemCode: 701,
    quantity: 50,
    projectCode: 1003,
    issuedBy: 1030,
  },
  {
    issueNo: 40010,
    issueDate: new Date('2024-11-22'),
    itemCode: 203,
    quantity: 30,
    projectCode: 1002,
    issuedBy: 1030,
  },
  {
    issueNo: 40011,
    issueDate: new Date('2024-11-25'),
    itemCode: 503,
    quantity: 5,
    projectCode: null, // General use
    issuedBy: 1030,
  },
  {
    issueNo: 40012,
    issueDate: new Date('2024-11-28'),
    itemCode: 304,
    quantity: 100,
    projectCode: 1001,
    issuedBy: 1030,
  },
];

// Transfer Transactions
export const mockTransferTransactions: TransferTransaction[] = [
  {
    transferNo: 50001,
    transferDate: new Date('2024-11-07'),
    itemCode: 101,
    quantity: 100,
    fromStoreId: 1,
    toStoreId: 2,
    status: 'COMPLETED',
    transferredBy: 1030,
  },
  {
    transferNo: 50002,
    transferDate: new Date('2024-11-10'),
    itemCode: 201,
    quantity: 50,
    fromStoreId: 1,
    toStoreId: 1,
    status: 'COMPLETED',
    transferredBy: 1030,
  },
  {
    transferNo: 50003,
    transferDate: new Date('2024-11-12'),
    itemCode: 301,
    quantity: 200,
    fromStoreId: 2,
    toStoreId: 1,
    status: 'PENDING',
    transferredBy: 1030,
  },
  {
    transferNo: 50004,
    transferDate: new Date('2024-11-15'),
    itemCode: 401,
    quantity: 75,
    fromStoreId: 1,
    toStoreId: 2,
    status: 'COMPLETED',
    transferredBy: 1030,
  },
  {
    transferNo: 50005,
    transferDate: new Date('2024-11-18'),
    itemCode: 501,
    quantity: 3,
    fromStoreId: 1,
    toStoreId: 1,
    status: 'PENDING',
    transferredBy: 1030,
  },
  {
    transferNo: 50006,
    transferDate: new Date('2024-11-20'),
    itemCode: 601,
    quantity: 15,
    fromStoreId: 1,
    toStoreId: 2,
    status: 'COMPLETED',
    transferredBy: 1030,
  },
  {
    transferNo: 50007,
    transferDate: new Date('2024-11-22'),
    itemCode: 102,
    quantity: 80,
    fromStoreId: 1,
    toStoreId: 1,
    status: 'COMPLETED',
    transferredBy: 1030,
  },
  {
    transferNo: 50008,
    transferDate: new Date('2024-11-25'),
    itemCode: 302,
    quantity: 150,
    fromStoreId: 2,
    toStoreId: 1,
    status: 'PENDING',
    transferredBy: 1030,
  },
  {
    transferNo: 50009,
    transferDate: new Date('2024-11-28'),
    itemCode: 701,
    quantity: 40,
    fromStoreId: 1,
    toStoreId: 2,
    status: 'COMPLETED',
    transferredBy: 1030,
  },
  {
    transferNo: 50010,
    transferDate: new Date('2024-12-01'),
    itemCode: 203,
    quantity: 25,
    fromStoreId: 1,
    toStoreId: 1,
    status: 'PENDING',
    transferredBy: 1030,
  },
];

// ========== Suppliers ==========
export const mockSuppliers: Supplier[] = [
  {
    supplierId: 1,
    supplierName: 'شركة الراجحي للصناعات الحديدية',
    contactPerson: 'Ahmed Al-Rajhi',
    email: 'contact@rajhisteel.com',
    phone: '+966-13-123-4567',
    address: 'Dammam Industrial Area, Eastern Province',
    isActive: true,
    createdDate: new Date('2023-01-15'),
  },
  {
    supplierId: 2,
    supplierName: 'شركة الأسمنت العربية',
    contactPerson: 'Mohammed Al-Saud',
    email: 'info@arabiancement.com',
    phone: '+966-11-234-5678',
    address: 'Riyadh, Central Region',
    isActive: true,
    createdDate: new Date('2023-02-20'),
  },
  {
    supplierId: 3,
    supplierName: 'شركة المواد الكهربائية السعودية',
    contactPerson: 'Khalid Al-Mansouri',
    email: 'sales@saudielectrical.com',
    phone: '+966-12-345-6789',
    address: 'Jeddah, Western Region',
    isActive: true,
    createdDate: new Date('2023-03-10'),
  },
  {
    supplierId: 4,
    supplierName: 'مستلزمات الخليج للسباكة',
    contactPerson: 'Fahad Al-Ghamdi',
    email: 'orders@gulfplumbing.com',
    phone: '+966-14-456-7890',
    address: 'Khobar, Eastern Province',
    isActive: true,
    createdDate: new Date('2023-04-05'),
  },
  {
    supplierId: 5,
    supplierName: 'العدد والأدوات الوطنية',
    contactPerson: 'Saeed Al-Harbi',
    email: 'info@nationaltools.com',
    phone: '+966-11-567-8901',
    address: 'Riyadh, Central Region',
    isActive: true,
    createdDate: new Date('2023-05-12'),
  },
];

// Export aliases for compatibility
export const mockWarehouseItems = mockStoreItems;
export const mockWarehouseCategories = mockItemCategories;
export const mockWarehouseStores = mockProjectStores;
export const mockItemBalances = mockStoreBalances;

