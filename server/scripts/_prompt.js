// Zero-dependency hidden password prompt for the CLI auth tools.
// Reads from the TTY in raw mode without echoing, so the secret never shows on
// screen, never enters shell history, and is never a process argument.
import { stdin, stdout } from 'node:process'

export function promptHidden(label) {
  return new Promise((resolve, reject) => {
    stdout.write(label)
    const isTTY = Boolean(stdin.isTTY)
    if (isTTY && stdin.setRawMode) stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    let value = ''
    const cleanup = () => {
      stdin.removeListener('data', onData)
      if (isTTY && stdin.setRawMode) stdin.setRawMode(false)
      stdin.pause()
    }
    const onData = (chunk) => {
      for (const ch of chunk) {
        const code = ch.charCodeAt(0)
        if (code === 10 || code === 13 || code === 4) { // LF / CR / Ctrl-D (end of input)
          cleanup(); stdout.write('\n'); return resolve(value)
        }
        if (code === 3) { // Ctrl-C
          cleanup(); stdout.write('\n'); return reject(new Error('Cancelado.'))
        }
        if (code === 127 || code === 8) { // Backspace / Delete
          value = value.slice(0, -1); continue
        }
        value += ch
      }
    }
    stdin.on('data', onData)
  })
}
