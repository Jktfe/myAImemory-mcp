/**
 * Simple module to handle version information
 */

/**
 * Print version information to the console
 */
export function printVersion() {
  const packageInfo = {
    name: 'myAI Memory Sync',
    version: '1.0.0',
    description: 'Synchronize myAI Memory across different platforms',
  };
  
  console.log(`${packageInfo.name} v${packageInfo.version}`);
  console.log(packageInfo.description);
}
