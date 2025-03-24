// Mock for MCP HTTP server transport
import { jest } from '@jest/globals';

export class HttpServerTransport {
  constructor() {
    this.initialize = jest.fn().mockResolvedValue(undefined);
    this.handleRequest = jest.fn();
    this.sendResponse = jest.fn();
    this.onRequest = jest.fn();
  }
}