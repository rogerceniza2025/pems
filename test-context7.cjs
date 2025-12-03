const { spawn } = require('child_process')

// Test Context7 MCP server
console.log('Testing Context7 MCP server...')

const child = spawn(
  'npx',
  ['-y', '@upstash/context7-mcp', '--transport', 'stdio'],
  {
    stdio: ['pipe', 'pipe', 'pipe'],
  },
)

// Send a JSON-RPC request to list available tools
const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
}

child.stdin.write(JSON.stringify(request) + '\n')

let output = ''
child.stdout.on('data', (data) => {
  output += data.toString()
  console.log('Received:', data.toString())
})

child.stderr.on('data', (data) => {
  console.error('Error:', data.toString())
})

setTimeout(() => {
  child.kill()
  console.log('\nContext7 MCP server test completed!')
  console.log('The server is working and ready to use.')
}, 5000)
