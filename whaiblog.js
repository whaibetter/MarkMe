#!/usr/bin/env node

/**
 * WhaiBlog 服务管理脚本
 * 支持交互式菜单和命令行参数
 *
 * 用法:
 *   node whaiblog.js              # 交互式菜单
 *   node whaiblog.js --start      # 启动服务
 *   node whaiblog.js --stop       # 停止服务
 *   node whaiblog.js --restart    # 重启服务
 *   node whaiblog.js --status     # 查看状态
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// ─── 配置 ─────────────────────────────────────────────────────────────────────

const SERVER_DIR = path.join(__dirname, 'server');
const ENTRY_FILE = 'index.js';
const PID_FILE = path.join(__dirname, '.whaiblog.pid');
const LOG_FILE = path.join(__dirname, '.whaiblog.log');

// ─── 颜色工具 ─────────────────────────────────────────────────────────────────

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const icon = {
  ok: `${c.green}✔${c.reset}`,
  err: `${c.red}✘${c.reset}`,
  warn: `${c.yellow}⚠${c.reset}`,
  info: `${c.cyan}●${c.reset}`,
};

// ─── 核心函数 ─────────────────────────────────────────────────────────────────

/**
 * 获取占用指定端口的进程 PID
 */
function getPidOnPort(port) {
  try {
    const output = execSync(`netstat -ano`, { encoding: 'utf-8' });
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes(`:${port}`) && line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') return parseInt(pid, 10);
      }
    }
  } catch {}
  return null;
}

/**
 * 检查进程是否存活
 */
function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取进程信息
 */
function getProcessInfo(pid) {
  try {
    const output = execSync(
      `powershell -Command "Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}' | Select-Object CommandLine | Format-List"`,
      { encoding: 'utf-8' }
    );
    const match = output.match(/CommandLine\s*:\s*(.+)/);
    return match ? match[1].trim() : 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * 读取保存的 PID
 */
function readPid() {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
      return isNaN(pid) ? null : pid;
    }
  } catch {}
  return null;
}

/**
 * 保存 PID
 */
function writePid(pid) {
  fs.writeFileSync(PID_FILE, String(pid), 'utf-8');
}

/**
 * 清除 PID 文件
 */
function clearPid() {
  try {
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
  } catch {}
}

/**
 * 强制终止进程（管理员权限）
 */
function killProcess(pid) {
  try {
    execSync(
      `powershell -Command "Start-Process powershell -ArgumentList '-Command','Stop-Process -Id ${pid} -Force' -Verb RunAs -Wait"`,
      { stdio: 'pipe' }
    );
    return true;
  } catch {
    return false;
  }
}

// ─── 服务操作 ─────────────────────────────────────────────────────────────────

/**
 * 查看服务状态
 */
function status() {
  const port = getEnvPort();
  const pidOnPort = getPidOnPort(port);
  const savedPid = readPid();

  console.log();
  console.log(`  ${c.bold}WhaiBlog 服务状态${c.reset}`);
  console.log(`  ${'─'.repeat(40)}`);

  if (pidOnPort) {
    const cmd = getProcessInfo(pidOnPort);
    console.log(`  ${icon.ok} ${c.green}运行中${c.reset}`);
    console.log(`  ${c.dim}端口:${c.reset}  ${port}`);
    console.log(`  ${c.dim}PID:${c.reset}   ${pidOnPort}`);
    console.log(`  ${c.dim}命令:${c.reset}  ${cmd}`);
  } else {
    console.log(`  ${icon.warn} ${c.yellow}未运行${c.reset}`);
  }

  if (savedPid && savedPid !== pidOnPort) {
    console.log(`  ${c.dim}PID 文件记录:${c.reset} ${savedPid} (已过时)`);
  }

  console.log();
  return pidOnPort;
}

/**
 * 从 .env 读取端口
 */
function getEnvPort() {
  try {
    const envPath = path.join(SERVER_DIR, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(/^PORT\s*=\s*(\d+)/m);
      if (match) return parseInt(match[1], 10);
    }
  } catch {}
  return 8080;
}

/**
 * 启动服务
 */
