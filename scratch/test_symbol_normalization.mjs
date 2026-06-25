import { getNormalizedSymbolForBroker } from '../src/lib/broker.js';

console.log('Testing normal symbols:');
console.log('GOLD ->', getNormalizedSymbolForBroker('GOLD', '5051967982'));
console.log('QQQ ->', getNormalizedSymbolForBroker('QQQ', '5051967982'));
console.log('QQQM ->', getNormalizedSymbolForBroker('QQQM', '5051967982'));
console.log('BTC ->', getNormalizedSymbolForBroker('BTC', '5051967982'));
console.log('NASDAQ ->', getNormalizedSymbolForBroker('NASDAQ', '5051967982'));
