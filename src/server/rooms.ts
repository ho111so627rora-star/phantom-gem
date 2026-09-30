import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRoomService, validateCode, type Room } from './roomCore';
export { REVEAL_DELAY_MS, INSPECT_DELAY_MS, THINK_TIME_MS } from './roomCore';
const directory = path.join(process.cwd(), '.data', 'rooms');
function file(code: string) { validateCode(code); return path.join(directory, code + '.json'); }
const service = createRoomService({
exists: code => existsSync(file(code)),
read: code => JSON.parse(readFileSync(file(code), 'utf8')) as Room,
write(room) { mkdirSync(directory, { recursive: true }); const filename = file(room.code), temporary = filename + '.tmp'; writeFileSync(temporary, JSON.stringify(room), 'utf8'); renameSync(temporary, filename); }
});
export const { createRoom, joinRoom, getRoom, act } = service;