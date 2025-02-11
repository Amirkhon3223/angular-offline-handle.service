import { Injectable, DestroyRef, inject } from '@angular/core';
import { fromEvent, merge, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LocalStorageService } from './local-storage.service';

/**
 * Интерфейс оффлайн-операции, сохраняемой в localStorage.
 */
export interface OfflineOperation {
  type: string;
  payload: any;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineHandleService {
  private readonly offlineKey = 'offlineOperations';
  private operationsRegistry: {
    [type: string]: (payload: any) => Promise<any>
  } = {};

  /**
   * Поток изменения подключения (online/offline). Объединяет события online и offline,
   * а также устанавливает начальное состояние подключения.
   */
  private isOnline$ = merge(
    fromEvent(window, 'online').pipe(map(() => true)),
    fromEvent(window, 'offline').pipe(map(() => false)),
    of(navigator.onLine)
  );

  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /**
   * Конструктор сервиса. Подписывается на изменения подключения и запускает обработку
   * сохранённых операций при восстановлении соединения.
   * @param localStorageService - Сервис для работы с localStorage.
   */
  constructor(
    private localStorageService: LocalStorageService
  ) {
    this.isOnline$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(isOnline => {
        if (isOnline) {
          this.processOfflineOperations();
        }
      });
  }

  /**
   * Возвращает текущее состояние подключения.
   * @returns {boolean} Значение true, если устройство онлайн, иначе false.
   * @example
   * const online = offlineHandleService.checkInternet();
   * console.log(`Подключение активно: ${online}`);
   */
  public checkInternet(): boolean {
    return navigator.onLine;
  }

  /**
   * Сохраняет указанную операцию в localStorage с помощью LocalStorageService.
   * @param {OfflineOperation} operation - Операция, подлежащая сохранению.
   * @example
   * offlineHandleService.saveOperation({ type: 'processSellInvoice', payload: invoiceData });
   */
  private saveOperation(operation: OfflineOperation): void {
    const operations: OfflineOperation[] = this.localStorageService.get<OfflineOperation[]>(this.offlineKey) || [];
    operations.push(operation);
    this.localStorageService.set(this.offlineKey, operations);
  }

  /**
   * Универсально выполняет операцию.
   * Если устройство онлайн, пытается выполнить операцию через переданный процессор.
   * При ошибке выполнения или при отсутствии подключения операция сохраняется для последующей обработки.
   * @template T
   * @param {string} type - Идентификатор операции (например, 'processSellInvoice').
   * @param {any} payload - Данные, необходимые для выполнения операции.
   * @param {() => Promise<T>} processor - Функция, выполняющая операцию, возвращающая Promise.
   * @returns {Promise<T>} Промис, который разрешается результатом операции или отклоняется с ошибкой.
   * @example
   * offlineHandleService.executeOperation('processSellInvoice', invoiceData, () => sendSellInvoice(invoiceData))
   *   .then(result => console.log('Операция выполнена', result))
   *   .catch(error => console.error('Ошибка операции', error));
   */
  public async executeOperation<T>(type: string, payload: any, processor: () => Promise<T>): Promise<T> {
    if (this.checkInternet()) {
      try {
        return await processor();
      } catch (error) {
        this.saveOperation({ type, payload });
        return Promise.reject(error);
      }
    } else {
      this.saveOperation({ type, payload });
      return Promise.reject('Нет подключения, операция сохранена локально.');
    }
  }

  /**
   * Регистрирует процессор для обработки сохранённых оффлайн-операций заданного типа.
   * Позволяет определить, как выполнять операцию с конкретным идентификатором при восстановлении подключения.
   * @param {string} type - Идентификатор операции.
   * @param {(payload: any) => Promise<any>} processor - Функция, принимающая payload и возвращающая Promise.
   * @example
   * offlineHandleService.registerOperation('processSellInvoice', (payload) => sendSellInvoice(payload));
   */
  public registerOperation(type: string, processor: (payload: any) => Promise<any>): void {
    this.operationsRegistry[type] = processor;
  }

  /**
   * Последовательно обрабатывает сохранённые оффлайн-операции.
   * Метод перебирает сохранённые операции и пытается выполнить каждую через зарегистрированный процессор.
   * При успешном выполнении операция удаляется из хранилища.
   * @returns {Promise<void>}
   * @example
   * // Метод вызывается автоматически при восстановлении подключения.
   * offlineHandleService.processOfflineOperations();
   */
  private async processOfflineOperations(): Promise<void> {
    const operations: OfflineOperation[] =
      this.localStorageService.get<OfflineOperation[]>(this.offlineKey) || [];
    while (operations.length > 0) {
      const op = operations[0];
      const processor = this.operationsRegistry[op.type];
      if (processor) {
        try {
          await processor(op.payload);
          operations.shift();
          this.localStorageService.set(this.offlineKey, operations);
        } catch (error) {
          console.error(`Ошибка при обработке операции "${op.type}":`, error);
          break;
        }
      } else {
        console.warn(`Нет зарегистрированного процессора для операции "${op.type}". Операция пропускается.`);
        operations.shift();
        this.localStorageService.set(this.offlineKey, operations);
      }
    }
  }
}
