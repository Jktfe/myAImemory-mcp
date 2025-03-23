// This file sets up the Jest environment for all tests

// We don't need to set global variables as Jest already does this in the test environment
// The issue was trying to reference Jest variables before they're available

// Mock fs/promises for all tests
jest.mock('fs/promises');

// This is a no-op file that Jest will load before tests run
// The actual configuration is done in jest.config.js
