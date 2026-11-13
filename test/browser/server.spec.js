import { request as httpRequest } from 'node:http';
import { test, expect } from '@playwright/test';

test('malformed targets return 400 without stopping the demo server', async ({
	baseURL,
	request,
}) => {
	const status = await new Promise((resolve, reject) => {
		const outgoing = httpRequest(baseURL, { path: '//[' }, (response) => {
			response.resume();
			response.on('end', () => resolve(response.statusCode));
		});
		outgoing.on('error', reject);
		outgoing.setTimeout(5000, () =>
			outgoing.destroy(new Error('Demo server did not respond')),
		);
		outgoing.end();
	});

	expect(status).toBe(400);
	expect((await request.get('/demo/index.html')).status()).toBe(200);
});
