#!/usr/bin/env node

/**
 * Unified CLI for myAI Memory Sync
 * A single command-line interface for all server operations
 */
import { program } from 'commander';
import { startServer } from './core/index.js';
import { version } from './version.js';
import { ServiceFactory, ImplementationType } from './core/services/ServiceFactory.js';
import { processMemoryCommand } from './core/utils/MemoryCommandProcessor.js';
import { emergencySync } from './utils/emergency-sync.js';

async function main() {
  program
    .name('myai-memory-sync')
    .description('myAI Memory Sync - Synchronize AI memory across platforms')
    .version(version);
  
  // Server command
  program
    .command('server')
    .description('Start the MCP server')
    .option('-t, --transport <type>', 'Transport type (stdio, http)', 'stdio')
    .option('-p, --port <number>', 'Port for HTTP transport', '3000')
    .option('-d, --direct', 'Use direct implementation instead of SDK', false)
    .option('-i, --implementation <type>', 'Service implementation type (custom, legacy)', 'custom')
    .option('--debug', 'Enable debug mode', false)
    .action(async (options) => {
      try {
        const transportType = options.transport === 'http' ? 'http' : 'stdio';
        const port = parseInt(options.port, 10);
        const implementationType = options.implementation === 'legacy' 
          ? ImplementationType.LEGACY 
          : ImplementationType.CUSTOM;
        
        await startServer({
          useDirectImplementation: options.direct,
          transport: transportType,
          port: transportType === 'http' ? port : undefined,
          debug: options.debug,
          implementationType
        });
        
        // The server will keep running until terminated
      } catch (error) {
        console.error(`Error starting server: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
  
  // Remember command
  program
    .command('remember')
    .description('Process a natural language memory command')
    .argument('<command>', 'The natural language command to process')
    .option('-i, --implementation <type>', 'Service implementation type (custom, legacy)', 'custom')
    .action(async (command, options) => {
      try {
        console.log('Processing memory command:', command);
        
        const implementationType = options.implementation === 'legacy'
          ? ImplementationType.LEGACY
          : ImplementationType.CUSTOM;
        
        ServiceFactory.setImplementationType(implementationType);
        await ServiceFactory.initializeServices();
        
        const result = await processMemoryCommand(command);
        
        if (result.success) {
          console.log('✅', result.message);
        } else {
          console.error('❌', result.message);
        }
        
        process.exit(0);
      } catch (error) {
        console.error(`Error processing command: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
  
  // Sync command
  program
    .command('sync')
    .description('Sync memory across all platforms')
    .option('-e, --emergency', 'Perform emergency sync (fixes permissions)', false)
    .option('-p, --platform <name>', 'Sync only specific platform')
    .option('-i, --implementation <type>', 'Service implementation type (custom, legacy)', 'custom')
    .action(async (options) => {
      try {
        if (options.emergency) {
          console.log('Performing emergency sync...');
          await emergencySync();
        } else {
          console.log('Syncing memory across platforms...');
          
          const implementationType = options.implementation === 'legacy'
            ? ImplementationType.LEGACY
            : ImplementationType.CUSTOM;
          
          ServiceFactory.setImplementationType(implementationType);
          await ServiceFactory.initializeServices();
          
          console.log(`Using ${implementationType} service implementations`);
          
          const platformService = ServiceFactory.getPlatformService();
          
          let results;
          
          if (options.platform) {
            console.log(`Syncing platform: ${options.platform}`);
            results = [await platformService.syncPlatform(options.platform)];
          } else {
            results = await platformService.syncAll();
          }
          
          const successCount = results.filter(r => r.success).length;
          const failCount = results.length - successCount;
          
          console.log(`Sync completed: ${successCount} successful, ${failCount} failed`);
          
          for (const result of results) {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${result.platform}: ${result.message}`);
          }
        }
        
        process.exit(0);
      } catch (error) {
        console.error(`Error syncing: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
  
  // Presets command
  program
    .command('presets')
    .description('Manage memory presets')
    .command('list')
    .description('List available presets')
    .option('-i, --implementation <type>', 'Service implementation type (custom, legacy)', 'custom')
    .action(async (options) => {
      try {
        const implementationType = options.implementation === 'legacy'
          ? ImplementationType.LEGACY
          : ImplementationType.CUSTOM;
        
        ServiceFactory.setImplementationType(implementationType);
        await ServiceFactory.initializeServices();
        
        console.log(`Using ${implementationType} service implementations`);
        
        const templateService = ServiceFactory.getTemplateService();
        
        const presets = await templateService.listPresets();
        
        if (presets.length === 0) {
          console.log('No presets found');
        } else {
          console.log('Available presets:');
          for (const preset of presets) {
            console.log(`- ${preset}`);
          }
        }
        
        process.exit(0);
      } catch (error) {
        console.error(`Error listing presets: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
  
  program
    .command('presets')
    .command('load')
    .description('Load a preset')
    .argument('<name>', 'The name of the preset to load')
    .option('-i, --implementation <type>', 'Service implementation type (custom, legacy)', 'custom')
    .action(async (name, options) => {
      try {
        console.log(`Loading preset: ${name}`);
        
        const implementationType = options.implementation === 'legacy'
          ? ImplementationType.LEGACY
          : ImplementationType.CUSTOM;
        
        ServiceFactory.setImplementationType(implementationType);
        await ServiceFactory.initializeServices();
        
        console.log(`Using ${implementationType} service implementations`);
        
        const templateService = ServiceFactory.getTemplateService();
        const platformService = ServiceFactory.getPlatformService();
        
        const success = await templateService.loadPreset(name);
        
        if (success) {
          console.log(`✅ Preset '${name}' loaded successfully`);
          
          // Sync with platforms
          console.log('Syncing to platforms...');
          await platformService.syncAll();
          
          console.log('✅ Preset synced to all platforms');
        } else {
          console.error(`❌ Failed to load preset '${name}'`);
        }
        
        process.exit(success ? 0 : 1);
      } catch (error) {
        console.error(`Error loading preset: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
  
  program
    .command('presets')
    .command('create')
    .description('Create a new preset from current template')
    .argument('<name>', 'The name for the new preset')
    .option('-i, --implementation <type>', 'Service implementation type (custom, legacy)', 'custom')
    .action(async (name, options) => {
      try {
        console.log(`Creating preset: ${name}`);
        
        const implementationType = options.implementation === 'legacy'
          ? ImplementationType.LEGACY
          : ImplementationType.CUSTOM;
        
        ServiceFactory.setImplementationType(implementationType);
        await ServiceFactory.initializeServices();
        
        console.log(`Using ${implementationType} service implementations`);
        
        const templateService = ServiceFactory.getTemplateService();
        
        const success = await templateService.createPreset(name);
        
        if (success) {
          console.log(`✅ Preset '${name}' created successfully`);
        } else {
          console.error(`❌ Failed to create preset '${name}'`);
        }
        
        process.exit(success ? 0 : 1);
      } catch (error) {
        console.error(`Error creating preset: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
  
  // Parse command line arguments
  program.parse(process.argv);
  
  // If no arguments, show help
  if (process.argv.length <= 2) {
    program.help();
  }
}

// Run main function
main().catch((error) => {
  console.error(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});