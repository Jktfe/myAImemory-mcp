declare module '@modelcontextprotocol/sdk' {
  export class Server {
    constructor(options: { name: string; version: string });
    
    method(options: {
      name: string;
      description: string;
      parameters: any;
      handler: (params: any) => Promise<any>;
    }): void;
    
    start(transport: any): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/dist/server/index.js' {
  export { Server } from '@modelcontextprotocol/sdk';
}

declare module '@modelcontextprotocol/sdk/server/stdio.js' {
  export class StdioServerTransport {
    constructor();
  }
}
