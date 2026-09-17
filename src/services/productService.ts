import { databaseService } from './databaseService';
import { authService } from './authService';
import { Category, Movement, MovementReason, MovementType, Product, ProductLot } from '../types';

export const productService = {
  async getProducts(): Promise<Product[]> {
    const products = await databaseService.getAll<Product>('products');
    return products.sort((a, b) => a.name.localeCompare(b.name));
  },

  async getProductById(id: string): Promise<Product | undefined> {
    return databaseService.getById<Product>('products', id);
  },

  async getProductByBarcodeOrSku(query: string): Promise<Product | undefined> {
    if (!query) return undefined;
    const cleanQuery = query.trim().toLowerCase();
    const digitsOnly = query.replace(/\D/g, '');
    const products = await databaseService.getAll<Product>('products');

    return products.find(p => {
      if (p.status !== 'ativo') return false;

      // 1. Direct match with primary barcode, sku, or name
      if (
        p.barcode?.toLowerCase() === cleanQuery ||
        p.sku?.toLowerCase() === cleanQuery ||
        p.name?.toLowerCase() === cleanQuery
      ) {
        return true;
      }

      // 2. Match with additional barcodes / QR codes (box, fardo, other lot barcodes)
      if (
        p.additionalBarcodes &&
        p.additionalBarcodes.some(b => b && b.toLowerCase() === cleanQuery)
      ) {
        return true;
      }

      // 3. Match with lot barcodes
      if (
        p.lots &&
        p.lots.some(l => l.barcode && l.barcode.toLowerCase() === cleanQuery)
      ) {
        return true;
      }

      // 4. Match digits only (EAN-13, EAN-8, UPC)
      if (digitsOnly.length >= 3) {
        if (p.barcode && p.barcode.replace(/\D/g, '') === digitsOnly) return true;
        if (
          p.additionalBarcodes &&
          p.additionalBarcodes.some(b => b.replace(/\D/g, '') === digitsOnly)
        ) {
          return true;
        }
        if (
          p.lots &&
          p.lots.some(l => l.barcode && l.barcode.replace(/\D/g, '') === digitsOnly)
        ) {
          return true;
        }

        // Stripped leading zeros
        if (digitsOnly.startsWith('0')) {
          const stripped = digitsOnly.replace(/^0+/, '');
          if (stripped.length >= 3) {
            if (p.barcode && p.barcode.replace(/\D/g, '').replace(/^0+/, '') === stripped) return true;
            if (
              p.additionalBarcodes &&
              p.additionalBarcodes.some(b => b.replace(/\D/g, '').replace(/^0+/, '') === stripped)
            ) {
              return true;
            }
          }
        }
      }

      return false;
    });
  },

  async linkBarcodeToProduct(productId: string, newBarcode: string): Promise<Product> {
    const cleanCode = newBarcode.trim();
    if (!cleanCode) throw new Error('Código inválido.');

    const product = await databaseService.getById<Product>('products', productId);
    if (!product) throw new Error('Produto não encontrado.');

    // If it's already the primary barcode or in additional barcodes, no-op
    if (product.barcode === cleanCode || product.additionalBarcodes?.includes(cleanCode)) {
      return product;
    }

    const currentAdditionals = product.additionalBarcodes || [];
    const updatedProduct: Product = {
      ...product,
      additionalBarcodes: [...currentAdditionals, cleanCode],
      updatedAt: new Date().toISOString(),
    };

    await databaseService.save<Product>('products', updatedProduct);
    return updatedProduct;
  },

  async createProduct(
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'currentStock' | 'brand'> & {
      initialStock?: number;
      currentStock?: number;
      brand?: string;
    },
    username: string = 'operador'
  ): Promise<Product> {
    await authService.requireAdmin('cadastrar novos produtos');
    const products = await databaseService.getAll<Product>('products');

    const finalCurrentStock =
      productData.currentStock !== undefined
        ? productData.currentStock
        : (productData.initialStock ?? 0);

    // Validations
    if (productData.costPrice < 0 || productData.salePrice < 0) {
      throw new Error('Preços não podem ser negativos.');
    }
    if (finalCurrentStock < 0 || productData.minStock < 0) {
      throw new Error('Estoque não pode ser negativo.');
    }

    const cleanSku = productData.sku.trim().toUpperCase();
    if (products.some(p => p.sku.trim().toUpperCase() === cleanSku)) {
      throw new Error(`Já existe um produto com o SKU "${productData.sku}".`);
    }

    if (productData.barcode && productData.barcode.trim()) {
      const cleanBarcode = productData.barcode.trim();
      if (products.some(p => p.barcode.trim() === cleanBarcode)) {
        throw new Error(`Já existe um produto com o Código de Barras "${productData.barcode}".`);
      }
    }

    const now = new Date();
    const id = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newProduct: Product = {
      ...productData,
      id,
      sku: cleanSku,
      currentStock: finalCurrentStock,
      barcode: productData.barcode ? productData.barcode.trim() : '',
      brand: productData.brand || '',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await databaseService.save<Product>('products', newProduct);

    // If initial stock is provided, log movement
    if (newProduct.currentStock > 0) {
      const date = now.toISOString().split('T')[0];
      const time = now.toTimeString().split(' ')[0];
      const movement: Movement = {
        id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        productId: newProduct.id,
        productName: newProduct.name,
        productSku: newProduct.sku,
        type: 'ENTRADA',
        quantity: newProduct.currentStock,
        unitCostOrPrice: newProduct.costPrice,
        totalValue: newProduct.currentStock * newProduct.costPrice,
        reason: 'Estoque Inicial',
        user: username,
        date,
        time,
        observation: 'Cadastro do produto com estoque inicial',
      };
      await databaseService.save<Movement>('movements', movement);
    }

    return newProduct;
  },

  async updateProduct(
    id: string,
    updates: Partial<Omit<Product, 'id' | 'createdAt'>>,
    username: string = 'operador'
  ): Promise<Product> {
    await authService.requireAdmin('editar produtos ou alterar preços e estoque');
    const existing = await databaseService.getById<Product>('products', id);
    if (!existing) {
      throw new Error('Produto não encontrado.');
    }

    const products = await databaseService.getAll<Product>('products');

    if (updates.sku) {
      const cleanSku = updates.sku.trim().toUpperCase();
      if (products.some(p => p.id !== id && p.sku.trim().toUpperCase() === cleanSku)) {
        throw new Error(`Já existe outro produto cadastrado com o SKU "${updates.sku}".`);
      }
      updates.sku = cleanSku;
    }

    if (updates.barcode && updates.barcode.trim()) {
      const cleanBarcode = updates.barcode.trim();
      if (products.some(p => p.id !== id && p.barcode.trim() === cleanBarcode)) {
        throw new Error(`Já existe outro produto com o Código de Barras "${updates.barcode}".`);
      }
      updates.barcode = cleanBarcode;
    }

    if (updates.costPrice !== undefined && updates.costPrice < 0) {
      throw new Error('Preço de custo não pode ser negativo.');
    }
    if (updates.salePrice !== undefined && updates.salePrice < 0) {
      throw new Error('Preço de venda não pode ser negativo.');
    }
    if (updates.minStock !== undefined && updates.minStock < 0) {
      throw new Error('Estoque mínimo não pode ser negativo.');
    }

    const updatedProduct: Product = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await databaseService.save<Product>('products', updatedProduct);
    return updatedProduct;
  },

  async deleteProduct(id: string): Promise<void> {
    await authService.requireAdmin('excluir produtos do catálogo');
    const existing = await databaseService.getById<Product>('products', id);
    if (!existing) {
      throw new Error('Produto não encontrado.');
    }
    await databaseService.delete('products', id);
  },

  async registerStockEntry(params: {
    productId: string;
    quantity: number;
    unitCost?: number;
    reason: MovementReason;
    observation?: string;
    username: string;
    supplier?: string;
    lotNumber?: string;
    lotBarcode?: string; // Código de barras / QR Code do lote ou caixa
    expiryDate?: string;
    manufacturingDate?: string;
    boxQuantity?: number;
  }): Promise<{ product: Product; movement: Movement }> {
    await authService.requireAdmin('adicionar mercadorias ou dar entrada no estoque');
    if (params.quantity <= 0) {
      throw new Error('A quantidade de entrada deve ser maior que zero.');
    }

    const product = await databaseService.getById<Product>('products', params.productId);
    if (!product) {
      throw new Error('Produto não encontrado.');
    }

    const unitCost = params.unitCost !== undefined ? params.unitCost : product.costPrice;
    // SOMA O ESTOQUE ANTIGO COM A QUANTIDADE NOVA QUE ENTROU:
    const newStock = product.currentStock + params.quantity;
    const now = new Date();

    // Se o operador informou ou bipou um novo código de barras ou QR code (de lote ou caixa):
    const additionalBarcodes = [...(product.additionalBarcodes || [])];
    const cleanedLotBarcode = params.lotBarcode ? params.lotBarcode.trim() : '';
    if (
      cleanedLotBarcode &&
      product.barcode !== cleanedLotBarcode &&
      !additionalBarcodes.includes(cleanedLotBarcode)
    ) {
      additionalBarcodes.push(cleanedLotBarcode);
    }

    // Se houver dados de lote (número, código ou validade), adiciona ao histórico de lotes:
    const lots = [...(product.lots || [])];
    if (params.lotNumber || cleanedLotBarcode || params.expiryDate) {
      const lotItem: ProductLot = {
        id: `lot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        lotNumber:
          params.lotNumber?.trim() ||
          `LT-${now.getFullYear()}-${Date.now().toString().slice(-4)}`,
        barcode: cleanedLotBarcode || undefined,
        quantity: params.quantity,
        unitCost: unitCost,
        expiryDate: params.expiryDate || undefined,
        manufacturingDate: params.manufacturingDate || undefined,
        supplier: params.supplier || undefined,
        notes: params.observation || undefined,
        createdAt: now.toISOString(),
      };
      lots.push(lotItem);
    }

    const updatedProduct: Product = {
      ...product,
      currentStock: newStock,
      costPrice: unitCost,
      additionalBarcodes,
      lots,
      boxQuantity:
        params.boxQuantity !== undefined && params.boxQuantity > 0
          ? params.boxQuantity
          : product.boxQuantity,
      updatedAt: now.toISOString(),
    };
    await databaseService.save<Product>('products', updatedProduct);

    const movement: Movement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      type: 'ENTRADA',
      quantity: params.quantity,
      unitCostOrPrice: unitCost,
      totalValue: params.quantity * unitCost,
      reason: params.reason,
      user: params.username,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      observation: params.observation,
      supplier: params.supplier,
      lotNumber: params.lotNumber,
      barcodeUsed: cleanedLotBarcode || undefined,
      expiryDate: params.expiryDate,
    };
    await databaseService.save<Movement>('movements', movement);

    return { product: updatedProduct, movement };
  },

  async registerStockExit(params: {
    productId: string;
    quantity: number;
    reason: MovementReason;
    observation?: string;
    username: string;
  }): Promise<{ product: Product; movement: Movement }> {
    await authService.requireAdmin('remover mercadorias ou dar baixa no estoque');
    if (params.quantity <= 0) {
      throw new Error('A quantidade de saída deve ser maior que zero.');
    }

    const product = await databaseService.getById<Product>('products', params.productId);
    if (!product) {
      throw new Error('Produto não encontrado.');
    }

    if (product.currentStock < params.quantity) {
      throw new Error(
        `Estoque insuficiente! Disponível: ${product.currentStock} ${product.unit}, Solicitado: ${params.quantity} ${product.unit}.`
      );
    }

    const newStock = product.currentStock - params.quantity;
    const now = new Date();

    const updatedProduct: Product = {
      ...product,
      currentStock: newStock,
      updatedAt: now.toISOString(),
    };
    await databaseService.save<Product>('products', updatedProduct);

    const movement: Movement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      type: 'SAIDA',
      quantity: params.quantity,
      unitCostOrPrice: product.salePrice,
      totalValue: params.quantity * product.salePrice,
      reason: params.reason,
      user: params.username,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      observation: params.observation,
    };
    await databaseService.save<Movement>('movements', movement);

    return { product: updatedProduct, movement };
  },

  async registerMovement(params: {
    productId: string;
    type: 'ENTRADA' | 'SAIDA';
    quantity: number;
    unitPrice?: number;
    reason: string;
    supplier?: string;
    notes?: string;
    user: string;
    lotNumber?: string;
    lotBarcode?: string;
    expiryDate?: string;
    manufacturingDate?: string;
    boxQuantity?: number;
  }): Promise<{ product: Product; movement: Movement }> {
    if (params.type === 'ENTRADA') {
      const obs = [params.notes, params.supplier ? `Fornecedor: ${params.supplier}` : null]
        .filter(Boolean)
        .join(' - ');
      return this.registerStockEntry({
        productId: params.productId,
        quantity: params.quantity,
        unitCost: params.unitPrice,
        reason: params.reason as MovementReason,
        observation: obs || undefined,
        username: params.user,
        supplier: params.supplier,
        lotNumber: params.lotNumber,
        lotBarcode: params.lotBarcode,
        expiryDate: params.expiryDate,
        manufacturingDate: params.manufacturingDate,
        boxQuantity: params.boxQuantity,
      });
    } else {
      return this.registerStockExit({
        productId: params.productId,
        quantity: params.quantity,
        reason: params.reason as MovementReason,
        observation: params.notes,
        username: params.user,
      });
    }
  },

  async getMovements(): Promise<Movement[]> {
    const movements = await databaseService.getAll<Movement>('movements');
    return movements.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  },

  async getCategories(): Promise<Category[]> {
    const categories = await databaseService.getAll<Category>('categories');
    return categories.sort((a, b) => a.name.localeCompare(b.name));
  },

  async saveCategory(name: string, description?: string): Promise<Category> {
    const cleanName = name.trim();
    if (!cleanName) throw new Error('O nome da categoria é obrigatório.');

    const categories = await this.getCategories();
    if (categories.some(c => c.name.toLowerCase() === cleanName.toLowerCase())) {
      throw new Error('Já existe uma categoria com este nome.');
    }

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: cleanName,
      description: description?.trim(),
      createdAt: new Date().toISOString(),
    };
    await databaseService.save<Category>('categories', newCat);
    return newCat;
  },

  async createCategory(name: string, description?: string): Promise<Category> {
    return this.saveCategory(name, description);
  },

  async updateCategory(id: string, name: string, description?: string): Promise<Category> {
    const cleanName = name.trim();
    if (!cleanName) throw new Error('O nome da categoria é obrigatório.');

    const existing = await databaseService.getById<Category>('categories', id);
    if (!existing) throw new Error('Categoria não encontrada.');

    const categories = await this.getCategories();
    if (categories.some(c => c.id !== id && c.name.toLowerCase() === cleanName.toLowerCase())) {
      throw new Error('Já existe outra categoria com este nome.');
    }

    const updated: Category = {
      ...existing,
      name: cleanName,
      description: description?.trim(),
    };
    await databaseService.save<Category>('categories', updated);
    return updated;
  },

  async deleteCategory(id: string): Promise<void> {
    const products = await databaseService.getAll<Product>('products');
    const hasProducts = products.some(p => p.categoryId === id);
    if (hasProducts) {
      throw new Error('Não é possível excluir esta categoria porque há produtos vinculados a ela.');
    }
    await databaseService.delete('categories', id);
  },
};
