#!/usr/bin/env node
/**
 * Unity MCP Bridge Server
 *
 * This server bridges Claude Code and Unity Editor via MCP protocol.
 * No external HTTP dependencies required (uses Node.js built-in fetch API).
 *
 * Requirements: Node.js 18+ (for native fetch support)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * .unity-mcp-runtime.json を読み込む（存在しない/エラー時は null）
 */
function tryReadRuntimeConfig(configPath) {
  if (!fs.existsSync(configPath)) return null;
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    log(`[MCP Bridge] Found runtime config: http://localhost:${config.httpPort} (Project: ${config.projectName}) [${configPath}]`);
    return config;
  } catch (error) {
    console.error(`[MCP Bridge] Failed to read runtime config at ${configPath}: ${error.message}`);
    return null;
  }
}

/**
 * Unity HTTP URL を4段階のフォールバックで検出
 *
 * 優先度:
 *   1. UNITY_PROJECT_PATH 環境変数（.claude.json env で設定可能）
 *   2. 自身のファイルパスから推定（index.js は {ProjectRoot}/Server~/mcp-bridge/ に配置）
 *   3. process.cwd()（後方互換性）
 *   4. UNITY_HTTP_URL 環境変数またはデフォルトポート
 */
function getUnityHttpUrl() {
  // 優先度1: UNITY_PROJECT_PATH 環境変数
  const projectPath = process.env.UNITY_PROJECT_PATH;
  if (projectPath) {
    const config = tryReadRuntimeConfig(path.join(projectPath, '.unity-mcp-runtime.json'));
    if (config) return `http://localhost:${config.httpPort}`;
    verboseLog(`[MCP Bridge] UNITY_PROJECT_PATH set but no runtime config found: ${projectPath}`);
  }

  // 優先度2: 自身のファイルパスから Unity プロジェクトルートを推定
  // index.js は {ProjectRoot}/Packages/.../Server~/mcp-bridge/index.js に配置されるため
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // Server~/mcp-bridge/ → パッケージルート → Packages/ → プロジェクトルート
    const inferredRoot = path.resolve(__dirname, '..', '..', '..', '..');
    const config = tryReadRuntimeConfig(path.join(inferredRoot, '.unity-mcp-runtime.json'));
    if (config) return `http://localhost:${config.httpPort}`;
  } catch (error) {
    verboseLog(`[MCP Bridge] Failed to infer project root from file path: ${error.message}`);
  }

  // 優先度3: process.cwd()（後方互換性）
  const cwdConfig = tryReadRuntimeConfig(path.join(process.cwd(), '.unity-mcp-runtime.json'));
  if (cwdConfig) return `http://localhost:${cwdConfig.httpPort}`;

  // 優先度4: 環境変数またはデフォルト
  const fallbackUrl = process.env.UNITY_HTTP_URL || 'http://localhost:5051';
  console.error(`[MCP Bridge] Using fallback URL: ${fallbackUrl}`);
  return fallbackUrl;
}

// Unity HTTP URL（ポート変更時に再読み込み可能）
let UNITY_HTTP_URL = getUnityHttpUrl();

/**
 * ランタイム設定を再読み込みし、ポート変更があれば URL を更新
 */
function refreshUnityUrl() {
  const newUrl = getUnityHttpUrl();
  if (newUrl !== UNITY_HTTP_URL) {
    log(`[MCP Bridge] Unity URL changed: ${UNITY_HTTP_URL} -> ${newUrl}`);
    UNITY_HTTP_URL = newUrl;
  }
}

// Verbose logging control (set via environment variable)
const VERBOSE_LOGGING = process.env.MCP_VERBOSE === 'true';

function log(message) {
  console.error(message);
}

function verboseLog(message) {
  if (VERBOSE_LOGGING) {
    console.error(message);
  }
}

/**
 * HTTP POST request helper using native fetch (Node.js 18+)
 */
