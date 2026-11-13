import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { get } from 'node:http';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

it('serves a checkout beneath a hidden parent without exposing hidden paths', async () => {
	const parent = await mkdtemp(join(tmpdir(), '.maxlength-server-'));
	const root = join(parent, 'checkout');
	let child;
	try {
		await mkdir(join(root, 'scripts'), { recursive: true });
		await mkdir(join(root, 'demo'));
		await copyFile('scripts/serve.js', join(root, 'scripts/serve.js'));
		await writeFile(join(root, 'package.json'), '{"type":"module"}');
		await writeFile(join(root, 'demo/index.html'), '<h1>Demo</h1>');

		const reservation = createServer();
		reservation.listen(0, '127.0.0.1');
		await once(reservation, 'listening');
		const { port } = reservation.address();
		const closed = once(reservation, 'close');
		reservation.close();
		await closed;

		child = spawn(process.execPath, ['scripts/serve.js'], {
			cwd: root,
			env: { ...process.env, PORT: String(port) },
			stdio: 'pipe',
		});
		await once(child, 'spawn');

		const status = (path) =>
			new Promise((resolve, reject) => {
				get({ hostname: '127.0.0.1', port, path }, (response) => {
					response.resume();
					resolve(response.statusCode);
				}).on('error', (error) => {
					if (error.code === 'ECONNREFUSED') resolve(0);
					else reject(error);
				});
			});
		await expect
			.poll(() => status('/demo/index.html'), { timeout: 3000 })
			.toBe(200);
		for (const path of ['/.env', '/demo/.hidden/config.json']) {
			expect(await status(path)).toBe(403);
		}
		expect(await status('/demo/missing.html')).toBe(404);
	} finally {
		if (child && child.exitCode === null) {
			const exited = once(child, 'exit');
			child.kill();
			await exited;
		}
		await rm(parent, { recursive: true, force: true });
	}
});
