const { serialize, compile, middleware, stringify, prefixer } = require('stylis');
const rtlPlugin = require('stylis-plugin-rtl');

console.log('Type of prefixer:', typeof prefixer);
console.log('Type of rtlPlugin:', typeof rtlPlugin);
console.log('Keys of rtlPlugin:', Object.keys(rtlPlugin));

try {
    const plugin = rtlPlugin.default || rtlPlugin;
    const result = serialize(compile('.foo{margin-right:10px}'), middleware([prefixer, plugin, stringify]));
    console.log('Success:', result);
} catch (e) {
    console.error('Error:', e);
}