async function httpPost(url, data, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * HTTP GET request helper using native fetch (Node.js 18+)
 */
async function httpGet(url, timeout = 3000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

class UnityMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'unity-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.isUnityConnected = false;
    this.lastHealthCheck = null;
    this.healthCheckInterval = null;
    this.connectionWarningShown = false;

    this.setupHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      this.stopHealthCheck();
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Checks if Unity Editor is running and responding
   */
  async checkUnityHealth(silent = false) {
    try {
      const data = await httpGet(`${UNITY_HTTP_URL}/health`, 3000);

      if (data.status === 'ok') {
        const wasDisconnected = !this.isUnityConnected;
        this.isUnityConnected = true;
        this.lastHealthCheck = Date.now();
        this.connectionWarningShown = false;

        // Always log on state change (initial connection or reconnection)
        if (wasDisconnected) {
          log(`[MCP Bridge] Connected to Unity Editor`);
          log(`[MCP Bridge]   Project: ${data.projectName}`);
          log(`[MCP Bridge]   Unity Version: ${data.unityVersion}`);
        }

        return true;
      }
    } catch (error) {
      const wasConnected = this.isUnityConnected;
      this.isUnityConnected = false;

      // 接続喪失時にランタイム設定を再読み込み（ポート変更に追従）
      refreshUnityUrl();

      // Always show warning when connection is lost or not established
      if ((wasConnected || this.lastHealthCheck === null) && !this.connectionWarningShown) {
        if (wasConnected) {
          // Connection was lost - always show
          log(`\n[MCP Bridge] Lost connection to Unity Editor`);
          log(`[MCP Bridge]   Error: ${error.message}`);
          log(`[MCP Bridge]   Unity Editor may have been closed or restarted`);
          log(`[MCP Bridge]   Waiting for reconnection...\n`);
        } else {
          // Initial connection failed - show once
          log(`[MCP Bridge] Unity Editor is not running`);
          log(`[MCP Bridge]   Error: ${error.message}`);
          log(`[MCP Bridge]   Please start Unity Editor`);
        }
        this.connectionWarningShown = true;
      }

      return false;
    }
  }

  /**
   * Starts periodic health check
   */
  async startHealthCheck() {
    // Initial health check (verbose)
    await this.checkUnityHealth(false);

    // Check every 10 seconds (silent unless state changes)
    this.healthCheckInterval = setInterval(() => {
      this.checkUnityHealth(true);
    }, 10000);
  }

  /**
   * Stops periodic health check
   */
  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Returns a user-friendly error message when Unity is not connected
   */
  getDisconnectedErrorMessage() {
    return {
      content: [
        {
          type: 'text',
          text: `Unity Editor is not running or not responding

Please ensure:
1. Unity Editor is open
2. Unity MCP Server package is installed in your project
3. HTTP server is running on ${UNITY_HTTP_URL}

If you switched Unity projects, set UNITY_PROJECT_PATH in your MCP config:
  "env": { "UNITY_PROJECT_PATH": "/path/to/unity/project" }

Check Unity Console for error messages.`,
        },
      ],
      isError: true,
    };
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const maxRetries = 3;
      const retryDelay = 2000; // 2 seconds

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Check connection before making request
          if (!this.isUnityConnected) {
            verboseLog(`[MCP Bridge] Unity not connected, attempting to connect... (attempt ${attempt}/${maxRetries})`);
            const isConnected = await this.checkUnityHealth();
            if (!isConnected) {
              if (attempt < maxRetries) {
                verboseLog(`[MCP Bridge] Connection failed, retrying in ${retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                continue;
              }
              verboseLog('[MCP Bridge] Failed to connect to Unity Editor after all retries');
              // Return empty tools list with warning
              return {
                tools: [],
                _meta: {
                  warning: 'Unity Editor is not connected. Please start Unity Editor and ensure MCP Server is installed.'
                }
              };
            }
          }

          const response = await httpPost(`${UNITY_HTTP_URL}/api/mcp`, {
            jsonrpc: '2.0',
            method: 'tools/list',
            params: {},
            id: 1,
          }, 10000);

          const result = response.result || {};
          const tools = result.tools || [];

          // Only return if we got actual tools
          if (tools.length > 0) {
            return { tools };
          }

          // Empty tools might indicate domain reload in progress
          if (attempt < maxRetries) {
            verboseLog(`[MCP Bridge] Got empty tools list, may be domain reloading. Retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }

          return { tools };
        } catch (error) {
          verboseLog(`[MCP Bridge] Failed to list tools (attempt ${attempt}/${maxRetries}): ` + error.message);

          // Mark as disconnected
          this.isUnityConnected = false;

          if (attempt < maxRetries) {
            verboseLog(`[MCP Bridge] Retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }

          return {
            tools: [],
            _meta: {
              error: `Failed to connect to Unity: ${error.message}`
            }
          };
        }
      }

      // Should not reach here, but return empty as fallback
      return { tools: [] };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        // Check connection before making request
        if (!this.isUnityConnected) {
          verboseLog('[MCP Bridge] Unity not connected, attempting to connect...');
          const isConnected = await this.checkUnityHealth();
          if (!isConnected) {
            verboseLog('[MCP Bridge] Failed to connect to Unity Editor');
            return this.getDisconnectedErrorMessage();
          }
        }

        const { name, arguments: args } = request.params;

        const response = await httpPost(`${UNITY_HTTP_URL}/api/mcp`, {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name,
            arguments: args || {},
          },
          id: 2,
        }, 30000);

        const result = response.result || {};

        return {
          content: result.content || [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        // Mark as disconnected on error
        const wasConnected = this.isUnityConnected;
        this.isUnityConnected = false;

        const errorMessage = error.message;

        // If we just lost connection, provide detailed error
        if (wasConnected) {
          log('[MCP Bridge] Connection lost during API call: ' + errorMessage);
          return this.getDisconnectedErrorMessage();
        }

        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    log('[MCP Bridge] Unity MCP Bridge server running on stdio');
    if (VERBOSE_LOGGING) {
      log('[MCP Bridge] Verbose logging enabled (MCP_VERBOSE=true)');
    }

    // Start health monitoring
    log('[MCP Bridge] Starting connection monitoring...');
    await this.startHealthCheck();
  }
}

const server = new UnityMCPServer();
server.run().catch(console.error);
