/**
 * Tests for ServiceFactory
 */
import { ServiceFactory, ImplementationType } from '../../src/core/services/ServiceFactory';
import { jest } from '@jest/globals';

// Import config after mocking it
jest.mock('../../src/config', () => ({
  config: {
    services: {
      implementationType: 'custom'
    }
  }
}));

// Import config after mocking to get the mocked version
import { config } from '../../src/config';

describe('ServiceFactory', () => {
  beforeEach(() => {
    // Reset ServiceFactory to default state before each test
    ServiceFactory.setImplementationType(ImplementationType.CUSTOM);
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    // Reset mock config
    (config.services as any).implementationType = 'custom';
  });

  test('default implementation type should be CUSTOM', () => {
    expect(ServiceFactory.getImplementationType()).toBe(ImplementationType.CUSTOM);
  });

  test('setImplementationType should change the implementation type', () => {
    // Set to LEGACY
    ServiceFactory.setImplementationType(ImplementationType.LEGACY);
    expect(ServiceFactory.getImplementationType()).toBe(ImplementationType.LEGACY);
    
    // Set back to CUSTOM
    ServiceFactory.setImplementationType(ImplementationType.CUSTOM);
    expect(ServiceFactory.getImplementationType()).toBe(ImplementationType.CUSTOM);
  });

  test('getTemplateService should return a non-null service', () => {
    const templateService = ServiceFactory.getTemplateService();
    expect(templateService).not.toBeNull();
  });

  test('getPlatformService should return a non-null service', () => {
    const platformService = ServiceFactory.getPlatformService();
    expect(platformService).not.toBeNull();
  });

  test('setImplementationType should reset service instances', () => {
    // First get a service in CUSTOM mode
    ServiceFactory.setImplementationType(ImplementationType.CUSTOM);
    const service1 = ServiceFactory.getTemplateService();
    
    // Change implementation type - this should reset services
    ServiceFactory.setImplementationType(ImplementationType.LEGACY);
    
    // Get service again - should be different instance because of reset
    const service2 = ServiceFactory.getTemplateService();
    
    // Just compare references for an easy test
    expect(service1).not.toBe(service2);
  });
  
  test('getImplementationTypeString should return correct string', () => {
    ServiceFactory.setImplementationType(ImplementationType.CUSTOM);
    expect(ServiceFactory.getImplementationTypeString()).toBe('Custom');
    
    ServiceFactory.setImplementationType(ImplementationType.LEGACY);
    expect(ServiceFactory.getImplementationTypeString()).toBe('Legacy');
  });
  
  test('resetToConfigDefaults should reset to legacy when config is legacy', () => {
    // Setup: Force the initial type to CUSTOM
    ServiceFactory.setImplementationType(ImplementationType.CUSTOM);
    expect(ServiceFactory.getImplementationType()).toBe(ImplementationType.CUSTOM);
    
    // Change config to legacy
    (config.services as any).implementationType = 'legacy';
    
    // Reset to defaults
    ServiceFactory.resetToConfigDefaults();
    
    // Check that it changed to LEGACY
    expect(ServiceFactory.getImplementationType()).toBe(ImplementationType.LEGACY);
  });
  
  test('resetToConfigDefaults should reset to custom when config is custom', () => {
    // Setup: Force the initial type to LEGACY
    ServiceFactory.setImplementationType(ImplementationType.LEGACY);
    expect(ServiceFactory.getImplementationType()).toBe(ImplementationType.LEGACY);
    
    // Change config to custom
    (config.services as any).implementationType = 'custom';
    
    // Reset to defaults
    ServiceFactory.resetToConfigDefaults();
    
    // Check that it changed to CUSTOM
    expect(ServiceFactory.getImplementationType()).toBe(ImplementationType.CUSTOM);
  });
});