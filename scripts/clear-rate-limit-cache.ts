import 'reflect-metadata';
import { clearTierCache } from '../src/middleware/enhancedRateLimiting';

console.log('Clearing rate limit tier cache...');
clearTierCache();
console.log('Cache cleared successfully!');
console.log('Next API requests will fetch fresh tier data from database.');
