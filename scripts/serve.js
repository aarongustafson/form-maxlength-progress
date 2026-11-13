import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = {
	'.html': 'text/html',
	'.css': 'text/css',
	'.js': 'text/javascript',
	'.json': 'application/json',
};
const port = Number(process.env.PORT || 4188);

createServer(async (request, response) => {
	let pathname;
	try {
		pathname = new URL(request.url, 'http://localhost').pathname;
	} catch (error) {
		if (error.code !== 'ERR_INVALID_URL') throw error;
		response.writeHead(400).end();
		return;
	}
	const path = resolve(root, `.${pathname}`);
	if (
		!path.startsWith(`${resolve(root)}${sep}`) ||
		path.includes(`${sep}.`)
	) {
		response.writeHead(403).end();
		return;
	}
	try {
		const file = await stat(path);
		if (!file.isFile()) {
			response.writeHead(404).end();
			return;
		}
		response.writeHead(200, {
			'content-type': types[extname(path)] || 'application/octet-stream',
			'cache-control': 'no-store',
			'content-length': file.size,
		});
		if (request.method === 'HEAD') response.end();
		else
			createReadStream(path)
				.on('error', () => response.destroy())
				.pipe(response);
	} catch (error) {
		response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
	}
}).listen(port, '127.0.0.1');
