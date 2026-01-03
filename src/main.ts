import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { ErrorHandler } from '@angular/core';

class SilentErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    if (error?.message?.includes('Cannot find control with name')) {
      return; 
    }
  }
}

bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...(appConfig.providers ?? []),
    { provide: ErrorHandler, useClass: SilentErrorHandler }
  ]
}).catch(() => {});

