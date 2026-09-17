import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Barcode,
  Camera,
  Plus,
  Minus,
  Trash2,
  Percent,
  CheckCircle,
  CreditCard,
  Banknote,
  QrCode,
  Layers,
  ArrowRight,
  AlertCircle,
  Package,
  ShoppingBag,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { productService } from '../services/productService';
import { salesService, CreateSaleInput } from '../services/salesService';
import { cashService } from '../services/cashService';
import { Category, PaymentEntry, PaymentMethodType, Product, Sale, SaleItem } from '../types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { BarcodeScannerModal } from '../components/common/BarcodeScannerModal';
import { ReceiptModal } from '../components/common/ReceiptModal';
import { PageId } from '../layouts/MainLayout';

interface PDVPageProps {
  onNavigate: (page: PageId) => void;
}

export const PDVPage: React.FC<PDVPageProps> = ({ onNavigate }) => {
  const { user, hasPermission } = useAuth();
  const {
    settings,
    formatCurrency,
    activeCashRegister,
    refreshCashRegister,
    showToast,
    playBeep,
  } = useApp();

  // Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Visual scan feedback & auto-open register
  const [lastBippedId, setLastBippedId] = useState<string | null>(null);
  const [isQuickOpenRegisterModalOpen, setIsQuickOpenRegisterModalOpen] = useState(false);
  const [pendingProductToBip, setPendingProductToBip] = useState<Product | null>(null);
  const [isOpeningRegister, setIsOpeningRegister] = useState(false);

  // Cart State
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discountType, setDiscountType] = useState<'reais' | 'percent'>('reais');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Modals & Camera
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Payment Form State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('dinheiro');
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [mixedPayments, setMixedPayments] = useState<PaymentEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Focus Refs & Scanner Buffer
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const lastScannedBarcodeRef = useRef<{ code: string; timestamp: number }>({ code: '', timestamp: 0 });
  const isScanProcessingLockRef = useRef<boolean>(false);

  const focusBarcodeInput = () => {
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 40);
  };

  // Load products and categories
  const loadCatalog = async () => {
    try {
      const [prods, cats] = await Promise.all([
        productService.getProducts(),
        productService.getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (e) {
      console.error('Error loading PDV catalog:', e);
    }
  };

  useEffect(() => {
    loadCatalog();
    refreshCashRegister();
    focusBarcodeInput();
  }, []);

  // Keyboard Shortcuts (F2, F3, F4, F5, F8, ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F3') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (canApplyDiscount) setIsDiscountModalOpen(true);
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (cart.length > 0 && confirm('Deseja limpar todos os itens do carrinho?')) {
          setCart([]);
          setDiscountValue(0);
          focusBarcodeInput();
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0 && !isPaymentModalOpen) {
          handleOpenPaymentModal();
        }
      } else if (e.key === 'Escape') {
        setIsCameraScannerOpen(false);
        setIsDiscountModalOpen(false);
        setIsPaymentModalOpen(false);
        setIsQuickOpenRegisterModalOpen(false);
        focusBarcodeInput();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isPaymentModalOpen]);

  // Comprehensive Product Lookup by Barcode, SKU, Additional Barcodes (Lots/Boxes), or ID
  const findProductByBarcodeOrSku = (rawQuery: string): Product | undefined => {
    if (!rawQuery) return undefined;
    const clean = rawQuery.trim();
    const lower = clean.toLowerCase();
    const digitsOnly = clean.replace(/\D/g, '');

    // 1. Exact match by primary barcode, SKU, or additional barcodes / lot barcodes
    let found = products.find(
      p =>
        p.status === 'ativo' &&
        (p.barcode?.trim().toLowerCase() === lower ||
          p.sku?.trim().toLowerCase() === lower ||
          (p.additionalBarcodes &&
            p.additionalBarcodes.some(b => b && b.trim().toLowerCase() === lower)) ||
          (p.lots &&
            p.lots.some(l => l.barcode && l.barcode.trim().toLowerCase() === lower)))
    );
    if (found) return found;

    // 2. Numeric match (EAN-13, EAN-8, UPC, Code 128) across primary and secondary barcodes
    if (digitsOnly.length >= 3) {
      found = products.find(
        p =>
          p.status === 'ativo' &&
          ((p.barcode && p.barcode.replace(/\D/g, '') === digitsOnly) ||
            (p.additionalBarcodes &&
              p.additionalBarcodes.some(b => b && b.replace(/\D/g, '') === digitsOnly)) ||
            (p.lots &&
              p.lots.some(l => l.barcode && l.barcode.replace(/\D/g, '') === digitsOnly)))
      );
      if (found) return found;

      // Match stripped leading zero if scanner added or removed a zero
      if (digitsOnly.startsWith('0')) {
        const stripped = digitsOnly.replace(/^0+/, '');
        if (stripped.length >= 3) {
          found = products.find(
            p =>
              p.status === 'ativo' &&
              ((p.barcode && p.barcode.replace(/\D/g, '').replace(/^0+/, '') === stripped) ||
                (p.additionalBarcodes &&
                  p.additionalBarcodes.some(
                    b => b && b.replace(/\D/g, '').replace(/^0+/, '') === stripped
                  )) ||
                (p.lots &&
                  p.lots.some(
                    l => l.barcode && l.barcode.replace(/\D/g, '').replace(/^0+/, '') === stripped
                  )))
          );
          if (found) return found;
        }
      }
    }

    // 3. Match by internal product ID
    found = products.find(p => p.status === 'ativo' && p.id.toLowerCase() === lower);
    if (found) return found;

    return undefined;
  };

  // Cart Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);

  const discountAmount =
    discountType === 'percent'
      ? Number(((subtotal * discountValue) / 100).toFixed(2))
      : Math.min(discountValue, subtotal);

  const total = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));

  const canApplyDiscount =
    user?.role === 'ADMINISTRADOR' ||
    (settings.pdv?.allowDiscountForOperator && hasPermission('aplicar_desconto'));

  // Add Product to Cart with double-scan quantity incrementation
  const handleAddToCart = (product: Product, quantityToAdd: number = 1) => {
    if (!activeCashRegister) {
      setPendingProductToBip(product);
      setIsQuickOpenRegisterModalOpen(true);
      showToast('O caixa está fechado. Abra o caixa para registrar as vendas.', 'warning');
      return;
    }

    const blockOutOfStock = settings.pdv?.blockOutOfStock ?? false;
    let toastMessage = '';
    let toastType: 'success' | 'warning' | 'info' | 'error' = 'success';
    let isBlocked = false;

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(i => i.productId === product.id);
      const currentQtyInCart = existingIndex >= 0 ? prevCart[existingIndex].quantity : 0;
      const requestedQty = currentQtyInCart + quantityToAdd;

      if (blockOutOfStock) {
        if (product.currentStock <= 0) {
          toastMessage = `Produto "${product.name}" sem estoque disponível!`;
          toastType = 'error';
          isBlocked = true;
          return prevCart;
        }
        if (requestedQty > product.currentStock) {
          toastMessage = `Limite de estoque atingido! Disponível: ${product.currentStock} ${product.unit}`;
          toastType = 'warning';
          isBlocked = true;
          return prevCart;
        }
      } else {
        if (product.currentStock <= 0 || requestedQty > product.currentStock) {
          toastMessage = `Aviso: Quantidade (${requestedQty}) excede o estoque atual (${product.currentStock} ${product.unit}). Venda autorizada.`;
          toastType = 'info';
        }
      }

      if (existingIndex >= 0) {
        // INCREMENT QUANTITY on subsequent scans
        const updated = [...prevCart];
        const item = updated[existingIndex];
        const newQty = item.quantity + quantityToAdd;
        updated[existingIndex] = {
          ...item,
          quantity: newQty,
          total: Number((newQty * item.unitPrice - item.discount).toFixed(2)),
        };
        if (!toastMessage) {
          toastMessage = `+${quantityToAdd} "${product.name}" bipado! (Total no carrinho: ${newQty} ${product.unit})`;
          toastType = 'success';
        }
        return updated;
      } else {
        // ADD NEW ITEM on 1st scan
        const newItem: SaleItem = {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          quantity: quantityToAdd,
          unitPrice: product.salePrice,
          costPrice: product.costPrice,
          discount: 0,
          total: Number((quantityToAdd * product.salePrice).toFixed(2)),
        };
        if (!toastMessage) {
          toastMessage = `"${product.name}" adicionado à lista de venda!`;
          toastType = 'success';
        }
        return [newItem, ...prevCart];
      }
    });

    if (isBlocked) {
      showToast(toastMessage, toastType);
      return;
    }

    // Barcode Beep & Visual Highlight
    playBeep();
    setLastBippedId(product.id);
    setTimeout(() => {
      setLastBippedId(prev => (prev === product.id ? null : prev));
    }, 1500);

    if (toastMessage) {
      showToast(toastMessage, toastType);
    }

    focusBarcodeInput();
  };

  // Process scanned code directly with debounce protection against hardware stutter
  const processScannedBarcode = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    const now = Date.now();
    const lastScan = lastScannedBarcodeRef.current;
    const DUPLICATE_BOUNCE_THRESHOLD_MS = 450; // Protect against scanner hardware bounce (< 450ms for identical code)

    // Rule:
    // If the scanner hardware fires the EXACT same barcode within < 450ms,
    // it's an accidental double-read/bounce. Discard duplicate without adding another item!
    // But if the seller deliberately scans again (> 450ms later), it increases quantity!
    if (
      lastScan.code.toLowerCase() === code.toLowerCase() &&
      now - lastScan.timestamp < DUPLICATE_BOUNCE_THRESHOLD_MS
    ) {
      console.warn(`[PDV] Bip duplicado instantâneo evitado (${now - lastScan.timestamp}ms):`, code);
      setBarcodeInput('');
      scanBufferRef.current = '';
      return;
    }

    // Single-event-tick lock
    if (isScanProcessingLockRef.current) {
      return;
    }
    isScanProcessingLockRef.current = true;
    lastScannedBarcodeRef.current = { code, timestamp: now };

    try {
      const matched = findProductByBarcodeOrSku(code);

      if (matched) {
        handleAddToCart(matched, 1);
      } else {
        showToast(`Código de barras "${code}" não encontrado no catálogo.`, 'error');
      }
    } finally {
      setBarcodeInput('');
      scanBufferRef.current = '';
      focusBarcodeInput();
      setTimeout(() => {
        isScanProcessingLockRef.current = false;
      }, 50);
    }
  };

  // Global Hardware Barcode Scanner Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if any modal is open
      if (
        isPaymentModalOpen ||
        isDiscountModalOpen ||
        isCameraScannerOpen ||
        isReceiptOpen ||
        isQuickOpenRegisterModalOpen
      ) {
        return;
      }

      // Ignore standard shortcut function keys
      if (['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Escape'].includes(e.key)) {
        return;
      }

      const activeEl = document.activeElement;
      const isInputOrTextarea =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement)?.isContentEditable;

      // Case 1: Search input is active and user pressed Enter with barcode
      if (activeEl === searchInputRef.current) {
        if (e.key === 'Enter') {
          const query = searchQuery.trim();
          const matched = findProductByBarcodeOrSku(query);
          if (matched) {
            e.preventDefault();
            handleAddToCart(matched, 1);
            setSearchQuery('');
            focusBarcodeInput();
            return;
          }
        }
        return;
      }

      // Case 2: Barcode input is already focused
      if (activeEl === barcodeInputRef.current) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          processScannedBarcode(barcodeInput);
        }
        return;
      }

      // Case 3: Other interactive input is focused
      if (isInputOrTextarea && activeEl !== barcodeInputRef.current) {
        return;
      }

      // Case 4: No text input is focused (e.g. user clicked on category, product card, or background)
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter' || e.key === 'Tab') {
        if (scanBufferRef.current.length >= 2) {
          e.preventDefault();
          processScannedBarcode(scanBufferRef.current);
          scanBufferRef.current = '';
        }
        focusBarcodeInput();
        return;
      }

      // Capture single printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // If burst time > 300ms, start a fresh buffer
        if (timeDiff > 300) {
          scanBufferRef.current = e.key;
        } else {
          scanBufferRef.current += e.key;
        }

        setBarcodeInput(scanBufferRef.current);
        focusBarcodeInput();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    products,
    cart,
    activeCashRegister,
    barcodeInput,
    searchQuery,
    isPaymentModalOpen,
    isDiscountModalOpen,
    isCameraScannerOpen,
    isReceiptOpen,
    isQuickOpenRegisterModalOpen,
  ]);

  // Adjust quantity (+ / - / direct edit)
  const handleUpdateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    const blockOutOfStock = settings.pdv?.blockOutOfStock ?? false;
    if (blockOutOfStock && product && newQty > product.currentStock) {
      showToast(
        `Estoque insuficiente! Disponível: ${product.currentStock} ${product.unit}`,
        'warning'
      );
      return;
    }

    setCart(prev =>
      prev.map(item => {
        if (item.productId === productId) {
          return {
            ...item,
            quantity: newQty,
            total: Number((newQty * item.unitPrice - item.discount).toFixed(2)),
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
    focusBarcodeInput();
  };

  // Barcode Handlers
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processScannedBarcode(barcodeInput);
  };

  const handleCameraScan = (scannedCode: string) => {
    processScannedBarcode(scannedCode);
  };

  // Quick Open Cash Register
  const handleQuickOpenRegister = async (initialAmount: number = 0) => {
    try {
      setIsOpeningRegister(true);
      await cashService.openRegister(
        initialAmount,
        user?.username || 'operador',
        'Abertura rápida no Ponto de Venda'
      );
      await refreshCashRegister();
      setIsQuickOpenRegisterModalOpen(false);
      showToast('Caixa aberto com sucesso! Pronto para realizar vendas.', 'success');

      if (pendingProductToBip) {
        handleAddToCart(pendingProductToBip, 1);
        setPendingProductToBip(null);
      }
      focusBarcodeInput();
    } catch (e) {
      showToast((e as Error).message || 'Erro ao abrir caixa.', 'error');
    } finally {
      setIsOpeningRegister(false);
    }
  };

  // Payment Preparation
  const handleOpenPaymentModal = () => {
    if (cart.length === 0) {
      showToast('Adicione ao menos um item no carrinho.', 'warning');
      return;
    }
    if (!activeCashRegister) {
      showToast('O caixa está fechado. Abra o caixa primeiro.', 'error');
      return;
    }

    setPaymentMethod('dinheiro');
    setAmountReceived(total);
    setMixedPayments([
      { method: 'dinheiro', amount: total },
    ]);
    setIsPaymentModalOpen(true);
  };

  // Mixed Payment Helpers
  const totalMixedPaid = mixedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const remainingMixedBalance = Math.max(0, Number((total - totalMixedPaid).toFixed(2)));

  const handleAddMixedPayment = (method: 'dinheiro' | 'credito' | 'debito' | 'pix') => {
    if (remainingMixedBalance <= 0) return;
    setMixedPayments(prev => [...prev, { method, amount: remainingMixedBalance }]);
  };

  const handleUpdateMixedAmount = (index: number, amount: number) => {
    setMixedPayments(prev => {
      const copy = [...prev];
      copy[index].amount = Math.max(0, amount);
      return copy;
    });
  };

  const handleRemoveMixedPayment = (index: number) => {
    setMixedPayments(prev => prev.filter((_, idx) => idx !== index));
  };

  // Finalize Sale
  const handleFinalizeSale = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      let payments: PaymentEntry[] = [];
      let finalAmountReceived = total;
      let finalChange = 0;

      if (paymentMethod === 'dinheiro') {
        if (amountReceived < total) {
          throw new Error('Valor recebido é menor que o total da venda.');
        }
        finalAmountReceived = amountReceived;
        finalChange = Number((amountReceived - total).toFixed(2));
        payments = [{ method: 'dinheiro', amount: total }];
      } else if (paymentMethod === 'credito' || paymentMethod === 'debito' || paymentMethod === 'pix') {
        payments = [{ method: paymentMethod, amount: total }];
        finalAmountReceived = total;
        finalChange = 0;
      } else if (paymentMethod === 'misto') {
        if (totalMixedPaid < total) {
          throw new Error(`Pagamento incompleto. Falta pagar ${formatCurrency(remainingMixedBalance)}.`);
        }
        payments = mixedPayments.filter(p => p.amount > 0);
        finalAmountReceived = totalMixedPaid;
        finalChange = Number((totalMixedPaid - total).toFixed(2));
      }

      const saleInput: CreateSaleInput = {
        items: cart,
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        total,
        paymentMethod,
        payments,
        amountReceived: finalAmountReceived,
        change: finalChange,
        username: user?.username || 'operador',
      };

      const newSale = await salesService.createSale(saleInput);

      // Refresh catalog and cash
      await Promise.all([loadCatalog(), refreshCashRegister()]);

      // Open receipt
      setCompletedSale(newSale);
      setIsPaymentModalOpen(false);
      setIsReceiptOpen(true);

      // Clear Cart
      setCart([]);
      setDiscountValue(0);
      showToast(`Venda #${newSale.saleNumber} finalizada com sucesso!`, 'success');
      window.dispatchEvent(new CustomEvent('estoque_data_changed'));
    } catch (err) {
      showToast((err as Error).message || 'Erro ao finalizar venda.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products by category and search
  const filteredProducts = products.filter(p => {
    if (p.status !== 'ativo') return false;
    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-5rem)]">
      {/* Cash Register Warning Banner if Closed */}
      {!activeCashRegister && (
        <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Atenção:</strong> O caixa está fechado! Para registrar vendas no PDV, abra o caixa primeiro.
            </span>
          </div>
          <button
            onClick={() => onNavigate('caixa')}
            className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition"
          >
            Abrir Caixa Agora
          </button>
        </div>
      )}

      {/* Main Split Layout: Left = Catalog & Search | Right = Cart */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        {/* LEFT COLUMN: Products Catalog & Fast Search (Cols 1-7) */}
        <div className="lg:col-span-7 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {/* Top Search & Barcode Bar */}
          <div className="p-3 border-b border-slate-800 bg-slate-900/90 space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Text Search Input */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Pesquisar produto por nome ou SKU (F2)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs md:text-sm text-white focus:outline-hidden focus:border-blue-500 placeholder:text-slate-500"
                />
              </div>

              {/* Barcode USB Scanner Input */}
              <div className="flex items-center gap-1.5 flex-1 sm:max-w-md">
                <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-emerald-400">
                    <Barcode className="w-4 h-4" />
                  </div>
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="Bipar código de barras (F3)..."
                    value={barcodeInput}
                    onChange={e => {
                      const val = e.target.value;
                      // If scanner appended newline
                      if (val.includes('\n') || val.includes('\r')) {
                        const cleanVal = val.replace(/[\r\n]/g, '').trim();
                        if (cleanVal) {
                          processScannedBarcode(cleanVal);
                        } else {
                          setBarcodeInput('');
                        }
                        return;
                      }
                      setBarcodeInput(val);
                    }}
                    className="w-full pl-8 pr-14 py-2 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs md:text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-500 font-mono shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={!barcodeInput.trim()}
                    className="absolute right-1 top-1 bottom-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-0 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                    title="Adicionar produto"
                  >
                    Bipar
                  </button>
                </form>

                {/* Camera Scanner Button */}
                <button
                  type="button"
                  onClick={() => setIsCameraScannerOpen(true)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shrink-0"
                  title="Escanear com a câmera"
                >
                  <Camera className="w-4 h-4 text-blue-400" />
                </button>
              </div>
            </div>

            {/* Status indicator for Barcode Reader */}
            <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-medium">
                  Leitor de Código Pronto (apenas aponte e bipe)
                </span>
              </div>
              <span className="hidden sm:inline text-slate-500 text-[10px]">
                Dica: Bipar o mesmo código 2x soma +1 automaticamente na quantidade!
              </span>
            </div>

            {/* Fast Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-lg shrink-0 font-medium transition ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Todos ({products.length})
              </button>
              {categories.map(cat => {
                const count = products.filter(p => p.categoryId === cat.id && p.status === 'ativo').length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1 rounded-lg shrink-0 font-medium transition ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {filteredProducts.map(product => {
                  const isOutOfStock = product.currentStock <= 0;
                  const isLowStock = !isOutOfStock && product.currentStock <= product.minStock;

                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && handleAddToCart(product)}
                      className={`flex flex-col justify-between p-3 rounded-xl border text-left transition group ${
                        isOutOfStock
                          ? 'bg-slate-950/40 border-slate-800 opacity-60 cursor-not-allowed'
                          : 'bg-slate-950/80 border-slate-800 hover:border-blue-500/50 hover:bg-slate-950 cursor-pointer'
                      }`}
                    >
                      <div>
                        {/* Status Badges */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[10px] font-mono text-slate-500 uppercase truncate">
                            {product.sku}
                          </span>
                          {isOutOfStock ? (
                            <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded">
                              Zerado
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                              Baixo
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-400">
                              {product.currentStock} {product.unit}
                            </span>
                          )}
                        </div>

                        {/* Product Title */}
                        <h4 className="text-xs font-semibold text-slate-100 line-clamp-2 leading-snug group-hover:text-blue-300 transition">
                          {product.name}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-bold text-white font-mono">
                          {formatCurrency(product.salePrice)}
                        </span>
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={e => {
                            e.stopPropagation();
                            handleAddToCart(product);
                          }}
                          className={`p-1.5 rounded-lg transition ${
                            isOutOfStock
                              ? 'bg-slate-800 text-slate-600'
                              : 'bg-blue-600/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-12">
                <Package className="w-10 h-10 mb-2 opacity-40" />
                <p>Nenhum produto encontrado com os filtros atuais.</p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-blue-400 hover:underline"
                  >
                    Limpar busca
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Sale Cart & Checkout Panel (Cols 8-12) */}
        <div className="lg:col-span-5 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-400" />
              <h2 className="font-bold text-sm text-white">Carrinho da Venda</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">
                {cart.reduce((acc, i) => acc + i.quantity, 0)} itens
              </span>
            </div>

            {cart.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Deseja cancelar esta venda e limpar o carrinho?')) {
                    setCart([]);
                    setDiscountValue(0);
                  }
                }}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"
                title="Limpar carrinho (F5)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar (F5)</span>
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length > 0 ? (
              cart.map(item => {
                const isJustBipped = item.productId === lastBippedId;

                return (
                  <div
                    key={item.productId}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all duration-300 ${
                      isJustBipped
                        ? 'bg-blue-950/70 border-blue-400 shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/50 scale-[1.01]'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white truncate">{item.productName}</p>
                        {isJustBipped && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                            Bipado (+1)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                        <span className="font-mono">{formatCurrency(item.unitPrice)}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-500">SKU: {item.sku}</span>
                        {item.barcode && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-slate-500">Cód: {item.barcode}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1.5 bg-slate-900 px-1.5 py-1 rounded-lg border border-slate-800">
                      <button
                        onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Diminuir quantidade"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-bold text-white font-mono text-xs">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Aumentar quantidade"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Item Total */}
                    <div className="text-right min-w-[70px]">
                      <p className="font-bold text-white font-mono">{formatCurrency(item.total)}</p>
                    </div>

                    {/* Delete Item */}
                    <button
                      onClick={() => handleRemoveItem(item.productId)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition"
                      title="Remover produto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-12">
                <ShoppingBag className="w-12 h-12 mb-2 opacity-20" />
                <p>Nenhum produto no carrinho.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Selecione ao lado ou leia o código de barras
                </p>
              </div>
            )}
          </div>

          {/* Cart Totals & Actions Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/90 space-y-3">
            {/* Subtotal & Discount Row */}
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex justify-between items-center text-emerald-400">
                <div className="flex items-center gap-1.5">
                  <span>Desconto:</span>
                  {canApplyDiscount && (
                    <button
                      onClick={() => setIsDiscountModalOpen(true)}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-blue-400 hover:bg-slate-700 font-medium"
                      title="Aplicar desconto (F4)"
                    >
                      {discountAmount > 0 ? 'Editar (F4)' : '+ Aplicar (F4)'}
                    </button>
                  )}
                </div>
                <span className="font-mono font-medium">
                  {discountAmount > 0 ? `- ${formatCurrency(discountAmount)}` : 'R$ 0,00'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                <span className="text-sm font-bold text-white uppercase">Total a Pagar:</span>
                <span className="text-2xl font-black text-white font-mono tracking-tight text-emerald-400">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            {/* Big Checkout Button */}
            <button
              onClick={handleOpenPaymentModal}
              disabled={cart.length === 0 || !activeCashRegister}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-sm md:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>FINALIZAR VENDA (F8)</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Camera Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={handleCameraScan}
      />

      {/* Discount Modal */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Percent className="w-5 h-5 text-blue-400" />
                <span>Aplicar Desconto na Venda</span>
              </h3>
              <button
                onClick={() => setIsDiscountModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setDiscountType('reais')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  discountType === 'reais'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Valor em Reais (R$)
              </button>
              <button
                onClick={() => setDiscountType('percent')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  discountType === 'percent'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Porcentagem (%)
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {discountType === 'reais' ? 'Valor do desconto (R$)' : 'Percentual de desconto (%)'}
              </label>
              <input
                type="number"
                min="0"
                step={discountType === 'reais' ? '0.01' : '1'}
                max={discountType === 'percent' ? 100 : subtotal}
                autoFocus
                value={discountValue || ''}
                onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-lg font-mono font-bold focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Desconto calculado:</span>
                <span>- {formatCurrency(discountAmount)}</span>
              </div>
              <div className="flex justify-between text-white font-bold pt-1 border-t border-slate-800">
                <span>Novo Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setDiscountValue(0);
                  setIsDiscountModalOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Remover Desconto
              </button>
              <button
                onClick={() => setIsDiscountModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Screen Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-5 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Finalização de Pagamento</h3>
                <p className="text-xs text-slate-400">Selecione a forma de pagamento do cliente</p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Total Display Banner */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Total da Venda
              </span>
              <span className="text-3xl font-black text-emerald-400 font-mono">
                {formatCurrency(total)}
              </span>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                { id: 'credito', label: 'C. Crédito', icon: CreditCard },
                { id: 'debito', label: 'C. Débito', icon: CreditCard },
                { id: 'pix', label: 'Pix', icon: QrCode },
              ].map(m => {
                const Icon = m.icon;
                const isSel = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setPaymentMethod(m.id as PaymentMethodType);
                      setAmountReceived(total);
                    }}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1.5 text-xs font-semibold transition ${
                      isSel
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Option for Pagamento Misto */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('misto');
                  setMixedPayments([{ method: 'dinheiro', amount: total }]);
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                  paymentMethod === 'misto'
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 inline mr-1" />
                Habilitar Pagamento Misto / Dividido
              </button>
            </div>

            {/* Payment Specific Forms */}
            {paymentMethod === 'dinheiro' && (
              <div className="space-y-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Valor Recebido em Dinheiro (R$):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    autoFocus
                    value={amountReceived || ''}
                    onChange={e => setAmountReceived(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xl font-bold font-mono text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Quick Cash Suggestions */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-[11px] text-slate-400 w-full">Valores rápidos:</span>
                  <button
                    type="button"
                    onClick={() => setAmountReceived(total)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-mono font-medium hover:bg-slate-700"
                  >
                    Exato ({formatCurrency(total)})
                  </button>
                  {[10, 20, 50, 100, 200].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmountReceived(val)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-mono font-medium hover:bg-slate-700"
                    >
                      R$ {val},00
                    </button>
                  ))}
                </div>

                {/* Change Calculation (Troco) */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-300">Troco a devolver:</span>
                  <span
                    className={`text-2xl font-black font-mono ${
                      amountReceived >= total ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {amountReceived >= total
                      ? formatCurrency(amountReceived - total)
                      : `Falta ${formatCurrency(total - amountReceived)}`}
                  </span>
                </div>
              </div>
            )}

            {(paymentMethod === 'credito' || paymentMethod === 'debito') && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                <CreditCard className="w-10 h-10 text-blue-400 mx-auto opacity-80" />
                <p className="text-sm font-semibold text-white">
                  Pagamento com {paymentMethod === 'credito' ? 'Cartão de Crédito' : 'Cartão de Débito'}
                </p>
                <p className="text-xs text-slate-400">
                  Passe o cartão na maquininha física (POS). Ao confirmar abaixo, a venda será registrada no sistema.
                </p>
              </div>
            )}

            {paymentMethod === 'pix' && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                <QrCode className="w-12 h-12 text-teal-400 mx-auto" />
                <p className="text-sm font-semibold text-white">Pagamento via Pix</p>
                <p className="text-xs text-slate-400">
                  Receba o valor de <strong>{formatCurrency(total)}</strong> via Pix do cliente.
                </p>
                <span className="inline-block text-[11px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-full font-medium">
                  Modo 100% Offline — Não requer API externa
                </span>
              </div>
            )}

            {paymentMethod === 'misto' && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">Pagamentos Divididos:</span>
                  <span
                    className={`font-bold font-mono ${
                      remainingMixedBalance === 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {remainingMixedBalance === 0
                      ? 'Totalmente Coberto'
                      : `Falta: ${formatCurrency(remainingMixedBalance)}`}
                  </span>
                </div>

                {mixedPayments.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={p.method}
                      onChange={e => {
                        const copy = [...mixedPayments];
                        copy[idx].method = e.target.value as 'dinheiro' | 'credito' | 'debito' | 'pix';
                        setMixedPayments(copy);
                      }}
                      className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="dinheiro">Dinheiro</option>
                      <option value="credito">C. Crédito</option>
                      <option value="debito">C. Débito</option>
                      <option value="pix">Pix</option>
                    </select>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={p.amount || ''}
                      onChange={e => handleUpdateMixedAmount(idx, parseFloat(e.target.value) || 0)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveMixedPayment(idx)}
                      className="p-1.5 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {remainingMixedBalance > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-400 w-full">Adicionar restante via:</span>
                    <button
                      type="button"
                      onClick={() => handleAddMixedPayment('dinheiro')}
                      className="px-2 py-1 rounded bg-slate-800 text-[11px] text-slate-200 hover:bg-slate-700"
                    >
                      + Dinheiro
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddMixedPayment('pix')}
                      className="px-2 py-1 rounded bg-slate-800 text-[11px] text-slate-200 hover:bg-slate-700"
                    >
                      + Pix
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddMixedPayment('credito')}
                      className="px-2 py-1 rounded bg-slate-800 text-[11px] text-slate-200 hover:bg-slate-700"
                    >
                      + Crédito
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddMixedPayment('debito')}
                      className="px-2 py-1 rounded bg-slate-800 text-[11px] text-slate-200 hover:bg-slate-700"
                    >
                      + Débito
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
              >
                Voltar (ESC)
              </button>
              <button
                type="button"
                disabled={
                  isSubmitting ||
                  (paymentMethod === 'dinheiro' && amountReceived < total) ||
                  (paymentMethod === 'misto' && totalMixedPaid < total)
                }
                onClick={handleFinalizeSale}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>{isSubmitting ? 'Finalizando...' : 'Confirmar Venda (Enter)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Open Register Modal */}
      {isQuickOpenRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-white">Caixa Fechado para Vendas</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Para começar a bipar produtos no leitor de código de barras e registrar vendas, é necessário abrir o caixa do dia.
            </p>

            {pendingProductToBip && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Produto Bipado</span>
                  <span className="font-semibold text-white">{pendingProductToBip.name}</span>
                </div>
                <span className="font-mono text-emerald-400 font-bold">{formatCurrency(pendingProductToBip.salePrice)}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsQuickOpenRegisterModalOpen(false);
                  setPendingProductToBip(null);
                  focusBarcodeInput();
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isOpeningRegister}
                onClick={() => handleQuickOpenRegister(0)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isOpeningRegister ? 'Abrindo...' : 'Abrir Caixa (R$ 0) e Continuar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Sale Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        sale={completedSale}
        onClose={() => setIsReceiptOpen(false)}
        onNewSale={() => {
          setIsReceiptOpen(false);
          setCompletedSale(null);
          searchInputRef.current?.focus();
        }}
      />
    </div>
  );
};
