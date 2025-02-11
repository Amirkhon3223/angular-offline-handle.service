# OfflineHandleService

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Angular](https://img.shields.io/badge/Angular-18+-red)](https://angular.io/)

**OfflineHandleService** is an Angular service for unified handling of offline operations.  
It allows you to:
- Monitor network connectivity changes (online/offline) using RxJS.
- Save operations to `localStorage` via a centralized `LocalStorageService` when the device is offline or when an error occurs.
- Execute operations as Promises (using the `executeOperation` method) and automatically save them for later processing if they fail.
- Register custom operation handlers for different operation types, enabling automatic data synchronization when connectivity is restored.
- Efficiently manage subscriptions using `takeUntilDestroyed` to prevent memory leaks.

## Description

**OfflineHandleService** is an Angular service designed to simplify the implementation of offline support and data synchronization in your applications. The service:

- Monitors the current network connectivity status.
- Saves operations to `localStorage` when offline or when an error occurs during execution.
- Allows you to register custom handlers for specific operations, ensuring that saved operations are automatically processed once connectivity is restored.

## Features

- **Network Connectivity Monitoring:** Merges `online`/`offline` events with the current status (`navigator.onLine`).
- **Operation Persistence:** Saves operations in `localStorage` if they cannot be executed due to connectivity issues or errors.
- **Promise-based Execution:** The `executeOperation` method executes operations and returns a Promise.
- **Custom Operation Handlers:** Register a processor for a specific operation type using `registerOperation`.
- **Automatic Synchronization:** Processes saved operations automatically when connectivity is restored.

## Usage

### Registering Operation Handlers

Before executing operations, you should register the handlers (processors) for the corresponding operation types. This can be done, for example, in a component or service constructor:

```typescript
@Component({
  selector: 'app-root',
  template: `<h1>OfflineHandleService Usage Example</h1>
             <button (click)="sendData()">Send Data</button>`
})
export class AppComponent {
  constructor(private offlineHandleService: OfflineHandleService) {
    // Register handler for the 'processData' operation
    this.offlineHandleService.registerOperation('processData', async (payload) => {
      // Implement the logic to send data to the server here
      console.log('Processing saved operation with payload:', payload);
      // Example: call API
      // return await this.apiService.sendData(payload);
      return Promise.resolve('Data successfully sent');
    });
  }

  public sendData() {
    const payload = { id: 123, message: 'Example payload' };
    this.offlineHandleService.executeOperation('processData', payload, async () => {
      // Execute the primary operation, e.g., calling an API to send data
      console.log('Attempting to send data:', payload);
      // If the device is offline or an error occurs, the operation will be saved
      return Promise.resolve('Operation executed');
    }).then(response => {
      console.log(response);
    }).catch(error => {
      console.error('Error executing operation:', error);
    });
  }
}
```

### Usage Example in a Component

Below is a complete example of a component demonstrating both the registration of an operation handler and the execution of an operation:

```typescript
@Component({
  selector: 'app-sample',
  template: `<div>
              <h2>OfflineHandleService Demonstration</h2>
              <button (click)="onProcessData()">Process Data</button>
            </div>`
})
export class SampleComponent {
  constructor(private offlineHandleService: OfflineHandleService) {
    // Register handler for the 'processData' operation
    this.offlineHandleService.registerOperation('processData', async (payload) => {
      console.log('Automatically processing saved operation with payload:', payload);
      // Implement the processing logic here (e.g., API call)
      return Promise.resolve('Data successfully synchronized');
    });
  }

  public onProcessData(): void {
    const data = { timestamp: new Date(), value: 42 };

    this.offlineHandleService.executeOperation('processData', data, async () => {
      console.log('Attempting to send data:', data);
      // Here you can add an API call to actually process the data.
      // In this example, we simulate a successful operation.
      return Promise.resolve('Operation executed successfully');
    }).then(result => {
      console.log('Operation result:', result);
    }).catch(error => {
      console.error('Error or operation saved for later processing:', error);
    });
  }
}
```

## Dependencies

- **Angular** (version 14+ recommended)
- **RxJS** — used to monitor online/offline events.
- **LocalStorageService** — a centralized service for working with `localStorage`. Ensure it is implemented in your project and properly imported.
