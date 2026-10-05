import assert from 'node:assert/strict';
import test from 'node:test';
import { validateApiBase,apiLocation } from '../src/api/api-location.ts';
test('API location permits explicit safe deployment bases and same origin', () => {
    assert.equal(apiLocation('/api/library',''),'/api/library');
    assert.equal(apiLocation('/api/library',validateApiBase('https://api.example.test')),'https://api.example.test/api/library');
    for (const value of ['http://api.example.test','https://user:secret@api.example.test','//example.test','https://api.example.test/path','/../escape','https://api.example.test?secret=test']) assert.throws(() => validateApiBase(value));
});