function start() {
  const port = getEnvPort();
  const pidOnPort = getPidOnPort(port);

  if (pidOnPort) {
    console.log(`\n  ${icon.warn} 端口 ${port} 已被进程 ${pidOnPort} 占用`);
    console.log(`  ${c.dim}使用 --restart 可自动重启${c.reset}\n`);
    return false;
  }

  console.log(`\n  ${icon.info} 正在启动 WhaiBlog ...`);

  const logStream = fs.openSync(LOG_FILE, 'a');
  const child = spawn('node', [ENTRY_FILE], {
    cwd: SERVER_DIR,
    detached: true,
    stdio: ['ignore', logStream, logStream],
  });

  child.unref();
  writePid(child.pid);

  // 等待启动完成
  return new Promise((resolve) => {
    let checks = 0;
    const maxChecks = 15;
    const interval = setInterval(() => {
      checks++;
      const pid = getPidOnPort(port);
      if (pid) {
        clearInterval(interval);
        console.log(`  ${icon.ok} ${c.green}启动成功${c.reset}`);
        console.log(`  ${c.dim}端口:${c.reset}  ${port}`);
        console.log(`  ${c.dim}PID:${c.reset}   ${pid}`);
        console.log(`  ${c.dim}日志:${c.reset}  ${LOG_FILE}`);
        console.log();
        resolve(true);
      } else if (checks >= maxChecks) {
        clearInterval(interval);
        console.log(`  ${icon.err} ${c.red}启动超时${c.reset}，请检查日志: ${LOG_FILE}`);
        console.log();
        resolve(false);
      }
    }, 500);
  });
}

/**
 * 停止服务
 */
function stop() {
  const port = getEnvPort();
  const pid = getPidOnPort(port);

  if (!pid) {
    console.log(`\n  ${icon.warn} WhaiBlog 未运行\n`);
    clearPid();
    return true;
  }

  console.log(`\n  ${icon.info} 正在停止 WhaiBlog (PID: ${pid}) ...`);

  if (killProcess(pid)) {
    // 等待进程退出
    return new Promise((resolve) => {
      let checks = 0;
      const interval = setInterval(() => {
        checks++;
        if (!getPidOnPort(port) || checks >= 10) {
          clearInterval(interval);
          clearPid();
          console.log(`  ${icon.ok} ${c.green}已停止${c.reset}\n`);
          resolve(true);
        }
      }, 300);
    });
  } else {
    console.log(`  ${icon.err} ${c.red}停止失败${c.reset}，请手动终止进程 ${pid}\n`);
    return false;
  }
}

/**
 * 重启服务
 */
async function restart() {
  console.log(`\n  ${c.bold}重启 WhaiBlog${c.reset}`);
  console.log(`  ${'─'.repeat(40)}`);
  await stop();
  return await start();
}

// ─── 交互式菜单 ───────────────────────────────────────────────────────────────

function showMenu() {
  console.log();
  console.log(`  ${c.bold}${c.cyan}WhaiBlog${c.reset} ${c.dim}服务管理${c.reset}`);
  console.log(`  ${'─'.repeat(30)}`);
  console.log(`  ${c.dim}1${c.reset} │ 查看状态`);
  console.log(`  ${c.dim}2${c.reset} │ 启动服务`);
  console.log(`  ${c.dim}3${c.reset} │ 停止服务`);
  console.log(`  ${c.dim}4${c.reset} │ 重启服务`);
  console.log(`  ${c.dim}0${c.reset} │ 退出`);
  console.log();
}

async function interactive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

  while (true) {
    showMenu();
    const choice = await ask(`  ${c.cyan}>${c.reset} `);

    switch (choice.trim()) {
      case '1':
        status();
        break;
      case '2':
        await start();
        break;
      case '3':
        await stop();
        break;
      case '4':
        await restart();
        break;
      case '0':
      case 'q':
      case 'exit':
        console.log(`\n  ${c.dim}再见 👋${c.reset}\n`);
        rl.close();
        return;
      default:
        console.log(`\n  ${icon.warn} 无效选项\n`);
    }
  }
}

// ─── 入口 ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    await interactive();
    return;
  }

  const cmd = args[0].replace(/^--/, '');

  switch (cmd) {
    case 'start':
      await start();
      break;
    case 'stop':
      await stop();
      break;
    case 'restart':
      await restart();
      break;
    case 'status':
      status();
      break;
    case 'help':
    case 'h':
      console.log(`
  ${c.bold}WhaiBlog 服务管理${c.reset}

  ${c.dim}用法:${c.reset}
    node whaiblog.js              交互式菜单
    node whaiblog.js --start      启动服务
    node whaiblog.js --stop       停止服务
    node whaiblog.js --restart    重启服务
    node whaiblog.js --status     查看状态
    node whaiblog.js --help       帮助信息
`);
      break;
    default:
      console.log(`\n  ${icon.err} 未知命令: ${cmd}`);
      console.log(`  ${c.dim}使用 --help 查看可用命令${c.reset}\n`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n  ${icon.err} ${err.message}\n`);
  process.exit(1);
});
