import React, { useEffect, useRef, useState } from 'react';
import {
  PlusCircle,
  Barcode,
  Search,
  CheckCircle,
  Package,
  Boxes,
  QrCode,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Camera,
  AlertTriangle,
  History,
  Link,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { productService } from '../services/productService';
import { Product, ProductLot } from '../types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { BarcodeScannerModal } from '../components/common/BarcodeScannerModal';
import { PageId } from '../layouts/MainLayout';

interface StockInPageProps {
  onNavigate: (page: PageId) => void;
}

export const StockInPage: React.FC<StockInPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { formatCurrency, showToast, playBeep } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Scanner State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);
  const [unknownScannedCode, setUnknownScannedCode] = useState<string | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Entry Mode (Caixa ou Unidades Avulsas)
  const [entryMode, setEntryMode] = useState<'box' | 'unit'>('box');
  const [boxCount, setBoxCount] = useState<number>(1);
  const [boxUnits, setBoxUnits] = useState<number>(24);
  const [unitQuantity, setUnitQuantity] = useState<number>(24);
  const [saveBoxQuantityDefault, setSaveBoxQuantityDefault] = useState<boolean>(true);

  // Pricing & Details
  const [unitCost, setUnitCost] = useState<number>(0);
  const [reason, setReason] = useState<string>('Compra');
  const [supplier, setSupplier] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Lot & Multi-Barcode Information (O novo lote / QR code / código da caixa)
  const [lotNumber, setLotNumber] = useState<string>('');
  const [lotBarcode, setLotBarcode] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [manufacturingDate, setManufacturingDate] = useState<string>('');
  const [isLotSectionOpen, setIsLotSectionOpen] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load catalog
  const loadProducts = async () => {
    const prods = await productService.getProducts();
    setProducts(prods);
    if (prods.length > 0 && !selectedProduct) {
      handleSelectProduct(prods[0]);
    }
  };

  useEffect(() => {
    loadProducts();
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  }, []);

  // When product is selected
  const handleSelectProduct = (product: Product, customBarcode?: string) => {
    setSelectedProduct(product);
    setUnitCost(product.costPrice || 0);

    // If product has a predefined box quantity, set it
    const defaultBoxUnits = product.boxQuantity && product.boxQuantity > 0 ? product.boxQuantity : 24;
    setBoxUnits(defaultBoxUnits);
    setBoxCount(1);
    setUnitQuantity(defaultBoxUnits);

    // Auto-generate suggested lot number if empty
    const now = new Date();
    const suggestedLot = `LT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;
    setLotNumber(suggestedLot);

    if (customBarcode) {
      setLotBarcode(customBarcode);
      setScannedFeedback(`Código/QR Code "${customBarcode}" pronto para ser vinculado a "${product.name}".`);
    } else {
      setLotBarcode('');
    }

    setUnknownScannedCode(null);
  };

  // Calculate final quantity entering
  const finalQuantity = entryMode === 'box' ? (boxCount || 0) * (boxUnits || 0) : (unitQuantity || 0);
  const totalValue = Number((finalQuantity * unitCost).toFixed(2));

  // Current stock and newly calculated combined stock
  const currentStock = selectedProduct ? selectedProduct.currentStock : 0;
  const newProjectedStock = currentStock + finalQuantity;

  // Handle Barcode Scan (via Gun or typed)
  const handleBarcodeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    processScannedCode(code);
    setBarcodeInput('');
  };

  const processScannedCode = async (code: string) => {
    try {
      playBeep();
    } catch {
      // Audio beep
    }

    const found = await productService.getProductByBarcodeOrSku(code);

    if (found) {
      // Product recognized!
      handleSelectProduct(found);
      setScannedFeedback(`Produto localizado via bip: "${found.name}" (Estoque atual: ${found.currentStock} ${found.unit})`);
      setUnknownScannedCode(null);
      showToast(`Produto "${found.name}" selecionado via bip!`, 'success');
    } else {
      // Barcode / QR Code NOT recognized yet!
      // This is the key case: a new lot or box has arrived with its own barcode/QR code!
      setUnknownScannedCode(code);
      setLotBarcode(code);
      setScannedFeedback(`Código novo detectado (${code}). Escolha o produto correspondente para vincular e somar ao estoque.`);
      showToast(`Novo código detectado (${code}). Selecione o produto para vinculá-lo.`, 'info');
    }
  };

  // Filtered products list for search
  const filteredProducts = products.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesAdditional = p.additionalBarcodes?.some(b => b.toLowerCase().includes(q));
    const matchesLot = p.lots?.some(l => l.lotNumber.toLowerCase().includes(q) || (l.barcode && l.barcode.toLowerCase().includes(q)));
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      matchesAdditional ||
      matchesLot
    );
  });

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      showToast('Selecione um produto para dar entrada.', 'error');
      return;
    }
    if (finalQuantity <= 0) {
      showToast('A quantidade a adicionar deve ser maior que zero.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await productService.registerStockEntry({
        productId: selectedProduct.id,
        quantity: finalQuantity,
        unitCost,
        reason: reason as any,
        observation: notes.trim() || undefined,
        username: user?.name || user?.username || 'Administrador',
        supplier: supplier.trim() || undefined,
        lotNumber: lotNumber.trim() || undefined,
        lotBarcode: lotBarcode.trim() || undefined,
        expiryDate: expiryDate.trim() || undefined,
        manufacturingDate: manufacturingDate.trim() || undefined,
        boxQuantity: entryMode === 'box' && saveBoxQuantityDefault ? boxUnits : undefined,
      });

      const previousStock = selectedProduct.currentStock;
      const updatedStock = result.product.currentStock;

      showToast(
        `Entrada de +${finalQuantity} ${selectedProduct.unit} confirmada! Estoque antigo (${previousStock}) somado com a nova remessa = ${updatedStock} ${selectedProduct.unit}.`,
        'success'
      );

      // Trigger global event
      window.dispatchEvent(new CustomEvent('estoque_data_changed'));

      // Reload local product data
      await loadProducts();
      setSelectedProduct(result.product);

      // Reset form fields for next entry
      setLotBarcode('');
      setUnknownScannedCode(null);
      setScannedFeedback(null);
      setBarcodeInput('');
      barcodeInputRef.current?.focus();
    } catch (err) {
      showToast((err as Error).message || 'Erro ao registrar entrada no estoque.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <PlusCircle className="w-6 h-6 text-emerald-400" />
            <span>Entrada de Estoque & Novos Lotes</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Dê entrada por caixa de 24 un ou avulsos, bipe novos códigos de barras/QR Code de lotes e some tudo ao estoque antigo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('movimentacoes')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
        >
          <History className="w-4 h-4 text-blue-400" />
          <span>Ver Histórico de Entradas</span>
        </button>
      </div>

      {/* 1. SMART BARCODE SCANNER SECTION (BIP COM O LEITOR) */}
      <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border border-blue-500/30 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs md:text-sm font-bold text-blue-400 uppercase tracking-wide">
            <Barcode className="w-5 h-5 text-blue-400" />
            <span>Leitor de Código de Barras / QR Code da Caixa ou Produto</span>
          </label>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Bipe com o leitor físico ou câmera</span>
          </span>
        </div>

        <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Barcode className="w-5 h-5" />
            </div>
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              placeholder="Passe o leitor de código de barras ou digite o código/QR Code da caixa..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-inner"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs md:text-sm font-bold shadow-md shadow-blue-600/20 transition cursor-pointer active:scale-98 shrink-0"
          >
            Bipar Código
          </button>

          <button
            type="button"
            onClick={() => setIsCameraScannerOpen(true)}
            className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer shrink-0"
            title="Escanear com a câmera do celular ou notebook"
          >
            <Camera className="w-5 h-5 text-blue-400" />
          </button>
        </form>

        {/* Scanner Feedback Message */}
        {scannedFeedback && (
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{scannedFeedback}</span>
          </div>
        )}

        {/* ALERT: NEW UNREGISTERED BARCODE DETECTED */}
        {unknownScannedCode && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-start gap-2.5 text-amber-300 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-200">
                  Novo Código de Barras / QR Code detectado: <span className="font-mono bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30 text-white">{unknownScannedCode}</span>
                </p>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  Este código pertence a um lote ou caixa de um produto já cadastrado? Selecione o produto na lista abaixo para vincular. Na hora da confirmação, este novo código será automaticamente salvo no produto e o estoque novo será somado ao antigo!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. PRODUCT SELECTION & SEARCH */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            1. Selecione o Produto para dar Entrada
          </label>
          <span className="text-xs text-slate-400 font-mono">
            {filteredProducts.length} produto(s)
          </span>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Pesquisar por nome do produto (ex: Lubrificante 20W50), SKU ou código..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
          />
        </div>

        {/* Quick select list */}
        <div className="max-h-48 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800/60">
          {filteredProducts.slice(0, 10).map(p => {
            const isSelected = selectedProduct?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => handleSelectProduct(p, unknownScannedCode || undefined)}
                className={`p-3 flex items-center justify-between text-xs cursor-pointer transition ${
                  isSelected
                    ? 'bg-blue-600/20 text-blue-200 border-l-4 border-blue-500'
                    : 'hover:bg-slate-900/80 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{p.name}</div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>SKU: <strong className="font-mono text-slate-300">{p.sku}</strong></span>
                      <span>•</span>
                      <span>Código: <strong className="font-mono text-slate-300">{p.barcode || 'Sem código'}</strong></span>
                      {p.additionalBarcodes && p.additionalBarcodes.length > 0 && (
                        <span className="text-blue-400 font-semibold">
                          (+{p.additionalBarcodes.length} outros códigos)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-slate-400 text-[11px]">Estoque Atual:</div>
                  <div className="font-mono font-bold text-emerald-400 text-sm">
                    {p.currentStock} {p.unit}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. SELECTED PRODUCT SPOTLIGHT & STOCK SUM VISUALIZER */}
      {selectedProduct && (
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 space-y-5">
          {/* Product Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Produto Selecionado
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">{selectedProduct.name}</h3>
                <p className="text-xs text-slate-400">
                  SKU: <span className="font-mono text-slate-200">{selectedProduct.sku}</span> | Unidade: <span className="font-bold text-slate-200">{selectedProduct.unit}</span>
                </p>
              </div>
            </div>

            {/* Existing Barcodes Badge */}
            <div className="flex flex-wrap items-center gap-1.5 text-right">
              <div className="text-[11px] text-slate-400 w-full text-left sm:text-right">
                Códigos de Busca Vinculados:
              </div>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
                Principal: {selectedProduct.barcode || 'Nenhum'}
              </span>
              {selectedProduct.additionalBarcodes?.map((code, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 font-mono text-[11px] border border-blue-500/30" title="Código adicional / lote">
                  {code}
                </span>
              ))}
            </div>
          </div>

          {/* SOMA DO ESTOQUE MATEMÁTICO (CRUCIAL USER REQUEST) */}
          <div className="p-4 rounded-xl bg-slate-950 border-2 border-emerald-500/40 shadow-inner">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Consolidação e Soma do Estoque (Antigo + Nova Entrada)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              {/* Estoque Antigo */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block mb-1">Estoque Anterior (Antigo)</span>
                <span className="text-xl md:text-2xl font-bold font-mono text-slate-200">
                  {currentStock} <span className="text-xs font-normal text-slate-400">{selectedProduct.unit}</span>
                </span>
              </div>

              {/* Mais (+) Nova Entrada */}
              <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-500/30 text-center relative">
                <span className="text-[11px] text-blue-300 block mb-1">
                  + Nova Remessa ({entryMode === 'box' ? `${boxCount} cx × ${boxUnits} un` : 'Avulso'})
                </span>
                <span className="text-xl md:text-2xl font-bold font-mono text-blue-400">
                  +{finalQuantity} <span className="text-xs font-normal text-blue-300">{selectedProduct.unit}</span>
                </span>
              </div>

              {/* Total Consolidado */}
              <div className="p-3 rounded-lg bg-emerald-950/50 border-2 border-emerald-500/60 text-center">
                <span className="text-[11px] text-emerald-300 font-bold block mb-1">
                  = Novo Estoque Total Consolidado
                </span>
                <span className="text-2xl md:text-3xl font-black font-mono text-emerald-400">
                  {newProjectedStock} <span className="text-xs font-normal text-emerald-300">{selectedProduct.unit}</span>
                </span>
              </div>
            </div>

            <div className="mt-2.5 text-[11px] text-slate-400 text-center">
              Ao confirmar a entrada, o sistema soma automaticamente o saldo anterior com as mercadorias que acabaram de chegar.
            </div>
          </div>

          {/* 4. ENTRY FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Mode selection: Por Caixa ou Por Unidade */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                2. Como deseja lançar a quantidade?
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEntryMode('box')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs md:text-sm font-bold transition cursor-pointer ${
                    entryMode === 'box'
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Boxes className="w-4 h-4" />
                  <span>Por Caixa / Embalagem (Ex: 24 un)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEntryMode('unit');
                    setUnitQuantity(finalQuantity || 24);
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs md:text-sm font-bold transition cursor-pointer ${
                    entryMode === 'unit'
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Por Unidades Avulsas</span>
                </button>
              </div>
            </div>

            {/* Inputs based on mode */}
            {entryMode === 'box' ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Quantas Caixas chegaram? *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={boxCount || ''}
                      onChange={e => setBoxCount(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-lg font-bold font-mono text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Unidades por Caixa *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={boxUnits || ''}
                      onChange={e => setBoxUnits(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-lg font-bold font-mono text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/20 flex flex-col justify-center">
                    <span className="text-[11px] text-blue-300">Total de Unidades a Entrar:</span>
                    <span className="text-xl font-bold font-mono text-blue-400">
                      {boxCount * boxUnits} {selectedProduct.unit}
                    </span>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={saveBoxQuantityDefault}
                    onChange={e => setSaveBoxQuantityDefault(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>Salvar {boxUnits} unidades como padrão de caixa para o produto "{selectedProduct.name}"</span>
                </label>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Quantidade Total de Unidades a Adicionar *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={unitQuantity || ''}
                  onChange={e => setUnitQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xl font-bold font-mono text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>
            )}

            {/* 5. DADOS DO LOTE & NOVO CÓDIGO DE BARRAS / QR CODE */}
            <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsLotSectionOpen(!isLotSectionOpen)}
                className="w-full p-3.5 flex items-center justify-between text-left bg-slate-900/60 hover:bg-slate-900 transition"
              >
                <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-white">
                  <QrCode className="w-4 h-4 text-blue-400" />
                  <span>3. Identificação do Lote & Código de Barras Adicional / QR Code</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold">
                  <span>{isLotSectionOpen ? 'Recolher' : 'Expandir'}</span>
                  {isLotSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isLotSectionOpen && (
                <div className="p-4 space-y-4 border-t border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Código de barras ou QR Code da nova remessa/caixa */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Barcode className="w-3.5 h-3.5 text-blue-400" />
                          <span>Código de Barras / QR Code desta Caixa/Lote</span>
                        </label>
                        {unknownScannedCode && (
                          <span className="text-[10px] text-emerald-400 font-bold">
                            Detectado via bip!
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={lotBarcode}
                        onChange={e => setLotBarcode(e.target.value)}
                        placeholder="Ex: 7891234567890 ou QR Code da caixa"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs md:text-sm font-mono text-white focus:outline-hidden focus:border-blue-500"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Se este lote ou caixa veio com outro código ou QR code, ele será adicionado aos códigos do produto.
                      </p>
                    </div>

                    {/* Número do Lote */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Número / Identificador do Lote
                      </label>
                      <input
                        type="text"
                        value={lotNumber}
                        onChange={e => setLotNumber(e.target.value)}
                        placeholder="Ex: LOTE-2026/09-A"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs md:text-sm font-mono text-white focus:outline-hidden focus:border-blue-500"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Número impresso na embalagem ou nota fiscal para controle de rastreabilidade.
                      </p>
                    </div>

                    {/* Validade */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Data de Validade (Opcional)
                      </label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={e => setExpiryDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs md:text-sm text-white focus:outline-hidden focus:border-blue-500"
                      />
                    </div>

                    {/* Fabricação */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Data de Fabricação (Opcional)
                      </label>
                      <input
                        type="date"
                        value={manufacturingDate}
                        onChange={e => setManufacturingDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs md:text-sm text-white focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 6. VALORES E INFORMAÇÕES FINANCEIRAS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Preço de Custo Unitário (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={unitCost || ''}
                  onChange={e => setUnitCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-base font-bold font-mono text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motivo da Entrada
                </label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs md:text-sm text-white focus:outline-hidden focus:border-blue-500"
                >
                  <option value="Compra">Compra / Reposição de Fornecedor</option>
                  <option value="Devolução">Devolução de Cliente</option>
                  <option value="Ajuste de Estoque">Ajuste de Estoque / Inventário</option>
                  <option value="Produção">Produção Própria</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Fornecedor (Opcional)
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  placeholder="Ex: Distribuidora Ipiranga / Mobil"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs md:text-sm text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Observações / Número da Nota Fiscal
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: NF-e 12948, entregue pela transportadora, lote em perfeito estado..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs md:text-sm text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Total Financial Summary */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2">
              <div className="text-xs text-slate-400">
                Resumo da Entrada: <strong className="text-white">{finalQuantity} {selectedProduct.unit}</strong> a <strong className="text-white">{formatCurrency(unitCost)}/un</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Custo Total:</span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {formatCurrency(totalValue)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('produtos')}
                className="flex-1 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition cursor-pointer"
              >
                Voltar aos Produtos
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedProduct || finalQuantity <= 0}
                className="flex-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-sm md:text-base shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-5 h-5" />
                <span>
                  {isSubmitting
                    ? 'Gravando Entrada e Somando Estoque...'
                    : `Confirmar Entrada (+${finalQuantity} ${selectedProduct.unit}) e Somar ao Estoque`}
                </span>
              </button>
            </div>
          </form>

          {/* LOT HISTORY FOR THIS PRODUCT (IF ANY) */}
          {selectedProduct.lots && selectedProduct.lots.length > 0 && (
            <div className="pt-4 border-t border-slate-800/80 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Histórico de Lotes Anteriores Deste Produto ({selectedProduct.lots.length})</span>
              </h4>
              <div className="max-h-36 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800/60 text-xs">
                {selectedProduct.lots.slice().reverse().map(l => (
                  <div key={l.id} className="p-2.5 flex items-center justify-between text-slate-300">
                    <div>
                      <span className="font-mono font-bold text-white mr-2">{l.lotNumber}</span>
                      {l.barcode && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/20 mr-2">
                          Código: {l.barcode}
                        </span>
                      )}
                      {l.expiryDate && (
                        <span className="text-[10px] text-slate-400">Validade: {l.expiryDate}</span>
                      )}
                    </div>
                    <div className="font-mono text-emerald-400 font-bold">
                      +{l.quantity} {selectedProduct.unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Camera Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={code => {
          setIsCameraScannerOpen(false);
          processScannedCode(code);
        }}
      />
    </div>
  );
};
