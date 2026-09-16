import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Filter,
  Download,
  Barcode,
  FolderPlus,
  ArrowUpDown,
  Tag,
  AlertTriangle,
  X,
  Check,
} from 'lucide-react';
import { productService } from '../services/productService';
import { backupService } from '../services/backupService';
import { Category, Product, ProductUnit } from '../types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { PageId } from '../layouts/MainLayout';

interface ProductsPageProps {
  onNavigate?: (page: PageId) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = () => {
  const { hasPermission } = useAuth();
  const { formatCurrency, showToast } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [loading, setLoading] = useState(true);

  // Product Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Category Modal Form
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [profitMargin, setProfitMargin] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(5);
  const [unit, setUnit] = useState<ProductUnit>('UN');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, cats] = await Promise.all([
        productService.getProducts(),
        productService.getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (e) {
      console.error('Error loading products:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewProductModal = () => {
    setEditingProduct(null);
    setName('');
    const randomSku = `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
    setSku(randomSku);
    setBarcode(`789${Math.floor(1000000000 + Math.random() * 9000000000)}`);
    setCategoryId(categories[0]?.id || '');
    setCostPrice(0);
    setSalePrice(0);
    setProfitMargin(0);
    setCurrentStock(0);
    setMinStock(5);
    setUnit('UN');
    setLocation('');
    setNotes('');
    setStatus('ativo');
    setIsModalOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setSku(product.sku);
    setBarcode(product.barcode);
    setCategoryId(product.categoryId);
    setCostPrice(product.costPrice);
    setSalePrice(product.salePrice);
    const safeMargin =
      product.profitMargin !== undefined
        ? product.profitMargin
        : product.costPrice > 0
        ? Number((((product.salePrice - product.costPrice) / product.costPrice) * 100).toFixed(2))
        : 0;
    setProfitMargin(safeMargin);
    setCurrentStock(product.currentStock);
    setMinStock(product.minStock);
    setUnit(product.unit);
    setLocation(product.location || '');
    setNotes(product.notes || '');
    setStatus(product.status);
    setIsModalOpen(true);
  };

  // Profit Margin calculations
  const handleCostPriceChange = (val: number) => {
    setCostPrice(val);
    if (profitMargin > 0) {
      const calculatedSale = Number((val * (1 + profitMargin / 100)).toFixed(2));
      setSalePrice(calculatedSale);
    } else if (val > 0 && salePrice > 0) {
      const margin = Number((((salePrice - val) / val) * 100).toFixed(2));
      setProfitMargin(margin);
    }
  };

  const handleSalePriceChange = (val: number) => {
    setSalePrice(val);
    if (costPrice > 0) {
      const margin = Number((((val - costPrice) / costPrice) * 100).toFixed(2));
      setProfitMargin(margin);
    }
  };

  const handleMarginChange = (val: number) => {
    setProfitMargin(val);
    if (costPrice > 0) {
      const calculatedSale = Number((costPrice * (1 + val / 100)).toFixed(2));
      setSalePrice(calculatedSale);
    }
  };

  const generateRandomBarcode = () => {
    setBarcode(`789${Math.floor(1000000000 + Math.random() * 9000000000)}`);
  };

  const generateRandomSku = () => {
    setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('O nome do produto é obrigatório.', 'error');
      return;
    }
    if (!sku.trim()) {
      showToast('O código SKU é obrigatório.', 'error');
      return;
    }

    try {
      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, {
          name,
          sku,
          barcode,
          categoryId,
          costPrice,
          salePrice,
          profitMargin,
          minStock,
          unit,
          location,
          notes,
          status,
        });
        showToast('Produto atualizado com sucesso!', 'success');
      } else {
        await productService.createProduct({
          name,
          sku,
          barcode,
          categoryId,
          costPrice,
          salePrice,
          profitMargin,
          initialStock: currentStock,
          minStock,
          unit,
          location,
          notes,
          status,
        });
        showToast('Produto cadastrado com sucesso!', 'success');
      }

      setIsModalOpen(false);
      await loadData();
      window.dispatchEvent(new CustomEvent('estoque_data_changed'));
    } catch (err) {
      showToast((err as Error).message || 'Erro ao salvar produto.', 'error');
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`)) {
      try {
        await productService.deleteProduct(product.id);
        showToast('Produto excluído com sucesso.', 'success');
        await loadData();
        window.dispatchEvent(new CustomEvent('estoque_data_changed'));
      } catch (err) {
        showToast((err as Error).message || 'Erro ao excluir.', 'error');
      }
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await productService.createCategory(newCategoryName.trim());
      setNewCategoryName('');
      const updatedCats = await productService.getCategories();
      setCategories(updatedCats);
      showToast('Categoria adicionada!', 'success');
    } catch (err) {
      showToast((err as Error).message || 'Erro ao criar categoria.', 'error');
    }
  };

  const handleDeleteCategory = async (id: string, catName: string) => {
    if (confirm(`Excluir a categoria "${catName}"?`)) {
      try {
        await productService.deleteCategory(id);
        const updatedCats = await productService.getCategories();
        setCategories(updatedCats);
        showToast('Categoria excluída.', 'success');
      } catch (err) {
        showToast((err as Error).message || 'Erro ao excluir categoria.', 'error');
      }
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Nome',
      'SKU',
      'Código de Barras',
      'Categoria',
      'Estoque Atual',
      'Estoque Mínimo',
      'Unidade',
      'Preço de Custo',
      'Preço de Venda',
      'Margem (%)',
      'Status',
    ];

    const rows = products.map(p => {
      const cat = categories.find(c => c.id === p.categoryId)?.name || 'Sem Categoria';
      const margin =
        p.profitMargin !== undefined && p.profitMargin !== null
          ? p.profitMargin
          : p.costPrice > 0
          ? ((p.salePrice - p.costPrice) / p.costPrice) * 100
          : 0;
      return [
        p.id,
        p.name,
        p.sku,
        p.barcode || '',
        cat,
        p.currentStock,
        p.minStock,
        p.unit,
        (p.costPrice || 0).toFixed(2),
        (p.salePrice || 0).toFixed(2),
        (margin || 0).toFixed(2),
        p.status,
      ];
    });

    backupService.exportCSV('produtos_estoque_pro.csv', [headers, ...rows]);
    showToast('Planilha CSV de produtos exportada!', 'success');
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
    if (stockFilter === 'low' && (p.currentStock > p.minStock || p.currentStock <= 0)) return false;
    if (stockFilter === 'out' && p.currentStock > 0) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Catálogo de Produtos
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Cadastre, edite e acompanhe os níveis de estoque do seu negócio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs md:text-sm font-medium border border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs md:text-sm font-medium border border-slate-700 transition"
          >
            <Tag className="w-4 h-4 text-indigo-400" />
            <span>Categorias</span>
          </button>

          {hasPermission('criar_produtos') && (
            <button
              onClick={openNewProductModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs md:text-sm font-semibold shadow-md shadow-blue-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Produto</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nome, SKU ou código..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs md:text-sm text-white focus:outline-hidden focus:border-blue-500"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap w-full md:w-auto items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Categoria:</span>
          </div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs md:text-sm text-white focus:outline-hidden"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={e => setStockFilter(e.target.value as 'all' | 'low' | 'out')}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs md:text-sm text-white focus:outline-hidden"
          >
            <option value="all">Todos os Estoques</option>
            <option value="low">Estoque Baixo</option>
            <option value="out">Sem Estoque (Zerados)</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Produto</th>
                <th className="px-4 py-3.5">SKU / Código</th>
                <th className="px-4 py-3.5">Categoria</th>
                <th className="px-4 py-3.5 text-right">Estoque</th>
                <th className="px-4 py-3.5 text-right">Preço Venda</th>
                <th className="px-4 py-3.5 text-right">Preço Custo</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => {
                  const categoryName =
                    categories.find(c => c.id === product.categoryId)?.name || 'Sem Categoria';
                  const isOutOfStock = product.currentStock <= 0;
                  const isLowStock = !isOutOfStock && product.currentStock <= product.minStock;

                  return (
                    <tr key={product.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{product.name}</div>
                        {product.location && (
                          <span className="text-[11px] text-slate-500">Loc: {product.location}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">
                        <div>{product.sku}</div>
                        <div className="text-[10px] text-slate-500">{product.barcode}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{categoryName}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-full text-xs ${
                            isOutOfStock
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : isLowStock
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {product.currentStock} {product.unit}
                        </span>
                        <div className="text-[10px] text-slate-500">Mín: {product.minStock}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-white">
                        {formatCurrency(product.salePrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-400">
                        {formatCurrency(product.costPrice)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            product.status === 'ativo'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {product.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {hasPermission('editar_produtos') && (
                            <button
                              onClick={() => openEditProductModal(product)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('excluir_produtos') && (
                            <button
                              onClick={() => handleDeleteProduct(product)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500 text-xs">
                    Nenhum produto cadastrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-400" />
                <span>{editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Coca-Cola Lata 350ml"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* SKU */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-300">Código SKU *</label>
                    <button
                      type="button"
                      onClick={generateRandomSku}
                      className="text-[10px] text-blue-400 hover:underline"
                    >
                      Gerar automático
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    placeholder="Ex: SKU-1001"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Barcode */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-300">Código de Barras</label>
                    <button
                      type="button"
                      onClick={generateRandomBarcode}
                      className="text-[10px] text-blue-400 hover:underline"
                    >
                      Gerar código EAN
                    </button>
                  </div>
                  <input
                    type="text"
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    placeholder="Ex: 7891000100101"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="">Selecione uma categoria...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Unidade de Medida
                  </label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value as ProductUnit)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="UN">Unidade (UN)</option>
                    <option value="KG">Quilograma (KG)</option>
                    <option value="L">Litro (L)</option>
                    <option value="CX">Caixa (CX)</option>
                    <option value="M">Metro (M)</option>
                    <option value="PCT">Pacote (PCT)</option>
                  </select>
                </div>

                {/* Cost Price */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Preço de Custo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice || ''}
                    onChange={e => handleCostPriceChange(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Profit Margin */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Margem de Lucro (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={profitMargin || ''}
                    onChange={e => handleMarginChange(parseFloat(e.target.value) || 0)}
                    placeholder="50"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Sale Price */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Preço de Venda Final (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={salePrice || ''}
                    onChange={e => handleSalePriceChange(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-base font-bold font-mono text-emerald-400 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Initial Stock (Only for new product) */}
                {!editingProduct && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Estoque Inicial
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={currentStock || ''}
                      onChange={e => setCurrentStock(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Min Stock */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Estoque Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minStock || ''}
                    onChange={e => setMinStock(parseInt(e.target.value) || 0)}
                    placeholder="5"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Localização no Estoque (Prateleira/Gôndola)
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Ex: Corredor B, Prateleira 2"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as 'ativo' | 'inativo')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Informações adicionais sobre o produto..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition"
                >
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-400" />
                <span>Gerenciar Categorias</span>
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleCreateCategory} className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="Nome da nova categoria..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs md:text-sm text-white focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
              >
                Adicionar
              </button>
            </form>

            {/* Existing Categories List */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 pt-2">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs"
                >
                  <span className="font-medium text-slate-200">{cat.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                    title="Excluir Categoria"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
            >
              Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
