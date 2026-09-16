import { databaseService } from './databaseService';
import { CashMovement, CashRegister } from '../types';

export const cashService = {
  async getActiveRegister(): Promise<CashRegister | undefined> {
    const registers = await databaseService.getAll<CashRegister>('cashRegisters');
    return registers.find(r => r.status === 'aberto');
  },

  async getAllRegisters(): Promise<CashRegister[]> {
    const registers = await databaseService.getAll<CashRegister>('cashRegisters');
    return registers.sort((a, b) => `${b.openDate} ${b.openTime}`.localeCompare(`${a.openDate} ${a.openTime}`));
  },

  async openRegister(
    param1: number | { initialCash: number; user: string; notes?: string },
    param2?: string,
    param3?: string
  ): Promise<CashRegister> {
    let initialAmount: number;
    let username: string;
    let notes: string | undefined;

    if (typeof param1 === 'object') {
      initialAmount = param1.initialCash;
      username = param1.user;
      notes = param1.notes;
    } else {
      initialAmount = param1;
      username = param2 || 'operador';
      notes = param3;
    }

    if (initialAmount < 0) {
      throw new Error('O valor de abertura não pode ser negativo.');
    }

    const active = await this.getActiveRegister();
    if (active) {
      throw new Error('Já existe um caixa aberto no momento. Feche o caixa atual antes de abrir um novo.');
    }

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];
    const id = `cash-${Date.now()}`;

    const newRegister: CashRegister = {
      id,
      openDate: date,
      openTime: time,
      user: username,
      openAmount: initialAmount,
      cashSales: 0,
      creditSales: 0,
      debitSales: 0,
      pixSales: 0,
      supplies: 0,
      bleedings: 0,
      expectedCash: initialAmount,
      status: 'aberto',
      notes,
    };

    await databaseService.save<CashRegister>('cashRegisters', newRegister);

    // Record opening movement
    const movement: CashMovement = {
      id: `cmov-${Date.now()}`,
      cashRegisterId: id,
      type: 'abertura',
      amount: initialAmount,
      reason: 'Abertura de Caixa (Fundo de troco)',
      observation: notes,
      user: username,
      date,
      time,
    };
    await databaseService.save<CashMovement>('cashMovements', movement);

    return newRegister;
  },

  async addSupply(params: {
    cashRegisterId: string;
    amount: number;
    reason: string;
    observation?: string;
    username: string;
  }): Promise<CashRegister> {
    if (params.amount <= 0) {
      throw new Error('O valor do suprimento deve ser maior que zero.');
    }

    const register = await databaseService.getById<CashRegister>('cashRegisters', params.cashRegisterId);
    if (!register || register.status !== 'aberto') {
      throw new Error('Caixa não encontrado ou já está fechado.');
    }

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];

    const updated: CashRegister = {
      ...register,
      supplies: register.supplies + params.amount,
      expectedCash: register.expectedCash + params.amount,
    };
    await databaseService.save<CashRegister>('cashRegisters', updated);

    const movement: CashMovement = {
      id: `cmov-${Date.now()}`,
      cashRegisterId: register.id,
      type: 'suprimento',
      amount: params.amount,
      reason: params.reason || 'Suprimento de Caixa',
      observation: params.observation,
      user: params.username,
      date,
      time,
    };
    await databaseService.save<CashMovement>('cashMovements', movement);

    return updated;
  },

  async addBleeding(params: {
    cashRegisterId: string;
    amount: number;
    reason: string;
    observation?: string;
    username: string;
  }): Promise<CashRegister> {
    if (params.amount <= 0) {
      throw new Error('O valor da sangria deve ser maior que zero.');
    }

    const register = await databaseService.getById<CashRegister>('cashRegisters', params.cashRegisterId);
    if (!register || register.status !== 'aberto') {
      throw new Error('Caixa não encontrado ou já está fechado.');
    }

    // Strict check: cannot bleed more than physical cash available
    if (params.amount > register.expectedCash) {
      throw new Error(
        `Valor da sangria (R$ ${params.amount.toFixed(2)}) superior ao saldo em dinheiro disponível no caixa (R$ ${register.expectedCash.toFixed(2)}).`
      );
    }

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];

    const updated: CashRegister = {
      ...register,
      bleedings: register.bleedings + params.amount,
      expectedCash: register.expectedCash - params.amount,
    };
    await databaseService.save<CashRegister>('cashRegisters', updated);

    const movement: CashMovement = {
      id: `cmov-${Date.now()}`,
      cashRegisterId: register.id,
      type: 'sangria',
      amount: params.amount,
      reason: params.reason || 'Sangria de Caixa',
      observation: params.observation,
      user: params.username,
      date,
      time,
    };
    await databaseService.save<CashMovement>('cashMovements', movement);

    return updated;
  },

  async closeRegister(params: {
    cashRegisterId?: string;
    registerId?: string;
    reportedCash?: number;
    actualCash?: number;
    username?: string;
    notes?: string;
  }): Promise<CashRegister> {
    const targetId = params.cashRegisterId || params.registerId;
    const finalReportedCash = params.reportedCash !== undefined ? params.reportedCash : (params.actualCash || 0);

    if (!targetId) {
      throw new Error('ID do caixa é obrigatório para fechamento.');
    }
    if (finalReportedCash < 0) {
      throw new Error('O valor informado não pode ser negativo.');
    }

    const register = await databaseService.getById<CashRegister>('cashRegisters', targetId);
    if (!register || register.status !== 'aberto') {
      throw new Error('Caixa não encontrado ou já está fechado.');
    }

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];

    const difference = Number((finalReportedCash - register.expectedCash).toFixed(2));
    let differenceType: 'sobra' | 'falta' | 'exato' = 'exato';
    if (difference > 0) differenceType = 'sobra';
    if (difference < 0) differenceType = 'falta';

    const closed: CashRegister = {
      ...register,
      closeDate: date,
      closeTime: time,
      closedDate: date,
      closedTime: time,
      reportedCash: finalReportedCash,
      actualCash: finalReportedCash,
      difference,
      differenceType,
      status: 'fechado',
      notes: params.notes || register.notes,
    };

    await databaseService.save<CashRegister>('cashRegisters', closed);

    const movement: CashMovement = {
      id: `cmov-${Date.now()}`,
      cashRegisterId: register.id,
      type: 'fechamento',
      amount: finalReportedCash,
      reason: `Fechamento de Caixa (${differenceType.toUpperCase()}: R$ ${Math.abs(difference).toFixed(2)})`,
      observation: params.notes,
      user: params.username || register.user,
      date,
      time,
    };
    await databaseService.save<CashMovement>('cashMovements', movement);

    return closed;
  },

  async registerCashMovement(params: {
    type: 'SUPRIMENTO' | 'SANGRIA';
    amount: number;
    reason: string;
    notes?: string;
    user: string;
  }): Promise<CashRegister> {
    const active = await this.getActiveRegister();
    if (!active) {
      throw new Error('Não há caixa aberto no momento.');
    }

    if (params.type === 'SUPRIMENTO') {
      return this.addSupply({
        cashRegisterId: active.id,
        amount: params.amount,
        reason: params.reason,
        observation: params.notes,
        username: params.user,
      });
    } else {
      return this.addBleeding({
        cashRegisterId: active.id,
        amount: params.amount,
        reason: params.reason,
        observation: params.notes,
        username: params.user,
      });
    }
  },

  async getMovementsForRegister(registerId: string): Promise<CashMovement[]> {
    return this.getMovementsByRegisterId(registerId);
  },

  async getMovementsByRegisterId(registerId: string): Promise<CashMovement[]> {
    const movements = await databaseService.getAll<CashMovement>('cashMovements');
    return movements
      .filter(m => m.cashRegisterId === registerId)
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  },

  async getAllMovements(): Promise<CashMovement[]> {
    const movements = await databaseService.getAll<CashMovement>('cashMovements');
    return movements.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  },
};
