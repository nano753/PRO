import { databaseService } from './databaseService';
import { Category, Movement, MovementReason, MovementType, Product } from '../types';

export const productService = {
  async getProducts(): Promise<Product[]> {
    const products = await databaseService.getAll<Product>('products');
    return products.sort((a, b) => a.name.localeCompare(b.name));
  },

  async getProductById(id: string): Promise<Product | undefined> {
    return databaseService.getById<Product>('products', id);
  },

  async getProductByBarcodeOrSku(query: string): Promise<Product | undefined> {
    const cleanQuery = query.trim().toLowerCase();
    const products = await databaseService.getAll<Product>('products');
    return products.find(
      p =>
        p.status === 'ativo' &&
        (p.barcode.toLowerCase() === cleanQuery ||
          p.sku.toLowerCase() === cleanQuery ||
          p.name.toLowerCase() === cleanQuery)
    );
  },

  async createProduct(
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'currentStock' | 'brand'> & {
      initialStock?: number;
      currentStock?: number;
      brand?: string;
    },
    username: string = 'operador'
  ): Promise<Product> {
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
  }): Promise<{ product: Product; movement: Movement }> {
    if (params.quantity <= 0) {
      throw new Error('A quantidade de entrada deve ser maior que zero.');
    }

    const product = await databaseService.getById<Product>('products', params.productId);
    if (!product) {
      throw new Error('Produto não encontrado.');
    }

    const unitCost = params.unitCost !== undefined ? params.unitCost : product.costPrice;
    const newStock = product.currentStock + params.quantity;
    const now = new Date();

    const updatedProduct: Product = {
      ...product,
      currentStock: newStock,
      costPrice: unitCost,
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
