import React, { useEffect, useState } from 'react';
import { MinusCircle, Search, Package, AlertTriangle } from 'lucide-react';
import { productService } from '../services/productService';
import { Product } from '../types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { PageId } from '../layouts/MainLayout';

interface StockOutPageProps {
  onNavigate: (page: PageId) => void;
}

export const StockOutPage: React.FC<StockOutPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { formatCurrency, showToast } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('Avaria');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    productService.getProducts().then(prods => {
      setProducts(prods);
      const available = prods.find(p => p.currentStock > 0);
      if (available) {
        setSelectedProduct(available);
      }
    });
  }, []);

  const filteredProducts = products.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      showToast('Selecione um produto para dar baixa.', 'error');
      return;
    }
    if (quantity <= 0) {
      showToast('A quantidade deve ser maior que zero.', 'error');
      return;
    }
    if (quantity > selectedProduct.currentStock) {
      showToast(
        `Quantidade excede o estoque atual! Disponível: ${selectedProduct.currentStock} ${selectedProduct.unit}`,
        'error'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await productService.registerMovement({
        productId: selectedProduct.id,
        type: 'SAIDA',
        quantity,
        unitPrice: selectedProduct.costPrice,
        reason,
        notes: notes.trim() || undefined,
        user: user?.name || user?.username || 'operador',
      });

      showToast(
        `Saída de ${quantity} ${selectedProduct.unit} de "${selectedProduct.name}" registrada!`,
        'success'
      );
      window.dispatchEvent(new CustomEvent('estoque_data_changed'));
      onNavigate('movimentacoes');
    } catch (err) {
      showToast((err as Error).message || 'Erro ao registrar saída.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <MinusCircle className="w-6 h-6 text-rose-400" />
          <span>Registrar Saída de Estoque (Baixa)</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-400">
          Dê baixa manual de itens danificados, avariados, vencidos ou para consumo interno.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        {/* Product Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Selecione o Produto *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome, SKU ou código..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="max-h-48 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800/80">
            {filteredProducts.slice(0, 15).map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition ${
                  selectedProduct?.id === p.id
                    ? 'bg-rose-600/20 text-rose-300 border-l-4 border-rose-500'
                    : 'hover:bg-slate-900 text-slate-300'
                }`}
              >
                <div>
                  <span className="font-semibold text-white">{p.name}</span>
                  <span className="text-slate-500 ml-2 font-mono">SKU: {p.sku}</span>
                </div>
                <div className="font-mono text-slate-400">
                  Estoque: <strong className={p.currentStock > 0 ? 'text-slate-200' : 'text-rose-400'}>{p.currentStock} {p.unit}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedProduct && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{selectedProduct.name}</h4>
                <p className="text-xs text-slate-400">
                  Estoque Atual: <strong className="text-slate-200">{selectedProduct.currentStock} {selectedProduct.unit}</strong> | SKU: {selectedProduct.sku}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Estoque Após a Saída</p>
              <p className="text-base font-bold text-rose-400 font-mono">
                {Math.max(0, selectedProduct.currentStock - (quantity || 0))} {selectedProduct.unit}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Quantidade a Retirar *
              </label>
              <input
                type="number"
                min="1"
                max={selectedProduct?.currentStock || 1}
                required
                value={quantity || ''}
                onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-base font-bold font-mono text-white focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Motivo da Saída *
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-rose-500"
              >
                <option value="Avaria">Avaria / Quebra</option>
                <option value="Vencimento">Vencimento / Validade Expirada</option>
                <option value="Perda">Perda / Extravio / Furto</option>
                <option value="Consumo Interno">Consumo Interno da Empresa</option>
                <option value="Ajuste de Estoque">Ajuste de Inventário</option>
                <option value="Doação">Doação / Amostra</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Observações / Justificativa
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Descreva detalhes sobre a avaria ou destino do produto..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-rose-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('produtos')}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedProduct || selectedProduct.currentStock <= 0}
              className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-rose-600/20 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Gravando Saída...' : 'Confirmar Saída (Baixa)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
