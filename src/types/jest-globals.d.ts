// Add type definitions for global Jest helpers

declare global {
  /**
   * A type-safe mock function
   */
  const MockFn: typeof jest.fn;
  
  /**
   * Helper to create typed mocks with implementation
   */
  function createTypedMock<T extends (...args: any[]) => any>(
    implementation?: (...args: Parameters<T>) => ReturnType<T>
  ): jest.Mock<ReturnType<T>, Parameters<T>>;
  
  /**
   * Helper to define mocks with correct typing
   */
  function defineMock<T>(
    modulePath: string, 
    factory: () => Partial<T>
  ): void;
  
  /**
   * Helper to add test-only methods to HttpTransport for tests
   */
  function declareHttpTransportTestMethods<T>(
    transport: T
  ): T & {
    onMessage: jest.Mock;
    sendMessage: jest.Mock;
  };
}

// This export is needed to make this a module
export {};