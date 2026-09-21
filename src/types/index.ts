export type UserRole = 'ADMINISTRADOR' | 'OPERADOR' | 'VENDEDOR';

export type Permission =
  | 'ver_produtos'
  | 'criar_produtos'
  | 'editar_produtos'
  | 'excluir_produtos'
  | 'registrar_entrada'
  | 'registrar_saida'
  | 'vender'
  | 'aplicar_desconto'
  | 'cancelar_venda'
  | 'abrir_caixa'
  | 'fechar_caixa'
  | 'fazer_sangria'
  | 'fazer_suprimento'
  | 'ver_relatorios'
  | 'fazer_backup'
  | 'restaurar_backup'
  | 'gerenciar_usuarios'
  | 'configuracoes';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  avatar?: string;
  authProvider?: 'local';
  passwordHash: string;
  role: UserRole;
  permissions: Permission[];
  status: 'ativo' | 'inativo';
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export type ProductUnit = 'UN' | 'KG' | 'LT' | 'CX' | 'PC' | 'M' | 'PAR' | 'G' | 'ML';

export interface ProductLot {
  id: string;
  lotNumber: string; // Ex: LOTE-2026/A, LT-9821
  barcode?: string; // Código de barras ou QR Code do lote / caixa
  quantity: number; // Quantidade adicionada neste lote
  unitCost?: number;
  expiryDate?: string; // Validade (YYYY-MM-DD)
  manufacturingDate?: string; // Data de fabricação (YYYY-MM-DD)
  supplier?: string;
  notes?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  additionalBarcodes?: string[]; // Códigos adicionais / QR codes de novos lotes ou caixas
  lots?: ProductLot[]; // Histórico de lotes vinculados ao produto
  boxQuantity?: number; // Quantidade padrão de unidades por caixa (ex: 24)
  name: string;
  categoryId: string;
  categoryName?: string;
  brand: string;
  description?: string;
  unit: string; // UN, KG, LT, CX, PC, etc.
  currentStock: number;
  minStock: number;
  costPrice: number;
  salePrice: number;
  image?: string;
  location?: string;
  notes?: string;
  supplier?: string;
  profitMargin?: number;
  status: 'ativo' | 'inativo';
  createdAt: string;
  updatedAt: string;
}

export type MovementType = 'ENTRADA' | 'SAIDA';

export type MovementReason =
  | 'Compra'
  | 'Venda'
  | 'Devolução'
  | 'Perda'
  | 'Avaria'
  | 'Vencimento'
  | 'Consumo Interno'
  | 'Doação'
  | 'Produção'
  | 'Reposição Emergencial'
  | 'Uso interno'
  | 'Ajuste'
  | 'Ajuste de Estoque'
  | 'Estorno de Venda'
  | 'Estoque Inicial'
  | 'Outros';

export interface Movement {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  sku?: string;
  type: MovementType;
  quantity: number;
  unitCostOrPrice: number;
  unitPrice?: number;
  totalValue: number;
  reason: MovementReason | string;
  user: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  observation?: string;
  notes?: string;
  supplier?: string;
  lotNumber?: string;
  barcodeUsed?: string;
  expiryDate?: string;
  saleId?: string;
  createdAt?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  total: number;
}

export type PaymentMethodType = 'dinheiro' | 'credito' | 'debito' | 'pix' | 'misto';

export interface PaymentEntry {
  method: 'dinheiro' | 'credito' | 'debito' | 'pix';
  amount: number;
}

export interface Sale {
  id: string;
  saleNumber: number;
  items: SaleItem[];
  subtotal: number;
  discountType: 'reais' | 'percent';
  discountValue: number;
  discountAmount: number;
  total: number;
  paymentMethod: PaymentMethodType;
  payments: PaymentEntry[];
  amountReceived: number;
  change: number;
  user: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  status: 'concluida' | 'cancelada';
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  createdAt?: string;
}

export type CashRegisterStatus = 'aberto' | 'fechado';

export interface CashRegister {
  id: string;
  openDate: string; // YYYY-MM-DD
  openTime: string; // HH:MM:SS
  openedDate?: string;
  openedTime?: string;
  closeDate?: string;
  closeTime?: string;
  closedDate?: string;
  closedTime?: string;
  user: string;
  openAmount: number;
  initialCash?: number;
  cashSales: number;
  totalCashSales?: number;
  creditSales: number;
  debitSales: number;
  totalCardSales?: number;
  pixSales: number;
  totalPixSales?: number;
  supplies: number; // suprimentos
  totalSuprimentos?: number;
  bleedings: number; // sangrias
  totalSangrias?: number;
  expectedCash: number; // openAmount + cashSales + supplies - bleedings
  reportedCash?: number;
  actualCash?: number;
  difference?: number; // reportedCash - expectedCash
  differenceType?: 'sobra' | 'falta' | 'exato';
  status: CashRegisterStatus;
  notes?: string;
}

export type CashMovementType =
  | 'abertura'
  | 'venda_dinheiro'
  | 'suprimento'
  | 'sangria'
  | 'estorno_venda'
  | 'fechamento'
  | 'SUPRIMENTO'
  | 'SANGRIA'
  | 'VENDA'
  | 'ESTORNO';

export interface CashMovement {
  id: string;
  cashRegisterId: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  observation?: string;
  user: string;
  date: string;
  time: string;
}

export interface CompanySettings {
  id: 'main';
  companyName: string;
  name?: string;
  logo?: string;
  address: string;
  phone: string;
  email?: string;
  document: string; // CNPJ ou CPF
  currency: string;
  defaultMinStock: number;
  theme: 'light' | 'dark';
  receiptFooterMessage?: string;
  receiptPaperWidth?: '58mm' | '80mm';
  autoPrintReceipt?: boolean;
  pdv: {
    allowDiscountForOperator: boolean;
    quickCashSuggestions: number[];
    barcodeAudioBeep: boolean;
    printReceiptAutomatically: boolean;
    printerWidth: '58mm' | '80mm' | 'A4';
    blockOutOfStock?: boolean;
  };
}

export interface FullBackupData {
  version: string;
  timestamp: string;
  appName: string;
  data: {
    products: Product[];
    categories: Category[];
    movements: Movement[];
    sales: Sale[];
    cashRegisters: CashRegister[];
    cashMovements: CashMovement[];
    users: User[];
    settings: CompanySettings;
  };
}
