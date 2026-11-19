const {test}=require('node:test');const assert=require('node:assert/strict');
test('API exporta una aplicación Express',()=>{const app=require('../src/app');assert.equal(typeof app,'function');});
