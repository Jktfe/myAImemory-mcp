/**
 * Simple module to handle version information
 */

// Package information
const packageInfo = {
  name: 'myAI Memory Sync',
  version: '1.0.0',
  description: 'Synchronize myAI Memory across different platforms',
};

// Export version information
export const version = packageInfo.version;
export const appName = packageInfo.name;
export const description = packageInfo.description;

/**
 * Print version information to the console
 */
export function printVersion() {
  console.log(`${packageInfo.name} v${packageInfo.version}`);
  console.log(packageInfo.description);
}
