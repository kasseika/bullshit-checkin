module.exports = {
  cacheId: 'bullshit-checkin-v1',
  
  globPatterns: [
    '**/*.{js,css,html,json,svg,ico,png,jpg,jpeg,gif}'
  ],
  
  globIgnores: ['**/node_modules/**', '**/.git/**'],
  
  cleanupOutdatedCaches: true,
  
  swDest: 'public/sw.js',
  
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
  
  debug: process.env.NODE_ENV === 'development',
  
  navigationPreload: false,
};
